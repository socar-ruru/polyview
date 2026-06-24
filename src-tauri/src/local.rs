//! 로컬 파일시스템 소스. 요청된 모든 경로는 설정된 루트를 기준으로 해석하고,
//! `..`·절대경로·루트 밖을 가리키는 심볼릭 링크로 루트를 벗어나면 거부한다.
//! 목록을 만들 때 심볼릭 링크는 건너뛰므로, 트리에는 루트 아래에 물리적으로
//! 존재하는 파일만 보이고 건너뛴 디렉터리(예: `.git`)는 숨겨진 채로 남는다.

use std::fs;
use std::path::{Path, PathBuf};
use std::process::Command;

use base64::{engine::general_purpose::STANDARD, Engine as _};
use serde::Serialize;

use crate::error::ApiError;

/// 파일 뷰어에서 목록에 보일 이유가 없는 디렉터리.
const SKIP_DIRS: &[&str] = &[".git", "node_modules"];
const SKIP_FILES: &[&str] = &[".DS_Store"];

#[derive(Serialize)]
pub struct TreeFile {
    pub path: String,
    pub size: u64,
}

#[derive(Serialize)]
pub struct FileContent {
    pub text: String,
    pub size: u64,
}

/// `root` 아래의 모든 일반 파일을 루트 기준 상대경로(슬래시 구분)로, 경로순
/// 정렬해 나열한다. 루트가 없거나 읽을 수 없으면 그냥 빈 목록을 돌려준다.
pub fn list(root: &str) -> Result<Vec<TreeFile>, ApiError> {
    let real_root = canonical_root(root);
    let mut out = Vec::new();
    walk(&real_root, &real_root, &mut out);
    out.sort_by(|a, b| a.path.cmp(&b.path));
    Ok(out)
}

/// UTF-8 텍스트 파일을 읽는다. 돌려주기 전에 바이트 크기 제한을 적용한다.
pub fn read_text(root: &str, rel: &str, max_bytes: u64) -> Result<FileContent, ApiError> {
    let abs = resolve_safe(root, rel)?;
    let size = file_size(&abs, rel)?;
    if size > max_bytes {
        return Err(ApiError::too_large(size, max_bytes));
    }
    let bytes = fs::read(&abs).map_err(|_| ApiError::not_found(rel))?;
    let len = bytes.len() as u64;
    Ok(FileContent { text: String::from_utf8_lossy(&bytes).into_owned(), size: len })
}

/// 파일의 원본 바이트를 base64 로 읽는다 — data URL 로 이미지를 렌더링할 때 쓴다.
pub fn read_base64(root: &str, rel: &str) -> Result<String, ApiError> {
    let abs = resolve_safe(root, rel)?;
    file_size(&abs, rel)?; // 존재하는 일반 파일인지 확인
    let bytes = fs::read(&abs).map_err(|_| ApiError::not_found(rel))?;
    Ok(STANDARD.encode(bytes))
}

/// 파일을 OS 파일 관리자(Finder 등)에서 선택한 채로 연다. resolve_safe 로 루트
/// 안에 실제로 존재하는 파일인지 확인한 뒤 연다(로컬 소스에서만 호출된다).
pub fn reveal(root: &str, rel: &str) -> Result<(), ApiError> {
    let abs = resolve_safe(root, rel)?;
    reveal_in_file_manager(&abs)
}

// ─── 내부 구현 ───────────────────────────────────────────────────────────────

/// 루트를 심볼릭 링크까지 한 번 해석한다. 아직 존재하지 않으면 입력 경로를 그대로
/// 쓴다(그동안 목록은 빈 채로 있다가 디렉터리가 생기면 채워진다).
fn canonical_root(root: &str) -> PathBuf {
    let p = PathBuf::from(root);
    fs::canonicalize(&p).unwrap_or(p)
}

fn walk(root: &Path, dir: &Path, out: &mut Vec<TreeFile>) {
    let entries = match fs::read_dir(dir) {
        Ok(e) => e,
        Err(_) => return, // 읽을 수 없는 디렉터리(또는 없는 루트) → 나열할 것 없음
    };
    for entry in entries.flatten() {
        // 심볼릭 링크는 건너뛴다 — 트리에는 루트 아래 물리적 파일만 보이도록.
        let file_type = match entry.file_type() {
            Ok(t) => t,
            Err(_) => continue,
        };
        if file_type.is_symlink() {
            continue;
        }
        let name = entry.file_name();
        let name = name.to_string_lossy();
        if file_type.is_dir() {
            if !SKIP_DIRS.contains(&name.as_ref()) {
                walk(root, &entry.path(), out);
            }
        } else if file_type.is_file() {
            if SKIP_FILES.contains(&name.as_ref()) {
                continue;
            }
            let abs = entry.path();
            if let Ok(meta) = fs::metadata(&abs) {
                out.push(TreeFile { path: to_posix_rel(root, &abs), size: meta.len() });
            }
        }
    }
}

fn file_size(abs: &Path, rel: &str) -> Result<u64, ApiError> {
    match fs::metadata(abs) {
        Ok(meta) if meta.is_file() => Ok(meta.len()),
        _ => Err(ApiError::not_found(rel)),
    }
}

/// 뷰어 상대경로를 루트 안에서 해석한다. `..`·절대경로·실제 경로가 루트를
/// 벗어나는 심볼릭 링크 등 어떤 이탈도 거부한다.
fn resolve_safe(root: &str, rel: &str) -> Result<PathBuf, ApiError> {
    let real_root = canonical_root(root);

    // 절대경로와 Windows 드라이브 상대 입력은 바로 거부한다.
    let rel_path = Path::new(rel);
    if rel_path.is_absolute() {
        return Err(ApiError::not_found(rel));
    }

    let joined = real_root.join(rel_path);
    let real = fs::canonicalize(&joined).map_err(|_| ApiError::not_found(rel))?;

    if !is_within(&real_root, &real) {
        return Err(ApiError::not_found(rel));
    }
    if is_skipped(&real_root, &real) {
        return Err(ApiError::not_found(rel));
    }
    Ok(real)
}

/// `target` 이 `root` 내부에 엄격히 포함될 때 true(루트 자기 자신은 제외).
fn is_within(root: &Path, target: &Path) -> bool {
    target != root && target.starts_with(root)
}

/// 루트 아래 경로 조각 중 건너뛸 디렉터리가 있거나 파일 자체가 제외 대상이면 true.
fn is_skipped(root: &Path, target: &Path) -> bool {
    let rel = match target.strip_prefix(root) {
        Ok(r) => r,
        Err(_) => return true,
    };
    for comp in rel.components() {
        let seg = comp.as_os_str().to_string_lossy();
        if SKIP_DIRS.contains(&seg.as_ref()) || SKIP_FILES.contains(&seg.as_ref()) {
            return true;
        }
    }
    false
}

/// GitHub 소스와 동일하게 슬래시 구분을 쓰는 루트 기준 상대경로.
fn to_posix_rel(root: &Path, abs: &Path) -> String {
    abs.strip_prefix(root)
        .unwrap_or(abs)
        .to_string_lossy()
        .replace('\\', "/")
}

/// 파일을 선택한 상태로 OS 파일 관리자를 연다(플랫폼별). 결과를 기다리지 않고
/// 띄우기만 한다 — explorer 처럼 성공해도 비정상 종료코드를 내는 경우가 있어서다.
#[cfg(target_os = "macos")]
fn reveal_in_file_manager(abs: &Path) -> Result<(), ApiError> {
    Command::new("open")
        .arg("-R")
        .arg(abs)
        .spawn()
        .map(|_| ())
        .map_err(|e| ApiError::io(e.to_string()))
}

#[cfg(target_os = "windows")]
fn reveal_in_file_manager(abs: &Path) -> Result<(), ApiError> {
    // explorer 는 파일을 선택한 채로 연다. `/select,<path>` 를 한 인자로 붙인다.
    Command::new("explorer")
        .arg(format!("/select,{}", abs.display()))
        .spawn()
        .map(|_| ())
        .map_err(|e| ApiError::io(e.to_string()))
}

#[cfg(not(any(target_os = "macos", target_os = "windows")))]
fn reveal_in_file_manager(abs: &Path) -> Result<(), ApiError> {
    // Linux 등: 파일 선택 표준이 없어 상위 디렉터리를 연다.
    let dir = abs.parent().unwrap_or(abs);
    Command::new("xdg-open")
        .arg(dir)
        .spawn()
        .map(|_| ())
        .map_err(|e| ApiError::io(e.to_string()))
}

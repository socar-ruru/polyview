mod error;
mod local;
mod settings;

use error::ApiError;
use local::{FileContent, TreeFile};
use serde_json::Value;
use tauri::AppHandle;

// ─── 로컬 파일시스템 소스 ────────────────────────────────────────────────────

#[tauri::command]
fn list_dir(root: String) -> Result<Vec<TreeFile>, ApiError> {
    local::list(&root)
}

#[tauri::command]
fn read_text(root: String, rel: String, max_bytes: u64) -> Result<FileContent, ApiError> {
    local::read_text(&root, &rel, max_bytes)
}

#[tauri::command]
fn read_base64(root: String, rel: String) -> Result<String, ApiError> {
    local::read_base64(&root, &rel)
}

// ─── 설정 + 비밀 토큰 ────────────────────────────────────────────────────────

#[tauri::command]
fn get_settings(app: AppHandle) -> Result<Value, ApiError> {
    settings::load(&app)
}

#[tauri::command]
fn set_settings(app: AppHandle, value: Value) -> Result<(), ApiError> {
    settings::save(&app, value)
}

#[tauri::command]
fn get_github_token() -> Result<Option<String>, ApiError> {
    settings::get_token()
}

#[tauri::command]
fn has_github_token() -> Result<bool, ApiError> {
    Ok(settings::get_token()?.is_some())
}

#[tauri::command]
fn set_github_token(token: Option<String>) -> Result<(), ApiError> {
    settings::set_token(token)
}

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        .plugin(tauri_plugin_dialog::init())
        .invoke_handler(tauri::generate_handler![
            list_dir,
            read_text,
            read_base64,
            get_settings,
            set_settings,
            get_github_token,
            has_github_token,
            set_github_token,
        ])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}

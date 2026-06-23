//! 설정 영속화. 비밀이 아닌 설정은 앱 config 디렉터리에 JSON 그대로 저장한다
//! (스키마는 프런트엔드가 소유). GitHub 토큰만은 이 파일에 넣지 않고 OS 키체인에
//! 따로 보관한다.

use std::fs;
use std::path::PathBuf;

use keyring::Entry;
use serde_json::Value;
use tauri::{AppHandle, Manager};

use crate::error::ApiError;

const KEYRING_SERVICE: &str = "polyview";
const KEYRING_USER: &str = "github-token";
const SETTINGS_FILE: &str = "settings.json";

fn settings_path(app: &AppHandle) -> Result<PathBuf, ApiError> {
    let dir = app
        .path()
        .app_config_dir()
        .map_err(|e| ApiError::io(format!("config dir unavailable: {e}")))?;
    fs::create_dir_all(&dir).map_err(|e| ApiError::io(e.to_string()))?;
    Ok(dir.join(SETTINGS_FILE))
}

/// 저장된 설정 JSON 을 돌려준다. 아직 저장된 게 없으면 null.
pub fn load(app: &AppHandle) -> Result<Value, ApiError> {
    let path = settings_path(app)?;
    match fs::read_to_string(&path) {
        Ok(raw) => serde_json::from_str(&raw).map_err(|e| ApiError::io(e.to_string())),
        Err(_) => Ok(Value::Null),
    }
}

/// 설정 JSON 을 그대로 기록한다. 손으로 확인하기 쉽게 보기 좋은 형식으로 저장.
pub fn save(app: &AppHandle, value: Value) -> Result<(), ApiError> {
    let path = settings_path(app)?;
    let raw = serde_json::to_string_pretty(&value).map_err(|e| ApiError::io(e.to_string()))?;
    fs::write(&path, raw).map_err(|e| ApiError::io(e.to_string()))
}

fn token_entry() -> Result<Entry, ApiError> {
    Entry::new(KEYRING_SERVICE, KEYRING_USER).map_err(|e| ApiError::io(e.to_string()))
}

/// 저장된 GitHub 토큰. 설정된 게 없으면 None.
pub fn get_token() -> Result<Option<String>, ApiError> {
    match token_entry()?.get_password() {
        Ok(token) => Ok(Some(token)),
        Err(keyring::Error::NoEntry) => Ok(None),
        Err(e) => Err(ApiError::io(e.to_string())),
    }
}

/// 토큰을 저장한다. `token` 이 None/빈 문자열이면 지운다.
pub fn set_token(token: Option<String>) -> Result<(), ApiError> {
    let entry = token_entry()?;
    match token.as_deref().map(str::trim).filter(|t| !t.is_empty()) {
        Some(value) => entry.set_password(value).map_err(|e| ApiError::io(e.to_string())),
        None => match entry.delete_credential() {
            Ok(()) | Err(keyring::Error::NoEntry) => Ok(()),
            Err(e) => Err(ApiError::io(e.to_string())),
        },
    }
}

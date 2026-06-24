mod error;
mod local;
mod settings;

use error::ApiError;
use local::{FileContent, TreeFile};
use serde_json::Value;
use tauri::menu::{AboutMetadata, Menu, MenuBuilder, MenuItemBuilder, MenuEvent, SubmenuBuilder};
use tauri::{AppHandle, Emitter, Runtime};

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

#[tauri::command]
fn reveal_path(root: String, rel: String) -> Result<(), ApiError> {
    local::reveal(&root, &rel)
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
        .plugin(tauri_plugin_clipboard_manager::init())
        .menu(|handle| build_menu(handle))
        .on_menu_event(|app, event| handle_menu_event(app, event))
        .invoke_handler(tauri::generate_handler![
            list_dir,
            read_text,
            read_base64,
            reveal_path,
            get_settings,
            set_settings,
            get_github_token,
            has_github_token,
            set_github_token,
        ])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}

// ─── 네이티브 메뉴 ───────────────────────────────────────────────────────────
//
// 네이티브 macOS 메뉴바를 구성한다. 웹 UI(사이드바·탭바)는 그대로 두고, 글로벌
// 액션만 메뉴/단축키로 노출한다. 복사·종료 같은 표준 항목은 predefined 로 둬서
// OS 가 직접 처리하고, 커스텀 항목(설정/폴더 열기/새로고침/테마)만 프런트로
// 이벤트를 던져 React 가 수행한다(handle_menu_event 참고).

fn build_menu<R: Runtime>(handle: &AppHandle<R>) -> tauri::Result<Menu<R>> {
    // 앱 메뉴(macOS 의 첫 서브메뉴 = 애플리케이션 메뉴)
    let settings_item = MenuItemBuilder::new("설정…")
        .id("settings")
        .accelerator("CmdOrCtrl+,")
        .build(handle)?;
    let app_menu = SubmenuBuilder::new(handle, "Polyview")
        .about(Some(AboutMetadata::default()))
        .separator()
        .item(&settings_item)
        .separator()
        .hide()
        .separator()
        .quit()
        .build()?;

    // File
    let open_item = MenuItemBuilder::new("폴더 열기…")
        .id("open_folder")
        .accelerator("CmdOrCtrl+O")
        .build(handle)?;
    let reload_item = MenuItemBuilder::new("새로고침")
        .id("reload")
        .accelerator("CmdOrCtrl+R")
        .build(handle)?;
    let file_menu = SubmenuBuilder::new(handle, "File")
        .item(&open_item)
        .item(&reload_item)
        .build()?;

    // Edit — 뷰어에서 텍스트를 복사할 수 있도록 표준 편집 항목을 제공한다.
    let edit_menu = SubmenuBuilder::new(handle, "Edit")
        .undo()
        .redo()
        .separator()
        .cut()
        .copy()
        .paste()
        .select_all()
        .build()?;

    // View — 테마 전환(체크 표시는 v1 에서 생략).
    let theme_light = MenuItemBuilder::new("라이트").id("theme_light").build(handle)?;
    let theme_dark = MenuItemBuilder::new("다크").id("theme_dark").build(handle)?;
    let theme_system = MenuItemBuilder::new("시스템").id("theme_system").build(handle)?;
    let view_menu = SubmenuBuilder::new(handle, "View")
        .item(&theme_light)
        .item(&theme_dark)
        .item(&theme_system)
        .build()?;

    // Window
    let window_menu = SubmenuBuilder::new(handle, "Window")
        .minimize()
        .separator()
        .close_window()
        .build()?;

    MenuBuilder::new(handle)
        .item(&app_menu)
        .item(&file_menu)
        .item(&edit_menu)
        .item(&view_menu)
        .item(&window_menu)
        .build()
}

fn handle_menu_event<R: Runtime>(app: &AppHandle<R>, event: MenuEvent) {
    // 커스텀 항목만 프런트로 전달한다. predefined(복사·종료 등)은 OS 가 직접 처리.
    let id = event.id().as_ref();
    if matches!(
        id,
        "settings" | "open_folder" | "reload" | "theme_light" | "theme_dark" | "theme_system"
    ) {
        let _ = app.emit("menu", id);
    }
}

// 办公密码保险库 — Tauri 桌面版后端
// 职责：加密数据文件的读写（原子写入）、保险库路径管理、原生文件对话框、
//       系统托盘（显示/隐藏、收藏快速复制、锁定、退出）、全局快捷键、关闭最小化
// 密码学全部在前端 Web Crypto 中完成，后端只搬运密文，不接触任何明文

#![cfg_attr(not(debug_assertions), windows_subsystem = "windows")]

use serde::{Deserialize, Serialize};
use std::os::windows::process::CommandExt;
use std::sync::atomic::{AtomicBool, Ordering};
use std::{fs, io::Write, path::PathBuf};
use tauri::{menu::{Menu, MenuItem, PredefinedMenuItem}, tray::TrayIconBuilder, Emitter, Manager};

static CLOSE_TO_TRAY: AtomicBool = AtomicBool::new(true);

fn toggle_window(app: &tauri::AppHandle) {
    if let Some(w) = app.get_webview_window("main") {
        let visible = w.is_visible().unwrap_or(false);
        let focused = w.is_focused().unwrap_or(false);
        if visible && focused {
            let _ = w.hide();
        } else {
            let _ = w.show();
            let _ = w.set_focus();
        }
    }
}

#[derive(Serialize)]
struct VaultInfo {
    path: String,
    custom: bool,
}

#[derive(Deserialize)]
struct FavItem {
    id: String,
    title: String,
}

/// 先写临时文件再改名，避免写一半崩溃/断电导致保险库损坏；
/// 改名遇到占用（如杀软正在扫描）时短暂重试
fn write_atomic(path: &PathBuf, content: &str) -> Result<(), String> {
    if let Some(parent) = path.parent() {
        fs::create_dir_all(parent).map_err(|e| e.to_string())?;
    }
    let mut tmp_name = path.as_os_str().to_owned();
    tmp_name.push(".tmp");
    let tmp = PathBuf::from(tmp_name);
    {
        let mut f = fs::File::create(&tmp).map_err(|e| e.to_string())?;
        f.write_all(content.as_bytes()).map_err(|e| e.to_string())?;
        f.sync_all().map_err(|e| e.to_string())?;
    }
    for attempt in 0..4 {
        match fs::rename(&tmp, path) {
            Ok(()) => return Ok(()),
            Err(e) if attempt < 3 => {
                std::thread::sleep(std::time::Duration::from_millis(180));
                let _ = e;
            }
            Err(e) => return Err(e.to_string()),
        }
    }
    Ok(())
}

fn config_path(app: &tauri::AppHandle) -> Result<PathBuf, String> {
    let dir = app.path().app_config_dir().map_err(|e| e.to_string())?;
    fs::create_dir_all(&dir).map_err(|e| e.to_string())?;
    Ok(dir.join("config.json"))
}

/// 配置中指定的保险库路径；未配置返回 None
fn configured_vault_path(app: &tauri::AppHandle) -> Result<Option<PathBuf>, String> {
    let f = config_path(app)?;
    if !f.exists() {
        return Ok(None);
    }
    let txt = fs::read_to_string(&f).map_err(|e| e.to_string())?;
    let v: serde_json::Value = serde_json::from_str(&txt).map_err(|e| e.to_string())?;
    let p = v.get("vaultPath").and_then(|x| x.as_str()).unwrap_or("");
    if p.trim().is_empty() {
        Ok(None)
    } else {
        Ok(Some(PathBuf::from(p)))
    }
}

/// 默认保险库位置：文档目录\密码保险库.vault
fn default_vault_path(app: &tauri::AppHandle) -> PathBuf {
    if let Ok(dir) = app.path().document_dir() {
        return dir.join("密码保险库.vault");
    }
    app.path()
        .app_config_dir()
        .map(|d| d.join("vault.vault"))
        .unwrap_or_else(|_| PathBuf::from("vault.vault"))
}

fn vault_path(app: &tauri::AppHandle) -> PathBuf {
    configured_vault_path(app)
        .ok()
        .flatten()
        .unwrap_or_else(|| default_vault_path(app))
}

#[tauri::command]
fn get_vault_info(app: tauri::AppHandle) -> Result<VaultInfo, String> {
    let custom = configured_vault_path(&app)?.is_some();
    Ok(VaultInfo {
        path: vault_path(&app).to_string_lossy().into_owned(),
        custom,
    })
}

#[tauri::command]
fn read_vault(app: tauri::AppHandle) -> Result<Option<String>, String> {
    let p = vault_path(&app);
    if !p.exists() {
        return Ok(None);
    }
    Ok(Some(fs::read_to_string(&p).map_err(|e| e.to_string())?))
}

#[tauri::command]
fn write_vault(app: tauri::AppHandle, content: String) -> Result<(), String> {
    write_atomic(&vault_path(&app), &content)
}

#[tauri::command]
fn set_vault_path(app: tauri::AppHandle, path: String) -> Result<(), String> {
    let f = config_path(&app)?;
    let cfg = serde_json::json!({ "vaultPath": path });
    write_atomic(&f, &cfg.to_string())
}

#[tauri::command]
fn read_text_at(path: String) -> Result<String, String> {
    fs::read_to_string(&path).map_err(|e| e.to_string())
}

#[tauri::command]
fn write_text_at(path: String, content: String) -> Result<(), String> {
    write_atomic(&PathBuf::from(path), &content)
}

#[tauri::command]
fn pick_open_dialog() -> Result<Option<String>, String> {
    Ok(rfd::FileDialog::new()
        .add_filter("保险库文件", &["vault", "json"])
        .pick_file()
        .map(|p| p.to_string_lossy().into_owned()))
}

#[tauri::command]
fn pick_csv_dialog() -> Result<Option<String>, String> {
    Ok(rfd::FileDialog::new()
        .add_filter("密码 CSV 文件", &["csv"])
        .pick_file()
        .map(|p| p.to_string_lossy().into_owned()))
}

#[tauri::command]
fn pick_save_dialog(suggested: Option<String>) -> Result<Option<String>, String> {
    let mut d = rfd::FileDialog::new().add_filter("保险库文件", &["vault"]);
    if let Some(name) = suggested {
        d = d.set_file_name(&name);
    }
    Ok(d.save_file()
        .map(|p| p.to_string_lossy().into_owned()))
}

#[tauri::command]
fn pick_import_html_dialog() -> Result<Option<String>, String> {
    Ok(rfd::FileDialog::new()
        .add_filter("书签 HTML 文件", &["html", "htm"])
        .pick_file()
        .map(|p| p.to_string_lossy().into_owned()))
}

#[tauri::command]
fn pick_save_html_dialog(suggested: Option<String>) -> Result<Option<String>, String> {
    let mut d = rfd::FileDialog::new().add_filter("书签 HTML 文件", &["html"]);
    if let Some(name) = suggested {
        d = d.set_file_name(&name);
    }
    Ok(d.save_file()
        .map(|p| p.to_string_lossy().into_owned()))
}

#[tauri::command]
fn pick_open_store_dialog() -> Result<Option<String>, String> {
    Ok(rfd::FileDialog::new()
        .add_filter("书签库文件", &["json", "bmark"])
        .pick_file()
        .map(|p| p.to_string_lossy().into_owned()))
}

/// 用系统默认浏览器打开网址；只允许 http(s)，防止参数注入
#[tauri::command]
fn open_external(url: String) -> Result<(), String> {
    let u = url.trim();
    if !u.starts_with("http://") && !u.starts_with("https://") {
        return Err("仅支持 http/https 链接".into());
    }
    std::process::Command::new("cmd")
        .args(["/c", "start", "", u])
        .creation_flags(0x08000000) // CREATE_NO_WINDOW
        .spawn()
        .map_err(|e| e.to_string())?;
    Ok(())
}

/// 前端在解锁后把收藏条目同步过来，重建托盘菜单（点击后由前端复制密码）
#[tauri::command]
fn tray_set_favorites(app: tauri::AppHandle, items: Vec<FavItem>) -> Result<(), String> {
    let display = MenuItem::with_id(&app, "toggle", "显示 / 隐藏窗口", true, None::<&str>)
        .map_err(|e| e.to_string())?;
    let sep1 = PredefinedMenuItem::separator(&app).map_err(|e| e.to_string())?;
    let lock = MenuItem::with_id(&app, "lock", "锁定保险库", true, None::<&str>)
        .map_err(|e| e.to_string())?;
    let quit = MenuItem::with_id(&app, "quit", "退出", true, None::<&str>)
        .map_err(|e| e.to_string())?;
    let menu = Menu::new(&app).map_err(|e| e.to_string())?;
    menu.append(&display).map_err(|e| e.to_string())?;
    menu.append(&sep1).map_err(|e| e.to_string())?;
    let favs: Vec<_> = items.iter().take(12).collect();
    if favs.is_empty() {
        let hint = MenuItem::with_id(&app, "favhint", "（解锁后显示收藏条目）", false, None::<&str>)
            .map_err(|e| e.to_string())?;
        menu.append(&hint).map_err(|e| e.to_string())?;
    } else {
        for it in favs {
            let mut label = it.title.clone();
            if label.chars().count() > 26 {
                label = label.chars().take(26).collect::<String>() + "…";
            }
            let mi = MenuItem::with_id(&app, &format!("fav:{}", it.id), &label, true, None::<&str>)
                .map_err(|e| e.to_string())?;
            menu.append(&mi).map_err(|e| e.to_string())?;
        }
    }
    let sep2 = PredefinedMenuItem::separator(&app).map_err(|e| e.to_string())?;
    menu.append(&sep2).map_err(|e| e.to_string())?;
    menu.append(&lock).map_err(|e| e.to_string())?;
    menu.append(&quit).map_err(|e| e.to_string())?;
    if let Some(tray) = app.tray_by_id("main") {
        tray.set_menu(Some(menu)).map_err(|e| e.to_string())?;
    }
    Ok(())
}

#[tauri::command]
fn set_close_to_tray(on: bool) {
    CLOSE_TO_TRAY.store(on, Ordering::Relaxed);
}

fn main() {
    tauri::Builder::default()
        .plugin(
            tauri_plugin_global_shortcut::Builder::new()
                .with_handler(|app, _shortcut, event| {
                    if event.state() == tauri_plugin_global_shortcut::ShortcutState::Pressed {
                        toggle_window(app);
                    }
                })
                .build(),
        )
        .setup(|app| {
            let handle = app.handle();
            let display = MenuItem::with_id(handle, "toggle", "显示 / 隐藏窗口", true, None::<&str>)?;
            let sep = PredefinedMenuItem::separator(handle)?;
            let lock = MenuItem::with_id(handle, "lock", "锁定保险库", true, None::<&str>)?;
            let quit = MenuItem::with_id(handle, "quit", "退出", true, None::<&str>)?;
            let menu = Menu::with_items(handle, &[&display, &sep, &lock, &quit])?;
            TrayIconBuilder::with_id("main")
                .icon(app.default_window_icon().unwrap().clone())
                .tooltip("办公保险库")
                .menu(&menu)
                .show_menu_on_left_click(false)
                .on_menu_event(|app, event| {
                    match event.id().as_ref() {
                        "toggle" => toggle_window(app),
                        "lock" => {
                            if let Some(w) = app.get_webview_window("main") {
                                let _ = w.show();
                                let _ = w.set_focus();
                            }
                            let _ = app.emit("tray-lock", ());
                        }
                        "quit" => app.exit(0),
                        id => {
                            if let Some(fid) = id.strip_prefix("fav:") {
                                let _ = app.emit("tray-fav", fid.to_string());
                                if let Some(w) = app.get_webview_window("main") {
                                    let _ = w.show();
                                    let _ = w.set_focus();
                                }
                            }
                        }
                    }
                })
                .on_tray_icon_event(|tray, event| {
                    if let tauri::tray::TrayIconEvent::Click {
                        button: tauri::tray::MouseButton::Left,
                        button_state: tauri::tray::MouseButtonState::Up,
                        ..
                    } = event
                    {
                        toggle_window(tray.app_handle());
                    }
                })
                .build(handle)?;
            use tauri_plugin_global_shortcut::GlobalShortcutExt;
            // 快捷键被其他程序占用时不阻塞启动，只是没有全局呼出功能
            let _ = app.global_shortcut().register("Ctrl+Alt+V");
            Ok(())
        })
        .on_window_event(|window, event| {
            if let tauri::WindowEvent::CloseRequested { api, .. } = event {
                // 关闭时默认隐藏到托盘（可在设置关闭），托盘菜单里才有真正的退出
                if CLOSE_TO_TRAY.load(Ordering::Relaxed) {
                    api.prevent_close();
                    let _ = window.hide();
                }
            }
        })
        .invoke_handler(tauri::generate_handler![
            get_vault_info,
            read_vault,
            write_vault,
            set_vault_path,
            read_text_at,
            write_text_at,
            pick_open_dialog,
            pick_csv_dialog,
            pick_save_dialog,
            pick_import_html_dialog,
            pick_save_html_dialog,
            pick_open_store_dialog,
            open_external,
            tray_set_favorites,
            set_close_to_tray
        ])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}

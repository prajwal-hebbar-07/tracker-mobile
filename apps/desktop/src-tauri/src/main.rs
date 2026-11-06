use std::{fs, io::ErrorKind, path::PathBuf};

use tauri::{AppHandle, Manager};
use tauri_plugin_dialog::DialogExt;
use tauri_plugin_window_state::StateFlags;

// The log is one JSON file in the app's data folder: ~/Library/Application Support/<identifier>/days.json.
fn log_path(app: &AppHandle) -> Result<PathBuf, String> {
    let dir = app.path().app_data_dir().map_err(|e| e.to_string())?;
    fs::create_dir_all(&dir).map_err(|e| e.to_string())?;
    Ok(dir.join("days.json"))
}

// None means there is no log yet, which is different from a log that could not be read.
#[tauri::command]
fn load_days(app: AppHandle) -> Result<Option<String>, String> {
    match fs::read_to_string(log_path(&app)?) {
        Ok(text) => Ok(Some(text)),
        Err(e) if e.kind() == ErrorKind::NotFound => Ok(None),
        Err(e) => Err(e.to_string()),
    }
}

// Written to a temporary file and renamed over the log, so a crash mid-write never leaves half a log.
#[tauri::command]
fn save_days(app: AppHandle, json: String) -> Result<(), String> {
    let path = log_path(&app)?;
    let tmp = path.with_extension("json.tmp");
    fs::write(&tmp, json).map_err(|e| e.to_string())?;
    fs::rename(&tmp, &path).map_err(|e| e.to_string())
}

// The user picks where the export goes, so the page can never write anywhere on its own. false = cancelled.
#[tauri::command]
async fn save_file(app: AppHandle, name: String, contents: Vec<u8>) -> Result<bool, String> {
    let Some(picked) = app.dialog().file().set_file_name(&name).blocking_save_file() else {
        return Ok(false);
    };
    let path = picked.into_path().map_err(|e| e.to_string())?;
    fs::write(path, contents).map_err(|e| e.to_string())?;
    Ok(true)
}

#[tauri::command]
async fn open_backup(app: AppHandle) -> Result<Option<String>, String> {
    let Some(picked) = app
        .dialog()
        .file()
        .add_filter("Logbook backup", &["json", "txt"])
        .blocking_pick_file()
    else {
        return Ok(None);
    };
    let path = picked.into_path().map_err(|e| e.to_string())?;
    fs::read_to_string(path).map(Some).map_err(|e| e.to_string())
}

// The widget has no Dock icon or menu bar, so the page offers Quit itself.
#[tauri::command]
fn quit(app: AppHandle) {
    app.exit(0);
}

fn main() {
    tauri::Builder::default()
        .plugin(tauri_plugin_dialog::init())
        .plugin(
            tauri_plugin_window_state::Builder::default()
                .with_state_flags(StateFlags::POSITION)
                .build(),
        )
        .setup(|app| {
            // A widget lives on the desktop: no Dock icon and no app switcher entry.
            #[cfg(target_os = "macos")]
            app.set_activation_policy(tauri::ActivationPolicy::Accessory);
            Ok(())
        })
        .invoke_handler(tauri::generate_handler![load_days, save_days, save_file, open_backup, quit])
        .run(tauri::generate_context!())
        .expect("error while running the Logbook widget");
}

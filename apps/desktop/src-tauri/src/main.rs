use std::{fs, io::ErrorKind, path::PathBuf};

use tauri::{AppHandle, Manager};
use tauri_plugin_dialog::DialogExt;
use tauri_plugin_updater::UpdaterExt;
use tauri_plugin_window_state::StateFlags;

// The log's folder: ~/Library/Application Support/works.oni.logbook.widget/days.json. It is named here, not taken from
// the app's identifier, so the log stays put if the identifier ever changes. It lives outside the app, so deleting,
// reinstalling or updating Logbook Widget never touches it. The `logbook` CLI reads and writes the same file.
const LOG_FOLDER: &str = "works.oni.logbook.widget";

// LOGBOOK_FILE points at another log, as it does for the CLI (only seen when the widget is started from a terminal).
fn log_path(app: &AppHandle) -> Result<PathBuf, String> {
    let path = match std::env::var_os("LOGBOOK_FILE") {
        Some(file) => PathBuf::from(file),
        None => app.path().data_dir().map_err(|e| e.to_string())?.join(LOG_FOLDER).join("days.json"),
    };
    if let Some(dir) = path.parent() {
        fs::create_dir_all(dir).map_err(|e| e.to_string())?;
    }
    Ok(path)
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
fn write_log(path: &PathBuf, json: &str) -> Result<(), String> {
    let tmp = path.with_extension(format!("json.{}.tmp", std::process::id()));
    fs::write(&tmp, json).map_err(|e| e.to_string())?;
    fs::rename(&tmp, path).map_err(|e| e.to_string())
}

// Replaces the whole log (restore from a backup).
#[tauri::command]
fn save_days(app: AppHandle, json: String) -> Result<(), String> {
    write_log(&log_path(&app)?, &json)
}

// Changes one day against the file as it is now, so a change the CLI made since the page last read it is kept.
// A file that is not a JSON object is left untouched. Returns the log as written.
#[tauri::command]
fn update_day(app: AppHandle, date: String, day: Option<serde_json::Value>) -> Result<String, String> {
    let path = log_path(&app)?;
    let mut log = match fs::read_to_string(&path) {
        Ok(text) => match serde_json::from_str::<serde_json::Value>(&text) {
            Ok(serde_json::Value::Object(map)) => map,
            _ => return Err("The saved log is not readable, so it was left as it is.".into()),
        },
        Err(e) if e.kind() == ErrorKind::NotFound => serde_json::Map::new(),
        Err(e) => return Err(e.to_string()),
    };
    match day {
        Some(value) => log.insert(date, value),
        None => log.remove(&date),
    };
    let json = serde_json::Value::Object(log).to_string();
    write_log(&path, &json)?;
    Ok(json)
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

// The newer version on the release feed, if any. Only versions signed with the release key are offered.
#[tauri::command]
async fn check_update(app: AppHandle) -> Result<Option<String>, String> {
    let update = app.updater().map_err(|e| e.to_string())?.check().await.map_err(|e| e.to_string())?;
    Ok(update.map(|found| found.version))
}

// Downloads the update, checks its signature, replaces the app and restarts it. The log is not part of the app.
#[tauri::command]
async fn install_update(app: AppHandle) -> Result<(), String> {
    let Some(update) = app.updater().map_err(|e| e.to_string())?.check().await.map_err(|e| e.to_string())? else {
        return Err("No update is available any more.".into());
    };
    update.download_and_install(|_, _| {}, || {}).await.map_err(|e| e.to_string())?;
    app.restart()
}

fn main() {
    tauri::Builder::default()
        .plugin(tauri_plugin_dialog::init())
        .plugin(tauri_plugin_updater::Builder::new().build())
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
        .invoke_handler(tauri::generate_handler![
            load_days,
            save_days,
            update_day,
            save_file,
            open_backup,
            quit,
            check_update,
            install_update
        ])
        .run(tauri::generate_context!())
        .expect("error while running the Logbook widget");
}

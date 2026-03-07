use tauri::AppHandle;
use tauri_plugin_store::StoreExt;
use crate::models::AppConfig;

const CONFIG_KEY: &str = "app_config";
const STORE_PATH: &str = "config.json";
const SELECTED_PATHS_KEY: &str = "selected_paths";
const PRESETS_KEY: &str = "selection_presets";

#[tauri::command]
pub fn get_app_config(app: AppHandle) -> AppConfig {
    let store = app.store(STORE_PATH).unwrap();
    let config: Option<AppConfig> = store
        .get(CONFIG_KEY)
        .and_then(|v| serde_json::from_value(v).ok());
    config.unwrap_or_default()
}

#[tauri::command]
pub fn save_app_config(app: AppHandle, config: AppConfig) -> Result<(), String> {
    let store = app.store(STORE_PATH).map_err(|e| e.to_string())?;
    let value = serde_json::to_value(&config).map_err(|e| e.to_string())?;
    store.set(CONFIG_KEY, value);
    store.save().map_err(|e| e.to_string())?;
    Ok(())
}

#[tauri::command]
pub fn get_selected_paths(app: AppHandle) -> Vec<String> {
    let store = app.store(STORE_PATH).unwrap();
    store
        .get(SELECTED_PATHS_KEY)
        .and_then(|v| serde_json::from_value(v).ok())
        .unwrap_or_default()
}

#[tauri::command]
pub fn save_selected_paths(app: AppHandle, paths: Vec<String>) -> Result<(), String> {
    let store = app.store(STORE_PATH).map_err(|e| e.to_string())?;
    let value = serde_json::to_value(&paths).map_err(|e| e.to_string())?;
    store.set(SELECTED_PATHS_KEY, value);
    store.save().map_err(|e| e.to_string())?;
    Ok(())
}

#[tauri::command]
pub fn get_selection_presets(app: AppHandle) -> serde_json::Value {
    let store = app.store(STORE_PATH).unwrap();
    store
        .get(PRESETS_KEY)
        .unwrap_or(serde_json::Value::Array(vec![]))
}

#[tauri::command]
pub fn save_selection_presets(app: AppHandle, presets: serde_json::Value) -> Result<(), String> {
    let store = app.store(STORE_PATH).map_err(|e| e.to_string())?;
    store.set(PRESETS_KEY, presets);
    store.save().map_err(|e| e.to_string())?;
    Ok(())
}

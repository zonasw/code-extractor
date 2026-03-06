use tauri::AppHandle;
use tauri_plugin_store::StoreExt;
use crate::models::AppConfig;

const CONFIG_KEY: &str = "app_config";
const STORE_PATH: &str = "config.json";

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

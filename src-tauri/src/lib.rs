mod commands;
mod models;

use commands::{read_directory, read_file_content, write_text_file, get_app_config, save_app_config};

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        .plugin(tauri_plugin_opener::init())
        .plugin(tauri_plugin_dialog::init())
        .plugin(tauri_plugin_fs::init())
        .plugin(tauri_plugin_store::Builder::default().build())
        .invoke_handler(tauri::generate_handler![
            read_directory,
            read_file_content,
            write_text_file,
            get_app_config,
            save_app_config,
        ])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}

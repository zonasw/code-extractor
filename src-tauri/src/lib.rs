mod commands;
mod models;

use commands::{
    read_directory, read_file_content, write_text_file,
    get_app_config, save_app_config,
    get_selected_paths, save_selected_paths,
    get_selection_presets, save_selection_presets,
    get_agent_config, save_agent_config,
    find_claude_cli, take_file_snapshot, get_file_diff,
    revert_agent_changes, start_claude_agent, stop_claude_agent,
    check_git_repo, git_get_diff, git_revert_all,
    AgentProcessRegistry,
};

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        .plugin(tauri_plugin_opener::init())
        .plugin(tauri_plugin_dialog::init())
        .plugin(tauri_plugin_fs::init())
        .plugin(tauri_plugin_store::Builder::default().build())
        .plugin(tauri_plugin_clipboard_manager::init())
        .manage(AgentProcessRegistry::default())
        .invoke_handler(tauri::generate_handler![
            read_directory,
            read_file_content,
            write_text_file,
            get_app_config,
            save_app_config,
            get_selected_paths,
            save_selected_paths,
            get_selection_presets,
            save_selection_presets,
            get_agent_config,
            save_agent_config,
            find_claude_cli,
            take_file_snapshot,
            get_file_diff,
            revert_agent_changes,
            start_claude_agent,
            stop_claude_agent,
            check_git_repo,
            git_get_diff,
            git_revert_all,
        ])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}

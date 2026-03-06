use std::fs;
use std::path::Path;
use crate::models::{AppConfig, FileNode};

fn build_tree(path: &Path, config: &AppConfig) -> Option<FileNode> {
    let name = path.file_name()?.to_string_lossy().to_string();

    // Normalize path to forward slashes
    let normalized_path = path.to_string_lossy().replace('\\', "/");

    if path.is_dir() {
        // Check if directory name is in ignore list
        if config.ignore_list.contains(&name) {
            return None;
        }

        let mut children = Vec::new();

        if let Ok(entries) = fs::read_dir(path) {
            let mut dirs = Vec::new();
            let mut files = Vec::new();

            for entry in entries.flatten() {
                let child_path = entry.path();
                let child_name = child_path
                    .file_name()
                    .map(|n| n.to_string_lossy().to_string())
                    .unwrap_or_default();

                // Skip hidden files/dirs (starting with .) except .gitignore etc.
                if child_name.starts_with('.') && child_name != ".gitignore" && child_name != ".env" {
                    continue;
                }

                if child_path.is_dir() {
                    dirs.push(child_path);
                } else {
                    files.push(child_path);
                }
            }

            // Sort directories first, then files
            dirs.sort();
            files.sort();

            for dir in dirs {
                if let Some(node) = build_tree(&dir, config) {
                    children.push(node);
                }
            }

            for file in files {
                if let Some(node) = build_tree(&file, config) {
                    children.push(node);
                }
            }
        }

        Some(FileNode {
            name,
            path: normalized_path,
            is_dir: true,
            children,
            size: 0,
            extension: String::new(),
        })
    } else {
        let extension = path
            .extension()
            .map(|e| e.to_string_lossy().to_string())
            .unwrap_or_default();

        // Apply extension filter if set
        if !config.extension_filter.is_empty() && !config.extension_filter.contains(&extension) {
            return None;
        }

        let size = fs::metadata(path).map(|m| m.len()).unwrap_or(0);

        Some(FileNode {
            name,
            path: normalized_path,
            is_dir: false,
            children: vec![],
            size,
            extension,
        })
    }
}

#[tauri::command]
pub async fn read_directory(path: String, config: AppConfig) -> Result<FileNode, String> {
    let path_clone = path.clone();
    let result = tokio::task::spawn_blocking(move || {
        let p = Path::new(&path_clone);
        if !p.exists() {
            return Err(format!("Path does not exist: {}", path_clone));
        }
        if !p.is_dir() {
            return Err(format!("Path is not a directory: {}", path_clone));
        }
        build_tree(p, &config).ok_or_else(|| format!("Failed to read directory: {}", path_clone))
    })
    .await
    .map_err(|e| e.to_string())?;

    result
}

#[tauri::command]
pub async fn read_file_content(path: String) -> Result<String, String> {
    let path_clone = path.clone();
    tokio::task::spawn_blocking(move || {
        let p = Path::new(&path_clone);
        let metadata = fs::metadata(p).map_err(|e| e.to_string())?;

        // Size limit: 10MB
        if metadata.len() > 10 * 1024 * 1024 {
            return Err(format!("File too large (>10MB): {}", path_clone));
        }

        match fs::read_to_string(p) {
            Ok(content) => Ok(content),
            Err(_) => Ok("[Binary file, skipped]".to_string()),
        }
    })
    .await
    .map_err(|e| e.to_string())?
}

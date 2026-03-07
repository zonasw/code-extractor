use std::collections::HashMap;
use std::fs;
use std::path::{Path, PathBuf};
use ignore::WalkBuilder;
use crate::models::{AppConfig, FileNode};

fn build_tree_from_walk(root: &Path, config: &AppConfig) -> Option<FileNode> {
    let root_str = root.to_string_lossy().replace('\\', "/");

    // Collect all entries via WalkBuilder (handles .gitignore automatically)
    let mut children_map: HashMap<String, Vec<FileNode>> = HashMap::new();

    // Clone ignore_list so it can be moved into the closure
    let ignore_list = config.ignore_list.clone();

    let walk = WalkBuilder::new(root)
        .hidden(true)           // skip hidden files/dirs
        .git_ignore(true)       // respect .gitignore at all levels
        .git_global(false)
        .git_exclude(false)
        .filter_entry(move |entry| {
            let name = entry.file_name().to_string_lossy();
            !ignore_list.iter().any(|i| i == name.as_ref())
        })
        .build();

    // Build a map: parent_path -> Vec<FileNode>
    // We'll process entries and reconstruct the tree
    let mut all_nodes: Vec<(PathBuf, FileNode)> = Vec::new();

    for result in walk {
        match result {
            Ok(entry) => {
                let path = entry.path().to_path_buf();
                if path == root {
                    continue; // skip root itself
                }
                let name = path.file_name()
                    .map(|n| n.to_string_lossy().to_string())
                    .unwrap_or_default();
                let normalized = path.to_string_lossy().replace('\\', "/");

                if path.is_dir() {
                    all_nodes.push((path.clone(), FileNode {
                        name,
                        path: normalized,
                        is_dir: true,
                        children: vec![],
                        size: 0,
                        extension: String::new(),
                    }));
                } else {
                    let extension = path.extension()
                        .map(|e| e.to_string_lossy().to_string())
                        .unwrap_or_default();

                    // Apply extension filter
                    if !config.extension_filter.is_empty()
                        && !config.extension_filter.contains(&extension)
                    {
                        continue;
                    }

                    let size = fs::metadata(&path).map(|m| m.len()).unwrap_or(0);
                    all_nodes.push((path.clone(), FileNode {
                        name,
                        path: normalized,
                        is_dir: false,
                        children: vec![],
                        size,
                        extension,
                    }));
                }
            }
            Err(e) => {
                eprintln!("Walk error: {}", e);
            }
        }
    }

    // Group children by parent
    for (path, node) in &all_nodes {
        let parent = path.parent().map(|p| p.to_string_lossy().replace('\\', "/"))
            .unwrap_or_default();
        children_map.entry(parent).or_default().push(node.clone());
    }

    // Sort: dirs first, then files, alphabetically
    for children in children_map.values_mut() {
        children.sort_by(|a, b| {
            match (a.is_dir, b.is_dir) {
                (true, false) => std::cmp::Ordering::Less,
                (false, true) => std::cmp::Ordering::Greater,
                _ => a.name.to_lowercase().cmp(&b.name.to_lowercase()),
            }
        });
    }

    // Recursively build the tree from root
    fn attach_children(
        path_str: &str,
        children_map: &HashMap<String, Vec<FileNode>>,
    ) -> Vec<FileNode> {
        let children = children_map.get(path_str).cloned().unwrap_or_default();
        children.into_iter().map(|mut node| {
            if node.is_dir {
                node.children = attach_children(&node.path, children_map);
            }
            node
        }).collect()
    }

    let root_name = root.file_name()
        .map(|n| n.to_string_lossy().to_string())
        .unwrap_or_else(|| root_str.clone());

    let children = attach_children(&root_str, &children_map);

    Some(FileNode {
        name: root_name,
        path: root_str,
        is_dir: true,
        children,
        size: 0,
        extension: String::new(),
    })
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
        build_tree_from_walk(p, &config)
            .ok_or_else(|| format!("Failed to read directory: {}", path_clone))
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

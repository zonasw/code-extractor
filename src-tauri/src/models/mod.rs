use serde::{Deserialize, Serialize};

#[derive(Debug, Serialize, Deserialize, Clone)]
pub struct FileNode {
    pub name: String,
    pub path: String,
    pub is_dir: bool,
    pub children: Vec<FileNode>,
    pub size: u64,
    pub extension: String,
}

#[derive(Debug, Serialize, Deserialize, Clone)]
pub struct AppConfig {
    pub last_directories: Vec<String>,
    pub ignore_list: Vec<String>,
    pub extension_filter: Vec<String>,
}

impl Default for AppConfig {
    fn default() -> Self {
        AppConfig {
            last_directories: vec![],
            ignore_list: vec![
                "node_modules".to_string(),
                ".git".to_string(),
                "__pycache__".to_string(),
                "dist".to_string(),
                "build".to_string(),
                ".next".to_string(),
                ".nuxt".to_string(),
                "target".to_string(),
                ".idea".to_string(),
                ".vscode".to_string(),
                "vendor".to_string(),
                ".DS_Store".to_string(),
                "coverage".to_string(),
            ],
            extension_filter: vec![],
        }
    }
}

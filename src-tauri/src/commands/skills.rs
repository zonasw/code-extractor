use serde::{Deserialize, Serialize};
use std::path::PathBuf;

#[derive(Debug, Serialize, Deserialize, Clone)]
pub struct Skill {
    pub name: String,      // filename without .md
    pub description: String, // first non-empty line of content (after optional front-matter)
    pub content: String,
    pub path: String,
    pub is_project: bool,  // true = .claude/commands/, false = ~/.claude/commands/
}

// ---------------------------------------------------------------------------
// List skills from ~/.claude/commands/ and .claude/commands/ (project-local)
// Project-level skills shadow global ones with the same name.
// ---------------------------------------------------------------------------

#[tauri::command]
pub async fn list_skills(working_dir: Option<String>) -> Result<Vec<Skill>, String> {
    let home = std::env::var("HOME").unwrap_or_default();
    let global_dir = PathBuf::from(&home).join(".claude").join("commands");
    let project_dir = working_dir
        .as_deref()
        .map(|d| PathBuf::from(d).join(".claude").join("commands"));

    let mut skills: Vec<Skill> = Vec::new();
    let mut seen_names: std::collections::HashSet<String> = Default::default();

    // Project-local first (higher priority)
    if let Some(pdir) = &project_dir {
        if pdir.exists() {
            collect_skills(pdir, true, &mut skills, &mut seen_names).await;
        }
    }

    // Global fallback
    if global_dir.exists() {
        collect_skills(&global_dir, false, &mut skills, &mut seen_names).await;
    }

    Ok(skills)
}

async fn collect_skills(
    dir: &PathBuf,
    is_project: bool,
    skills: &mut Vec<Skill>,
    seen: &mut std::collections::HashSet<String>,
) {
    let Ok(mut entries) = tokio::fs::read_dir(dir).await else {
        return;
    };
    while let Ok(Some(entry)) = entries.next_entry().await {
        let path = entry.path();
        if path.extension().and_then(|e| e.to_str()) != Some("md") {
            continue;
        }
        let name = path
            .file_stem()
            .and_then(|s| s.to_str())
            .unwrap_or("")
            .to_string();
        if name.is_empty() || seen.contains(&name) {
            continue;
        }
        let content = tokio::fs::read_to_string(&path).await.unwrap_or_default();
        let description = extract_description(&content);
        seen.insert(name.clone());
        skills.push(Skill {
            name,
            description,
            content,
            path: path.to_string_lossy().to_string(),
            is_project,
        });
    }
    skills.sort_by(|a, b| a.name.cmp(&b.name));
}

fn extract_description(content: &str) -> String {
    // Skip YAML front-matter if present
    let body = if content.starts_with("---") {
        let end = content[3..].find("---").map(|i| i + 6).unwrap_or(0);
        &content[end..]
    } else {
        content
    };

    // Return first non-empty, non-heading line (strip leading #)
    for line in body.lines() {
        let trimmed = line.trim();
        if trimmed.is_empty() {
            continue;
        }
        let stripped = trimmed.trim_start_matches('#').trim();
        if !stripped.is_empty() {
            // Truncate to 80 chars
            return stripped.chars().take(80).collect();
        }
    }
    String::new()
}

// ---------------------------------------------------------------------------
// Read a skill file by path
// ---------------------------------------------------------------------------

#[tauri::command]
pub async fn read_skill(path: String) -> Result<String, String> {
    tokio::fs::read_to_string(&path)
        .await
        .map_err(|e| format!("Failed to read skill: {}", e))
}

// ---------------------------------------------------------------------------
// Save (create or overwrite) a skill file
// name = filename without .md
// scope = "global" | "project"
// working_dir required when scope = "project"
// ---------------------------------------------------------------------------

#[tauri::command]
pub async fn save_skill(
    name: String,
    content: String,
    scope: String, // "global" | "project"
    working_dir: Option<String>,
) -> Result<String, String> {
    let dir = resolve_commands_dir(&scope, working_dir.as_deref())?;
    tokio::fs::create_dir_all(&dir)
        .await
        .map_err(|e| format!("Failed to create commands dir: {}", e))?;

    // Sanitize name: allow alphanumeric, hyphen, underscore, space
    let safe_name: String = name
        .chars()
        .map(|c| if c.is_alphanumeric() || c == '-' || c == '_' || c == ' ' { c } else { '-' })
        .collect();
    let safe_name = safe_name.trim().to_string();
    if safe_name.is_empty() {
        return Err("Skill name cannot be empty".to_string());
    }

    let file_path = dir.join(format!("{}.md", safe_name));
    tokio::fs::write(&file_path, content)
        .await
        .map_err(|e| format!("Failed to write skill: {}", e))?;

    Ok(file_path.to_string_lossy().to_string())
}

// ---------------------------------------------------------------------------
// Delete a skill file by absolute path
// ---------------------------------------------------------------------------

#[tauri::command]
pub async fn delete_skill(path: String) -> Result<(), String> {
    tokio::fs::remove_file(&path)
        .await
        .map_err(|e| format!("Failed to delete skill: {}", e))
}

// ---------------------------------------------------------------------------
// Helper
// ---------------------------------------------------------------------------

fn resolve_commands_dir(scope: &str, working_dir: Option<&str>) -> Result<PathBuf, String> {
    match scope {
        "project" => {
            let wd = working_dir.ok_or("working_dir required for project scope")?;
            Ok(PathBuf::from(wd).join(".claude").join("commands"))
        }
        _ => {
            let home = std::env::var("HOME").map_err(|_| "HOME not set")?;
            Ok(PathBuf::from(home).join(".claude").join("commands"))
        }
    }
}

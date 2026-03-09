use std::collections::HashMap;
use std::sync::{Arc, Mutex};

use tauri::Emitter;
use tokio::io::{AsyncBufReadExt, BufReader};
use tokio::process::Child;

use crate::models::agent::{AgentEvent, AgentStartParams, FileDiffResult, FileSnapshot};

// ---------------------------------------------------------------------------
// Process registry — stored as Tauri managed state
// ---------------------------------------------------------------------------

#[derive(Default)]
pub struct AgentProcessRegistry {
    pub processes: Arc<Mutex<HashMap<String, Child>>>,
}

// ---------------------------------------------------------------------------
// Helper: find the claude CLI binary
// ---------------------------------------------------------------------------

#[tauri::command]
pub async fn find_claude_cli() -> Result<String, String> {
    // Try `which claude` via sh (works even with nvm-managed node)
    let output = tokio::process::Command::new("sh")
        .args(["-c", "which claude 2>/dev/null || echo ''"])
        .output()
        .await
        .map_err(|e| e.to_string())?;

    let path = String::from_utf8_lossy(&output.stdout).trim().to_string();
    if !path.is_empty() && std::path::Path::new(&path).exists() {
        return Ok(path);
    }

    // Fallback: scan nvm node bin dirs
    let home = std::env::var("HOME").unwrap_or_default();
    let nvm_dir = format!("{}/.nvm/versions/node", home);
    if let Ok(entries) = std::fs::read_dir(&nvm_dir) {
        for entry in entries.flatten() {
            let candidate = entry.path().join("bin").join("claude");
            if candidate.exists() {
                return Ok(candidate.to_string_lossy().to_string());
            }
        }
    }

    // Common absolute paths
    for p in &[
        "/usr/local/bin/claude",
        "/opt/homebrew/bin/claude",
        "/usr/bin/claude",
    ] {
        if std::path::Path::new(p).exists() {
            return Ok(p.to_string());
        }
    }

    Err("claude CLI not found. Install it with: npm install -g @anthropic-ai/claude-code".to_string())
}

// ---------------------------------------------------------------------------
// File snapshot (before agent runs)
// ---------------------------------------------------------------------------

#[tauri::command]
pub async fn take_file_snapshot(paths: Vec<String>) -> Result<Vec<FileSnapshot>, String> {
    let mut snapshots = Vec::new();
    for path in paths {
        let content = match tokio::fs::read_to_string(&path).await {
            Ok(c) => Some(c),
            Err(_) => None, // file doesn't exist yet
        };
        snapshots.push(FileSnapshot { path, content });
    }
    Ok(snapshots)
}

// ---------------------------------------------------------------------------
// Compute diff after agent completes
// ---------------------------------------------------------------------------

#[tauri::command]
pub async fn get_file_diff(
    snapshot: Vec<FileSnapshot>,
    paths: Vec<String>,
) -> Result<Vec<FileDiffResult>, String> {
    use similar::TextDiff;

    let mut results = Vec::new();

    // Collect all unique paths from both snapshot and current paths
    let mut all_paths: Vec<String> = snapshot.iter().map(|s| s.path.clone()).collect();
    for p in &paths {
        if !all_paths.contains(p) {
            all_paths.push(p.clone());
        }
    }

    for path in all_paths {
        let old_content = snapshot
            .iter()
            .find(|s| s.path == path)
            .and_then(|s| s.content.clone());

        let new_content = match tokio::fs::read_to_string(&path).await {
            Ok(c) => Some(c),
            Err(_) => None,
        };

        // Skip if nothing changed
        if old_content == new_content {
            continue;
        }

        let change_type = match (&old_content, &new_content) {
            (None, Some(_)) => "created",
            (Some(_), None) => "deleted",
            _ => "modified",
        };

        let old_str = old_content.as_deref().unwrap_or("");
        let new_str = new_content.as_deref().unwrap_or("");

        let diff = TextDiff::from_lines(old_str, new_str);
        let unified_diff = diff
            .unified_diff()
            .context_radius(3)
            .header(&format!("a/{}", path), &format!("b/{}", path))
            .to_string();

        let mut additions = 0i32;
        let mut deletions = 0i32;
        for change in diff.iter_all_changes() {
            match change.tag() {
                similar::ChangeTag::Insert => additions += 1,
                similar::ChangeTag::Delete => deletions += 1,
                similar::ChangeTag::Equal => {}
            }
        }

        results.push(FileDiffResult {
            path,
            change_type: change_type.to_string(),
            old_content,
            new_content,
            unified_diff,
            additions,
            deletions,
        });
    }

    Ok(results)
}

// ---------------------------------------------------------------------------
// Revert changes (restore from snapshot)
// ---------------------------------------------------------------------------

#[tauri::command]
pub async fn revert_agent_changes(snapshot: Vec<FileSnapshot>) -> Result<(), String> {
    for snap in snapshot {
        match snap.content {
            Some(content) => {
                // Restore original content
                tokio::fs::write(&snap.path, content)
                    .await
                    .map_err(|e| format!("Failed to restore {}: {}", snap.path, e))?;
            }
            None => {
                // File didn't exist before — delete it if it exists now
                if std::path::Path::new(&snap.path).exists() {
                    tokio::fs::remove_file(&snap.path)
                        .await
                        .map_err(|e| format!("Failed to delete {}: {}", snap.path, e))?;
                }
            }
        }
    }
    Ok(())
}

// ---------------------------------------------------------------------------
// Start Claude agent
// ---------------------------------------------------------------------------

#[tauri::command]
pub async fn start_claude_agent(
    app: tauri::AppHandle,
    registry: tauri::State<'_, AgentProcessRegistry>,
    params: AgentStartParams,
) -> Result<(), String> {
    let session_id = params.session_id.clone();
    let timeout_secs = params.timeout_seconds.unwrap_or(300);

    // Build the prompt
    let full_prompt = if params.inline_context && !params.context_files.is_empty() {
        build_inline_prompt(&params.task, &params.context_files).await
    } else {
        params.task.clone()
    };

    // Build command arguments
    let mut args: Vec<String> = vec![
        "--print".to_string(),
        "--output-format".to_string(),
        "stream-json".to_string(),
        "--include-partial-messages".to_string(),
        "--permission-mode".to_string(),
        params.permission_mode.clone(),
        "--session-id".to_string(),
        session_id.clone(),
    ];

    if let Some(model) = &params.model {
        args.push("--model".to_string());
        args.push(model.clone());
    }

    if !params.inline_context {
        args.push("--add-dir".to_string());
        args.push(params.working_directory.clone());
    }

    if let Some(tools) = &params.allowed_tools {
        if !tools.is_empty() {
            args.push("--allowedTools".to_string());
            args.push(tools.join(","));
        }
    }

    if let Some(tools) = &params.disallowed_tools {
        if !tools.is_empty() {
            args.push("--disallowedTools".to_string());
            args.push(tools.join(","));
        }
    }

    if let Some(sys) = &params.append_system_prompt {
        args.push("--append-system-prompt".to_string());
        args.push(sys.clone());
    }

    args.push(full_prompt);

    // Spawn the process
    let mut cmd = tokio::process::Command::new(&params.claude_cli_path);
    cmd.args(&args)
        .current_dir(&params.working_directory)
        .stdout(std::process::Stdio::piped())
        .stderr(std::process::Stdio::piped())
        .env_remove("CLAUDECODE") // avoid nested invocation error
        .env_remove("CLAUDE_CODE_ENTRYPOINT");

    if let Some(key) = &params.api_key {
        if !key.is_empty() {
            cmd.env("ANTHROPIC_API_KEY", key);
        }
    }
    if let Some(url) = &params.base_url {
        if !url.is_empty() {
            cmd.env("ANTHROPIC_BASE_URL", url);
        }
    }

    let mut child = cmd.spawn().map_err(|e| {
        format!("Failed to spawn claude CLI ({}): {}", params.claude_cli_path, e)
    })?;

    let stdout = child
        .stdout
        .take()
        .ok_or("Failed to capture stdout")?;

    let stderr = child
        .stderr
        .take()
        .ok_or("Failed to capture stderr")?;

    // Store in registry
    {
        let mut procs = registry.processes.lock().unwrap();
        procs.insert(session_id.clone(), child);
    }

    // Emit status change: running
    let _ = app.emit(
        "agent:event",
        AgentEvent::StatusChange {
            session_id: session_id.clone(),
            status: "running".to_string(),
        },
    );

    // Spawn async task to read stdout
    let app_clone = app.clone();
    let sid = session_id.clone();
    let registry_arc = registry.processes.clone();

    tokio::spawn(async move {
        let run_result = tokio::time::timeout(
            std::time::Duration::from_secs(timeout_secs),
            process_agent_output(app_clone.clone(), sid.clone(), stdout, stderr),
        )
        .await;

        // Clean up registry
        {
            let mut procs = registry_arc.lock().unwrap();
            procs.remove(&sid);
        }

        match run_result {
            Ok(Ok(())) => {
                // Completed event is emitted inside process_agent_output
            }
            Ok(Err(e)) => {
                let _ = app_clone.emit(
                    "agent:event",
                    AgentEvent::Error {
                        session_id: sid.clone(),
                        message: e,
                    },
                );
                let _ = app_clone.emit(
                    "agent:event",
                    AgentEvent::StatusChange {
                        session_id: sid,
                        status: "error".to_string(),
                    },
                );
            }
            Err(_) => {
                // Timeout
                let _ = app_clone.emit(
                    "agent:event",
                    AgentEvent::Error {
                        session_id: sid.clone(),
                        message: format!("Agent timed out after {} seconds", timeout_secs),
                    },
                );
                let _ = app_clone.emit(
                    "agent:event",
                    AgentEvent::StatusChange {
                        session_id: sid,
                        status: "error".to_string(),
                    },
                );
            }
        }
    });

    Ok(())
}

// ---------------------------------------------------------------------------
// Stop Claude agent
// ---------------------------------------------------------------------------

#[tauri::command]
pub async fn stop_claude_agent(
    app: tauri::AppHandle,
    registry: tauri::State<'_, AgentProcessRegistry>,
    session_id: String,
) -> Result<(), String> {
    // Take the child out while holding the lock, then drop the lock before await
    let child_opt = {
        let mut procs = registry.processes.lock().unwrap();
        procs.remove(&session_id)
    };
    if let Some(mut child) = child_opt {
        let _ = child.kill().await;
    }
    let _ = app.emit(
        "agent:event",
        AgentEvent::StatusChange {
            session_id: session_id.clone(),
            status: "cancelled".to_string(),
        },
    );
    Ok(())
}

// ---------------------------------------------------------------------------
// Internal: read and parse stream-json output
// ---------------------------------------------------------------------------

async fn process_agent_output(
    app: tauri::AppHandle,
    session_id: String,
    stdout: tokio::process::ChildStdout,
    _stderr: tokio::process::ChildStderr,
) -> Result<(), String> {
    let mut reader = BufReader::new(stdout).lines();
    let mut num_turns: u32 = 0;
    #[allow(unused_assignments)]
    let mut cost_usd: Option<f64> = None;
    // Track partial text accumulation per assistant turn
    let mut current_text = String::new();

    while let Ok(Some(line)) = reader.next_line().await {
        let line = line.trim().to_string();
        if line.is_empty() {
            continue;
        }

        let Ok(json): Result<serde_json::Value, _> = serde_json::from_str(&line) else {
            continue;
        };

        let msg_type = json.get("type").and_then(|v| v.as_str()).unwrap_or("");
        let subtype = json.get("subtype").and_then(|v| v.as_str()).unwrap_or("");

        match msg_type {
            "system" => {
                // init event — ignore or log
            }
            "assistant" => {
                if let Some(content) = json
                    .get("message")
                    .and_then(|m| m.get("content"))
                    .and_then(|c| c.as_array())
                {
                    for block in content {
                        let block_type = block.get("type").and_then(|v| v.as_str()).unwrap_or("");
                        match block_type {
                            "text" => {
                                if let Some(text) = block.get("text").and_then(|v| v.as_str()) {
                                    // Emit delta
                                    let delta = if current_text.is_empty() {
                                        text.to_string()
                                    } else {
                                        // For partial messages, compute the new portion
                                        if text.starts_with(&current_text) {
                                            text[current_text.len()..].to_string()
                                        } else {
                                            text.to_string()
                                        }
                                    };
                                    current_text = text.to_string();
                                    if !delta.is_empty() {
                                        let _ = app.emit(
                                            "agent:event",
                                            AgentEvent::TextDelta {
                                                session_id: session_id.clone(),
                                                text: delta,
                                            },
                                        );
                                    }
                                }
                            }
                            "tool_use" => {
                                current_text.clear(); // reset for next text block
                                let tool_id = block
                                    .get("id")
                                    .and_then(|v| v.as_str())
                                    .unwrap_or("")
                                    .to_string();
                                let tool_name = block
                                    .get("name")
                                    .and_then(|v| v.as_str())
                                    .unwrap_or("")
                                    .to_string();
                                let input = block
                                    .get("input")
                                    .cloned()
                                    .unwrap_or(serde_json::Value::Object(Default::default()));
                                let _ = app.emit(
                                    "agent:event",
                                    AgentEvent::ToolUse {
                                        session_id: session_id.clone(),
                                        tool_id,
                                        tool_name,
                                        input,
                                    },
                                );
                            }
                            _ => {}
                        }
                    }
                }
                num_turns += 1;
            }
            "user" => {
                // Tool results
                if let Some(content) = json
                    .get("message")
                    .and_then(|m| m.get("content"))
                    .and_then(|c| c.as_array())
                {
                    for block in content {
                        let block_type = block.get("type").and_then(|v| v.as_str()).unwrap_or("");
                        if block_type == "tool_result" {
                            let tool_id = block
                                .get("tool_use_id")
                                .and_then(|v| v.as_str())
                                .unwrap_or("")
                                .to_string();
                            let is_error = block
                                .get("is_error")
                                .and_then(|v| v.as_bool())
                                .unwrap_or(false);
                            let result_content = extract_tool_result_content(block);
                            let _ = app.emit(
                                "agent:event",
                                AgentEvent::ToolResult {
                                    session_id: session_id.clone(),
                                    tool_id,
                                    content: result_content,
                                    is_error,
                                },
                            );
                        }
                    }
                }
            }
            "result" => {
                match subtype {
                    "success" => {
                        cost_usd = json
                            .get("cost_usd")
                            .and_then(|v| v.as_f64());
                        if let Some(turns) = json.get("num_turns").and_then(|v| v.as_u64()) {
                            num_turns = turns as u32;
                        }
                        let _ = app.emit(
                            "agent:event",
                            AgentEvent::Completed {
                                session_id: session_id.clone(),
                                num_turns,
                                cost_usd,
                            },
                        );
                        let _ = app.emit(
                            "agent:event",
                            AgentEvent::StatusChange {
                                session_id: session_id.clone(),
                                status: "completed".to_string(),
                            },
                        );
                    }
                    "error_during_execution" | "error" => {
                        let msg = json
                            .get("error")
                            .and_then(|v| v.as_str())
                            .unwrap_or("Unknown error")
                            .to_string();
                        let _ = app.emit(
                            "agent:event",
                            AgentEvent::Error {
                                session_id: session_id.clone(),
                                message: msg,
                            },
                        );
                        let _ = app.emit(
                            "agent:event",
                            AgentEvent::StatusChange {
                                session_id: session_id.clone(),
                                status: "error".to_string(),
                            },
                        );
                    }
                    _ => {}
                }
            }
            _ => {}
        }
    }

    Ok(())
}

fn extract_tool_result_content(block: &serde_json::Value) -> String {
    if let Some(content) = block.get("content") {
        match content {
            serde_json::Value::String(s) => return s.clone(),
            serde_json::Value::Array(arr) => {
                let parts: Vec<String> = arr
                    .iter()
                    .filter_map(|item| {
                        if item.get("type").and_then(|v| v.as_str()) == Some("text") {
                            item.get("text").and_then(|v| v.as_str()).map(|s| s.to_string())
                        } else {
                            None
                        }
                    })
                    .collect();
                return parts.join("\n");
            }
            _ => {}
        }
    }
    String::new()
}

async fn build_inline_prompt(task: &str, context_files: &[String]) -> String {
    let mut prompt = String::new();
    prompt.push_str("<context>\n");
    for path in context_files {
        match tokio::fs::read_to_string(path).await {
            Ok(content) => {
                prompt.push_str(&format!("<file path=\"{}\">\n{}\n</file>\n", path, content));
            }
            Err(_) => {
                prompt.push_str(&format!("<file path=\"{}\" error=\"could not read\" />\n", path));
            }
        }
    }
    prompt.push_str("</context>\n\n");
    prompt.push_str(task);
    prompt
}

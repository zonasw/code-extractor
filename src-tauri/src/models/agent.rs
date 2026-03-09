use serde::{Deserialize, Serialize};

#[derive(Debug, Serialize, Deserialize, Clone)]
pub struct AgentStartParams {
    pub session_id: String,
    pub task: String,
    pub working_directory: String,
    pub context_files: Vec<String>,
    pub permission_mode: String,
    pub model: Option<String>,
    pub allowed_tools: Option<Vec<String>>,
    pub disallowed_tools: Option<Vec<String>>,
    pub append_system_prompt: Option<String>,
    pub timeout_seconds: Option<u64>,
    pub claude_cli_path: String,
    pub inline_context: bool, // true = inline files in prompt, false = use --add-dir
    pub api_key: Option<String>,
    pub base_url: Option<String>,
}

/// Events emitted to the frontend via app.emit("agent:event", ...)
#[derive(Debug, Serialize, Deserialize, Clone)]
#[serde(tag = "kind", rename_all = "snake_case")]
pub enum AgentEvent {
    TextDelta {
        session_id: String,
        text: String,
    },
    ToolUse {
        session_id: String,
        tool_id: String,
        tool_name: String,
        input: serde_json::Value,
    },
    ToolResult {
        session_id: String,
        tool_id: String,
        content: String,
        is_error: bool,
    },
    StatusChange {
        session_id: String,
        status: String,
    },
    Completed {
        session_id: String,
        num_turns: u32,
        cost_usd: Option<f64>,
    },
    Error {
        session_id: String,
        message: String,
    },
}

#[derive(Debug, Serialize, Deserialize, Clone)]
pub struct FileSnapshot {
    pub path: String,
    pub content: Option<String>, // None = file didn't exist before
}

#[derive(Debug, Serialize, Deserialize, Clone)]
pub struct FileDiffResult {
    pub path: String,
    pub change_type: String, // "created" | "modified" | "deleted"
    pub old_content: Option<String>,
    pub new_content: Option<String>,
    pub unified_diff: String,
    pub additions: i32,
    pub deletions: i32,
}

export type AgentStatus =
  | "idle"
  | "running"
  | "waiting_approval"
  | "completed"
  | "error"
  | "cancelled";

export type AgentPermissionMode =
  | "acceptEdits"
  | "bypassPermissions"
  | "default"
  | "dontAsk"
  | "plan";

export type AgentMessageType =
  | "text"
  | "tool_use"
  | "tool_result"
  | "thinking"
  | "system"
  | "error";

export interface AgentMessage {
  id: string;
  type: AgentMessageType;
  role: "user" | "assistant";
  content: string;
  toolCall?: {
    toolName: string;
    toolId: string;
    input: Record<string, unknown>;
    result?: string;
    isError?: boolean;
  };
  timestamp: number;
  isPartial?: boolean;
}

export type FileChangeType = "created" | "modified" | "deleted";

export interface FileChange {
  path: string;
  changeType: FileChangeType;
  unifiedDiff?: string;
  additions?: number;
  deletions?: number;
  oldContent?: string;
  newContent?: string;
}

export interface AgentSession {
  id: string;
  task: string;
  status: AgentStatus;
  workingDirectory: string;
  contextPaths: string[];
  startedAt: number;
  endedAt?: number;
  messages: AgentMessage[];
  fileChanges: FileChange[];
  error?: string;
  permissionMode: AgentPermissionMode;
  numTurns?: number;
  costUsd?: number;
}

export interface AgentConfig {
  model: string;
  permissionMode: AgentPermissionMode;
  allowedTools?: string[];
  disallowedTools?: string[];
  claudeCliPath?: string;
  timeoutSeconds?: number;
  systemPromptAppend?: string;
  inlineContext: boolean;
  apiKey?: string;
  baseUrl?: string;
}

// Events emitted from Rust backend
export type AgentEventKind =
  | { kind: "text_delta"; session_id: string; text: string }
  | { kind: "tool_use"; session_id: string; tool_id: string; tool_name: string; input: Record<string, unknown> }
  | { kind: "tool_result"; session_id: string; tool_id: string; content: string; is_error: boolean }
  | { kind: "status_change"; session_id: string; status: AgentStatus }
  | { kind: "completed"; session_id: string; num_turns: number; cost_usd?: number }
  | { kind: "error"; session_id: string; message: string };

export interface FileSnapshot {
  path: string;
  content: string | null;
}

export interface FileDiffResult {
  path: string;
  change_type: FileChangeType;
  old_content: string | null;
  new_content: string | null;
  unified_diff: string;
  additions: number;
  deletions: number;
}

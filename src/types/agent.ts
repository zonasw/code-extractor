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
  // multi-turn: id of the session this one resumes
  resumeSessionId?: string;
  // git integration
  isGitRepo: boolean;
  gitBranch?: string;
  hasUncommittedChanges?: boolean;
  uncommittedCount?: number;
}

// Skills / Claude commands (~/.claude/commands/*.md)
export interface Skill {
  name: string;
  description: string;
  content: string;
  path: string;
  isProject: boolean;
}

export interface GitRepoInfo {
  is_git_repo: boolean;
  branch: string | null;
  has_uncommitted_changes: boolean;
  uncommitted_count: number;
}

export interface GitFileDiff {
  path: string;
  change_type: FileChangeType;
  diff: string;
  additions: number;
  deletions: number;
}

export type AgentProvider = "anthropic" | "openrouter" | "custom";

export const PROVIDER_MODELS: Record<AgentProvider, { value: string; label: string }[]> = {
  anthropic: [
    { value: "claude-sonnet-4-6", label: "Claude Sonnet 4.6" },
    { value: "claude-opus-4-6", label: "Claude Opus 4.6" },
    { value: "claude-haiku-4-5-20251001", label: "Claude Haiku 4.5" },
  ],
  openrouter: [
    { value: "anthropic/claude-sonnet-4-5", label: "Claude Sonnet 4.5" },
    { value: "anthropic/claude-opus-4-5", label: "Claude Opus 4.5" },
    { value: "anthropic/claude-haiku-4-5", label: "Claude Haiku 4.5" },
  ],
  custom: [
    { value: "claude-sonnet-4-6", label: "Claude Sonnet 4.6" },
    { value: "claude-opus-4-6", label: "Claude Opus 4.6" },
  ],
};

export const PROVIDER_DEFAULT_BASE_URL: Record<AgentProvider, string> = {
  anthropic: "",
  openrouter: "https://openrouter.ai/api/v1",
  custom: "",
};

export interface AgentConfig {
  provider: AgentProvider;
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

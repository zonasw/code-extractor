import { useRef, useCallback } from "react";
import { invoke } from "@tauri-apps/api/core";
import { useAgentContext } from "@/context/AgentContext";
import { useAppContext } from "@/context/AppContext";
import { useAgentEvents } from "./useAgentEvents";
import type {
  FileSnapshot,
  AgentSession,
  GitRepoInfo,
} from "@/types/agent";

export function useAgent() {
  const { state: agentState, dispatch } = useAgentContext();
  const { state: appState } = useAppContext();
  // Map: sessionId -> snapshot taken before agent ran (fallback for non-git)
  const snapshotRef = useRef<Record<string, FileSnapshot[]>>({});
  // Always-fresh ref so revertChanges doesn't need agentState in its dep array
  const sessionsRef = useRef(agentState.sessions);
  sessionsRef.current = agentState.sessions;

  // 事件监听与 diff 计算委托给独立 hook
  useAgentEvents(snapshotRef);

  // ---------------------------------------------------------------------------
  // Start agent (new session or continuation)
  // ---------------------------------------------------------------------------
  const startAgent = useCallback(
    async (task: string, resumeFromSessionId?: string) => {
      const contextPaths = Array.from(appState.selectedPaths);
      const workingDirectory =
        appState.rootNodes.length > 0 ? appState.rootNodes[0].path : ".";

      const sessionId = crypto.randomUUID();
      const { config } = agentState;

      // Discover claude CLI path
      let claudeCliPath = config.claudeCliPath ?? "";
      if (!claudeCliPath) {
        try {
          claudeCliPath = await invoke<string>("find_claude_cli");
        } catch (e) {
          throw new Error(`找不到 claude CLI: ${e}`);
        }
      }

      // Check git repo (parallel with snapshot)
      const [gitInfo, snapshot] = await Promise.all([
        invoke<GitRepoInfo>("check_git_repo", { path: workingDirectory }),
        invoke<FileSnapshot[]>("take_file_snapshot", { paths: contextPaths }),
      ]);

      snapshotRef.current[sessionId] = snapshot;

      // Build session
      const session: AgentSession = {
        id: sessionId,
        task,
        status: "running",
        workingDirectory,
        contextPaths,
        startedAt: Date.now(),
        messages: [
          {
            id: `user-${Date.now()}`,
            type: "text",
            role: "user",
            content: task,
            timestamp: Date.now(),
          },
        ],
        fileChanges: [],
        permissionMode: config.permissionMode,
        isGitRepo: gitInfo.is_git_repo,
        gitBranch: gitInfo.branch ?? undefined,
        hasUncommittedChanges: gitInfo.has_uncommitted_changes,
        uncommittedCount: gitInfo.uncommitted_count,
        resumeSessionId: resumeFromSessionId,
      };
      dispatch({ type: "START_SESSION", payload: session });

      // Start the agent process
      await invoke("start_claude_agent", {
        params: {
          session_id: sessionId,
          task,
          working_directory: workingDirectory,
          context_files: contextPaths,
          permission_mode: config.permissionMode,
          model: config.model,
          allowed_tools: config.allowedTools,
          disallowed_tools: config.disallowedTools,
          append_system_prompt: config.systemPromptAppend,
          timeout_seconds: config.timeoutSeconds,
          claude_cli_path: claudeCliPath,
          inline_context: config.inlineContext,
          api_key: config.apiKey ?? null,
          base_url: config.baseUrl ?? null,
          resume_session_id: resumeFromSessionId ?? null,
        },
      });
    },
    [appState.selectedPaths, appState.rootNodes, agentState.config, dispatch]
  );

  // ---------------------------------------------------------------------------
  // Stop agent
  // ---------------------------------------------------------------------------
  const stopAgent = useCallback(async (sessionId: string) => {
    try {
      await invoke("stop_claude_agent", { sessionId });
    } catch (e) {
      console.error("stop_claude_agent failed:", e);
    }
  }, []);

  // ---------------------------------------------------------------------------
  // Revert — git when available, snapshot otherwise
  // ---------------------------------------------------------------------------
  const revertChanges = useCallback(
    async (sessionId: string) => {
      const session = sessionsRef.current[sessionId];
      if (!session) return;

      if (session.isGitRepo) {
        await invoke("git_revert_all", { workingDir: session.workingDirectory });
      } else {
        const snapshot = snapshotRef.current[sessionId];
        if (!snapshot) return;
        await invoke("revert_agent_changes", { snapshot });
      }

      dispatch({ type: "ADD_FILE_CHANGES", payload: { sessionId, changes: [] } });
    },
    [dispatch]
  );

  // ---------------------------------------------------------------------------
  // Continue an existing session
  // ---------------------------------------------------------------------------
  const continueSession = useCallback(
    async (prevSession: AgentSession, task: string) => {
      await startAgent(task, prevSession.id);
    },
    [startAgent]
  );

  // ---------------------------------------------------------------------------
  // Expose
  // ---------------------------------------------------------------------------
  const activeSession = agentState.activeSessionId
    ? agentState.sessions[agentState.activeSessionId]
    : null;

  const isRunning = activeSession?.status === "running";

  return {
    agentState,
    dispatch,
    activeSession,
    isRunning,
    startAgent,
    stopAgent,
    revertChanges,
    continueSession,
  };
}

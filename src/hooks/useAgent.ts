import { useEffect, useRef, useCallback } from "react";
import { invoke } from "@tauri-apps/api/core";
import { listen } from "@tauri-apps/api/event";
import { useAgentContext } from "@/context/AgentContext";
import { useAppContext } from "@/context/AppContext";
import type {
  AgentEventKind,
  FileSnapshot,
  FileDiffResult,
  AgentSession,
  GitRepoInfo,
  GitFileDiff,
} from "@/types/agent";

export function useAgent() {
  const { state: agentState, dispatch } = useAgentContext();
  const { state: appState } = useAppContext();
  // Map: sessionId -> snapshot taken before agent ran (fallback for non-git)
  const snapshotRef = useRef<Record<string, FileSnapshot[]>>({});
  // requestAnimationFrame batch for text deltas
  const pendingDeltaRef = useRef<Record<string, string>>({});
  const rafRef = useRef<number | null>(null);

  // ---------------------------------------------------------------------------
  // Listen for agent events from Rust
  // ---------------------------------------------------------------------------
  useEffect(() => {
    const unlistenPromise = listen<AgentEventKind>("agent:event", (event) => {
      handleAgentEvent(event.payload);
    });
    return () => {
      unlistenPromise.then((fn) => fn());
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  function flushDeltas() {
    const pending = pendingDeltaRef.current;
    pendingDeltaRef.current = {};
    rafRef.current = null;
    for (const [sessionId, delta] of Object.entries(pending)) {
      if (delta) {
        dispatch({ type: "UPDATE_LAST_TEXT", payload: { sessionId, delta } });
      }
    }
  }

  function handleAgentEvent(payload: AgentEventKind) {
    switch (payload.kind) {
      case "text_delta": {
        const sid = payload.session_id;
        pendingDeltaRef.current[sid] = (pendingDeltaRef.current[sid] ?? "") + payload.text;
        if (!rafRef.current) {
          rafRef.current = requestAnimationFrame(flushDeltas);
        }
        break;
      }
      case "tool_use": {
        dispatch({
          type: "APPEND_MESSAGE",
          payload: {
            sessionId: payload.session_id,
            message: {
              id: `tool-${payload.tool_id}`,
              type: "tool_use",
              role: "assistant",
              content: "",
              toolCall: {
                toolId: payload.tool_id,
                toolName: payload.tool_name,
                input: payload.input as Record<string, unknown>,
              },
              timestamp: Date.now(),
            },
          },
        });
        break;
      }
      case "tool_result": {
        dispatch({
          type: "ADD_TOOL_RESULT",
          payload: {
            sessionId: payload.session_id,
            toolId: payload.tool_id,
            result: payload.content,
            isError: payload.is_error,
          },
        });
        break;
      }
      case "status_change": {
        dispatch({
          type: "SET_SESSION_STATUS",
          payload: { sessionId: payload.session_id, status: payload.status },
        });
        if (payload.status === "completed") {
          computeDiff(payload.session_id);
        }
        break;
      }
      case "completed": {
        dispatch({
          type: "SET_SESSION_STATUS",
          payload: {
            sessionId: payload.session_id,
            status: "completed",
            numTurns: payload.num_turns,
            costUsd: payload.cost_usd,
          },
        });
        computeDiff(payload.session_id);
        break;
      }
      case "error": {
        dispatch({
          type: "APPEND_MESSAGE",
          payload: {
            sessionId: payload.session_id,
            message: {
              id: `err-${Date.now()}`,
              type: "error",
              role: "assistant",
              content: payload.message,
              timestamp: Date.now(),
            },
          },
        });
        break;
      }
    }
  }

  // ---------------------------------------------------------------------------
  // Compute diff — git-based when available, snapshot fallback otherwise
  // ---------------------------------------------------------------------------
  async function computeDiff(sessionId: string) {
    // Need to read from the ref on the sessions map
    const session = agentState.sessions[sessionId];
    if (!session) return;

    try {
      if (session.isGitRepo) {
        // Use git diff HEAD — captures everything the agent changed
        const diffs = await invoke<GitFileDiff[]>("git_get_diff", {
          workingDir: session.workingDirectory,
        });
        if (diffs.length > 0) {
          dispatch({
            type: "ADD_FILE_CHANGES",
            payload: {
              sessionId,
              changes: diffs.map((d) => ({
                path: d.path,
                changeType: d.change_type,
                unifiedDiff: d.diff,
                additions: d.additions,
                deletions: d.deletions,
              })),
            },
          });
        }
      } else {
        // Fallback: snapshot-based diff
        const snapshot = snapshotRef.current[sessionId];
        if (!snapshot) return;
        const diffs = await invoke<FileDiffResult[]>("get_file_diff", {
          snapshot,
          paths: session.contextPaths,
        });
        if (diffs.length > 0) {
          dispatch({
            type: "ADD_FILE_CHANGES",
            payload: {
              sessionId,
              changes: diffs.map((d) => ({
                path: d.path,
                changeType: d.change_type,
                unifiedDiff: d.unified_diff,
                additions: d.additions,
                deletions: d.deletions,
                oldContent: d.old_content ?? undefined,
                newContent: d.new_content ?? undefined,
              })),
            },
          });
        }
      }
    } catch (e) {
      console.error("computeDiff failed:", e);
    }
  }

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
    [appState.selectedPaths, appState.rootNodes, agentState, dispatch]
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
      const session = agentState.sessions[sessionId];
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
    [agentState.sessions, dispatch]
  );

  // ---------------------------------------------------------------------------
  // Expose
  // ---------------------------------------------------------------------------
  const activeSession = agentState.activeSessionId
    ? agentState.sessions[agentState.activeSessionId]
    : null;

  const isRunning = activeSession?.status === "running";

  // ---------------------------------------------------------------------------
  // Continue an existing session
  // ---------------------------------------------------------------------------
  const continueSession = useCallback(
    async (prevSession: AgentSession, task: string) => {
      await startAgent(task, prevSession.id);
    },
    [startAgent]
  );

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

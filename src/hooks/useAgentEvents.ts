import { useEffect, useRef } from "react";
import { listen } from "@tauri-apps/api/event";
import { invoke } from "@tauri-apps/api/core";
import { useAgentContext } from "@/context/AgentContext";
import type {
  AgentEventKind,
  FileSnapshot,
  FileDiffResult,
  GitFileDiff,
} from "@/types/agent";

/**
 * 负责监听来自 Rust 的 agent 事件，并将 text delta 通过 RAF 批量合并后提交给上下文。
 * 同时在 session 完成时自动计算文件 diff。
 */
export function useAgentEvents(snapshotRef: React.MutableRefObject<Record<string, FileSnapshot[]>>) {
  const { state: agentState, dispatch } = useAgentContext();
  const pendingDeltaRef = useRef<Record<string, string>>({});
  const rafRef = useRef<number | null>(null);

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

  async function computeDiff(sessionId: string) {
    const session = agentState.sessions[sessionId];
    if (!session) return;

    try {
      if (session.isGitRepo) {
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
          delete snapshotRef.current[payload.session_id];
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
        delete snapshotRef.current[payload.session_id];
        break;
      }
      case "error": {
        dispatch({
          type: "APPEND_MESSAGE",
          payload: {
            sessionId: payload.session_id,
            message: {
              id: `err-${Date.now()}-${Math.random().toString(36).slice(2)}`,
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

  useEffect(() => {
    const unlistenPromise = listen<AgentEventKind>("agent:event", (event) => {
      handleAgentEvent(event.payload);
    });
    return () => {
      unlistenPromise.then((fn) => fn());
      if (rafRef.current !== null) {
        cancelAnimationFrame(rafRef.current);
        rafRef.current = null;
      }
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
}

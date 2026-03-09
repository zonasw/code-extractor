import React, { createContext, useContext, useReducer, Dispatch } from "react";
import {
  AgentSession,
  AgentStatus,
  AgentMessage,
  FileChange,
  AgentConfig,
  AgentPermissionMode,
} from "@/types/agent";

// ---------------------------------------------------------------------------
// State & Actions
// ---------------------------------------------------------------------------

interface AgentState {
  sessions: Record<string, AgentSession>;
  activeSessionId: string | null;
  config: AgentConfig;
}

export type AgentAction =
  | { type: "START_SESSION"; payload: AgentSession }
  | { type: "APPEND_MESSAGE"; payload: { sessionId: string; message: AgentMessage } }
  | { type: "UPDATE_LAST_TEXT"; payload: { sessionId: string; delta: string } }
  | { type: "ADD_TOOL_RESULT"; payload: { sessionId: string; toolId: string; result: string; isError: boolean } }
  | { type: "SET_SESSION_STATUS"; payload: { sessionId: string; status: AgentStatus; numTurns?: number; costUsd?: number } }
  | { type: "ADD_FILE_CHANGES"; payload: { sessionId: string; changes: FileChange[] } }
  | { type: "SET_ACTIVE_SESSION"; payload: string | null }
  | { type: "SET_CONFIG"; payload: Partial<AgentConfig> }
  | { type: "CLEAR_SESSION"; payload: string };

// ---------------------------------------------------------------------------
// Default config
// ---------------------------------------------------------------------------

const defaultConfig: AgentConfig = {
  model: "claude-sonnet-4-6",
  permissionMode: "acceptEdits" as AgentPermissionMode,
  inlineContext: true,
  timeoutSeconds: 300,
};

const initialState: AgentState = {
  sessions: {},
  activeSessionId: null,
  config: defaultConfig,
};

// ---------------------------------------------------------------------------
// Reducer
// ---------------------------------------------------------------------------

function agentReducer(state: AgentState, action: AgentAction): AgentState {
  switch (action.type) {
    case "START_SESSION": {
      const session = action.payload;
      return {
        ...state,
        sessions: { ...state.sessions, [session.id]: session },
        activeSessionId: session.id,
      };
    }

    case "APPEND_MESSAGE": {
      const { sessionId, message } = action.payload;
      const session = state.sessions[sessionId];
      if (!session) return state;
      return {
        ...state,
        sessions: {
          ...state.sessions,
          [sessionId]: {
            ...session,
            messages: [...session.messages, message],
          },
        },
      };
    }

    case "UPDATE_LAST_TEXT": {
      const { sessionId, delta } = action.payload;
      const session = state.sessions[sessionId];
      if (!session) return state;
      const messages = [...session.messages];
      const last = messages[messages.length - 1];
      if (last && last.type === "text" && last.role === "assistant") {
        messages[messages.length - 1] = { ...last, content: last.content + delta };
      } else {
        messages.push({
          id: `text-${Date.now()}-${Math.random()}`,
          type: "text",
          role: "assistant",
          content: delta,
          timestamp: Date.now(),
        });
      }
      return {
        ...state,
        sessions: {
          ...state.sessions,
          [sessionId]: { ...session, messages },
        },
      };
    }

    case "ADD_TOOL_RESULT": {
      const { sessionId, toolId, result, isError } = action.payload;
      const session = state.sessions[sessionId];
      if (!session) return state;
      // Find the tool_use message with this toolId and update its result
      const messages = session.messages.map((m) => {
        if (m.type === "tool_use" && m.toolCall?.toolId === toolId) {
          return {
            ...m,
            toolCall: { ...m.toolCall!, result, isError },
          };
        }
        return m;
      });
      return {
        ...state,
        sessions: {
          ...state.sessions,
          [sessionId]: { ...session, messages },
        },
      };
    }

    case "SET_SESSION_STATUS": {
      const { sessionId, status, numTurns, costUsd } = action.payload;
      const session = state.sessions[sessionId];
      if (!session) return state;
      const isTerminal = ["completed", "error", "cancelled"].includes(status);
      return {
        ...state,
        sessions: {
          ...state.sessions,
          [sessionId]: {
            ...session,
            status,
            ...(numTurns !== undefined && { numTurns }),
            ...(costUsd !== undefined && { costUsd }),
            ...(isTerminal && { endedAt: Date.now() }),
          },
        },
      };
    }

    case "ADD_FILE_CHANGES": {
      const { sessionId, changes } = action.payload;
      const session = state.sessions[sessionId];
      if (!session) return state;
      return {
        ...state,
        sessions: {
          ...state.sessions,
          [sessionId]: {
            ...session,
            fileChanges: changes,
          },
        },
      };
    }

    case "SET_ACTIVE_SESSION":
      return { ...state, activeSessionId: action.payload };

    case "SET_CONFIG":
      return { ...state, config: { ...state.config, ...action.payload } };

    case "CLEAR_SESSION": {
      const { [action.payload]: _, ...rest } = state.sessions;
      return {
        ...state,
        sessions: rest,
        activeSessionId:
          state.activeSessionId === action.payload ? null : state.activeSessionId,
      };
    }

    default:
      return state;
  }
}

// ---------------------------------------------------------------------------
// Context
// ---------------------------------------------------------------------------

interface AgentContextType {
  state: AgentState;
  dispatch: Dispatch<AgentAction>;
}

const AgentContext = createContext<AgentContextType | null>(null);

export function AgentProvider({ children }: { children: React.ReactNode }) {
  const [state, dispatch] = useReducer(agentReducer, initialState);
  return (
    <AgentContext.Provider value={{ state, dispatch }}>
      {children}
    </AgentContext.Provider>
  );
}

export function useAgentContext() {
  const ctx = useContext(AgentContext);
  if (!ctx) throw new Error("useAgentContext must be used within AgentProvider");
  return ctx;
}

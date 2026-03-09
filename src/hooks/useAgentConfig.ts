import { invoke } from "@tauri-apps/api/core";
import { useAgentContext } from "@/context/AgentContext";
import { AgentConfig } from "@/types/agent";

// Fields we persist (excludes runtime-only fields)
type PersistedAgentConfig = Pick<
  AgentConfig,
  "model" | "permissionMode" | "inlineContext" | "apiKey" | "baseUrl" | "claudeCliPath" | "timeoutSeconds"
>;

export function useAgentConfig() {
  const { dispatch } = useAgentContext();

  async function loadAgentConfig() {
    try {
      const raw = await invoke<Partial<PersistedAgentConfig>>("get_agent_config");
      // Only dispatch if there's something saved
      if (raw && Object.keys(raw).length > 0) {
        dispatch({ type: "SET_CONFIG", payload: raw });
      }
    } catch (e) {
      console.error("Failed to load agent config:", e);
    }
  }

  async function saveAgentConfig(config: AgentConfig) {
    const persisted: PersistedAgentConfig = {
      model: config.model,
      permissionMode: config.permissionMode,
      inlineContext: config.inlineContext,
      apiKey: config.apiKey,
      baseUrl: config.baseUrl,
      claudeCliPath: config.claudeCliPath,
      timeoutSeconds: config.timeoutSeconds,
    };
    try {
      await invoke("save_agent_config", { config: persisted });
    } catch (e) {
      console.error("Failed to save agent config:", e);
    }
  }

  return { loadAgentConfig, saveAgentConfig };
}

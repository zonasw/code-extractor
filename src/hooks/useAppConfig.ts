import { invoke } from "@tauri-apps/api/core";
import { useAppContext } from "@/context/AppContext";
import { AppConfig } from "@/types";

export function useAppConfig() {
  const { state, dispatch } = useAppContext();

  async function loadConfig() {
    try {
      const raw = await invoke<Partial<AppConfig>>("get_app_config");
      // Merge with defaults to handle missing fields from old configs
      const config: AppConfig = {
        last_directories: raw.last_directories ?? [],
        ignore_list: raw.ignore_list ?? [],
        extension_filter: raw.extension_filter ?? [],
        prompt_prefix: raw.prompt_prefix ?? "",
        prompt_suffix: raw.prompt_suffix ?? "",
      };
      dispatch({ type: "SET_CONFIG", payload: config });
      return config;
    } catch (e) {
      console.error("Failed to load config:", e);
      return state.config;
    }
  }

  async function saveConfig(config: AppConfig) {
    try {
      await invoke("save_app_config", { config });
      dispatch({ type: "SET_CONFIG", payload: config });
    } catch (e) {
      console.error("Failed to save config:", e);
    }
  }

  function updateIgnoreList(list: string[]) {
    return saveConfig({ ...state.config, ignore_list: list });
  }

  function updateExtensionFilter(filter: string[]) {
    return saveConfig({ ...state.config, extension_filter: filter });
  }

  function updatePromptPrefix(value: string) {
    return saveConfig({ ...state.config, prompt_prefix: value });
  }

  function updatePromptSuffix(value: string) {
    return saveConfig({ ...state.config, prompt_suffix: value });
  }

  function addLastDirectory(dir: string) {
    const dirs = state.config.last_directories;
    if (!dirs.includes(dir)) {
      return saveConfig({ ...state.config, last_directories: [...dirs, dir] });
    }
    return Promise.resolve();
  }

  function removeLastDirectory(dir: string) {
    return saveConfig({
      ...state.config,
      last_directories: state.config.last_directories.filter((d) => d !== dir),
    });
  }

  async function loadSelectedPaths(): Promise<string[]> {
    try {
      return await invoke<string[]>("get_selected_paths");
    } catch {
      return [];
    }
  }

  async function saveSelectedPaths(paths: string[]): Promise<void> {
    try {
      await invoke("save_selected_paths", { paths });
    } catch (e) {
      console.warn("Failed to save selected paths:", e);
    }
  }

  return {
    loadConfig, saveConfig,
    updateIgnoreList, updateExtensionFilter,
    updatePromptPrefix, updatePromptSuffix,
    addLastDirectory, removeLastDirectory,
    loadSelectedPaths, saveSelectedPaths,
  };
}

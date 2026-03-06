import { invoke } from "@tauri-apps/api/core";
import { useAppContext } from "@/context/AppContext";
import { AppConfig } from "@/types";

export function useAppConfig() {
  const { state, dispatch } = useAppContext();

  async function loadConfig() {
    try {
      const config = await invoke<AppConfig>("get_app_config");
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

  return { loadConfig, saveConfig, updateIgnoreList, updateExtensionFilter, addLastDirectory, removeLastDirectory };
}

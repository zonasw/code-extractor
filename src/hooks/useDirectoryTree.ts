import { invoke } from "@tauri-apps/api/core";
import { useAppContext } from "@/context/AppContext";
import { FileNode } from "@/types";

export function useDirectoryTree() {
  const { state, dispatch } = useAppContext();

  async function addDirectory(dirPath: string) {
    dispatch({ type: "SET_LOADING", payload: true });
    try {
      const node = await invoke<FileNode>("read_directory", {
        path: dirPath,
        config: state.config,
      });
      dispatch({ type: "ADD_ROOT_NODE", payload: node });
    } catch (e) {
      console.error("Failed to read directory:", e);
      throw e;
    } finally {
      dispatch({ type: "SET_LOADING", payload: false });
    }
  }

  async function refreshDirectory(dirPath: string) {
    dispatch({ type: "SET_LOADING", payload: true });
    try {
      const node = await invoke<FileNode>("read_directory", {
        path: dirPath,
        config: state.config,
      });
      dispatch({ type: "REPLACE_ROOT_NODE", payload: node });
    } catch (e) {
      console.error("Failed to refresh directory:", e);
    } finally {
      dispatch({ type: "SET_LOADING", payload: false });
    }
  }

  function removeDirectory(dirPath: string) {
    dispatch({ type: "REMOVE_ROOT_NODE", payload: dirPath });
  }

  function collectLeaves(node: FileNode): string[] {
    if (!node.is_dir) return [node.path];
    return node.children.flatMap(collectLeaves);
  }

  function toggleNode(node: FileNode) {
    if (node.is_dir) {
      const leaves = collectLeaves(node);
      const allSelected = leaves.every((p) => state.selectedPaths.has(p));
      if (allSelected) {
        dispatch({ type: "REMOVE_SELECTED_PATHS", payload: leaves });
      } else {
        dispatch({ type: "ADD_SELECTED_PATHS", payload: leaves });
      }
    } else {
      if (state.selectedPaths.has(node.path)) {
        dispatch({ type: "REMOVE_SELECTED_PATH", payload: node.path });
      } else {
        dispatch({ type: "ADD_SELECTED_PATH", payload: node.path });
      }
    }
  }

  return { addDirectory, refreshDirectory, removeDirectory, toggleNode, collectLeaves };
}

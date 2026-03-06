import { invoke } from "@tauri-apps/api/core";
import { save } from "@tauri-apps/plugin-dialog";
import { useAppContext } from "@/context/AppContext";
import { FileNode } from "@/types";

export function useExport() {
  const { state, dispatch } = useAppContext();

  // 将选中路径按根目录分组，保持目录树中的顺序
  function groupByRoot(): Array<{ root: FileNode; paths: string[] }> {
    return state.rootNodes
      .map((root) => {
        const rootPrefix = root.path.endsWith("/") ? root.path : root.path + "/";
        const paths = Array.from(state.selectedPaths)
          .filter((p) => p === root.path || p.startsWith(rootPrefix))
          .sort();
        return { root, paths };
      })
      .filter((g) => g.paths.length > 0);
  }

  // 相对路径：去掉根目录前缀
  function toRelative(filePath: string, rootPath: string): string {
    const prefix = rootPath.endsWith("/") ? rootPath : rootPath + "/";
    return filePath.startsWith(prefix) ? filePath.slice(prefix.length) : filePath;
  }

  // 构建分组格式的文本
  async function buildContent(groups: Array<{ root: FileNode; paths: string[] }>) {
    const parts: string[] = [];

    for (const { root, paths } of groups) {
      const rootName = root.path.split("/").pop() || root.path;

      // 每个根目录一个标题块
      parts.push(`${"=".repeat(64)}\n`);
      parts.push(`Project: ${rootName}  (${root.path})\n`);
      parts.push(`${"=".repeat(64)}\n\n`);

      for (const p of paths) {
        const relPath = toRelative(p, root.path);
        let content: string;
        try {
          content = await invoke<string>("read_file_content", { path: p });
        } catch {
          content = "[Error reading file]";
        }
        parts.push(`${relPath}:\n${content}\n\n`);
      }
    }

    return parts.join("");
  }

  async function generatePreview() {
    const groups = groupByRoot();
    if (groups.length === 0) return;

    dispatch({ type: "SET_LOADING", payload: true });
    try {
      const content = await buildContent(groups);
      dispatch({ type: "SET_PREVIEW_CONTENT", payload: content });
    } finally {
      dispatch({ type: "SET_LOADING", payload: false });
    }
  }

  async function exportFiles(): Promise<string | null> {
    const groups = groupByRoot();
    if (groups.length === 0) return null;

    const outputPath = await save({
      filters: [{ name: "Text file", extensions: ["txt"] }],
      defaultPath: "extracted.txt",
    });
    if (!outputPath) return null;

    dispatch({ type: "SET_LOADING", payload: true });
    try {
      const content = await buildContent(groups);
      await invoke("write_text_file", { path: outputPath, content });
      return outputPath;
    } catch (e) {
      console.error("Export failed:", e);
      throw e;
    } finally {
      dispatch({ type: "SET_LOADING", payload: false });
    }
  }

  return { generatePreview, exportFiles };
}

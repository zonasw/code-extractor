import { invoke } from "@tauri-apps/api/core";
import { writeText } from "@tauri-apps/plugin-clipboard-manager";
import { save } from "@tauri-apps/plugin-dialog";
import { useAppContext } from "@/context/AppContext";
import { FileNode, OutputFormat } from "@/types";

export function useExport() {
  const { state, dispatch } = useAppContext();

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

  function toRelative(filePath: string, rootPath: string): string {
    const prefix = rootPath.endsWith("/") ? rootPath : rootPath + "/";
    return filePath.startsWith(prefix) ? filePath.slice(prefix.length) : filePath;
  }

  function xmlEscape(s: string): string {
    return s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
  }

  async function buildContent(groups: Array<{ root: FileNode; paths: string[] }>, format?: OutputFormat) {
    const fmt = format ?? state.outputFormat;
    const parts: string[] = [];

    if (fmt === "xml") {
      parts.push("<documents>\n");
      let index = 1;
      for (const { root, paths } of groups) {
        for (const p of paths) {
          const relPath = toRelative(p, root.path);
          let content: string;
          try {
            content = await invoke<string>("read_file_content", { path: p });
          } catch {
            content = "[Error reading file]";
          }
          parts.push(`  <document index="${index}">\n`);
          parts.push(`    <source>${xmlEscape(relPath)}</source>\n`);
          parts.push(`    <document_content>${xmlEscape(content)}</document_content>\n`);
          parts.push(`  </document>\n`);
          index++;
        }
      }
      parts.push("</documents>");
    } else if (fmt === "markdown") {
      for (const { root, paths } of groups) {
        const rootName = root.path.split("/").pop() || root.path;
        parts.push(`# ${rootName}\n\n`);
        for (const p of paths) {
          const relPath = toRelative(p, root.path);
          const ext = p.split(".").pop() || "";
          let content: string;
          try {
            content = await invoke<string>("read_file_content", { path: p });
          } catch {
            content = "[Error reading file]";
          }
          parts.push(`## ${relPath}\n\`\`\`${ext}\n${content}\n\`\`\`\n\n`);
        }
      }
    } else {
      // plain
      for (const { root, paths } of groups) {
        const rootName = root.path.split("/").pop() || root.path;
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
    }

    let result = parts.join("");
    const { prompt_prefix, prompt_suffix } = state.config;
    if (prompt_prefix) result = prompt_prefix + "\n\n" + result;
    if (prompt_suffix) result = result + "\n\n" + prompt_suffix;
    return result;
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

  /** 直接生成内容并复制到剪贴板，无需先生成预览 */
  async function generateAndCopy(): Promise<number> {
    const groups = groupByRoot();
    if (groups.length === 0) return 0;
    dispatch({ type: "SET_LOADING", payload: true });
    try {
      const content = await buildContent(groups);
      await writeText(content);
      dispatch({ type: "SET_PREVIEW_CONTENT", payload: content });
      return content.length;
    } finally {
      dispatch({ type: "SET_LOADING", payload: false });
    }
  }

  async function exportFiles(): Promise<string | null> {
    const groups = groupByRoot();
    if (groups.length === 0) return null;
    const fmt = state.outputFormat;
    const extMap = { plain: "txt", markdown: "md", xml: "xml" };
    const ext = extMap[fmt];
    const outputPath = await save({
      filters: [{ name: "Output file", extensions: [ext] }],
      defaultPath: `extracted.${ext}`,
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

  return { generatePreview, generateAndCopy, exportFiles };
}

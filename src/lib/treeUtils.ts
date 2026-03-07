import { FileNode } from "@/types";

/** 递归过滤树节点，保留名称匹配的文件及其父目录 */
export function filterTree(node: FileNode, search: string): FileNode | null {
  if (!search.trim()) return node;
  const term = search.toLowerCase();

  if (!node.is_dir) {
    return node.name.toLowerCase().includes(term) ? node : null;
  }

  const filteredChildren = node.children
    .map((child) => filterTree(child, search))
    .filter((n): n is FileNode => n !== null);

  if (filteredChildren.length > 0) {
    return { ...node, children: filteredChildren };
  }
  return node.name.toLowerCase().includes(term)
    ? { ...node, children: [] }
    : null;
}

/** 计算所有已选文件的总字节数 */
export function getTotalSelectedSize(
  rootNodes: FileNode[],
  selectedPaths: Set<string>
): number {
  let total = 0;
  function traverse(node: FileNode) {
    if (!node.is_dir && selectedPaths.has(node.path)) {
      total += node.size;
    }
    node.children.forEach(traverse);
  }
  rootNodes.forEach(traverse);
  return total;
}

/** 从文件扩展名推断语言（供语法高亮使用） */
export function getLanguage(filename: string): string {
  const ext = filename.split(".").pop()?.toLowerCase() || "";
  const map: Record<string, string> = {
    ts: "typescript",
    tsx: "tsx",
    js: "javascript",
    jsx: "jsx",
    rs: "rust",
    py: "python",
    go: "go",
    java: "java",
    kt: "kotlin",
    css: "css",
    scss: "scss",
    less: "less",
    html: "html",
    xml: "xml",
    json: "json",
    md: "markdown",
    yaml: "yaml",
    yml: "yaml",
    toml: "toml",
    sh: "bash",
    bash: "bash",
    zsh: "bash",
    sql: "sql",
    rb: "ruby",
    php: "php",
    cs: "csharp",
    cpp: "cpp",
    c: "c",
    h: "c",
    swift: "swift",
    dart: "dart",
    vue: "html",
    svelte: "html",
  };
  return map[ext] || "text";
}

/** 格式化 token 估算数量（字节数 ÷ 4） */
export function formatTokenCount(bytes: number): string {
  const tokens = Math.round(bytes / 4);
  if (tokens < 1000) return `~${tokens}`;
  if (tokens < 1_000_000) return `~${(tokens / 1000).toFixed(1)}K`;
  return `~${(tokens / 1_000_000).toFixed(2)}M`;
}

/** 收集目录下的所有叶子文件路径 */
export function collectAllLeaves(node: FileNode): string[] {
  if (!node.is_dir) return [node.path];
  return node.children.flatMap(collectAllLeaves);
}

/** 根据文件扩展名返回 Tailwind 颜色类 */
export function getFileColor(extension: string): string {
  const map: Record<string, string> = {
    ts: "text-blue-400",
    tsx: "text-blue-400",
    js: "text-yellow-400",
    jsx: "text-yellow-400",
    rs: "text-orange-500",
    py: "text-green-400",
    go: "text-cyan-400",
    json: "text-yellow-300",
    md: "text-slate-400",
    css: "text-pink-400",
    scss: "text-pink-400",
    html: "text-orange-400",
    toml: "text-amber-500",
    yaml: "text-amber-500",
    yml: "text-amber-500",
    sh: "text-green-300",
  };
  return map[extension.toLowerCase()] || "text-muted-foreground";
}

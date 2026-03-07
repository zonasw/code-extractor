import { FileNode } from "@/types";

/** Known binary file extensions that cannot be read as text */
export const BINARY_EXTENSIONS = new Set([
  "png","jpg","jpeg","gif","webp","bmp","ico","svg",
  "pdf","doc","docx","xls","xlsx","ppt","pptx",
  "zip","tar","gz","rar","7z","br","zst",
  "mp3","mp4","wav","avi","mov","mkv","flac",
  "exe","dll","so","dylib","bin","wasm",
  "ttf","otf","woff","woff2","eot",
  "db","sqlite","lock",
]);

/** Returns true if file is binary (by extension) */
export function isBinaryFile(extension: string): boolean {
  return BINARY_EXTENSIONS.has(extension.toLowerCase());
}

/** Returns true if file size exceeds the large-file threshold (500KB) */
export function isLargeFile(size: number): boolean {
  return size > 500 * 1024;
}

/**
 * Convert a glob-like pattern to a RegExp for file path matching.
 * Supports: * (not slash), ** (any depth), ? (single char), {a,b} (alternation)
 * Used for pattern-based file selection in the tree.
 */
export function globToRegex(pattern: string): RegExp {
  let regexStr = pattern
    .replace(/[.+^${}()|[\]\\]/g, (c) => (c === '{' || c === '}' ? c : `\\${c}`))
    .replace(/\{([^}]+)\}/g, (_: string, inner: string) => `(${inner.split(',').map((s: string) => s.trim().replace(/[.+^$[\]\\]/g, (c: string) => `\\${c}`)).join('|')})`)
    .replace(/\*\*/g, '§§GLOBSTAR§§')
    .replace(/\*/g, '[^/]*')
    .replace(/§§GLOBSTAR§§/g, '.*')
    .replace(/\?/g, '[^/]');
  return new RegExp(`(^|/)${regexStr}$`, 'i');
}

/** Returns true if the search string looks like a glob pattern */
export function isGlobPattern(search: string): boolean {
  return /[*?{]/.test(search);
}

/**
 * Filter tree nodes by glob pattern (matches against the full path).
 * Returns a new tree with only matching files, or null if no match.
 */
export function filterTreeByGlob(node: FileNode, regex: RegExp): FileNode | null {
  if (!node.is_dir) {
    return regex.test(node.path) ? node : null;
  }
  const filteredChildren = node.children
    .map((child) => filterTreeByGlob(child, regex))
    .filter((n): n is FileNode => n !== null);
  if (filteredChildren.length > 0) {
    return { ...node, children: filteredChildren };
  }
  return null;
}

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

/** 返回所有已选文件的 { path, size } 列表，按 size 降序 */
export function getSelectedFileSizes(
  rootNodes: FileNode[],
  selectedPaths: Set<string>
): Array<{ path: string; size: number }> {
  const result: Array<{ path: string; size: number }> = [];
  function traverse(node: FileNode) {
    if (!node.is_dir && selectedPaths.has(node.path)) {
      result.push({ path: node.path, size: node.size });
    }
    node.children.forEach(traverse);
  }
  rootNodes.forEach(traverse);
  result.sort((a, b) => b.size - a.size);
  return result;
}

/** 字节数 → token 估算（÷4），返回数字 */
export function bytesToTokens(bytes: number): number {
  return Math.round(bytes / 4);
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

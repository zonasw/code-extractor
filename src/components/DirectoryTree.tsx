import { useState, useEffect, useMemo, useRef } from "react";
import { FolderPlus, X, RefreshCw, Search, ChevronsUpDown, ChevronsDownUp, FlipHorizontal2 } from "lucide-react";
import { getCurrentWebviewWindow } from "@tauri-apps/api/webviewWindow";
import { useAppContext } from "@/context/AppContext";
import { useDirectoryTree } from "@/hooks/useDirectoryTree";
import { useAppConfig } from "@/hooks/useAppConfig";
import { TreeNode, ExpandStamp } from "./TreeNode";
import { filterTree, filterTreeByGlob, globToRegex, isGlobPattern, collectAllLeaves, getTotalSelectedSize, formatTokenCount } from "@/lib/treeUtils";
import { toast } from "sonner";

export function DirectoryTree() {
  const { state, dispatch } = useAppContext();
  const { refreshDirectory, removeDirectory, addDirectory } = useDirectoryTree();
  const { removeLastDirectory, addLastDirectory } = useAppConfig();
  const [search, setSearch] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const [expandStamp, setExpandStamp] = useState<ExpandStamp | null>(null);
  const [isDragOver, setIsDragOver] = useState(false);

  function handleSearchChange(value: string) {
    setSearch(value);
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => setDebouncedSearch(value), 300);
  }

  const isGlob = isGlobPattern(debouncedSearch);
  const globRegex = useMemo(
    () => (isGlob && debouncedSearch.trim() ? globToRegex(debouncedSearch) : null),
    [isGlob, debouncedSearch]
  );
  const filteredRoots = useMemo(() => {
    return state.rootNodes.map((root) => ({
      root,
      filtered: isGlob && globRegex
        ? filterTreeByGlob(root, globRegex)
        : filterTree(root, debouncedSearch),
    }));
  }, [state.rootNodes, isGlob, globRegex, debouncedSearch]);

  // Drag & drop: listen for Tauri window drag events
  useEffect(() => {
    let unlisten: (() => void) | null = null;
    getCurrentWebviewWindow().onDragDropEvent((event) => {
      if (event.payload.type === "enter" || event.payload.type === "over") {
        setIsDragOver(true);
      } else if (event.payload.type === "leave") {
        setIsDragOver(false);
      } else if (event.payload.type === "drop") {
        setIsDragOver(false);
        const paths: string[] = (event.payload as { type: "drop"; paths: string[] }).paths;
        for (const p of paths) {
          addDirectory(p)
            .then(() => addLastDirectory(p))
            .catch(() => toast.error("无法读取目录", { description: p }));
        }
      }
    }).then((fn) => { unlisten = fn; });
    return () => { unlisten?.(); };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  function handleRemove(dirPath: string) {
    removeDirectory(dirPath);
    removeLastDirectory(dirPath);
  }

  function handleExpandAll() {
    setExpandStamp((prev) => ({ expanded: true, n: (prev?.n ?? 0) + 1 }));
  }

  function handleCollapseAll() {
    setExpandStamp((prev) => ({ expanded: false, n: (prev?.n ?? 0) + 1 }));
  }

  function handleInvertSelection() {
    const allLeaves = new Set(state.rootNodes.flatMap(collectAllLeaves));
    const inverted = new Set<string>();
    for (const leaf of allLeaves) {
      if (!state.selectedPaths.has(leaf)) inverted.add(leaf);
    }
    dispatch({ type: "SET_SELECTED_PATHS", payload: inverted });
  }

  function handleSelectAllFiltered() {
    const allPaths: string[] = [];
    const useGlob = isGlobPattern(debouncedSearch);
    const regex = useGlob ? globToRegex(debouncedSearch) : null;
    for (const root of state.rootNodes) {
      const filtered = useGlob && regex
        ? filterTreeByGlob(root, regex)
        : filterTree(root, debouncedSearch);
      if (filtered) {
        allPaths.push(...collectAllLeaves(filtered));
      }
    }
    dispatch({ type: "ADD_SELECTED_PATHS", payload: allPaths });
  }

  // Loading skeleton when no nodes yet
  if (state.isLoading && state.rootNodes.length === 0) {
    return (
      <div className="flex flex-col h-full overflow-hidden">
        <div className="px-2 py-1.5 border-b shrink-0">
          <div className="h-6 bg-muted/60 rounded-md animate-pulse" />
        </div>
        <div className="p-2 space-y-1">
          {[80, 65, 90, 55, 75, 60, 85].map((w, i) => (
            <div
              key={i}
              className="h-5 bg-muted/50 rounded animate-pulse"
              style={{ width: `${w}%`, marginLeft: i % 3 === 0 ? 0 : i % 3 === 1 ? "1rem" : "2rem" }}
            />
          ))}
        </div>
      </div>
    );
  }

  if (state.rootNodes.length === 0) {
    return (
      <div
        className={`flex flex-col items-center justify-center h-full gap-3 transition-colors ${
          isDragOver
            ? "bg-primary/5 border-2 border-dashed border-primary/40"
            : "text-muted-foreground"
        }`}
      >
        <FolderPlus className={`w-12 h-12 ${isDragOver ? "opacity-60 text-primary" : "opacity-30"}`} />
        {isDragOver ? (
          <p className="text-sm text-primary font-medium">松开以添加目录</p>
        ) : (
          <>
            <p className="text-sm">点击"添加目录"或拖拽文件夹到此处</p>
            <p className="text-xs opacity-60">可以同时添加多个目录</p>
          </>
        )}
      </div>
    );
  }

  return (
    <div
      className={`flex flex-col h-full overflow-hidden transition-colors ${
        isDragOver ? "bg-primary/5 ring-2 ring-inset ring-primary/30" : ""
      }`}
    >
      {/* 工具栏：展开/折叠/反选 */}
      <div className="flex items-center gap-0.5 px-2 py-1 border-b shrink-0">
        <button
          onClick={handleExpandAll}
          className="p-1 rounded hover:bg-accent text-muted-foreground hover:text-foreground transition-colors"
          title="展开全部"
        >
          <ChevronsUpDown className="w-3.5 h-3.5" />
        </button>
        <button
          onClick={handleCollapseAll}
          className="p-1 rounded hover:bg-accent text-muted-foreground hover:text-foreground transition-colors"
          title="折叠全部"
        >
          <ChevronsDownUp className="w-3.5 h-3.5" />
        </button>
        <button
          onClick={handleInvertSelection}
          className="p-1 rounded hover:bg-accent text-muted-foreground hover:text-foreground transition-colors"
          title="反向选择"
          disabled={state.rootNodes.length === 0}
        >
          <FlipHorizontal2 className="w-3.5 h-3.5" />
        </button>
      </div>

      {/* 搜索框 */}
      <div className="px-2 py-1.5 border-b shrink-0">
        <div className="relative flex items-center gap-1">
          <Search className="w-3.5 h-3.5 absolute left-2 top-1/2 -translate-y-1/2 text-muted-foreground pointer-events-none" />
          <input
            value={search}
            onChange={(e) => handleSearchChange(e.target.value)}
            onKeyDown={(e) => { if (e.key === "Escape") { handleSearchChange(""); } }}
            placeholder={`搜索文件 / 输入 *.ts 使用 glob...`}
            className={`flex-1 pl-7 pr-2 py-1 text-xs border focus:bg-background rounded-md outline-none transition-colors placeholder:text-muted-foreground/60 ${
              isGlob && debouncedSearch.trim()
                ? "bg-amber-50 border-amber-300 dark:bg-amber-950/20 dark:border-amber-700"
                : "bg-muted/50 border-transparent focus:border-border"
            }`}
          />
          {debouncedSearch.trim() && (
            <button
              onClick={handleSelectAllFiltered}
              className="shrink-0 text-xs px-2 py-1 rounded-md bg-primary/10 text-primary hover:bg-primary/20 transition-colors"
              title="全选筛选结果"
            >
              全选
            </button>
          )}
        </div>
        {isGlob && debouncedSearch.trim() && (
          <p className="text-[10px] text-amber-600 dark:text-amber-400 mt-0.5 px-1">Glob 模式匹配</p>
        )}
      </div>

      <div className="flex-1 overflow-y-auto overflow-x-hidden">
        <div className="py-1">
          {filteredRoots.map(({ root, filtered }) => {
            if (!filtered) return null;

            // Root header stats
            const rootLeaves = collectAllLeaves(root);
            const rootSelected = rootLeaves.filter((p) => state.selectedPaths.has(p));
            const rootBytes = getTotalSelectedSize([root], state.selectedPaths);
            const hasSelection = rootSelected.length > 0;

            return (
              <div key={root.path}>
                {/* 根目录标题栏 */}
                <div className="flex items-center gap-1 px-2 py-1.5 bg-muted/50 border-b group sticky top-0 z-10">
                  <span
                    className="text-xs font-semibold text-muted-foreground truncate flex-1 min-w-0"
                    title={root.path}
                  >
                    {root.path.split("/").pop() || root.path}
                  </span>

                  {/* Stats */}
                  {hasSelection ? (
                    <span className="text-xs text-primary font-medium shrink-0">
                      {rootSelected.length}/{rootLeaves.length} · {formatTokenCount(rootBytes)}
                    </span>
                  ) : (
                    <span className="text-xs text-muted-foreground shrink-0 opacity-0 group-hover:opacity-100 transition-opacity">
                      {rootLeaves.length} 个文件
                    </span>
                  )}

                  <button
                    onClick={() => refreshDirectory(root.path)}
                    className="opacity-0 group-hover:opacity-100 p-0.5 rounded hover:bg-accent text-muted-foreground hover:text-foreground transition-opacity"
                    title="刷新"
                  >
                    <RefreshCw className="w-3 h-3" />
                  </button>
                  <button
                    onClick={() => handleRemove(root.path)}
                    className="opacity-0 group-hover:opacity-100 p-0.5 rounded hover:bg-accent text-muted-foreground hover:text-destructive transition-opacity"
                    title="移除"
                  >
                    <X className="w-3 h-3" />
                  </button>
                </div>

                {/* 子节点 */}
                <div className="mb-1">
                  {filtered.children.map((child) => (
                    <TreeNode
                      key={child.path}
                      node={child}
                      depth={0}
                      forceExpand={debouncedSearch.trim().length > 0}
                      expandStamp={expandStamp}
                    />
                  ))}
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}

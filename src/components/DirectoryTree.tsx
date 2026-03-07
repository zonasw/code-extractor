import { useState } from "react";
import { FolderPlus, X, RefreshCw, Search } from "lucide-react";
import { useAppContext } from "@/context/AppContext";
import { useDirectoryTree } from "@/hooks/useDirectoryTree";
import { useAppConfig } from "@/hooks/useAppConfig";
import { TreeNode } from "./TreeNode";
import { ScrollArea } from "@/components/ui/scroll-area";
import { filterTree, collectAllLeaves } from "@/lib/treeUtils";

export function DirectoryTree() {
  const { state, dispatch } = useAppContext();
  const { refreshDirectory, removeDirectory } = useDirectoryTree();
  const { removeLastDirectory } = useAppConfig();
  const [search, setSearch] = useState("");

  function handleRemove(dirPath: string) {
    removeDirectory(dirPath);
    removeLastDirectory(dirPath);
  }

  function handleSelectAllFiltered() {
    const allPaths: string[] = [];
    for (const root of state.rootNodes) {
      const filtered = filterTree(root, search);
      if (filtered) {
        allPaths.push(...collectAllLeaves(filtered));
      }
    }
    dispatch({ type: "ADD_SELECTED_PATHS", payload: allPaths });
  }

  if (state.rootNodes.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center h-full text-muted-foreground gap-3">
        <FolderPlus className="w-12 h-12 opacity-30" />
        <p className="text-sm">点击"添加目录"添加项目</p>
        <p className="text-xs opacity-60">可以同时添加多个目录</p>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full overflow-hidden">
      {/* 搜索框 */}
      <div className="px-2 py-1.5 border-b shrink-0">
        <div className="relative flex items-center gap-1">
          <Search className="w-3.5 h-3.5 absolute left-2 top-1/2 -translate-y-1/2 text-muted-foreground pointer-events-none" />
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            onKeyDown={(e) => e.key === "Escape" && setSearch("")}
            placeholder="搜索文件..."
            className="flex-1 pl-7 pr-2 py-1 text-xs bg-muted/50 border border-transparent focus:border-border focus:bg-background rounded-md outline-none transition-colors placeholder:text-muted-foreground/60"
          />
          {search.trim() && (
            <button
              onClick={handleSelectAllFiltered}
              className="shrink-0 text-xs px-2 py-1 rounded-md bg-primary/10 text-primary hover:bg-primary/20 transition-colors"
              title="全选筛选结果"
            >
              全选
            </button>
          )}
        </div>
      </div>

      <ScrollArea className="flex-1">
        <div className="py-1">
          {state.rootNodes.map((root) => {
            const filtered = filterTree(root, search);
            if (!filtered) return null;
            return (
              <div key={root.path}>
                {/* 根目录标题栏 */}
                <div className="flex items-center gap-1 px-2 py-1.5 bg-muted/50 border-b group sticky top-0 z-10">
                  <span
                    className="text-xs font-semibold text-muted-foreground truncate flex-1"
                    title={root.path}
                  >
                    {root.path.split("/").pop() || root.path}
                  </span>
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
                    <TreeNode key={child.path} node={child} depth={0} forceExpand={search.trim().length > 0} />
                  ))}
                </div>
              </div>
            );
          })}
        </div>
      </ScrollArea>
    </div>
  );
}

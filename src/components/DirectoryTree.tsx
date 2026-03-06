import { FolderPlus, X, RefreshCw } from "lucide-react";
import { useAppContext } from "@/context/AppContext";
import { useDirectoryTree } from "@/hooks/useDirectoryTree";
import { useAppConfig } from "@/hooks/useAppConfig";
import { TreeNode } from "./TreeNode";
import { ScrollArea } from "@/components/ui/scroll-area";

export function DirectoryTree() {
  const { state } = useAppContext();
  const { refreshDirectory, removeDirectory } = useDirectoryTree();
  const { removeLastDirectory } = useAppConfig();

  function handleRemove(dirPath: string) {
    removeDirectory(dirPath);
    removeLastDirectory(dirPath);
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
    <ScrollArea className="h-full">
      <div className="py-1">
        {state.rootNodes.map((root) => (
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
                className="opacity-0 group-hover:opacity-100 p-0.5 rounded hover:bg-accent text-muted-foreground hover:text-foreground"
                title="刷新"
              >
                <RefreshCw className="w-3 h-3" />
              </button>
              <button
                onClick={() => handleRemove(root.path)}
                className="opacity-0 group-hover:opacity-100 p-0.5 rounded hover:bg-accent text-muted-foreground hover:text-destructive"
                title="移除"
              >
                <X className="w-3 h-3" />
              </button>
            </div>
            {/* 子节点 */}
            <div className="mb-1">
              {root.children.map((child) => (
                <TreeNode key={child.path} node={child} depth={0} />
              ))}
            </div>
          </div>
        ))}
      </div>
    </ScrollArea>
  );
}

import { useState } from "react";
import { invoke } from "@tauri-apps/api/core";
import { toast } from "sonner";
import { ChevronRight, ChevronDown, File, Folder, FolderOpen } from "lucide-react";
import { Checkbox } from "@/components/ui/checkbox";
import {
  ContextMenu,
  ContextMenuContent,
  ContextMenuItem,
  ContextMenuTrigger,
} from "@/components/ui/context-menu";
import { FileNode, CheckState } from "@/types";
import { useAppContext } from "@/context/AppContext";
import { useDirectoryTree } from "@/hooks/useDirectoryTree";
import { getFileColor, collectAllLeaves } from "@/lib/treeUtils";

interface TreeNodeProps {
  node: FileNode;
  depth?: number;
  forceExpand?: boolean;
}

export function TreeNode({ node, depth = 0, forceExpand = false }: TreeNodeProps) {
  const [expanded, setExpanded] = useState(depth < 2);
  const { state, dispatch } = useAppContext();
  const { toggleNode, collectLeaves } = useDirectoryTree();

  const isExpanded = forceExpand || expanded;

  // 目录节点：一次性计算叶子节点，同时用于 checkState 和 dirCount
  const dirLeaves = node.is_dir ? collectLeaves(node) : null;
  const dirSelectedCount = dirLeaves
    ? dirLeaves.filter((p) => state.selectedPaths.has(p)).length
    : 0;

  function getCheckState(): CheckState {
    if (!node.is_dir) {
      return state.selectedPaths.has(node.path) ? "checked" : "unchecked";
    }
    if (!dirLeaves || dirLeaves.length === 0) return "unchecked";
    if (dirSelectedCount === 0) return "unchecked";
    if (dirSelectedCount === dirLeaves.length) return "checked";
    return "indeterminate";
  }

  const checkState = getCheckState();

  const dirCount = node.is_dir && dirLeaves
    ? { selected: dirSelectedCount, total: dirLeaves.length }
    : null;

  function handleRowClick() {
    if (node.is_dir) {
      setExpanded((v) => !v);
    } else {
      toggleNode(node);
    }
  }

  async function handleCopyPath() {
    await navigator.clipboard.writeText(node.path);
    toast.success("路径已复制");
  }

  async function handleCopyContent() {
    try {
      const content = await invoke<string>("read_file_content", { path: node.path });
      await navigator.clipboard.writeText(content);
      toast.success("文件内容已复制");
    } catch {
      toast.error("读取文件失败");
    }
  }

  function handleSelectAllChildren() {
    const paths = collectAllLeaves(node);
    dispatch({ type: "ADD_SELECTED_PATHS", payload: paths });
  }

  function handleDeselectAllChildren() {
    const paths = collectAllLeaves(node);
    dispatch({ type: "REMOVE_SELECTED_PATHS", payload: paths });
  }

  const indent = depth * 16;

  const rowContent = (
    <div
      className="flex items-center gap-1 py-0.5 px-2 hover:bg-accent rounded-sm cursor-pointer select-none group"
      style={{ paddingLeft: `${8 + indent}px` }}
      onClick={handleRowClick}
    >
      {node.is_dir ? (
        <span className="w-4 h-4 flex items-center justify-center text-muted-foreground">
          {isExpanded ? (
            <ChevronDown className="w-3 h-3" />
          ) : (
            <ChevronRight className="w-3 h-3" />
          )}
        </span>
      ) : (
        <span className="w-4" />
      )}

      <span onClick={(e) => e.stopPropagation()} className="flex items-center">
        <Checkbox
          checked={checkState === "checked"}
          data-state={checkState === "indeterminate" ? "indeterminate" : undefined}
          className="w-3.5 h-3.5"
          onCheckedChange={() => toggleNode(node)}
        />
      </span>

      {node.is_dir ? (
        isExpanded ? (
          <FolderOpen className="w-4 h-4 text-yellow-500 shrink-0" />
        ) : (
          <Folder className="w-4 h-4 text-yellow-500 shrink-0" />
        )
      ) : (
        <File className={`w-4 h-4 shrink-0 ${getFileColor(node.extension)}`} />
      )}

      <span className="text-sm truncate flex-1" title={node.name}>
        {node.name}
      </span>

      {node.is_dir && dirCount !== null && dirCount.total > 0 && (
        <span
          className={`text-xs shrink-0 ${
            dirCount.selected > 0
              ? "text-primary font-medium"
              : "text-muted-foreground opacity-0 group-hover:opacity-100"
          }`}
        >
          {dirCount.selected > 0
            ? `${dirCount.selected}/${dirCount.total}`
            : dirCount.total}
        </span>
      )}

      {!node.is_dir && node.size > 0 && (
        <span className="text-xs text-muted-foreground opacity-0 group-hover:opacity-100 shrink-0">
          {formatSize(node.size)}
        </span>
      )}
    </div>
  );

  return (
    <div>
      <ContextMenu>
        <ContextMenuTrigger asChild>
          {rowContent}
        </ContextMenuTrigger>
        <ContextMenuContent>
          {node.is_dir ? (
            <>
              <ContextMenuItem onClick={handleSelectAllChildren}>
                全选子文件
              </ContextMenuItem>
              <ContextMenuItem onClick={handleDeselectAllChildren}>
                取消全选
              </ContextMenuItem>
            </>
          ) : (
            <>
              <ContextMenuItem onClick={handleCopyPath}>
                复制路径
              </ContextMenuItem>
              <ContextMenuItem onClick={handleCopyContent}>
                复制文件内容
              </ContextMenuItem>
            </>
          )}
        </ContextMenuContent>
      </ContextMenu>

      {node.is_dir && isExpanded && node.children.length > 0 && (
        <div>
          {node.children.map((child) => (
            <TreeNode key={child.path} node={child} depth={depth + 1} forceExpand={forceExpand} />
          ))}
        </div>
      )}
    </div>
  );
}

function formatSize(bytes: number): string {
  if (bytes < 1024) return `${bytes}B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)}K`;
  return `${(bytes / 1024 / 1024).toFixed(1)}M`;
}

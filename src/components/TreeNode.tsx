import { useState, useEffect, useRef } from "react";
import { invoke } from "@tauri-apps/api/core";
import { writeText } from "@tauri-apps/plugin-clipboard-manager";
import { toast } from "sonner";
import { ChevronRight, ChevronDown, File, Folder, FolderOpen, AlertTriangle } from "lucide-react";
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
import { getFileColor, collectAllLeaves, isBinaryFile, isLargeFile } from "@/lib/treeUtils";

export interface ExpandStamp {
  expanded: boolean;
  n: number;
}

interface TreeNodeProps {
  node: FileNode;
  depth?: number;
  forceExpand?: boolean;
  expandStamp?: ExpandStamp | null;
}

export function TreeNode({ node, depth = 0, forceExpand = false, expandStamp }: TreeNodeProps) {
  const [expanded, setExpanded] = useState(depth < 2);
  const { state, dispatch } = useAppContext();
  const { toggleNode, collectLeaves } = useDirectoryTree();
  const rowRef = useRef<HTMLDivElement>(null);

  // Respond to global expand/collapse stamp
  useEffect(() => {
    if (expandStamp != null) {
      setExpanded(expandStamp.expanded);
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [expandStamp?.n]);

  const isExpanded = forceExpand || expanded;

  // Compute dir leaves once
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
  const isFileSelected = !node.is_dir && checkState === "checked";

  const dirCount = node.is_dir && dirLeaves
    ? { selected: dirSelectedCount, total: dirLeaves.length }
    : null;

  // File-level warnings
  const binary = !node.is_dir && isBinaryFile(node.extension);
  const large = !node.is_dir && isLargeFile(node.size);

  function handleRowClick() {
    if (node.is_dir) {
      setExpanded((v) => !v);
    } else {
      toggleNode(node);
    }
  }

  function handleKeyDown(e: React.KeyboardEvent) {
    switch (e.key) {
      case " ":
        e.preventDefault();
        toggleNode(node);
        break;
      case "Enter":
        e.preventDefault();
        if (node.is_dir) setExpanded((v) => !v);
        else toggleNode(node);
        break;
      case "ArrowRight":
        e.preventDefault();
        if (node.is_dir && !isExpanded) setExpanded(true);
        break;
      case "ArrowLeft":
        e.preventDefault();
        if (node.is_dir && isExpanded) setExpanded(false);
        break;
      case "ArrowDown":
      case "ArrowUp": {
        e.preventDefault();
        const allRows = Array.from(
          document.querySelectorAll<HTMLElement>("[data-tree-row]")
        );
        const idx = allRows.indexOf(rowRef.current!);
        const target = e.key === "ArrowDown" ? allRows[idx + 1] : allRows[idx - 1];
        target?.focus();
        break;
      }
    }
  }

  async function handleCopyPath() {
    await writeText(node.path);
    toast.success("路径已复制");
  }

  async function handleCopyContent() {
    try {
      const content = await invoke<string>("read_file_content", { path: node.path });
      await writeText(content);
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
      ref={rowRef}
      data-tree-row
      tabIndex={0}
      className={`flex items-center gap-1 py-0.5 px-2 rounded-sm cursor-pointer select-none group outline-none
        focus-visible:ring-1 focus-visible:ring-ring
        ${isFileSelected ? "bg-primary/10 hover:bg-primary/15" : "hover:bg-accent"}`}
      style={{ paddingLeft: `${8 + indent}px` }}
      onClick={handleRowClick}
      onKeyDown={handleKeyDown}
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
        <File className={`w-4 h-4 shrink-0 ${binary ? "text-muted-foreground/40" : getFileColor(node.extension)}`} />
      )}

      <span className={`text-sm truncate flex-1 ${binary ? "text-muted-foreground/50 line-through" : ""}`} title={node.name}>
        {node.name}
      </span>

      {/* Binary / large file badges */}
      {binary && (
        <span className="text-[10px] text-muted-foreground/50 shrink-0 italic">bin</span>
      )}
      {!binary && large && (
        <span title="文件较大，将占用较多 token" className="shrink-0 opacity-0 group-hover:opacity-100">
          <AlertTriangle className="w-3 h-3 text-yellow-500" />
        </span>
      )}

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

      {!node.is_dir && !binary && node.size > 0 && (
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
              <ContextMenuItem onClick={handleCopyPath} disabled={binary}>
                复制路径
              </ContextMenuItem>
              <ContextMenuItem onClick={handleCopyContent} disabled={binary}>
                复制文件内容
              </ContextMenuItem>
            </>
          )}
        </ContextMenuContent>
      </ContextMenu>

      {node.is_dir && isExpanded && node.children.length > 0 && (
        <div>
          {node.children.map((child) => (
            <TreeNode
              key={child.path}
              node={child}
              depth={depth + 1}
              forceExpand={forceExpand}
              expandStamp={expandStamp}
            />
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

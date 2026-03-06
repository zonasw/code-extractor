import { useState } from "react";
import { ChevronRight, ChevronDown, File, Folder, FolderOpen } from "lucide-react";
import { Checkbox } from "@/components/ui/checkbox";
import { FileNode, CheckState } from "@/types";
import { useAppContext } from "@/context/AppContext";
import { useDirectoryTree } from "@/hooks/useDirectoryTree";

interface TreeNodeProps {
  node: FileNode;
  depth?: number;
}

export function TreeNode({ node, depth = 0 }: TreeNodeProps) {
  const [expanded, setExpanded] = useState(depth < 2);
  const { state } = useAppContext();
  const { toggleNode, collectLeaves } = useDirectoryTree();

  function getCheckState(): CheckState {
    if (!node.is_dir) {
      return state.selectedPaths.has(node.path) ? "checked" : "unchecked";
    }
    const leaves = collectLeaves(node);
    if (leaves.length === 0) return "unchecked";
    const selectedCount = leaves.filter((p) => state.selectedPaths.has(p)).length;
    if (selectedCount === 0) return "unchecked";
    if (selectedCount === leaves.length) return "checked";
    return "indeterminate";
  }

  const checkState = getCheckState();

  function handleCheck(e: React.MouseEvent) {
    e.stopPropagation();
    toggleNode(node);
  }

  function handleToggleExpand() {
    if (node.is_dir) setExpanded((v) => !v);
  }

  const indent = depth * 16;

  return (
    <div>
      <div
        className="flex items-center gap-1 py-0.5 px-2 hover:bg-accent rounded-sm cursor-pointer select-none group"
        style={{ paddingLeft: `${8 + indent}px` }}
        onClick={handleToggleExpand}
      >
        {node.is_dir ? (
          <span className="w-4 h-4 flex items-center justify-center text-muted-foreground">
            {expanded ? (
              <ChevronDown className="w-3 h-3" />
            ) : (
              <ChevronRight className="w-3 h-3" />
            )}
          </span>
        ) : (
          <span className="w-4" />
        )}

        <span onClick={handleCheck} className="flex items-center">
          <Checkbox
            checked={checkState === "checked"}
            data-state={checkState === "indeterminate" ? "indeterminate" : undefined}
            className="w-3.5 h-3.5"
            onCheckedChange={() => toggleNode(node)}
          />
        </span>

        {node.is_dir ? (
          expanded ? (
            <FolderOpen className="w-4 h-4 text-yellow-500 shrink-0" />
          ) : (
            <Folder className="w-4 h-4 text-yellow-500 shrink-0" />
          )
        ) : (
          <File className="w-4 h-4 text-muted-foreground shrink-0" />
        )}

        <span className="text-sm truncate" title={node.name}>
          {node.name}
        </span>

        {!node.is_dir && node.size > 0 && (
          <span className="ml-auto text-xs text-muted-foreground opacity-0 group-hover:opacity-100">
            {formatSize(node.size)}
          </span>
        )}
      </div>

      {node.is_dir && expanded && node.children.length > 0 && (
        <div>
          {node.children.map((child) => (
            <TreeNode key={child.path} node={child} depth={depth + 1} />
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

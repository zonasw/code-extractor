import { useState } from "react";
import { Button } from "@/components/ui/button";
import { FileChange } from "@/types/agent";

interface AgentDiffViewerProps {
  changes: FileChange[];
  onRevert: () => void;
}

const CHANGE_COLORS: Record<string, string> = {
  created: "text-green-500",
  modified: "text-yellow-500",
  deleted: "text-red-500",
};

const CHANGE_LABELS: Record<string, string> = {
  created: "+新建",
  modified: "~修改",
  deleted: "-删除",
};

export function AgentDiffViewer({ changes, onRevert }: AgentDiffViewerProps) {
  const [expandedPaths, setExpandedPaths] = useState<Set<string>>(new Set());
  const [reverted, setReverted] = useState(false);

  if (changes.length === 0) return null;

  function toggleExpand(path: string) {
    setExpandedPaths((prev) => {
      const next = new Set(prev);
      if (next.has(path)) next.delete(path);
      else next.add(path);
      return next;
    });
  }

  async function handleRevert() {
    onRevert();
    setReverted(true);
  }

  const totalAdditions = changes.reduce((s, c) => s + (c.additions ?? 0), 0);
  const totalDeletions = changes.reduce((s, c) => s + (c.deletions ?? 0), 0);

  return (
    <div className="border-t">
      {/* Header */}
      <div className="flex items-center gap-2 px-3 py-1.5 bg-muted/30 text-xs">
        <span className="font-medium">文件变更</span>
        <span className="text-green-500">+{totalAdditions}</span>
        <span className="text-red-500">-{totalDeletions}</span>
        <span className="text-muted-foreground ml-auto">
          {changes.length} 个文件
        </span>
      </div>

      {/* File list */}
      <div className="max-h-64 overflow-y-auto">
        {changes.map((change) => {
          const isExpanded = expandedPaths.has(change.path);
          const colorClass = CHANGE_COLORS[change.changeType] ?? "text-foreground";
          const label = CHANGE_LABELS[change.changeType] ?? change.changeType;
          const filename = change.path.split("/").pop() ?? change.path;

          return (
            <div key={change.path} className="border-t border-border/30">
              <button
                className="w-full flex items-center gap-2 px-3 py-1 hover:bg-muted/30 text-xs text-left"
                onClick={() => toggleExpand(change.path)}
              >
                <span className={`shrink-0 font-mono ${colorClass}`}>{label}</span>
                <span className="truncate flex-1" title={change.path}>
                  {filename}
                </span>
                {change.additions !== undefined && (
                  <>
                    <span className="text-green-500 shrink-0">+{change.additions}</span>
                    <span className="text-red-500 shrink-0">-{change.deletions}</span>
                  </>
                )}
                <span className="text-muted-foreground shrink-0">
                  {isExpanded ? "▲" : "▼"}
                </span>
              </button>

              {isExpanded && change.unifiedDiff && (
                <div className="bg-muted/20 overflow-auto max-h-48">
                  <pre className="text-xs p-2 font-mono">
                    {change.unifiedDiff.split("\n").map((line, i) => (
                      <span
                        key={i}
                        className={`block ${
                          line.startsWith("+") && !line.startsWith("+++")
                            ? "text-green-500"
                            : line.startsWith("-") && !line.startsWith("---")
                            ? "text-red-500"
                            : line.startsWith("@@")
                            ? "text-blue-400"
                            : "text-muted-foreground"
                        }`}
                      >
                        {line || " "}
                      </span>
                    ))}
                  </pre>
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* Actions */}
      <div className="flex items-center gap-2 px-3 py-2 border-t text-xs">
        {reverted ? (
          <span className="text-muted-foreground">已回滚到执行前状态</span>
        ) : (
          <>
            <span className="text-muted-foreground flex-1">
              变更已应用到文件系统
            </span>
            <Button
              variant="outline"
              size="sm"
              className="h-6 text-xs px-2"
              onClick={handleRevert}
            >
              ↩ 回滚
            </Button>
          </>
        )}
      </div>
    </div>
  );
}

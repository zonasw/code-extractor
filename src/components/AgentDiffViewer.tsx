import { useState } from "react";
import { Button } from "@/components/ui/button";
import { FileChange } from "@/types/agent";
import { GitBranch, AlertTriangle } from "lucide-react";

interface AgentDiffViewerProps {
  changes: FileChange[];
  isGitRepo: boolean;
  hasUncommittedChanges?: boolean;
  uncommittedCount?: number;
  onRevert: () => void;
}

const CHANGE_COLORS: Record<string, string> = {
  created: "text-green-500",
  modified: "text-yellow-500",
  deleted: "text-red-500",
};

const CHANGE_LABELS: Record<string, string> = {
  created: "+",
  modified: "~",
  deleted: "-",
};

export function AgentDiffViewer({
  changes,
  isGitRepo,
  hasUncommittedChanges,
  uncommittedCount,
  onRevert,
}: AgentDiffViewerProps) {
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

  function handleRevert() {
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
        {isGitRepo && (
          <span className="flex items-center gap-1 text-muted-foreground ml-1">
            <GitBranch className="w-3 h-3" />
            <span>git diff HEAD</span>
          </span>
        )}
        <span className="text-muted-foreground ml-auto">{changes.length} 个文件</span>
      </div>

      {/* Uncommitted warning — shown when reverting would also undo pre-existing work */}
      {!reverted && hasUncommittedChanges && uncommittedCount && uncommittedCount > 0 && (
        <div className="flex items-start gap-2 px-3 py-2 bg-yellow-500/10 border-b border-yellow-500/20 text-xs text-yellow-600 dark:text-yellow-400">
          <AlertTriangle className="w-3.5 h-3.5 shrink-0 mt-0.5" />
          <span>
            执行前工作区有 <strong>{uncommittedCount}</strong> 个未提交的改动。
            回滚将一并还原这些改动，建议先 commit 再回滚。
          </span>
        </div>
      )}

      {/* File list */}
      <div className="max-h-64 overflow-y-auto">
        {changes.map((change) => {
          const isExpanded = expandedPaths.has(change.path);
          const colorClass = CHANGE_COLORS[change.changeType] ?? "text-foreground";
          const label = CHANGE_LABELS[change.changeType] ?? "~";
          const filename = change.path.split("/").pop() ?? change.path;

          return (
            <div key={change.path} className="border-t border-border/30">
              <button
                className="w-full flex items-center gap-2 px-3 py-1.5 hover:bg-muted/30 text-xs text-left"
                onClick={() => toggleExpand(change.path)}
              >
                <span className={`shrink-0 font-mono font-bold w-3 ${colorClass}`}>{label}</span>
                <span className="truncate flex-1 text-foreground/80" title={change.path}>
                  {filename}
                </span>
                <span className="text-muted-foreground/50 text-[10px] hidden sm:block truncate max-w-[120px]">
                  {change.path.replace(filename, "").replace(/\/$/, "")}
                </span>
                {change.additions !== undefined && (
                  <span className="text-green-500 shrink-0 tabular-nums">+{change.additions}</span>
                )}
                {change.deletions !== undefined && change.deletions > 0 && (
                  <span className="text-red-500 shrink-0 tabular-nums">-{change.deletions}</span>
                )}
                <span className="text-muted-foreground shrink-0 ml-1">
                  {isExpanded ? "▲" : "▼"}
                </span>
              </button>

              {isExpanded && change.unifiedDiff && (
                <div className="bg-muted/20 overflow-auto max-h-56 border-t border-border/20">
                  <pre className="text-xs p-2 font-mono leading-relaxed">
                    {change.unifiedDiff.split("\n").map((line, i) => (
                      <span
                        key={i}
                        className={`block ${
                          line.startsWith("+") && !line.startsWith("+++")
                            ? "text-green-500 bg-green-500/5"
                            : line.startsWith("-") && !line.startsWith("---")
                            ? "text-red-500 bg-red-500/5"
                            : line.startsWith("@@")
                            ? "text-blue-400"
                            : line.startsWith("---") || line.startsWith("+++")
                            ? "text-muted-foreground"
                            : "text-foreground/70"
                        }`}
                      >
                        {line || "\u00a0"}
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
          <span className="text-muted-foreground">
            已回滚{isGitRepo ? "（git restore .）" : "（快照恢复）"}
          </span>
        ) : (
          <>
            <span className="text-muted-foreground flex-1">
              变更已写入文件系统
              {isGitRepo ? "，可用 git 安全回滚" : "，可用快照回滚"}
            </span>
            <Button
              variant="outline"
              size="sm"
              className="h-6 text-xs px-2 gap-1"
              onClick={handleRevert}
            >
              {isGitRepo ? <GitBranch className="w-3 h-3" /> : "↩"}
              回滚
            </Button>
          </>
        )}
      </div>
    </div>
  );
}

import { GitBranch } from "lucide-react";
import { AgentSession, AGENT_STATUS_LABELS, AGENT_STATUS_COLORS } from "@/types/agent";

interface AgentStatusBarProps {
  session: AgentSession | null;
}

export function AgentStatusBar({ session }: AgentStatusBarProps) {
  if (!session) {
    return (
      <div className="flex items-center gap-2 px-3 py-1.5 border-b text-xs text-muted-foreground">
        <span>Agent 准备就绪</span>
      </div>
    );
  }

  const status = session.status;
  const colorClass = AGENT_STATUS_COLORS[status] ?? "text-muted-foreground";
  const label = AGENT_STATUS_LABELS[status] ?? status;

  const elapsed = session.endedAt
    ? ((session.endedAt - session.startedAt) / 1000).toFixed(1) + "s"
    : ((Date.now() - session.startedAt) / 1000).toFixed(0) + "s";

  return (
    <div className="flex items-center gap-3 px-3 py-1.5 border-b text-xs">
      {/* Status */}
      <div className="flex items-center gap-1.5">
        <span
          className={`w-2 h-2 rounded-full inline-block ${
            status === "running"
              ? "bg-green-500 animate-pulse"
              : status === "completed"
              ? "bg-blue-500"
              : status === "error"
              ? "bg-red-500"
              : "bg-muted-foreground/50"
          }`}
        />
        <span className={colorClass}>{label}</span>
      </div>

      {/* Git branch */}
      {session.isGitRepo && session.gitBranch && (
        <div className="flex items-center gap-1 text-muted-foreground">
          <GitBranch className="w-3 h-3" />
          <span className="font-mono">{session.gitBranch}</span>
        </div>
      )}

      {/* Turns */}
      {session.numTurns !== undefined && (
        <span className="text-muted-foreground">{session.numTurns} 轮</span>
      )}

      {/* Cost */}
      {session.costUsd != null && (
        <span className="text-muted-foreground">${session.costUsd.toFixed(4)}</span>
      )}

      {/* Elapsed */}
      <span className="text-muted-foreground ml-auto">{elapsed}</span>
    </div>
  );
}

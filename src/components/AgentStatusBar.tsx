import { AgentSession } from "@/types/agent";

interface AgentStatusBarProps {
  session: AgentSession | null;
}

const STATUS_LABELS: Record<string, string> = {
  idle: "空闲",
  running: "运行中",
  waiting_approval: "等待审批",
  completed: "已完成",
  error: "出错",
  cancelled: "已取消",
};

const STATUS_COLORS: Record<string, string> = {
  idle: "text-muted-foreground",
  running: "text-green-500",
  waiting_approval: "text-yellow-500",
  completed: "text-blue-500",
  error: "text-red-500",
  cancelled: "text-muted-foreground",
};

export function AgentStatusBar({ session }: AgentStatusBarProps) {
  if (!session) {
    return (
      <div className="flex items-center gap-2 px-3 py-1.5 border-b text-xs text-muted-foreground">
        <span>Agent 准备就绪</span>
      </div>
    );
  }

  const status = session.status;
  const colorClass = STATUS_COLORS[status] ?? "text-muted-foreground";
  const label = STATUS_LABELS[status] ?? status;

  const elapsed =
    session.endedAt
      ? ((session.endedAt - session.startedAt) / 1000).toFixed(1) + "s"
      : session.startedAt
      ? ((Date.now() - session.startedAt) / 1000).toFixed(0) + "s"
      : null;

  return (
    <div className="flex items-center gap-3 px-3 py-1.5 border-b text-xs">
      {/* Status dot + label */}
      <div className="flex items-center gap-1.5">
        <span
          className={`w-2 h-2 rounded-full ${colorClass} ${
            status === "running" ? "animate-pulse bg-green-500" : "bg-current"
          }`}
        />
        <span className={colorClass}>{label}</span>
      </div>

      {/* Turns */}
      {session.numTurns !== undefined && (
        <span className="text-muted-foreground">
          {session.numTurns} 轮
        </span>
      )}

      {/* Cost */}
      {session.costUsd !== undefined && (
        <span className="text-muted-foreground">
          ${session.costUsd.toFixed(4)}
        </span>
      )}

      {/* Elapsed */}
      {elapsed && (
        <span className="text-muted-foreground ml-auto">{elapsed}</span>
      )}
    </div>
  );
}

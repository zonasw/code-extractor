import { RotateCw, Trash2, MessageSquarePlus } from "lucide-react";
import { AgentSession, AGENT_STATUS_DOT, AGENT_STATUS_LABELS } from "@/types/agent";

interface AgentSessionListProps {
  sessions: AgentSession[];
  activeSessionId: string | null;
  onSelect: (id: string) => void;
  onContinue: (session: AgentSession) => void;
  onClear: (id: string) => void;
}

function formatRelative(ts: number): string {
  const diff = Date.now() - ts;
  const s = Math.floor(diff / 1000);
  if (s < 60) return "刚刚";
  const m = Math.floor(s / 60);
  if (m < 60) return `${m}分钟前`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h}小时前`;
  return `${Math.floor(h / 24)}天前`;
}

export function AgentSessionList({
  sessions,
  activeSessionId,
  onSelect,
  onContinue,
  onClear,
}: AgentSessionListProps) {
  if (sessions.length === 0) {
    return (
      <div className="flex-1 flex items-center justify-center text-xs text-muted-foreground/50 select-none">
        暂无会话记录
      </div>
    );
  }

  // Sort newest first
  const sorted = [...sessions].sort((a, b) => b.startedAt - a.startedAt);

  return (
    <div className="flex-1 overflow-y-auto">
      {sorted.map((session) => {
        const isActive = session.id === activeSessionId;
        const dotClass = AGENT_STATUS_DOT[session.status] ?? AGENT_STATUS_DOT.idle;
        const isTerminal = ["completed", "error", "cancelled"].includes(session.status);

        return (
          <div
            key={session.id}
            role="button"
            tabIndex={0}
            onClick={() => onSelect(session.id)}
            onKeyDown={(e) => e.key === "Enter" && onSelect(session.id)}
            className={`group relative flex flex-col gap-0.5 px-3 py-2 cursor-pointer border-b border-border/30 transition-colors ${
              isActive
                ? "bg-primary/8 border-l-2 border-l-primary"
                : "hover:bg-muted/30"
            }`}
          >
            {/* Task preview */}
            <div className="flex items-center gap-1.5 min-w-0">
              <span className={`w-1.5 h-1.5 rounded-full shrink-0 ${dotClass}`} />
              <span className="text-xs font-medium truncate flex-1 leading-snug">
                {session.task.length > 60
                  ? session.task.slice(0, 60) + "…"
                  : session.task}
              </span>
            </div>

            {/* Meta row */}
            <div className="flex items-center gap-2 pl-3 text-[10px] text-muted-foreground">
              <span>{AGENT_STATUS_LABELS[session.status] ?? session.status}</span>
              {session.numTurns !== undefined && (
                <span>{session.numTurns} 轮</span>
              )}
              {session.costUsd !== undefined && (
                <span>${session.costUsd.toFixed(4)}</span>
              )}
              <span className="ml-auto">{formatRelative(session.startedAt)}</span>
            </div>

            {/* Action buttons — visible on hover */}
            <div className="absolute right-1.5 top-1/2 -translate-y-1/2 hidden group-hover:flex items-center gap-0.5 bg-background/90 rounded border border-border/40 shadow-sm px-0.5">
              {isTerminal && (
                <button
                  title="继续对话"
                  className="p-1 rounded hover:bg-primary/10 text-muted-foreground hover:text-primary transition-colors"
                  onClick={(e) => {
                    e.stopPropagation();
                    onContinue(session);
                  }}
                >
                  <MessageSquarePlus className="w-3 h-3" />
                </button>
              )}
              {!isTerminal && session.status === "completed" && (
                <button
                  title="重新运行"
                  className="p-1 rounded hover:bg-muted text-muted-foreground hover:text-foreground transition-colors"
                  onClick={(e) => {
                    e.stopPropagation();
                    onContinue(session);
                  }}
                >
                  <RotateCw className="w-3 h-3" />
                </button>
              )}
              <button
                title="删除"
                className="p-1 rounded hover:bg-destructive/10 text-muted-foreground hover:text-destructive transition-colors"
                onClick={(e) => {
                  e.stopPropagation();
                  onClear(session.id);
                }}
              >
                <Trash2 className="w-3 h-3" />
              </button>
            </div>
          </div>
        );
      })}
    </div>
  );
}

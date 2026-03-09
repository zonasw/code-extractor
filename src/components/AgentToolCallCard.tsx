import { useState } from "react";
import { AgentMessage } from "@/types/agent";

interface AgentToolCallCardProps {
  message: AgentMessage;
}

const TOOL_STYLES: Record<string, { color: string; label: string; icon: string }> = {
  Read:    { color: "text-blue-400",   label: "读取文件", icon: "📄" },
  Write:   { color: "text-orange-400", label: "写入文件", icon: "✏️" },
  Edit:    { color: "text-yellow-400", label: "编辑文件", icon: "📝" },
  Bash:    { color: "text-green-400",  label: "执行命令", icon: "⌨️" },
  Glob:    { color: "text-purple-400", label: "搜索文件", icon: "🔍" },
  Grep:    { color: "text-purple-400", label: "内容搜索", icon: "🔎" },
  WebFetch:{ color: "text-cyan-400",   label: "网络请求", icon: "🌐" },
  Task:    { color: "text-pink-400",   label: "子任务",   icon: "🤖" },
};

function getToolSummary(toolName: string, input: Record<string, unknown>): string {
  switch (toolName) {
    case "Read":
      return String(input.file_path ?? input.path ?? "");
    case "Write":
      return String(input.file_path ?? "");
    case "Edit":
      return String(input.file_path ?? "");
    case "Bash":
      return String(input.command ?? "").slice(0, 80);
    case "Glob":
      return String(input.pattern ?? "");
    case "Grep":
      return String(input.pattern ?? "");
    default:
      return JSON.stringify(input).slice(0, 80);
  }
}

export function AgentToolCallCard({ message }: AgentToolCallCardProps) {
  const [expanded, setExpanded] = useState(false);
  const { toolCall } = message;
  if (!toolCall) return null;

  const style = TOOL_STYLES[toolCall.toolName] ?? {
    color: "text-muted-foreground",
    label: toolCall.toolName,
    icon: "🔧",
  };
  const summary = getToolSummary(toolCall.toolName, toolCall.input);
  const isDone = toolCall.result !== undefined;
  const isError = toolCall.isError;

  return (
    <div className="my-1 rounded border border-border/50 text-xs overflow-hidden">
      <button
        className="w-full flex items-center gap-2 px-2.5 py-1.5 hover:bg-muted/40 text-left"
        onClick={() => setExpanded((v) => !v)}
      >
        <span>{style.icon}</span>
        <span className={`font-medium ${style.color}`}>{style.label}</span>
        <span className="text-muted-foreground truncate flex-1">{summary}</span>
        {isDone ? (
          isError ? (
            <span className="text-red-400 shrink-0">✗</span>
          ) : (
            <span className="text-green-400 shrink-0">✓</span>
          )
        ) : (
          <span className="text-muted-foreground shrink-0 animate-pulse">…</span>
        )}
        <span className="text-muted-foreground shrink-0">{expanded ? "▲" : "▼"}</span>
      </button>

      {expanded && (
        <div className="px-2.5 pb-2 space-y-1.5 border-t border-border/30">
          <div className="mt-1.5">
            <div className="text-muted-foreground mb-0.5">输入</div>
            <pre className="text-xs bg-muted/30 rounded p-1.5 overflow-auto max-h-32 whitespace-pre-wrap break-all">
              {JSON.stringify(toolCall.input, null, 2)}
            </pre>
          </div>
          {toolCall.result !== undefined && (
            <div>
              <div className={`mb-0.5 ${isError ? "text-red-400" : "text-muted-foreground"}`}>
                {isError ? "错误" : "结果"}
              </div>
              <pre className="text-xs bg-muted/30 rounded p-1.5 overflow-auto max-h-32 whitespace-pre-wrap break-all">
                {toolCall.result}
              </pre>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

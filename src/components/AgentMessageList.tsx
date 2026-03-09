import { useEffect, useRef } from "react";
import { AgentMessage } from "@/types/agent";
import { AgentToolCallCard } from "./AgentToolCallCard";

interface AgentMessageListProps {
  messages: AgentMessage[];
}

export function AgentMessageList({ messages }: AgentMessageListProps) {
  const bottomRef = useRef<HTMLDivElement>(null);

  // Auto-scroll to bottom when new messages arrive
  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages.length, messages[messages.length - 1]?.content]);

  if (messages.length === 0) {
    return (
      <div className="flex-1 flex items-center justify-center text-xs text-muted-foreground p-4 text-center">
        在下方输入任务描述，然后点击运行。
        <br />
        Claude 将读取选中的文件并执行任务。
      </div>
    );
  }

  return (
    <div className="flex-1 overflow-y-auto px-3 py-2 space-y-2">
      {messages.map((msg) => (
        <MessageItem key={msg.id} message={msg} />
      ))}
      <div ref={bottomRef} />
    </div>
  );
}

function MessageItem({ message }: { message: AgentMessage }) {
  if (message.type === "tool_use") {
    return <AgentToolCallCard message={message} />;
  }

  if (message.type === "tool_result") {
    // Tool results are shown inline in the tool call card; skip standalone rendering
    return null;
  }

  const isUser = message.role === "user";
  const isError = message.type === "error";

  return (
    <div className={`flex flex-col gap-0.5 ${isUser ? "items-end" : "items-start"}`}>
      <div
        className={`max-w-[90%] rounded-lg px-3 py-1.5 text-xs whitespace-pre-wrap break-words ${
          isUser
            ? "bg-primary text-primary-foreground rounded-br-sm"
            : isError
            ? "bg-red-500/10 text-red-500 border border-red-500/20 rounded-bl-sm"
            : "bg-muted rounded-bl-sm"
        }`}
      >
        {message.content}
        {message.isPartial && (
          <span className="inline-block w-1 h-3 ml-0.5 bg-current animate-pulse" />
        )}
      </div>
    </div>
  );
}

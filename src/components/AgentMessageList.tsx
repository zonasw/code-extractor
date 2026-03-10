import { useEffect, useRef } from "react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
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
    return null;
  }

  const isUser = message.role === "user";
  const isError = message.type === "error";

  return (
    <div className={`flex flex-col gap-0.5 ${isUser ? "items-end" : "items-start"}`}>
      <div
        className={`max-w-[90%] rounded-lg px-3 py-1.5 text-xs break-words ${
          isUser
            ? "bg-primary text-primary-foreground rounded-br-sm"
            : isError
            ? "bg-red-500/10 text-red-500 border border-red-500/20 rounded-bl-sm"
            : "bg-muted rounded-bl-sm"
        }`}
      >
        {isUser || isError ? (
          <span className="whitespace-pre-wrap">{message.content}</span>
        ) : (
          <ReactMarkdown
            remarkPlugins={[remarkGfm]}
            components={{
              p: ({ children }) => <p className="mb-1.5 last:mb-0 leading-relaxed">{children}</p>,
              h1: ({ children }) => <h1 className="text-sm font-bold mb-1.5 mt-2 first:mt-0">{children}</h1>,
              h2: ({ children }) => <h2 className="text-sm font-semibold mb-1 mt-2 first:mt-0">{children}</h2>,
              h3: ({ children }) => <h3 className="font-semibold mb-1 mt-1.5 first:mt-0">{children}</h3>,
              ul: ({ children }) => <ul className="list-disc pl-4 mb-1.5 space-y-0.5">{children}</ul>,
              ol: ({ children }) => <ol className="list-decimal pl-4 mb-1.5 space-y-0.5">{children}</ol>,
              li: ({ children }) => <li className="leading-relaxed">{children}</li>,
              code: ({ className, children, ...props }) => {
                const isBlock = className?.startsWith("language-");
                return isBlock ? (
                  <code
                    className="block bg-background/60 border border-border/50 rounded px-2 py-1.5 my-1 text-[11px] font-mono overflow-x-auto whitespace-pre"
                    {...props}
                  >
                    {children}
                  </code>
                ) : (
                  <code
                    className="bg-background/60 border border-border/50 rounded px-1 py-0.5 text-[11px] font-mono"
                    {...props}
                  >
                    {children}
                  </code>
                );
              },
              pre: ({ children }) => <pre className="overflow-x-auto">{children}</pre>,
              blockquote: ({ children }) => (
                <blockquote className="border-l-2 border-muted-foreground/30 pl-3 italic my-1 text-muted-foreground">
                  {children}
                </blockquote>
              ),
              a: ({ href, children }) => (
                <a href={href} target="_blank" rel="noopener noreferrer" className="underline underline-offset-2 hover:opacity-80">
                  {children}
                </a>
              ),
              table: ({ children }) => (
                <div className="overflow-x-auto my-1.5">
                  <table className="border-collapse text-[11px] w-full">{children}</table>
                </div>
              ),
              th: ({ children }) => (
                <th className="border border-border/50 bg-muted/50 px-2 py-1 text-left font-medium">{children}</th>
              ),
              td: ({ children }) => (
                <td className="border border-border/50 px-2 py-1">{children}</td>
              ),
              hr: () => <hr className="border-border/40 my-2" />,
            }}
          >
            {message.content}
          </ReactMarkdown>
        )}
        {message.isPartial && (
          <span className="inline-block w-1 h-3 ml-0.5 bg-current animate-pulse" />
        )}
      </div>
    </div>
  );
}

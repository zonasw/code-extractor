import { useState, useRef, KeyboardEvent } from "react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useAgentContext } from "@/context/AgentContext";
import { AgentPermissionMode } from "@/types/agent";
import { useAppContext } from "@/context/AppContext";

interface AgentTaskInputProps {
  onStart: (task: string) => Promise<void>;
  onStop: () => void;
  isRunning: boolean;
}

const MODELS = [
  { value: "claude-sonnet-4-6", label: "Sonnet 4.6" },
  { value: "claude-opus-4-6", label: "Opus 4.6" },
  { value: "claude-haiku-4-5-20251001", label: "Haiku 4.5" },
];

const PERMISSION_MODES: { value: AgentPermissionMode; label: string }[] = [
  { value: "acceptEdits", label: "接受编辑" },
  { value: "bypassPermissions", label: "跳过权限" },
  { value: "default", label: "默认" },
  { value: "plan", label: "仅规划" },
];

export function AgentTaskInput({ onStart, onStop, isRunning }: AgentTaskInputProps) {
  const { state: agentState, dispatch } = useAgentContext();
  const { state: appState } = useAppContext();
  const [task, setTask] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  const { config } = agentState;
  const selectedCount = appState.selectedPaths.size;

  async function handleStart() {
    const trimmed = task.trim();
    if (!trimmed || isLoading) return;
    setError(null);
    setIsLoading(true);
    try {
      await onStart(trimmed);
      setTask("");
    } catch (e) {
      setError(String(e));
    } finally {
      setIsLoading(false);
    }
  }

  function handleKeyDown(e: KeyboardEvent<HTMLTextAreaElement>) {
    if ((e.metaKey || e.ctrlKey) && e.key === "Enter") {
      e.preventDefault();
      if (!isRunning) {
        handleStart();
      }
    }
  }

  return (
    <div className="flex flex-col gap-2 p-3 border-t">
      {error && (
        <div className="text-xs text-red-500 bg-red-50 dark:bg-red-950/30 rounded px-2 py-1">
          {error}
        </div>
      )}

      <Textarea
        ref={textareaRef}
        value={task}
        onChange={(e) => setTask(e.target.value)}
        onKeyDown={handleKeyDown}
        placeholder={`描述任务... (Ctrl+Enter 运行)${selectedCount > 0 ? `\n已选 ${selectedCount} 个文件作为上下文` : ""}`}
        className="min-h-[72px] max-h-[200px] resize-none text-sm"
        disabled={isRunning || isLoading}
      />

      <div className="flex items-center gap-2 flex-wrap">
        {/* Model */}
        <Select
          value={config.model}
          onValueChange={(v) => dispatch({ type: "SET_CONFIG", payload: { model: v } })}
          disabled={isRunning}
        >
          <SelectTrigger className="h-7 text-xs w-36">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {MODELS.map((m) => (
              <SelectItem key={m.value} value={m.value} className="text-xs">
                {m.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        {/* Permission mode */}
        <Select
          value={config.permissionMode}
          onValueChange={(v) =>
            dispatch({ type: "SET_CONFIG", payload: { permissionMode: v as AgentPermissionMode } })
          }
          disabled={isRunning}
        >
          <SelectTrigger className="h-7 text-xs w-28">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {PERMISSION_MODES.map((m) => (
              <SelectItem key={m.value} value={m.value} className="text-xs">
                {m.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        {/* Context mode toggle */}
        <button
          className={`text-xs px-2 py-1 rounded border transition-colors ${
            config.inlineContext
              ? "bg-primary/10 border-primary/30 text-primary"
              : "border-border text-muted-foreground hover:text-foreground"
          }`}
          onClick={() =>
            dispatch({ type: "SET_CONFIG", payload: { inlineContext: !config.inlineContext } })
          }
          disabled={isRunning}
          title={config.inlineContext ? "内联模式：文件内容嵌入 prompt" : "目录模式：Claude 自主读取文件"}
        >
          {config.inlineContext ? "内联" : "目录"}
        </button>

        {/* Run / Stop */}
        <div className="ml-auto">
          {isRunning ? (
            <Button
              variant="destructive"
              size="sm"
              className="h-7 text-xs"
              onClick={onStop}
            >
              ■ 停止
            </Button>
          ) : (
            <Button
              size="sm"
              className="h-7 text-xs"
              onClick={handleStart}
              disabled={!task.trim() || isLoading}
            >
              ▶ 运行
            </Button>
          )}
        </div>
      </div>
    </div>
  );
}

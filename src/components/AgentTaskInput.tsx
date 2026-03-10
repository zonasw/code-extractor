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
import { Wand2 } from "lucide-react";
import { useAgentContext } from "@/context/AgentContext";
import { AgentPermissionMode, PROVIDER_MODELS } from "@/types/agent";
import { useAppContext } from "@/context/AppContext";

interface AgentTaskInputProps {
  onStart: (task: string) => Promise<void>;
  onStop: () => void;
  isRunning: boolean;
  initialTask?: string;
  onTaskChange?: (task: string) => void;
  showSkillToggle?: boolean;
  skillsOpen?: boolean;
  onToggleSkills?: () => void;
}

const PERMISSION_MODES: { value: AgentPermissionMode; label: string; title: string }[] = [
  { value: "acceptEdits",       label: "接受编辑", title: "自动接受所有文件修改" },
  { value: "bypassPermissions", label: "跳过权限", title: "绕过所有权限检查（危险）" },
  { value: "default",           label: "默认",     title: "使用 claude CLI 默认权限" },
  { value: "plan",              label: "仅规划",   title: "只生成计划，不执行操作" },
];

export function AgentTaskInput({
  onStart,
  onStop,
  isRunning,
  initialTask = "",
  onTaskChange,
  showSkillToggle = false,
  skillsOpen = false,
  onToggleSkills,
}: AgentTaskInputProps) {
  const { state: agentState, dispatch } = useAgentContext();
  const { state: appState } = useAppContext();
  const [task, setTask] = useState(initialTask);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  // Sync when initialTask changes (e.g., skill insert or continue session)
  const prevInitialTask = useRef(initialTask);
  if (initialTask !== prevInitialTask.current) {
    prevInitialTask.current = initialTask;
    if (initialTask !== task) setTask(initialTask);
  }

  const { config } = agentState;
  const selectedCount = appState.selectedPaths.size;
  const models = PROVIDER_MODELS[config.provider] ?? PROVIDER_MODELS.anthropic;

  // Use "__default__" sentinel because Select.Item disallows empty string values
  // Map "" <-> "__default__" at the boundary
  const rawModel = config.model || "__default__";
  const modelValue = models.some((m) => m.value === rawModel) ? rawModel : models[0].value;

  async function handleStart() {
    const trimmed = task.trim();
    if (!trimmed || isLoading) return;
    setError(null);
    setIsLoading(true);
    try {
      await onStart(trimmed);
      setTask("");
      onTaskChange?.("");
    } catch (e) {
      setError(String(e));
    } finally {
      setIsLoading(false);
    }
  }

  function handleKeyDown(e: KeyboardEvent<HTMLTextAreaElement>) {
    if ((e.metaKey || e.ctrlKey) && e.key === "Enter") {
      e.preventDefault();
      if (!isRunning) handleStart();
    }
  }

  return (
    <div className="flex flex-col gap-2 p-3 border-t shrink-0">
      {error && (
        <div className="text-xs text-red-500 bg-red-50 dark:bg-red-950/30 rounded px-2 py-1.5 leading-relaxed">
          {error}
        </div>
      )}

      <Textarea
        ref={textareaRef}
        value={task}
        onChange={(e) => { setTask(e.target.value); onTaskChange?.(e.target.value); }}
        onKeyDown={handleKeyDown}
        placeholder={
          selectedCount > 0
            ? `描述任务... (⌘+Enter 运行)\n已选 ${selectedCount} 个文件作为上下文`
            : "描述任务... (⌘+Enter 运行)"
        }
        className="min-h-[72px] max-h-[180px] resize-none text-sm"
        disabled={isRunning || isLoading}
      />

      <div className="flex items-center gap-1.5 flex-wrap">
        {/* 模型选择，随 provider 变化 */}
        <Select
          value={modelValue}
          onValueChange={(v) => dispatch({ type: "SET_CONFIG", payload: { model: v === "__default__" ? "" : v } })}
          disabled={isRunning}
        >
          <SelectTrigger className="h-7 text-xs w-40 shrink-0">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {models.map((m) => (
              <SelectItem key={m.value} value={m.value} className="text-xs">
                {m.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        {/* 权限模式 */}
        <Select
          value={config.permissionMode}
          onValueChange={(v) =>
            dispatch({ type: "SET_CONFIG", payload: { permissionMode: v as AgentPermissionMode } })
          }
          disabled={isRunning}
        >
          <SelectTrigger className="h-7 text-xs w-24 shrink-0">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {PERMISSION_MODES.map((m) => (
              <SelectItem key={m.value} value={m.value} className="text-xs" title={m.title}>
                {m.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        {/* 上下文模式切换 */}
        <button
          className={`text-xs px-2 py-1 rounded border transition-colors shrink-0 ${
            config.inlineContext
              ? "bg-primary/10 border-primary/30 text-primary"
              : "border-border text-muted-foreground hover:text-foreground"
          }`}
          onClick={() =>
            dispatch({ type: "SET_CONFIG", payload: { inlineContext: !config.inlineContext } })
          }
          disabled={isRunning}
          title={
            config.inlineContext
              ? "内联模式：将选中文件内容直接嵌入 prompt"
              : "目录模式：让 Claude 用工具自主读取项目文件"
          }
        >
          {config.inlineContext ? "内联" : "目录"}
        </button>

        {/* Skills toggle */}
        {showSkillToggle && (
          <button
            className={`text-xs px-2 py-1 rounded border transition-colors shrink-0 flex items-center gap-1 ${
              skillsOpen
                ? "bg-primary/10 border-primary/30 text-primary"
                : "border-border text-muted-foreground hover:text-foreground"
            }`}
            onClick={onToggleSkills}
            disabled={isRunning}
            title="插入技能模板"
          >
            <Wand2 className="w-3 h-3" />
            技能
          </button>
        )}

        {/* 运行 / 停止 */}
        <div className="ml-auto">
          {isRunning ? (
            <Button variant="destructive" size="sm" className="h-7 text-xs" onClick={onStop}>
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

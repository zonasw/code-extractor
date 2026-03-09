import { AlertTriangle, GitBranch } from "lucide-react";
import { useAgent } from "@/hooks/useAgent";
import { AgentStatusBar } from "./AgentStatusBar";
import { AgentMessageList } from "./AgentMessageList";
import { AgentDiffViewer } from "./AgentDiffViewer";
import { AgentTaskInput } from "./AgentTaskInput";

export function AgentPanel() {
  const { activeSession, isRunning, startAgent, stopAgent, revertChanges } = useAgent();

  async function handleStart(task: string) {
    await startAgent(task);
  }

  function handleStop() {
    if (activeSession) stopAgent(activeSession.id);
  }

  async function handleRevert() {
    if (activeSession) await revertChanges(activeSession.id);
  }

  const showDiff =
    activeSession?.status === "completed" &&
    (activeSession.fileChanges?.length ?? 0) > 0;

  // Warn before or during run if there were uncommitted changes at start time
  const showUncommittedWarning =
    isRunning &&
    activeSession?.isGitRepo &&
    activeSession.hasUncommittedChanges;

  // Before first session: show git status hint
  const showGitHint = !activeSession;

  return (
    <div className="flex flex-col h-full">
      <AgentStatusBar session={activeSession ?? null} />

      {/* Pre-run uncommitted changes warning */}
      {showUncommittedWarning && (
        <div className="flex items-center gap-2 px-3 py-2 bg-yellow-500/10 border-b border-yellow-500/20 text-xs text-yellow-600 dark:text-yellow-400">
          <AlertTriangle className="w-3.5 h-3.5 shrink-0" />
          <span>
            执行前有 <strong>{activeSession!.uncommittedCount}</strong> 个未提交改动，
            若需回滚将一并还原。
          </span>
        </div>
      )}

      <AgentMessageList messages={activeSession?.messages ?? []} />

      {showDiff && (
        <AgentDiffViewer
          changes={activeSession!.fileChanges}
          isGitRepo={activeSession!.isGitRepo}
          hasUncommittedChanges={activeSession!.hasUncommittedChanges}
          uncommittedCount={activeSession!.uncommittedCount}
          onRevert={handleRevert}
        />
      )}

      {/* Empty state git hint */}
      {showGitHint && (
        <div className="px-3 pb-2 flex items-center gap-1.5 text-xs text-muted-foreground/60">
          <GitBranch className="w-3 h-3 shrink-0" />
          <span>在 git 仓库中运行时，回滚将使用 git restore 代替快照</span>
        </div>
      )}

      <AgentTaskInput
        onStart={handleStart}
        onStop={handleStop}
        isRunning={isRunning}
      />
    </div>
  );
}

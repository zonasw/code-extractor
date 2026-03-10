import { useState } from "react";
import { AlertTriangle, GitBranch, LayoutList, X } from "lucide-react";
import { useAgent } from "@/hooks/useAgent";
import { AgentSession } from "@/types/agent";
import { AgentStatusBar } from "./AgentStatusBar";
import { AgentMessageList } from "./AgentMessageList";
import { AgentDiffViewer } from "./AgentDiffViewer";
import { AgentTaskInput } from "./AgentTaskInput";
import { AgentSessionList } from "./AgentSessionList";
import { AgentSkillPicker } from "./AgentSkillPicker";
import { useAppContext } from "@/context/AppContext";

export function AgentPanel() {
  const { activeSession, isRunning, startAgent, stopAgent, revertChanges, continueSession, agentState, dispatch } =
    useAgent();
  const { state: appState } = useAppContext();
  const [showSessions, setShowSessions] = useState(false);
  const [showSkills, setShowSkills] = useState(false);
  // For multi-turn: pre-fill task input when continuing
  const [pendingTask, setPendingTask] = useState("");
  // Session to continue (set when user clicks "继续对话")
  const [continueFrom, setContinueFrom] = useState<AgentSession | null>(null);

  const workingDir =
    appState.rootNodes.length > 0 ? appState.rootNodes[0].path : "";

  async function handleStart(task: string) {
    if (continueFrom) {
      await continueSession(continueFrom, task);
      setContinueFrom(null);
    } else {
      await startAgent(task);
    }
  }

  function handleStop() {
    if (activeSession) stopAgent(activeSession.id);
  }

  async function handleRevert() {
    if (activeSession) await revertChanges(activeSession.id);
  }

  function handleSessionSelect(id: string) {
    dispatch({ type: "SET_ACTIVE_SESSION", payload: id });
    setShowSessions(false);
  }

  function handleSessionContinue(session: AgentSession) {
    setContinueFrom(session);
    dispatch({ type: "SET_ACTIVE_SESSION", payload: session.id });
    setShowSessions(false);
    // Pre-fill task with empty prompt ready for the user to type
    setPendingTask("");
  }

  function handleSessionClear(id: string) {
    dispatch({ type: "CLEAR_SESSION", payload: id });
  }

  function handleSkillInsert(content: string) {
    setPendingTask((prev) => (prev ? prev + "\n\n" + content : content));
    setShowSkills(false);
  }

  // Build full message history by following the resumeSessionId chain
  const allMessages = (() => {
    const chain: typeof activeSession[] = [];
    let s = activeSession;
    while (s) {
      chain.unshift(s);
      s = s.resumeSessionId ? agentState.sessions[s.resumeSessionId] : null;
    }
    return chain.flatMap((session) => session?.messages ?? []);
  })();

  const showDiff =
    activeSession?.status === "completed" &&
    (activeSession.fileChanges?.length ?? 0) > 0;

  const showUncommittedWarning =
    isRunning &&
    activeSession?.isGitRepo &&
    activeSession.hasUncommittedChanges;

  const showGitHint = !activeSession;

  const allSessions = Object.values(agentState.sessions);

  // Multi-turn indicator: is this session a continuation?
  const isContinuation = !!continueFrom;

  return (
    <div className="flex h-full overflow-hidden">
      {/* ── Session list sidebar ──────────────────────────────── */}
      {showSessions && (
        <div className="w-52 shrink-0 border-r flex flex-col bg-background">
          <div className="flex items-center gap-1.5 px-3 py-1.5 border-b text-xs font-medium">
            <LayoutList className="w-3 h-3" />
            <span>会话记录</span>
            <button
              className="ml-auto text-muted-foreground hover:text-foreground"
              onClick={() => setShowSessions(false)}
            >
              <X className="w-3.5 h-3.5" />
            </button>
          </div>
          <AgentSessionList
            sessions={allSessions}
            activeSessionId={agentState.activeSessionId}
            onSelect={handleSessionSelect}
            onContinue={handleSessionContinue}
            onClear={handleSessionClear}
          />
        </div>
      )}

      {/* ── Main panel ───────────────────────────────────────── */}
      <div className="flex flex-col flex-1 min-w-0 h-full">
        {/* Top bar: status + session toggle */}
        <div className="flex items-center border-b shrink-0">
          <div className="flex-1 min-w-0">
            <AgentStatusBar session={activeSession ?? null} />
          </div>
          <button
            className={`px-2 py-1.5 text-xs flex items-center gap-1 shrink-0 transition-colors ${
              showSessions
                ? "text-primary"
                : "text-muted-foreground hover:text-foreground"
            }`}
            onClick={() => setShowSessions((v) => !v)}
            title="会话记录"
          >
            <LayoutList className="w-3.5 h-3.5" />
            {allSessions.length > 0 && (
              <span className="text-[10px]">{allSessions.length}</span>
            )}
          </button>
        </div>

        {/* Multi-turn continuation banner */}
        {isContinuation && continueFrom && (
          <div className="flex items-center gap-2 px-3 py-1.5 bg-blue-500/10 border-b border-blue-500/20 text-xs text-blue-600 dark:text-blue-400 shrink-0">
            <span className="flex-1 truncate">
              继续对话：<strong>{continueFrom.task.slice(0, 40)}{continueFrom.task.length > 40 ? "…" : ""}</strong>
            </span>
            <button
              className="text-blue-400 hover:text-blue-600"
              onClick={() => setContinueFrom(null)}
              title="取消继续，开始新对话"
            >
              <X className="w-3 h-3" />
            </button>
          </div>
        )}

        {/* Pre-run uncommitted changes warning */}
        {showUncommittedWarning && (
          <div className="flex items-center gap-2 px-3 py-2 bg-yellow-500/10 border-b border-yellow-500/20 text-xs text-yellow-600 dark:text-yellow-400 shrink-0">
            <AlertTriangle className="w-3.5 h-3.5 shrink-0" />
            <span>
              执行前有 <strong>{activeSession!.uncommittedCount}</strong> 个未提交改动，
              若需回滚将一并还原。
            </span>
          </div>
        )}

        {/* Message list */}
        <AgentMessageList messages={allMessages} />

        {/* Diff viewer */}
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
          <div className="px-3 pb-2 flex items-center gap-1.5 text-xs text-muted-foreground/60 shrink-0">
            <GitBranch className="w-3 h-3 shrink-0" />
            <span>在 git 仓库中运行时，回滚将使用 git restore 代替快照</span>
          </div>
        )}

        {/* Skill picker */}
        {showSkills && (
          <AgentSkillPicker workingDir={workingDir} onInsert={handleSkillInsert} />
        )}

        {/* Task input */}
        <AgentTaskInput
          onStart={handleStart}
          onStop={handleStop}
          isRunning={isRunning}
          initialTask={pendingTask}
          onTaskChange={setPendingTask}
          showSkillToggle
          skillsOpen={showSkills}
          onToggleSkills={() => setShowSkills((v) => !v)}
        />
      </div>
    </div>
  );
}

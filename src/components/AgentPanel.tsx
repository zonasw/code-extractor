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
    if (activeSession) {
      stopAgent(activeSession.id);
    }
  }

  async function handleRevert() {
    if (activeSession) {
      await revertChanges(activeSession.id);
    }
  }

  const showDiff =
    activeSession?.status === "completed" &&
    (activeSession.fileChanges?.length ?? 0) > 0;

  return (
    <div className="flex flex-col h-full">
      <AgentStatusBar session={activeSession ?? null} />

      <AgentMessageList messages={activeSession?.messages ?? []} />

      {showDiff && (
        <AgentDiffViewer
          changes={activeSession!.fileChanges}
          onRevert={handleRevert}
        />
      )}

      <AgentTaskInput
        onStart={handleStart}
        onStop={handleStop}
        isRunning={isRunning}
      />
    </div>
  );
}

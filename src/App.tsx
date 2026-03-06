import { useEffect } from "react";
import { Panel, Group, Separator } from "react-resizable-panels";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { AppProvider, useAppContext } from "@/context/AppContext";
import { Toolbar } from "@/components/Toolbar";
import { DirectoryTree } from "@/components/DirectoryTree";
import { ConfigPanel } from "@/components/ConfigPanel";
import { PreviewPanel } from "@/components/PreviewPanel";
import { useAppConfig } from "@/hooks/useAppConfig";
import { useDirectoryTree } from "@/hooks/useDirectoryTree";
import { Toaster } from "@/components/ui/sonner";

function AppContent() {
  const { state } = useAppContext();
  const { loadConfig } = useAppConfig();
  const { addDirectory } = useDirectoryTree();

  useEffect(() => {
    async function init() {
      const config = await loadConfig();
      // 并行恢复所有上次打开的目录
      await Promise.allSettled(
        config.last_directories.map((dir) => addDirectory(dir))
      );
    }
    init();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <div className="flex flex-col h-screen bg-background text-foreground overflow-hidden">
      <Toolbar />
      <div className="flex-1 overflow-hidden">
        <Group orientation="horizontal" className="h-full">
          <Panel defaultSize={40} minSize={25}>
            <div className="h-full border-r overflow-hidden">
              <DirectoryTree />
            </div>
          </Panel>

          <Separator className="w-1 bg-border hover:bg-primary/30 transition-colors cursor-col-resize" />

          <Panel defaultSize={60} minSize={30}>
            <Tabs defaultValue="config" className="h-full flex flex-col">
              <TabsList className="mx-4 mt-2 w-auto self-start">
                <TabsTrigger value="config">配置</TabsTrigger>
                <TabsTrigger value="preview">
                  预览
                  {state.selectedPaths.size > 0 && (
                    <span className="ml-1.5 text-xs bg-primary text-primary-foreground rounded-full px-1.5 py-0.5">
                      {state.selectedPaths.size}
                    </span>
                  )}
                </TabsTrigger>
              </TabsList>
              <TabsContent value="config" className="flex-1 overflow-hidden m-0 mt-2">
                <ConfigPanel />
              </TabsContent>
              <TabsContent value="preview" className="flex-1 overflow-hidden m-0 mt-2">
                <PreviewPanel />
              </TabsContent>
            </Tabs>
          </Panel>
        </Group>
      </div>
    </div>
  );
}

export default function App() {
  return (
    <AppProvider>
      <AppContent />
      <Toaster position="bottom-right" richColors />
    </AppProvider>
  );
}

import { useEffect, useCallback, useRef } from "react";
import { Panel, Group, Separator } from "react-resizable-panels";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { AppProvider, useAppContext } from "@/context/AppContext";
import { Toolbar } from "@/components/Toolbar";
import { DirectoryTree } from "@/components/DirectoryTree";
import { ConfigPanel } from "@/components/ConfigPanel";
import { PreviewPanel } from "@/components/PreviewPanel";
import { ShortcutHelpModal } from "@/components/ShortcutHelpModal";
import { useAppConfig } from "@/hooks/useAppConfig";
import { useDirectoryTree } from "@/hooks/useDirectoryTree";
import { useExport } from "@/hooks/useExport";
import { Toaster } from "@/components/ui/sonner";
import { ThemeProvider } from "next-themes";
import { toast } from "sonner";
import { collectAllLeaves } from "@/lib/treeUtils";

function AppContent() {
  const { state, dispatch } = useAppContext();
  const { loadConfig, loadSelectedPaths, saveSelectedPaths } = useAppConfig();
  const { addDirectory, refreshDirectory } = useDirectoryTree();
  const { generateAndCopy, exportFiles } = useExport();

  const prevIgnoreRef = useRef<string>("");
  const prevExtRef = useRef<string>("");
  const saveDebounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const savedPathsRef = useRef<string[] | null>(null);
  const restoredRef = useRef(false);

  useEffect(() => {
    async function init() {
      const config = await loadConfig();
      prevIgnoreRef.current = JSON.stringify(config.ignore_list);
      prevExtRef.current = JSON.stringify(config.extension_filter);
      // Load saved paths before directories load
      const saved = await loadSelectedPaths();
      savedPathsRef.current = saved;
      await Promise.allSettled(
        config.last_directories.map((dir) => addDirectory(dir))
      );
    }
    init();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Restore selected paths once rootNodes are populated
  useEffect(() => {
    if (restoredRef.current) return;
    if (state.rootNodes.length === 0) return;
    if (!savedPathsRef.current || savedPathsRef.current.length === 0) {
      restoredRef.current = true;
      return;
    }
    const allLeaves = new Set(state.rootNodes.flatMap(collectAllLeaves));
    const validPaths = savedPathsRef.current.filter((p) => allLeaves.has(p));
    if (validPaths.length > 0) {
      dispatch({ type: "SET_SELECTED_PATHS", payload: new Set(validPaths) });
    }
    restoredRef.current = true;
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [state.rootNodes]);

  // Auto-refresh when config ignore_list or extension_filter changes
  useEffect(() => {
    const ignoreStr = JSON.stringify(state.config.ignore_list);
    const extStr = JSON.stringify(state.config.extension_filter);
    if (
      (ignoreStr !== prevIgnoreRef.current || extStr !== prevExtRef.current) &&
      state.rootNodes.length > 0 &&
      !state.isLoading
    ) {
      prevIgnoreRef.current = ignoreStr;
      prevExtRef.current = extStr;
      Promise.allSettled(state.rootNodes.map((n) => refreshDirectory(n.path)));
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [state.config.ignore_list, state.config.extension_filter]);

  // Debounce-save selected paths
  useEffect(() => {
    if (saveDebounceRef.current) clearTimeout(saveDebounceRef.current);
    saveDebounceRef.current = setTimeout(() => {
      saveSelectedPaths(Array.from(state.selectedPaths));
    }, 500);
    return () => {
      if (saveDebounceRef.current) clearTimeout(saveDebounceRef.current);
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [state.selectedPaths]);

  // 全局键盘快捷键
  const handleKeyDown = useCallback(
    async (e: KeyboardEvent) => {
      const target = e.target as HTMLElement;
      const isInput = target.tagName === "INPUT" || target.tagName === "TEXTAREA" || target.isContentEditable;

      // F5 — 刷新所有目录
      if (e.key === "F5") {
        e.preventDefault();
        if (state.rootNodes.length > 0 && !state.isLoading) {
          await Promise.allSettled(state.rootNodes.map((n) => refreshDirectory(n.path)));
          toast.success("目录已刷新");
        }
        return;
      }
      // Ctrl+Shift+C — 复制全部选中文件
      if (e.ctrlKey && e.shiftKey && e.key === "C") {
        e.preventDefault();
        if (state.selectedPaths.size > 0 && !state.isLoading) {
          try {
            const count = await generateAndCopy();
            toast.success("已复制到剪贴板", { description: `${count.toLocaleString()} 个字符` });
          } catch {
            toast.error("复制失败");
          }
        }
        return;
      }
      // Ctrl+Shift+E — 导出
      if (e.ctrlKey && e.shiftKey && e.key === "E") {
        e.preventDefault();
        if (state.selectedPaths.size > 0 && !state.isLoading) {
          try {
            const outputPath = await exportFiles();
            if (outputPath) toast.success("导出成功", { description: outputPath });
          } catch {
            toast.error("导出失败");
          }
        }
        return;
      }
      // ? — 显示快捷键帮助（非输入框内）
      if (e.key === "?" && !isInput && !e.ctrlKey && !e.metaKey) {
        dispatch({ type: "SET_SHOW_SHORTCUTS", payload: true });
      }
    },
    [state.rootNodes, state.selectedPaths, state.isLoading, refreshDirectory, generateAndCopy, exportFiles, dispatch]
  );

  useEffect(() => {
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [handleKeyDown]);

  const selectedCount = state.selectedPaths.size;

  return (
    <div className="flex flex-col h-screen bg-background text-foreground overflow-hidden">
      <Toolbar />
      <div className="flex-1 overflow-hidden">
        <Group orientation="horizontal" className="h-full">
          <Panel defaultSize={38} minSize={22}>
            <div className="h-full border-r overflow-hidden">
              <DirectoryTree />
            </div>
          </Panel>

          <Separator className="w-1 bg-border hover:bg-primary/30 transition-colors cursor-col-resize" />

          <Panel defaultSize={62} minSize={30}>
            <Tabs defaultValue="preview" className="h-full flex flex-col">
              <TabsList className="mx-4 mt-2 w-auto self-start">
                <TabsTrigger value="preview">
                  预览
                  {selectedCount > 0 && (
                    <span className="ml-1.5 text-xs bg-primary text-primary-foreground rounded-full px-1.5 py-0.5">
                      {selectedCount}
                    </span>
                  )}
                </TabsTrigger>
                <TabsTrigger value="config">配置</TabsTrigger>
              </TabsList>
              <TabsContent value="preview" className="flex-1 overflow-hidden m-0 mt-2">
                <PreviewPanel />
              </TabsContent>
              <TabsContent value="config" className="flex-1 overflow-hidden m-0 mt-2">
                <ConfigPanel />
              </TabsContent>
            </Tabs>
          </Panel>
        </Group>
      </div>
      <ShortcutHelpModal
        open={state.showShortcuts}
        onClose={() => dispatch({ type: "SET_SHOW_SHORTCUTS", payload: false })}
      />
    </div>
  );
}

export default function App() {
  return (
    <ThemeProvider attribute="class" defaultTheme="system" enableSystem>
      <AppProvider>
        <AppContent />
        <Toaster position="bottom-right" richColors />
      </AppProvider>
    </ThemeProvider>
  );
}

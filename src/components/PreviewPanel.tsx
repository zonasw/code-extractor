import { useState, useEffect, useCallback } from "react";
import { invoke } from "@tauri-apps/api/core";
import { Loader2, Copy, Check, FileText, AlertCircle } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { useAppContext } from "@/context/AppContext";
import { useExport } from "@/hooks/useExport";
import { getLanguage } from "@/lib/treeUtils";
import SyntaxHighlighter from "react-syntax-highlighter";
import { atomOneDark, atomOneLight } from "react-syntax-highlighter/dist/esm/styles/hljs";
import { useTheme } from "next-themes";

export function PreviewPanel() {
  const { state } = useAppContext();
  const { generateAndCopy } = useExport();
  const { resolvedTheme } = useTheme();
  const [copied, setCopied] = useState(false);

  // 当前在右侧展示的文件路径
  const [activeFile, setActiveFile] = useState<string | null>(null);
  // 每个文件的内容缓存
  const [fileCache, setFileCache] = useState<Map<string, string>>(new Map());
  const [loadingFile, setLoadingFile] = useState(false);

  const selectedFiles = Array.from(state.selectedPaths).sort();
  const isDark = resolvedTheme === "dark";

  // 选择变化时：若 activeFile 已不在选中集合中，重置
  useEffect(() => {
    if (activeFile && !state.selectedPaths.has(activeFile)) {
      setActiveFile(selectedFiles[0] ?? null);
    } else if (!activeFile && selectedFiles.length > 0) {
      setActiveFile(selectedFiles[0]);
    }
  }, [state.selectedPaths]);

  // 加载文件内容
  const loadFile = useCallback(
    async (path: string) => {
      if (fileCache.has(path)) return;
      setLoadingFile(true);
      try {
        const content = await invoke<string>("read_file_content", { path });
        setFileCache((prev) => new Map(prev).set(path, content));
      } catch {
        setFileCache((prev) => new Map(prev).set(path, "[无法读取文件内容]"));
      } finally {
        setLoadingFile(false);
      }
    },
    [fileCache]
  );

  // activeFile 变化时自动加载
  useEffect(() => {
    if (activeFile) loadFile(activeFile);
  }, [activeFile]);

  async function handleCopy() {
    try {
      const charCount = await generateAndCopy();
      setCopied(true);
      toast.success("已复制到剪贴板", {
        description: `${charCount.toLocaleString()} 个字符`,
      });
      setTimeout(() => setCopied(false), 2000);
    } catch (e) {
      toast.error("复制失败", { description: String(e) });
    }
  }

  if (selectedFiles.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center h-full text-muted-foreground gap-3 p-8">
        <FileText className="w-10 h-10 opacity-30" />
        <p className="text-sm text-center">请先在左侧勾选文件</p>
      </div>
    );
  }

  const activeContent = activeFile ? fileCache.get(activeFile) : undefined;
  const activeFileName = activeFile?.split("/").pop() ?? "";
  const activeLang = activeFile ? getLanguage(activeFileName) : "text";

  return (
    <div className="flex flex-col h-full overflow-hidden">
      {/* 顶部操作栏 */}
      <div className="flex items-center gap-2 px-3 py-2 border-b shrink-0">
        <span className="text-xs text-muted-foreground">
          {selectedFiles.length} 个文件
        </span>
        <div className="flex-1" />
        {state.isLoading && <Loader2 className="w-3.5 h-3.5 animate-spin text-muted-foreground" />}
        <Button
          size="sm"
          variant="outline"
          onClick={handleCopy}
          disabled={state.isLoading}
          className="h-7 text-xs"
        >
          {copied ? (
            <Check className="w-3.5 h-3.5 mr-1 text-green-500" />
          ) : (
            <Copy className="w-3.5 h-3.5 mr-1" />
          )}
          {copied ? "已复制全部" : "复制全部"}
        </Button>
      </div>

      {/* 主体：左侧文件列表 + 右侧内容 */}
      <div className="flex flex-1 overflow-hidden">
        {/* 左侧文件导航 */}
        <div className="w-48 shrink-0 border-r flex flex-col overflow-hidden">
          <ScrollArea className="flex-1">
            <div className="py-1">
              {selectedFiles.map((path) => {
                const name = path.split("/").pop() ?? path;
                const isActive = path === activeFile;
                return (
                  <button
                    key={path}
                    onClick={() => setActiveFile(path)}
                    title={path}
                    className={`w-full text-left flex items-center gap-1.5 px-2 py-1 text-xs truncate transition-colors rounded-none ${
                      isActive
                        ? "bg-primary/10 text-primary font-medium"
                        : "text-muted-foreground hover:bg-accent hover:text-foreground"
                    }`}
                  >
                    <FileText className="w-3 h-3 shrink-0" />
                    <span className="truncate">{name}</span>
                  </button>
                );
              })}
            </div>
          </ScrollArea>
        </div>

        {/* 右侧内容区 */}
        <div className="flex-1 overflow-hidden flex flex-col">
          {activeFile && (
            <div className="px-3 py-1.5 border-b bg-muted/30 shrink-0">
              <span className="text-xs text-muted-foreground font-mono truncate block" title={activeFile}>
                {activeFile}
              </span>
            </div>
          )}

          <div className="flex-1 overflow-auto">
            {loadingFile && !activeContent ? (
              <div className="flex items-center justify-center h-full">
                <Loader2 className="w-5 h-5 animate-spin text-muted-foreground" />
              </div>
            ) : activeContent?.startsWith("[") ? (
              <div className="flex flex-col items-center justify-center h-full gap-2 text-muted-foreground p-6">
                <AlertCircle className="w-6 h-6 text-destructive/60" />
                <p className="text-xs text-center">{activeContent}</p>
              </div>
            ) : activeContent !== undefined ? (
              <SyntaxHighlighter
                language={activeLang}
                style={isDark ? atomOneDark : atomOneLight}
                showLineNumbers
                wrapLongLines={false}
                customStyle={{
                  margin: 0,
                  padding: "0.75rem",
                  fontSize: "0.72rem",
                  lineHeight: "1.55",
                  background: "transparent",
                  height: "100%",
                }}
                lineNumberStyle={{
                  minWidth: "2.5em",
                  paddingRight: "1em",
                  color: isDark ? "#4a5568" : "#a0aec0",
                  userSelect: "none",
                }}
              >
                {activeContent}
              </SyntaxHighlighter>
            ) : (
              <div className="flex items-center justify-center h-full">
                <Loader2 className="w-5 h-5 animate-spin text-muted-foreground" />
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

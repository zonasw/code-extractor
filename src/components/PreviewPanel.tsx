import { useState, useEffect, useCallback, useRef } from "react";
import { invoke } from "@tauri-apps/api/core";
import { Loader2, FileText, AlertCircle, ZoomIn, ZoomOut } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useAppContext } from "@/context/AppContext";
import { getLanguage } from "@/lib/treeUtils";
import SyntaxHighlighter from "react-syntax-highlighter";
import { atomOneDark, atomOneLight } from "react-syntax-highlighter/dist/esm/styles/hljs";
import { useTheme } from "next-themes";

const FONT_SIZES = [10, 11, 12, 13, 14, 16];
const DEFAULT_FONT_IDX = 1; // 11px

export function PreviewPanel() {
  const { state } = useAppContext();
  const { resolvedTheme } = useTheme();

  // 当前在右侧展示的文件路径
  const [activeFile, setActiveFile] = useState<string | null>(null);
  // 用 ref 存文件内容缓存，避免每次写入都触发重新渲染和 useCallback 重建
  const fileCacheRef = useRef<Map<string, string>>(new Map());
  const [, forceUpdate] = useState(0);
  const [loadingFile, setLoadingFile] = useState(false);
  const [fontSizeIdx, setFontSizeIdx] = useState(DEFAULT_FONT_IDX);

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

  // 加载文件内容 — 依赖稳定，不会因 cache 变化而重建
  const loadFile = useCallback(async (path: string) => {
    if (fileCacheRef.current.has(path)) return;
    setLoadingFile(true);
    try {
      const content = await invoke<string>("read_file_content", { path });
      fileCacheRef.current.set(path, content);
    } catch {
      fileCacheRef.current.set(path, "[无法读取文件内容]");
    } finally {
      setLoadingFile(false);
      forceUpdate((n) => n + 1); // 通知重新渲染以显示内容
    }
  }, []);

  // activeFile 变化时自动加载
  useEffect(() => {
    if (activeFile) loadFile(activeFile);
  }, [activeFile, loadFile]);

  if (selectedFiles.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center h-full text-muted-foreground gap-3 p-8">
        <FileText className="w-10 h-10 opacity-30" />
        <p className="text-sm text-center">请先在左侧勾选文件</p>
      </div>
    );
  }

  const activeContent = activeFile ? fileCacheRef.current.get(activeFile) : undefined;
  const activeFileName = activeFile?.split("/").pop() ?? "";
  const activeLang = activeFile ? getLanguage(activeFileName) : "text";

  return (
    <div className="flex flex-col h-full overflow-hidden">
      {/* 顶部状态栏 */}
      <div className="flex items-center gap-2 px-3 py-2 border-b shrink-0">
        <span className="text-xs text-muted-foreground">
          {selectedFiles.length} 个文件已选中
        </span>
        <div className="flex-1" />
        {state.isLoading && <Loader2 className="w-3.5 h-3.5 animate-spin text-muted-foreground" />}
        <div className="flex items-center gap-0.5">
          <Button
            size="sm"
            variant="ghost"
            className="h-6 w-6 p-0"
            onClick={() => setFontSizeIdx((i) => Math.max(0, i - 1))}
            disabled={fontSizeIdx === 0}
            title="缩小字体"
          >
            <ZoomOut className="w-3.5 h-3.5" />
          </Button>
          <span className="text-xs text-muted-foreground w-7 text-center tabular-nums">
            {FONT_SIZES[fontSizeIdx]}
          </span>
          <Button
            size="sm"
            variant="ghost"
            className="h-6 w-6 p-0"
            onClick={() => setFontSizeIdx((i) => Math.min(FONT_SIZES.length - 1, i + 1))}
            disabled={fontSizeIdx === FONT_SIZES.length - 1}
            title="放大字体"
          >
            <ZoomIn className="w-3.5 h-3.5" />
          </Button>
        </div>
      </div>

      {/* 主体：左侧文件列表 + 右侧内容 */}
      <div className="flex flex-1 overflow-hidden">
        {/* 左侧文件导航 */}
        <div className="w-48 shrink-0 border-r overflow-y-auto overflow-x-hidden">
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
                  fontSize: `${FONT_SIZES[fontSizeIdx]}px`,
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

import { useState, useEffect, useCallback, useRef, useMemo } from "react";
import { invoke } from "@tauri-apps/api/core";
import { Loader2, FileText, AlertCircle, ZoomIn, ZoomOut, ArrowDownUp } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useAppContext } from "@/context/AppContext";
import { useExport } from "@/hooks/useExport";
import { getLanguage, getSelectedFileSizes, bytesToTokens } from "@/lib/treeUtils";
import SyntaxHighlighter from "react-syntax-highlighter";
import { atomOneDark, atomOneLight } from "react-syntax-highlighter/dist/esm/styles/hljs";
import { useTheme } from "next-themes";

const FONT_SIZES = [10, 11, 12, 13, 14, 16];
const DEFAULT_FONT_IDX = 1; // 11px

export function PreviewPanel() {
  const { state } = useAppContext();
  const { resolvedTheme } = useTheme();
  const { generatePreview } = useExport();

  // 当前在右侧展示的文件路径
  const [activeFile, setActiveFile] = useState<string | null>(null);
  // 用 ref 存文件内容缓存，避免每次写入都触发重新渲染和 useCallback 重建
  const fileCacheRef = useRef<Map<string, string>>(new Map());
  const [, forceUpdate] = useState(0);
  const [loadingFile, setLoadingFile] = useState(false);
  const [fontSizeIdx, setFontSizeIdx] = useState(DEFAULT_FONT_IDX);
  const [sortBySize, setSortBySize] = useState(false);
  const [viewMode, setViewMode] = useState<"files" | "output">("files");

  // 按大小排序时使用 getSelectedFileSizes（已按 size 降序），否则按路径字母序
  const selectedFileSizes = useMemo(
    () => getSelectedFileSizes(state.rootNodes, state.selectedPaths),
    [state.rootNodes, state.selectedPaths]
  );

  const fileSizeMap = useMemo(
    () => new Map(selectedFileSizes.map((f) => [f.path, f.size])),
    [selectedFileSizes]
  );

  const selectedFiles = useMemo(
    () => sortBySize
      ? selectedFileSizes.map((f) => f.path)
      : Array.from(state.selectedPaths).sort(),
    [sortBySize, selectedFileSizes, state.selectedPaths]
  );

  const isDark = resolvedTheme === "dark";

  // 选择变化时：若 activeFile 已不在选中集合中，重置
  useEffect(() => {
    if (activeFile && !state.selectedPaths.has(activeFile)) {
      setActiveFile(selectedFiles[0] ?? null);
    } else if (!activeFile && selectedFiles.length > 0) {
      setActiveFile(selectedFiles[0]);
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
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
        {/* View mode toggle */}
        <div className="flex items-center rounded-md border overflow-hidden text-xs">
          <button
            onClick={() => setViewMode("files")}
            className={`px-2.5 py-1 transition-colors ${viewMode === "files" ? "bg-primary text-primary-foreground" : "text-muted-foreground hover:bg-accent"}`}
          >
            文件浏览
          </button>
          <button
            onClick={() => setViewMode("output")}
            className={`px-2.5 py-1 transition-colors ${viewMode === "output" ? "bg-primary text-primary-foreground" : "text-muted-foreground hover:bg-accent"}`}
          >
            输出预览
          </button>
        </div>
        <span className="text-xs text-muted-foreground">
          {selectedFiles.length} 个文件已选中
        </span>
        <div className="flex-1" />
        {state.isLoading && <Loader2 className="w-3.5 h-3.5 animate-spin text-muted-foreground" />}
        {viewMode === "files" && (
          <>
            <Button
              size="sm"
              variant={sortBySize ? "secondary" : "ghost"}
              className="h-6 px-2 text-xs gap-1"
              onClick={() => setSortBySize((v) => !v)}
              title={sortBySize ? "当前：按大小排序，点击切换为文件名排序" : "当前：按文件名排序，点击切换为按 token 大小排序"}
            >
              <ArrowDownUp className="w-3 h-3" />
              {sortBySize ? "大小" : "名称"}
            </Button>
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
          </>
        )}
      </div>

      {/* 主体：根据 viewMode 切换 */}
      {viewMode === "files" ? (
        /* 文件浏览：左侧文件列表 + 右侧内容 */
        <div className="flex flex-1 overflow-hidden">
          {/* 左侧文件导航 */}
          <div className="w-48 shrink-0 border-r overflow-y-auto overflow-x-hidden">
            <div className="py-1">
              {selectedFiles.map((path) => {
                const name = path.split("/").pop() ?? path;
                const isActive = path === activeFile;
                const fileSize = fileSizeMap.get(path) ?? 0;
                const fileTokens = bytesToTokens(fileSize);
                const tokenLabel = fileTokens >= 1000
                  ? `${(fileTokens / 1000).toFixed(1)}K`
                  : `${fileTokens}`;
                return (
                  <button
                    key={path}
                    onClick={() => setActiveFile(path)}
                    title={path}
                    className={`w-full text-left flex items-center gap-1 px-2 py-1 text-xs transition-colors rounded-none ${
                      isActive
                        ? "bg-primary/10 text-primary font-medium"
                        : "text-muted-foreground hover:bg-accent hover:text-foreground"
                    }`}
                  >
                    <FileText className="w-3 h-3 shrink-0" />
                    <span className="truncate flex-1">{name}</span>
                    {fileSize > 0 && (
                      <span className="shrink-0 tabular-nums opacity-50 text-[10px]">
                        {tokenLabel}
                      </span>
                    )}
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
      ) : (
        /* 输出预览：combined output view */
        <div className="flex-1 overflow-hidden flex flex-col">
          <div className="flex items-center gap-2 px-3 py-1.5 border-b shrink-0 bg-muted/20">
            {state.previewContent ? (
              <>
                <span className="text-xs text-muted-foreground">
                  {state.previewContent.length.toLocaleString()} 字符 · ~{Math.round(state.previewContent.length / 4).toLocaleString()} tokens
                </span>
                <div className="flex-1" />
                <button
                  onClick={generatePreview}
                  disabled={state.isLoading}
                  className="text-xs text-muted-foreground hover:text-foreground transition-colors disabled:opacity-50"
                >
                  重新生成
                </button>
              </>
            ) : (
              <span className="text-xs text-muted-foreground">尚未生成输出预览</span>
            )}
          </div>
          <div className="flex-1 overflow-auto p-3">
            {state.isLoading ? (
              <div className="flex items-center justify-center h-full">
                <Loader2 className="w-5 h-5 animate-spin text-muted-foreground" />
              </div>
            ) : state.previewContent ? (
              <pre className="text-xs font-mono whitespace-pre-wrap break-words text-foreground/80 leading-relaxed">
                {state.previewContent}
              </pre>
            ) : (
              <div className="flex flex-col items-center justify-center h-full gap-3">
                <p className="text-sm text-muted-foreground">点击生成，预览将发送给 AI 的完整内容</p>
                <button
                  onClick={generatePreview}
                  disabled={state.isLoading}
                  className="px-4 py-2 text-sm bg-primary text-primary-foreground rounded-md hover:bg-primary/90 transition-colors disabled:opacity-50"
                >
                  生成输出预览
                </button>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

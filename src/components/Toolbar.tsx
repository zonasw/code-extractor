import { open } from "@tauri-apps/plugin-dialog";
import { FolderPlus, Download, Loader2, Sun, Moon, Copy, Check, X, HelpCircle, AlertTriangle } from "lucide-react";
import { toast } from "sonner";
import { useState } from "react";
import { useTheme } from "next-themes";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useAppContext } from "@/context/AppContext";
import { useDirectoryTree } from "@/hooks/useDirectoryTree";
import { useExport } from "@/hooks/useExport";
import { useAppConfig } from "@/hooks/useAppConfig";
import { getTotalSelectedSize, formatTokenCount, getSelectedFileSizes, bytesToTokens } from "@/lib/treeUtils";

// 参考上限：100 万 tokens
const TOKEN_LIMIT = 1_000_000;
const WARN_RATIO = 0.75; // 75% 开始变黄/红

export function Toolbar() {
  const { state, dispatch } = useAppContext();
  const { addDirectory } = useDirectoryTree();
  const { exportFiles, generateAndCopy } = useExport();
  const { addLastDirectory } = useAppConfig();
  const { theme, setTheme } = useTheme();
  const [copied, setCopied] = useState(false);

  async function handleAddDirectory() {
    const selected = await open({ directory: true, multiple: false });
    if (typeof selected === "string") {
      try {
        await addDirectory(selected);
        await addLastDirectory(selected);
      } catch {
        toast.error("无法读取目录", { description: selected });
      }
    }
  }

  async function handleExport() {
    try {
      const outputPath = await exportFiles();
      if (outputPath) {
        toast.success("导出成功", { description: outputPath });
      }
    } catch (e) {
      toast.error("导出失败", { description: String(e) });
    }
  }

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

  const selectedCount = state.selectedPaths.size;
  const totalBytes = getTotalSelectedSize(state.rootNodes, state.selectedPaths);
  const tokenEstimate = formatTokenCount(totalBytes);
  const totalTokens = bytesToTokens(totalBytes);
  const tokenRatio = Math.min(totalTokens / TOKEN_LIMIT, 1);
  const isOverWarn = tokenRatio >= WARN_RATIO;

  // 进度条颜色
  const barColor =
    tokenRatio < 0.4 ? "bg-green-500" :
    tokenRatio < WARN_RATIO ? "bg-yellow-400" :
    "bg-red-500";

  function handleRemoveLargest() {
    const files = getSelectedFileSizes(state.rootNodes, state.selectedPaths);
    if (files.length === 0) return;
    const largest = files[0];
    const next = new Set(state.selectedPaths);
    next.delete(largest.path);
    dispatch({ type: "SET_SELECTED_PATHS", payload: next });
    const name = largest.path.split("/").pop() ?? largest.path;
    toast.info(`已移除最大文件`, { description: `${name}（~${formatTokenCount(largest.size)} tokens）` });
  }

  return (
    <div className="flex items-center gap-2 px-4 py-2.5 border-b bg-background shrink-0">
      <Button variant="outline" size="sm" onClick={handleAddDirectory} disabled={state.isLoading}>
        <FolderPlus className="w-4 h-4 mr-1.5" />
        添加目录
      </Button>

      <div className="flex-1" />

      {state.isLoading && (
        <Loader2 className="w-4 h-4 animate-spin text-muted-foreground" />
      )}

      <Select
        value={state.outputFormat}
        onValueChange={(v) => dispatch({ type: "SET_OUTPUT_FORMAT", payload: v as import("@/types").OutputFormat })}
      >
        <SelectTrigger className="h-7 text-xs w-[130px]">
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="plain">纯文本</SelectItem>
          <SelectItem value="markdown">Markdown</SelectItem>
          <SelectItem value="xml">XML (Claude)</SelectItem>
        </SelectContent>
      </Select>

      {selectedCount > 0 && (
        <div
          className="flex flex-col gap-0.5 bg-muted/60 rounded-md px-2.5 py-1 min-w-[130px]"
          title={`${totalTokens.toLocaleString()} / ${TOKEN_LIMIT.toLocaleString()} tokens (${Math.round(tokenRatio * 100)}%)`}
        >
          <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
            {isOverWarn && (
              <AlertTriangle className="w-3 h-3 text-red-500 shrink-0" />
            )}
            <span className="font-medium text-foreground">{selectedCount}</span>
            <span>个文件</span>
            {totalBytes > 0 && (
              <>
                <span className="opacity-40">·</span>
                <span className={`font-medium ${isOverWarn ? "text-red-500" : "text-foreground"}`}>
                  {tokenEstimate}
                </span>
                <span>tokens</span>
              </>
            )}
          </div>
          {totalBytes > 0 && (
            <div className="h-1 w-full bg-muted rounded-full overflow-hidden">
              <div
                className={`h-full rounded-full transition-all duration-300 ${barColor}`}
                style={{ width: `${tokenRatio * 100}%` }}
              />
            </div>
          )}
        </div>
      )}

      {selectedCount > 0 && isOverWarn && (
        <Button
          size="sm"
          variant="outline"
          onClick={handleRemoveLargest}
          className="h-7 px-2 text-xs text-red-500 border-red-200 hover:bg-red-50 hover:text-red-600 dark:border-red-900 dark:hover:bg-red-950"
          title="移除 token 占用最多的文件"
        >
          移除最大文件
        </Button>
      )}

      {selectedCount > 0 && (
        <Button
          size="sm"
          variant="ghost"
          onClick={() => dispatch({ type: "SET_SELECTED_PATHS", payload: new Set() })}
          className="h-7 px-2 text-xs text-muted-foreground hover:text-destructive"
          title="清空选择"
        >
          <X className="w-3.5 h-3.5" />
        </Button>
      )}

      <Button
        size="sm"
        variant="outline"
        onClick={handleCopy}
        disabled={selectedCount === 0 || state.isLoading}
      >
        {copied ? (
          <Check className="w-4 h-4 mr-1.5 text-green-500" />
        ) : (
          <Copy className="w-4 h-4 mr-1.5" />
        )}
        {copied ? "已复制" : "复制"}
      </Button>

      <Button
        size="sm"
        onClick={handleExport}
        disabled={selectedCount === 0 || state.isLoading}
      >
        <Download className="w-4 h-4 mr-1.5" />
        导出
      </Button>

      <Button
        size="sm"
        variant="ghost"
        onClick={() => dispatch({ type: "SET_SHOW_SHORTCUTS", payload: true })}
        className="w-8 h-8 p-0"
        title="快捷键帮助 (?)"
      >
        <HelpCircle className="w-4 h-4" />
      </Button>

      <Button
        size="sm"
        variant="ghost"
        onClick={() => setTheme(theme === "dark" ? "light" : "dark")}
        className="w-8 h-8 p-0"
        title="切换主题"
      >
        {theme === "dark" ? (
          <Sun className="w-4 h-4" />
        ) : (
          <Moon className="w-4 h-4" />
        )}
      </Button>
    </div>
  );
}

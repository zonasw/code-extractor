import { useState } from "react";
import { Eye, Loader2, Copy, Check } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { useAppContext } from "@/context/AppContext";
import { useExport } from "@/hooks/useExport";

const PREVIEW_LIMIT = 500_000;

export function PreviewPanel() {
  const { state } = useAppContext();
  const { generatePreview } = useExport();
  const [copied, setCopied] = useState(false);

  const preview = state.previewContent;
  const isTruncated = preview !== null && preview.length > PREVIEW_LIMIT;
  const displayContent = preview ? preview.slice(0, PREVIEW_LIMIT) : null;

  const selectedCount = state.selectedPaths.size;
  const charCount = preview?.length ?? 0;

  async function handleCopy() {
    if (!preview) return;
    try {
      await navigator.clipboard.writeText(preview);
      setCopied(true);
      toast.success("已复制到剪贴板", {
        description: `${formatCount(charCount)} 个字符`,
      });
      setTimeout(() => setCopied(false), 2000);
    } catch {
      toast.error("复制失败");
    }
  }

  return (
    <div className="flex flex-col h-full overflow-hidden">
      {/* 工具栏 */}
      <div className="flex items-center gap-2 px-4 py-2 border-b shrink-0">
        <Button
          size="sm"
          variant="outline"
          onClick={generatePreview}
          disabled={selectedCount === 0 || state.isLoading}
        >
          {state.isLoading ? (
            <Loader2 className="w-3.5 h-3.5 mr-1.5 animate-spin" />
          ) : (
            <Eye className="w-3.5 h-3.5 mr-1.5" />
          )}
          生成预览
        </Button>

        {preview && (
          <Button
            size="sm"
            variant="outline"
            onClick={handleCopy}
            disabled={state.isLoading}
          >
            {copied ? (
              <Check className="w-3.5 h-3.5 mr-1.5 text-green-500" />
            ) : (
              <Copy className="w-3.5 h-3.5 mr-1.5" />
            )}
            {copied ? "已复制" : "复制"}
          </Button>
        )}

        {preview && (
          <span className="ml-auto text-xs text-muted-foreground">
            {selectedCount} 个文件 · {formatCount(charCount)} 字符
          </span>
        )}
      </div>

      {/* 截断提示 */}
      {isTruncated && (
        <div className="px-4 py-1.5 bg-yellow-50 dark:bg-yellow-900/20 border-b text-xs text-yellow-700 dark:text-yellow-400 shrink-0">
          预览已截断（超过 50 万字符），复制和导出仍为完整内容。
        </div>
      )}

      {/* 内容区：用原生 overflow-auto 代替 ScrollArea 确保滚动可靠 */}
      <div className="flex-1 overflow-auto">
        {displayContent ? (
          <pre className="p-4 text-xs font-mono whitespace-pre-wrap break-all leading-relaxed">
            {displayContent}
          </pre>
        ) : (
          <div className="flex flex-col items-center justify-center h-full text-muted-foreground gap-3 p-8">
            <Eye className="w-10 h-10 opacity-30" />
            <p className="text-sm text-center">
              {selectedCount === 0
                ? "请先在左侧勾选文件"
                : '点击"生成预览"查看内容'}
            </p>
          </div>
        )}
      </div>
    </div>
  );
}

function formatCount(n: number): string {
  if (n < 1000) return String(n);
  if (n < 1_000_000) return `${(n / 1000).toFixed(1)}K`;
  return `${(n / 1_000_000).toFixed(2)}M`;
}

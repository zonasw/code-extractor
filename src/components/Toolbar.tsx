import { open } from "@tauri-apps/plugin-dialog";
import { FolderPlus, Download, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { useAppContext } from "@/context/AppContext";
import { useDirectoryTree } from "@/hooks/useDirectoryTree";
import { useExport } from "@/hooks/useExport";
import { useAppConfig } from "@/hooks/useAppConfig";

export function Toolbar() {
  const { state } = useAppContext();
  const { addDirectory } = useDirectoryTree();
  const { exportFiles } = useExport();
  const { addLastDirectory } = useAppConfig();

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

  const selectedCount = state.selectedPaths.size;

  return (
    <div className="flex items-center gap-3 px-4 py-3 border-b bg-background">
      <Button variant="outline" size="sm" onClick={handleAddDirectory} disabled={state.isLoading}>
        <FolderPlus className="w-4 h-4 mr-2" />
        添加目录
      </Button>

      <div className="flex-1" />

      {state.isLoading && <Loader2 className="w-4 h-4 animate-spin text-muted-foreground" />}

      <span className="text-sm text-muted-foreground">
        已选 {selectedCount} 个文件
      </span>

      <Button
        size="sm"
        onClick={handleExport}
        disabled={selectedCount === 0 || state.isLoading}
      >
        <Download className="w-4 h-4 mr-2" />
        导出
      </Button>
    </div>
  );
}

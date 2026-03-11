import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Download, RefreshCw } from "lucide-react";
import type { Update } from "@tauri-apps/plugin-updater";

interface UpdateDialogProps {
  update: Update;
  isInstalling: boolean;
  downloadProgress: number | null;
  onInstall: () => void;
  onDismiss: () => void;
}

export function UpdateDialog({ update, isInstalling, downloadProgress, onInstall, onDismiss }: UpdateDialogProps) {
  const isDownloading = isInstalling && downloadProgress !== null && downloadProgress < 100;
  const isDone = isInstalling && downloadProgress === 100;

  return (
    <Dialog open onOpenChange={(open) => { if (!open && !isInstalling) onDismiss(); }}>
      <DialogContent className="max-w-sm">
        <DialogHeader>
          <DialogTitle>发现新版本</DialogTitle>
          <DialogDescription>
            新版本 <span className="font-semibold text-foreground">{update.version}</span> 可用，是否立即安装？
          </DialogDescription>
        </DialogHeader>

        {update.body && (
          <div className="text-sm text-muted-foreground bg-muted/50 rounded-md px-3 py-2 max-h-32 overflow-y-auto whitespace-pre-wrap">
            {update.body}
          </div>
        )}

        {isInstalling && (
          <div className="flex flex-col gap-1.5">
            <div className="flex items-center justify-between text-xs text-muted-foreground">
              <span>{isDone ? "安装完成，即将重启…" : "正在下载…"}</span>
              {downloadProgress !== null && <span>{downloadProgress}%</span>}
            </div>
            <div className="h-1.5 w-full bg-muted rounded-full overflow-hidden">
              <div
                className="h-full bg-primary rounded-full transition-all duration-300"
                style={{ width: `${downloadProgress ?? 0}%` }}
              />
            </div>
          </div>
        )}

        <DialogFooter className="gap-2">
          <Button
            variant="ghost"
            size="sm"
            onClick={onDismiss}
            disabled={isInstalling}
          >
            稍后提醒
          </Button>
          <Button
            size="sm"
            onClick={onInstall}
            disabled={isInstalling}
          >
            {isDownloading ? (
              <><RefreshCw className="w-4 h-4 mr-1.5 animate-spin" />下载中…</>
            ) : (
              <><Download className="w-4 h-4 mr-1.5" />安装并重启</>
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

interface ShortcutHelpModalProps {
  open: boolean;
  onClose: () => void;
}

const shortcuts = [
  { key: "F5", desc: "刷新所有目录" },
  { key: "Ctrl+Shift+C", desc: "复制全部选中文件" },
  { key: "Ctrl+Shift+E", desc: "导出到文件" },
  { key: "?", desc: "显示快捷键帮助" },
  { key: "Escape", desc: "清除搜索框" },
];

export function ShortcutHelpModal({ open, onClose }: ShortcutHelpModalProps) {
  return (
    <Dialog open={open} onOpenChange={(v) => !v && onClose()}>
      <DialogContent className="max-w-sm">
        <DialogHeader>
          <DialogTitle>快捷键</DialogTitle>
        </DialogHeader>
        <table className="w-full text-sm">
          <tbody>
            {shortcuts.map(({ key, desc }) => (
              <tr key={key} className="border-b last:border-0">
                <td className="py-2 pr-4">
                  <kbd className="px-2 py-0.5 text-xs font-mono bg-muted border border-border rounded">
                    {key}
                  </kbd>
                </td>
                <td className="py-2 text-muted-foreground">{desc}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </DialogContent>
    </Dialog>
  );
}

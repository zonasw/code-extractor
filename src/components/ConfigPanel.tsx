import { useState } from "react";
import { X, RefreshCw, Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { useAppContext } from "@/context/AppContext";
import { useAppConfig } from "@/hooks/useAppConfig";
import { useDirectoryTree } from "@/hooks/useDirectoryTree";

export function ConfigPanel() {
  const { state } = useAppContext();
  const { updateIgnoreList, updateExtensionFilter } = useAppConfig();
  const { refreshDirectory } = useDirectoryTree();

  async function refreshAll() {
    await Promise.allSettled(
      state.rootNodes.map((n) => refreshDirectory(n.path))
    );
  }
  const [newIgnore, setNewIgnore] = useState("");
  const [newExt, setNewExt] = useState("");

  function addIgnore() {
    const v = newIgnore.trim();
    if (v && !state.config.ignore_list.includes(v)) {
      updateIgnoreList([...state.config.ignore_list, v]);
      setNewIgnore("");
    }
  }

  function removeIgnore(item: string) {
    updateIgnoreList(state.config.ignore_list.filter((i) => i !== item));
  }

  function addExt() {
    const v = newExt.trim().replace(/^\./, "");
    if (v && !state.config.extension_filter.includes(v)) {
      updateExtensionFilter([...state.config.extension_filter, v]);
      setNewExt("");
    }
  }

  function removeExt(item: string) {
    updateExtensionFilter(state.config.extension_filter.filter((i) => i !== item));
  }

  return (
    <div className="p-4 space-y-5 overflow-auto h-full">
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-semibold">配置</h3>
        <Button
          variant="outline"
          size="sm"
          onClick={refreshAll}
          disabled={state.rootNodes.length === 0 || state.isLoading}
        >
          <RefreshCw className="w-3.5 h-3.5 mr-1.5" />
          刷新全部
        </Button>
      </div>

      <Separator />

      <div className="space-y-2">
        <p className="text-sm font-medium">忽略列表</p>
        <div className="flex flex-wrap gap-1.5 min-h-8">
          {state.config.ignore_list.map((item) => (
            <Badge key={item} variant="secondary" className="gap-1 pr-1">
              {item}
              <button
                onClick={() => removeIgnore(item)}
                className="hover:text-destructive"
              >
                <X className="w-3 h-3" />
              </button>
            </Badge>
          ))}
        </div>
        <div className="flex gap-2">
          <Input
            value={newIgnore}
            onChange={(e) => setNewIgnore(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && addIgnore()}
            placeholder="添加忽略目录..."
            className="h-7 text-sm"
          />
          <Button size="sm" variant="outline" onClick={addIgnore} className="h-7 px-2">
            <Plus className="w-3.5 h-3.5" />
          </Button>
        </div>
      </div>

      <Separator />

      <div className="space-y-2">
        <p className="text-sm font-medium">
          扩展名过滤{" "}
          <span className="text-xs text-muted-foreground font-normal">
            (空 = 包含所有)
          </span>
        </p>
        <div className="flex flex-wrap gap-1.5 min-h-8">
          {state.config.extension_filter.map((item) => (
            <Badge key={item} variant="outline" className="gap-1 pr-1">
              .{item}
              <button
                onClick={() => removeExt(item)}
                className="hover:text-destructive"
              >
                <X className="w-3 h-3" />
              </button>
            </Badge>
          ))}
          {state.config.extension_filter.length === 0 && (
            <span className="text-xs text-muted-foreground">包含所有类型</span>
          )}
        </div>
        <div className="flex gap-2">
          <Input
            value={newExt}
            onChange={(e) => setNewExt(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && addExt()}
            placeholder="如: ts, tsx, py..."
            className="h-7 text-sm"
          />
          <Button size="sm" variant="outline" onClick={addExt} className="h-7 px-2">
            <Plus className="w-3.5 h-3.5" />
          </Button>
        </div>
      </div>
    </div>
  );
}

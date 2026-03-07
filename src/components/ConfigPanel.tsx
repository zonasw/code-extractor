import { useState, useEffect } from "react";
import { X, RefreshCw, Plus, Save, Play, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Textarea } from "@/components/ui/textarea";
import { useAppContext } from "@/context/AppContext";
import { useAppConfig } from "@/hooks/useAppConfig";
import { useDirectoryTree } from "@/hooks/useDirectoryTree";
import { usePresets } from "@/hooks/usePresets";

export function ConfigPanel() {
  const { state } = useAppContext();
  const { updateIgnoreList, updateExtensionFilter, updatePromptPrefix, updatePromptSuffix } = useAppConfig();
  const { refreshDirectory } = useDirectoryTree();
  const { presets, saveCurrentAsPreset, loadPreset, deletePreset } = usePresets();

  async function refreshAll() {
    await Promise.allSettled(
      state.rootNodes.map((n) => refreshDirectory(n.path))
    );
  }
  const [newIgnore, setNewIgnore] = useState("");
  const [newExt, setNewExt] = useState("");
  const [prefixLocal, setPrefixLocal] = useState(state.config.prompt_prefix);
  const [suffixLocal, setSuffixLocal] = useState(state.config.prompt_suffix);
  const [newPresetName, setNewPresetName] = useState("");

  // 异步加载 config 后同步本地 state（仅在非编辑状态下更新）
  useEffect(() => {
    setPrefixLocal(state.config.prompt_prefix);
  }, [state.config.prompt_prefix]);

  useEffect(() => {
    setSuffixLocal(state.config.prompt_suffix);
  }, [state.config.prompt_suffix]);

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

      <Separator />

      <div className="space-y-3">
        <p className="text-sm font-medium">提示词模板</p>
        <div className="space-y-1.5">
          <p className="text-xs text-muted-foreground">前缀（添加到输出最前面）</p>
          <Textarea
            value={prefixLocal}
            onChange={(e) => setPrefixLocal(e.target.value)}
            onBlur={() => updatePromptPrefix(prefixLocal)}
            placeholder="例：请仔细阅读以下代码..."
            className="text-xs resize-none h-20"
          />
        </div>
        <div className="space-y-1.5">
          <p className="text-xs text-muted-foreground">后缀（添加到输出最后面）</p>
          <Textarea
            value={suffixLocal}
            onChange={(e) => setSuffixLocal(e.target.value)}
            onBlur={() => updatePromptSuffix(suffixLocal)}
            placeholder="例：请重点关注..."
            className="text-xs resize-none h-20"
          />
        </div>
      </div>

      <Separator />

      <div className="space-y-3">
        <p className="text-sm font-medium">预设模板</p>
        <div className="flex gap-2">
          <Input
            value={newPresetName}
            onChange={(e) => setNewPresetName(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && newPresetName.trim() && (saveCurrentAsPreset(newPresetName.trim()), setNewPresetName(""))}
            placeholder="预设名称..."
            className="h-7 text-sm"
          />
          <Button
            size="sm"
            variant="outline"
            onClick={() => { if (newPresetName.trim()) { saveCurrentAsPreset(newPresetName.trim()); setNewPresetName(""); } }}
            className="h-7 px-2"
            disabled={!newPresetName.trim() || state.selectedPaths.size === 0}
            title="保存当前选择为预设"
          >
            <Save className="w-3.5 h-3.5" />
          </Button>
        </div>
        <div className="space-y-1">
          {presets.length === 0 && (
            <p className="text-xs text-muted-foreground">暂无预设，选中文件后保存</p>
          )}
          {presets.map((preset) => (
            <div key={preset.id} className="flex items-center gap-1.5 px-2 py-1.5 rounded-md border bg-muted/30">
              <span className="text-xs flex-1 truncate" title={preset.name}>{preset.name}</span>
              <span className="text-xs text-muted-foreground shrink-0">{preset.paths.length} 个文件</span>
              <button
                onClick={() => loadPreset(preset)}
                className="p-0.5 rounded hover:bg-accent text-muted-foreground hover:text-foreground"
                title="载入预设"
              >
                <Play className="w-3 h-3" />
              </button>
              <button
                onClick={() => deletePreset(preset.id)}
                className="p-0.5 rounded hover:bg-accent text-muted-foreground hover:text-destructive"
                title="删除预设"
              >
                <Trash2 className="w-3 h-3" />
              </button>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

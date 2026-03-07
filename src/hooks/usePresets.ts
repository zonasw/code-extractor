import { useState, useEffect } from "react";
import { invoke } from "@tauri-apps/api/core";
import { toast } from "sonner";
import { useAppContext } from "@/context/AppContext";
import { SelectionPreset } from "@/types";
import { collectAllLeaves } from "@/lib/treeUtils";

export function usePresets() {
  const { state, dispatch } = useAppContext();
  const [presets, setPresets] = useState<SelectionPreset[]>([]);

  useEffect(() => {
    loadPresets();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function loadPresets() {
    try {
      const raw = await invoke<SelectionPreset[]>("get_selection_presets");
      setPresets(Array.isArray(raw) ? raw : []);
    } catch {
      setPresets([]);
    }
  }

  async function persistPresets(next: SelectionPreset[]) {
    try {
      await invoke("save_selection_presets", { presets: next });
    } catch {
      // silent
    }
    setPresets(next);
  }

  function saveCurrentAsPreset(name: string) {
    const paths = Array.from(state.selectedPaths);
    if (paths.length === 0) {
      toast.error("请先选择文件");
      return;
    }
    const preset: SelectionPreset = {
      id: `${Date.now()}-${Math.random().toString(36).slice(2)}`,
      name,
      paths,
      createdAt: Date.now(),
    };
    persistPresets([...presets, preset]);
    toast.success(`预设"${name}"已保存`, { description: `${paths.length} 个文件` });
  }

  function loadPreset(preset: SelectionPreset) {
    // Cross-check against current tree leaves
    const allLeaves = new Set(state.rootNodes.flatMap(collectAllLeaves));
    const valid = preset.paths.filter((p) => allLeaves.has(p));
    const skipped = preset.paths.length - valid.length;

    dispatch({ type: "SET_SELECTED_PATHS", payload: new Set(valid) });

    if (skipped > 0) {
      toast.success(`已载入预设"${preset.name}"`, {
        description: `已跳过 ${skipped} 个不存在的文件`,
      });
    } else {
      toast.success(`已载入预设"${preset.name}"`, {
        description: `${valid.length} 个文件`,
      });
    }
  }

  function deletePreset(id: string) {
    persistPresets(presets.filter((p) => p.id !== id));
  }

  return { presets, saveCurrentAsPreset, loadPreset, deletePreset };
}

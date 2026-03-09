import { useState, useEffect } from "react";
import { invoke } from "@tauri-apps/api/core";
import { Plus, FolderGit2, Globe, Pencil, Trash2, X, Check } from "lucide-react";
import { Skill } from "@/types/agent";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";

interface AgentSkillPickerProps {
  workingDir: string;
  onInsert: (content: string) => void;
}

export function AgentSkillPicker({ workingDir, onInsert }: AgentSkillPickerProps) {
  const [skills, setSkills] = useState<Skill[]>([]);
  const [editing, setEditing] = useState<Skill | null>(null);
  const [creating, setCreating] = useState(false);
  const [newName, setNewName] = useState("");
  const [newContent, setNewContent] = useState("");
  const [newScope, setNewScope] = useState<"global" | "project">("global");
  const [deleteConfirm, setDeleteConfirm] = useState<string | null>(null);
  const [tooltip, setTooltip] = useState<string | null>(null);

  async function reload() {
    try {
      const list = await invoke<{
        name: string; description: string; content: string; path: string; is_project: boolean;
      }[]>("list_skills", { workingDir: workingDir || undefined });
      setSkills(list.map((s) => ({
        name: s.name,
        description: s.description,
        content: s.content,
        path: s.path,
        isProject: s.is_project,
      })));
    } catch {
      setSkills([]);
    }
  }

  useEffect(() => {
    reload();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [workingDir]);

  async function handleSave() {
    if (!newName.trim() || !newContent.trim()) return;
    try {
      await invoke("save_skill", {
        name: newName.trim(),
        content: newContent,
        scope: newScope,
        workingDir: newScope === "project" ? workingDir : undefined,
      });
      setCreating(false);
      setNewName("");
      setNewContent("");
      await reload();
    } catch (e) {
      alert(String(e));
    }
  }

  async function handleUpdate() {
    if (!editing) return;
    try {
      // Determine scope from path
      const scope = editing.isProject ? "project" : "global";
      await invoke("save_skill", {
        name: editing.name,
        content: editing.content,
        scope,
        workingDir: scope === "project" ? workingDir : undefined,
      });
      setEditing(null);
      await reload();
    } catch (e) {
      alert(String(e));
    }
  }

  async function handleDelete(skill: Skill) {
    if (deleteConfirm !== skill.path) {
      setDeleteConfirm(skill.path);
      return;
    }
    try {
      await invoke("delete_skill", { path: skill.path });
      setDeleteConfirm(null);
      await reload();
    } catch (e) {
      alert(String(e));
    }
  }

  // If editing a skill
  if (editing) {
    return (
      <div className="flex flex-col gap-2 p-2 border-t bg-muted/10">
        <div className="flex items-center gap-2 text-xs font-medium">
          <Pencil className="w-3 h-3" />
          编辑技能：{editing.name}
          <button className="ml-auto text-muted-foreground hover:text-foreground" onClick={() => setEditing(null)}>
            <X className="w-3.5 h-3.5" />
          </button>
        </div>
        <Textarea
          value={editing.content}
          onChange={(e) => setEditing({ ...editing, content: e.target.value })}
          className="min-h-[100px] max-h-[200px] resize-none text-xs font-mono"
          placeholder="技能内容（Markdown 模板）..."
        />
        <div className="flex gap-1.5">
          <Button size="sm" className="h-6 text-xs px-2" onClick={handleUpdate}>
            <Check className="w-3 h-3 mr-1" />保存
          </Button>
          <Button size="sm" variant="ghost" className="h-6 text-xs px-2" onClick={() => setEditing(null)}>
            取消
          </Button>
        </div>
      </div>
    );
  }

  // If creating a new skill
  if (creating) {
    return (
      <div className="flex flex-col gap-2 p-2 border-t bg-muted/10">
        <div className="flex items-center gap-2 text-xs font-medium">
          <Plus className="w-3 h-3" />
          新建技能
          <button className="ml-auto text-muted-foreground hover:text-foreground" onClick={() => setCreating(false)}>
            <X className="w-3.5 h-3.5" />
          </button>
        </div>

        <input
          className="h-7 px-2 text-xs rounded border border-input bg-background focus:outline-none focus:ring-1 focus:ring-ring"
          placeholder="技能名称（如：fix-bug）"
          value={newName}
          onChange={(e) => setNewName(e.target.value)}
        />

        <Textarea
          value={newContent}
          onChange={(e) => setNewContent(e.target.value)}
          className="min-h-[80px] max-h-[160px] resize-none text-xs font-mono"
          placeholder="技能模板内容，支持 Markdown..."
        />

        <div className="flex items-center gap-2">
          <div className="flex gap-1 text-xs">
            {(["global", "project"] as const).map((s) => (
              <button
                key={s}
                onClick={() => setNewScope(s)}
                className={`px-2 py-0.5 rounded border transition-colors ${
                  newScope === s
                    ? "bg-primary/10 border-primary/30 text-primary"
                    : "border-border text-muted-foreground hover:text-foreground"
                }`}
              >
                {s === "global" ? "全局" : "项目"}
              </button>
            ))}
          </div>
          <div className="ml-auto flex gap-1.5">
            <Button size="sm" className="h-6 text-xs px-2" onClick={handleSave}>
              <Check className="w-3 h-3 mr-1" />创建
            </Button>
            <Button size="sm" variant="ghost" className="h-6 text-xs px-2" onClick={() => setCreating(false)}>
              取消
            </Button>
          </div>
        </div>
      </div>
    );
  }

  // Normal picker view
  return (
    <div className="border-t">
      {/* Header */}
      <div className="flex items-center gap-1.5 px-3 py-1.5 text-xs text-muted-foreground">
        <span className="font-medium text-foreground/70">技能</span>
        <span className="text-muted-foreground/50">({skills.length})</span>
        <button
          className="ml-auto flex items-center gap-1 hover:text-foreground transition-colors"
          onClick={() => setCreating(true)}
          title="新建技能"
        >
          <Plus className="w-3 h-3" />
          <span>新建</span>
        </button>
      </div>

      {skills.length === 0 ? (
        <div className="px-3 pb-2 text-xs text-muted-foreground/50">
          未找到技能。在 ~/.claude/commands/ 创建 .md 文件即可添加。
        </div>
      ) : (
        <div className="px-2 pb-2 flex flex-wrap gap-1">
          {skills.map((skill) => (
            <div
              key={skill.path}
              className="group relative flex items-center"
              onMouseEnter={() => setTooltip(skill.path)}
              onMouseLeave={() => { setTooltip(null); setDeleteConfirm(null); }}
            >
              <button
                className="flex items-center gap-1 px-2 py-0.5 rounded border border-border text-xs hover:bg-primary/10 hover:border-primary/30 hover:text-primary transition-colors"
                onClick={() => onInsert(skill.content)}
                title={skill.description || skill.name}
              >
                {skill.isProject ? (
                  <FolderGit2 className="w-2.5 h-2.5 shrink-0 text-blue-400" />
                ) : (
                  <Globe className="w-2.5 h-2.5 shrink-0 text-muted-foreground/60" />
                )}
                <span>{skill.name}</span>
              </button>

              {/* Inline edit/delete on hover */}
              {tooltip === skill.path && (
                <div className="flex items-center gap-0.5 ml-0.5">
                  <button
                    className="p-0.5 rounded hover:bg-muted text-muted-foreground hover:text-foreground transition-colors"
                    title="编辑"
                    onClick={() => setEditing(skill)}
                  >
                    <Pencil className="w-2.5 h-2.5" />
                  </button>
                  <button
                    className={`p-0.5 rounded transition-colors ${
                      deleteConfirm === skill.path
                        ? "bg-destructive/10 text-destructive"
                        : "hover:bg-destructive/10 text-muted-foreground hover:text-destructive"
                    }`}
                    title={deleteConfirm === skill.path ? "再次点击确认删除" : "删除"}
                    onClick={() => handleDelete(skill)}
                  >
                    <Trash2 className="w-2.5 h-2.5" />
                  </button>
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

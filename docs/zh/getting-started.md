# 快速上手 CodeExtractor

这份指南适合所有人——无论你是开发、测试还是产品，5 分钟内完成安装并跑通第一个任务。

---

## 安装

### 方式 A：下载 Release（推荐）

1. 打开 [GitHub Releases](https://github.com/zonasw/code-extractor/releases) 页面。
2. 根据你的操作系统下载对应安装包：
   - macOS：`.dmg`
   - Windows：`.msi`
   - Linux：`.AppImage`
3. 打开安装包，按照系统提示完成安装。

::: tip macOS 提示
如果 macOS 在首次启动时提示"无法打开，因为无法验证开发者"，前往 **系统设置 > 隐私与安全性**，点击 **仍要打开** 即可。
:::

### 方式 B：从源码构建

**环境要求：** Node.js 18+、Rust 1.75+（稳定版）、以及对应平台的 [Tauri 系统依赖](https://tauri.app/start/prerequisites/)。

```bash
# 先安装 Tauri 前置依赖（见上方链接）

git clone https://github.com/zonasw/code-extractor.git
cd code-extractor
npm install
npm run tauri build
```

构建产物位于 `src-tauri/target/release/bundle/` 目录。

---

## 前置条件：配置 Claude CLI

如果你打算使用 **Agent 模式**（让 AI 直接在项目里写代码），需要额外完成以下步骤。纯代码提取功能不需要这些。

**第一步：安装 claude CLI**

```bash
npm install -g @anthropic-ai/claude-code
# 验证安装：
claude --version
```

**第二步：获取 API Key**

根据你使用的服务选择一种：

| Provider | 获取地址 | Key 格式 |
|---|---|---|
| Anthropic 直连 | [console.anthropic.com](https://console.anthropic.com) | `sk-ant-...` |
| OpenRouter | [openrouter.ai/keys](https://openrouter.ai/keys) | `sk-or-...` |
| 自定义端点 | 参考你的服务商文档 | — |

::: info
OpenRouter 支持通过一个 Key 调用多种模型（包括 Claude），适合想控制费用的用户。
:::

---

## 首次启动

打开 CodeExtractor，你会看到一个**双面板布局**：

- **左侧面板** — 目录树、搜索栏、token 计数器
- **右侧面板** — 标签页（预览 / 配置 / Agent）

应用启动时是空的，第一步是加载一个项目目录。

**加载项目目录：**

- 点击左侧面板顶部的 **打开目录** 按钮，或者
- 直接把文件夹从 Finder / 资源管理器**拖放**到左侧面板。

目录树会立即展开，`.gitignore` 中排除的文件自动隐藏。你可以同时加载多个目录，它们会作为独立的根节点显示。

---

## 界面说明

### 左侧面板

| 元素 | 作用 |
|---|---|
| 目录树 | 浏览文件和文件夹；点击复选框选中文件 |
| 搜索栏 | 按文件名过滤目录树，支持 Glob 模式（如 `*.ts`、`src/**/*.tsx`） |
| Token 计数器 | 实时显示已选文件的预估 token 数；进度条接近 100 万上限时变红 |
| 工具栏图标 | 打开目录、刷新（F5）、展开/折叠全部、反选 |

### 右侧面板标签

| 标签 | 用途 |
|---|---|
| **预览** | 实时预览将要复制/导出的内容，带语法高亮 |
| **配置** | 设置输出格式（纯文本 / Markdown / XML）、提示词模板、选择预设 |
| **Agent** | 运行 Claude CLI Agent，让 AI 直接在你的代码库中工作 |

---

## 第一次代码提取

这个工作流适合把代码粘贴到 Claude.ai、ChatGPT 或其他 AI 对话界面使用。

**步骤 1 — 加载目录**

按上述方法把项目文件夹加载进来。

**步骤 2 — 选择文件**

在目录树中勾选你想包含的文件或文件夹。

要快速选中所有 TypeScript 文件，在搜索栏输入 `*.ts`，目录树会过滤为匹配文件，再点击根节点复选框全选。

::: tip Token 参考值
- 100K 以内：大多数模型的最佳响应区间
- 200K 以内：可以使用，但响应稍慢
- 超过 500K：注意留 20% 余量，避免超过模型上下文限制
:::

**步骤 3 — 选择输出格式**

打开 **配置** 标签，选择格式：

- **XML** — 最适合 Claude；每个文件用 `<file path="...">` 标签包裹，结构清晰
- **Markdown** — 通用格式，带代码块围栏，适合大多数 AI 工具
- **纯文本** — 极简格式，只有文件路径和原始内容

**步骤 4 — 添加提示词模板（可选）**

在配置标签的"提示词模板"区域，选择内置模板（安全审查、性能优化、找 Bug）或填写自定义前缀。模板文本会自动追加到导出内容的头部。

**步骤 5 — 复制或导出**

- 按 `Ctrl+Shift+C` 复制到剪贴板，然后粘贴到 AI 对话框
- 按 `Ctrl+Shift+E` 导出为 `.txt` 或 `.md` 文件

---

## 第一次 Agent 运行

Agent 模式会把 `claude` CLI 作为子进程运行，让它直接读取和修改你机器上的文件。在此之前请确认已完成上面的[前置条件](#前置条件配置-claude-cli)。

**步骤 1 — 填入 API Key**

切到 **配置** 标签，在 "API Key" 输入框中填入你的密钥，并根据使用的服务填写 Base URL（Anthropic 直连可留空）。

**步骤 2 — 选择上下文文件（可选）**

在左侧面板勾选与任务直接相关的文件。这些文件将作为 Agent 的初始上下文。

**步骤 3 — 切到 Agent 标签**

点击右侧面板的 **Agent** 标签。顶部会显示当前 git 分支——确认你在正确的分支上。

**步骤 4 — 输入任务，点击运行**

在任务输入框里用自然语言描述你要做什么，然后按 **⌘+Enter**（macOS）或点击运行按钮。

```
在 src/api/users.ts 的 createUser 函数里加上邮箱格式验证（用正则），
name 字段改为必填。如果验证失败，抛出带有清晰错误信息的 ValidationError。
```

**步骤 5 — 观察 Agent 工作**

右侧面板会实时流式显示 Agent 的工具调用：Read、Write、Edit、Bash、Glob、Grep——每一步都是一个可展开的卡片，你能看到它在读哪些文件、写了什么。

**步骤 6 — 查看 Diff**

任务完成后，unified diff 查看器会列出所有被修改的文件。展开任意文件查看具体的增删行。

- 改动符合预期 → 直接 `git commit`
- 不满意 → 点击 **Revert** 一键还原（执行 `git restore .`），修改 prompt 后重新运行

---

## 常见问题

### "找不到 claude CLI"

Agent 标签提示找不到 `claude` 可执行文件，说明它不在 PATH 中。

```bash
npm install -g @anthropic-ai/claude-code
# 验证：
claude --version
```

::: warning macOS / nvm 用户注意
如果你用 nvm 或 fnm 管理 Node.js，GUI 应用启动时可能不继承 shell 的 PATH。需要把 nvm 初始化脚本加到 `~/.zprofile`（而不只是 `~/.zshrc`），这样图形应用也能找到 `claude`。
:::

### "API Key 无效" 或鉴权失败

- 检查密钥有没有多余的空格或换行
- Anthropic Key 应以 `sk-ant-` 开头
- OpenRouter Key 应以 `sk-or-` 开头，并确认 Base URL 填写的是 `https://openrouter.ai/api/v1`
- 检查账户余额 / 配额是否充足

### "端口 1420 被占用"

CodeExtractor 开发模式下使用 1420 端口。如果你同时开着开发服务器，可能发生冲突。关闭占用该端口的进程，或用生产包替代开发模式运行。

### Token 数量异常高

Token 计数器使用快速估算（约每 4 个字符 1 个 token），和 API 实际计费略有差异。如果数字很高，检查是否误选了大型二进制文件或自动生成的文件（如 `package-lock.json`、`dist/`）——这些通常应该被 `.gitignore` 排除。

::: info
在 token 计数器旁边，进度条颜色会提示你当前状态：绿色（安全）、黄色（注意）、红色（接近上限）。
:::

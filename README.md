# CodeExtractor

[![Tauri 2](https://img.shields.io/badge/Tauri-2-24C8D8?logo=tauri)](https://tauri.app)
[![React 19](https://img.shields.io/badge/React-19-61DAFB?logo=react)](https://react.dev)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.8-3178C6?logo=typescript)](https://www.typescriptlang.org)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](LICENSE)

**面向 AI 的本地代码上下文提取工具 + Claude Agent 运行环境。**

CodeExtractor 将两个工作流合二为一：**代码上下文提取器**（把本地文件打包成 AI 可读格式）和**本地 AI Agent**（基于 Claude CLI，可直接读写、重构你的代码）。

---

## 功能概览

### 代码上下文提取

将本地代码库转换为结构化上下文，直接喂给 AI 模型。

- **目录树浏览器** — 逐个或批量勾选文件/文件夹，自动遵循 `.gitignore`
- **多格式导出** — 纯文本、Markdown、XML（针对 Claude 上下文窗口优化）
- **Token 预算** — 实时 Token 估算 + 进度条（上限 100 万 Token）
- **搜索 & Glob 过滤** — 支持关键词搜索和 Glob 模式（`*.ts`、`src/**/*.tsx`）
- **Prompt 模板** — 内置安全审查、性能分析、Bug 排查等模板，支持自定义前后缀
- **选择预设** — 保存常用文件组合，一键恢复（如"前端组件"、"API 层"）
- **输出预览** — 带语法高亮的实时预览，所见即所发
- **会话持久化** — 已选文件、预设和配置跨会话保存

### AI Agent

无需复制粘贴，直接让 Claude 在本地文件上执行任务。

- **子进程执行** — 通过 `claude` CLI 以 `stream-json` 格式实时流式输出
- **工具调用卡片** — 每次工具调用（Read / Write / Edit / Bash / Glob / Grep）都有可展开的详情卡
- **Git 集成** — 显示当前分支，运行前检测未提交变更
- **Unified Diff 查看器** — 任务完成后按文件展示增删行
- **一键回滚** — Git 仓库用 `git restore .`，非 Git 目录用文件快照还原
- **权限模式** — 接受编辑 / 跳过权限 / 默认 / 仅规划
- **上下文模式** — 内联模式（文件内容直接嵌入 prompt）/ 目录模式（让 Claude 自主读取文件）
- **多轮对话** — 通过 `--resume` 继续上一个对话，历史消息完整保留
- **会话历史** — 侧边栏展示所有历史会话（状态、消耗、时间戳）
- **Skills 系统** — 从 `~/.claude/commands/*.md` 创建、编辑和插入 Prompt 模板
- **多 Provider 支持** — Anthropic 直连、OpenRouter 或任意兼容 OpenAI 的自定义接口
- **快捷键** — `Cmd+Enter` 运行任务

---

## 快速开始

### 1. 下载

从 [Releases](../../releases) 页面下载对应平台的安装包（macOS `.dmg`、Windows `.msi`、Linux `.AppImage`）。

### 2. 打开项目

点击 **添加目录** 或拖拽文件夹到窗口，左侧目录树即刻加载。

### 3. 提取上下文

1. 勾选需要的文件。
2. 在配置面板选择输出格式（文本 / Markdown / XML）。
3. 点击 **复制** 或 **导出**，粘贴到任意 AI 对话框。

### 4. 运行 Agent 任务

参考下方 [Agent 配置](#agent-配置)，打开 **Agent** 标签页，输入任务然后 `Cmd+Enter`。

---

## Agent 配置

Agent 功能需要安装 `claude` CLI 并配置 API Key。

### 安装 Claude CLI

```bash
npm install -g @anthropic-ai/claude-code
```

验证安装：

```bash
claude --version
```

### 配置 API Key

在 CodeExtractor 的 **设置** 面板中选择 Provider：

| Provider | 所需配置 |
|---|---|
| **Anthropic**（默认） | 从 [console.anthropic.com](https://console.anthropic.com) 获取 `ANTHROPIC_API_KEY` |
| **OpenRouter** | OpenRouter API Key，Base URL 填 `https://openrouter.ai/api/v1` |
| **自定义** | 任意兼容 OpenAI 格式的 Base URL 和 Key |

API Key 仅传递给 `claude` CLI 子进程，CodeExtractor 本身不存储。

---

## 键盘快捷键

| 快捷键 | 功能 |
|---|---|
| `F5` | 刷新所有目录 |
| `Ctrl+Shift+C` | 复制所有选中内容到剪贴板 |
| `Ctrl+Shift+E` | 导出选中内容到文件 |
| `Cmd+Enter` | 运行 Agent 任务 |
| `?` | 显示快捷键帮助 |
| `Escape` | 清空搜索框 |

---

## 技术栈

| 层级 | 技术 |
|---|---|
| 桌面运行时 | [Tauri 2](https://tauri.app)（Rust 后端） |
| UI 框架 | React 19 + TypeScript 5.8 |
| 样式 | Tailwind CSS 4 + shadcn/ui |
| 状态持久化 | Tauri plugin-store |
| 图标 | lucide-react |
| Markdown 渲染 | react-markdown + remark-gfm |
| 语法高亮 | react-syntax-highlighter |

---

## 本地开发

### 环境要求

- [Node.js](https://nodejs.org) 20+
- [Rust](https://rustup.rs)（stable 工具链）
- Tauri 平台依赖 — 参考 [Tauri 文档](https://tauri.app/start/prerequisites/)

### 开发模式

```bash
npm install
npm run tauri dev
```

React 前端支持热更新，Rust 后端改动需完整重启。

### 构建发行包

```bash
npm run tauri build
```

产物输出至 `src-tauri/target/release/bundle/`。

### 项目结构

```
src/              React 前端（组件、hooks、context）
src-tauri/        Rust 后端（Tauri 命令、文件系统、claude 子进程）
src-tauri/src/    Rust 源码
public/           静态资源
```

---

## 贡献

欢迎提交 PR。较大的改动请先开 Issue 讨论。

1. Fork 仓库并切换到 feature 分支。
2. 提交清晰的 commit 信息。
3. 向 `main` 分支发起 PR。

发现 Bug 或有功能建议，请提 [Issue](../../issues)。

---

## License

[MIT](LICENSE)

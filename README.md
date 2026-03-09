# CodeExtractor

[![Tauri 2](https://img.shields.io/badge/Tauri-2-24C8D8?logo=tauri)](https://tauri.app)
[![React 19](https://img.shields.io/badge/React-19-61DAFB?logo=react)](https://react.dev)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.8-3178C6?logo=typescript)](https://www.typescriptlang.org)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](LICENSE)

**An AI-native desktop tool for extracting code context and running AI agents on your local codebase.**

CodeExtractor combines two workflows in one app: a **code context extractor** that packages your files into AI-ready formats, and a **local AI agent** powered by the Claude CLI that can read, write, and refactor code directly on your machine.

---

## Screenshots

> _Screenshots go here — showing the Context Extractor (left panel) and Agent tab (right panel) side by side._

---

## Features

### Context Extractor

Turn any local codebase into clean, structured context for AI models.

- **Directory tree browser** — Check files and folders individually or in bulk; `.gitignore` is respected automatically
- **Multi-format export** — Plain text, Markdown, or XML (optimized for Claude's context window)
- **Token budget** — Real-time token estimation with a progress bar (1M token limit)
- **Search & Glob filter** — Regular keyword search plus Glob patterns (`*.ts`, `src/**/*.tsx`) to quickly target file groups
- **Prompt templates** — Built-in templates for security review, performance analysis, bug finding, and custom prefix/suffix injection
- **Selection presets** — Save named file groups and reload them in one click (e.g., "frontend components", "API layer")
- **Output preview** — Browse the exact content that will be sent, with syntax highlighting
- **Session persistence** — Selected files, presets, and config are saved across sessions

### AI Agent

Run Claude directly against your local files without copy-pasting anything.

- **Subprocess execution** — Runs `claude` CLI with `--print --output-format stream-json` for real-time streaming
- **Live tool call feed** — Expandable cards for every tool the agent uses: Read, Write, Edit, Bash, Glob, Grep
- **Git integration** — Shows current branch and detects uncommitted changes before each run
- **Unified diff viewer** — After completion, see exactly what changed per file (+/- lines), each file expandable
- **Revert** — Undo all agent changes with one click (`git restore .` for git repos, snapshot restore for non-git)
- **Permission modes** — Accept edits / Skip permissions / Default / Plan-only
- **Context modes** — Inline mode (embed selected files in the prompt) vs. Directory mode (let Claude use the Read tool)
- **Multi-turn conversations** — Continue a previous session with `--resume`
- **Session history** — Sidebar listing all past sessions with status, cost, and timestamp
- **Skills system** — Create, edit, and insert prompt templates from `~/.claude/commands/*.md`
- **Provider support** — Anthropic direct, OpenRouter, or any custom base URL
- **Keyboard shortcut** — `Cmd+Enter` to run

---

## Quick Start

### 1. Download

Grab the latest release for your platform from the [Releases](../../releases) page. macOS (`.dmg`), Windows (`.msi`), and Linux (`.AppImage`) builds are available.

### 2. Run

Open the app and click **Add Directory** (or drag a folder onto the window) to load a project. The directory tree appears in the left panel immediately.

### 3. Extract context

1. Check the files you want to include.
2. Choose an output format (Text / Markdown / XML) in the Config tab.
3. Click **Copy** or **Export** to send the content to your AI model of choice.

### 4. Run an agent task

See [Agent Setup](#agent-setup) below, then open the **Agent** tab and type your task.

---

## Agent Setup

The Agent tab requires the `claude` CLI to be installed and an API key to be configured.

### Install the Claude CLI

```bash
npm install -g @anthropic-ai/claude-code
```

Verify the installation:

```bash
claude --version
```

### Configure your API key

Open the **Settings** panel inside CodeExtractor and choose a provider:

| Provider | What you need |
|---|---|
| **Anthropic** (default) | `ANTHROPIC_API_KEY` from [console.anthropic.com](https://console.anthropic.com) |
| **OpenRouter** | API key from [openrouter.ai](https://openrouter.ai), set base URL to `https://openrouter.ai/api/v1` |
| **Custom** | Any OpenAI-compatible base URL and key |

The API key is passed to the `claude` CLI process and never stored by CodeExtractor itself.

---

## Keyboard Shortcuts

| Key | Action |
|---|---|
| `F5` | Refresh all directories |
| `Ctrl+Shift+C` | Copy all selected content to clipboard |
| `Ctrl+Shift+E` | Export selected content to file |
| `Cmd+Enter` | Run agent task (Agent tab) |
| `?` | Show keyboard shortcut help |
| `Escape` | Clear search box |

---

## Tech Stack

| Layer | Technology |
|---|---|
| Desktop shell | [Tauri 2](https://tauri.app) (Rust backend) |
| UI framework | React 19 + TypeScript 5.8 |
| Styling | Tailwind CSS 4 + shadcn/ui |
| State / persistence | Tauri plugin-store |
| Icons | lucide-react |
| Syntax highlighting | react-syntax-highlighter |

---

## Development

### Prerequisites

- [Node.js](https://nodejs.org) 20+
- [Rust](https://rustup.rs) (stable toolchain)
- Tauri CLI prerequisites for your platform — see [Tauri prerequisites](https://tauri.app/start/prerequisites/)

### Run in dev mode

```bash
npm install
npm run tauri dev
```

The app opens with hot-reload for the React frontend. Rust backend changes require a full restart.

### Build a release binary

```bash
npm run tauri build
```

Output is written to `src-tauri/target/release/bundle/`.

### Project structure

```
src/              React frontend (components, hooks, context)
src-tauri/        Rust backend (Tauri commands, file system, claude subprocess)
src-tauri/src/    Rust source files
public/           Static assets
```

---

## Contributing

Pull requests are welcome. For significant changes, please open an issue first to discuss what you'd like to change.

1. Fork the repo and create a feature branch.
2. Make your changes with clear commit messages.
3. Open a PR against `main`.

If you find a bug or have a feature request, open an [issue](../../issues).

---

## License

[MIT](LICENSE)

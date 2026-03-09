# Getting Started with CodeExtractor

This guide walks you through installing CodeExtractor, loading your first project, and running both a context extraction and an agent task. No prior experience needed.

---

## Installation

### Option A: Download a release (recommended)

1. Go to the [Releases](../../../releases) page.
2. Download the installer for your platform:
   - macOS: `.dmg`
   - Windows: `.msi`
   - Linux: `.AppImage`
3. Open the installer and follow the standard installation steps for your OS.

> **macOS note:** If macOS blocks the app on first launch ("unidentified developer"), go to **System Settings > Privacy & Security** and click **Open Anyway**.

### Option B: Build from source

You will need Node.js 20+, Rust (stable), and the Tauri system dependencies for your platform.

```bash
# Install Tauri prerequisites first:
# https://tauri.app/start/prerequisites/

git clone https://github.com/your-org/code-extractor.git
cd code-extractor
npm install
npm run tauri build
```

The built app will be in `src-tauri/target/release/bundle/`.

---

## First Launch

When you open CodeExtractor for the first time, you'll see a two-panel layout:

- **Left panel** — directory tree, search bar, token counter
- **Right panel** — tabs for Preview, Config, and Agent

The app starts empty. Your first step is to load a project directory.

### Loading a project directory

- Click the **Add Directory** button (top of the left panel), or
- Drag a folder from Finder / Explorer and drop it onto the left panel.

The directory tree will populate immediately. Files ignored by `.gitignore` are hidden automatically.

You can load multiple directories at once — they appear as separate root nodes in the tree.

---

## Navigating the UI

### Left panel

| Element | What it does |
|---|---|
| Directory tree | Browse files and folders; click checkboxes to select |
| Search bar | Filter the tree by filename (supports Glob patterns like `*.ts`) |
| Token counter | Shows estimated token usage for selected files; progress bar turns red near the 1M limit |
| Toolbar icons | Add directory, refresh (F5), expand/collapse all, invert selection |

### Right panel tabs

| Tab | Purpose |
|---|---|
| **Preview** | Shows the exact content that would be copied/exported, with syntax highlighting |
| **Config** | Set output format (Text / Markdown / XML), prompt templates, selection presets |
| **Agent** | Run the Claude CLI agent against your codebase |

---

## Your First Context Extraction

This workflow is useful when you want to paste code into Claude.ai, ChatGPT, or any other AI chat interface.

**Step 1 — Load a directory**

Add the project folder you want to work with.

**Step 2 — Select files**

Check the files or folders you want to include. To select all TypeScript files, type `*.ts` in the search bar — the tree filters to matching files, then check the root checkbox to select all at once.

Watch the token counter. A good target is under 200K tokens for most models, under 100K for faster responses.

**Step 3 — Choose a format**

Open the **Config** tab and select an output format:
- **XML** — Best for Claude; wraps each file in `<file path="...">` tags
- **Markdown** — Good general-purpose format with fenced code blocks
- **Text** — Minimal, just file paths and raw content

**Step 4 — Add a prompt template (optional)**

In the Config tab, pick a built-in template (Security Review, Performance, Find Bugs) or write a custom prefix. The template text gets prepended to your extraction automatically.

**Step 5 — Copy or export**

- Press `Ctrl+Shift+C` to copy to clipboard, then paste into your AI chat.
- Press `Ctrl+Shift+E` to export to a `.txt` or `.md` file.

---

## Your First Agent Run

The Agent tab runs `claude` CLI as a subprocess, letting it read and modify files on your machine directly. This requires extra setup.

### Prerequisites

**Install the Claude CLI:**

```bash
npm install -g @anthropic-ai/claude-code
```

**Set up an API key:**

Open **Settings** in CodeExtractor and enter your API key. You can use:
- Anthropic API key from [console.anthropic.com](https://console.anthropic.com)
- OpenRouter key with base URL `https://openrouter.ai/api/v1`
- Any custom OpenAI-compatible endpoint

### Running a task

**Step 1 — Select context files (optional)**

In the left panel, check any files that are directly relevant to your task. The Agent will use these as starting context.

**Step 2 — Choose a context mode**

In the Agent tab header, pick a context mode:
- **Inline** — Selected files are embedded directly in the prompt. Best when you have a small, focused selection.
- **Directory** — Only the directory path is passed; the agent uses the Read tool to explore on its own. Better for larger codebases.

**Step 3 — Type your task**

In the task input box, describe what you want done. Be specific:

> "Add input validation to the `createUser` function in `src/api/users.ts`. The email field should be validated with a regex and the name should be required."

Press **Cmd+Enter** (macOS) or the Run button to start.

**Step 4 — Watch the agent work**

The right panel shows a live feed of tool calls — Read, Write, Edit, Bash, Glob, Grep — each as an expandable card. You can watch what the agent is reading and writing in real time.

**Step 5 — Review the diff**

When the task completes, a unified diff viewer shows every file that was modified. Expand any file to see the exact lines added and removed.

If the changes look good, you're done. If not, click **Revert** to undo everything and return to the original state.

---

## Troubleshooting

### "claude CLI not found"

The agent tab shows this error when the `claude` binary is not on your PATH.

Fix:
```bash
npm install -g @anthropic-ai/claude-code
# Then verify:
claude --version
```

If you installed Node.js via a version manager (nvm, fnm), make sure the shell CodeExtractor launches inherits the correct PATH. On macOS, you may need to add the nvm init lines to `~/.zprofile` (not just `~/.zshrc`) so that GUI apps pick them up.

### API key errors

- Double-check the key is entered correctly in Settings with no extra whitespace.
- For Anthropic: make sure the key starts with `sk-ant-`.
- For OpenRouter: confirm the base URL is exactly `https://openrouter.ai/api/v1`.
- Check your account has sufficient credits/quota.

### Directory not loading

- Make sure you have read permission on the directory.
- Very large directories (100K+ files) may take a few seconds to index. The spinner in the toolbar indicates loading.
- If the tree appears empty, the directory may be fully excluded by `.gitignore`. Try adding a test file.

### Token counter seems too high

The token counter uses a fast approximation (roughly 4 characters per token). Actual token counts from the API may differ slightly. If you're close to a model's context limit, aim for 20% headroom.

### Revert didn't work

Revert uses `git restore .` for git repositories. If the repo has uncommitted changes you want to keep that are unrelated to the agent task, use the diff viewer to manually inspect before reverting — or commit your work first, then run the agent on a clean working tree.

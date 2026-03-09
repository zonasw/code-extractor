# Getting Started with CodeExtractor

CodeExtractor is an AI-native desktop app that helps you work with your codebase alongside AI tools. Whether you want to extract code context for pasting into Claude.ai, or run an autonomous AI agent directly against your project, this guide will get you up and running in minutes.

---

## Installation

You have two options: download a pre-built binary or build from source.

### Option A: Download a Release Binary (Recommended)

1. Go to the [GitHub Releases page](https://github.com/your-org/code-extractor/releases).
2. Download the installer for your platform (`.dmg` for macOS, `.exe` for Windows, `.AppImage` for Linux).
3. Run the installer and launch CodeExtractor.

### Option B: Build from Source

**Requirements:**
- Node.js 18 or later
- Rust 1.75 or later (install via [rustup.rs](https://rustup.rs))

```bash
git clone https://github.com/your-org/code-extractor.git
cd code-extractor
npm install
npm run tauri build
```

The compiled binary will appear in `src-tauri/target/release/`.

---

## Prerequisites

### Install the Claude CLI

CodeExtractor's Agent mode runs the `claude` CLI as a subprocess. Install it globally:

```bash
npm install -g @anthropic-ai/claude-code
```

Verify the installation:

```bash
claude --version
```

### Get an API Key

You need an Anthropic API key (or an OpenRouter key if you prefer that provider).

1. Sign up at [console.anthropic.com](https://console.anthropic.com).
2. Create an API key under **API Keys**.
3. Keep it handy — you will enter it in the Config tab on first use.

::: tip Don't need Agent mode?
If you only want to extract code context and paste it into Claude.ai manually, you don't need an API key or the `claude` CLI at all. You can skip this section and come back to it later.
:::

---

## First Launch

1. Open CodeExtractor.
2. Click **Open Directory** (or drag a folder onto the window).
3. Your project's file tree will appear in the left panel.

CodeExtractor respects `.gitignore` automatically — ignored files and folders are hidden from the tree by default.

---

## UI Overview

Here is a quick reference to the main areas of the interface:

| Area | What it does |
|---|---|
| **Left panel — File Tree** | Browse and select files/folders for context extraction. Check boxes to include them. |
| **Left panel — Glob Search** | Filter the tree with glob patterns like `*.ts` or `src/**/*.tsx`. |
| **Left panel — Presets** | Save and reload named groups of file selections. |
| **Right panel — Preview tab** | See a live preview of the extracted content with syntax highlighting, plus a token count. |
| **Right panel — Config tab** | Set your API key, provider (Anthropic / OpenRouter / Custom), and Agent preferences. |
| **Right panel — Agent tab** | Run the `claude` CLI agent against your project, with streaming output and tool call cards. |

---

## Your First Context Extraction

Context extraction is the simplest use case: gather selected files into one block of text, then paste it into any AI tool.

**Step 1: Open your project**

Click **Open Directory** and select a project folder.

**Step 2: Select the files you want**

Check the files or folders in the left panel. You can also use the Glob search bar to filter — for example, type `src/**/*.ts` to show only TypeScript source files, then select them all.

**Step 3: Choose an output format**

At the bottom of the left panel, select a format:

- **Plain Text** — simple concatenation, works with any AI tool.
- **Markdown** — adds fenced code blocks with language hints.
- **XML** — structured format optimized for Claude's context window.

**Step 4: Check the token count**

The progress bar shows your estimated token usage against the 1M token limit. If it is too high, deselect some files or use a Glob filter to narrow the selection.

**Step 5: Copy or export**

- Press **Ctrl+Shift+C** to copy all selected content to the clipboard.
- Press **Ctrl+Shift+E** to export to a file.

**Step 6: Paste into your AI tool**

Open [Claude.ai](https://claude.ai) (or any other AI tool), paste the content, and add your question or instruction.

::: tip Using prompt templates
The left panel includes built-in prompt templates for common tasks: security review, performance analysis, find bugs, and more. Select a template to automatically prepend or append a structured prompt to your extracted content.
:::

---

## Your First Agent Run

Agent mode runs the `claude` CLI directly against your project, letting it read and write files autonomously.

**Step 1: Configure your API key**

Go to the **Config tab** in the right panel. Enter your Anthropic API key and select your provider.

**Step 2: Open your project and go to the Agent tab**

Click the **Agent** tab in the right panel.

**Step 3: Type a task**

Describe what you want Claude to do. For example:

```
Add input validation to the login form. The email field should reject
invalid email addresses and the password field should require at least 8 characters.
```

**Step 4: Choose a permission mode**

For your first run, select **Plan Only**. This lets Claude analyze your code and describe what it would do — without making any changes. It is a safe way to understand what will happen before committing.

**Step 5: Press Run (or ⌘+Enter)**

You will see:
- **Streaming output** — Claude's thinking and narration appear line by line.
- **Tool call cards** — each time Claude reads a file, runs a search, or writes code, a collapsible card appears showing exactly what it did.
- **Completion summary** — when the task finishes, a unified diff viewer shows all changes made (or proposed, in Plan Only mode).

**Step 6: Review and accept (if you used Plan Only)**

Read the plan. If it looks correct, switch to **Accept Edits** mode and run the same task again. Claude will now apply the changes.

---

## Troubleshooting

### "claude CLI not found"

The `claude` CLI is not installed or not on your PATH. Run:

```bash
npm install -g @anthropic-ai/claude-code
```

Then restart CodeExtractor. If the problem persists, check that your Node.js global bin directory is in your `PATH`.

### "API key invalid" or authentication errors

- Double-check that you copied the full API key with no extra spaces.
- Make sure you are using the correct provider. An Anthropic key will not work if OpenRouter is selected, and vice versa.
- Verify the key is active at [console.anthropic.com](https://console.anthropic.com).

### "Port 1420 is already in use" (dev mode only)

This happens when running in development mode (`npm run tauri dev`) and something else is already using port 1420. Stop the other process or change the port in `vite.config.ts`.

### Token count is unexpectedly high

- Check if you have selected a large folder (like `node_modules` or a build output directory). Deselect it.
- Use a Glob filter to narrow the selection: e.g., `src/**/*.ts` instead of the entire project.
- Deselect binary files — they contribute to the count but rarely help AI tools.
- Switch to **Directory** context mode in Agent settings, so Claude reads only what it needs rather than receiving everything upfront.

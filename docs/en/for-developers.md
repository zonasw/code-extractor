# CodeExtractor for Developers

This guide covers practical workflows for software developers: how to structure prompts, choose the right mode, manage conversations, and integrate CodeExtractor into your daily development process.

---

## Common Developer Tasks

Here are the most frequent tasks developers run through CodeExtractor, with example prompts you can adapt.

### Add a New Feature

Select the files most relevant to the area you are working in (e.g., the settings module, the relevant route handler, the related types). Then describe the feature concisely:

```
Add dark mode support to the settings page. The user should be able to toggle
between light and dark mode. Persist the preference in localStorage. Apply the
theme via a CSS class on the document root.
```

::: tip Be specific about constraints
Include details like "use the existing `useTheme` hook" or "do not modify the API layer" so Claude works within your existing patterns rather than inventing new ones.
:::

### Fix a Bug

Paste the error message or stack trace directly in the task input alongside the relevant files:

```
The following error occurs when the user submits the registration form with a
duplicate email:

  TypeError: Cannot read properties of undefined (reading 'message')
  at handleSubmit (src/components/RegisterForm.tsx:47)

Find the root cause and fix it. Do not change the API contract.
```

### Refactor a Module

Select the module you want to refactor. Be explicit about what good looks like after the refactor:

```
Refactor the `userService.ts` module. Goals:
1. Replace callback-style functions with async/await.
2. Consolidate the three separate fetch helpers into one generic `apiRequest` function.
3. Add JSDoc comments to all exported functions.
Do not change any public interfaces — callers must not need to be updated.
```

### Write Unit Tests for Existing Code

Select the file you want tested, plus any adjacent type files or fixtures it depends on:

```
Write comprehensive unit tests for `src/utils/validation.ts`. Use Vitest (already
configured in the project). Cover: happy path for each exported function, boundary
values, and all documented error conditions. Add the test file at
`src/utils/validation.test.ts`.
```

---

## Choosing Your Context Mode

CodeExtractor offers two ways to give Claude access to your codebase. The right choice affects both quality and cost.

### Inline Mode

In Inline mode, CodeExtractor assembles all selected files into a single block and passes them to Claude at the start of the conversation. Claude sees the full content immediately.

**Best for:**
- Targeted tasks on a known, small set of files.
- When you want to see exactly what Claude receives (the token count in the Preview tab reflects this).
- Short, focused tasks where the relevant files are obvious.

### Directory Mode

In Directory mode, Claude receives only the project root path. It uses Read, Glob, and Grep tool calls to discover and read files on its own as it works through the task.

**Best for:**
- Exploratory tasks where you are not sure which files are relevant.
- Large refactors that touch many files across the codebase.
- When the token budget is tight and you want Claude to be selective.

### Decision Table

| Situation | Recommended mode |
|---|---|
| You know exactly which 3–10 files are needed | Inline |
| Task touches more than ~15 files | Directory |
| You want a predictable token cost | Inline |
| You want Claude to explore and discover dependencies | Directory |
| Refactor spanning multiple modules | Directory |
| Bug fix in a specific function | Inline |
| Security audit of the entire codebase | Directory |

---

## Permission Modes Explained

Permission modes control whether Claude can write to files, run shell commands, and make changes.

### Plan Only → Accept Edits (Safest Workflow)

1. Run the task in **Plan Only** mode first. Claude will read your code and describe exactly what it intends to do — file by file, change by change — but will not write anything.
2. Read the plan. If something looks wrong, cancel and refine your prompt.
3. Switch to **Accept Edits** mode and run the task again. Claude will now apply the changes.

This two-step approach costs slightly more (you run the task twice) but gives you full visibility before any file is touched.

### Accept Edits

Claude can read and write files but will ask for confirmation before running shell commands. This is the standard mode for most development tasks.

### Bypass Permissions

Claude can do everything — read, write, and run shell commands — without pausing to ask. Use this only when:
- You are running a well-understood, repetitive task (e.g., renaming a variable across a large codebase).
- You are on a throwaway branch and would simply revert if something goes wrong.

::: warning Use Bypass Permissions carefully
If Claude runs an unexpected shell command (e.g., `npm publish` or `git push`), Bypass mode will not stop it. Always work on a feature branch when using this mode.
:::

### Default Mode

Claude operates within reasonable boundaries — reading files freely but prompting before writes. This is sufficient for the majority of tasks and is a good starting point if you are unsure.

---

## Multi-Turn Conversation Strategy

### When to Start a New Session

Start fresh when:
- You are moving to a completely different task or area of the codebase.
- The previous session ended in a messy state and you want a clean context window.
- Token costs from a long session are making responses slower or less accurate.

### When to Continue a Session

Use `--resume` (the **Continue** button in the Session History sidebar) when:
- You want to build on what Claude already learned about your codebase.
- The previous turn completed partial work and this turn finishes it.
- You are iterating — "good, now also do X" is a natural multi-turn pattern.

### Example: Feature Implementation Across 3 Turns

**Turn 1** — Design and scaffold:
```
Design the data model and file structure for a notifications feature.
Create the skeleton files but leave function bodies empty for now.
```

**Turn 2** — Implement the core logic:
```
Implement the core logic in the files you just created. Focus on
the service layer first; leave the UI components for next.
```

**Turn 3** — Wire up the UI:
```
Now implement the React components for the notifications panel.
Connect them to the service layer you built in the previous step.
```

### Using Session History

The Session History sidebar lists all past sessions with their start time and first message. You can:
- **Switch** to any past session to review its output and diff.
- **Continue** a session to append new turns to it.
- **Delete** sessions you no longer need.

This is particularly useful for revisiting decisions — you can look back at what Claude proposed in an earlier session before you committed the changes.

---

## Skills for Developers

Skills are reusable prompt templates stored as Markdown files in `~/.claude/commands/`. They appear in the Skills picker in the Agent tab and can be inserted into any task input.

Create the following files to get started. Each file name becomes the skill name.

### `~/.claude/commands/code-review.md`

```markdown
Review the above code for:
1. Potential bugs (null dereferences, off-by-one errors, unhandled promise rejections)
2. Performance issues (unnecessary re-renders, N+1 queries, blocking operations)
3. Security vulnerabilities (injection risks, improper input validation, exposed secrets)
4. Code style consistency with the surrounding codebase

Format the output as a checklist. For each item include:
- Severity: Critical / High / Medium / Low
- File and line number (if applicable)
- A one-sentence description of the issue
- A suggested fix
```

### `~/.claude/commands/write-tests.md`

```markdown
Write comprehensive unit tests for the above code. Include:
- Happy path: the expected successful flow for each exported function
- Edge cases: empty inputs, maximum values, special characters
- Error cases: invalid arguments, simulated failures, thrown exceptions
- Integration points: interactions with dependencies (mock them appropriately)

Use the existing test framework already configured in the project.
Place the test file next to the source file with the `.test.ts` suffix.
```

### `~/.claude/commands/explain-code.md`

```markdown
Explain this code in plain language:
1. What does it do at a high level?
2. How does it work, step by step?
3. What are the non-obvious design decisions, and why were they likely made?
4. What are the assumptions or preconditions the code relies on?
5. Are there any known limitations or edge cases worth noting?

Avoid jargon where possible. Write as if explaining to a developer who is
joining the team and reading this code for the first time.
```

### `~/.claude/commands/find-bugs.md`

```markdown
Analyze this code carefully and identify all potential bugs. Look specifically for:
- Null pointer / undefined dereferences
- Race conditions and concurrency issues
- Off-by-one errors in loops and array accesses
- Unhandled error cases and missing try/catch blocks
- Type mismatches or unsafe type assertions
- Logic errors (incorrect conditions, wrong operators)
- Resource leaks (unclosed handles, event listeners not removed)

For each bug found, provide:
- Location (file and line)
- Description of the problem
- Conditions under which it would manifest
- Suggested fix
```

---

## Git Workflow Integration

CodeExtractor's Agent mode is powerful but it writes to your files. Follow this workflow to stay in control.

### Always Work on a Feature Branch

Before running any Agent task that uses Accept Edits or Bypass Permissions, create a branch:

```bash
git checkout -b feat/my-task
```

If something goes wrong, click **Revert** in the Agent tab (which runs `git restore .`) or simply check out a clean branch.

### Recommended Workflow

1. Create a feature branch.
2. Run the task in **Plan Only** mode. Read the proposed changes carefully.
3. If the plan looks correct, switch to **Accept Edits** mode and run again.
4. When the task completes, open the **Diff Viewer** to review every file change.
5. Run your tests locally.
6. Commit the changes you want to keep, or click **Revert** to discard everything.

### The Uncommitted Changes Warning

When you open a directory that has uncommitted changes, CodeExtractor shows a warning badge on the Agent tab. This is a reminder that any Agent-written changes will be mixed in with your existing uncommitted work, making it harder to separate them later.

::: tip Best practice
Commit or stash your current work before starting an Agent task. That way, the diff viewer shows only what the Agent changed — nothing else.
:::

### After Completion: Diff → Commit or Revert

The diff viewer appears automatically at the end of each Agent run. It shows a standard unified diff of all modified files. From there:
- **Commit** if the changes look correct. Write a meaningful commit message.
- **Revert** (`git restore .`) if you want to discard all Agent changes and try again with a refined prompt.

---

## Selection Presets for Common Setups

Presets let you save a named group of file selections and reload them in one click. This is especially useful for recurring tasks on the same parts of the codebase.

### Create a "Frontend Components" Preset

1. In the Glob search bar, type `src/components/**/*.tsx` and press Enter.
2. Select all matching files.
3. Click **Save Preset** and name it `Frontend Components`.

Next time, click the preset to instantly re-select the same set of files.

### Suggested Presets

| Preset name | Glob pattern(s) |
|---|---|
| Frontend Components | `src/components/**/*.tsx` |
| API Layer | `src/api/**`, `src/types/**` |
| Tests | `**/*.test.ts`, `**/*.spec.ts` |
| Config Files | `*.config.*`, `.env.example` |
| Database / Models | `src/models/**`, `src/db/**` |

::: info Presets are per-directory
Presets are saved per project directory, so switching to a different project won't overwrite your presets for the current one.
:::

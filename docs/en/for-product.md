# CodeExtractor for Product Managers

You don't need to write code to get value from CodeExtractor. As a PM, it gives you a direct line to understanding your codebase — what it actually does, how complex a feature change would be, and where the technical debt lives. This guide shows you how.

---

## Two Ways to Use CodeExtractor as a PM

### The Simple Way: Extract → Paste → Ask

This works without any API key, without the `claude` CLI, and without any configuration. It is just a better way to copy code into Claude.ai.

1. Open your repository in CodeExtractor.
2. Select the files relevant to your question.
3. Press **Ctrl+Shift+C** to copy everything to the clipboard.
4. Go to [Claude.ai](https://claude.ai), paste the code, and type your question.

That's it. No setup, no tokens to manage, no AI running locally. This is enough for the majority of PM use cases.

### The Power Way: Agent Mode

If you have the `claude` CLI installed and an API key configured, you can use the **Agent tab** to run analysis tasks directly in the app. Claude reads the files itself, and you get a structured response without leaving CodeExtractor.

::: tip Which one should I use?
If you are just getting started, use the Simple Way first. Once you have run a few sessions via Claude.ai and understand the kinds of questions you ask regularly, the Agent tab will feel natural — and it saves you the copy-paste step.
:::

---

## Scenario 1: Understand How a Feature Works

You are preparing a roadmap item that builds on an existing feature. Before writing the spec, you want to understand what the current implementation actually does.

**Step 1: Find the relevant files**

Use the Glob search bar to filter the file tree. Type a keyword related to the feature:

```
**/auth/**
```

```
**/payment/**
```

```
**/subscription/**
```

You will see only the files related to that area. Check the ones that look most relevant.

**Step 2: Run the task**

```
Explain what this code does in plain language. Assume I am not a developer.

Specifically:
1. What does this feature do from the user's perspective?
2. What are the main steps or states a user goes through?
3. What are the edge cases or unusual situations the code handles?
4. Are there any limitations or constraints baked into the current design?

No code snippets in the response — just clear explanations.
```

**Step 3: Use the output**

The response gives you a clear picture you can reference when writing your spec or discussing scope with the engineering team. It is also useful for onboarding — new team members can run this on any unfamiliar part of the codebase.

::: info No jargon? Ask for it
If the response still contains technical terms you are not familiar with, just follow up with: "Explain that again without using technical terms."
:::

---

## Scenario 2: Estimate Effort for a New Requirement

Before a sprint planning or stakeholder conversation, you want a rough sense of how much engineering effort a new feature would take.

**Step 1: Identify the modules that would be affected**

Think about which parts of the product the new feature touches. Use Glob to select the relevant modules:

```
**/settings/**
**/userProfile/**
**/api/**
```

**Step 2: Run the task**

```
I want to add the following feature: [describe your feature here in 2–3 sentences].

Based on the current codebase:
1. Which files would likely need to change?
2. Are there any parts of the code that would make this harder to implement (technical constraints)?
3. Give me a rough breakdown of the work involved:
   - What needs to be built from scratch?
   - What existing code can be reused or extended?
   - What are the riskiest or most uncertain parts?
4. Rough effort estimate: Small (1–2 days), Medium (1 week), or Large (2+ weeks)? Explain why.

Keep the response non-technical — I need to summarize this for a stakeholder meeting.
```

::: warning This is a rough estimate, not a commitment
AI-generated effort estimates are a starting point for conversation, not a substitute for engineering input. Use this to calibrate your intuition and ask better questions in planning, not to set deadlines.
:::

**Step 3: Share with your team**

Copy the output and share it as context in your planning ticket or sprint document. Engineers can then confirm or correct the estimate with their own knowledge.

---

## Scenario 3: Tech Debt Report

You want to make the case for a tech debt sprint, or just understand where the codebase is most fragile. CodeExtractor can generate a prioritized summary.

**Step 1: Select the source directory**

For this scenario, use **Directory mode** in the Agent tab settings. This tells Claude to explore the codebase on its own rather than receiving everything upfront — which is important when you want it to look broadly across the project.

You do not need to select individual files. Just open the project directory.

**Step 2: Run the task**

```
You are analyzing a production codebase. Identify the top 5 items of technical debt.

For each item, provide:
- **What it is**: a plain-language description of the problem
- **Where it is**: which part of the codebase (general area, not specific line numbers)
- **Why it matters**: what risk does it create? (bugs, slow development, security, scalability)
- **Effort to fix**: Small (days), Medium (1–2 weeks), Large (month+)

Avoid developer jargon. Write as if explaining to a product manager who will
use this to prioritize a tech debt sprint with the engineering team.
```

**Step 3: Use the output**

This gives you a starting point for a tech debt backlog. Bring the output to a conversation with your tech lead to validate the priorities and add anything the AI might have missed.

---

## Scenario 4: Generate Release Notes / Changelog

You need user-facing release notes for a new version, but writing them from a list of Jira tickets (or worse, a raw git log) is painful.

**Step 1: Select the changed files**

If you know which files changed in this release, use Glob to find and select them:

```
**/checkout/**
**/notifications/**
```

Alternatively, if you have a git diff or a list of changes, you can paste it directly into the task input.

**Step 2: Run the task**

```
Write user-facing release notes for the changes in this code. These will be
published in our product changelog and read by non-technical users.

Guidelines:
- Focus on what users can now do, or what is now fixed — not how the code changed
- Use plain language, no technical terms
- Group changes by category: New Features, Improvements, Bug Fixes
- Keep each item to 1–2 sentences
- Tone: friendly and positive

If you find changes that seem internal or not visible to users, skip them.
```

**Step 3: Edit and publish**

The output will need a light editorial pass — Claude might not know the exact marketing language your product uses or the specific user-facing names for features. But it gives you a solid first draft in seconds.

::: tip Pair with a prompt template
The built-in prompt templates in the left panel include a "changelog" option. Using it as a prefix saves you from typing the same instructions every release.
:::

---

## Glob Cheat Sheet for PMs

You don't need to know how Glob patterns work deeply — just remember a few useful ones:

| Pattern | What it finds |
|---|---|
| `**/api/**` | All files in any folder named `api` |
| `**/*controller*` | All files with "controller" in the name (routes, request handlers) |
| `**/*.test.*` | All test files — useful for checking how much of a feature is tested |
| `**/i18n/**` | Translation / localization files |
| `**/*.json` | All JSON files (config, translations, data) |
| `**/auth/**` | Everything related to authentication |
| `**/payment/**` | Everything related to payments |
| `**/settings/**` | Everything related to settings |
| `src/**` | All source files (excludes build output, tests, config) |

::: tip How to use these
Type the pattern into the Glob search bar at the top of the left panel and press Enter. The file tree will filter to show only matching files. Check the folders or individual files you want, then proceed to extraction or the Agent tab.
:::

---

## Recommended Skills for PMs

Save these as Markdown files in `~/.claude/commands/` to add them to the Skills picker in the Agent tab. Each file name becomes the skill name.

### `~/.claude/commands/plain-english.md`

```markdown
Explain the selected code in plain language for a non-technical audience.

Cover:
1. What does this do from a user's perspective?
2. What are the main workflows or states?
3. What edge cases or limitations exist?
4. What would break or change if this code were removed?

Rules:
- No code snippets in the response
- No technical jargon (or define it immediately if you must use it)
- Write as if explaining to a product manager preparing a requirements document
```

### `~/.claude/commands/effort-estimate.md`

```markdown
Based on the selected code, estimate the effort required to implement the feature
or change described above.

Provide:
1. Which areas of the codebase would be affected
2. What would need to be built new vs. modified vs. left unchanged
3. What are the biggest unknowns or risks that could increase the effort
4. Overall effort: Small (1–3 days), Medium (1–2 weeks), Large (3+ weeks)

Write in plain language suitable for sharing with a non-technical stakeholder.
Acknowledge that this is a rough estimate and recommend engineering validation.
```

### `~/.claude/commands/release-notes.md`

```markdown
Write user-facing release notes for the changes in the selected files.

Format:
## What's New
- [Feature items]

## Improvements
- [Enhancement items]

## Bug Fixes
- [Fix items]

Guidelines:
- Each item: 1–2 sentences max
- Focus on user impact, not technical implementation
- Plain language — no code, no jargon
- Positive, helpful tone
- Skip internal-only changes (refactors, test updates, config tweaks)
```

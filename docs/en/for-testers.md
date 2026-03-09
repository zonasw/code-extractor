# CodeExtractor for Testers

CodeExtractor gives QA engineers a fast way to analyze code changes, generate test cases, investigate bugs, and produce regression checklists — all powered by AI, without needing to write a single line of code. You load the relevant source files, describe what you need, and Claude does the analysis.

---

## What Testers Can Do with CodeExtractor

CodeExtractor lets you point an AI at any part of the codebase and ask quality-focused questions. You can generate structured test case tables from raw source code, understand the blast radius of a code change before testing it, trace a bug to its root cause by combining source files with error logs, and produce sprint-level regression checklists in seconds. Crucially, you can do all of this in **Plan Only** mode — Claude reads and analyzes, but never touches your code.

---

## Scenario 1: Analyze a PR's Impact

Before you start testing a pull request, use CodeExtractor to understand what actually changed and where the risk lies.

**Step 1: Load the repository**

Click **Open Directory** and open the repository root.

**Step 2: Find the changed files**

Use the Glob search bar to locate the files you know were modified. For example, if the PR touches the authentication module:

```
**/auth/**
```

Or if you have a list of changed file names from the PR:

```
**/LoginForm.*
**/authService.*
**/tokenUtils.*
```

Check the matching files to include them in context.

**Step 3: Set the mode to Plan Only**

In the Agent tab, set the permission mode to **Plan Only**. This guarantees Claude will only read and analyze — it cannot make any changes.

**Step 4: Run the analysis**

Paste this prompt (adapt to your PR):

```
Analyze what this code change does. Specifically:
1. What is the intended purpose of these changes?
2. What existing functionality could be affected (regression risk)?
3. What boundary conditions or edge cases should be tested?
4. Are there any obvious gaps — paths that are changed but appear untested?

Format the output as:
- Summary of changes (2–3 sentences)
- List of affected functionality
- Regression risk areas (High / Medium / Low with rationale)
- Suggested test cases
```

::: tip Reading the tool call cards
As Claude works, you will see collapsible tool call cards showing which files it read. This is a useful audit trail — you can verify Claude is looking at the right code.
:::

---

## Scenario 2: Generate Test Cases

When you need structured test cases for a specific function, component, or API endpoint, CodeExtractor can produce a formatted table in one shot.

**Step 1: Select the file or function**

In the file tree, check the source file you want to test. If the function has dependencies (e.g., it calls a service or utility), include those files too.

**Step 2: Run the task**

```
Write test cases for the `processPayment` function in this file.

Format the output as a Markdown table with these columns:
| ID | Description | Preconditions | Steps | Input Data | Expected Result | Notes |

Include:
- Happy path (successful payment)
- Boundary conditions (zero amount, maximum amount, currency edge cases)
- Error cases (invalid card, declined transaction, network timeout)
- Integration points (what happens if the payment gateway returns unexpected data)
```

**Step 3: Copy the output**

Once Claude finishes, select the table in the output and copy it. You can paste it directly into Confluence, Jira, or TestRail.

::: info Customizing the table format
Different tools expect different formats. If your test management tool uses a specific column structure, just change the column names in the prompt. Claude will follow the format you specify.
:::

---

## Scenario 3: Bug Root Cause Analysis

When you have a bug report with an error log, CodeExtractor can help trace the issue through the code — faster than reading through files manually.

**Step 1: Select the relevant files**

Load files related to the bug area. If you are not sure which files are involved, use a Glob pattern like `**/checkout/**` or `**/orderService.*` to narrow the tree.

**Step 2: Paste the error log in the task input**

Include the full stack trace with your prompt:

```
The following error was reported in production. Users cannot complete checkout
when their cart contains a product with a zero-price discount applied.

Error:
  UnhandledPromiseRejection: Cannot read properties of null (reading 'discountedPrice')
  at calculateTotal (src/services/pricingService.ts:112)
  at processCartItems (src/services/checkoutService.ts:88)
  at async handleCheckout (src/controllers/checkoutController.ts:45)

Tasks:
1. Identify the root cause of this error.
2. Trace the execution path from `handleCheckout` to the failure point.
3. Explain under what conditions `discountedPrice` would be null.
4. Suggest a fix.
5. Identify any other places in the code that could have the same issue.
```

**Step 3: Use the output to write a precise bug report**

Claude's response will give you the technical detail needed to write a high-quality bug report — including reproduction conditions and a clear description of the defect, not just the symptom.

---

## Scenario 4: Regression Test Checklist

At the end of a sprint, you need a regression checklist that covers all modified areas. CodeExtractor can generate one from the changed files themselves.

**Step 1: Identify the files changed in the sprint**

Use Glob patterns based on the features in the sprint. For example, if the sprint touched user profiles, billing, and notifications:

```
**/profile/**
**/billing/**
**/notifications/**
```

Alternatively, ask a developer for the list of changed files and search for them by name.

**Step 2: Run the task**

```
Generate a regression test checklist for the code in these files.

Structure the output as follows:
- Group test items by feature area
- For each item, include: what to test, how to trigger it, what the expected behavior is
- Flag any items that are High Risk (core user flows, payment, authentication)
- Include a section for cross-feature integration points

Format as a Markdown checklist so it can be pasted directly into Confluence or Jira.
```

**Step 3: Review and adjust**

Read through the checklist. Add manual test cases you know from experience that Claude might not have inferred from the code alone. The AI gives you the baseline — your domain knowledge fills the gaps.

---

## Key Tip: Always Use Plan Only Mode

::: warning Plan Only is your safety net
As a tester, you should almost never need to modify code. Set the permission mode to **Plan Only** at the start of every session and leave it there. This is a hard guarantee that Claude will only read files and produce output — it cannot write, edit, or delete anything.
:::

If you accidentally leave the mode set to **Accept Edits** from a previous session, CodeExtractor will show a warning banner when you open a directory with uncommitted changes. Treat this as a reminder to switch back to Plan Only before proceeding.

---

## Copying Output to Your Tools

Claude's output is plain Markdown text. It copies cleanly into most tools:

| Target tool | How to paste |
|---|---|
| **Confluence** | Paste directly — Confluence renders Markdown tables and checklists. |
| **Jira** | Use the Jira editor's Markdown import, or paste into a Text Panel widget. |
| **TestRail** | TestRail accepts Markdown in description fields; for test cases, paste each row manually or use the CSV export workaround. |
| **Notion** | Paste directly — Notion renders Markdown natively. |
| **Google Docs** | Paste as plain text, then use the "Format as table" option for tables. |

::: tip Keyboard shortcuts for copying
- **Ctrl+Shift+C** — copy all extracted content (Context Extractor mode).
- Click the **Copy** button that appears at the top-right of Claude's response in the Agent tab.
:::

---

## Recommended Skills for Testers

Save these as Markdown files in `~/.claude/commands/` so they appear in the Skills picker in the Agent tab.

### `~/.claude/commands/test-cases.md`

```markdown
Generate comprehensive test cases for the code above.

Format as a Markdown table:
| ID | Test Type | Description | Preconditions | Steps | Input | Expected Result | Priority |

Test types to cover:
- Happy path (normal successful flow)
- Boundary conditions (min/max values, empty inputs, nulls)
- Error handling (invalid input, service failures, timeouts)
- Security (injection attempts, unauthorized access, privilege escalation)
- Performance edge cases (very large inputs, concurrent requests)

Assign priority: P1 (must test), P2 (should test), P3 (nice to have).
```

### `~/.claude/commands/impact-analysis.md`

```markdown
Analyze the impact of the changes in the selected files.

Provide:
1. **Summary** — what has changed and why (2–3 sentences)
2. **Directly affected functionality** — features that are changed by this code
3. **Indirectly affected areas** — functionality that depends on the changed code and may behave differently
4. **Regression risk** — rate each affected area as High / Medium / Low with a one-line rationale
5. **Test focus areas** — the specific scenarios a tester should prioritize given these changes

Do not suggest code fixes. Analysis only.
```

### `~/.claude/commands/bug-analysis.md`

```markdown
Perform a root cause analysis for the bug described above.

Provide:
1. **Root cause** — the specific line(s) or condition responsible for the defect
2. **Execution path** — trace the code from entry point to failure
3. **Reproduction conditions** — what inputs or state trigger the bug
4. **Blast radius** — other code paths that could be affected by the same underlying issue
5. **Fix suggestion** — a minimal, safe fix (do not apply it — analysis only)
6. **Regression test** — one or two test cases that would catch this bug in future

Format clearly with numbered sections.
```

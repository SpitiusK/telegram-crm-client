---
name: test-flow
description: Test a user flow interactively using Playwright MCP tools. Navigates the running app, executes steps, and reports pass/fail results with evidence.
---

# Test User Flow

Interactively test a user flow in the running Telegram CRM Client using Playwright MCP browser tools.

## Process

### 1. Parse the Flow

Break the user's flow description into discrete, testable steps. For example, "test login flow" becomes:
1. Navigate to app URL
2. Verify login screen renders
3. Enter phone number
4. Submit and verify code input appears
5. Enter code
6. Verify chat list loads

List the steps to the user before starting.

### 2. Verify App Is Accessible

```
browser_navigate → http://localhost:5173 (or user-specified URL)
browser_snapshot → confirm page loaded
```

If the app is not accessible, stop and report — do not attempt to start the dev server.

### 3. Capture Starting State

```
browser_snapshot → record initial page state
browser_console_messages(level: "error") → record any pre-existing errors
```

### 4. Execute Each Step

For every step in the flow:

**a. Announce** what you're about to do and what you expect to see.

**b. Act** using the appropriate MCP tool:
- `browser_click` — click buttons, links, list items
- `browser_type` / `browser_fill_form` — enter text
- `browser_press_key` — keyboard shortcuts, Enter, Escape
- `browser_navigate` — go to a specific URL
- `browser_select_option` — dropdowns
- `browser_wait_for` — wait for async content

**c. Verify** the outcome:
- `browser_snapshot` — check page state matches expectations
- `browser_console_messages(level: "error")` — catch runtime errors

**d. Record** the result as PASS or FAIL.

**On failure:**
- `browser_take_screenshot` for visual evidence
- Check source code (Read, Grep) to understand expected behavior
- Note the discrepancy and continue to next step if possible

### 5. Summarize Results

Provide a structured summary:

```
## Test Results: [Flow Name]

| # | Step | Action | Expected | Actual | Result |
|---|------|--------|----------|--------|--------|
| 1 | ...  | ...    | ...      | ...    | PASS/FAIL |

**Total:** X steps | Y passed | Z failed
**Console errors:** none / [list]
**Screenshots:** [list of failure screenshots if any]
```

## Rules

- **Never modify source code** — this is a testing-only skill
- **Always use `browser_snapshot`** before interacting — get fresh refs
- **Prefer accessibility selectors** — roles, labels, not CSS classes
- **Check console errors after every interaction** — catch silent failures
- **Reference source code** when behavior is unclear — use Read/Grep to understand what the component should do
- **Continue on failure** — test remaining steps unless the failure blocks them

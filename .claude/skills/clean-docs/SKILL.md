---
name: clean-docs
description: Remove stale/redundant .md files from the project root and docs/ while preserving essential documentation. Use when the user says "clean up docs", "remove stale markdown", "too many md files", or when you notice planning artifacts cluttering the root directory.
---

# Clean Stale Documentation

Remove .md files that have become stale, redundant, or were never meant to live permanently in the repo — without touching essential documentation.

## Why files accumulate

AI-assisted development sessions often produce planning artifacts (architecture brainstorms, user stories, task lists, design catalogs) that are useful during initial development but become stale as the code evolves. These files clutter the root, confuse new contributors, and can mislead Claude into following outdated specs.

## Process

### 1. Scan for .md files

Find all `.md` files in the project root and `docs/` directory. Ignore:
- `node_modules/`
- `.claude/` (agents, skills — these are Claude Code config)
- Any path listed in `.gitignore`

### 2. Classify each file

**Always keep** (essential project files):
- `CLAUDE.md` — Claude Code project instructions
- `README.md` — repo documentation
- `PRD.md` — product spec (only if referenced by CLAUDE.md)
- `LICENSE.md` / `LICENSE` — legal
- `CONTRIBUTING.md` — contributor guide
- `SECURITY.md` — security policy
- `CODE_OF_CONDUCT.md` — community standards
- `CHANGELOG.md` — release history (if actively maintained)

**Check if referenced** before removing:
- Read `CLAUDE.md` and look for `@filename.md` references or mentions
- Grep the codebase for imports or references to the file
- If referenced by active code or CLAUDE.md, keep it

**Likely stale** (planning artifacts from early development):
- `ARCHITECTURE.md` — early brainstorming, superseded by CLAUDE.md architecture section
- `USER-STORIES.md` — planning artifact, not referenced at runtime
- `TASKLIST*.md` (any variant: `TASKLIST.md`, `TASKLIST-v2.md`, etc.) — old task checklists with completed/outdated items
- `docs/components/*.md` — atomic design catalogs that don't match actual components
- `docs/architecture/*.md` — DDD models or design docs that diverged from implementation
- Any `.md` that duplicates content already in CLAUDE.md or PRD.md

### 3. Present the plan

Show a table to the user:

```
| File                          | Action | Reason                                    |
|-------------------------------|--------|-------------------------------------------|
| CLAUDE.md                     | KEEP   | Project instructions                      |
| PRD.md                        | KEEP   | Referenced by CLAUDE.md (@PRD.md)         |
| ARCHITECTURE.md               | DELETE  | Superseded by CLAUDE.md architecture      |
| USER-STORIES.md               | DELETE  | Planning artifact, not referenced          |
| TASKLIST.md                   | DELETE  | Stale task list                           |
| docs/components/atoms.md     | DELETE  | Replaced by src/components/ui/            |
```

### 4. Wait for confirmation

Ask the user to confirm before deleting. They may want to keep some files.

### 5. Delete confirmed files

Remove the files. If a directory becomes empty after deletion (e.g. `docs/components/`), remove the empty directory too. If `docs/` itself becomes empty, remove it.

### 6. Check .gitignore

If any of the deleted files were tracked by git, they'll show as deleted in `git status`. Mention this so the user can commit the cleanup.

## Do NOT delete
- Files inside `.claude/` (agents, skills, settings)
- Files inside `node_modules/`
- Files the user explicitly asks to keep
- Files that are actively imported or referenced by source code

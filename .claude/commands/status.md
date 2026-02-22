Show project health:
1. `npx tsc --noEmit 2>&1 | tail -5` — TypeScript errors
2. `git status --short` — changed files
3. `git log --oneline -5` — recent commits
4. Count: `find src electron -name '*.ts' -o -name '*.tsx' | wc -l` files, `find src electron -name '*.ts' -o -name '*.tsx' -exec cat {} + | wc -l` lines
5. Check TASKLIST-v2.md for next P0 tasks

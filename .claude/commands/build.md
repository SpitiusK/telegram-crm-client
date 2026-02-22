Run full build pipeline:
1. `npx tsc --noEmit` — typecheck
2. `npx eslint src/ electron/ --quiet` — lint
3. `npx vite build` — production build
Report results for each step. If any step fails, fix the errors and retry.

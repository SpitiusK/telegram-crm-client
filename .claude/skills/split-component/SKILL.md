---
name: split-component
description: Split an oversized React component (>200 lines) into sub-components. Invoke with component file path.
---

# Split Oversized Component

Split a React component that exceeds the 200-line limit into well-scoped sub-components.

## Process

1. **Read the component** and identify distinct visual/logical sections
2. **Identify extraction candidates** — sub-components that:
   - Render a visually distinct section (header, footer, list item, panel)
   - Have self-contained logic (their own state, effects, handlers)
   - Are used only once but large enough to warrant extraction (50+ lines)
   - Could be reusable across the app

3. **Extract to separate files** following naming conventions:
   - kebab-case file names
   - PascalCase component names
   - Named exports only
   - One component per file
   - Place in the same directory as the parent

4. **Keep the parent component under 200 lines** by:
   - Moving sub-components to their own files
   - Moving helper functions and constants to shared files if reused
   - Keeping helpers in the parent file if only used there

5. **Pass data via props** — avoid excessive prop drilling:
   - If >5 props needed, consider the sub-component reading from the store directly
   - Type props inline for simple cases, extract interface for complex ones

## Extraction Rules
- Do NOT change any behavior or visual output
- Do NOT rename existing exports
- Do NOT move types that are used by other files
- Run typecheck after each extraction to catch broken imports
- Verify the component renders the same output

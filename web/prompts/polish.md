# Polish

Use when: a screen works and must be finished.

**Target**: `<route>`

---

Review the target against the «Done means» list at the end of `docs/RULES.md` and fix what fails, in place:

- anatomy: shell → `PageHeader` → bands; one primary, last on the right;
- tokens only: no hex, no raw palette, no `dark:`, no hand-made boxes;
- three states: full, `EmptyState`, `loading.tsx` with the right skeleton;
- list state in the URL;
- copy: verbs on buttons, property names as labels, no narration;
- 390 px: nothing overflows, the toolbar collapses, grids go 4 → 2 → 1;
- keyboard: `Esc` closes, focus visible, every icon button has a label.

Make the smallest edit that fixes each point. Do not redesign, do not add features, do not refactor what passes.
Finish with `pnpm check`. Report the fixes, one line each.

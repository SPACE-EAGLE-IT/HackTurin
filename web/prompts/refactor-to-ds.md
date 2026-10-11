# Refactor to the design system

Use when: a screen or component built outside the system (plain Tailwind, another UI library, generated code)
must look and behave like the rest of the application.

**Target**: `<route or component path>`

---

Bring the target onto the IAMAimpresa design system, following `docs/REFACTOR.md`.

1. Run `pnpm check`; its findings for the target are the worklist.
2. Restructure: `PageHeader` → bands → overlays. One primary action, last on the right; every other button
   `outline` or `ghost`.
3. Replace element by element with the table in `docs/REFACTOR.md`; delete the CSS and the components it
   replaces. Grep `docs/COMPONENTS.md` for props. Do not read component sources.
4. Colours: every hex, raw palette or `dark:` becomes the semantic token with the same meaning.
5. Add the missing states (`EmptyState`, `loading.tsx`) and move list state to the URL (`useUrlState`).
6. Copy: labels become property names, buttons say the verb, no sentences under titles.
7. `pnpm check` must be green. Open the target once at 1440 and at 390 px.

Do not change the data layer or the behaviour; do not touch other screens. Report the files changed, one per line.

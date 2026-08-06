# Tasks — Change 0004-docs-accuracy-gate

<!--
Each task is a single checkable item. Keep tasks small (under a few hours
of work). The change is done when every box is checked, including the
three closing steps at the bottom.
-->

- [x] `lib/flag-catalog.js`: declared flags per command, source-usage scanner, help scanner.
- [x] `check-docs.js`: five accuracy checks; export `runChecks(root)`; keep the five shape checks.
- [x] `test/check-docs.test.js`: one seeded violation per check plus negative cases.
- [x] Repair the checker's own false positive on fenced sample links.
- [x] Docs: record the accuracy family in the docs spec (EN/PT prose unaffected — no user-facing surface changed).

## Closing steps

- [x] Apply the change: merge each delta into the corresponding spec.
- [x] Archive the change folder to `.doctrina/changes/archive/2026-08-06-0004-docs-accuracy-gate/`.
- [x] Update `.doctrina/index.json` with new or modified artifacts.

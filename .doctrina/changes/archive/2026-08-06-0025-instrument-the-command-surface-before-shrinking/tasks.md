# Tasks — Change 0025-instrument-the-command-surface-before-shrinking

<!--
Each task is a single checkable item. Keep tasks small (under a few hours
of work). The change is done when every box is checked, including the
three closing steps at the bottom.
-->

- [x] `lib/usage.js`: opt-in, operation-only, local, never fatal.
- [x] `doctrina metrics --commands`: used, never-invoked, and the caveat.
- [x] Sub-operations resolved against the catalog, not against shape.
- [x] Tests for each promise, including the leak test; gitignore the log.

## Closing steps

- [x] Apply the change: merge each delta into the corresponding spec.
- [x] Archive the change folder to `.doctrina/changes/archive/2026-08-06-0025-instrument-the-command-surface-before-shrinking/`.
- [x] Update `.doctrina/index.json` with new or modified artifacts.

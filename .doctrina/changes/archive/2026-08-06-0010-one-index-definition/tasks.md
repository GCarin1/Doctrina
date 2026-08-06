# Tasks — Change 0010-one-index-definition

<!--
Each task is a single checkable item. Keep tasks small (under a few hours
of work). The change is done when every box is checked, including the
three closing steps at the bottom.
-->

- [x] `ARTIFACT_CATEGORIES` in lib/index-json.js; `blank()` derives from it.
- [x] `templates check` / `update` consume the same list.
- [x] `init` writes index.json from `blank()`, not from the template file.
- [x] Invariant tests: zero pending updates after init; every category present.

## Closing steps

- [x] Apply the change: merge each delta into the corresponding spec.
- [x] Archive the change folder to `.doctrina/changes/archive/2026-08-06-0010-one-index-definition/`.
- [x] Update `.doctrina/index.json` with new or modified artifacts.

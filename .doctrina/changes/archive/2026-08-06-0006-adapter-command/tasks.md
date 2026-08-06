# Tasks — Change 0006-adapter-command

<!--
Each task is a single checkable item. Keep tasks small (under a few hours
of work). The change is done when every box is checked, including the
three closing steps at the bottom.
-->

- [x] `lib/adapters.js`: resolution chain, three states, file inventory, token rendering.
- [x] `commands/adapter.js`: list / add / remove, additive by construction.
- [x] Register the command in the dispatch table, catalog, and surface groups.
- [x] `init --force`: refuse on authored content; `--overwrite-content` opt-in; shape-based pristine check.
- [x] Tests: byte-identical add, round trip, three states, custom adapter, refusal, edited-file keep.
- [x] ADR 0016 accepted.
- [x] Docs EN+PT: cli-reference adapter section, init flags, adapters page.

## Closing steps

- [x] Apply the change: merge each delta into the corresponding spec.
- [x] Archive the change folder to `.doctrina/changes/archive/2026-08-06-0006-adapter-command/`.
- [x] Update `.doctrina/index.json` with new or modified artifacts.

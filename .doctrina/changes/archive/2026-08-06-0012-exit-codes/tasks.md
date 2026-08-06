# Tasks — Change 0012-exit-codes

<!--
Each task is a single checkable item. Keep tasks small (under a few hours
of work). The change is done when every box is checked, including the
three closing steps at the bottom.
-->

- [x] `lib/exit-codes.js`: enum, meanings, typed errors, shared precondition constructor.
- [x] Entrypoint maps typed errors to classes and prints the remedy.
- [x] Audit command exit paths: project precondition, verify/intake config, validate.
- [x] `--help` prints the contract from the enum.
- [x] Tests: one representative failure per class; literal-return audit; help contents.
- [x] ADR 0018 accepted.
- [x] Docs: exit-codes.md EN+PT, sidebars, reference tables.

## Closing steps

- [x] Apply the change: merge each delta into the corresponding spec.
- [x] Archive the change folder to `.doctrina/changes/archive/2026-08-06-0012-exit-codes/`.
- [x] Update `.doctrina/index.json` with new or modified artifacts.

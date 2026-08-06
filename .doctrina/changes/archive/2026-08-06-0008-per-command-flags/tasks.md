# Tasks — Change 0008-per-command-flags

<!--
Each task is a single checkable item. Keep tasks small (under a few hours
of work). The change is done when every box is checked, including the
three closing steps at the bottom.
-->

- [x] Export a flag spec from all 34 command modules.
- [x] Two-pass parsing in the entrypoint; global flags from the catalog.
- [x] Static tests: spec presence, read-vs-declared, help-vs-declared, no global redeclaration.
- [x] Behavioural tests: the audit's reproduction, and each formerly undeclared flag leading.
- [x] Docs EN+PT: global flags section.

## Closing steps

- [x] Apply the change: merge each delta into the corresponding spec.
- [x] Archive the change folder to `.doctrina/changes/archive/2026-08-06-0008-per-command-flags/`.
- [x] Update `.doctrina/index.json` with new or modified artifacts.

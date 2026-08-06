# Tasks — Change 0013-git-first-run

<!--
Each task is a single checkable item. Keep tasks small (under a few hours
of work). The change is done when every box is checked, including the
three closing steps at the bottom.
-->

- [x] `lib/git.js`: classify OK / EMPTY / NOT_A_REPO / ABSENT / FAILED.
- [x] `metrics`: graceful first-run report; ENVIRONMENT only when git is absent.
- [x] `context --diff`: name the condition, drop the plumbing.
- [x] Audit the remaining six git call sites.
- [x] Tests: every history-reading command on an empty repo and a non-repo.
- [x] Docs EN+PT: first-run states under metrics.

## Closing steps

- [x] Apply the change: merge each delta into the corresponding spec.
- [x] Archive the change folder to `.doctrina/changes/archive/2026-08-06-0013-git-first-run/`.
- [x] Update `.doctrina/index.json` with new or modified artifacts.

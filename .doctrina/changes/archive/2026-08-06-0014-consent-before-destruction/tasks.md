# Tasks — Change 0014-consent-before-destruction

<!--
Each task is a single checkable item. Keep tasks small (under a few hours
of work). The change is done when every box is checked, including the
three closing steps at the bottom.
-->

- [x] `lib/prompt.js`: isInteractive(); confirm() with an explicit non-interactive answer.
- [x] `change abandon`: preview, confirm, refuse off a terminal; --force escape.
- [x] `init`: refuse a blank description; adapter wizard uses the shared helper.
- [x] Tests: both refusals + the no-destruction invariant across mutating commands.
- [x] Docs EN+PT: abandon confirmation and init description requirement.

## Closing steps

- [x] Apply the change: merge each delta into the corresponding spec.
- [x] Archive the change folder to `.doctrina/changes/archive/2026-08-06-0014-consent-before-destruction/`.
- [x] Update `.doctrina/index.json` with new or modified artifacts.

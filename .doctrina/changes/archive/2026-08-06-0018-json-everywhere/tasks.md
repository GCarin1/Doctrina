# Tasks — Change 0018-json-everywhere

<!--
Each task is a single checkable item. Keep tasks small (under a few hours
of work). The change is done when every box is checked, including the
three closing steps at the bottom.
-->

- [x] lib/json-out.js: envelope, capture (console + raw stream), ANSI strip.
- [x] Declare the JSON flag on all 35 commands; mark the five natives.
- [x] Entrypoint wraps non-native commands; natives stamp the schema version.
- [x] Sweep test + coverage guard + status/ANSI assertions.
- [x] Docs EN+PT: the envelope and the two support levels.

## Closing steps

- [x] Apply the change: merge each delta into the corresponding spec.
- [x] Archive the change folder to `.doctrina/changes/archive/2026-08-06-0018-json-everywhere/`.
- [x] Update `.doctrina/index.json` with new or modified artifacts.

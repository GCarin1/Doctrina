# Tasks — Change 0263-release-0-22-1

<!--
Each task is a single checkable item. Keep tasks small (under a few hours
of work). The change is done when every box is checked and
`doctrina close 0263-release-0-22-1` succeeds — the close applies the deltas,
archives the change and updates the index, so those are not boxes here.
-->

- [x] Write AGENT_CHANGELOG["0.22.1"]
- [x] Stamp 0.22.1 with scripts/release.mjs and check it
- [x] npm pack --dry-run lists only src/, templates/, README.md, package.json

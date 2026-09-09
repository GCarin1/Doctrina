---
name: cut-a-release
description: Cut a doctrina-cli release with consistent version stamps, a Changelog entry, and every gate green.
when: The task is to release/publish a new version of doctrina-cli, or to reconcile drifted version stamps.
---

# Skill — cut-a-release

## When to use this skill

- Publishing `doctrina-cli` to npm (any semver bump).
- Reconciling version stamps after they drifted.

## Procedure

The canonical version lives in ONE place:
`packages/doctrina-cli/package.json`. Everything else quotes it.

1. Move the `## [Unreleased]` content of `CHANGELOG.md` under a new
   `## [X.Y.Z] — YYYY-MM-DD` heading (Keep a Changelog format;
   pre-1.0 minor bumps may change CLI surface and artifact shapes).
2. Bump `version` in `packages/doctrina-cli/package.json`.
2b. Draft the agent-facing changelog and edit it in by hand:
   `doctrina report --agent-changelog` proposes one candidate bullet per
   archived change that touched a documented surface, newest first, capped
   at the block's five bullets and windowed since the last tag. Paste the
   block into `AGENT_CHANGELOG` in `src/lib/commands.js` under the new
   version and REWRITE each line into what an agent must now DO — the draft
   only knows which surface moved. Bullets that do not change an agent's
   behaviour belong in `CHANGELOG.md`, not here; if more than five survive,
   choose, do not raise the cap (it is AGENTS.md's line budget).
3. Reconcile every stamp that quotes it — they have drifted to three
   different values before (fixed in v0.10.0):
   - root `AGENTS.md` (`Status: vX.Y.Z — released`)
   - `README.md` + `README.pt.md` (`**Status:** vX.Y.Z — released.`)
   - `packages/doctrina-cli/README.md`
4. Re-stamp the index: `doctrina index rebuild` (migrates
   `framework_version` to the new CLI version).
5. Run the full gate set from the repo root and require all green:
   `doctrina verify` (tests + self-validate + index drift),
   `doctrina coverage --strict`, `doctrina trace --strict`.
6. `npm pack --dry-run` inside `packages/doctrina-cli/` — the tarball
   must list only `src/`, `templates/`, `README.md`, `package.json`
   (the `prepack` script copies `.doctrina/templates/` in).
7. Commit (Conventional Commits — this repo does NOT use
   `doctrina change new` for its own evolution), tag `vX.Y.Z`, publish.

## Anti-patterns

- Bumping package.json and leaving AGENTS.md/READMEs on the old
  version: the audit behind v0.10.0 found the hub declaring v0.4.0
  while the CLI shipped 0.9.0 — agents reading the hub never
  discovered six commands.
- Publishing with `coverage --strict` red "because it's only docs".
  The gates are the product; a release that fails its own gates
  argues against itself.

## Related material

- `CHANGELOG.md` — versioning policy section.
- ADR 0008 (honest gates); ADR 0009 (validate as the drift truth).
- The `write-acceptance-evidence` skill for getting coverage green
  honestly.

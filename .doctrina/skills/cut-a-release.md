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
`packages/doctrina-cli/package.json`. Everything else quotes it, and
`scripts/release.mjs` writes every quote.

1. Write the changelog. Everything since the last release sits under
   `## [Unreleased]` in `CHANGELOG.md` (Keep a Changelog format; pre-1.0
   minor bumps may change CLI surface and artifact shapes). Add an
   `### Upgrading from <previous>` note when a user has something to run.
2. Write the agent-facing changelog by hand:
   `doctrina status --view agent-changelog` proposes one candidate bullet per
   archived change that touched a documented surface, newest first, capped
   at the block's five bullets and windowed since the last tag. Paste the
   block into `AGENT_CHANGELOG` in `src/lib/commands.js` under the new
   version and REWRITE each line into what an agent must now DO — the draft
   only knows which surface moved. Bullets that do not change an agent's
   behaviour belong in `CHANGELOG.md`, not here; if more than five survive,
   choose, do not raise the cap (it is AGENTS.md's line budget).
3. Open the release as a chore (`doctrina work --chore "release X.Y.Z"`),
   then stamp: `node scripts/release.mjs X.Y.Z`. It moves the Unreleased
   content under `## [X.Y.Z] — <today>`, bumps `package.json` and the
   lockfile, regenerates AGENTS.md's blocks, and writes the status line of
   the three READMEs, the supported minor in `SECURITY.md`, and the
   `framework_version` of the root index and of every `examples/*/` index.
   It refuses while step 2 is missing. `node scripts/release.mjs --check`
   says which stamp still disagrees; the suite and the Release workflow
   both run it.
4. `npm pack --dry-run` inside `packages/doctrina-cli/` — the tarball
   must list only `src/`, `templates/`, `README.md`, `package.json`
   (the `prepack` script copies `.doctrina/templates/` in).
5. Close the change (`doctrina close <id>` runs every gate), commit, open
   the pull request and merge it. **Do not tag.** The Release workflow runs
   when a push to `main` changes `packages/doctrina-cli/package.json`: if
   npm does not have that version yet it runs the gates, publishes, and
   tags the published commit `vX.Y.Z` itself. A version npm already has
   ends the run at the first step with a notice.
6. Check the run's warnings. npm may hold the version **staged** until a
   maintainer approves it with 2FA (a token that bypasses 2FA is staged, and
   from 2027 cannot publish directly): the run says "not public after two
   minutes". Approve it on npmjs.com (account → Staged Packages) or with
   `npm stage list doctrina-cli` then `npm stage approve <stage-id>`. Never
   re-run the publish for it: npm refuses a version it holds (E409). Trusted
   publishing configured on npmjs.com for `release.yml` removes the step.

## Anti-patterns

- Bumping package.json and leaving AGENTS.md/READMEs on the old
  version: the audit behind v0.10.0 found the hub declaring v0.4.0
  while the CLI shipped 0.9.0 — agents reading the hub never
  discovered six commands.
- Publishing with `coverage --strict` red "because it's only docs".
  The gates are the product; a release that fails its own gates
  argues against itself.

- Tagging by hand. Both failed releases of November 2026 were a tag on
  the wrong commit: v0.20.0 on a merge made after 0.20.0 was on npm (a 403
  after every gate passed), v0.21.0 on a commit whose examples were still
  stamped 0.20.0. A version bump merged into `main` IS the release.
- Bumping the version in a pull request that is not the release: the merge
  publishes it.
- Pushing or creating a `v*` tag by hand, or a GitHub Release that creates
  one: the job writes the tag, and a tag starts nothing.

## Related material

- `CHANGELOG.md` — versioning policy section.
- ADR 0008 (honest gates); ADR 0009 (validate as the drift truth).
- The `write-acceptance-evidence` skill for getting coverage green
  honestly.

# Change 0028-ci-must-never-fetch-a-package-to-run-a-gate — CI must never fetch a package to run a gate

- **Status:** applied
- **Applied:** 2026-08-07
- **Date:** 2026-08-07
- **Owner:**
- **Affects specs:** gates

## Why

Every CI job broke, on every machine, and the npm publish job with them.

The typecheck gate I added in 0.14.0 ran `npx tsc --noEmit`. This
repository has never installed anything in CI — the CLI ships zero runtime
dependencies, so there was nothing to install — and TypeScript is a
devDependency. With no local TypeScript, `npx tsc` does not fail:

    npm WARN exec The following package was not found and will be installed: tsc@2.0.4
    npm WARN deprecated tsc@2.0.4: Package no longer supported.
                    This is not the tsc command you are looking for

It fetched an unrelated abandoned package named `tsc` and ran it. The
failure was the good outcome. In a tool whose stated contract is that it
makes no network calls, a gate that silently downloads and executes a
registry package is a supply-chain hole, not a CI bug.

The same defect sat in three places at once: the workflow step, the test,
and `.doctrina/verify.json` — because all three quoted the same wrong
command.

## What

- `npm run typecheck` everywhere, never `npx`. `npm run` resolves only
  from `node_modules/.bin`, so a missing dependency fails loudly instead of
  being fetched. (`npm exec --no` was tried first and rejected: it still
  ran a copy from the local npx cache.)
- `npm ci` in both workflows, so the gate has its tool. Deterministic,
  from the lockfile.
- The test resolves TypeScript with `createRequire` and SKIPS when it is
  absent, rather than shelling out to a resolver that can reach the network.
  The release job runs the suite on a bare checkout, so this is the ordinary
  case, not an edge one.

Verified by reproducing the exact failure: with `node_modules` moved
aside, the suite went from 1 failure to 333 passed / 1 skipped, and all three
CI jobs replay green locally.

**Found while fixing it:** `index.json` had gone stale — the ADR `scope`
fields were missing from all 22 entries while the `Scope:` headers sat on
disk. `deriveIndex` was correct; the file was simply not rebuilt after a
mid-session repair. `index rebuild` restored it, and the drift gate now
agrees.

## Scope boundaries

- `action.yml` keeps `npx --yes doctrina-cli@<version>`. That one is
  deliberate and different: it is the documented way for a CONSUMING repo to
  run the published CLI without installing it, and the package it names is
  this one. The hole is fetching a tool a gate needs, not fetching the
  subject of the gate.
- No pinning of the TypeScript version beyond the lockfile.

## Verification

<!--
How you will know the change is correctly applied. Use checkboxes: every
box here is a claim that must be PROVEN before the change is done.
`doctrina change archive` refuses to archive while any box below is
unchecked (pass --force to archive anyway and record the gap). Distinguish
"task marked done" from "verification passed" — link the evidence.
-->

- [x] Automated checks pass (`doctrina verify`, or the project's typecheck/test/build).
- [x] The affected spec's acceptance criteria are met and cite their evidence (`doctrina coverage`).

## Open questions

Whether the `npx` ban should be a gate of its own — a check that no
workflow or `verify.json` entry invokes `npx` for a tool. Three copies of
one wrong command is exactly the shape that a check catches and review does
not. Left out here to keep the fix small while CI is red.


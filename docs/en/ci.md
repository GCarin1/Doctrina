# CI integration — the gates in your pipeline

Doctrina's gates are ordinary commands with exit codes, so any CI can
run them. This page gives the two ready-made paths: the official
GitHub Action and a plain script for every other CI.

## GitHub Action (recommended)

The repository root ships a composite action that runs the gate set —
`validate`, `index rebuild --check`, `contract check`,
`coverage --strict`, `trace --strict` — in one step:

```yaml
# .github/workflows/doctrina.yml
name: Doctrina gates
on:
  pull_request:

jobs:
  gates:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with:
          node-version: "22"
      - uses: GCarin1/Doctrina@main   # pin a released tag in real projects
        with:
          strict: "true"              # "false" = report-only (adoption phase)
```

Inputs:

| Input | Default | Purpose |
|-------|---------|---------|
| `strict` | `"true"` | Run `coverage`/`trace` with `--strict` (fail on any gap). Use `"false"` while backfilling a brownfield project — the honest state is red, and that is expected early on (see [Brownfield adoption](brownfield.md)). |
| `version` | `latest` | `doctrina-cli` version to run via `npx`. |
| `working-directory` | `.` | Directory holding the `.doctrina/` tree. |
| `run-prefix` | empty | Override the CLI invocation entirely (this repo's own CI points it at the working-tree source). |

## Any other CI (plain script)

The action is four commands; run them anywhere:

```bash
npx --yes doctrina-cli validate
npx --yes doctrina-cli index rebuild --check
npx --yes doctrina-cli contract check
npx --yes doctrina-cli coverage --strict
npx --yes doctrina-cli trace --strict
```

Add `doctrina verify` where your pipeline should also run the
project-declared build gate (tests/typecheck/build) — it is the slow,
authoritative check and deliberately not part of the structural action.

## The runtime gate in CI

Every other step reads Markdown. `contract check` reads what the
Markdown *claims about the running system* and holds the implementation
to it — the RT01-RT05 checks: a variable a contract declares under
`vars`/`secrets` that no workflow exports, a consumer default that an
empty CI value never triggers, a declared enum nothing validates, a
selector that matches zero targets and still exits 0. It is the class of
break no structural gate can see, because the artifacts are all
well-formed.

It is **not** gated on `strict`: a declaration that does not hold is an
error at any adoption stage. A project with no contracts prints one line
and exits 0, so adding the step to an existing pipeline is a no-op until
the first `Wiring` or `Selectors` row is declared. The same checks run
inside `doctrina close` (the `runtime` step), so the break is caught
before the push as well as in the pipeline.

## Machine-readable output

`status`, `next`, `validate`, `coverage`, and `trace` accept `--json`
for pipelines that route findings elsewhere (PR annotations,
dashboards):

```bash
doctrina validate --json | jq '.errors'
doctrina coverage --json | jq '.summary.pct'
```

## Local ratchet vs CI gate

The pre-commit hook (`doctrina hooks install`) runs `validate --fix` —
it *heals* index drift locally. CI runs the read-only checks and
*fails* on drift instead: what reaches the remote must already be
clean. The two are complementary, not redundant.

## Related material

- [Gating](gating.md) — when the full pipeline pays for itself.
- [CLI reference](cli-reference.md) — every command and flag.
- [Validation](validation.md) — the A/B protocol CI numbers feed into.

## End-to-end: the packed install

The unit and integration suites run the CLI from its own repository, where
templates resolve to Doctrina's own `.doctrina/`, adapters are already
present, and `index.json` is the repo's rather than one `init` just wrote.
Three real defects were invisible from that vantage point.

`scripts/e2e-packed.mjs` runs the CLI the way a user installs it:

```
node scripts/e2e-packed.mjs          # full run
node scripts/e2e-packed.mjs --quick  # skip the per-adapter sweep
```

It packs the tarball, installs it into a scratch directory **outside** the
repo, and drives a real project through the whole lifecycle — `init` →
`spec new` → `work` → delta → `change check` → `close` → archive — with the
installed binary, asserting `validate`, `templates check` and `doctor` are
green at each step. Then it installs every one of the twelve adapters into
its own project and checks each.

`--repo <path>` points it at another checkout, which is how it was proved:
run against the commit before the fixes, it reproduces the defects it now
guards. CI runs it on Linux and Windows, because path handling is a
plausible failure the in-repo suite cannot see.

## The release gate

A release is the last moment a defect is cheap, so the publish job runs
**every gate a pull request already runs** — never a subset of it.

This repository's own `release.yml` fires on a `v*` tag and, before
`npm publish`, runs:

```
npm ci
node packages/doctrina-cli/src/index.js verify     # the eight declared checks
node scripts/e2e-packed.mjs                        # what the tarball really does
# then, per example: doctrina validate --strict
```

Three things are worth copying into your own release workflow.

**Run `verify`, not a hand-written list.** `verify` executes the checks
declared in `.doctrina/verify.json` — the same list the gates action runs.
One declaration, so the release gate cannot quietly drift away from the PR
gate.

**Exercise the artifact you are about to publish**, not the checkout you
built it from. Three defects here were invisible from a source tree and
obvious from a packed install, and a publish is where that class stops
landing on you and starts landing on the people who install it.

**Publish with `--provenance`.** The job already requests
`id-token: write`; without the flag that permission is granted and spent on
nothing. With it, npm records a signed attestation tying the tarball to the
workflow run and the commit that produced it.

The requirement is enforced, not merely written down:
`test/the-release-gate-is-not-weaker.test.js` reads both workflows and
fails when a gate the PR job runs has no counterpart in the release job.

# CI integration — the gates in your pipeline

Doctrina's gates are ordinary commands with exit codes, so any CI can
run them. This page gives the two ready-made paths: the official
GitHub Action and a plain script for every other CI.

## GitHub Action (recommended)

The repository root ships a composite action that runs the four
structural gates — `validate`, `index rebuild --check`,
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
npx --yes doctrina-cli coverage --strict
npx --yes doctrina-cli trace --strict
```

Add `doctrina verify` where your pipeline should also run the
project-declared build gate (tests/typecheck/build) — it is the slow,
authoritative check and deliberately not part of the structural action.

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

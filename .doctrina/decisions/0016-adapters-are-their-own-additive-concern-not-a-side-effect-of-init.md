# ADR 0016 — Adapters are their own additive concern, not a side effect of init

- **Status:** accepted
- **Date:** 2026-08-06
- **Deciders:** GCarini + agent session of 2026-08-06 (audit remediation v2)
- **Supersedes:** —
- **Superseded by:** —
- **Evidence:** `packages/doctrina-cli/src/commands/adapter.js`, `packages/doctrina-cli/src/lib/adapters.js`, `packages/doctrina-cli/src/commands/init.js`
- **Landed:** 2026-08-06 — covered by the adapter and `init --force` tests in `packages/doctrina-cli/test/integration.test.js`

## Context

Adapter installation lived inside the scaffolding path and was reachable
only through a full `doctrina init` run. `init` refuses to run twice, so
adding an agent to an existing project meant `init --agent <name> --force`.

`--force` was documented as "Overwrite existing files" and honoured that
literally, drawing no distinction between a scaffold file and a file
carrying user content. The result, verified against a packed install: a
project with a filled `.doctrina/product.md` and a hand-authored rule in
`AGENTS.md` lost both — product.md replaced by the blank template,
AGENTS.md regenerated — with exit code 0 and no warning. Only git made it
recoverable.

The framework calls those two files its sources of truth. A flag whose
stated purpose is "overwrite existing files" was able to destroy them as a
side effect of installing a one-line pointer file.

Two things were conflated: **scaffolding** a project (a once-per-project
act that writes the sources of truth) and **installing an adapter** (a
repeatable act that writes only that agent's pointer files).

## Decision

Adapters are a first-class concern with their own command, and scaffolding
loses the power to destroy authored content.

1. `doctrina adapter list | add <name> | remove <name>`. `add` is strictly
   additive: it writes that adapter's own files and never reads or writes
   `AGENTS.md`, `.doctrina/product.md`, or any other project artifact.
   `remove` deletes only files that adapter created, and keeps any file
   edited since install unless `--force` is given.
2. `adapter list` reports three states, because "no adapter installed" and
   "no adapter needed" were previously indistinguishable: **installed**,
   **available**, and **native** — the five bundled agents (`amp`, `codex`,
   `devin`, `factory`, `jules`) that read `AGENTS.md` directly and ship no
   files at all.
3. `init --force` re-scaffolds only what is still pristine. When
   `AGENTS.md` or `.doctrina/product.md` carries authored content, it
   refuses, names the files, and points at `adapter add`. Discarding
   authored content requires a second, explicit `--overwrite-content`.
4. Pristine is decided by SHAPE, not by rendered text: each token in the
   raw template becomes a wildcard, so a re-init under a different project
   name is still recognised as pristine while any added prose is not. The
   volatile date line and the CLI-owned surface block are excluded from the
   comparison — neither is evidence of authorship.
5. A directory at `.doctrina/templates/adapters/<name>/` is installable by
   name and takes precedence over a bundled adapter of the same name.

## Alternatives considered

1. **Keep `init --force` as the path and just warn.** Rejected: a warning
   printed after the write is an obituary. The operation had already
   replaced both files by the time anything could be said.
2. **Make `--force` prompt for confirmation.** Rejected: the destructive
   path is most often run non-interactively (CI, an agent), where a prompt
   either blocks or is auto-accepted. The fix has to hold with no terminal.
3. **Back up before overwriting.** Rejected: it makes destruction
   recoverable rather than preventing it, and leaves litter the framework
   then has to manage. Not destroying the file is simpler.
4. **Fold adapters into `templates update`.** Rejected: that command's
   contract is "bring the project's scaffold shape up to the CLI", not
   "choose which agents this team uses". Adapter choice is a project
   decision, not a scaffold version.

## Consequences

**Positive**

- The data-loss path is closed: no command can destroy `AGENTS.md` or
  `product.md` without an explicit, separate opt-in.
- Adding an agent to an existing project is a one-line, additive command
  rather than a re-scaffold.
- Custom adapters become possible, which is also the resolution chain the
  project-local template override needs.
- The native/available distinction removes a standing confusion about the
  five agents that correctly install nothing.

**Negative**

- One more top-level command on a surface already large enough to warrant
  a review of its size.
- `--force` no longer means one thing everywhere: for adapters it means
  "overwrite this file", for `init` it means "re-scaffold what is
  pristine". The narrower meaning is stated in `init --help`.

**Neutral**

- Projects that never install an adapter see no change.
- `init --agent <name>` still works for a fresh scaffold; it is only the
  second run against an existing project that now redirects.

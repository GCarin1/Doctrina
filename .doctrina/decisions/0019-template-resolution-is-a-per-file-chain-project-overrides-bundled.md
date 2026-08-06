# ADR 0019 — Template resolution is a per-file chain: project overrides bundled

- **Status:** accepted
- **Scope:** cli, templates
- **Date:** 2026-08-06
- **Deciders:** GCarini + agent session of 2026-08-06 (audit remediation v2)
- **Supersedes:** —
- **Superseded by:** —
- **Evidence:** `packages/doctrina-cli/src/lib/templates.js`, `packages/doctrina-cli/src/commands/templates.js`
- **Landed:** 2026-08-06 — covered by the override tests in `packages/doctrina-cli/test/integration.test.js`

## Context

`doctrina init` creates `.doctrina/templates/` in every project, containing
a single `.gitkeep`. Nothing ever read it or wrote to it.
`locateTemplatesDir()` resolved only against the CLI installation — the
source checkout, or `node_modules/doctrina-cli/templates` — and
`templates list` said so outright: "Templates shipped by the installed
Doctrina CLI". The one reference to the project path was a line-length
lint guarded by `isDir(...)`, false in every project except Doctrina's own.

So the framework created a directory in every adopting project, named it
after the thing users most want to customise, and left it inert.

Two options: delete it, or wire it. Deleting removes a capability adopters
keep asking for, and leaves the custom-adapter requirement (ADR 0016)
unsolved.

## Decision

Template resolution is a **chain, resolved per file**:

1. `<projectRoot>/.doctrina/templates/<relative path>` — the project's own.
2. The templates shipped with the installed CLI.

`readTemplate(projectRoot, relativePath)` returns the body plus the source
it resolved from; every scaffolding command goes through it and says
`(project template)` when the override was used. `templates list` prints
the resolved source per entry, marking a project file that shadows a
bundled one as `overrides bundled`.

**Per file, not per directory.** A team that wants its own
`spec.md.template` must not have to vendor the whole tree and then own
every other template forever. Anything absent locally falls back silently.

An empty `.doctrina/templates/` (the scaffolded state) therefore behaves
exactly as before, which is the compatibility guarantee that let this land
without a migration.

## Alternatives considered

1. **Delete the directory from the scaffold.** Rejected: strictly worse per
   the audit's own reading — it removes a capability users will keep asking
   for, and ADR 0016's custom adapters need this chain anyway.
2. **Whole-directory override (project tree replaces bundled tree).**
   Rejected: it forces adopters to vendor and maintain every template to
   customise one, and a CLI upgrade would then silently stop improving any
   of them.
3. **An explicit `templates eject` command.** Rejected as premature: it is
   sugar over "copy the file you want", and the chain has to exist first
   regardless.

## Consequences

**Positive**

- A directory the framework creates in every project now does something.
- Custom adapters (ADR 0016) and custom templates share one resolution
  path.
- `templates list` shows provenance, so an override is visible rather than
  a surprise.

**Negative**

- A project template silently pins that file's shape: a CLI upgrade that
  improves the bundled version will not reach it. `templates list` marking
  the override is the mitigation; there is no staleness check for
  overridden templates yet.
- One more resolution step on every scaffold. The cost is a filesystem
  stat.

**Neutral**

- Projects that never put a file there see identical behaviour, asserted by
  test.

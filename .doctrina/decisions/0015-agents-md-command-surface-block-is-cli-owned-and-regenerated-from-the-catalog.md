# ADR 0015 — AGENTS.md command-surface block is CLI-owned and regenerated from the catalog

- **Status:** accepted
- **Scope:** cli, templates, scaffolding
- **Date:** 2026-07-19
- **Deciders:** GCarini + agent session of 2026-07-19
- **Supersedes:** —
- **Superseded by:** —
- **Evidence:** `packages/doctrina-cli/src/lib/commands.js`, `packages/doctrina-cli/src/commands/templates.js`, `packages/doctrina-cli/src/commands/init.js`, `.doctrina/templates/AGENTS.md.template`
- **Landed:** 2026-07-19 — shipped in 0.13.0; regeneration covered by `packages/doctrina-cli/test/integration.test.js` (init/templates/upgrade surface tests) and `packages/doctrina-cli/test/commands.test.js` (catalog↔block parity)

## Context

An external operator review (2026-07-19, ~35 changes of end-to-end use on
a 0.12-era project) measured the discovery gap directly: for an AI agent,
AGENTS.md **is** the command-discovery interface — agents do not run
`--help` spontaneously because the hub declares itself the operational
source of truth. Every command absent from the hub (`prime`, `handoff`,
`doctor`, `show`, `intent add`, `report`, `templates`, ...) was invisible
for 35 changes. The hand-written surface section in the template lagged
the CLI, `validate`'s drift gate stayed silent because the section
deferred to `--help`, and `doctrina upgrade` migrated the framework stamp
but only *printed a hint* about refreshing the section — the user
reported exactly this: "upgrade only changes the number in the index, not
the AGENTS.md construction".

The standing constraint was `templates update`'s additive-only guarantee:
never rewrite user content. A fully hand-owned section can drift forever;
a fully generated AGENTS.md would destroy the adopter's own rules.

## Decision

The command-surface section of AGENTS.md is a **CLI-owned block**,
delimited by `<!-- doctrina:surface:begin -->` / `<!-- doctrina:surface:end -->`
markers and **generated from the single command catalog**
(`OPERATIONS` in `src/lib/commands.js`):

- `doctrina init` writes the block fresh from the running CLI (never from
  a possibly stale template copy).
- `doctrina templates check` reports the block missing or stale.
- `doctrina templates update --write` (and therefore
  `doctrina upgrade --write`) regenerates exactly the marked span. A
  legacy hand-written `## Doctrina command surface` section without
  markers is replaced by the managed block — that section was
  CLI-scaffolded content to begin with, so this is the one sanctioned
  exception to additive-only. Everything outside the markers keeps the
  additive-only guarantee.
- Tests enforce catalog↔block parity (`SURFACE_GROUPS` must cover
  `COMMAND_NAMES` exactly; the shipped template must embed the current
  generated block), so a new command cannot ship invisible to the hub.

## Alternatives considered

1. **Keep the hand-written section and strengthen the validate warning.**
   Rejected: a warning still relies on someone editing prose by hand in
   every adopting project after every CLI update — the exact failure the
   review measured for 35 changes.
2. **Generate the whole AGENTS.md.** Rejected: the file's value is the
   adopter's own rules (stack, commands, conventions); regenerating it
   would destroy user content and violate the additive-only contract far
   beyond one section.
3. **Point the hub at `doctrina --help` only (no catalog in the file).**
   Rejected: agents demonstrably do not run `--help` unprompted; the
   catalog must live in the document the agent actually reads.

## Consequences

**Positive**

- Agents reading the hub discover the full, current surface by
  construction; the ~15-command invisibility class is closed.
- `doctrina upgrade --write` genuinely upgrades a project's AGENTS.md
  after an npm update — the reported fidelity gap.
- One source of truth (the catalog) feeds `--help`, completion, the docs
  gate, the validate drift gate, and now the hub itself.

**Negative**

- A marked span inside a user-owned file is a rewrite surface the CLI
  must treat carefully; edits inside the markers are overwritten (stated
  in the marker text itself).
- The generated block is denser than curated prose; per-command nuance
  lives in `--help` and the CLI reference, not in the hub.

**Neutral**

- Projects that delete the markers opt out silently; `templates check`
  keeps reporting the block as missing, nothing is forced.

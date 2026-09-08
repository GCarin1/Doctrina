# Spec — Context Assembly and Insight Commands

**Capability:** insight
**Status:** active
**Implementation:** implemented
**Realizes:** n/a — internal framework capability; product success criteria measure adopting-team outcomes, not the tool's own surface
**Last updated:** 2026-09-07
**Version:** 0.5.0

## Purpose

Define the semantics of the READ path: how a context pack is assembled to
fit a token budget (ADR 0022), and the read-only commands that render the
project's state without judging it — `context`, `search`, `show`, `status`,
`prime`, `handoff`, `report`, `why`, `constitution`.

Split out of the `gates` spec when that spec crossed its own 400-line cap
and grew to two thirds of every capability pack it appeared in. The seam is
the one `gates` always described in its own Purpose: a GATE decides whether
the tree is honest and can refuse; a VIEW assembles what is there and never
refuses anything. They read the same tree and answer different questions, so
they are two capabilities rather than one long spec.

The `gates` spec keeps the checks and the drivers that sequence them; the
`cli` spec keeps the command surface, scaffolding commands, and the
surface-wide constraints (exit codes, zero-deps, no-network).

## Requirements (EARS)

### Ubiquitous

- The system shall assemble a context pack within a token budget, resolved as the `--budget` flag, then the project's `.doctrina/config.json`, then the legacy `config.context_budget` block of `index.json`, then a built-in default.
- The system shall treat an ADR with no Scope: header as global, including it in every capability pack, and shall include a scoped ADR only in the packs of the capabilities it names.
- The system shall collect the project's read-only state once per invocation and render every read-only view from that one collection, so no two views can report different numbers for the same tree.
- The system shall keep a command module free of any binding imported from another command module, and shall keep its libraries free of any dependency on a command module.

### Event-driven

- When `doctrina status` runs, the system shall print a read-only health
  dashboard — index drift, framework stamp, coverage %, trace anchors,
  whether verify is configured, and the artifact counts — and always exit 0
  (a fast summary, not the authoritative gate) (review 2026-06-27).
- When `doctrina why <capability>` runs, the system shall print that
  capability's provenance chain — the product intent it `Realizes:`, its
  purpose and status, its acceptance criteria with cited proof, the
  accepted ADRs that name it, and a History section listing the archived
  changes whose recorded `specs_affected` include the capability (from the
  index ledger, oldest first) — read-only (review 2026-06-27).
- When `doctrina why <anchor>` runs with an intent anchor (`SC1`-shaped),
  the system shall print the reverse chain — the anchor's `product.md`
  text, the capabilities whose `Realizes:` names it (each with status,
  implementation state, and proof ratio), and the archived changes behind
  those capabilities — read-only, erroring with the known anchors when
  the anchor does not exist.
- When `doctrina prime --rules` runs — or the deprecated `doctrina constitution`, which prints the same lines — the system shall print the project's standing rules in full: every accepted ADR by number and title, and every non-goal declared in product.md, assembled read-only from the artifacts that own them.
  standing rules in one read — the accepted ADRs (immutable governing
  decisions, oldest first) and the `## Non-goals` of `product.md` — assembled
  read-only from artifacts those files already own (no new fact home); it
  never writes and always exits 0.
- When `doctrina context [<capability>]` runs, the system shall
  print the context pack in the documented read order — AGENTS.md,
  `product.md`, the capability spec when given (or every active spec
  when no capability is named, so the current truth is never absent),
  open changes, ADRs with status `accepted` — with per-file line counts
  and token estimates (chars/4) plus the pack total, and a separate
  on-demand list of skills (name, description, and when-trigger only,
  never the body). The change archive and non-accepted ADRs shall
  be excluded. With `--concat`, the system shall print the file
  contents with path separators instead of the list. The command
  is strictly read-only.
- When `doctrina context --budget <n>` runs, the system shall compare
  the pack's token estimate against the budget, report over/under —
  on stderr under `--concat`, keeping stdout pipeable — and exit 1
  when the estimate exceeds the budget.
- When `doctrina context --diff <ref>` runs inside a git repository,
  the system shall restrict the stable artifacts (AGENTS.md,
  `product.md`, specs, accepted ADRs) to those changed since `<ref>`
  (including untracked files), while open changes remain always
  included; a missing repository or unresolvable ref shall produce a
  clear error and exit 1.
- When `doctrina search <term> [...]` runs, the system shall report
  lines where every term matches case-insensitively, grouped by artifact
  category (specs, decisions, changes, skills, product, AGENTS.md) and
  ranked best-first within each category (heading, metadata-header,
  full-phrase, and filename matches score higher), excluding the change
  archive unless `--archive` is supplied, and shall exit 0 when matches
  exist and 1 otherwise. The command is strictly read-only.
- When `doctrina show <ref>` runs, the system shall resolve
  `<cap>-R<n>` to the nth requirement bullet of that spec (file order,
  printed with its EARS section name), `<cap>-C<n>` to the acceptance
  criterion carrying that explicit number (with its cited evidence), a
  four-digit number to the matching ADR, and a bare capability name to
  the spec's header block plus Purpose — read-only, exiting 1 for an
  unresolvable reference and 2 for a malformed one.
- When `doctrina prime` runs, the system shall print the session
  primer — the gate digest, artifact counts, accepted ADR titles with
  the non-goal count, open changes with task progress, and the top
  next actions — assembled read-only from artifacts that already own
  each fact, and always exit 0.
- When `doctrina handoff` runs, the system shall print a Markdown
  handoff note — the gate digest, each open change with its unchecked
  tasks and exact resume command, and the prioritised next actions —
  as a view derived from the tree at call time, never written to disk,
  and always exit 0.
- When `doctrina report [--since <days>]` runs, the system shall print
  a Markdown digest for the window (default seven days) — gate state,
  changes archived in the window from the index ledger, open work with
  task progress, artifact counts, and a local-git summary that
  degrades silently outside a repository — read-only, with no network.
- When the pack's irreducible core alone exceeds the budget, the system shall report which artifacts cannot be reduced and exit 1 rather than return a pack over budget.
- When a task description is supplied via --for, the system shall rank artifacts by term coverage and density rather than by document length.
- When a context pack is assembled, the system shall place at most one open change in the irreducible core — the one the named capability or the task query identifies unambiguously — and shall place none there when several match equally.
- When a task query is given and no capability is named, the system shall place the spec that query identifies unambiguously in the irreducible core.
- When a read-only view is requested by name, the system shall render it from the shared collection, refuse an unknown name with the usage exit code and the names that exist rather than defaulting silently, and emit the same machine-readable envelope whichever view was named.
- When `doctrina prime` runs without `--rules`, the system shall keep the primer a fixed-size read: the accepted ADRs by title and the number of non-goals, never their full text.
- When resolving an `<cap>-RN` reference, the system shall number requirements over authored bullets only, skipping any bullet that lies inside an HTML comment.
- When reading a declared section of `product.md`, the system shall count a paragraph as one item alongside a bullet, and shall never read the template's own instructional comment as a declared item.

### State-driven

- While a pack exceeds its budget, the system shall reduce accepted ADRs to title plus summary, and unnamed capability specs to title plus purpose, least relevant first, before omitting any artifact.
- While a change is open but not in focus, the system shall carry it in the context pack as a single degradable entry stating its status, its rationale, its task progress and the capabilities its deltas target.

### Unwanted-behavior (must-not)

- The system shall not silently omit an artifact from a pack; every degradation and omission shall be named in the report.
- The system shall not let the number of open changes decide whether a context pack can be assembled within its budget.
- The system shall not render a change's identifier as part of its title in any read-only view; the id and the title are separate fields and are printed as such.
- The system shall not tell an author to create a section that already exists.

## Acceptance criteria

The read path is spec-compliant when:

1. [verified] Every capability pack in this repository fits the default budget, and `context cli` is under 15,000 tokens (was ~37,900) — verified by `packages/doctrina-cli/test/context-retrieval.test.js`.
2. [verified] A tighter budget never yields a bigger pack, and a budget the core cannot meet exits 1 with an explanation — verified by `packages/doctrina-cli/test/context-retrieval.test.js`.
3. [verified] Degradation order is deterministic: the same tree and budget produce the same pack, everything degrades before anything drops, and the core is never touched — verified by `packages/doctrina-cli/test/context-retrieval.test.js`.
4. [verified] An ADR with no Scope: header appears in every scoped pack, and a scoped one appears only where it governs — verified by `packages/doctrina-cli/test/context-retrieval.test.js`.
5. [verified] A pre-change tree with no config block reads, rebuilds, and packs unchanged — verified by `packages/doctrina-cli/test/context-retrieval.test.js`.
6. [verified] A backlog of twenty open changes leaves every capability pack within the default budget, and each change is still present — verified by `packages/doctrina-cli/test/context-retrieval.test.js`.
7. [verified] The change in focus keeps its proposal, tasks and deltas whole while every parked change is a single entry — verified by `packages/doctrina-cli/test/context-retrieval.test.js`.
8. [verified] Several changes matching equally leaves none in focus, so the pack never silently decides what the reader is working on — verified by `packages/doctrina-cli/test/context-retrieval.test.js`.
9. [verified] No command module imports a binding out of a sibling command module, and no library module depends on a command module — verified by `packages/doctrina-cli/test/one-collector.test.js`.
10. [verified] Every view is a pure function of the snapshot, and each renders byte-identical output whether reached by its own command or by the view flag — verified by `packages/doctrina-cli/test/one-collector.test.js`.
11. [verified] An unknown view name exits with the usage code naming the nearest real one, and the machine-readable envelope keeps its shape whichever view is asked for — verified by `packages/doctrina-cli/test/one-collector.test.js`.
12. [verified] `constitution` and `prime --rules` produce byte-identical output, and the primer names the ADRs without printing the non-goal text — verified by `packages/doctrina-cli/test/deprecation.test.js`.
13. [verified] `prime`, `handoff` and `report` print the title of a change with a multi-word id without the id in front of it, and the index records the same — verified by `packages/doctrina-cli/test/change-title.test.js`.
14. [verified] On a spec `doctrina spec new` has just created, `show <cap>-R1` returns the first authored requirement rather than the scaffold's EARS legend, and a spec with no authored requirement reports zero — verified by `packages/doctrina-cli/test/comment-is-not-content.test.js`.
15. [verified] Prose, two paragraphs and bullets are each read as declared, the template comment is not, an empty section is told to be filled while a missing one is told to be created, and this repository's four non-goals are unchanged — verified by `packages/doctrina-cli/test/non-goals-in-prose.test.js`.

## Out of scope for this spec

- The gate commands, the checks they run, and the drivers that sequence
  them — `validate`, `coverage`, `trace`, `verify`, `review`, `analyze`,
  `clarify`, `close`, `doctor` (covered by the `gates` spec).
- The command surface, exit-code conventions, and scaffolding/workflow
  commands (covered by the `cli` spec).
- Semantic fidelity judgement of any artifact (ADR 0005).

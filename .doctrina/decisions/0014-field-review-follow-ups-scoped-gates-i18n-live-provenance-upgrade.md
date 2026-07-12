# ADR 0014 — Field-review follow-ups — scoped gates, linter i18n, live provenance, project upgrade

- **Status:** accepted
- **Date:** 2026-07-12
- **Deciders:**
- **Supersedes:** —
- **Superseded by:** —
- **Evidence:** —
- **Landed:** 2026-07-12 — `packages/doctrina-cli/src/commands/change.js`, `packages/doctrina-cli/src/commands/coverage.js`, `packages/doctrina-cli/src/commands/close.js`, `packages/doctrina-cli/src/commands/clarify.js`, `packages/doctrina-cli/src/commands/intent.js`, `packages/doctrina-cli/src/commands/upgrade.js`, `packages/doctrina-cli/src/commands/validate.js`, `packages/doctrina-cli/src/lib/scan.js`

## Context

The first sustained field use of Doctrina 0.11.0 (an external project session:
9 changes closed, 6 new capabilities) returned a review with a sharp verdict:
the core held — no artifact desynced, `analyze`/`coverage`/`verify` caught real
problems, the ledger reconstructed the whole period — but the cost sat at the
edges, and each edge taught the same lesson in a different place:

- **The framework promised automation and delivered manual work** where the
  canonical flow collided with its own validator: `spec new` creates the file,
  so every ADDED delta hit "target exists — refusing" and 9 of 9 applies ended
  in a by-hand merge.
- **A well-scoped gate applied globally becomes a veto**: ONE deliberately
  deferred capability (`Implementation: planned — <note>`, correctly declared)
  made `coverage --strict` red for the whole tree, which made `doctrina close`
  — the best idea in the CLI — unusable for every unrelated change.
- **A linter that does not speak the project's language teaches people to
  ignore it**: on a PT-BR project every `clarify` finding was a false positive
  ("some" = the verb *sumir*; "TODO o pensamento" = the pronoun *todo*), so
  the gate was permanently red.
- **Provenance froze at the intake**: capabilities born from brainstorms had
  no way to gain a product anchor, so 5 of 6 new specs carried `Realizes: n/a`
  while `trace` reported "14/14 ok" — blind, not clean. Specs also cited each
  other only in prose, invisible to `why`, `context`, and `review` (which
  detected 3 of 8 touched capabilities).
- **Standing constraints lived in agent memory**: the project's white-label
  rule ("never name company X") survived only as conversation, and the two
  remaining violations passed every gate.
- And the user reported a lifecycle gap outside the review: **npm updates the
  CLI, but nothing updates the project** that an older version init-ed.

The bound is unchanged: deterministic CLI, no natural-language interpretation
(ADR 0005), additive/opt-in wherever content is touched, "block, never
imprison" with a recorded escape hatch.

## Decision

1. **Close the mechanical-delta gap.** `change apply` treats an ADDED delta
   whose target is still the untouched `spec new` scaffold (template-compare,
   date-insensitive; placeholder fingerprints as fallback) as a whole-file
   replacement. Real content still refuses. The ops-block syntax is printed in
   the work playbook and `change apply --help`, not only the delta template.
2. **Scope the gates.** `coverage` gains `--only <caps>`; `close` derives the
   change's touched capabilities from its deltas and gates coverage on exactly
   those. Criteria in a spec with a *declared* deferral (`Implementation:
   planned — <note>`, the same escape hatch `validate` honours) report as
   `deferred` — visible in every output, never a `--strict` failure. Declared
   debt and hidden debt stop being punished identically.
3. **Make `clarify` language-aware.** Project language from
   `.doctrina/config.json` (`"language": "pt-BR"`) or a per-file stopword
   count; Portuguese mode swaps the lexicon (bare `TODO` is the pronoun, only
   `TODO:` is a marker). `<!-- clarify:ok -->` on a line is author-accepted —
   the recorded escape hatch for what no lexicon can know.
4. **Keep provenance alive.** `doctrina intent add` appends new `[SC]`
   anchors to product.md post-intake (auto-numbered; `intent list` shows
   them). A machine-readable `**Depends on:** caps` spec header feeds the
   index, `why` (both directions), `context <cap>` (dependencies join the
   pack), and `review` (dependents of touched capabilities are flagged;
   detection is also uncapped and unions changed specs).
5. **Make standing constraints artifacts.** `.doctrina/rules.json` holds
   forbid-regex rules over glob-scoped paths, each with its own message,
   enforced as errors by `validate`.
6. **Give evidence teeth, declared.** `coverage --run` executes cited
   evidence through the project-declared `"evidence_runner"` template
   (`{file}` placeholder) in verify.json. The CLI never guesses a runner.
7. **Close the lifecycle gap.** `doctrina upgrade [--write]` orchestrates
   `templates update` (additive-only) → index rebuild + stamp migration →
   `validate --fix`, bringing a project up to the installed CLI in one
   command. Preview by default.
8. **Ergonomics and papercuts.** `work --title` (slug/H1 from a short title,
   full prompt stays in Why); word-boundary slug truncation; playbook gains an
   ADR checkpoint and closes with `doctrina close`; `skill suggest` dedups by
   citation and slug similarity; `archive` stamps a still-`proposed` proposal
   `applied`; `design.md` is opt-in (`--design`); `spec set --version` sets and
   the output echoes the SPEC version (a global `--version` no longer shadows
   command flags).

## Alternatives considered

1. **New ops verbs for prose edits (append-after / replace-line)** instead of
   the ADDED-onto-scaffold fallback. Deferred: the field data shows the pain
   was the new-capability flow (whole-body writes), which the fallback solves
   with zero new syntax; prose rewriting remains an authored merge (ADR 0005).
2. **Per-criterion deferral markers** instead of the spec-level
   `Implementation: planned — <note>`. Rejected: it duplicates an escape
   hatch that already exists and that `validate` already honours; one
   declaration, every gate agrees.
3. **Auto-detecting the test runner for `coverage --run`.** Rejected: the CLI
   guessing pytest vs jest vs node --test is exactly the "pretend to
   understand" overreach the framework refuses; the runner is one declared
   line in verify.json.
4. **`upgrade` rewriting AGENTS.md's command surface.** Rejected: AGENTS.md is
   user content; the upgrade stays additive and `validate`'s drift check
   points at what a human/agent should refresh.
5. **YAML for rules/config.** Rejected: zero-dependency CLI; JSON parses with
   the stdlib.

## Consequences

**Positive**

- The apply step is mechanical for the two dominant delta shapes (new
  capability; bookkeeping ops); `close` is usable in a tree with declared
  deferrals; a PT-BR project gets a green, honest `clarify`; `trace` can stay
  complete as the project grows; standing constraints are lintable artifacts;
  a CLI update no longer strands existing projects.
- Dogfooded: this change (0001-review-followups) was opened with `work`,
  scoped by its own deltas, and closed with `close`.

**Negative**

- Command surface grows to 35 commands / 52 operations — the right-sizing
  (3.7) tension again. Mitigated: `intent`/`upgrade` are small, single-purpose,
  and the review itself demanded both.
- The scaffold-detection compare ties `apply` to the shipped spec template
  shape; a heavily customised project template falls back to fingerprints, and
  worst case the old refusal behaviour returns (never silent data loss).

**Neutral**

- `verify.json` now carries an optional `evidence_runner` string next to
  `checks`; `.doctrina/config.json` and `.doctrina/rules.json` are new,
  optional, and absent-by-default in the scaffold.

<!--
Once this ADR is accepted, do not edit it. To change the decision,
create a new ADR that supersedes this one and update the "Superseded by"
header above to point at the new ADR. Status transitions:
proposed -> accepted | rejected
accepted -> deprecated | superseded by NNNN
-->

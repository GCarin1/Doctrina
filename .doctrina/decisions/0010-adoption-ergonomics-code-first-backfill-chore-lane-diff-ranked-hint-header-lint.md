# ADR 0010 — Adoption ergonomics — code-first backfill, chore lane, diff-ranked hint, header lint

- **Status:** accepted
- **Date:** 2026-06-22
- **Deciders:**
- **Supersedes:** —
- **Superseded by:** —
- **Evidence:** —
- **Landed:** 2026-06-22 — `packages/doctrina-cli/src/commands/work.js`, `packages/doctrina-cli/src/commands/change.js`, `packages/doctrina-cli/src/commands/validate.js`

## Context

The FlowCore review's remaining, lower-severity items (**F8, F9, F10, G11**) share
a theme: the framework assumed a **greenfield, spec-first** flow, and that
assumption taxed the real cases where code already exists or a change does not
touch a spec:

- **F8 — no code-first path.** The reviewer (and any team adopting Doctrina on an
  *existing* project) often writes code first, then wants specs. `work` demanded
  a prompt and produced a spec-delta-first playbook; there was no way to say
  "here is the diff, help me backfill the spec that describes it."
- **F9 — no spec-less lane.** Infra/docs/build/migration changes legitimately
  touch no spec. They had no home: the reviewer squeezed them into a capability's
  "scope boundaries" or fabricated an empty delta. Cognitive tax, and dishonest
  history.
- **F10 — the capability hint ignored the diff.** `work`'s hint ranked specs by
  prompt term overlap only — weak for "continue"/vague prompts. The strongest
  signal (which files the working tree actually touched) was unused.
- **G11 — metadata-header footgun.** A header typed slightly wrong
  (`Status: active` without the bold) silently failed to parse; the index fell
  back to a default and drifted, with no warning.

The bound: none of this may compromise the spec-first **default** or have the CLI
interpret natural language (ADR 0005). Code-first is an explicit opt-in, not the
new norm; the hint stays a hint; the lint stays advisory.

## Decision

Add four targeted ergonomics, all opt-in, all deterministic:

1. **`doctrina work --from-diff` (F8) — code-first backfill.** Reads the
   working-tree changes (tracked + untracked, via read-only git), needs no
   prompt, scaffolds a change recording the changed files in the proposal's
   `## Why`, and prints a **backfill** playbook: *write the spec that describes
   what the code already does, mark each criterion `[unverified]` until a test
   proves it.* The spec-first default is untouched; `--from-diff` is the explicit
   "I have code, help me document it truthfully" path.

2. **`doctrina change new --chore` / `work --chore` (F9) — spec-less lane.** A
   chore is a change that touches no spec (infra/docs/build/migration). It runs
   the full proposal → apply → archive → ledger lifecycle (so the history is
   honest) without forcing a fake delta; the proposal records `Affects specs:
   (none — chore)`, and `work --chore` prints a playbook that drops the
   spec-delta steps.

3. **Diff-ranked capability hint (F10).** `work` now also ranks capabilities by
   the working tree — a changed file scores its capability when the file sits
   under a path segment named for it or the spec cites the file — and surfaces it
   (the primary ranking under `--from-diff`, an "also touched" line otherwise).
   Deterministic overlap, still a hint, never a decision.

4. **Header-shape lint (G11).** `validate` warns when a known metadata key in a
   spec's header block is not in the canonical `**Key:** value` form — turning
   the silent non-parse into a visible, fixable warning.

## Alternatives considered

1. **Make code-first the default (infer specs from the repo automatically).**
   Rejected: it inverts the framework's thesis (intent → spec → code) and would
   have the CLI guess intent from code. `--from-diff` keeps the human/agent
   authoring the spec; the CLI only gathers the diff and frames the task.
2. **A top-level `doctrina chore` command.** Rejected in favour of a `--chore`
   flag on the existing `change new` / `work`: less surface, reuses the whole
   change lifecycle (apply/archive/ledger) unchanged.
3. **`--from-diff` runs the test suite / infers tested-ness.** Rejected: that is
   `verify`/`coverage`'s job (ADR 0008). Backfilled criteria are `[unverified]`
   until proven, by construction — honest, and no runner coupling.
4. **Normalize headers on write instead of warning (G11).** Rejected for now:
   silent rewriting of a user's file is more surprising than a warning, and the
   parsers already tolerate the dash-optional variants. The lint catches the
   genuinely-broken forms without touching the file.

## Consequences

**Positive**

- Doctrina is adoptable on an **existing, in-progress** codebase: `--from-diff`
  turns "I have code, no specs" into a guided backfill; the chore lane gives
  spec-less work an honest home; the diff-ranked hint points at the right
  capability even when the prompt is thin.
- The header lint closes the last silent-drift footgun the review found.

**Negative**

- More command surface and flags (`--from-diff`, `--chore`/`--no-spec`) — in
  tension with right-sizing (3.7). Mitigated: all are opt-in and the spec-first
  default is unchanged.
- `--from-diff` depends on `git`; outside a repo (or with no changes) it errors
  clearly and does nothing else.

**Neutral**

- The diff-based ranker is a sibling of the term ranker, not a replacement;
  pinning (`--capability`) still overrides both.
- The chore lane keeps an empty `specs/` dir so the existing zero-delta
  apply/archive paths work unchanged.

<!--
Once this ADR is accepted, do not edit it. To change the decision,
create a new ADR that supersedes this one and update the "Superseded by"
header above to point at the new ADR. Status transitions:
proposed -> accepted | rejected
accepted -> deprecated | superseded by NNNN
-->

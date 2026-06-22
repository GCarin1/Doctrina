# ADR 0009 — Validate is the single source of drift truth — metadata-drift error, --fix, spec set

- **Status:** accepted
- **Date:** 2026-06-22
- **Deciders:**
- **Supersedes:** —
- **Superseded by:** —
- **Evidence:** —
- **Landed:** 2026-06-22 — `packages/doctrina-cli/src/commands/validate.js`, `packages/doctrina-cli/src/commands/spec.js`

## Context

A framework review (items **G5 / G7 / G8**) found that the project had **two
different truths about "is everything OK"**:

- **G5 — `validate` passed while `index rebuild --check` reported drift.** On a
  real change, `validate` printed "all checks passed" (exit 0) while
  `index rebuild --check` (run in the pre-commit hook) failed, because a spec's
  `Implementation:` text in `index.json` had drifted from the spec header (a
  backtick difference). The author trusted the green `validate` and was bitten by
  the red hook. Two gates, two verdicts, false confidence.
- **G7 — `index.json` is derived but hand-editable with no guard.** Nothing
  warned when the index was edited by hand and drifted from the tree; the author
  had to *learn by being burned* to "never edit the index, always rebuild."
- **G8 — spec version ↔ index version are coupled with a manual lockstep bump.**
  Bumping a spec meant editing the `Version:` header *and* the index entry by
  hand (and the implementation text in two places). Each manual step was a
  chance to diverge — the source of the G5/G7 drift.

ADR 0007 already removed the lockstep for the **change-apply** path (apply now
rebuilds the index from the tree). The gap that remains: any *other* edit (a
hand-tweaked spec header, a hand-edited index) can still drift, and `validate` —
the command an author runs to ask "am I OK?" — does not catch it.

The bound: the index has deliberate *advisory* divergences that must stay
warnings, not errors — an artifact on disk not yet indexed (orphan), a
`framework_version` stamp behind the CLI (an upgrade nudge), and a skill
description out of sync (its own `skill sync` workflow). Folding the *whole*
`index rebuild --check` into `validate` would flip all of those to hard errors
and over-rotate.

## Decision

Make **`validate` the single place that says whether the project is OK**, by
catching the drift that actually lies, and give the author one-step ways to keep
the index and spec headers in sync so they never have to hand-edit either.

1. **`validate` errors on index *metadata* drift.** For every artifact present
   in **both** the index and the tree (specs, decisions, changes,
   changes_archive, contracts), if the recorded metadata no longer matches what
   the file derives (version, implementation, status, ...), `validate` emits an
   **error** (exit 1), pointing at `validate --fix` / `index rebuild`. This is
   the G5 hole — the metadata that silently lies — promoted from a missed check
   to a gate.

2. **Presence and stamp stay advisory (deliberate boundary).** Orphan
   (on-disk-not-indexed) stays a warning; an indexed-but-missing file stays the
   existing error; `framework_version` divergence stays the existing warning
   (an upgrade nudge, ADR/3.6); a **skill** description out of sync stays its
   warning + `doctrina skill sync` workflow. `validate` is the single truth about
   *metadata that should already match*, not a re-skinned `index rebuild --check`.

3. **`validate --fix`** regenerates the index from the tree (a full rebuild that
   also absorbs orphans and migrates the stamp) before validating, so the author
   repairs drift with one command instead of a separate `index rebuild`.

4. **`doctrina spec set <cap> [--implementation|--status|--bump|--criterion]`**
   edits a spec's bookkeeping headers (and a criterion mark) and resyncs the
   index in one step, reusing the ADR 0007 structured ops. This removes the
   manual lockstep bump (G8): there is now no path where the author edits a spec
   header and must remember to edit the index too.

## Alternatives considered

1. **Fold the entire `index rebuild --check` into `validate` (full parity).**
   Rejected: it flips orphan/stamp/skill divergences — deliberately *advisory*
   today — into hard errors, breaking documented behaviour and over-blocking.
   The metadata-drift error closes the concrete G5 case without that collateral.
2. **Keep the spec-version drift as a warning (status quo).** Rejected: a warning
   leaves `validate` exit 0, which is exactly the false "all passed" the review
   faults. Drift of already-recorded metadata is an error.
3. **Make the index truly immutable (lock the file / refuse hand edits).**
   Rejected: heavy-handed and platform-specific; the derived-with-a-guard model
   (edit freely, `validate` catches drift, `--fix`/`rebuild` repairs) is lighter
   and matches how the rest of the framework treats derived artifacts.
4. **A general `spec set` that rewrites arbitrary spec prose.** Rejected: that
   crosses into semantic authorship the CLI must not own (ADR 0005). `spec set`
   touches only headers and criterion marks — the same bounded ops as
   `change apply`.

## Consequences

**Positive**

- One truth: `validate` now fails on the metadata drift that `index rebuild
  --check` would catch, so a green `validate` no longer hides a red hook (closes
  G5). `validate --fix` and `spec set` mean the author never hand-edits the index
  or bumps a version in two places (closes G7's "learn by being burned" and G8's
  lockstep).
- `spec set` reuses the ADR 0007 ops, so header edits are mechanical and the
  index stays in lockstep by construction.

**Negative**

- A previously-passing project with latent metadata drift will now see a
  `validate` error until it runs `--fix`/`rebuild` — a one-time, well-signposted
  migration cost.
- The advisory/error boundary (metadata = error; presence/stamp/skill = warning)
  is a judgement call a reader must learn; it is documented here and in the cli
  spec so the line is explicit, not folklore.

**Neutral**

- `validate` remains read-only by default; only `--fix` writes.
- The pre-commit hook (which runs `validate`) now also catches metadata drift,
  bringing it closer to the `index rebuild --check` it historically duplicated.

<!--
Once this ADR is accepted, do not edit it. To change the decision,
create a new ADR that supersedes this one and update the "Superseded by"
header above to point at the new ADR. Status transitions:
proposed -> accepted | rejected
accepted -> deprecated | superseded by NNNN
-->

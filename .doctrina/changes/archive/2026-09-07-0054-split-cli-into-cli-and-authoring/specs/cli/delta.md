# Spec Delta — capability: cli

**Operation:** MODIFIED
**Target spec on apply:** `.doctrina/specs/cli/spec.md`

<!--
For ADDED: include the full new spec body below. On apply, the body is
written verbatim to the target path.

For MODIFIED: prefer a fenced `ops` block — on apply the CLI executes it
against the target spec, all ops or none (ADR 0007). The verbs cover
headers, acceptance criteria, AND the EARS requirement bullets, so a
typical delta applies mechanically end to end; only free-prose rewrites
(Purpose, Maturity, ...) stay a by-hand merge. A MODIFIED delta with no
`ops` block prints a manual-merge pointer.

  ```ops
  set-header Implementation: verified — durable adapter (`src/db.ts`)
  bump-version minor
  set-criterion 1: verified
  append-criterion [unverified] new signal — verified by `test/x.test.ts`
  append-requirement event: When <trigger>, the system shall <action>.
  replace-requirement ubiquitous 2: The system shall <action>.
  ```

Requirement sections: ubiquitous | event | state | unwanted | optional.
append-* ops resolve numbering/position at APPLY time, so several open
changes appending to the same spec never collide on numbers — order of
application decides.

For REMOVED: the body may be empty; on apply, the target spec file is
deleted and the capability is recorded in the change archive only.
-->

---

<!-- delta body below -->

A MANUAL MERGE, deliberately: this delta removes content, and the ops
grammar has no `remove-requirement` verb — by design, because removing a
requirement is a decision a human should see in a diff rather than a verb
buried in a block. The `split-an-oversized-spec` skill prescribes the same:
move the requirement blocks VERBATIM, do not rewrite EARS prose while
moving, one change one intent.

What moved out of this spec, into the new `authoring` spec (its ADDED delta
carries the full body):

- **Ubiquitous** — the EARS requirement verbs an ops block supports, and the
  two lane rules (the classification is a hint, and an unclassifiable
  request defaults to PRODUCT).
- **Event-driven** — every requirement whose subject is a command that
  writes an artifact: `intake`, `work` (all of it: resume, from-diff,
  chore, the slug cap, the runtime hold, the lane record, the scaffolded
  delta), `spec new/set/list`, `change new/apply/abandon/archive/diff/
  check/tick`, `decision new/accept/supersede/land/list/scope`, `skill
  new/list/sync/suggest`, `contract new`, `intent add`, and `triage`.
- **Unwanted** — never mutating an accepted ADR's body, never auto-merging
  arbitrary MODIFIED prose, never executing an ops block inside an HTML
  comment, never reading a token substitution as authorship, never letting
  a recorded lane move a gate, and never scaffolding a delta from a
  ranked lead the length tie-breaker could have produced.
- **Acceptance criteria** — the ten proved by `test/lane-record.test.js`,
  `test/scaffolded-delta.test.js`, `test/runtime-commands.test.js`,
  `test/orchestration.test.js`, `test/context-retrieval.test.js` (decision
  scope) and `test/integration.test.js` (the hollow change, the ADR record).

What stayed: the surface itself — the executable, help and version, error
and hint prefixes, flag declaration and two-pass parsing, the five exit
classes, the JSON envelope, the git door, the lexicon, the usage log, the
shapes passed between modules — plus the gate-side requirements that read a
change's scaffold (`validate`, `analyze`) and the commands that recommend
work (`next`).

What changed in place: `## Purpose` now names what this spec owns and points
at the new capability, `## Out of scope` names it too, and the surviving
acceptance criteria are renumbered 1..28 with no gaps.

No requirement was rewritten, reworded, or dropped. This is the third split
of this spec — `gates` in July, `scaffolding` in August, `authoring` now —
and the seam each time was the one the Purpose already described: the
surface and its conventions on one side, the commands that do a particular
kind of work on the other.

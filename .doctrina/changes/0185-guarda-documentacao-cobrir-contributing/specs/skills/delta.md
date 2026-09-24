# Spec Delta — capability: skills

**Operation:** MODIFIED
**Target spec on apply:** `.doctrina/specs/skills/spec.md`

<!-- RANKED GUESS — no --capability was given. `doctrina work` picked
     `skills` by deterministic term overlap (score 134, beating `docs` (42)).
     It is a hint, never a decision (ADR 0005). If it is the wrong
     capability, delete this folder and write the right one instead:
         rm -r .doctrina/changes/0185-guarda-documentacao-cobrir-contributing/specs/skills
         .doctrina/changes/0185-guarda-documentacao-cobrir-contributing/specs/<capability>/delta.md
     Delete this comment once the capability is confirmed. -->

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

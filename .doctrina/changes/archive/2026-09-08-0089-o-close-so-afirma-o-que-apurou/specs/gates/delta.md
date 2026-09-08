# Spec Delta — capability: gates

**Operation:** MODIFIED
**Target spec on apply:** `.doctrina/specs/gates/spec.md`

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

```ops
append-requirement ubiquitous: The system shall derive a closing sequence's concluding claim from the steps that actually ran, naming the skipped ones, so the sentence can never assert a gate the run did not perform.
append-requirement unwanted: If a closing step has nothing to check, the system shall report that rather than reporting conformance, because a universal statement over an empty set is vacuously true and reads as a check performed.
append-criterion [verified] A close whose verify step was skipped does not report the change as verified and names the skip, while a close that runs every gate still claims all three — verified by `packages/doctrina-cli/test/the-close-claims-only-what-it-ran.test.js`.
append-criterion [verified] A step with nothing to check reports the absence, and a step with something to check reports how much it checked — verified by `packages/doctrina-cli/test/the-close-claims-only-what-it-ran.test.js`.
bump-version minor
```

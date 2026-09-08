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
append-requirement unwanted: If a quantifier appears inside an interrogative phrase such as "how many", the system shall not report it as a vague term, because the phrase names the number the requirement demands rather than leaving one unstated.
append-requirement ubiquitous: The system shall evaluate a clarity rule against the end of the preceding line as context, reporting only matches that begin on the line being scanned, so a phrase split across a line break gets the same verdict as an unwrapped one.
append-criterion [verified] "how many" passes while a bare quantifier still smells, across a line break included, and a number after the quantifier still exempts it — verified by `packages/doctrina-cli/test/a-question-is-not-vagueness.test.js`.
append-criterion [verified] The preceding line is read as context and never as content: its own smell is reported once, on its own line — verified by `packages/doctrina-cli/test/a-question-is-not-vagueness.test.js`.
bump-version minor
```

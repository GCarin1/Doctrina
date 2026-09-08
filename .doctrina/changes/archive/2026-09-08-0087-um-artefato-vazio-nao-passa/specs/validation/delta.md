# Spec Delta — capability: validation

**Operation:** MODIFIED
**Target spec on apply:** `.doctrina/specs/validation/spec.md`

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
append-requirement unwanted: If an artifact the framework owns holds no content, or holds content with no title heading, the system shall report it as an error rather than as a well-formed artifact, because a header comparison finds nothing to disagree with in a file that has no headers.
append-criterion [verified] Every artifact kind — product, spec, ADR, proposal, contract and skill — is caught when emptied, and whitespace alone is not content — verified by `packages/doctrina-cli/test/an-empty-artifact-does-not-pass.test.js`.
append-criterion [verified] Content with no title, and a title that exists only inside a comment, are both reported, while a well-formed tree stays clean — verified by `packages/doctrina-cli/test/an-empty-artifact-does-not-pass.test.js`.
bump-version minor
```

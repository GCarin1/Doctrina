# Spec Delta — capability: core

**Operation:** MODIFIED
**Target spec on apply:** `.doctrina/specs/core/spec.md`

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
To take one out: `remove-requirement <section> <n>` / `remove-criterion <n>`
(the criteria after it renumber; write removals highest number first).
append-* ops resolve numbering/position at APPLY time, so several open
changes appending to the same spec never collide on numbers — order of
application decides.

For REMOVED: the body may be empty; on apply, the target spec file is
deleted and the capability is recorded in the change archive only.
-->

---

<!-- delta body below -->

```ops
append-requirement ubiquitous: The system shall read every text file with LF line endings whatever the file stores, and shall write an existing file back with the line ending it already has, so that a checkout storing CRLF answers every command as its LF twin and a rewrite never mixes endings.
append-requirement ubiquitous: The system shall write `index.json` whole — to a temporary file moved over it — and shall read the next change number and create the change folder under one project lock, so that commands run at the same moment neither read half an index nor open two changes under one number.
append-criterion [verified] A CRLF file is read as LF and rewritten as CRLF; a CRLF project validates with the output of its LF twin and a change cycle leaves the spec, the proposal and the tasks CRLF throughout; eight `doctrina work` at once exit 0 with eight numbers, eight index entries and no lock left — verified by `packages/doctrina-cli/test/a-setima-auditoria-fecha-fim-de-linha-conflito-e-concorrencia.test.js`.
set-header Source: `packages/doctrina-cli/src/lib/{dates,fs-ops,lock}.js`
bump-version minor
```

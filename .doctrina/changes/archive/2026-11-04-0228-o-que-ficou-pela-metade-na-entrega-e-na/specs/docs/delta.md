# Spec Delta — capability: docs

**Operation:** MODIFIED
**Target spec on apply:** `.doctrina/specs/docs/spec.md`

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
set-header Source: `docs/**`, `scripts/check-docs.js`, `CHANGELOG.md`, `README*.md`, `packages/doctrina-cli/README.md`, `SECURITY.md`, `CONTRIBUTING.md`, `CONVENTIONS.md`
append-criterion [verified] The end-to-end guide's Phase 0 and Phase 1 run as written against the CLI, from an empty workspace to a closed delivery, every `close` gate included — verified by `packages/doctrina-cli/test/o-guia-de-ponta-a-ponta-roda-como-escrito.test.js`.
bump-version minor
```

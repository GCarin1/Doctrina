# Spec Delta — capability: insight

**Operation:** MODIFIED
**Target spec on apply:** `.doctrina/specs/insight/spec.md`

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
append-requirement event: When `doctrina prime` or `doctrina prime --pulse` lists an open change that carries a delivery, the system shall name that delivery beside it.
append-criterion [verified] `prime` and the pulse name the delivery an open change carries — verified by `packages/doctrina-cli/test/o-fluxo-da-entrega-nao-tem-furos.test.js`.
append-requirement event: When `doctrina context` assembles the change in focus without `--full`, the system shall leave out the HTML comments of its proposal, tasks and deltas — the templates' authoring instructions — and say so in each item's note.
append-criterion [verified] The change in focus is read without the delta template's comment, its ops kept, and `--full` restores the comment — verified by `packages/doctrina-cli/test/o-pacote-de-contexto-e-enxuto.test.js`.
bump-version minor
```

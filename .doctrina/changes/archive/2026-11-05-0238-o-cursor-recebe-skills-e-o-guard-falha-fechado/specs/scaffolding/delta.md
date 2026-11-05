# Spec Delta — capability: scaffolding

**Operation:** MODIFIED
**Target spec on apply:** `.doctrina/specs/scaffolding/spec.md`

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
append-requirement event: When `doctrina upgrade --write` or `doctrina adapter add <name>` runs where the adapter's retired files are installed, the system shall write each replacement where it is missing, remove each retired file still as the CLI wrote it, and keep and name each one edited since; in a shadowed repository it shall write in the shadow and re-link the repository.
append-criterion [verified] upgrade moves an older Cursor install to skills and keeps an edited command — verified by `packages/doctrina-cli/test/o-cursor-recebe-skills-e-o-guard-falha-fechado.test.js`.
append-criterion [verified] in a shadowed repository the skills go to the shadow and are linked in, with nothing showing in the repository's git — verified by `packages/doctrina-cli/test/o-cursor-recebe-skills-e-o-guard-falha-fechado.test.js`.
bump-version minor
```

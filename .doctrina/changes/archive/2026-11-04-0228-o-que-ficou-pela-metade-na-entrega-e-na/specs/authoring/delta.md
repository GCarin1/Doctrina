# Spec Delta — capability: authoring

**Operation:** MODIFIED
**Target spec on apply:** `.doctrina/specs/authoring/spec.md`

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
append-requirement event: When `doctrina work --resume <change> --delivery <id>` runs on a change that carries no delivery, the system shall write `- **Delivery:** <id>` into its proposal; on a change that already belongs to another delivery it shall refuse with the precondition class.
append-requirement ubiquitous: The system shall keep the line ending a change file already uses when `change tick` ticks its boxes or `work` writes its Why, its pinned capability or its `Delivery:` line, so a CRLF checkout does not see every line of the file change.
append-criterion [verified] `work --resume --delivery` stamps a CRLF proposal and `change tick` ticks a CRLF tasks file, neither leaving a line that ends in LF alone — verified by `packages/doctrina-cli/test/um-arquivo-crlf-continua-crlf.test.js`.
append-criterion [verified] `change delta` given two --requirement, two --criterion and two --op writes them as six ops in the order given, then the bump — verified by `packages/doctrina-cli/test/o-change-delta-escreve-as-ops.test.js`.
replace-requirement event 61: When `change delta <id> <capability>` is given requirements, criteria, a bump or op lines, the system shall write them into the change's MODIFIED delta for that capability — creating it from the template when absent — parsed by the grammar `apply` reads, one op for every `--requirement`, `--criterion` and `--op` given, in the order given, with a later bump replacing an earlier one, and shall write nothing unless the whole block applies to the spec.
append-criterion [verified] `change check --verbose` previews an ops delta as the spec before against the spec after apply — the new requirement and the bumped version as changes, unchanged lines as context — verified by `packages/doctrina-cli/test/o-change-delta-escreve-as-ops.test.js`.
bump-version minor
```

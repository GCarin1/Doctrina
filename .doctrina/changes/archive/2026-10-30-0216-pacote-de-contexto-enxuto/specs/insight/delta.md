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
set-header Source: `packages/doctrina-cli/src/commands/{context,search,show,status,prime,handoff,report,why}.js`, `packages/doctrina-cli/src/lib/{snapshot,views,constitution-model,ledger,git,diff,context-slice}.js`
append-criterion [verified] On this repository `context gates --for "verify reuse fingerprint" --concat` stays within 10k tokens, omits AGENTS.md, digests the ADRs and slices the spec keeping the `verify --reuse` requirement, while `--full` is at least three times larger and includes AGENTS.md; the slice keeps headers, Purpose and an item's continuation lines and names each gap, and a spec the query does not touch stays whole — verified by `packages/doctrina-cli/test/o-pacote-de-contexto-e-enxuto.test.js`.
replace-requirement event 5: When `doctrina context [<capability>]` runs, the system shall print the context pack in the documented read order — `product.md`, the capability spec when given (or every active spec when no capability is named, so the current truth is never absent), open changes, ADRs with status `accepted` — with per-file line counts and token estimates (chars/4) plus the pack total, and a separate on-demand list of skills (name, description, and when-trigger only, never the body); the pack shall be lean unless `--full` is given: AGENTS.md, which every agent loads already, not repeated, each accepted ADR as a digest of its title and the opening of its Decision, and, with `--for`, the task's spec and its dependencies sliced to their headers, Purpose and the requirements and criteria the task matches best, each gap named in place. The change archive and non-accepted ADRs shall be excluded. With `--concat`, the system shall print the contents with path separators instead of the list. The command is strictly read-only.
bump-version minor
```

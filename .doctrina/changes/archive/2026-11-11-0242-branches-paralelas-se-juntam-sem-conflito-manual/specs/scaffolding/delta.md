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
append-requirement event: When `doctrina hooks install` runs inside a git repository that owns its `.doctrina/`, the system shall add to `.gitattributes` — only where missing — the lines that merge `index.json` through the `doctrina-index` driver and the ledger through `union`, and set that driver in the git config of the clone to the installing CLI by path, before the hook is written and also when an existing hook refuses it.
append-criterion [verified] `hooks install` writes the two `.gitattributes` lines once and the driver into the git config, and two branches that each closed a change then merge with no conflict in the index or the ledger, the merged index being the one a rebuild derives — verified by `packages/doctrina-cli/test/branches-paralelas-se-juntam.test.js`.
set-header Source: `packages/doctrina-cli/src/commands/{init,adapter,templates,hooks,index-rebuild,upgrade,watch,metrics,completion}.js`, `packages/doctrina-cli/src/lib/{adapters,scan,index-json,index-merge,merge-setup,metrics-model,usage,config}.js`
bump-version minor
```

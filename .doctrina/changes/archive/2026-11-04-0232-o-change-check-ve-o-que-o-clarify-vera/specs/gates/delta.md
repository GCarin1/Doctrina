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
append-requirement event: When `doctrina change check <id>` dry-runs a MODIFIED delta's ops, the system shall scan the spec the ops produce with the clarify lexicons and warn, naming the delta and the word, of every smell the merged spec would have that the current one does not — advisory, never a failure.
append-criterion [verified] `change check` warns of the weasel and vague words a delta writes, not of one the spec already had, and never as a failure — verified by `packages/doctrina-cli/test/o-change-delta-escreve-as-ops.test.js`.
set-header Source: `packages/doctrina-cli/src/commands/{coverage,trace,review,verify,analyze,clarify,close,doctor,ci}.js`, `packages/doctrina-cli/src/lib/{gates,coverage-model,trace-model,analysis,clarity,clarify-scan,reproducibility,signoff,runtime,docs-impact,verify-cache}.js`, `scripts/bench.js`, `scripts/e2e-packed.mjs`, `action.yml`
bump-version minor
```

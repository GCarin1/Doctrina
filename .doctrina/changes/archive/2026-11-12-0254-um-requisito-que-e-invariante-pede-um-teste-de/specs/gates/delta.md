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
append-requirement event: When `doctrina coverage --properties` runs, the system shall list, per capability, the requirements whose wording claims something of all inputs — round-trip, idempotence, bound, uniqueness, order or a plain invariant, in English and Portuguese — each with the property it suggests, together with the number of criteria already marked `[property]` and the property library the project's manifests point at, and exit 0.
append-requirement event: When `doctrina change delta` appends a requirement that reads as an invariant and the same call claims no property, the system shall print one note per such requirement naming its shape, and the `--property` command once.
append-requirement unwanted: The system shall not count a criterion marked `[property]` as covered when no test file it cites generates its inputs (Hypothesis, fast-check, jqwik, proptest, quickcheck, rapid, FsCheck, ScalaCheck); it is reported unguarded and fails `coverage --strict`.
append-criterion [verified] A `[property]` criterion citing an example test is reported unguarded and fails `coverage --strict`, the same criterion citing a Hypothesis test is covered, and `validate` accepts the mark while refusing an unknown one — verified by `packages/doctrina-cli/test/um-requisito-que-e-invariante-pede-uma-propriedade.test.js`.
append-criterion [verified] `coverage --properties` lists the requirements that read as invariants with the more specific shape first, leaves out a one-event requirement, names the library the project declares and exits 0; `change delta --property` writes an `append-criterion [property]` op, and `change delta --requirement` notes an invariant once — verified by `packages/doctrina-cli/test/um-requisito-que-e-invariante-pede-uma-propriedade.test.js`.
set-header Source: `packages/doctrina-cli/src/commands/{coverage,trace,review,verify,analyze,clarify,close,doctor,ci}.js`, `packages/doctrina-cli/src/lib/{gates,coverage-model,trace-model,analysis,clarity,clarify-scan,reproducibility,signoff,runtime,docs-impact,verify-cache,install,properties}.js`, `scripts/bench.js`, `scripts/e2e-packed.mjs`, `scripts/release.mjs`, `action.yml`
bump-version minor
```

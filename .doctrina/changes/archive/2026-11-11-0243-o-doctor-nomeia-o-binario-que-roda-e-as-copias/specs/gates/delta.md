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
append-requirement event: When `doctrina doctor` runs, the system shall report the install that is running and every other `doctrina` the PATH holds with its version, as a warning when the first one on the PATH is not the one running, when more than one is there, or when none is there while an agent hook of the project calls `doctrina` by name; and, in a git repository that owns its `.doctrina/`, whether `.gitattributes` and the merge driver of the clone are in place.
append-criterion [verified] `doctor` reports a CLI run by path with no `doctrina` on the PATH as ok, names an older install found first on the PATH with its version as the one the hooks run, warns when a hook calls `doctrina` by name and the PATH holds none, and reports the merge setup as missing before `hooks install` and in place after it — verified by `packages/doctrina-cli/test/o-doctor-nomeia-o-binario-que-roda.test.js`.
set-header Source: `packages/doctrina-cli/src/commands/{coverage,trace,review,verify,analyze,clarify,close,doctor,ci}.js`, `packages/doctrina-cli/src/lib/{gates,coverage-model,trace-model,analysis,clarity,clarify-scan,reproducibility,signoff,runtime,docs-impact,verify-cache,install}.js`, `scripts/bench.js`, `scripts/e2e-packed.mjs`, `action.yml`
bump-version minor
```

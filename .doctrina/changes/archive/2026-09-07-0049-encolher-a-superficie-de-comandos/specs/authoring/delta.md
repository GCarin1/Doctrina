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
append-* ops resolve numbering/position at APPLY time, so several open
changes appending to the same spec never collide on numbers — order of
application decides.

For REMOVED: the body may be empty; on apply, the target spec file is
deleted and the capability is recorded in the change archive only.
-->

---

<!-- delta body below -->

The pre-close dry-run absorbs the delta preview, so one command answers both
"would this apply?" and "what would it look like afterwards?".

```ops
replace-requirement event 35: When `doctrina change check <id...>` runs, the system shall report, read-only: analyze's structural findings, every MODIFIED delta's ops block executed in memory against its target spec, the archive-gate blockers, and an advisory list of accepted ADRs whose text cites the touched capabilities; with `--verbose` it shall additionally print, per delta, what applying it would do to its target — the same preview the deprecated `change diff` prints.
append-criterion [verified] Every line `change diff` prints appears in `change check --verbose`, and the plain check stays the summary it was — verified by `packages/doctrina-cli/test/deprecation.test.js`.
bump-version minor
```

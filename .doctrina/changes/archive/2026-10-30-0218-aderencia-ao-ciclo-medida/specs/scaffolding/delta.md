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
append-requirement ubiquitous: The system shall report, in `metrics`, the share of code commits that carried a change — touched `.doctrina/changes/` or named a change in the subject — counting as code only commits that touch something outside the Doctrina tree, the agents' configuration and prose, keep it in a saved snapshot and its trend, and, from the usage sample, report `context`, `close` and `prime` runs per `work`.
append-criterion [verified] Of three code commits two carried a change (0.667), docs-only and Doctrina-only commits are not counted, a window with no code reports no rate, the trend follows the rate, and `metrics --commands` prints 0.5 context and 1.0 close per work for its sample — verified by `packages/doctrina-cli/test/a-aderencia-ao-ciclo-e-medida.test.js`.
bump-version minor
```

# Spec Delta — capability: templates

**Operation:** MODIFIED
**Target spec on apply:** `.doctrina/specs/templates/spec.md`

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

```ops
append-requirement ubiquitous: The system shall state what a template recommendation costs against the declared budget it spends from, whenever following that recommendation would write into a file with a declared ceiling.
append-requirement unwanted: If appending the recommended stub sections would take AGENTS.md past its declared line ceiling, the system shall decline to append them and shall report the shortfall, rather than resolving one gate's recommendation by breaching another gate's refusal.
append-criterion [verified] With room, the recommendation and its remedy are unchanged and the applied cost equals the estimate; without room, the finding names the cost and the remedy names the cut — verified by `packages/doctrina-cli/test/a-recommendation-states-its-cost.test.js`.
append-criterion [verified] Without room `templates update --write` stands down leaving the file untouched, and making the room it asks for clears the hold — verified by `packages/doctrina-cli/test/a-recommendation-states-its-cost.test.js`.
bump-version minor
```

# Spec Delta — capability: delivery

**Operation:** MODIFIED
**Target spec on apply:** `.doctrina/specs/delivery/spec.md`

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
append-requirement event: When `doctrina delivery check <id>` runs, the system shall also require the delivery's own record — a `## Story` with text, every `## Release` box ticked and a `## Observability` with at least one line beyond its comment — naming each gap, because the changes prove the code and only the record proves the delivery reached its users and was watched after it did.
append-requirement event: When `doctrina delivery list` runs, the system shall print each delivery's age — open days, or lead time from `Date` to `Closed` once closed — and the median and longest lead time over the closed ones.
append-criterion [verified] With every routed change archived, `delivery check` still exits 1 naming an empty Story, each unticked Release box and an empty Observability, and exits 0 once they are written; `delivery list` prints the lead time and the median — verified by `packages/doctrina-cli/test/a-entrega-atravessa-repositorios.test.js`.
bump-version minor
```

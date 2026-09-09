# Spec Delta — capability: cli

**Operation:** MODIFIED
**Target spec on apply:** `.doctrina/specs/cli/spec.md`

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

O ADR 0018 declara cinco classes de saída; o consumidor só as usa se cada
uma quiser dizer uma coisa só. A tabela de exit codes desta spec ainda
listava três — o merge à mão que acompanha estes ops corrige-a para as
cinco do ADR.

```ops
append-requirement event: When a command is given a reference that does not resolve — a capability, a change id, an ADR number, a requirement or an acceptance criterion — the system shall report the usage class and name the reference, because the invocation is what has to change.
append-requirement unwanted: The system shall not report a reference that does not resolve with the class reserved for a failed gate, and shall not report it as success.
append-requirement unwanted: The system shall not refuse a view that found nothing; a listing or a search with no result shall say so and exit successfully.
append-criterion [verified] A reference that does not resolve costs the usage class in every command that takes one, and a capability an open change is staging a delta for is not one — verified by `packages/doctrina-cli/test/the-exit-contract-holds.test.js`.
append-criterion [verified] No view refuses when it finds nothing, and no class that was already right — success, a gate that measured and failed, a malformed invocation — moved — verified by `packages/doctrina-cli/test/the-exit-contract-holds.test.js`.
bump-version minor
```

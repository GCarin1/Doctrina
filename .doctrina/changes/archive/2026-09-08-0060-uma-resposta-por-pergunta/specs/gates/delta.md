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
append-* ops resolve numbering/position at APPLY time, so several open
changes appending to the same spec never collide on numbers — order of
application decides.

For REMOVED: the body may be empty; on apply, the target spec file is
deleted and the capability is recorded in the change archive only.
-->

---

<!-- delta body below -->

## What changes

Um passo declarado sem runner passa a ter uma resposta só, e é a que o
`doctor` já dava: reportar a lacuna e nomear o comando, em vez de o `close`
subir um segundo processo do próprio binário por um caminho que passo nenhum
alcança. E um export de `lib/` sem consumidor nenhum vira drift detectável,
no mesmo formato que o projeto já usa para flags e comandos.

```ops
bump-version minor
append-requirement event: When a step declared in a gate sequence has no runner in the driver executing it, the system shall report that step as unimplemented and name the command that answers it, in every driver alike.
append-requirement unwanted: The system shall not run its own binary as a subprocess to satisfy a step of a sequence it is already executing.
append-criterion [verified] Every step the close declares has a runner, the close starts no subprocess of its own binary, and close and doctor describe a runnerless step the same way — verified by `packages/doctrina-cli/test/export-drift.test.js`.
append-criterion [verified] No export under `src/lib/` is referenced by nothing at all, a seam reached only by tests is reported apart from dead surface rather than failed, and a newly orphaned export is caught — verified by `packages/doctrina-cli/test/export-drift.test.js`.
```

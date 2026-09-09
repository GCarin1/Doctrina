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

## What changes

O envelope JSON passa a carregar a depreciação num campo próprio — o
substituto, a versão a partir da qual o nome antigo é legado e o porquê. A
linha em prosa continua no stderr real, para quem está no terminal, e o
stdout de nenhum comando muda.

```ops
bump-version minor
append-requirement event: When a superseded command name is invoked with `--json`, the system shall include the replacement command, the version from which the old name is legacy, and the reason in the JSON envelope, in addition to the notice it writes to standard error.
append-requirement unwanted: The system shall not add a deprecation field to the envelope of a command that is not superseded, and shall not alter the standard output of a superseded command.
append-criterion [verified] A superseded command and a superseded two-word operation both carry `deprecated` in the envelope, a command that is not superseded has no such key at all, and the captured stdout is exactly the human output — verified by `packages/doctrina-cli/test/deprecation.test.js`.
```

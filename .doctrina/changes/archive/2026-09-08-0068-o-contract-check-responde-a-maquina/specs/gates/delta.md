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

O `contract check` passa a construir o próprio payload — `contracts`,
`checked`, `unchecked`, `declared_rows`, `findings` e um `verdict` — em vez
de devolver a prosa capturada num envelope cujo único sinal era o `ok`. O
consumidor ramifica pelo `verdict`, do mesmo jeito que a change 0061 deu à
depreciação um campo próprio. O código de saída não muda em caso nenhum: a
change 0029 decidiu, e continua valendo.

Como um módulo com vários subcomandos é nativo para uns e não para outros, o
`jsonNative` passa a poder ser um predicado sobre os argumentos — o
`contract new` e o `contract list` seguem com o envelope capturado.

```ops
bump-version minor
append-requirement event: When `contract check` runs with JSON output requested, the system shall emit a payload distinguishing a runtime surface that was verified from one that was never declared, and shall emit nothing else on standard output.
append-criterion [verified] An undeclared surface reports `verdict: unchecked` at exit 0, a declared one that holds reports its row count, a declaration that does not hold carries its findings with code, level, message and remedy, the payload parses as the whole of stdout, and the other contract subcommands keep the captured envelope — verified by `packages/doctrina-cli/test/runtime-commands.test.js`.
```

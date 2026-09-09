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

O gate de docs passa a reconhecer a superfície que o **projeto checado**
declara — as tabelas Ports, Environment, Wiring, Selectors e a seção
Interfaces do contrato dele — em vez de só o catálogo de comandos do próprio
Doctrina. E, para a superfície que uma change está *acrescentando* (que por
definição ainda não está no contrato), reconhece por forma: uma rota, um
método HTTP diante de uma rota, um identificador de variável de ambiente.

Um projeto sem contrato mantém exatamente o comportamento de antes. A dica de
remediação só nomeia diretório que contém prosa.

```ops
bump-version minor
append-requirement event: When deciding whether a change must carry documentation, the system shall recognise as documented surface the names the checked project declares in its own contracts, and shall fall back to its own command catalog only for a project that declares none.
append-requirement event: When a change names a route, an HTTP method with a route, or an environment-variable identifier in a code span, the system shall treat it as documented surface even when no contract declares it yet.
append-requirement unwanted: The system shall not offer, as a place to write documentation, a directory of the checked project that contains no prose.
append-criterion [verified] A command, an environment variable and a configuration key an adopting project declares each produce a signal; an endpoint and a variable being added produce one by shape; a purely internal change produces none; and a project with no contract behaves exactly as before — verified by `packages/doctrina-cli/test/docs-gate-reads-the-contract.test.js`.
```

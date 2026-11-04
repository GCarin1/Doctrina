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
append-requirement ubiquitous: The system shall quote every path and title it interpolates into a printed command line, so that the shell reads each back verbatim: double quotes for plain text, single quotes when the text holds a quote, a backtick, `$`, `\` or `!`.
append-criterion [verified] a printed line carrying a hostile tracker title and a path with a space runs as printed and executes nothing — verified by `packages/doctrina-cli/test/a-quarta-auditoria-fecha-as-entradas-hostis.test.js`.
set-header Source: `packages/doctrina-cli/src/index.js`, `packages/doctrina-cli/src/commands/next.js`, `packages/doctrina-cli/src/lib/{commands,args,flag-catalog,exit-codes,json-out,colors,suggest,version,project,prompt,actions,shell}.js`, `tsconfig.json`
bump-version minor
```

# Spec Delta — capability: structure

**Operation:** MODIFIED
**Target spec on apply:** `.doctrina/specs/structure/spec.md`

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
append-requirement ubiquitous: The system shall resolve a `**Source:**` pattern from its leading literal directories only, reading no deeper than the pattern names unless it holds `**` or ends in `/`, so that a pattern with a literal segment after a wildcard matches under every directory the wildcard stands for.
append-criterion [verified] `tsconfig.json` matches the file at the root and not one a dependency ships, `src/*.js` stays in one directory, `src/**/*.js` and `src/lib/` span directories, `pkg/*/src/main.js` matches under each package although `pkg/src` exists, and a bounded walk returns the levels asked for while following a linked directory — verified by `packages/doctrina-cli/test/o-validate-nao-varre-o-repositorio-inteiro.test.js`.
bump-version patch
```

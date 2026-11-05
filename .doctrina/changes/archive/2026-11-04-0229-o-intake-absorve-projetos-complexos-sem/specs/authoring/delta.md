# Spec Delta — capability: authoring

**Operation:** MODIFIED
**Target spec on apply:** `.doctrina/specs/authoring/spec.md`

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
append-requirement ubiquitous: The system shall print, in the bootstrap and absorb playbooks, the rules that keep a spec to what its source states — no requirement without the intake sentence or the code that does it, numbers and messages verbatim, a contradiction or a missing value as a question — and a step that checks the facts before the gates: the bootstrap rereads the intake sentence by sentence, the absorb hands each spec to a reader that did not write it.
append-requirement unwanted: If a declared script is long-running, interactive or npm's `no test specified` placeholder, or a unit has test files and declares no runner for them, then the code inventory shall not offer it to `verify --init`, and shall list it with the reason instead.
append-criterion [verified] On reductions of five public projects the inventory reads every build a polyglot repository declares, a full-stack monorepo's units, package manager and areas, a Spring app's own name, feature packages and entry point, interfaces, delivery and migrations, never names or reads a real `.env`, and names the facts it had no access to — verified by `packages/doctrina-cli/test/o-intake-le-o-projeto-inteiro.test.js`.
append-criterion [verified] `--watch`, `--ui` and the npm placeholder are listed and not seeded, and test files with no declared runner seed nothing — verified by `packages/doctrina-cli/test/o-intake-le-o-projeto-inteiro.test.js`.
append-criterion [verified] The bootstrap playbook prints the no-invention rules and the sentence-by-sentence check before the gates — verified by `packages/doctrina-cli/test/playbooks.test.js`.
replace-requirement event 65: When `doctrina intake --from-code` runs, the system shall store the code inventory of the current directory as `.doctrina/intake.md` with `Status: pending` — read from the whole repository, not its root: every unit (a directory with its own manifest) with its build, name, package manager, frameworks and test count; the workspace tooling; languages by file extension; candidate areas inside each unit, a JVM tree's feature packages included; entry points; interfaces (OpenAPI, protobuf, GraphQL, AsyncAPI, route folders); migrations and schemas; CI and runtime manifests at any depth; env example NAMES, never values, and the real env files named as present and not read; the documentation, decisions and agent instructions that already exist; and the facts it had no access to — each fact with the file it came from — and print the absorb playbook.
bump-version minor
```

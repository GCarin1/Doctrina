# Spec Delta — capability: workspace

**Operation:** MODIFIED
**Target spec on apply:** `.doctrina/specs/workspace/spec.md`

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
append-criterion [verified] The workspace help's Usage line names every subcommand the command dispatches, `tool` and `guard` included — verified by `packages/doctrina-cli/test/o-help-lista-todo-subcomando.test.js`.
append-requirement ubiquitous: The system shall name no tool product as the default in its own output: a workspace with no tool declared is pointed at `doctrina workspace tool <name> --server <mcp-server> --for <roles>`, with the presets listed as presets.
append-criterion [verified] After a project is absorbed in its repository and an executor model is edited into `workspace.json`, `workspace list` rewrites the hub to `ready` and the executor to that model, and a second list writes nothing; with no tool declared, the list and the hub point at a generic declaration — verified by `packages/doctrina-cli/test/o-orquestrador-sabe-o-que-pode-usar.test.js`.
replace-requirement event 11: When the workspace is written by `init`, `add`, `attach`, `detach` or `tool`, or listed by `list`, the system shall regenerate at its root the orchestrator files — `AGENTS.md`, `.cursor/rules/00-doctrina-workspace.mdc`, `.cursor/hooks.json` and `.claude/settings.json` merged with the operator's, `.claude/agents/doctrina-<role>.md` for executor and reviewer and for qa and observer when a tool serves them, and `<name>.code-workspace` listing every repository — writing only a file whose content differs, so a project absorbed in its own repository or an executor model edited into `workspace.json` reaches them without a workspace write.
bump-version minor
```

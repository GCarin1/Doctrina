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
append-requirement event: When `doctrina workspace tool <name>` runs, the system shall declare or update a tool — its MCP server name, from a preset (jira, confluence, figma, playwright, datadog, databricks, sql) or `--server`, its roles, its purpose and its access, `read` unless `--access write` — and with `--remove` take it out; a tool with no preset and no `--server` is a usage error.
append-requirement event: When `doctrina workspace guard --hook cursor|claude` reads an MCP call on stdin, the system shall answer in that agent's format — deny a call that would write through a server declared read-only, ask the human for a write through a server declared read/write, allow a read — deciding a write from a SQL statement in the input when there is one and from the verbs in the tool's name otherwise, and shall give no opinion on a server the workspace does not declare.
append-requirement event: When the workspace is written by `init`, `add`, `attach`, `detach` or `tool`, the system shall regenerate at its root the orchestrator files — `AGENTS.md`, `.cursor/rules/00-doctrina-workspace.mdc`, `.cursor/hooks.json` and `.claude/settings.json` merged with the operator's, `.claude/agents/doctrina-<role>.md` for executor and reviewer and for qa and observer when a tool serves them, and `<name>.code-workspace` listing every repository.
append-requirement event: When `doctrina prime` runs at a workspace root, the system shall print the orchestrator primer — projects and state, open deliveries, tools, the next step — with `--pulse` the open deliveries in one line, and with `--hook` the primer followed by the workspace AGENTS.md.
append-requirement unwanted: If the guard cannot read the call, then the system shall not block it: it answers allow and exits 0.
append-criterion [verified] A tool takes its preset, one without needs `--server`, `--access` validates and `--remove` removes; the generated hub, rule, hooks (merged), subagents and code-workspace follow the registry; the guard denies a read-only write, asks a declared write, allows a read and an undeclared server in both agent formats and never blocks on bad input; `prime` at the root is the orchestrator primer — verified by `packages/doctrina-cli/test/o-orquestrador-sabe-o-que-pode-usar.test.js`.
set-header Source: `packages/doctrina-cli/src/lib/workspace.js`, `packages/doctrina-cli/src/lib/workspace-tools.js`, `packages/doctrina-cli/src/lib/workspace-agents.js`, `packages/doctrina-cli/src/commands/workspace.js`
bump-version minor
```

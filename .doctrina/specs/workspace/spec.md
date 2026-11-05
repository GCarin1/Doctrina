# Spec — Workspace

**Capability:** workspace
**Status:** active
**Implementation:** implemented
**Realizes:** n/a — internal framework capability; product success criteria measure adopting-team outcomes, not the tool's own surface
**Source:** `packages/doctrina-cli/src/lib/workspace.js`, `packages/doctrina-cli/src/lib/workspace-locate.js`, `packages/doctrina-cli/src/lib/workspace-guard.js`, `packages/doctrina-cli/src/lib/workspace-tools.js`, `packages/doctrina-cli/src/lib/workspace-agents.js`, `packages/doctrina-cli/src/lib/workspace-view.js`, `packages/doctrina-cli/src/commands/workspace.js`
**Last updated:** 2026-11-03
**Version:** 0.8.0

## Purpose

Define how Doctrina holds the context of more than one repository in
one place (ADR 0029): a workspace directory, kept by its owner as a private
git repository, that registers each repository the work touches, says
what it is and what it depends on, and — for a repository that cannot
carry `.doctrina/` — holds the artifacts themselves, linked into the
repository and hidden from its git.

The workspace is what an orchestrating agent reads to decide which
repositories a delivery touches; each repository keeps running the
single-repository cycle it always ran.

## Requirements (EARS)

### Ubiquitous

- The system shall keep a workspace as a directory holding `workspace.json` (schema `doctrina_workspace`, the name, the projects, the tools and the agent models), `projects/` and `deliveries/`.
- The system shall register each project with a name matching `[a-z0-9][a-z0-9._-]*`, its repository path, its mode (`in-repo` or `shadow`), and optionally a role, a one-line description and the names of the registered projects it depends on.
- The system shall keep a shadow project's artifacts under `<workspace>/projects/<name>/` and never commit anything into the shadowed repository.
- The system shall find the workspace from `$DOCTRINA_WORKSPACE`, else the current directory or an ancestor holding `workspace.json`, else the real path of a shadow's `.doctrina` link, else the pointer `workspace init` wrote under `$DOCTRINA_HOME` (default `~/.doctrina`) when that workspace lists the current directory.
- The system shall name no tool product as the default in its own output: a workspace with no tool declared is pointed at `doctrina workspace tool <name> --server <mcp-server> --for <roles>`, with the presets listed as presets.
- The system shall write the `doctrina workspace guard` hook into the Cursor and Claude Code hook files of every shadowed project, beside the workspace root's.
- The system shall treat as a write any MCP call whose input carries, under any key or nesting, SQL that changes state — `CALL`, `EXEC`, `COPY` and `SELECT … INTO` included — or whose `action`, `operation` or `method` argument names a write, or that sends a GraphQL `mutation`.

### Event-driven

- When `doctrina workspace init [<dir>]` runs, the system shall create the workspace, initialise it as a git repository unless `--no-git` is passed, and record its path in the `$DOCTRINA_HOME` pointer; on a directory that already is a workspace it shall exit 3 and change nothing.
- When `doctrina workspace add <path>` runs, the system shall register the repository as `in-repo` when it already has its own `.doctrina/` and as `shadow` otherwise, unless `--mode` says which, and shall refuse with exit 3 a path that is not a directory, a name or a path already registered, and a shadow over a repository that has its own `.doctrina/`.
- When a shadow project is added, the system shall scaffold `AGENTS.md`, `.doctrina/` and the agent adapter named by `--agent` (default `cursor`) under its shadow directory, then attach it.
- When a shadow project is attached, the system shall link `.doctrina/` into the repository as one directory link (a junction on Windows) and every other shadow file as its own file link — falling back to a hard link, then to a copy that it names — and shall leave a path the repository already has untouched, reporting it as kept.
- When a shadow project is attached, the system shall write the linked paths, and the skill-export folders the repository does not track, into a marked block of the repository's `.git/info/exclude`, replacing that block on every attach and leaving the rest of the file as it was.
- When `doctrina workspace attach <name> --path <dir>` runs, the system shall record the new repository path before linking.
- When `doctrina workspace detach <name>` runs, the system shall remove each link the shadow put in the repository — never what a link points at — and the exclude block, and keep the shadow.
- When `doctrina workspace list` runs, the system shall print each project with its mode, its state — `ready` when it has a capability spec and no pending intake, `pending` when it still has to be absorbed, `missing` when its path is gone — and its open changes.
- When `doctrina workspace tool <name>` runs, the system shall declare or update a tool — its MCP server name, from a preset (jira, confluence, figma, playwright, datadog, databricks, sql) or `--server`, its roles, its purpose and its access, `read` unless `--access write` — and with `--remove` take it out; a tool with no preset and no `--server` is a usage error.
- When `doctrina workspace guard --hook cursor|claude` reads an MCP call on stdin, the system shall answer in that agent's format — deny a call that would write through a server declared read-only, ask the human for a write through a server declared read/write, allow a read — deciding a write from a SQL statement in the input when there is one and from the verbs in the tool's name otherwise, and shall give no opinion on a server the workspace does not declare.
- When the workspace is written by `init`, `add`, `attach`, `detach` or `tool`, or listed by `list`, the system shall regenerate at its root the orchestrator files — `AGENTS.md`, `.cursor/rules/00-doctrina-workspace.mdc`, `.cursor/hooks.json` and `.claude/settings.json` merged with the operator's, `.claude/agents/doctrina-<role>.md` for executor and reviewer and for qa and observer when a tool serves them, and `<name>.code-workspace` listing every repository — writing only a file whose content differs, so a project absorbed in its own repository or an executor model edited into `workspace.json` reaches them without a workspace write.
- When `doctrina prime` runs at a workspace root, the system shall print the orchestrator primer — projects and state, open deliveries, tools, the next step — with `--pulse` the open deliveries in one line, and with `--hook` the primer followed by the workspace AGENTS.md.
- When `doctrina next` runs at a workspace root, the system shall list the workspace's next actions in the order they unblock work — re-link a missing repository, absorb a pending one, route a delivery, open its change in each routed repository, hand the next card, close a change whose tasks are ticked, clear the delivery's record gap with the command that clears it, close the delivery, or open one — and shall never name `doctrina init` there.
- When `doctrina handoff`, `doctrina status` or `doctrina validate` runs at a workspace root, the system shall describe the workspace — projects with their state, open deliveries with each routed repository's changes, the next actions; the validate checks the registry, every shadow's links and every delivery's status and routed projects, exiting 1 on an error.
- When `doctrina context` runs at a workspace root, the system shall rank the registered projects against the task and print, for each, the command that reads its pack inside the repository.
- When `doctrina prime` runs in a repository that a workspace registers, the system shall name the workspace and every open delivery routed to the repository with this repository's change for it.
- When a registered project's intake is stored and still pending, the system shall name `doctrina intake` to resume its absorb at the workspace root, never `--from-code`, which refuses it.
- When `doctrina validate` runs at a workspace root and a project's `package.json` depends on the package another registered project publishes without a `dependsOn` edge to it, the system shall warn and name `doctrina workspace attach <name> --depends-on <a,b>`.
- When `doctrina workspace attach <name> --depends-on <a,b>` runs, the system shall replace the project's `dependsOn` with the registered names given, and refuse with exit 2 a name that is not another registered project.
- When `doctrina validate` runs at a workspace root that declares tools, the system shall warn of each in-repo project whose `.cursor/hooks.json` or `.claude/settings.json` runs no `doctrina workspace guard`.
- When a command finds no `.doctrina/` in a clone of a repository the workspace shadows elsewhere, the system shall name `doctrina workspace attach <name> --path <clone>` from the workspace, and `doctrina init` shall refuse with exit 3 unless `--force`.
- When a tool is declared or `validate` runs at the workspace root, and an MCP configuration is readable, the system shall warn of each declared server that no configuration names, naming a key that differs only in case.
- When a shadowed project's folder in the workspace is gone, the system shall name `doctrina workspace attach <name>`, and `attach` shall scaffold the shadow again after warning to restore it from the workspace's git.
- When `doctrina doctor` or `doctrina metrics` runs at a workspace root, the system shall answer for the workspace and print the command that runs it in each project.
- When the Claude-format `workspace guard` runs under Cursor with no opinion on the call, the system shall answer the Claude-format allow instead of nothing, and read the server from Cursor's own payload.

### Unwanted behavior

- If no workspace can be found, then the system shall not guess one: it shall exit 3 naming `doctrina workspace init` as the remedy.
- If the guard cannot read the call, then the system shall not block it: it answers allow and exits 0.

## Acceptance criteria

A workspace is spec-compliant when:

1. [verified] `workspace init` creates `workspace.json`, `projects/`, `deliveries/` and a git repository, records the pointer, and refuses a second init with exit 3 — verified by `packages/doctrina-cli/test/o-contexto-mora-num-workspace.test.js`.
2. [verified] A repository with its own `.doctrina/` registers in-repo; one without registers as a shadow whose artifacts live in the workspace, and `doctrina work` run inside the repository writes the change into the shadow — verified by `packages/doctrina-cli/test/o-contexto-mora-num-workspace.test.js`.
3. [verified] After attach, `git status` in the shadowed repository is clean, the exclude block lists the links, and an existing `.cursor/hooks.json` of the repository is kept — verified by `packages/doctrina-cli/test/o-contexto-mora-num-workspace.test.js`.
4. [verified] `detach` removes the links and the block and leaves the shadow's files in place — verified by `packages/doctrina-cli/test/o-contexto-mora-num-workspace.test.js`.
5. [verified] `workspace list` reports a project without specs as pending and points at `doctrina intake --from-code` — verified by `packages/doctrina-cli/test/o-contexto-mora-num-workspace.test.js`.
6. [verified] The exclude block is replaced, never duplicated, and the text around it survives — verified by `packages/doctrina-cli/test/o-contexto-mora-num-workspace.test.js`.
7. [verified] A tool takes its preset, one without needs `--server`, `--access` validates and `--remove` removes; the generated hub, rule, hooks (merged), subagents and code-workspace follow the registry; the guard denies a read-only write, asks a declared write, allows a read and an undeclared server in both agent formats and never blocks on bad input; `prime` at the root is the orchestrator primer — verified by `packages/doctrina-cli/test/o-orquestrador-sabe-o-que-pode-usar.test.js`.
8. [verified] The workspace help's Usage line names every subcommand the command dispatches, `tool` and `guard` included — verified by `packages/doctrina-cli/test/o-help-lista-todo-subcomando.test.js`.
9. [verified] After a project is absorbed in its repository and an executor model is edited into `workspace.json`, `workspace list` rewrites the hub to `ready` and the executor to that model, and a second list writes nothing; with no tool declared, the list and the hub point at a generic declaration — verified by `packages/doctrina-cli/test/o-orquestrador-sabe-o-que-pode-usar.test.js`.
10. [verified] At the workspace root `next` walks absorb, open, card, close, story, release tick, observability and delivery close, never naming init, and still names init outside any workspace — verified by `packages/doctrina-cli/test/a-orientacao-funciona-na-raiz-do-workspace.test.js`.
11. [verified] `handoff`, `status` (and `--json`), `validate` and `context --for` answer at the root, validate finding a missing shadow link and a delivery routed to an unregistered project, `prime` in a repository names its workspace and open delivery, and the generated hub names `next` and `handoff` — verified by `packages/doctrina-cli/test/a-orientacao-funciona-na-raiz-do-workspace.test.js`.
12. [verified] the root's `next` resumes a stored inventory with a bare `intake` — verified by `packages/doctrina-cli/test/a-segunda-auditoria-fecha-o-fluxo-multi-repo.test.js`.
13. [verified] an undeclared package dependency warns at the root, and `attach --depends-on` clears it — verified by `packages/doctrina-cli/test/a-segunda-auditoria-fecha-o-fluxo-multi-repo.test.js`.
14. [verified] a shadow's hooks run the guard, and an unguarded in-repo project is named — verified by `packages/doctrina-cli/test/a-terceira-auditoria-fecha-os-caminhos-de-falha.test.js`.
15. [verified] a second clone of a shadowed repository is pointed at attach, and init plants nothing there — verified by `packages/doctrina-cli/test/a-terceira-auditoria-fecha-os-caminhos-de-falha.test.js`.
16. [verified] the guard reads writes in every place an input carries them, and reads stay reads — verified by `packages/doctrina-cli/test/a-quarta-auditoria-fecha-as-entradas-hostis.test.js`.
17. [verified] a declared server no configuration names is reported — verified by `packages/doctrina-cli/test/a-quarta-auditoria-fecha-as-entradas-hostis.test.js`.
18. [verified] doctor and metrics answer at the root, and a lost shadow is scaffolded again — verified by `packages/doctrina-cli/test/a-quarta-auditoria-fecha-as-entradas-hostis.test.js`.
19. [verified] under Cursor the Claude-format guard never answers a permission hook with nothing — verified by `packages/doctrina-cli/test/a-sexta-auditoria-confere-o-cursor.test.js`.
20. [verified] the Cursor files the CLI writes use only the hook events and rule fields Cursor documents — verified by `packages/doctrina-cli/test/a-sexta-auditoria-confere-o-cursor.test.js`.

## Out of scope for this spec

- Calling any external tool: the workspace describes repositories and
  tools; the agent acts.
- Moving or cloning repositories: the operator clones; the workspace
  records where.

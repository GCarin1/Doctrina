# Spec — Workspace

**Capability:** workspace
**Status:** active
**Implementation:** implemented
**Realizes:** n/a — internal framework capability; product success criteria measure adopting-team outcomes, not the tool's own surface
**Source:** `packages/doctrina-cli/src/lib/workspace.js`, `packages/doctrina-cli/src/commands/workspace.js`
**Last updated:** 2026-11-03
**Version:** 0.1.0

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

### Event-driven

- When `doctrina workspace init [<dir>]` runs, the system shall create the workspace, initialise it as a git repository unless `--no-git` is passed, and record its path in the `$DOCTRINA_HOME` pointer; on a directory that already is a workspace it shall exit 3 and change nothing.
- When `doctrina workspace add <path>` runs, the system shall register the repository as `in-repo` when it already has its own `.doctrina/` and as `shadow` otherwise, unless `--mode` says which, and shall refuse with exit 3 a path that is not a directory, a name or a path already registered, and a shadow over a repository that has its own `.doctrina/`.
- When a shadow project is added, the system shall scaffold `AGENTS.md`, `.doctrina/` and the agent adapter named by `--agent` (default `cursor`) under its shadow directory, then attach it.
- When a shadow project is attached, the system shall link `.doctrina/` into the repository as one directory link (a junction on Windows) and every other shadow file as its own file link — falling back to a hard link, then to a copy that it names — and shall leave a path the repository already has untouched, reporting it as kept.
- When a shadow project is attached, the system shall write the linked paths, and the skill-export folders the repository does not track, into a marked block of the repository's `.git/info/exclude`, replacing that block on every attach and leaving the rest of the file as it was.
- When `doctrina workspace attach <name> --path <dir>` runs, the system shall record the new repository path before linking.
- When `doctrina workspace detach <name>` runs, the system shall remove each link the shadow put in the repository — never what a link points at — and the exclude block, and keep the shadow.
- When `doctrina workspace list` runs, the system shall print each project with its mode, its state — `ready` when it has a capability spec and no pending intake, `pending` when it still has to be absorbed, `missing` when its path is gone — and its open changes.

### Unwanted behavior

- If no workspace can be found, then the system shall not guess one: it shall exit 3 naming `doctrina workspace init` as the remedy.

## Acceptance criteria

A workspace is spec-compliant when:

1. [verified] `workspace init` creates `workspace.json`, `projects/`, `deliveries/` and a git repository, records the pointer, and refuses a second init with exit 3 — verified by `packages/doctrina-cli/test/o-contexto-mora-num-workspace.test.js`.
2. [verified] A repository with its own `.doctrina/` registers in-repo; one without registers as a shadow whose artifacts live in the workspace, and `doctrina work` run inside the repository writes the change into the shadow — verified by `packages/doctrina-cli/test/o-contexto-mora-num-workspace.test.js`.
3. [verified] After attach, `git status` in the shadowed repository is clean, the exclude block lists the links, and an existing `.cursor/hooks.json` of the repository is kept — verified by `packages/doctrina-cli/test/o-contexto-mora-num-workspace.test.js`.
4. [verified] `detach` removes the links and the block and leaves the shadow's files in place — verified by `packages/doctrina-cli/test/o-contexto-mora-num-workspace.test.js`.
5. [verified] `workspace list` reports a project without specs as pending and points at `doctrina intake --from-code` — verified by `packages/doctrina-cli/test/o-contexto-mora-num-workspace.test.js`.
6. [verified] The exclude block is replaced, never duplicated, and the text around it survives — verified by `packages/doctrina-cli/test/o-contexto-mora-num-workspace.test.js`.

## Out of scope for this spec

- Calling any external tool: the workspace describes repositories and
  tools; the agent acts.
- Moving or cloning repositories: the operator clones; the workspace
  records where.

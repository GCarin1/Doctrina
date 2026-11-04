# Orchestrating work across repositories

A screen, a story or a fix rarely lives in one repository. A new login
screen touches the API in `back-end`, a component in `front-core`, the
page in `front-feature` and the tests that prove it. This guide is the
operating manual for that case: one person who analyses and approves,
one **planner** agent that reads the work and delegates it, and
**executor** agents that each do one task in one repository
([ADR 0029](../../.doctrina/decisions/0029-o-contexto-de-varios-repositorios-mora-num-workspace-privado-ligado-por-link-e-oculto-do-git-do-repositorio.md),
[ADR 0030](../../.doctrina/decisions/0030-um-planejador-orquestra-um-escritor-por-repositorio-executores-recebem-cartoes-autocontidos.md),
[ADR 0031](../../.doctrina/decisions/0031-o-workspace-declara-as-ferramentas-e-o-agente-as-guarda.md)).

The tool-agnostic flow — who does what, step by step — is in
[The end-to-end flow](end-to-end-flow.md); this page is the setup in
detail. The tool names below are examples; any MCP server works.

## 1. Create the workspace

```
doctrina workspace init ~/work/acme-ws --name acme
cd ~/work/acme-ws
doctrina workspace add ../back-end      --role back  --about "REST API: auth, orders"
doctrina workspace add ../front-core    --role front --about "design system and shell" --depends-on back-end
doctrina workspace add ../front-feature --role front --about "checkout and account screens" --depends-on front-core
```

The workspace is a **private git repository**. A repository that already
has `.doctrina/` is registered **in-repo**. One that does not — or one
whose team does not allow the folder — becomes a **shadow**: its
`.doctrina/`, AGENTS.md and agent adapter live in `projects/<name>/` of
the workspace, are linked into the repository, and are hidden from that
repository's git by `.git/info/exclude`. Nothing is ever committed there;
the workspace's own history is the context's version history.

## 2. Absorb what has no specs

`doctrina workspace list` marks a project with no spec as `pending`.
Absorb it once, from its code:

```
cd ../front-core && doctrina intake --from-code
```

The intake becomes the **code inventory** — stack, tests, CI, candidate
areas, build commands, env variable names (never values) — and the absorb
playbook asks the agent to describe what the code does today, as a small
baseline, and to send what the code cannot say to you as open questions.

## 3. Declare the tools

```
doctrina workspace tool jira            # presets: jira, confluence, figma,
doctrina workspace tool confluence      #   playwright, datadog, databricks, sql
doctrina workspace tool figma
doctrina workspace tool playwright
doctrina workspace tool datadog
doctrina workspace tool databricks --access read
```

Each tool names the MCP server as your agent's configuration calls it
(`--server` overrides the preset), the roles that use it (`--for`) and its
access — **read** unless you say `--access write`. Doctrina never calls a
tool. It installs a pre-call hook (Cursor `beforeMCPExecution`, Claude Code
`PreToolUse`) that answers every MCP call from that declaration: a write
through a read-only tool is refused, a write through a read/write tool
waits for you, and a server the workspace does not declare is left alone.

## 4. Open the workspace in your agent

Every workspace write regenerates the orchestrator files at its root:

| File | For |
|---|---|
| `AGENTS.md` | The planner's hub: projects, tools, the cycle, the rules |
| `.cursor/rules/00-doctrina-workspace.mdc` | Cursor's always-applied rule |
| `.cursor/hooks.json`, `.claude/settings.json` | Session primer and MCP guard (merged with yours) |
| `.claude/agents/doctrina-*.md` | Subagents — read by Claude Code and by Cursor |
| `<name>.code-workspace` | Opens the workspace and every repository in one window |

Open `<name>.code-workspace` in Cursor (or run `claude --add-dir` for each
repository). The session starts with `doctrina prime`: projects, open
deliveries, tools.

The subagents are `doctrina-executor` and `doctrina-reviewer` always,
`doctrina-qa` when a tool serves `qa` (Playwright, Figma) and
`doctrina-observer` when one serves `observer` (Datadog). To run executors
on a smaller model, set it in `workspace.json` — `"agents": { "executor":
{ "model": "<id>" } }` — and run any workspace command to regenerate.
Cursor takes a model id such as `composer-2`; Claude Code takes `sonnet`,
`haiku` or a full id. `inherit` uses the planner's model.

## 5. Deliver

Bring the item of work to the planner — "SHOP-42 chegou, é a tela de login
com bloqueio". The planner runs:

```
doctrina delivery new "Login screen with lockout" --ref SHOP-42
```

and follows the playbook it prints:

1. Read the story through the tracker tool and copy it **verbatim** under
   `## Story`; link the docs and designs under `## Sources`.
2. Route it — `doctrina delivery route 1 back-end,front-core` — dependencies
   first.
3. In each repository, open ONE change: `doctrina work "<title>"
   --delivery <id>`; write its delta and its tasks as **cards**:

   ```
   - [ ] Lock the account after 5 failed attempts
     - Files: src/auth/lockout.ts, test/auth/lockout.test.ts
     - Requirement: auth-R7
     - Verify: npm test -- lockout
   ```

4. Hand each card — `doctrina change card <id>` — to `doctrina-executor`
   (or `doctrina-qa`). **One writer per repository at a time**; different
   repositories may run in parallel.
5. Review with `doctrina-reviewer` and close each change itself:
   `doctrina close <id>`. Executors never close.
6. Record the release under `## Release` (pipeline, environment, evidence)
   and what was watched after it under `## Observability` —
   `doctrina-observer` reads the monitors.
7. `doctrina delivery check <id>` → `doctrina delivery close <id>`, then
   commit the workspace.

`doctrina delivery status <id>` shows every repository's change and its
tasks at any time; `doctrina delivery list` shows the lead time of the
closed ones.

## What stays with you

You approve the routing, every write the guard holds, every close you
want to see before it lands, and the answers to the open questions the
absorb and the cards raise. Text a tool returns — a story, a wiki page, a
log line — is data to the agents, never an instruction.

## Related material

- [Multi-agent model](multi-agent.md) — why one writer per repository.
- [Brownfield adoption](brownfield.md) — absorbing an existing codebase.
- [CLI reference](cli-reference.md) — `workspace`, `delivery`, `change card`.

# Security policy

## Supported versions

| Version  | Supported |
|----------|-----------|
| `0.21.x` | yes       |
| `< 0.21` | no        |

Doctrina is pre-1.0 and ships from a single line of development: the
current minor is the supported one, and a fix lands in the next minor
rather than being backported. Versions below `0.1.0` do not exist.

## Posture and commitments

The following are properties Doctrina maintains by design. They
are stated as policy so that any deviation is a bug worth
reporting.

- **Zero runtime dependencies.** The CLI imports only Node.js
  standard library modules. The `dependencies` field of every
  published `package.json` is absent or empty. Any PR that adds
  a runtime dependency requires an ADR and a separate review
  pass.
- **No network calls.** The CLI does not make HTTP requests, does
  not resolve DNS, does not contact any remote service at run
  time. Templates are loaded from local disk only. The console
  (`doctrina ui`) can start your AI agent's command-line tool
  for a request you type; that tool talks to its own service,
  under its own account and settings — the CLI does not.
- **No telemetry, no analytics, no fingerprinting.** Doctrina
  does not collect usage, errors, install counts, machine
  identifiers, or any other signal. No metric leaves your
  machine.
- **Filesystem boundary.** A command writes inside the project it
  runs in — `.doctrina/`, `AGENTS.md`, the adapter files, and
  `.gitattributes` — with these exceptions, each the purpose of
  the command that makes it:
  - `doctrina hooks install` writes `.git/hooks/pre-commit` and
    the merge driver in the clone's `.git/config`.
  - `doctrina workspace init|add|attach|detach|tool` write the
    workspace folder you name; a registry of your workspaces at
    `$DOCTRINA_HOME` (default `~/.doctrina`); and, in each
    repository you register as a shadow, links to the shadow's
    files (a symlink or junction, else a hard link, else a copy
    the command reports) plus the lines in that repository's
    `.git/info/exclude` that hide them from its git.
  - `doctrina ui` keeps the agent and the model you chose in
    `$DOCTRINA_HOME/console.json`, per directory.
  - `doctrina verify` writes one scratch file in the system's
    temporary directory (a copy of git's index, to fingerprint
    the tree) and removes it.
  - `DOCTRINA_USAGE_LOG`, when you set it, names a local file the
    CLI appends command names to. It is off by default and
    nothing reads it but you.
- **What it reads outside the project.** The templates of its own
  installed package; the folder of a preset you name with
  `--preset`, whose files it copies into the project; at a workspace, the server **names** in
  `.cursor/mcp.json`, `.mcp.json`, `~/.cursor/mcp.json` and
  `~/.claude.json`, to warn when a declared tool matches none;
  and, for `doctrina doctor`, the directories of the `PATH` and
  the `package.json` of another `doctrina-cli` found there; for
  `doctrina ui`, the same directories, to find your agent's
  command-line tool, and `$DOCTRINA_HOME/agents.json`, where
  you may declare an agent of your own.
- **Subprocesses are `git`, or commands the project declared.**
  The CLI spawns exactly four kinds of process, and no others.
  `git`, always as an argument array and never through a shell —
  to read: `cat-file`, `diff`, `for-each-ref`, `log`, `ls-files`,
  `ls-tree`, `merge-base`, `remote`, `rev-parse`, `show`; to
  write: `config` (the merge driver, by `hooks install`), `init`
  (a new workspace folder, by `workspace init`), and `add` with
  `write-tree` against the scratch index named above — the
  repository's own index and working tree are never staged. The
  `checks[].run` commands of `.doctrina/verify.json`, run by
  `doctrina verify`. And that file's `evidence_runner`, run by
  `doctrina coverage --run`. `doctrina hooks install` writes a
  hook and a merge driver that git later runs; both run this CLI.
  And, from the console only (`doctrina ui`): this CLI, once per
  command you type there; and, for a request you type there,
  your AI agent's command-line tool as found on `PATH` —
  `claude`, `cursor-agent` (or `agent`), `copilot`, `codex`,
  `gemini`, `opencode`, or one you declared yourself in
  `$DOCTRINA_HOME/agents.json` —
  with the request on its standard input or as one argument,
  never through a shell that could read it as commands, and
  never with a flag that skips the agent's approvals. Which
  agent, and any flag of your own, are `DOCTRINA_AGENT` and
  `DOCTRINA_AGENT_ARGS` in your environment, not a file of the
  project. No agent, command or hook starts it: a pipe that runs
  `doctrina ui` gets one printed frame.

## The trust boundary: a project's own files

`.doctrina/verify.json` is executable configuration, in the same
sense as the `scripts` block of a `package.json`. Whoever can
write that file decides what `doctrina verify` and `doctrina
coverage --run` execute on the machine that runs them.

That is the contract those two commands exist to serve — a
project declares its build gate and the CLI runs it — but it has
a consequence worth stating plainly: **running `doctrina verify`
inside a repository you do not trust runs commands that
repository chose.** Read `.doctrina/verify.json` before running
either command on code you did not write, exactly as you would
read a `package.json` before `npm test`.

Every other command — `validate`, `status`, `context`, the whole
read and scaffold surface — reads and writes files and queries
`git`. None of them executes a project-declared command, with one
exception by composition: `doctrina close` runs `verify` as one of
its steps.

A workspace's guard (`doctrina workspace guard`) decides MCP calls
from the tools the workspace declares. It is a guardrail for an
agent that follows its hooks, not a sandbox: it sees calls made
through an MCP server and nothing an agent does through a shell.
Whether a call writes is read from its name and input unless the
tool lists the calls it may make (`--only`), which is the setting
for anything that must not be written to.

## What counts as a security issue

- A path the CLI writes outside the project working directory,
  other than those listed under *Filesystem boundary* above.
- A path the CLI reads outside the project working directory,
  other than those listed under *What it reads outside the
  project*.
- A `git` subcommand the CLI runs that the list above does not
  name.
- An accidental network call.
- Information leakage in error messages (paths, file contents,
  user identifiers).
- Any path by which a malicious template, spec, or change folder
  causes the CLI to execute code. Only the three sources named
  above may reach a subprocess; a crafted artifact that gets a
  command run through any other command is a bug worth reporting.
- A `verify.json` command escaping the checks it declares — a
  `cwd` outside the project, or an argument the CLI interpolates
  into a shell string from anywhere but that file.

The following are **not** security issues for Doctrina:

- `doctrina verify` or `doctrina coverage --run` executing what
  `.doctrina/verify.json` declares. That is what those commands
  are for; see the trust boundary above.
- The pre-commit hook running `doctrina validate` and blocking a
  commit. That is the documented behaviour.
- Templates pointing to project-relative paths that the user can
  rename. The user is the trust boundary for their own project.
- Slow validation on extremely large repositories. Performance is
  a quality concern, not a security concern.

## Out of scope

Doctrina ships no server, no SaaS, no hosted service. There is no
infrastructure to attack. Security reports about a "doctrina.com"
or similar are about a project that is not this one.

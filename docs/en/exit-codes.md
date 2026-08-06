# Exit codes

Every `doctrina` command exits with one of five codes. The code is a
**contract**: it tells a machine consumer what to do next, without parsing
any English. Pair it with `--json` and an agent never reads prose.

## The five classes

| Code | Class | Meaning | What you should do |
|------|-------|---------|--------------------|
| `0` | OK | Success. Warnings are allowed. | Continue. |
| `1` | GATE | A gate failed — **the work is not ready**. | Fix the work, then retry the same command. |
| `2` | USAGE | **The invocation is wrong** — unknown command, missing or malformed argument. | Do not retry unchanged. Correct the command line. |
| `3` | PRECONDITION | **A precondition is missing** — the project is not set up for this yet. | Run the setup command named in the error, then retry. |
| `4` | ENVIRONMENT | **The environment cannot run this** — a tool is absent, the tree is unreadable. | Stop. Retrying will not help. |

`doctrina --help` prints the same table, generated from the same source,
so the two cannot drift.

## Why this matters

Before this contract, code `1` meant three different things:

- `doctrina validate` failing — *your change is not ready*
- `doctrina verify` with no `verify.json` — *this project is not configured*
- `doctrina metrics` on a repo with no commits — *this machine cannot run it*

The first means iterate. The second means run a different command first.
The third means give up. An autonomous loop that cannot tell them apart
either spins forever on an unfixable failure or abandons a fixable one.

## Reading the classes in practice

**`1` — the work.** `validate`, `analyze`, `coverage --strict`,
`trace --strict`, `close`, `verify` with a check that failed, and any
refused lifecycle transition. Something you wrote needs changing.

**`2` — the command line.** An unknown command or subcommand, a missing
required argument, a malformed id. Retrying the same string will fail the
same way.

**`3` — the setup.** Running outside a Doctrina project (`doctrina init`),
`verify` with no `.doctrina/verify.json` (`doctrina verify --init`),
`intake` with nothing stored and no description given. The error names
the command that clears it; the CLI prints it as a `hint:` line.

**`4` — the machine.** Reserved for conditions no retry fixes: a required
external tool missing, an unreadable tree. Note that "this is not a git
repository" is usually **not** a `4` — commands that can degrade
gracefully without git do so and exit `0`.

## For agents

```
0 -> continue
1 -> fix the work, retry the same command
2 -> correct the invocation; do not retry unchanged
3 -> run the setup command from the `hint:` line, then retry
4 -> stop
```

A forced transition (`--force`) turns a refusal into a success and records
the gap in `.doctrina/changes/archive/LEDGER.md`, so a `0` obtained by
forcing is still visible in the history.

See ADR 0018 for the reasoning and the alternatives considered.

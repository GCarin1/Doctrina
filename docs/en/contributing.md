# Contributing

Thanks for considering a contribution. This page summarises how to work
with the repository; the canonical, always-up-to-date rules live in
[CONTRIBUTING.md](https://github.com/GCarin1/Doctrina/blob/main/CONTRIBUTING.md).

## Quick start

```sh
git clone https://github.com/GCarin1/Doctrina.git
cd Doctrina
node packages/doctrina-cli/src/index.js --help        # smoke test
cd packages/doctrina-cli && npm test                  # run the suite
node packages/doctrina-cli/src/index.js validate      # self-validate
```

Requires Node.js 20.12 or newer. There are zero runtime dependencies and
zero dev dependencies — `npm install` is a no-op.

## The two workflows (read this first)

Using the wrong workflow is the single most common contributor mistake.

**Workflow A — evolving Doctrina itself** (CLI, templates, framework
specs, shipped docs): use **Conventional Commits** with direct commits.
Do **not** use `doctrina change new`; the change workflow is for projects
that *use* Doctrina, and `.doctrina/changes/archive/` in this repository
must stay empty.

```
feat(cli): add doctrina skill list command
fix(validate): handle missing index gracefully
docs(brownfield): clarify retroactive ADR pattern
```

**Workflow B — projects that use Doctrina**: the full
`change new → apply → archive` cycle, documented in
[Workflow](workflow.md).

## What a good PR looks like

- **Spec first.** If you change CLI behaviour, update
  `.doctrina/specs/cli/spec.md` in the same PR and bump its `Version:`.
- **Tests.** Integration tests spawn the real CLI against a temp
  project; add one per new behaviour (`packages/doctrina-cli/test/`).
- **Gates green.** `npm test`, `doctrina validate`,
  `doctrina index rebuild --check`, and `doctrina clarify --all` all run
  in CI on three OSes — run them locally first.
- **Bilingual docs.** User-facing docs change in `docs/en/` **and**
  `docs/pt/`. EN is the source; PT is the translation, never the
  reverse.

## Good first contributions

- A new agent adapter (under 30 lines — see
  [Adapters](adapters.md) and the existing ones as references).
- A translation fix or parity gap between `docs/en/` and `docs/pt/`.
- A failing-case integration test for an edge you hit in real use.

## Reporting issues

Use the [issue templates](https://github.com/GCarin1/Doctrina/issues/new/choose).
For security matters, follow
[SECURITY.md](https://github.com/GCarin1/Doctrina/blob/main/SECURITY.md)
instead of opening a public issue.

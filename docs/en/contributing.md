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

## One workflow (read this first)

This repository builds Doctrina and uses it on itself (ADR 0014): a
change to the framework goes through the same loop as a change in any
project that adopted it, documented in [Workflow](workflow.md).

```sh
doctrina prime                          # gates, rules, open work
doctrina work "<what you want to change>"
# plan the proposal, tasks and spec delta; implement with a test
doctrina change check <id>              # everything the close would refuse
doctrina close <id>                     # the whole closing sequence
```

One change, one commit, with a Conventional Commits prefix and the change
id in the title (`fix: <summary> — Change 0183`). The archived changes
under `.doctrina/changes/archive/` are the project's history.

## What a good PR looks like

- **Spec first.** If you change CLI behaviour, the change's spec delta
  carries the new requirement, the criterion and the `bump-version`; the
  close merges it into the spec.
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

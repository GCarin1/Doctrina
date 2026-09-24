# Contributing to Doctrina

Thanks for considering a contribution. This file tells you how to
work with this repository and what is expected of pull requests.

## Quick start

```
git clone https://github.com/GCarin1/Doctrina.git
cd Doctrina
node packages/doctrina-cli/src/index.js --help        # smoke test
cd packages/doctrina-cli && npm test                  # run the suite
node packages/doctrina-cli/src/index.js validate      # self-validate
```

Requires Node.js 20.12 or newer. There are zero runtime
dependencies and zero dev dependencies — `npm install` is a no-op.

## One workflow — the one Doctrina ships

This repository builds Doctrina and uses it on itself (ADR 0014): a
change to the framework goes through the same change workflow a project
that adopted Doctrina uses. There is no separate "direct commit" path.

1. **Orient.** `doctrina prime` prints the gates, the standing rules and
   the open work in one read.
2. **Open the change** with `doctrina work "<what you want to change>"`.
   It derives the `NNNN-slug` id, scaffolds `.doctrina/changes/<id>/`
   (proposal, tasks, a spec delta when it can name the capability) and
   prints the playbook to follow.
3. **Plan it.** The proposal answers why and what; tasks list the work;
   `design.md` covers non-trivial choices. A spec delta carries an
   ` ```ops ` block (`append-requirement`, `replace-requirement`,
   `append-criterion`, `bump-version`, ...) that the close applies
   mechanically.
4. **Implement** against the spec, with a test that the acceptance
   criterion you add cites as its evidence.
5. **Preview the close** with `doctrina change check <id>`: it lists
   everything the close would refuse, before it runs.
6. **Close** with `doctrina close <id>`. It runs the whole closing
   sequence (structure, ADR checkpoint, review, apply, runtime, verify,
   coverage, trace, docs, archive, index drift, validate) and archives
   the change under `.doctrina/changes/archive/`, which is the project's
   history. If the close refuses, the change is not done.
7. **Commit** once per change, with a Conventional Commits prefix and the
   change id in the title (`fix: <summary> — Change 0183`).

In a project that uses Doctrina, the loop is the same; the
[workflow guide](docs/en/workflow.md) walks through it.

## Submitting a pull request to this repository

For framework evolution PRs:

1. **Branch from `develop`** with a descriptive name (e.g.
   `fix/windows-hook-path`, `feat/aider-adapter`); CI runs on pull
   requests to `develop` and `main`.
2. **One change, one commit**, closed with `doctrina close <id>` as
   above. Keep each change small enough to read in one sitting.
3. **Run the gates** before pushing — the close already ran them for
   your change; these rerun them on the whole tree:
   ```
   node packages/doctrina-cli/src/index.js verify
   node scripts/check-docs.js
   ```
4. **If you touched docs**: ship the EN change and the PT
   translation in the same PR.
5. **If you added a new CLI command**: add at least one
   integration test, register the command in `src/index.js`, and
   document it in `docs/en/cli-reference.md` and the PT mirror.
6. **If you added a new spec, ADR, or template**: scaffold it with the
   CLI (`doctrina spec new`, `doctrina decision new`) inside the change,
   so the index registers it.
7. **Open the PR** with the
   [PR template](.github/PULL_REQUEST_TEMPLATE.md) filled in.

## Coding conventions

- Zero runtime dependencies. The CLI uses only Node.js standard
  library imports. PRs that add a `dependencies` entry will be
  rejected; rare exceptions must come with an ADR.
- ES modules throughout (`"type": "module"`).
- One concern per file under `packages/doctrina-cli/src/`. New
  commands live in `commands/<name>.js` and register in
  `src/index.js`.
- Tests live next to the suite at `packages/doctrina-cli/test/`
  and use the built-in `node --test` runner. Each new command
  needs at least one integration test.
- Documentation is English-primary and Portuguese-translated; any
  EN doc change ships with the matching PT update in the same
  commit.

## Documentation conventions

- Single H1 per file. Soft cap of 250 lines per doc; `doctrina
  validate` is sympathetic, but reviewers will push back on
  bloat.
- Use exact commands. Use explicit boundaries. Use verifiable
  done criteria. The same density rules that apply to AGENTS.md
  apply to user docs.
- Cross-link liberally. The stale-reference check in `validate`
  catches broken Markdown link targets, so it is safe to be
  generous.

## ADR discipline

Accepted ADRs are immutable. To change a decision, run
`doctrina decision supersede <number> "<new title>"`. The CLI
edits only the `Status:` and `Superseded by:` headers of the old
ADR and creates the new one with `Supersedes:` pointing back. Do
not hand-edit accepted ADRs.

## Review expectations

- A change author is responsible for getting `doctrina validate`
  and the test suite green before requesting review.
- Reviewers focus on the change folder (proposal, design,
  delta) first, then on the implementation. The spec is the
  contract; the code follows.
- The repository follows
  [Conventional Commits](https://www.conventionalcommits.org/).
  Commit titles use a `type(scope): summary` prefix and stay
  under 72 characters. Bodies explain rationale and reference
  the relevant spec or ADR when applicable.

## Reporting a bug or proposing a feature

Open a GitHub issue using one of the templates at
[`.github/ISSUE_TEMPLATE/`](.github/ISSUE_TEMPLATE/). Bugs go
through the bug template; feature requests go through the feature
template. Security issues use the channel in
[`SECURITY.md`](SECURITY.md), not the public tracker.

## License

By contributing you agree that your contribution will be licensed
under the project's [MIT License](LICENSE).

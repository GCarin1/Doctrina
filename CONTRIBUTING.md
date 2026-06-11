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

## Two workflows — pick the right one

Doctrina has two distinct workflows. Using the wrong one is the
single most common mistake contributors make, and it has
polluted this repository twice. Read this section before opening
a PR.

### Workflow A — Framework evolution (this repository)

When you change Doctrina **itself** (the CLI, the templates, the
specs that describe the framework, the docs that ship with it),
you use **Conventional Commits** with direct commits. **Not**
`doctrina change new`.

```
feat(cli): add doctrina skill list command
fix(workflows): use node --test auto-discovery
docs(brownfield): clarify retroactive ADR pattern
refactor(validate): extract stale-reference helper
chore(deps): bump engines.node to 20.12
```

The git history is the record of how the framework evolves. The
`.doctrina/changes/archive/` directory in this repository **must
stay empty** (only `.gitkeep`). Creating change folders for
framework work means the framework ships with the log of how it
was built embedded as artifacts — content that is noise for
anyone adopting Doctrina.

### Workflow B — Projects that **use** Doctrina

When you write changes in a project that adopted Doctrina (a
real application, a service, a library), you use the change
workflow we ship:

1. **Open a change folder** with `doctrina change new <id> "<title>"`.
   Use the convention `NNNN-slug` for the id.
2. **Fill the change**. The proposal answers "why"; tasks list
   the work; design covers non-trivial choices.
3. **Write spec deltas** if the change modifies a capability
   spec. ADDED creates new specs; MODIFIED requires manual
   merge; REMOVED deletes. The CLI never auto-merges MODIFIED
   on principle.
4. **Implement the work** against the approved spec.
5. **Run the gates**:
   ```
   doctrina validate
   doctrina analyze <your-change-id>
   doctrina clarify <each new spec or ADR>
   ```
6. **Apply and archive** the change before opening the PR.
7. **Open the PR**. Reference the change id in the title.

If you have not used Doctrina before in an adopting project, the
fastest read is [`docs/en/workflow.md`](docs/en/workflow.md) and
[`docs/en/cli-reference.md`](docs/en/cli-reference.md).

## Submitting a pull request to this repository

For framework evolution PRs:

1. **Branch from `main`** with a descriptive name (e.g.
   `fix/windows-hook-path`, `feat/aider-adapter`).
2. **Make focused commits** using Conventional Commits prefixes.
   Keep commits small enough to read in one sitting.
3. **Run the gates** before pushing:
   ```
   cd packages/doctrina-cli && npm test
   node packages/doctrina-cli/src/index.js validate
   node packages/doctrina-cli/src/index.js clarify docs/en/<file you touched>.md
   ```
4. **If you touched docs**: ship the EN change and the PT
   translation in the same PR.
5. **If you added a new CLI command**: add at least one
   integration test, register the command in `src/index.js`, and
   document it in `docs/en/cli-reference.md` and the PT mirror.
6. **If you added a new spec, ADR, or template**: do it as a
   direct edit. Do **not** run `doctrina change new`.
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

# ADR 0008 — Honest gates — coverage skip detection and verify reproducibility lint

- **Status:** accepted
- **Date:** 2026-06-22
- **Deciders:**
- **Supersedes:** —
- **Superseded by:** —
- **Evidence:** —
- **Landed:** 2026-06-22 — `packages/doctrina-cli/src/commands/coverage.js`, `packages/doctrina-cli/src/commands/verify.js`

## Context

A framework review (items **G3** and **G4**) found that the two gates meant to
prove "the code actually works" gave **more confidence than they earned** — the
review called them "more dangerous than the ceremony, because they give false
security":

- **G3 — `coverage` confuses "a file exists" with "a test passes".** A criterion
  marked `[verified]` that cites a test file counts as *covered* the moment the
  path resolves on disk — even when the cited suite is `describe.skip`'d (the
  reviewer's Prisma e2e suite that skips offline). The framework's headline
  thesis is "every claim is traceable to proof"; a gate satisfiable by a fully
  skipped test undercuts exactly that.
- **G4 — `verify` is not clean-room.** `verify` runs the declared
  typecheck/test/build against the *current* disk. It passed on the reviewer's
  machine only because a previous run had generated the Prisma client and a
  workspace's `dist/` already existed; a fresh checkout (no `prisma generate`,
  unbuilt workspace) would fail. "verify green" did not mean "passes from zero."

The constraints any fix must respect:

- **No runtime dependencies, deterministic, language-agnostic core (ADR 0005
  spirit).** The CLI cannot embed a JS/Python test runner, and a *real* clean
  install is package-manager-specific and slow. Whatever ships must be static
  and free.
- **Opt-in / non-punitive by default.** Like `coverage` and `trace`, the
  honesty signal should report by default and gate under an explicit flag, so it
  never blocks a project that has not adopted it.

## Decision

Make both gates honest about their own limits, with cheap static checks:

1. **`coverage` gains a `conditional` verdict.** A criterion whose only
   resolving evidence is a **test file with a skipped suite** is classified
   `conditional`, not `covered`. Skip detection is a dependency-free static
   heuristic: the file's *first* test construct is a skip/todo
   (`describe.skip` / `it.skip` / `xdescribe` / `xit`), or it carries a Python
   skip (`@pytest.mark.skip` / module-level `pytest.skip`). A criterion that
   also cites a non-test artifact or a running test stays `covered` — so an
   incidental `it.skip` deep in an otherwise-live file does not trip it (low
   false-positive rate). Under `--strict`, `conditional` fails the gate
   alongside `bare` and `dangling`: a skipped test is not proof.

2. **`verify --clean` is a static reproducibility lint.** It does *not* run the
   declared checks; it walks the project's `package.json` files (bounded,
   skipping `node_modules`/build dirs) and flags the two clean-checkout footguns
   the review hit: (a) an entry point (`main`/`module`/`bin`/`exports`) under a
   build-output dir (`dist`/`build`/`out`) with no `prepare`/`prepack` script to
   build it on install; (b) a known codegen dependency (Prisma) with no
   `postinstall`/`prepare` running its generate step. Exit 1 on any risk, 0 when
   clean. It needs no `verify.json`.

**Scope limit (the honest ceiling, stated plainly so the gate cannot over-claim
in turn).** `coverage`'s skip detection is a static heuristic, not a test run —
it cannot know a non-skipped test actually passes (that is `verify`'s job), nor
catch a conditionally-skipped test whose first construct looks live.
`verify --clean` is a *lint*, not a real fresh install — it catches the named
footgun classes, not every way a clean checkout can differ. Both narrow the
false-confidence gap; neither claims to close it.

## Alternatives considered

1. **`coverage --run`: execute the cited tests and read pass/skip from the
   runner.** Rejected as the first slice: it makes `coverage` language- and
   runner-specific, non-deterministic, and slow — duplicating `verify`. Static
   skip detection gets most of the honesty for none of that cost; the run-backed
   variant stays a possible future.
2. **A real `verify --clean` (temp clone + fresh install).** Rejected: it must
   know the package manager, costs minutes, and is environment-fragile —
   unshippable as a default check. The static lint catches the same footgun
   classes deterministically and instantly.
3. **Mark a skipped-test criterion `dangling`.** Rejected: dangling means
   "cited proof is missing"; a skipped test exists, it just does not run.
   Conflating them muddies the report. `conditional` is the precise state.
4. **Leave both gates as-is and rely on operator discipline.** Rejected: that is
   the status quo the review faults — the honesty came from the human marking
   `[unverified]` by hand, never from the tool. A gate that needs the user to be
   honest for it is not a gate.

## Consequences

**Positive**

- The two gates stop lying: a skipped-test criterion no longer passes `coverage
  --strict`, and `verify --clean` surfaces the "works on my dirty machine"
  footguns before a teammate's fresh clone hits them.
- Both checks are static, dependency-free, and fast — they fit the
  empty-runtime-deps, deterministic constraints and run in CI/pre-commit budgets.

**Negative**

- More surface and two new concepts (`conditional`, `--clean`) — in tension with
  right-sizing (review 3.7). Mitigated by keeping the report non-punitive by
  default (`conditional` only fails under `--strict`; `--clean` is opt-in).
- The heuristics can mis-judge edge cases (a clever conditional skip; an exotic
  build layout). The ADR states the ceiling so the gate is not mistaken for a
  proof it is not.

**Neutral**

- `coverage`'s default exit code is unchanged (0 as a report); only the
  `--strict` gate widens to include `conditional`.
- `verify --clean` is a sibling mode of `verify`, not a new command; the
  executable gate (`verify`) is untouched and still the "does it run" check.

<!--
Once this ADR is accepted, do not edit it. To change the decision,
create a new ADR that supersedes this one and update the "Superseded by"
header above to point at the new ADR. Status transitions:
proposed -> accepted | rejected
accepted -> deprecated | superseded by NNNN
-->

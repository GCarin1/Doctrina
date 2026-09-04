# ADR 0023 — The runtime surface is declared, never inferred

- **Status:** accepted
- **Date:** 2026-09-03
- **Deciders:** Gcarini
- **Scope:** gates, cli, templates, validation
- **Supersedes:** —
- **Superseded by:** —
- **Evidence:** `packages/doctrina-cli/src/lib/runtime.js`, `packages/doctrina-cli/src/commands/contract.js`, `packages/doctrina-cli/test/runtime.test.js`
- **Landed:** —

## Context

Doctrina's index assumes truth lives in versioned Markdown. A field
evaluation of 0.14.0, written by an agent operating the framework on a
Behave + GitHub Actions + dotenv repository, established that a whole
half of the truth never lived there:

- a job's `env:` block — a secret configured in the CI provider that no
  line ever exports, so it exists and never reaches the process;
- an absent `${{ vars.X }}` collapsing to the empty *string*, so
  `getenv(NAME, default)` finds a value present-and-blank and the
  documented default silently never applies;
- an enum the contract declares (`none|critical|serious`) that no code
  validates, against a `.env` holding `true`;
- hook ordering, where the consumer of an artifact runs before its
  producer;
- a test selector matching zero cases, which exits 0.

None of that is EARS, so no gate could see any of it. The agent read
YAML, logs and source by hand and only afterwards recorded the lesson —
inverting the value the framework promises.

The obvious fix is the wrong one. Teaching Doctrina to parse GitHub
Actions and Behave would make these checks sharp for one stack and
useless for every other, and it would contradict two standing
commitments: the product non-goal ("not intended to replace source
control or traditional CI/CD systems"; "not a general-purpose ORM, test
framework, or application runtime") and SC1 ("no runtime dependencies
beside Node.js" — a YAML parser is a dependency).

## Decision

Doctrina checks the runtime surface **as the project declares it**, and
learns no CI system, test runner, or language.

The contract artifact gains three declaration tables — **Wiring**
(variable → origin → workflow → job/step → consumer), **Selectors**
(selector → source glob → extraction pattern → used by), and **Budgets**
(limit → direction → value) — plus a `Values` column on Environment. Each
check reads only what those declare and verifies the implementation
against it. GitHub Actions and Behave appear in the documentation as
examples, never in the code as branches.

Two properties make this safe to add to an existing tree:

1. **Every section is optional.** A contract written before this existed
   parses to empty declarations and produces no findings.
2. **Silence is never proof.** A contract with no Wiring or Selectors
   rows is reported as UNCHECKED, not as passing.

The checks live in one module (`lib/runtime.js`) that returns findings
and never prints, so `contract check`, `validate --runtime`, `triage`
and `doctor` all render one verdict and cannot disagree about it.

Where a check cannot be exact without program analysis, it is a **lint
that says so**: RT03 matches the textual shapes of a default that only
fires on absence (`getenv(X, d)`, `environ.get(X, d)`, `process.env.X ??
d` — never `||`, which is already empty-safe) and its finding states that
it is textual and asks for confirmation at the call site.

## Alternatives considered

1. **Parse the workflow YAML properly.** Rejected: a YAML parser is a
   runtime dependency (SC1), and correct parsing still leaves Doctrina
   encoding one CI provider's schema.
2. **First-class Behave/Actions support.** Rejected: sharpest possible
   checks for the one repository that produced the review, nothing for
   anyone else, and it makes the framework a CI tool — an explicit
   non-goal.
3. **Infer the wiring from the repository** (find workflows, guess which
   variables matter). Rejected: a guess that is wrong is worse than no
   check, because it produces confident false accusations against files
   the author never asked Doctrina to police.
4. **Leave it to the project's own CI.** Rejected: this is precisely the
   class the review found nothing catches — every individual gate was
   green while the pipeline was lying.

## Consequences

**Positive**

- The "I configured it and the process never saw it" class becomes a
  gate failure in the PR instead of a green job with a missing artifact.
- A project declares its runtime surface once and gets it checked by
  four commands.
- The framework stays language- and CI-agnostic, and adds no dependency.

**Negative**

- The checks only cover what a project bothers to declare. An undeclared
  surface is unchecked — mitigated by saying so out loud rather than
  reporting ok.
- RT03 is a textual lint and can miss an unusual call site, or flag a
  deliberate one. It states this in the finding rather than implying
  certainty.
- The workflow reader is a small indentation-aware scan, not a parser.
  An unusual file is reported as *unreadable*, never as *absent*, so it
  cannot become a false accusation.

**Neutral**

- Contracts grow three tables. Existing contracts are unaffected until
  their authors choose to fill them.

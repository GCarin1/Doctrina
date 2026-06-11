# Validation

A step-by-step guide for running the empirical A/B protocol defined
by the `validation` capability spec. The point is to decide, with
honest before/after data, whether Doctrina is paying for itself in
your project.

This doc is the operating guide. The
[validation spec](../../.doctrina/specs/validation/spec.md) is the
contract.

## When to run this

Run the protocol at least once after the first month of Doctrina use.
Re-run when:

- You introduce a new artifact category (a `memory/` folder, a new
  agent adapter, a heavyweight ADR review process).
- A team change, stack change, or significant scope change happens.
- You suspect ceremony overhead is exceeding the benefit.

Do **not** run the protocol on day one. You need actual Doctrina
practice in the treatment cohort, not the act of installing it.

## Step 1 — Baseline

Start by capturing the repository-level numbers in one command:

```
doctrina metrics --save
```

This snapshots commit count, revert rate, fix share, top-churn
files, and the 21-day re-edit proxy to
`.doctrina/metrics/YYYY-MM-DD.json`, derived from local git history
only. Re-run it monthly during the treatment period; `--save`
prints the deltas against the previous snapshot.

Then pick three to five recent work items (features or bugs)
completed **before** Doctrina was introduced. If you cannot find
five, three is fine. The cohort should be representative: do not
cherry-pick hard items or easy ones.

For each item, record:

| Field | Source |
|-------|--------|
| Item id | PR number or issue tag |
| Started | First commit on the feature branch |
| Merged | Merge commit |
| Lead time | Merged − Started (hours or days) |
| PR opened | PR creation timestamp |
| PR merged | Merge timestamp |
| PR review time | PR merged − PR opened |
| Caused incident? | Y/N within 30 days of deploy |
| Required hotfix? | Y/N |
| Cost | Tokens if available, otherwise developer-hours |

A simple `baseline.json` example:

```json
{
  "cohort": "baseline",
  "items": [
    {
      "id": "PR-142",
      "lead_time_hours": 38,
      "pr_review_hours": 9,
      "caused_incident": false,
      "required_hotfix": false,
      "cost_tokens": null,
      "cost_hours": 6
    }
  ],
  "deployment_frequency_per_week": 4.0,
  "rework_rate": 0.12,
  "change_failure_rate": 0.08,
  "mttr_hours": 2.4
}
```

Commit this file somewhere durable. A `.doctrina/validation/` folder
is one natural home; a `docs/validation/` folder is another. Either
way, it lives in git.

## Step 2 — Treatment

Run Doctrina on three to five new work items of **comparable
complexity** to the baseline cohort. Comparable means:

- Similar diff size (within 2× of baseline median).
- Similar number of affected files.
- Similar dependency churn (no item adds a new framework or
  database that none of the baseline items did).

For each treatment item, record the same fields. Add one more:

| Field | Source |
|-------|--------|
| Artifacts used | Which `.doctrina/` files an agent or human actually opened during this work |

The artifacts-used field powers Trigger 4 (eliminate artifact
categories that nobody reads).

## Step 3 — Comparison

Produce a record that lists every metric, baseline value, treatment
value, delta, and the outcome of every trigger. A Markdown table is
enough; you do not need a dashboard.

| Metric | Baseline | Treatment | Δ | Trigger |
|--------|----------|-----------|---|---------|
| Lead time | 38h | 31h | −18% | informs trigger 1 |
| Change failure rate | 0.08 | 0.07 | −12% | trigger 1: GREEN |
| Rework rate | 0.12 | 0.09 | −25% | trigger 1: GREEN |
| PR review time | 9h | 16h | +78% | trigger 2: FIRED (simplify) |
| Cost per feature | 6h | 6.5h | +8% | trigger 3: OK |
| Deployment frequency | 4/wk | 4.5/wk | +13% | pair check |
| MTTR | 2.4h | 1.8h | −25% | pair check |

The example above is what a healthy-but-imperfect adoption looks
like: rework rate and CFR improved (Trigger 1 says keep), but PR
review time blew up past the 50% Faros threshold (Trigger 2 fires
and you should simplify the proposal/review surface).

## Step 4 — Act on triggers

For each fired trigger, do something concrete in the next change:

- **Trigger 1 fired (keep/expand):** add Doctrina to another team or
  project; record the decision as an ADR.
- **Trigger 2 fired (simplify):** identify the heaviest artifact in
  the review loop and shrink it. Common culprits: oversized
  `design.md`, ADRs littered with proposed-status drafts, AGENTS.md
  past the 150-line soft cap.
- **Trigger 3 fired (cut a specific artifact):** remove the artifact
  in the next change; if the cost increase was your `memory/`
  folder, this is the ETH Zurich result in your repo and the cut is
  mandatory.
- **Trigger 4 fired (eliminate an artifact category):** propose a
  change that removes the category from the templates inventory.

## Anti-patterns specific to validation

- **Running treatment without a baseline.** You will then mistake
  any change for an improvement. Record baseline first.
- **Changing definitions between cohorts.** "PR review time" must
  mean the same thing in both records.
- **Selecting non-comparable treatment items.** If you Doctrina-ify
  only the simple items, you measure simple-vs-hard, not
  framework-vs-no-framework.
- **Treating fired triggers as failure.** A fired Trigger 2 is a
  diagnostic, not a verdict. Simplify; re-run; reassess.

## What this protocol does not do

- It does not produce p-values. Sample sizes are too small.
- It does not compare across projects. Each project is its own
  experiment.
- It does not run automatically. There is no harness in v0.

A harness is on the v0.x roadmap and will be proposed only after the
first project executes the protocol manually.

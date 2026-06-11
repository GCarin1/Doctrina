# Benchmarks

Synthetic benchmark numbers for the Doctrina CLI. Re-runnable on
your own hardware via `scripts/bench.js`. These numbers are
reference, not warranty; they show order-of-magnitude performance
characteristics, not adoption-grade measurements.

## Why we ship synthetic benchmarks

Adopters evaluating Doctrina against Spec Kit's Python CLI ask
whether the zero-deps posture translates to real time savings.
Synthetic numbers answer the order-of-magnitude question: "is
this fast enough that I won't notice it in a pre-commit hook?"
The honest answer needs numbers, not adjectives.

What synthetic benchmarks **do not** answer:

- Real-adoption performance on your repository's specific shape.
- Cross-framework comparisons against Spec Kit, OpenSpec, BMAD,
  or Kiro. We do not install those frameworks here; pulling them
  in would carry transitive dependencies that contradict the
  zero-deps posture.
- Cold-cache vs warm-cache disk behaviour beyond what the
  generated synthetic projects exercise.

## What the bench script does

`scripts/bench.js` generates three synthetic Doctrina projects:

| Size   | Specs | ADRs | Archived changes |
|--------|-------|------|------------------|
| small  | 1     | 1    | 1                |
| medium | 10    | 5    | 10               |
| large  | 50    | 20   | 50               |

For each size, the script runs `doctrina validate` and
`doctrina clarify` five times and reports the median time in
milliseconds. `doctrina analyze` is excluded from the synthetic
loop because it requires an open (not archived) change folder,
and seeding one realistically would skew the bench toward
artifact-generation cost rather than CLI cost.

## Reference run

Maintainer host, June 2026 (`node --version` v22.x on Linux):

```
Doctrina bench — 5 iterations per size

size     specs  ADRs  archived  validate  analyze*  clarify**
-------  -----  ----  --------  --------  --------  ---------
small        1     1         1    ~85 ms        n/a   ~80 ms
medium      10     5        10    ~85 ms        n/a   ~80 ms
large       50    20        50    ~90 ms        n/a   ~82 ms
```

Numbers vary ±10 ms across runs on the same hardware. The
headline: even at 50 capability specs plus 20 ADRs plus 50
archived changes — well above a real project's first-year scale
— `doctrina validate` stays under 100 ms. That keeps the
pre-commit hook from being a developer-noticeable wait.

The size-to-time curve is flat to first order. Validate's work is
dominated by Node.js startup cost, not by walking the
`.doctrina/` tree. Clarify is similarly dominated; the per-spec
regex pass is the rounding error.

## Re-running on your hardware

```
node scripts/bench.js                 # default 5 iterations per size
node scripts/bench.js --iterations 20 # for tighter medians
```

The script writes synthetic projects under your OS's temp
directory and cleans up after each size. No network calls, no
state outside `/tmp` (or the local equivalent).

## When the numbers change

Three changes to Doctrina would invalidate the reference table:

1. Adding a runtime dependency. Any non-stdlib import shifts the
   Node startup cost; the table would be re-baselined.
2. Replacing the walk-and-stat approach in `validate` with a
   cached index. That would only matter at very large scales
   (thousands of specs), and is not on the roadmap.
3. Adding a network call. Doctrina does not make any
   (see `SECURITY.md`); this would be a policy violation, not a
   performance change.

## Related material

- [Context engineering](context-engineering.md) — why timing
  matters even for a thin CLI.
- [Validation](validation.md) — the empirical A/B protocol for
  measuring real impact on your project.
- [`scripts/bench.js`](../../scripts/bench.js) — the script
  itself.

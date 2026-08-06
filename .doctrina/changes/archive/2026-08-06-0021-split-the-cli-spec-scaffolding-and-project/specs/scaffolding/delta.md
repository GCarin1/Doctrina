# Spec Delta — capability: scaffolding

**Operation:** MODIFIED
**Target spec on apply:** `.doctrina/specs/scaffolding/spec.md`

---

**Why MODIFIED and not ADDED for a new capability:** an ADDED delta's
contract is that `change apply` CREATES the target, from ops. A split
cannot work that way — the requirements are moved verbatim out of another
spec, which no bounded op expresses — so the `split-an-oversized-spec`
skill has you author the file first. The spec therefore already exists when
apply runs, and MODIFIED with no ops block is the accurate statement: this
delta is the record of a merge that the working tree already carries.

---

The commands that MATERIALISE and MAINTAIN a project — `init` and
`adapter` (bootstrap), `templates`, `hooks`, `index`, `upgrade`, `watch`,
`metrics`, `completion` (maintenance) — become their own capability. What
they share is a target (the tree and the agent-facing files themselves) and
a constraint (additive; never rewrite authored content).

30 requirements and 4 acceptance criteria MOVED VERBATIM out of the `cli`
spec. No requirement was rewritten, weakened, or dropped in the move — the
cap is a reading budget, not permission to lose the contract.

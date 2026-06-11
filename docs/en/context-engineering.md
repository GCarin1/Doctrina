# Context engineering

This doc explains what Doctrina means by "context engineering" and
why investing in dense, well-scoped artifacts returns more than
investing in agent topology. The architectural decisions are in the
ADRs; this is the principles guide.

## Why context engineering matters more than agent count

On the BrowseComp evaluation, Anthropic measured that **token usage
alone explains 80% of the variance in task performance** (source:
[How we built our multi-agent research system](https://www.anthropic.com/engineering/built-multi-agent-research-system),
Anthropic engineering blog, June 2025). The remaining variance is
split between tool-call count and model choice. Adding more agents, more roles, or more parallelism — the
moves the multi-agent literature naturally reaches for — does not
move that 80%. Reshaping what the agent reads does.

Doctrina's design follows the data: one orchestrator, one canonical
AGENTS.md per scope, size caps, read-order rules, archive out of
the default read path. Every framework decision that looks like
"less" rather than "more" is downstream of this finding.

## Density of signal in AGENTS.md

AGENTS.md is read on every interaction. Every line is paid for in
tokens, in attention, and in the lost-in-the-middle penalty that
hits when context grows long. Three rules:

- **Exact commands beat advice.** Write `uv run pytest tests/unit/ -v`,
  not "run the tests." The agent copies; advice gets ignored.
- **Explicit boundaries beat polite intent.** Write "do not touch
  `/legacy`," not "be careful around legacy code." Boundaries are
  rules; intent is decoration.
- **Verifiable "done" criteria beat adjectives.** Write "functions
  shall be under 30 lines," not "keep functions small." The
  threshold is the criterion.

The 150-line soft cap and 200-line hard cap that `doctrina
validate` enforces on AGENTS.md exist because density falls as
length rises. A 400-line AGENTS.md is rarely better than a 100-line
one; it is usually less actionable.

## Selection over dumping

The most influential prior art on agent-side context selection is
Aider's repo map. Aider builds a code graph with tree-sitter,
ranks nodes via PageRank over the dependency graph, and sends the
agent only the highest-ranked code that fits a token budget
(default 1 k). The lesson generalises: **context is not "send
everything the repository contains"; it is "rank by relevance and
send the most useful slice under a budget."**

Doctrina implements the lesson at the artifact level, not at the
code-graph level:

- AGENTS.md prescribes a **read order** (this file, then
  `product.md`, then the spec for the capability you are working
  on, then any open change, then accepted ADRs). The order is the
  ranking.
- The change archive is out of the default read path. Historical
  context is reachable but not loaded by default.
- Size caps on AGENTS.md, specs, and ADRs are budget enforcement
  in disguise.

We do not ship a code-graph ranker today. If a future change does,
it lives next to AGENTS.md as a refinement of the same principle,
not as a replacement.

## Hierarchy and scope

A single root AGENTS.md is the minimum. As a repository grows, the
"nearest AGENTS.md wins" hierarchy lets subsystems carry their own
rules without polluting the global file (see
[adapters.md](adapters.md) for details and the OpenAI 88-files
reference).

The hierarchy is one form of progressive scoping. Cursor's rule
system offers four scoping modes that span the same space:

| Mode | When it fires | Doctrina equivalent |
|------|---------------|---------------------|
| Always Apply | Every request | Root `AGENTS.md`, the Doctrina Cursor adapter |
| Auto-Attached (globs) | When the edited file matches a glob | A nested `AGENTS.md` in a subdirectory |
| Agent-Requested | The agent fetches by description | Not modelled directly; cite specs by name |
| Manual (`@name`) | The user invokes by name | Not modelled; users open specs by hand |

Doctrina ships only the Always Apply pattern in its Cursor adapter.
The other three are user-defined refinements on top, not framework
mandates.

## Sharing context across projects

Cross-project learning is the hardest unsolved problem in the
agent-frameworks space. The pragmatic pattern the research
recommends is a **conventions repository**: a small repo that
owns a base AGENTS.md (plus optional shared snippets) and is
imported or copied into new projects on init.

Doctrina supports this lightly:

1. Maintain a repo, e.g. `org/conventions`, whose root holds a
   curated `AGENTS.md` plus any house-style sections (commit
   conventions, PR template guidance, code-style do-and-do-not
   bullets).
2. On `doctrina init` in a new project, after the framework
   scaffolds the local `AGENTS.md`, paste the conventions content
   in or `@`-import it (Claude Code) before the project-specific
   content.
3. When the conventions repo updates, projects pull the new
   content manually. There is no automatic sync; that would
   re-introduce the staleness and conflicting-rules problem the
   single-source-of-truth principle exists to avoid.

This is not a framework feature. It is a convention Doctrina
respects but does not enforce. A future change may ship a
`doctrina init --from <repo>` flag if demand justifies it.

## Anti-patterns specific to context

Three from [antipatterns.md](antipatterns.md) are about context
quality directly:

- #5 — Bloating AGENTS.md past the soft cap.
- #6 — Treating the archive as live truth.
- #10 — Iterative refinement without a security review (a special
  case of context drifting silently as the same code is "polished"
  five or more times).

The orthogonal one not in that list: **trusting any context the
agent generates without curation.** The ETH Zurich AGENTbench
result is unambiguous on this — LLM-written context files reduced
task success by 0.5–2% and raised inference cost 20–23%. The
implication for Doctrina users: any artifact a human did not
review is liability, not asset.

## Related material

- [Workflow](workflow.md) — the cycle the artifacts move through.
- [Adapters](adapters.md) — per-agent integration and the nested
  AGENTS.md section.
- [Antipatterns](antipatterns.md) — failure modes context errors
  produce.
- [Multi-agent model](multi-agent.md) — how orchestration relates
  to context shape.
- [Validation](validation.md) — measuring whether the context you
  ship pays for itself.

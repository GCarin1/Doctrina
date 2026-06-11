# Doctrina vs other SDD frameworks

An honest positioning of Doctrina against the five most-cited
spec-driven development frameworks of 2025–2026. Numbers and claims
about other tools come from the source research and the projects'
own documentation; nothing is invented.

## At a glance

| Dimension | Doctrina | Spec Kit | AWS Kiro | OpenSpec | BMAD-METHOD | SpecWeave |
|-----------|:--------:|:--------:|:--------:|:--------:|:-----------:|:---------:|
| Distribution | npm zero-deps | Python CLI | IDE fork | npm | YAML + MD bundle | npm |
| Setup time | < 5 min | ~30 min | IDE install | ~5 min | High | Medium |
| Native AGENTS.md | yes | via adapter | no (steering) | yes | no | yes |
| EARS requirements | template-guided | no | native | partial | no | optional |
| Immutable ADRs + supersede | yes (command) | not primary | partial | yes (schema) | no | partial |
| Multi-agent posture | single linear orchestrator (documented) | implicit | implicit | implicit | role-based (rejected) | flexible |
| Greenfield fit | strong | excellent | excellent | strong | strong | strong |
| Brownfield fit | strong (dedicated guide) | weak (research) | partial | strong (first-class) | partial | strong |
| Quality gates shipped | analyze + clarify + validate | clarify + checklist + analyze | on-save hooks | validate | none built-in | validate |
| Pre-commit hook installer | yes | no | n/a | no | no | no |
| Stale-reference detection | yes | no | partial | no | no | no |
| Empirical A/B protocol shipped | yes (spec + doc) | no | no | no | no | no |
| Bilingual docs | EN + PT | EN | EN | EN | EN | EN |
| Native agent count | 12 | 30+ | own IDE | 5+ | 8 personas | 100+ skills |
| Real-world examples shipped | in repo | yes | yes | yes | yes | yes |
| Community size | very small | Microsoft-backed | AWS-backed | growing | growing | growing |

## Where Doctrina stands above the field

- **Brownfield is first-class.** Doctrina ships a dedicated
  brownfield adoption guide that turns the just-in-time spec
  rule, retroactive ADRs, and validate/clarify-as-onboarding into
  a runbook. Other frameworks treat brownfield as "the same as
  greenfield, but harder." Doctrina names the difference.
- **Empirical validation is shipped, not just preached.** The
  `validation` capability spec defines seven required metrics
  (DORA four plus rework rate, cost-per-feature, PR review time)
  and four pre-declared decision triggers. The operating
  doc translates the spec into a four-step procedure a team can
  run with a spreadsheet. No other framework here ships the
  protocol.
- **Stale-reference detection.** `doctrina validate` walks every
  spec and ADR for Markdown links pointing at files that no
  longer exist. The other validators in this space catch schema
  errors but not silent rot.
- **Single linear orchestrator is argued, not assumed.** The
  multi-agent doc names BMAD's role-based topology, cites the
  Cognition and Anthropic findings against it for code work, and
  documents the five workflow-phase personas that replace
  parallel writers. The reasoning is portable; the doc is
  re-usable outside Doctrina.
- **Zero runtime dependencies, ever.** The CLI imports only
  Node.js standard library modules. No supply-chain surface, no
  install latency, no audit noise. The other npm-distributed
  frameworks in this list carry transitive deps.
- **Bilingual EN + PT documentation.** Eleven docs in each
  language. The other frameworks are English-only.

## Where Doctrina stands at parity with the field

- **AGENTS.md adoption.** OpenSpec, SpecWeave, and Doctrina all
  honour the open standard. Kiro and BMAD do not; Spec Kit goes
  through an adapter.
- **ADR workflow.** OpenSpec ships a custom ADR schema next to
  specs; Doctrina ships ADRs as first-class artifacts with a
  `supersede` command. Equivalent in intent, different in API.
- **Change folder with deltas.** OpenSpec and Doctrina both use
  ADDED / MODIFIED / REMOVED delta semantics. Doctrina's CLI
  refuses to auto-merge MODIFIED to stop implicit decisions;
  this matches OpenSpec's posture.
- **EARS for requirements.** Kiro is native; Doctrina is template-
  guided. Both make EARS the recommended grammar.

## Where Doctrina stands below the field

- **Native agent support.** Doctrina ships adapters for Claude
  Code, OpenAI Codex CLI, and Cursor. Spec Kit reportedly
  integrates with 30+ agents; SpecWeave advertises 100+ skills
  for a wide range of tools. Doctrina's agent surface is
  deliberately small but is concretely fewer than the leaders.
- **Real-world example projects.** Spec Kit, Kiro, OpenSpec, and
  BMAD all ship example projects external adopters can copy. As
  of v0.1.0, Doctrina ships its own self-described repository plus
  two example projects in `examples/`; the leaders ship dozens.
- **Community.** Doctrina has effectively zero external
  contributors at v0.1.0. Spec Kit has Microsoft backing, Kiro
  has AWS, others have growing followings. This is a function of
  age, not of design.
- **Centralised constitution document.** Spec Kit ships a
  `constitution.md` for non-negotiable principles. Doctrina
  encodes the same content in the accepted ADRs (`0001`,
  `0003`, `0004`) and the design-principles section of the
  README. Adopters coming from Spec Kit will need to learn the
  Doctrina mapping.

## What Doctrina explicitly does not aim to be

- A new agent runtime. Doctrina is the substrate that Claude
  Code, Codex CLI, Cursor, and any future AGENTS.md-aware tool
  read; it never replaces the agent itself.
- A monorepo workflow tool. Doctrina does not track velocity,
  burndown, assignees, or sprint cadence. Use it next to those
  tools, not instead.
- A project-management replacement. Specs and ADRs are not
  tickets. The change folder is a unit of work, not a Jira card.
- A code-graph ranker. Aider's tree-sitter + PageRank approach is
  the canonical implementation; Doctrina applies the same
  principle at the artifact level via read order and size caps,
  and does not ship a ranker.

## Picking between Doctrina and another framework

Use **Doctrina** when:

- You want zero runtime dependencies.
- You are adopting into a brownfield codebase.
- You want the empirical A/B protocol shipped in the box.
- Bilingual EN + PT documentation matters.
- Your agent surface fits the twelve supported agents.

Use **Spec Kit** when:

- You need integration with one of the 30+ agents Doctrina does
  not yet support.
- Microsoft backing is part of the procurement story.

Use **AWS Kiro** when:

- You are willing to commit to a specific IDE.
- On-save event-driven hooks integrated by the IDE are required.

Use **OpenSpec** when:

- You want the minimal ADDED / MODIFIED / REMOVED delta model
  without the bilingual docs, examples, or empirical protocol
  Doctrina layers on top.

Use **BMAD-METHOD** when:

- You explicitly want role-based parallel agents. Doctrina
  rejects this pattern; if you believe the research is wrong on
  this point, BMAD is honest about its bet.

Use **SpecWeave** when:

- You need broad first-class agent integration as the dominant
  buying criterion.

## Sources

Claims about other frameworks come from the source research
document referenced across Doctrina's own ADRs and from each
project's public documentation. Doctrina makes no claims about
internal performance numbers for competitors it has not measured.

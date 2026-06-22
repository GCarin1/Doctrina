# Doctrina

```
 ____             _        _             
|  _ \  ___   ___| |_ _ __(_)_ __   __ _ 
| | | |/ _ \ / __| __| '__| | '_ \ / _` |
| |_| | (_) | (__| |_| |  | | | | | (_| |
|____/ \___/ \___|\__|_|  |_|_| |_|\__,_|

  spec-driven · AGENTS.md-native · zero-deps
```

[![CI](https://github.com/GCarin1/Doctrina/actions/workflows/ci.yml/badge.svg)](https://github.com/GCarin1/Doctrina/actions/workflows/ci.yml)

> Spec-driven, AGENTS.md-native framework for multi-agent AI development.

**Status:** v0.6.0 — released.
**Read this in [Portuguese](./README.pt.md).**

---

## Why Doctrina

The bottleneck of AI-assisted development is not code generation — it is the
reliable transfer of intent and the persistence of context across sessions
and agents. Doctrina treats specifications as the single source of truth, keeps
architectural decisions as immutable ADRs, and orchestrates work through a
single linear coordinator instead of competing parallel agents.

The name comes from the Latin word for *doctrine* — the foundational text that
governs how a body of agents acts.

## Design principles

1. **Single ownership of every fact.** Specs hold current truth. Changes hold
   transient deltas that merge into specs and disappear. ADRs hold immutable
   decisions. No information has two homes.
2. **Active truth stays small and dense.** Files the AI reads on every turn
   are size-capped to fight the "lost in the middle" effect.
3. **Status, not folder migration.** Items are retired by status + link, not by
   moving files (with the exception of transient changes that archive).
4. **Single linear orchestrator by default.** Multi-agent parallelism is the
   wrong default for code writing — it produces conflicting implicit decisions.
   Subagents are used only for isolated read-only investigation.
5. **Value-gated pipeline.** The full ceremony runs only when ambiguity costs
   real time. One-line fixes skip it.
6. **Portability over invention.** Doctrina builds on the open AGENTS.md
   standard, on ADRs in the Nygard/MADR format, and on EARS for requirements.

## What is included

- An `AGENTS.md` template that follows the open standard.
- A `.doctrina/` skeleton with `product.md`, `specs/`, `changes/`, `decisions/`,
  `skills/`, `templates/`, and `index.json`.
- The `doctrina` CLI (Node.js, zero runtime dependencies) with 21 commands
  covering init, intake, work, spec, change, decision, contract, skill,
  analyze, clarify, validate, coverage, trace, verify, templates, hooks,
  index, next, metrics, context, and search.
- Adapters for 12 AGENTS.md-aware agents (Claude Code, OpenAI Codex CLI,
  Cursor, GitHub Copilot, Gemini CLI, Aider, Windsurf, Continue, Amp, Devin,
  Factory, Jules).
- Six capability specs and five accepted ADRs that describe the framework
  (including ADR 0006, intent provenance).
- Two reference example projects (Python FastAPI greenfield, TypeScript
  Express brownfield retrofit).
- Bilingual documentation in English and Portuguese.

## What is deliberately **not** included

- A `memory/` folder. Deferred until measured pain justifies the complexity.
  See [`.doctrina/decisions/0003-defer-memory-folder.md`](./.doctrina/decisions/0003-defer-memory-folder.md).
- Multi-agent parallel writers. See
  [`.doctrina/decisions/0004-single-linear-orchestrator.md`](./.doctrina/decisions/0004-single-linear-orchestrator.md).
- A database, vector store, or RAG layer.
- Documentation generators that produce content the humans never read.
- Telemetry, analytics, or network calls. See `SECURITY.md`.

## Repository layout

```
AGENTS.md                root rules (portable, open standard)
README.md                this file
README.pt.md             Portuguese translation
LICENSE                  MIT
package.json             npm workspaces
.doctrina/               framework artifacts (product, specs, decisions, skills, templates, index)
docs/en /docs/pt         bilingual user-facing documentation
examples/                two reference projects (Python FastAPI, TypeScript Express)
packages/doctrina-cli/   the npm CLI source
scripts/                 synthetic performance benchmark
```

## Documentation

**📖 Documentation site:** [gcarin1.github.io/Doctrina](https://gcarin1.github.io/Doctrina/) —
bilingual (EN/PT), sidebar navigation, full-text search, served straight
from this repository's `docs/` folder via GitHub Pages with zero build
step (enable it once under *Settings → Pages → Deploy from a branch →
`main` / `docs`*).

User-facing documentation lives under [`docs/`](./docs/):

- [Getting started](./docs/en/getting-started.md) — install, init, first feature.
- [Workflow](./docs/en/workflow.md) — propose → apply → archive.
- [CLI reference](./docs/en/cli-reference.md) — every command and flag.
- [Adapters](./docs/en/adapters.md) — Claude Code, Codex CLI, Cursor, Copilot, Gemini CLI, Aider, Windsurf, Continue.
- [Local LLMs](./docs/en/local-llms.md) — wire Doctrina to LLaMA, Mistral, Qwen, DeepSeek, or any OpenAI-compatible endpoint.
- [Multi-agent model](./docs/en/multi-agent.md) — how Doctrina coordinates tools, phases, and humans without parallel writers.
- [Skills](./docs/en/skills.md) — on-demand procedural memory: specialised "how to do X" knowledge loaded only when relevant.
- [Context engineering](./docs/en/context-engineering.md) — why context shape predicts agent performance more than agent count.
- [Gating](./docs/en/gating.md) — when the full pipeline is worth it.
- [Brownfield adoption](./docs/en/brownfield.md) — operational guide for installing Doctrina into an existing codebase.
- [Comparison](./docs/en/comparison.md) — honest positioning vs Spec Kit, Kiro, OpenSpec, BMAD, SpecWeave.
- [Migration](./docs/en/migration.md) — practical mappings from Spec Kit, OpenSpec, BMAD, Kiro, SpecWeave.
- [Benchmarks](./docs/en/benchmarks.md) — synthetic numbers for `validate` and `clarify` across project sizes.
- [Deferred](./docs/en/deferred.md) — what we deliberately did not ship at v0.1.0 and why.

Two reference projects live under [`examples/`](./examples/): a
Python FastAPI greenfield demo and a TypeScript Express brownfield
retrofit.

Project policy: [CONTRIBUTING.md](./CONTRIBUTING.md) · [CHANGELOG.md](./CHANGELOG.md) · [SECURITY.md](./SECURITY.md).
- [Antipatterns](./docs/en/antipatterns.md) — documented failure modes.
- [Validation](./docs/en/validation.md) — empirical A/B protocol to decide if Doctrina is paying for itself.
- [Glossary](./docs/en/glossary.md) — EARS, ADR, MADR, capability, etc.

Portuguese translations are at [`docs/pt/`](./docs/pt/).

## Prior art and credit

Doctrina stands on the shoulders of [GitHub Spec Kit](https://github.com/github/spec-kit),
[OpenSpec](https://github.com/Fission-AI/OpenSpec), [AWS Kiro](https://kiro.dev/),
[BMAD-METHOD](https://github.com/bmad-code-org/BMAD-METHOD), the open
[AGENTS.md standard](https://agents.md/), and Michael Nygard's ADR format.
Doctrina is a deliberate re-synthesis — not a fork — of their lessons.

## License

MIT. See [LICENSE](./LICENSE).

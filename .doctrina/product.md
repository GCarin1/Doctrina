# Doctrina — Product

## Vision

Doctrina exists to make AI-enabled software development reliable by turning human intent into traceable, spec-driven change artifacts and a single linear work pipeline for multi-agent collaboration.

## Problem

Teams building AI-assisted software struggle with fragmented intent, conflicting agent outputs, and missing traceability. Existing workflows often produce unstructured drafts, undocumented decisions, and brittle coordination between human prompts, agent tools, and project artifacts.

## Target users

- AI engineering teams that need a repeatable, audit-ready way to manage specs, changes, and decisions.
- Product and platform teams adopting AGENTS.md and modern multi-agent workflows.
- Developers and maintainers who want a lightweight, zero-dependency CLI for coordinating AI-assisted code work.
- Organizations that value formal requirements, ADRs, and gated delivery over ad hoc prompt-driven changes.

## Scope

In scope:

- A zero-dependency Node.js CLI for managing Doctrina artifacts and workflows.
- Support for AGENTS.md-native project structure with product intent, capability specs, decisions, skills, templates, and indexed artifacts.
- A single linear coordination model for `doctrina work`, `doctrina analyze`, `doctrina apply`, `doctrina close`, `doctrina validate`, and related commands.
- Integration patterns for AGENTS.md-aware agents and adapters, plus bilingual documentation and example projects.
- Validation, traceability, and coverage gates to ensure changes remain aligned with specs and accepted decisions.

Out of scope (deferred or rejected):

- A runtime database, vector store, or RAG layer.
- Persistent project memory beyond spec, decision, and change artifacts.
- Parallel multi-agent writing as the default orchestration model.
- Automatic content generation or documentation tools that bypass human review.

## Non-goals

- Doctrina is not a general-purpose ORM, test framework, or application runtime.
- It is not intended to replace source control or traditional CI/CD systems.
- It is not a hosted LLM service or telemetry platform.
- It is not a lock-in platform; it preserves editable AGENTS.md artifacts and plain repository structure.

## Success criteria

- [SC1] Users can initialize and operate a Doctrina project with no runtime dependencies beside Node.js.
- [SC2] Every change proposal can be traced to a spec and validated through `doctrina validate` with coverage and trace gates.
- [SC3] The CLI supports the full work cycle from intent capture to change archive without losing artifact consistency.
- [SC4] Documentation exists for onboarding, workflow, adapters, and validation in both English and Portuguese.
- [SC5] Example reference projects demonstrate a greenfield and brownfield adoption path.

## Delivery order (walking skeleton)

1. Capture product intent and requirements in `.doctrina/product.md` and capability specs.
2. Scaffold a change with `doctrina work` and implement it through `doctrina analyze` and `doctrina apply`.
3. Validate the resulting artifacts with `doctrina validate` and `doctrina verify`.
4. Archive the change and confirm the project remains consistent via `doctrina status` and `doctrina next`.

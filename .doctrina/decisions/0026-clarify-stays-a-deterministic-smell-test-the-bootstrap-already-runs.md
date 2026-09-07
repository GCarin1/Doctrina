# ADR 0026 — Clarify stays: a deterministic smell test the bootstrap already runs

- **Status:** accepted
- **Date:** 2026-09-07
- **Deciders:** Doctrina maintainers
- **Scope:** gates, authoring
- **Supersedes:** —
- **Superseded by:** —
- **Evidence:** `packages/doctrina-cli/src/commands/clarify.js`, `.doctrina/templates/playbooks/bootstrap.md.template`
- **Landed:** —

## Context

Change 0049 set out to shrink the command surface, which carries a hard
40-line budget so that adding a command forces the question "what comes
off?". `clarify` was one of three candidates, and the only one proposed for
REMOVAL rather than a merge. The case against it, as written in the audit:
detecting ambiguity is semantic by nature, no list of weasel words
generalises, and no driver invokes it.

The last clause turns out to be false, and it is the one the argument rested
on. `.doctrina/templates/playbooks/bootstrap.md.template` runs `doctrina
clarify --all` as a step of the bootstrap the agent executes, and `AGENTS.md`
names it in the same sequence. It is invoked on every project that is
bootstrapped from an intake — which is every project.

The first clause is true and is not an argument for removal. `clarify` does
not claim to detect ambiguity semantically. It applies a fixed list of
weasel-word and placeholder patterns, in English and Portuguese, and prints
where they matched. That is a checklist, not a judgement, and the CLI is
allowed to run checklists — it is judgement it must not make (ADR 0005).

The distinction that decided this change's other two candidates applies here
too. `constitution` and `change diff` were merged because the surviving
command already did everything they did: redundancy, provable by a test that
compares the outputs. Nothing else in the tree flags a "TBD" left in a spec.
`clarify` is unloved, not redundant, and those are different findings with
different remedies.

## Decision

`clarify` stays, unchanged in behaviour and unchanged on the surface block.

Its documented role is narrowed to what it actually is: a deterministic smell
test over Markdown, whose value is that the agent does not have to remember
the list. It makes no claim to find ambiguity in general, and a document it
passes is not thereby unambiguous.

Deprecation in this project requires REDUNDANCY — a survivor that produces
what the retiree produced — demonstrated by a test, not a usage count. Usage
evidence can show that a command is unloved; only redundancy can show it is
unnecessary. A command nothing else replaces stays on the surface however
rarely it is run.

## Alternatives considered

1. **Cut it.** Rejected on the facts: the bootstrap playbook runs it, so
   cutting it would break the flow that every new project executes, and the
   audit's premise that no driver invokes it does not hold.
2. **Delegate to the agent — drop the command, tell the playbook to ask the
   agent to look for ambiguity.** Rejected because it trades a cheap
   deterministic pass for an expensive non-deterministic one, and because the
   playbook ALREADY asks the agent to resolve what it finds. The checklist
   and the judgement are complementary; the CLI's half is the cheap half.
3. **Keep it but drop it from the surface block, like the deprecated
   commands.** Rejected: the block is the list of commands to reach for, and
   an agent that never learns `clarify` exists will never run it outside the
   bootstrap. Hiding a command that is not being retired is a deprecation
   with no announcement.
4. **Wait for usage evidence before deciding.** Rejected as a non-decision:
   the usage log is opt-in and this repository's own sample cannot represent
   adopters, so "wait" here means "never decide", and the open question would
   be re-litigated by the next audit.

## Consequences

**Positive**

- The bootstrap keeps working, and the reason it works is now recorded.
- Deprecation has a stated bar — demonstrated redundancy — so the next
  candidate is argued on evidence rather than on taste.
- `clarify`'s documented promise now matches what it does, which is what a
  reader needed in order to trust it.

**Negative**

- The surface keeps a command that a busy project may never type, and the
  40-line budget stays tight: the two lines this change frees come from the
  merges, not from here.

**Neutral**

- Nothing about `clarify`'s implementation changes. If a future release finds
  a survivor that subsumes it, this ADR is superseded rather than edited.

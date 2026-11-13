# ADR 0032 — The console hands a request to the agent's own command line

- **Status:** accepted
- **Date:** 2026-11-13
- **Deciders:** project owner
- **Scope:** console
- **Supersedes:** —
- **Superseded by:** —
- **Evidence:** `packages/doctrina-cli/src/lib/agent-bridge.js`, `packages/doctrina-cli/src/commands/ui.js`
- **Landed:** —

## Context

The CLI was built for an agent to run: every command prints the next step,
and the human "gives a brief prompt and approves". For the human that left
forty commands in a terminal and nothing to look at. A console — one window
with the gates, the conversation and the open work — gives the tool a face,
and the first thing a person types into a window like that is a request in
their own words, not a command.

A request needs a model to act on it, and the CLI calls none: it reads no
language and makes no network call (ADR 0005, the security posture). The
person, however, already has an agent — Claude Code, Cursor, Codex, Gemini —
installed, signed in, and configured for this repository through the
adapters Doctrina writes (AGENTS.md, the Cursor rule, the hooks). Each of
them ships a documented non-interactive mode: a prompt in, a stream of what
it says and does out.

## Decision

The console sends a human's free-text request to the agent's own
command-line tool, found on PATH, through its documented non-interactive
mode, and relays what it prints. It keeps the session id the agent reports
and passes it back, so the next request continues the conversation.

- The CLI still calls no model and opens no connection: it starts a local
  process the person installed, exactly as `verify` starts the project's
  declared checks.
- Nothing typed is ever interpreted by a shell: the prompt goes to the
  agent's stdin where the agent reads one, and otherwise as one argument.
- Doctrina passes no flag that skips an agent's approvals. Where an agent
  needs to be told what a non-interactive run may do, the console grants
  the least the cycle needs — accept file edits, run `doctrina` — and
  reports every call the agent refused. Anything wider is the person's own
  choice, in the agent's settings or in `DOCTRINA_AGENT_ARGS`.
- Which agent answers is the person's, not the project's: the IDE whose
  terminal this is, then the adapter the project installed, overridden by
  `DOCTRINA_AGENT`. It is not a key of `.doctrina/config.json`, because two
  people on one repository use different agents.
- Every Doctrina command typed in the console runs as the same CLI in a
  process of its own, and the panel is read from the tree by another: the
  console holds no state a command could disagree with.

Scope: this is the same agent, account and rules as the person's IDE, in a
session of its own. It does not drive a chat pane that is already open.

## Alternatives considered

1. **Call a model API from the CLI.** It would need a key, a network call
   and a dependency, and would be a second agent with none of the rules,
   hooks, tools and approvals the person's own agent already has.
2. **Expose Doctrina as an MCP server and let the IDE be the face.** It
   answers "the agent can call Doctrina", which it already can through the
   shell; it gives the human nothing to look at outside one vendor's pane.
3. **Drive the IDE's open chat pane.** No agent documents a way in; it
   would mean automating a window, per IDE, per version.
4. **A console with commands only, no requests.** Honest and small, and it
   leaves the person retyping `doctrina work "…"` and then switching
   windows to ask the agent to act on it — the seam the console exists to
   close.

## Consequences

**Positive**

- A person drives the whole cycle from one window, in their own words.
- The agent that answers is the one already governed by the repository's
  rules, hooks and tool guard; nothing is configured twice.
- No new dependency, no key, no network code in the CLI.

**Negative**

- Each agent's command line is a contract Doctrina does not own. Only
  Claude Code's is exercised against the real binary here; Cursor's,
  Codex's and Gemini's are built from their documentation and can drift.
- A non-interactive agent cannot ask for approval mid-run: a call it may
  not make is refused and reported, and the person widens it themselves.
- The console's conversation is a separate session from the IDE's pane.

**Neutral**

- The security policy gains a fourth kind of subprocess: the agent, started
  only by a request a human typed into the console.

<!--
Once this ADR is accepted, do not edit it. To change the decision,
create a new ADR that supersedes this one and update the "Superseded by"
header above to point at the new ADR. Status transitions:
proposed -> accepted | rejected
accepted -> deprecated | superseded by NNNN
-->

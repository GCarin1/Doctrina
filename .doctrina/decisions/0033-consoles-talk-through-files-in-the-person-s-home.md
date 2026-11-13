# ADR 0033 — Consoles talk through files in the person's home

- **Status:** accepted
- **Date:** 2026-11-13
- **Deciders:** project owner
- **Scope:** console
- **Supersedes:** —
- **Superseded by:** —
- **Evidence:** `packages/doctrina-cli/src/lib/console-room.js`, `packages/doctrina-cli/src/commands/ui.js`
- **Landed:** —

## Context

A person who works across repositories has a terminal per repository. With
a console in each (ADR 0032) they had as many conversations that could not
hear one another, and the planner at the workspace root — who, by ADR 0030,
hands each repository's executor a self-contained card — had nobody to hand
it to but the human, retyping.

Consoles need to find each other and exchange a request and its report.
The CLI makes no network call and runs no daemon, and that posture is worth
more than a convenient socket.

## Decision

Consoles opened for the same work share a **room**: the workspace when the
directory is its root or one of its registered repositories, the directory
itself otherwise. A room is a folder under the person's `$DOCTRINA_HOME`
(`rooms/<hash of the room's root>/`), created readable and writable by that
person alone.

- Each console keeps one small file there — its name, role, agent, whether
  it is busy and listening — rewritten while it lives; one not rewritten
  for ten seconds is gone. Each has an inbox; a message is a file written
  aside and renamed into it, read once.
- `/send <name> <request>` puts a request in another console's inbox. That
  console shows who it came from and gives it to its own agent, in its own
  repository; the agent's last message goes back as the report. A request
  that arrives while something runs waits its turn.
- A console listens by default and stops with `/listen off`; a request to
  one that is not listening, or has no agent, is refused with the reason.
- `doctrina ui --send <name> "<request>"` does the same from outside a
  console and waits for the report: it is what a planner's agent runs. The
  agent is told which consoles are open; the human sees the call in the
  conversation and the work in the other terminal.
- A request that was handed over is done where it lands. The agent serving
  it is not told of the other consoles, and `--send` refuses to run under
  it: two consoles waiting on each other would wait until both gave up.

## Alternatives considered

1. **A local socket or HTTP port.** Faster than polling a folder, and a
   listening port is a thing to secure, to collide and to explain in a
   security policy that says the CLI opens none.
2. **A background daemon that owns the room.** One more process to start,
   find and kill; a folder needs no owner.
3. **Reports fed straight back into the asking console's agent.** Two
   agents answering each other with no human between them is a loop with a
   bill. The report is shown to the human; an agent that wants it inside
   its own turn asks for it with `--send`, which ends.
4. **Files in the workspace's own folder.** The workspace is a git
   repository: heartbeats and mail are not history.

## Consequences

**Positive**

- The planner at the workspace root hands each repository its card and
  gets the report, by hand or through its agent, with every step visible in
  the terminal where it happens.
- No port, no daemon, no dependency; a console that dies leaves a file
  that stops being fresh.

**Negative**

- Polling: a message is seen within the console's next look at the room
  (under a second), not at once.
- Trust is the home directory's: anything that can write there as the
  person can put a request in an inbox. It could already run the person's
  agent directly; the room adds no reach, and `/listen off` closes it.
- Two consoles in one repository are two writers. The room does not stop
  it; ADR 0030's "one writer per repository" is the person's to keep.

**Neutral**

- A room outlives its consoles as an empty folder under `$DOCTRINA_HOME`.

<!--
Once this ADR is accepted, do not edit it. To change the decision,
create a new ADR that supersedes this one and update the "Superseded by"
header above to point at the new ADR. Status transitions:
proposed -> accepted | rejected
accepted -> deprecated | superseded by NNNN
-->

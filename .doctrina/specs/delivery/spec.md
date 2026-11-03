# Spec — Delivery

**Capability:** delivery
**Status:** active
**Implementation:** implemented
**Realizes:** n/a — internal framework capability; product success criteria measure adopting-team outcomes, not the tool's own surface
**Source:** `packages/doctrina-cli/src/lib/delivery.js`, `packages/doctrina-cli/src/commands/delivery.js`, `packages/doctrina-cli/src/lib/task-card.js`
**Depends on:** workspace
**Last updated:** 2026-11-03
**Version:** 0.1.0

## Purpose

Define how one item of work that crosses repositories — a story, a
screen, a fix — is planned, routed, delegated and closed from a
workspace (ADR 0030): the delivery file holds what no single repository
owns, each routed repository carries one change for it, and each task of
those changes can be handed to an executor as a self-contained card.

## Requirements (EARS)

### Ubiquitous

- The system shall keep a delivery at `<workspace>/deliveries/<NNNN-slug>/delivery.md` with list headers `Status`, `Date`, `Ref` and `Projects`, and the sections Story, Sources, Plan, Release and Observability.
- The system shall read a delivery's state from the changes its routed projects carry — a change carries it through the proposal header `- **Delivery:** <id>` — and shall never copy that state into the delivery file.
- The system shall order a delivery's projects so that each comes after every routed project it depends on.

### Event-driven

- When `doctrina delivery new "<title>"` runs, the system shall allocate the next delivery number, write the delivery file from `delivery.md.template` with `--ref` and `--projects` when given, and print the delivery playbook — read the story, route, open one change per repository, delegate the cards one writer per repository, review and close each change, release and watch, close — with the workspace's projects ranked against the title when no project is routed.
- When `doctrina delivery route <id> <a,b>` runs, the system shall write the projects in dependency order and print, per project, the `work` line that opens its change.
- When `doctrina work "<prompt>" --delivery <id>` runs in a repository, the system shall write `- **Delivery:** <id>` into the new change's proposal.
- When `doctrina delivery status <id>` runs, the system shall print, per routed project, the changes carrying the delivery with their state and task progress.
- When `doctrina delivery check <id>` runs, the system shall exit 1 while a routed project carries no change for the delivery or carries one not yet archived, naming each, and exit 0 otherwise.
- When `doctrina delivery close <id>` runs and the check passes, the system shall set `Status: closed` and the `Closed` date, and print the `Tell the human:` line.
- When `doctrina change card <id> [<n>]` runs, the system shall print task `<n>` — or the first open task — with the lines indented under it, the change's Why, the delta capabilities' specs cut to the task, the card's `Verify:` command or `doctrina verify`, the tick command, and the instruction to leave opening, closing and `.doctrina/` to the planner.

### Unwanted behavior

- If `--delivery` names a delivery that does not exist, or one not routed to the current repository, then the system shall not open the change: it exits with the usage class for an unknown delivery and the precondition class for an unrouted one, naming `delivery route`.
- If a delivery's check fails, then the system shall not close it.

## Acceptance criteria

A delivery is spec-compliant when:

1. [verified] `delivery new` writes the file with its headers and sections and prints the playbook with the projects ranked; `delivery route` writes them dependencies first and prints one `work` line each — verified by `packages/doctrina-cli/test/a-entrega-atravessa-repositorios.test.js`.
2. [verified] `work --delivery` stamps the proposal of a routed repository and refuses an unrouted one with exit 3 and an unknown delivery with exit 2, opening nothing — verified by `packages/doctrina-cli/test/a-entrega-atravessa-repositorios.test.js`.
3. [verified] `delivery check` exits 1 while a routed project has no change or an open one and 0 once every change is archived; `delivery close` refuses before that and closes after — verified by `packages/doctrina-cli/test/a-entrega-atravessa-repositorios.test.js`.
4. [verified] `change card` prints the next open task with its indented lines, the Why, the spec slice and its Verify command, and says so when every task is ticked — verified by `packages/doctrina-cli/test/a-entrega-atravessa-repositorios.test.js`.

## Out of scope for this spec

- Calling the tracker, the wiki, the design tool or any model: the
  playbook says what to read; the agent reads it.
- Running two writers in one repository: ADR 0030 forbids it.

# Spec — Delivery

**Capability:** delivery
**Status:** active
**Implementation:** implemented
**Realizes:** n/a — internal framework capability; product success criteria measure adopting-team outcomes, not the tool's own surface
**Source:** `packages/doctrina-cli/src/lib/delivery.js`, `packages/doctrina-cli/src/commands/delivery.js`, `packages/doctrina-cli/src/lib/task-card.js`
**Depends on:** workspace
**Last updated:** 2026-11-03
**Version:** 0.4.0

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
- The system shall read a delivery's `## Release` boxes through one reader, the document model's checklist, so every box `delivery check` holds open — whatever its bullet marker — is one `delivery tick` lists and ticks, and a box inside a comment is neither.

### Event-driven

- When `doctrina delivery new "<title>"` runs, the system shall allocate the next delivery number, write the delivery file from `delivery.md.template` with `--ref` and `--projects` when given, and print the delivery playbook — read the story, route, open one change per repository, delegate the cards one writer per repository, review and close each change, release and watch, close — with the workspace's projects ranked against the title when no project is routed.
- When `doctrina delivery route <id> <a,b>` runs, the system shall write the projects in dependency order and print, per project, the `work` line that opens its change.
- When `doctrina work "<prompt>" --delivery <id>` runs in a repository, the system shall write `- **Delivery:** <id>` into the new change's proposal.
- When `doctrina delivery status <id>` runs, the system shall print, per routed project, the changes carrying the delivery with their state and task progress.
- When `doctrina delivery check <id>` runs, the system shall exit 1 while a routed project carries no change for the delivery or carries one not yet archived, naming each, and exit 0 otherwise.
- When `doctrina delivery close <id>` runs and the check passes, the system shall set `Status: closed` and the `Closed` date, and print the `Tell the human:` line.
- When `doctrina change card <id> [<n>]` runs, the system shall print task `<n>` — or the first open task — with the lines indented under it, the change's Why, the delta capabilities' specs cut to the task, the card's `Verify:` command or `doctrina verify`, the tick command, and the instruction to leave opening, closing and `.doctrina/` to the planner.
- When `doctrina delivery check <id>` runs, the system shall also require the delivery's own record — a `## Story` with text, every `## Release` box ticked and a `## Observability` with at least one line beyond its comment — naming each gap, because the changes prove the code and only the record proves the delivery reached its users and was watched after it did.
- When `doctrina delivery list` runs, the system shall print each delivery's age — open days, or lead time from `Date` to `Closed` once closed — and the median and longest lead time over the closed ones.
- When `doctrina delivery tick <id>` runs, the system shall list the `## Release` boxes with their numbers, and with numbers or `--all` tick them, refusing a number that names no box with the usage class.
- When `doctrina delivery status <id>` runs, the system shall print, for every open change with unticked tasks, the command that reads its next task card from inside its repository, and shall name every other open change in a routed repository as a second writer to sequence.
- When `doctrina delivery tick <id> <n>...` ticks boxes, the system shall count only the boxes this call turned from open to ticked — a box already ticked or named twice is not counted again — and write nothing when there is none.

### Unwanted behavior

- If `--delivery` names a delivery that does not exist, or one not routed to the current repository, then the system shall not open the change: it exits with the usage class for an unknown delivery and the precondition class for an unrouted one, naming `delivery route`.
- If a delivery's check fails, then the system shall not close it.
- If `doctrina delivery new --projects` or `doctrina delivery route` names a project that is still pending or whose repository is missing, then the system shall not route it: it exits with the precondition class, naming `doctrina intake --from-code` or `doctrina workspace attach`, unless `--force` is given.

## Acceptance criteria

A delivery is spec-compliant when:

1. [verified] `delivery new` writes the file with its headers and sections and prints the playbook with the projects ranked; `delivery route` writes them dependencies first and prints one `work` line each — verified by `packages/doctrina-cli/test/a-entrega-atravessa-repositorios.test.js`.
2. [verified] `work --delivery` stamps the proposal of a routed repository and refuses an unrouted one with exit 3 and an unknown delivery with exit 2, opening nothing — verified by `packages/doctrina-cli/test/a-entrega-atravessa-repositorios.test.js`.
3. [verified] `delivery check` exits 1 while a routed project has no change or an open one and 0 once every change is archived; `delivery close` refuses before that and closes after — verified by `packages/doctrina-cli/test/a-entrega-atravessa-repositorios.test.js`.
4. [verified] `change card` prints the next open task with its indented lines, the Why, the spec slice and its Verify command, and says so when every task is ticked — verified by `packages/doctrina-cli/test/a-entrega-atravessa-repositorios.test.js`.
5. [verified] With every routed change archived, `delivery check` still exits 1 naming an empty Story, each unticked Release box and an empty Observability, and exits 0 once they are written; `delivery list` prints the lead time and the median — verified by `packages/doctrina-cli/test/a-entrega-atravessa-repositorios.test.js`.
6. [verified] A pending project is refused by `delivery new --projects` and `delivery route` with exit 3 naming `intake --from-code` and routed with `--force`; `delivery tick` lists, ticks and refuses a bad number; `delivery status` prints the card command and the second writer; `prime` and the pulse name the delivery; `work --resume --delivery` joins a change and refuses one already in another delivery — verified by `packages/doctrina-cli/test/o-fluxo-da-entrega-nao-tem-furos.test.js`.
7. [verified] `delivery tick` keeps a CRLF delivery CRLF and counts only fresh ticks; the header writer adds a line in the file's own ending; `delivery check` names a `+ [ ]` Release box that `tick` lists — verified by `packages/doctrina-cli/test/um-arquivo-crlf-continua-crlf.test.js`.

## Out of scope for this spec

- Calling the tracker, the wiki, the design tool or any model: the
  playbook says what to read; the agent reads it.
- Running two writers in one repository: ADR 0030 forbids it.

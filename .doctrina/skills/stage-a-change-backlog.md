---
name: stage-a-change-backlog
description: Open several changes as a planned-but-not-started backlog that still passes analyze, without the context pack overflowing its budget.
when: The task opens more than one change at a time, or parks a change to be implemented in a later session (a review, an audit, a roadmap turned into work).
---

# Skill — stage-a-change-backlog

## When to use this skill

- A review, audit, or roadmap produced a list of work items and each
  one should become a `doctrina` change now, implemented later.
- A change must be opened and left parked for the next session.
- More than about three changes will be open at the same time.

## Procedure

1. **Measure the context headroom BEFORE opening anything.** Open
   changes are tier `CORE` in `packages/doctrina-cli/src/commands/context.js`:
   they never degrade and are never dropped, so each one is a permanent
   subtraction from every capability pack until it archives.

   ```sh
   for cap in "" $(ls .doctrina/specs); do
     doctrina context $cap | grep -E "within budget|over budget"
   done
   ```

   A scaffolded, empty change costs ~380 tokens; an authored one costs
   1200–2000. If the tightest pack is already above ~85%, a backlog of
   any size will push some pack over and `doctrina context <cap>` will
   exit 1 — which fails the `Context budget gate` job in CI. Decide what
   to do about that *before* opening 20 folders, and say so out loud.

2. **Number the ids so the number carries the priority.** `work`
   allocates the next sequential `NNNN` on its own, which encodes only
   arrival order. Pass `--id NNNN-slug` explicitly and allocate in
   priority order, so `doctrina next` and `prime` list the backlog in
   the order it should be drained.

3. **Open each change with `--quiet` and `--capability`.**

   ```sh
   doctrina work "<the finding, in one or two sentences>" \
     --id 0032-short-slug --capability <cap> --title "short title" --quiet
   ```

   - `--quiet` prints one line instead of the ~50-line playbook. Without
     it, N changes print N identical playbooks.
   - `--capability` scaffolds `specs/<cap>/delta.md` with `**Operation:**`
     prefilled (MODIFIED when the spec exists, ADDED when it does not).
     Without it no delta is created at all, and a delta with a missing
     `Operation` header is the failure that surfaces days later in
     `analyze`.
   - `--title` keeps the proposal H1 and the slug short while the full
     prompt still lands under `## Why`.
   - Confirm the capability against the spec that actually OWNS the area
     first — read each spec's `## Purpose`. In this repository: `gates`
     owns the gate/read-path/insight commands and `context`; `cli` owns
     the surface, `work`/`change`/`spec`/`triage` and `next`;
     `scaffolding` owns `init`/`templates`/`hooks`/`index`/`upgrade`/
     `watch`/`metrics`/`completion`; `templates` owns the shipped
     templates and the surface block; `validation` owns the document
     model.

4. **Plan every change before leaving it.** `analyze` FAILS on a
   `tasks.md` that still holds scaffold placeholders (`- [ ]` with no
   text), and `change tick` refuses to tick an empty box. "Open it and
   leave it" is not a state the framework accepts — a parked change is
   one that is *planned* and not *started*:

   - `## Why` and `## What` written (a heading that survived is not a
     section that was written — `analyze` looks inside).
   - `tasks.md` holding real, checkable, unchecked steps.
   - The delta scaffolded with the right `Operation`, body left for the
     implementing session; make "write the EARS body" the last task.

5. **Verify the whole backlog, not one change.**

   ```sh
   for d in .doctrina/changes/0*/; do
     doctrina analyze "$(basename "$d")" | tail -1
   done
   doctrina validate
   ```

   Every change must report `ready to apply` and `validate` must show
   0 errors before the session ends.

6. **Write the files whole, not with patches.** See
   [[patch-doctrina-files-as-crlf]] — `.doctrina/` is CRLF and a
   `\n\n`-anchored replacement silently no-ops, which is how six hollow
   proposals once reached the archive.

## Anti-patterns

- Opening the backlog first and discovering the budget wall afterwards.
  The measurement in step 1 costs one command; undoing 20 changes costs
  20 `change abandon` calls and 20 ledger lines.
- Leaving `tasks.md` with the scaffold's three empty boxes "to fill in
  later". `analyze`, `change check` and `close` all refuse it, so the
  change is not parked — it is broken.
- Letting `work` allocate the ids, then trying to communicate priority
  in the title. The id is what `next`, `prime` and the ledger sort on.
- Opening a change per finding when several findings are literally the
  same edit. One change per closeable unit; group only where the work
  is genuinely one patch.

## Related material

- `.doctrina/specs/cli/spec.md` — the `work` and `change` contracts.
- `.doctrina/specs/gates/spec.md` — `analyze`, `context`, and the
  budget semantics.
- ADR 0022 — context assembly is retrieval, not a dump.
- [[triage-holds-work-on-the-machinery]] — why some of these prompts
  get held at exit 3.

---
name: triage-holds-work-on-the-machinery
description: Recognise when the lane classifier holds an authoring task as RUNTIME because of its nouns, and decide between --force, --chore and an actual diagnosis.
when: `doctrina work` exits 3 with "hold: this reads as a RUNTIME problem", or a prompt about workflows, CI, metrics, logs, secrets or selectors is about to be scaffolded.
---

# Skill — triage-holds-work-on-the-machinery

## When to use this skill

- `doctrina work "<prompt>"` exits 3 and prints
  `hold: this reads as a RUNTIME problem, not a change of behaviour`.
- The prompt is about building or documenting the observability, CI,
  release, metrics, or configuration machinery — as opposed to
  diagnosing it.

## The distinction the classifier is trying to draw

`classify()` in `packages/doctrina-cli/src/commands/triage.js` scores a
prompt against three weighted term sets and holds the request when
RUNTIME wins by a margin of two or more. The hold exists for a real
reason: a broken workflow used to become a change with a proposal,
tasks and a spec delta — ceremony spent on a diagnosis, and a close that
attested to nothing.

But the RUNTIME and CHORE signal lists match domain **nouns**, and the
PRODUCT list only partly compensates with authoring **verbs**
(`declare`, `document`, `record`, `specify`, `define`). So a prompt that
is unambiguously authoring work still gets held whenever it names enough
machinery. Observed, in one session of opening 20 changes, all three
holds were false:

| Prompt (abridged) | Held on | Actually |
|---|---|---|
| move the playbooks into overridable **templates** | `config`, `wiring` | authoring |
| make the **ledger** a readable source for `report` and `review` | `logs`, `metrics` | authoring |
| **metrics** and the usage **log** feed the flow | `logs`, `config` | authoring |

## Procedure

1. **Answer one question: is the spec wrong, or is the running system
   wrong?**
   - The requirement is missing or must change → PRODUCT → `--force`.
   - The requirement exists and only the implementation moves →
     CHORE → `--chore` (no EARS delta, and no hold either).
   - Something is wired, empty, or ran nothing → RUNTIME → do not
     scaffold. Diagnose.

2. **If it is a diagnosis, follow the hold.** It is right more often
   than it is wrong:

   ```sh
   doctrina triage "<prompt>"     # the lane, plus the runtime checks
   doctrina contract check        # declared wiring vs the workflow
   doctrina verify                # the real build gate
   ```

   Open a change only once the diagnosis shows the requirement itself is
   missing.

3. **If it is authoring, force it and say why.**

   ```sh
   doctrina work "<prompt>" --id NNNN-slug --capability <cap> --force
   ```

   `--force` is the documented escape and the hold's own message points
   at it. It is not a workaround.

4. **Prefer rewording only when the reworded prompt is still honest.**
   Leading with an authoring verb — "declare…", "document…", "record…",
   "specify…" — usually clears the hold, because those verbs carry
   weight 3 in the PRODUCT list. Do not bend the prompt away from what
   the change actually is just to please the classifier: the prompt
   lands verbatim under `## Why` and is the change's provenance.

5. **Record the disagreement if the project tracks it.** The lane the
   change was opened in — and whether a human overrode it — is the only
   data that calibrates this classifier at all.

## Anti-patterns

- Treating exit 3 as "the prompt is bad" and rewording it in circles.
  Exit 3 is the PRECONDITION class: the work may be perfectly valid,
  this project has simply not been diagnosed yet.
- Reaching for `--chore` to dodge the hold on work that genuinely needs
  a spec delta. `--chore` skips the delta steps entirely; needing one
  later means it was never a chore.
- Assuming a held prompt is wrong. The hold is a hint
  with the same status as the capability guess in `work` — arguable,
  not authoritative.

## Related material

- ADR 0024 — a request is classified into a lane before it is scaffolded.
- ADR 0023 — the runtime surface is declared, never inferred.
- `packages/doctrina-cli/src/commands/triage.js` — the three signal
  lists and the margin rule.
- [[stage-a-change-backlog]] — where this trap shows up once per change
  in a row.

<!-- delta body below -->

# Spec — Request Triage

**Capability:** triage
**Status:** active
**Implementation:** implemented
**Realizes:** n/a — internal framework capability; product success criteria measure adopting-team outcomes, not the tool's own surface
**Depends on:** cli, authoring
**Source:** `packages/doctrina-cli/src/commands/triage.js`, `packages/doctrina-cli/src/lib/triage-model.js`
**Last updated:** 2026-11-12
**Version:** 0.1.0

## Purpose

Define how a request is read BEFORE anything is scaffolded: which lane it
belongs to (PRODUCT, RUNTIME or CHORE) and which track it takes — how much
ceremony it earns. `doctrina triage` prints the reading; `doctrina work`
consults the same classifier and acts on it.

Split out of the `authoring` spec when that spec reached its 400-line cap
(change 0255). The seam is the decision itself: `authoring` keeps the
commands that write artifacts, and this spec keeps the reading that says
whether there is an artifact to write.

## Requirements (EARS)

### Ubiquitous

- The system shall treat the lane classification as a hint and never a refusal: `--force` opens the change regardless, and `--chore` selects the spec-less lane directly.
- The system shall default an unclassifiable request to the PRODUCT lane, so that a lane is only changed by a signal and never by the absence of one.
- The system shall classify a prompt into its lane after folding it (accents stripped, case folded) and with signal lists that carry both English and Portuguese vocabularies, so that a request phrased in either language is read into the same lane.
- The system shall decide a request's track by what the request changes and not by the size of its diff: direct when nothing a spec says changes, chore when the build, the tooling or the docs change with no spec change, and change when a sentence in a spec becomes false or one is missing.
- The system shall state the direct track in the standing instructions an agent reads — `AGENTS.md`, the Cursor rule, the prompt pulse and `doctrina work --help` — because a fix that restores what a spec already says is direct and no word list can recognise it.

### Event-driven

- When `doctrina triage "<prompt>"` runs, the system shall classify the request as PRODUCT, RUNTIME or CHORE by deterministic term matching, print the signals it matched, and print that lane's playbook.
- When `doctrina triage` runs with or without a prompt, the system shall run the declared runtime checks over every contract and exit 1 when any runtime error stands.
- When `doctrina work` receives a prompt that classifies as RUNTIME with a margin over the runner-up lane, the system shall hold the request with the precondition exit code, name the diagnosis path, and scaffold nothing.
- When `doctrina work` opens a change, the system shall record in the proposal the lane the request classified as, how confident that reading was, the signals that decided it, and any lane the operator chose instead.
- When `doctrina work` receives a prompt whose words name a direct edit — a typo, a misspelling, whitespace, a stale comment, dead code, an unused import — and that carries no product or runtime signal, the system shall scaffold nothing, print the three tracks with the path of each, and exit 0.
- When `doctrina work` is given `--force`, `--chore`, `--from-diff`, `--capability`, `--delivery` or `--id`, the system shall open the change without reading the prompt for the direct track.
- When `doctrina triage "<prompt>"` reads a prompt as direct, the system shall print the direct track in place of the lane, and with `--json` report `track` as `direct`, `chore`, `change` or `diagnosis`.

### Unwanted-behavior (must-not)

- The system shall not let a recorded lane change what any gate decides; it is a historical record, and a change carrying an unrecognised lane shall be treated exactly as one carrying none.
- The system shall not read a prompt as direct on a bare "comment" or "formatting", which also name features, nor when the prompt carries a product or a runtime signal.

## Acceptance criteria

The triage is v0 spec-compliant when:

1. [verified] A runtime-shaped prompt is held by `work` with exit 3 and scaffolds nothing, while `--force` and `--chore` proceed — verified by `packages/doctrina-cli/test/runtime-commands.test.js`.
2. [verified] The classifier separates the three lanes and defaults an unclassifiable prompt to PRODUCT — verified by `packages/doctrina-cli/test/runtime-commands.test.js`.
3. [verified] A change opened by `work` records its lane, confidence and signals, and an operator who overrides the reading has that disagreement recorded too — verified by `packages/doctrina-cli/test/lane-record.test.js`.
4. [verified] The lane reaches the index, its absence is left absent rather than guessed, and a report counts an unrecorded lane as unknown — verified by `packages/doctrina-cli/test/lane-record.test.js`.
5. [verified] Rewriting a proposal's lane to a nonsense value changes no gate's verdict or output — verified by `packages/doctrina-cli/test/lane-record.test.js`.
6. [verified] Runtime, chore and product prompts are read into the same lane in Portuguese and in English, accents do not change the scores, and `work` holds the Portuguese runtime prompt with exit 3 — verified by `packages/doctrina-cli/test/the-triage-speaks-portuguese.test.js`.
7. [verified] A prompt naming a typo, a misspelling, whitespace, a stale comment, dead code or an unused import reads as direct in English and in Portuguese, while a bare "comment" or "formatting" and a prompt carrying a product or a runtime signal do not, and the lane reading is unchanged — verified by `packages/doctrina-cli/test/as-tres-trilhas-por-tamanho.test.js`.
8. [verified] `work` given a direct prompt exits 0, prints the three tracks with their paths and scaffolds nothing, while `--force`, `--chore`, `--id` and `--capability` open the change — verified by `packages/doctrina-cli/test/as-tres-trilhas-por-tamanho.test.js`.
9. [verified] `triage` prints the direct track in place of the lane and `--json` carries `track` as direct, change or null — verified by `packages/doctrina-cli/test/as-tres-trilhas-por-tamanho.test.js`.
10. [verified] `AGENTS.md`, its template, the Cursor rule, its template, the prompt pulse and `work --help` state the direct track — verified by `packages/doctrina-cli/test/as-tres-trilhas-por-tamanho.test.js`.

## Out of scope for this spec

- Opening, writing and closing the change a request becomes — covered by
  the `authoring` capability spec.
- The runtime checks `triage` runs over the contracts — their semantics
  are covered by the `gates` capability spec.
- Whether a fix restores specified behaviour: that judgement stays the
  agent's (ADR 0005).

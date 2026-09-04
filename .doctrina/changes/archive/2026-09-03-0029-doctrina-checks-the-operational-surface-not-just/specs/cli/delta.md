# Spec Delta — capability: cli

**Operation:** MODIFIED
**Target spec on apply:** `.doctrina/specs/cli/spec.md`

---

The command surface gains `doctrina triage`, and `work` gains the lane
hold that precedes scaffolding. See ADR 0024.

```ops
append-requirement event: When `doctrina triage "<prompt>"` runs, the system shall classify the request as PRODUCT, RUNTIME or CHORE by deterministic term matching, print the signals it matched, and print that lane's playbook.
append-requirement event: When `doctrina triage` runs with or without a prompt, the system shall run the declared runtime checks over every contract and exit 1 when any runtime error stands.
append-requirement event: When `doctrina work` receives a prompt that classifies as RUNTIME with a margin over the runner-up lane, the system shall hold the request with the precondition exit code, name the diagnosis path, and scaffold nothing.
append-requirement ubiquitous: The system shall treat the lane classification as a hint and never a refusal: `--force` opens the change regardless, and `--chore` selects the spec-less lane directly.
append-requirement ubiquitous: The system shall default an unclassifiable request to the PRODUCT lane, so that a lane is only changed by a signal and never by the absence of one.
append-requirement event: When `doctrina skill suggest --from-error <text|file>` runs, the system shall draft one skill from that failure with a trigger built from the error's paths, identifiers and distinctive terms, and shall treat the flag given without a value as a usage error.
append-requirement event: When `doctrina context --for "<task>"` runs, the system shall rank on-demand skills by the task's match against their trigger and mark the ones that match.
append-criterion [verified] A runtime-shaped prompt is held by `work` with exit 3 and scaffolds nothing, while `--force` and `--chore` proceed — verified by `packages/doctrina-cli/test/runtime-commands.test.js`.
append-criterion [verified] The classifier separates the three lanes and defaults an unclassifiable prompt to PRODUCT — verified by `packages/doctrina-cli/test/runtime-commands.test.js`.
append-criterion [verified] `skill suggest --from-error` drafts a trigger that satisfies validate's trigger check, and refuses a valueless flag — verified by `packages/doctrina-cli/test/orchestration.test.js`.
bump-version minor
```

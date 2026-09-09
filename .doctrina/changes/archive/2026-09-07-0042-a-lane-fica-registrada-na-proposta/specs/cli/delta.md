# Spec Delta — capability: cli

**Operation:** MODIFIED
**Target spec on apply:** `.doctrina/specs/cli/spec.md`

---

<!-- delta body below -->

The classifier ran, decided whether to hold the request, printed the signals
that matched — and discarded the verdict. This delta makes the verdict an
artifact, and states the two boundaries that keep it useful rather than
dangerous: it records the operator's disagreement, and no gate reads it.

```ops
append-requirement event: When `doctrina work` opens a change, the system shall record in the proposal the lane the request classified as, how confident that reading was, the signals that decided it, and any lane the operator chose instead.
append-requirement event: When a period is reported, the system shall aggregate the recorded lanes and count a change with no recorded lane as unknown rather than assigning it one.
append-requirement unwanted: The system shall not let a recorded lane change what any gate decides; it is a historical record, and a change carrying an unrecognised lane shall be treated exactly as one carrying none.
append-criterion [verified] A change opened by `work` records its lane, confidence and signals, and an operator who overrides the reading has that disagreement recorded too — verified by `packages/doctrina-cli/test/lane-record.test.js`.
append-criterion [verified] The lane reaches the index, its absence is left absent rather than guessed, and a report counts an unrecorded lane as unknown — verified by `packages/doctrina-cli/test/lane-record.test.js`.
append-criterion [verified] Rewriting a proposal's lane to a nonsense value changes no gate's verdict or output — verified by `packages/doctrina-cli/test/lane-record.test.js`.
bump-version minor
```

# Spec Delta — capability: authoring

**Operation:** MODIFIED
**Target spec on apply:** `.doctrina/specs/authoring/spec.md`

---

<!-- delta body below -->

Um número que nomeia uma caixa nomeia a mesma caixa em toda chamada, e
todo bullet Markdown abre uma caixa.

```ops
append-requirement ubiquitous: The system shall number the boxes of a change — tasks.md, then the proposal's Verification — in reading order over every box, ticked or not, so that an ordinal names the same box on every invocation of `change tick`.
append-requirement event: When `change tick` names a box that is already ticked, the system shall leave it as is and say so; when it names something that is not a box number, the system shall refuse with the usage class and name the argument.
append-requirement ubiquitous: The system shall treat a task line opened by any Markdown bullet marker (`-`, `*`, `+`) as a box, for `change tick` and for the archive gate alike.
append-criterion [verified] Four sequential `change tick <id> 1..4` calls tick tasks 1-4 and never a closing step or a Verification claim; a `* [ ]` task is ticked and counted; `tick <id> abc` exits 2 naming the argument — verified by `packages/doctrina-cli/test/a-box-keeps-its-number.test.js`.
bump-version minor
```

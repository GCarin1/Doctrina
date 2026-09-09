# Spec Delta — capability: cli

**Operation:** MODIFIED
**Target spec on apply:** `.doctrina/specs/cli/spec.md`

---

<!-- delta body below -->

Ubiquitous 12 already said git availability is interpreted in ONE module. It
was true of the interpretation and false of the calls: four modules asked git
their own question and read a refusal as an empty answer. This delta widens
that requirement from "interpret in one place" to "ask in one place", and adds
the same rule for the vocabulary the CLI reads natural language with.

```ops
replace-requirement ubiquitous 12: The system shall invoke and interpret git in one module, distinguishing a repository with history from an empty one, from a directory that is not a repository, and from a command that failed; no other module shall invoke git directly.
append-requirement ubiquitous: The system shall define in one module the vocabulary it reads natural language with — how text is folded, which words carry no signal, and how strongly a document answers a query — and every command that ranks or classifies text shall read it from there.
append-requirement event: When two surfaces rank the same text, the system shall rank it identically, deriving any single score from the same relevance it orders by rather than computing a second one.
append-requirement event: When a caller asks which files changed, the system shall distinguish an empty answer from an inability to answer, and shall let the caller choose whether untracked files and a branch's earlier commits count.
append-criterion [verified] No module outside the git door invokes git, and no module outside the lexicon carries a second stop list or fix-shaped pattern — verified by `packages/doctrina-cli/test/one-door.test.js`.
append-criterion [verified] The changed-files door reports a clean tree and an unanswerable question differently, and its merge-base option is what makes a branch's earlier commits count — verified by `packages/doctrina-cli/test/one-door.test.js`.
append-criterion [verified] `work` and `context --for` choose the same capability for the same prompt, in either language, with accents folded — verified by `packages/doctrina-cli/test/one-door.test.js`.
append-criterion [verified] Relevance is a tuple and the score is its projection, so a long document cannot out-rank a focused one on volume — verified by `packages/doctrina-cli/test/one-door.test.js`.
bump-version minor
```

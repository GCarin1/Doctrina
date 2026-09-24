# Spec Delta — capability: gates

**Operation:** MODIFIED
**Target spec on apply:** `.doctrina/specs/gates/spec.md`


---

O `change check` cobre o `analyze`; o `analyze` é depreciado.

```ops
append-requirement event: When the deprecated `doctrina analyze <id>` runs, the system shall behave as before and name `doctrina change check` on stderr, because `change check` prints the same structural checks as its first section and then answers whether the close would pass — so it also exits with the gate class while a Verification box is open, where `analyze` did not; `change apply` keeps refusing what `analyze` refused.
append-requirement event: When a change has its tasks done and a delta to merge, `doctrina next` shall recommend `doctrina change check <id>` followed by `doctrina close <id>`, and when the close stops on its structural step it shall name `doctrina change check <id>` as the rerun instead of the deprecated `analyze`.
append-criterion [verified] Over a hollow change `analyze` and the first section of `change check` print the same check lines with the same verdict; over a structurally sound change with open Verification boxes `analyze` exits 0 and `change check` exits 1 naming the verification blocker while `change apply` still refuses a hollow proposal; `analyze` warns naming `change check`, and `close` and `next` point to `change check` — verified by `packages/doctrina-cli/test/o-change-check-cobre-o-analyze.test.js`.
bump-version minor
```

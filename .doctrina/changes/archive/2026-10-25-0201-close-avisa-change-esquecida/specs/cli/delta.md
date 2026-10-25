# Spec Delta — capability: cli

**Operation:** MODIFIED
**Target spec on apply:** `.doctrina/specs/cli/spec.md`

---

```ops
append-requirement unwanted: The system shall not point an applied change, or a change with no delta, at `change archive` or `change apply` from `next`: the action is `doctrina close <id>`, which `next --run` can execute.
append-criterion [verified] `next` names `doctrina close <id>` for an applied change and for a delta-less one, its record carries `command: "close"`, and no line names `change archive` or `change apply` — verified by `packages/doctrina-cli/test/o-close-avisa-a-change-esquecida.test.js`.
bump-version minor
```

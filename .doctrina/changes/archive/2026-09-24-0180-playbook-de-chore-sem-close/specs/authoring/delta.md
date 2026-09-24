# Spec Delta — capability: authoring

**Operation:** MODIFIED
**Target spec on apply:** `.doctrina/specs/authoring/spec.md`

---

Uma chore fecha como toda change: pelo `close`.

```ops
replace-requirement event 6: When `doctrina work --chore` (alias `--no-spec`) runs, the system shall open a spec-less chore change and print a playbook that omits the spec-delta steps (ADR 0010) and ends, like the work playbook, with `doctrina close <id>` — never a hand-run apply, archive and validate, which skip the close's review, documentation, coverage, trace and ADR gates.
append-criterion [verified] The chore playbook and its opening line name `doctrina close` and neither `change apply` nor `change archive`, and a chore done by its playbook closes in one pass in a fresh project — verified by `packages/doctrina-cli/test/a-chore-fecha-como-toda-change.test.js`.
bump-version minor
```

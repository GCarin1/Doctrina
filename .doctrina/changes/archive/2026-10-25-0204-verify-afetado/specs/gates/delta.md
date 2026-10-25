# Spec Delta — capability: gates

**Operation:** MODIFIED
**Target spec on apply:** `.doctrina/specs/gates/spec.md`

---

```ops
append-requirement optional: Where `verify --affected` is given, the system shall run a check that declares `paths` only when the uncommitted work touches one of them, run every check that declares none, name the checks it skipped, and never remember such a run as green; `close` shall never pass it.
append-criterion [verified] With an edit under `packages/api`, `verify --affected` runs the api check and the path-less one and skips the web check by name; an untracked file counts as touched; the partial run is not reused; plain `verify` runs all three; and `close` never passes `--affected` — verified by `packages/doctrina-cli/test/o-verify-afetado-roda-so-o-que-mudou.test.js`.
bump-version minor
```

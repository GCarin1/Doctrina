# Spec Delta — capability: cli

**Operation:** MODIFIED
**Target spec on apply:** `.doctrina/specs/cli/spec.md`

---

Hollow-change teeth (user report 2026-07-19): `work` opened the change,
the agent left the scaffolded artifacts empty and implemented with no
recorded plan, and nothing barked until archive — where ticking the
empty boxes gamed the gate. Three teeth, one per moment: validate warns
early, tick refuses the game, analyze (and so check/close) hard-fails.

```ops
bump-version minor
set-header Last updated: 2026-07-19
append-requirement event: When `doctrina analyze` finds `tasks.md` still carrying a scaffold placeholder task (`- [ ]` with no text, checked or not), the system shall fail, telling the operator to plan the change before implementing; `change check` and `close` inherit the refusal.
append-requirement event: When `doctrina change tick` targets a box whose text is empty, the system shall refuse without ticking anything and shall name the fix; the tick listing shall mark such boxes as scaffold placeholders.
append-requirement event: When `doctrina validate` finds an open change whose `tasks.md` still carries scaffold placeholder tasks, the system shall warn that the change was opened but never planned.
append-criterion [verified] A hollow change cannot close: analyze fails on scaffold placeholders, `change tick` refuses empty boxes, validate warns on every run — verified by `packages/doctrina-cli/test/integration.test.js`.
```

# Spec Delta — capability: gates

**Operation:** MODIFIED
**Target spec on apply:** `.doctrina/specs/gates/spec.md`

---

```ops
append-requirement event: When a close finishes, whatever its outcome, the system shall list the other open changes — one line each for a change that looks finished (applied, or every task ticked) and was never closed, with its close command, and for one open 7 days or more, with its age — and count the rest, without moving the exit code.
append-criterion [verified] Closing one change prints the other open changes, naming the finished-but-open and the 20-day-old ones and counting the recent one, never the change being closed — verified by `packages/doctrina-cli/test/o-close-avisa-a-change-esquecida.test.js`.
bump-version minor
```

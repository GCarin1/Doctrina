# Spec Delta — capability: gates

**Operation:** MODIFIED
**Target spec on apply:** `.doctrina/specs/gates/spec.md`

---

<!-- delta body below -->

The escape hatch from the build gate was the one place a green gate could lie
indefinitely. This delta gives a signature an expiry and states the rule that
governs all four of its states — deliberately the same rule `pending` already
followed, so a manual check keeps one rule rather than gaining a second.

```ops
replace-requirement event 28: When a `verify.json` check declares `"type": "manual"`, the system shall not run a command for it but treat it as a qualitative gate whose sign-off records the commit it was made at and the paths the check declares it covers; it passes only while none of those paths has changed since, and is otherwise reported as pending, expired, or unverifiable — non-blocking by default, failing under `--strict`. `doctrina verify --signoff "<name>=<note>"` shall record such a sign-off for a declared manual check and exit (review 2026-06-27).
append-requirement ubiquitous: The system shall report a sign-off it cannot hold to the code — one carrying no commit, covering no declared path, or made outside a repository — as unverifiable rather than passing, and shall distinguish executed proof from signed proof wherever it reports the build gate.
append-requirement unwanted: The system shall not infer which paths a manual check covers; an undeclared coverage shall make the sign-off unverifiable rather than assumed.
append-criterion [verified] A signature records what it covers and the commit it covers it at, expires when a covered path changes by commit or by an uncommitted edit, and survives a change elsewhere — verified by `packages/doctrina-cli/test/signoff.test.js`.
append-criterion [verified] A sign-off with no recorded commit, no declared paths, or made outside a repository is reported unverifiable rather than passing, and warned about at signing time — verified by `packages/doctrina-cli/test/signoff.test.js`.
append-criterion [verified] Every non-fresh state is non-blocking by default and fails `--strict`, each manual check falls into exactly one state, and every read-only view and `doctor` report signed proof separately from executed proof — verified by `packages/doctrina-cli/test/signoff.test.js`.
bump-version minor
```

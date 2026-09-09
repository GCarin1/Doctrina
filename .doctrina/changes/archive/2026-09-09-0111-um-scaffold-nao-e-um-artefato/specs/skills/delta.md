# Spec Delta — capability: skills

**Operation:** MODIFIED
**Target spec on apply:** `.doctrina/specs/skills/spec.md`

---

<!-- delta body below -->

Um trigger que ainda é o do template não dispara para ninguém.

```ops
append-requirement unwanted: The system shall not treat a `when:` trigger still in the scaffold's `<...>` form as detectable, and `skill sync` shall say the skill is still the scaffold rather than report it up to date.
append-criterion [verified] A scaffolded skill's `when:` is not a detectable trigger and `skill sync` names it as scaffold; once filled, sync indexes it — verified by `packages/doctrina-cli/test/a-scaffold-is-not-an-artifact.test.js`.
bump-version minor
```

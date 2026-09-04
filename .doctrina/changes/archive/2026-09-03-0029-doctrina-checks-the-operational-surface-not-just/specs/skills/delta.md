# Spec Delta — capability: skills

**Operation:** MODIFIED
**Target spec on apply:** `.doctrina/specs/skills/spec.md`

---

A skill can be seeded from the error that taught the lesson, and a skill
whose trigger nothing can match is surfaced as such.

```ops
append-requirement ubiquitous: A skill's `when:` trigger shall name something a task can be matched against — a keyword, path, command, or error string — because context ranks skills by that trigger.
append-requirement event: When a skill is drafted from an error, the system shall fill its trigger from that error's own paths, identifiers and distinctive terms, and shall leave the procedure to the author.
append-criterion [verified] A trigger drafted from an error satisfies validate's detectable-trigger check — verified by `packages/doctrina-cli/test/orchestration.test.js`.
append-criterion [verified] Skills matching a `--for` query are ranked above the rest and marked — verified by `packages/doctrina-cli/test/context-retrieval.test.js`.
bump-version minor
```

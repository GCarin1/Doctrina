# Spec Delta — capability: validation

**Operation:** MODIFIED
**Target spec on apply:** `.doctrina/specs/validation/spec.md`

---

`validate` gains ordered pipeline requirements and the skill-trigger
check, and can run the runtime gate alongside the structural one.

```ops
append-requirement event: When a spec declares a `### Pipeline` block, the system shall report as an error any step that requires an artifact which no earlier step produces, and any step numbering that does not read in execution order.
append-requirement ubiquitous: The system shall treat an artifact marked `(external)` in a Pipeline step as supplied from outside the pipeline, and shall not require a producing step for it.
append-requirement event: When a skill's `when:` frontmatter names no concrete keyword, path, command or error string, the system shall warn that nothing can match the trigger.
append-requirement optional: Where `--runtime` is given, the system may additionally run the declared runtime checks and report their findings as validation errors and warnings.
append-criterion [verified] A pipeline step requiring what a later step produces is an error, and the same steps in order are not — verified by `packages/doctrina-cli/test/pipeline.test.js`.
append-criterion [verified] A vague skill trigger warns and a concrete one does not — verified by `packages/doctrina-cli/test/orchestration.test.js`.
bump-version minor
```

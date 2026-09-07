# Spec Delta — capability: templates

**Operation:** MODIFIED
**Target spec on apply:** `.doctrina/specs/templates/spec.md`

---

<!-- delta body below -->

The procedure the agent executes was the one scaffold an adopter could not
change, and it was written out four times: in code, in AGENTS.md, and in both
workflow docs. This delta makes a playbook a template like any other, and
states the two rules that keep it a document rather than a language.

```ops
append-requirement ubiquitous: The system shall treat the playbooks it prints as templates resolved project-over-bundled per file, so an adopting team can replace the procedure its agent executes.
append-requirement ubiquitous: The system shall pre-render every variable part of a playbook into a plain token value, and shall not evaluate conditionals or loops declared inside a template.
append-requirement event: When a playbook is rendered, the system shall expand its colour markup before substituting tokens, so a token's value cannot introduce markup, and shall remove a line that holds only a token whose value is empty.
append-requirement event: When `doctrina templates check` runs, the system shall report a playbook that does not resolve, and one whose body is empty, has no numbered first step, or leaves a colour span unclosed.
append-criterion [verified] Every playbook variant — work, chore, pinned capability, thin prompt and bootstrap — renders byte-identically to the pre-migration implementation, colour codes included — verified by `packages/doctrina-cli/test/playbooks.test.js`.
append-criterion [verified] A playbook placed in the project's template directory overrides the bundled one per file, leaving the others bundled — verified by `packages/doctrina-cli/test/playbooks.test.js`.
append-criterion [verified] A token's value carrying colour markup is printed literally rather than expanded — verified by `packages/doctrina-cli/test/playbooks.test.js`.
append-criterion [verified] A missing or malformed playbook is reported by `templates check` with the remedy that clears it — verified by `packages/doctrina-cli/test/playbooks.test.js`.
bump-version minor
```

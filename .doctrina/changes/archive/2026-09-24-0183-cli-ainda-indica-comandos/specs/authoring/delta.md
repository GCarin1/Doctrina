# Spec Delta — capability: authoring

**Operation:** MODIFIED
**Target spec on apply:** `.doctrina/specs/authoring/spec.md`

---

O playbook que o `work` descreve termina no `close`.

```ops
replace-requirement event 3: When `doctrina work "<prompt>"` runs, the system shall derive a sequential change id of the form `NNNN-<slug>` (the next number across open and archived changes; the slug an ASCII-folded kebab-case of the prompt), scaffold the change folder via the same path as `change new`, record the prompt verbatim under the proposal's `## Why`, rank existing specs by deterministic term overlap as a capability hint, and print the agent-executed work playbook (context, spec delta, tasks, implement, then `doctrina change check <id>` to preview the close and `doctrina close <id>` to finish). With `--capability <cap>` the system shall pin that capability instead of ranking, and with `--id <id>` it shall use the given id instead of deriving one. The CLI's language processing is limited to slugging and case-insensitive term counting; all semantic work is the executing agent's.
bump-version patch
```

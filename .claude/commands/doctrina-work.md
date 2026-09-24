---
description: Turn a request into a Doctrina change and drive it through the gates
argument-hint: <prompt describing the change>
---

Drive the Doctrina spec-driven workflow for **Doctrina**.

1. `doctrina work "$ARGUMENTS"` — scaffolds the change and prints the playbook.
   (No prompt, but you already edited code? Use `doctrina work --from-diff`.)
2. Execute the printed playbook in order: read the pack with
   `doctrina context <capability> --concat`, write the spec delta, fill
   `tasks.md`, implement, then `doctrina analyze <id>` → `doctrina change apply <id>`.
3. Close it: `doctrina close <id>` — one attested pass over every gate. The
   sequence is declared in one place and printed by `doctrina close --help`;
   read it there rather than from a copy. Resolve every `error:` before
   reporting the work done.

Reach for the CLI instead of hand-authoring artifacts. Ask the human only on
genuine ambiguity.

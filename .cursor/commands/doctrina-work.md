# /doctrina-work — drive a change for Doctrina

Turn the request into a Doctrina change and drive it through the gates.

1. Run `doctrina work "<the request>"` (or `doctrina work --from-diff` if you
   already edited code) and follow the printed playbook.
2. `doctrina context <capability> --concat` → write the spec delta → fill
   `tasks.md` → implement → `doctrina analyze <id>` → `doctrina change apply <id>`.
3. `doctrina close <id>` — one attested pass over every gate; the sequence is
   declared in one place and printed by `doctrina close --help`, so read it
   there and not from a copy. Resolve every `error:` before reporting done.

Prefer the CLI over hand-authoring artifacts. Ask only on genuine ambiguity.

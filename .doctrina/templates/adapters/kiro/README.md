# Kiro adapter

Kiro (the IDE and the CLI) reads `AGENTS.md` natively: a file at the
root of the workspace is picked up automatically and is always
included — it takes no inclusion mode, unlike a steering file under
`.kiro/steering/`. No adapter file is installed for Kiro.

This directory exists so the templates inventory is symmetric
across supported agents, and so future Kiro-specific affordances
have an obvious home.

Two things to know when the two tools share a repository:

- Keep requirements in `.doctrina/specs/`, not in Kiro's own
  `.kiro/specs/`. Two homes for one requirement drift apart, and
  only the Doctrina tree is what `doctrina validate`, `coverage`
  and `close` read.
- A steering file may add Kiro-only guidance, but it should not
  restate `AGENTS.md`: Kiro already loads it.

If you are reading this because `doctrina init --agent kiro` did
not create any files: that is the intended behaviour.

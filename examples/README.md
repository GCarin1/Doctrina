# Examples

Two reference projects demonstrating Doctrina in context. The
application code is intentionally minimal; the focus is on the
shape of `AGENTS.md`, `.doctrina/`, and the change workflow.

| Example | Project shape | Language / framework | Adapters installed |
|---------|---------------|----------------------|---------------------|
| [`python-fastapi-urls/`](./python-fastapi-urls/) | greenfield | Python + FastAPI | Claude Code |
| [`typescript-express-retrofit/`](./typescript-express-retrofit/) | brownfield retrofit | TypeScript + Express | Claude Code + Codex CLI + Cursor |

Each example ships:

- A small app (single route, no production hardening).
- A root `AGENTS.md` plus the per-agent adapter(s) for the
  example's scenario.
- A `.doctrina/` tree with `product.md`, capability specs, ADRs,
  one archived change folder showing the workflow, and a
  populated `index.json`.

To explore an example, run `doctrina validate` inside its
directory; it should exit 0. Then read in this order:

1. The example's `README.md` — framing and what to learn from it.
2. The root `AGENTS.md` — operational rules.
3. `.doctrina/product.md` — vision and scope of the demo project.
4. The capability spec(s) under `.doctrina/specs/<cap>/spec.md`.
5. The ADRs under `.doctrina/decisions/`.
6. The archived change folder under
   `.doctrina/changes/archive/` — exercises the workflow.

These examples were created against Doctrina v0.1.0 and remain
valid under v0.4.0. Newer Doctrina versions are backward-compatible
for `0.x.y`; minor adjustments may be needed if you regenerate the
examples against a future major.

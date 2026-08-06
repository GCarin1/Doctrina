# Templates and the override chain

Doctrina scaffolds every artifact from a template. Which template it uses
is resolved through a **chain**, per file (ADR 0019):

1. `<project>/.doctrina/templates/<relative path>` — your project's own.
2. The templates shipped with the installed CLI.

Anything you do not override falls back to the bundled copy. An empty
`.doctrina/templates/` — the state `doctrina init` scaffolds — behaves
exactly as if the chain did not exist.

## Seeing what resolves from where

```
doctrina templates list
```

Each entry is labelled `bundled` or `project`, and a project file that
shadows a bundled one is marked `overrides bundled`. Scaffolding commands
also say `(project template)` when they used your copy, so an override is
never a silent surprise.

## Overriding one

Copy the bundled template to the same relative path under your project's
`.doctrina/templates/`, then edit it. To find the path, read the left
column of `doctrina templates list`.

```
mkdir -p .doctrina/templates
cp "$(npm root)/doctrina-cli/templates/spec.md.template" .doctrina/templates/
$EDITOR .doctrina/templates/spec.md.template
```

The next `doctrina spec new <capability>` uses yours.

## What is safe to override

| Template | Used by | Notes |
|----------|---------|-------|
| `spec.md.template` | `spec new` | Keep the metadata headers — `validate` enforces their shape. |
| `spec-bug.md.template` | `spec new --bug` | Same. |
| `decision.md.template` | `decision new` | Keep the list-item headers (`- **Status:**`). |
| `contract.md.template` | `contract new` | |
| `skill.md.template` | `skill new`, `skill suggest --write` | Keep the `description:` frontmatter — the index reads it. |
| `change/proposal.md.template` | `change new`, `work` | Keep `## Why` and `## Verification`; `analyze` and the gates read them. |
| `change/tasks.md.template` | `change new`, `work` | Keep the checkbox shape. |
| `change/spec-delta.md.template` | `work --capability` | Keep the `**Operation:**` header. |
| `adapters/<name>/` | `adapter add` | A directory here is installable by name and can be an agent the CLI does not bundle. |

**Not overridable:** `AGENTS.md`'s `doctrina:surface` block is generated
from the installed command catalog and is rewritten in place (ADR 0015),
and `index.json` is written from the schema, not a template (audit C5).

## Tokens

Templates use `{{TOKEN}}` placeholders. The canonical set and each token's
meaning are documented in `.doctrina/templates/README.md` in the CLI's own
tree; a template using an undocumented token fails the template test.

## The trade-off

An overridden template is **pinned**: a CLI upgrade that improves the
bundled version will not reach your copy. `doctrina templates list` marks
your overrides so you can review them after upgrading. There is no
staleness check for overridden templates — if you override, you own it.

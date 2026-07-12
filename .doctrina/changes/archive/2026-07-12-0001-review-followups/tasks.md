# Tasks — Change 0001-review-followups

<!--
Each task is a single checkable item. Keep tasks small (under a few hours
of work). The change is done when every box is checked, including the
three closing steps at the bottom.
-->

- [x] `work`: truncate slugs at a word boundary; add `--title "<short>"` separate from the body; playbook prints `doctrina close` as the preferred close and an explicit ADR checkpoint.
- [x] Ops block: document the ```ops syntax in the delta template and `change apply --help`; `apply` treats `ADDED` onto an untouched `spec new` scaffold as whole-file replacement.
- [x] `coverage`: criteria in a spec with `Implementation: planned — <note>` count as `deferred` (visible, not a `--strict` failure); `close <id>` gates coverage on the change's touched capabilities only.
- [x] `clarify`: Portuguese-aware lexicon (skip EN false positives like the verb "some"/pronoun "todo") + inline suppression `<!-- clarify:ok -->`.
- [x] `skill suggest`: deduplicate candidates against existing skills (change-id citation or slug similarity).
- [x] Papercuts: `spec set` echoes the SPEC version; `change archive` flips the proposal `Status:` to `applied`; `design.md` scaffolds only under `--design`.
- [x] `intent add "SC15: <text>"`: append a new anchor to product.md post-intake (with `intent list`).
- [x] `**Depends on:**` spec header: parsed into the index; shown by `why`; pulled into `context <cap>`; used by `review` capability detection.
- [x] `rules`: lintable permanent project constraints in `.doctrina/rules.json`, enforced by `validate` (forbid-regex over globs).
- [x] `coverage --run`: execute cited evidence via a project-declared `evidence_runner` template, promoting "file exists" to "proof passes".
- [x] `upgrade`: one command to bring an existing project up to the installed CLI (templates update + index stamp migrate + AGENTS.md drift report).
- [x] Catalog + AGENTS.md (repo & template) + cli spec EARS + docs en/pt (cli-reference, flow) + CHANGELOG 0.12.0 + ADR recorded.
- [x] New tests for every behavior above; full suite green.

## Closing steps

- [x] Apply the change: merge each delta into the corresponding spec.
- [x] Archive the change folder to `.doctrina/changes/archive/2026-07-12-0001-review-followups/`.
- [x] Update `.doctrina/index.json` with new or modified artifacts.

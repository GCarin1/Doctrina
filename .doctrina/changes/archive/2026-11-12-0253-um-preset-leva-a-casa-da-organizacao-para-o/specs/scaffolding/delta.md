# Spec Delta — capability: scaffolding

**Operation:** MODIFIED
**Target spec on apply:** `.doctrina/specs/scaffolding/spec.md`

<!--
For ADDED: include the full new spec body below. On apply, the body is
written verbatim to the target path.

For MODIFIED: prefer a fenced `ops` block — on apply the CLI executes it
against the target spec, all ops or none (ADR 0007). The verbs cover
headers, acceptance criteria, AND the EARS requirement bullets, so a
typical delta applies mechanically end to end; only free-prose rewrites
(Purpose, Maturity, ...) stay a by-hand merge. A MODIFIED delta with no
`ops` block prints a manual-merge pointer.

  ```ops
  set-header Implementation: verified — durable adapter (`src/db.ts`)
  bump-version minor
  set-criterion 1: verified
  append-criterion [unverified] new signal — verified by `test/x.test.ts`
  append-requirement event: When <trigger>, the system shall <action>.
  replace-requirement ubiquitous 2: The system shall <action>.
  ```

Requirement sections: ubiquitous | event | state | unwanted | optional.
To take one out: `remove-requirement <section> <n>` / `remove-criterion <n>`
(the criteria after it renumber; write removals highest number first).
append-* ops resolve numbering/position at APPLY time, so several open
changes appending to the same spec never collide on numbers — order of
application decides.

For REMOVED: the body may be empty; on apply, the target spec file is
deleted and the capability is recorded in the change archive only.
-->

---

<!-- delta body below -->

```ops
append-requirement optional: Where `--preset <dir>` names a folder holding `preset.json`, `doctrina init` and `doctrina upgrade` shall lay it over the project additively — copying its `templates/`, `decisions/`, `skills/` and `verify.json` where the project has no such file, setting the config keys the project does not declare, never copying a decision whose number the project uses — naming each file and key copied, set or kept, printing the commands of a copied `verify.json`, and exiting 2 with nothing written when the folder is not a preset.
append-criterion [verified] `init --preset` scaffolds a project carrying the decision, skill, template, checks and config of the preset, with the hub generated from its surface and the index in step; `upgrade --preset` previews with exit 1, keeps the file, config key and ADR number the project has, writes the rest with `--write` and adds nothing the second time; a folder with no `preset.json`, a bad name or an unknown config key is refused — verified by `packages/doctrina-cli/test/um-preset-leva-a-casa-da-organizacao.test.js`.
set-header Source: `packages/doctrina-cli/src/commands/{init,adapter,templates,hooks,index-rebuild,upgrade,watch,metrics,completion}.js`, `packages/doctrina-cli/src/lib/{adapters,scan,index-json,index-merge,merge-setup,metrics-model,usage,config,preset}.js`
bump-version minor
```

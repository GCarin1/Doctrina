# Spec Delta — capability: skills

**Operation:** MODIFIED
**Target spec on apply:** `.doctrina/specs/skills/spec.md`

---

A reconciliação das skills é o `index rebuild`; o `skill sync` era um subconjunto dele.

O critério 5 cita o `skill sync` como quem restaura a descrição; ele passa a
citar o `index rebuild` por edição manual, porque `set-criterion` só troca a marca.

```ops
replace-requirement event 3: When `doctrina index rebuild` (or `doctrina validate --fix`) runs, the system shall register every skill present on disk and mirror its frontmatter `description:` into the matching index entry, never replacing a written description with one still in the scaffold's `<...>` form and moving the entry's date only when its description changes; the command never edits skill files, and the deprecated `doctrina skill sync` shall leave the same index behind.
replace-requirement event 6: When `doctrina validate` runs, the system shall emit a warning for any skill whose frontmatter `description:` differs from the description recorded in `.doctrina/index.json`, pointing at `doctrina index rebuild`.
append-criterion [verified] From the same tree, `skill sync` and `index rebuild` leave the same skill entries — an edited description mirrored, a written description kept over a reverted placeholder, a hand-written skill registered — and `skill sync` warns on stderr naming the rebuild — verified by `packages/doctrina-cli/test/o-rebuild-faz-o-que-o-sync-fazia.test.js`.
bump-version minor
```

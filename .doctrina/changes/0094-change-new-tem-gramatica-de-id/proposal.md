# Change 0094-change-new-tem-gramatica-de-id — change new tem gramatica de id

- **Status:** proposed
- **Date:** 2026-09-09
- **Owner:**
- **Lane:** product (uncertain; signals: change)
- **Affects specs:** authoring

## Why

change new aceita qualquer string como id, entao um id com traversal escreve a pasta da change fora do diretorio do projeto, contrariando o requisito da spec de nunca escrever fora dele; e ids com espaco ou maiuscula passam por validate e index rebuild mas produzem uma linha de remediacao que nao e executavel
## What

`change new` validates its id against a shared grammar (`isChangeId` in
`src/lib/project.js`) and resolves the change directory through
`resolveWithinProject`, which refuses any path that leaves the project.
`work` drops its private copy of the same regex and uses the shared one.

Third audit, finding 1. Reproduced by execution: `change new
../../../escapou/evil` scaffolded the folder one level above the project
root, and `0003-com espaco` / `0004-MAIUSCULA` were accepted here and then
carried by `validate` and `index rebuild` as legitimate ids.

## Scope boundaries

- Does not touch the capability grammar: a capability must open on a letter, a change id may open on a digit. Two rules that look alike are not one rule.
- Does not add a global write guard to `fs-ops`: containment is applied where the path is built, and widening that is its own change.
- Does not rename or migrate change folders that already carry a bad id.

## Verification

- [ ] Automated checks pass (`doctrina verify`, or the project's typecheck/test/build).
- [ ] The affected spec's acceptance criteria are met and cite their evidence (`doctrina coverage`).
- [x] A traversing id is refused with the usage class and writes nothing beside the project.
- [x] An id with a space, an uppercase letter or a leading hyphen leaves no folder behind.
- [x] The id shape `work` derives still opens a change.

## Open questions

- The `already exists` family (`spec new`, `contract new`, `skill new`, `change new`, `intake`, `init`) exits 1 in all six. Consistent, but by `exit-codes.md`'s own test — repeating the same string fails the same way — it reads as class 2. The third audit registered it without asserting it; it stays out of this change.

# Change 0243-o-doctor-nomeia-o-binario-que-roda-e-as-copias — o doctor nomeia o binario que roda e as copias no PATH

- **Status:** applied
- **Applied:** 2026-11-11
- **Date:** 2026-11-11
- **Owner:** Doctrina maintainers
- **Lane:** product (uncertain)
- **Affects specs:** gates


## Why

Um mantenedor atualizou pelo npm, o registro e o pacote diziam 0.21.0 e o `doctrina --version` respondia 0.20.0: havia uma segunda instalação à frente no PATH. Os hooks que os adapters escrevem chamam `doctrina` pelo nome, então também rodavam a antiga. Nada no CLI conseguia dizer isso, porque cada instalação só conhece a própria versão. E o preparo de merge da change 0242 não tinha onde ser conferido.

## What

- `lib/install.js`: toda instalação de `doctrina` no PATH, na ordem do shell, uma por pacote, com a versão.
- `doctor` ganha a linha `cli` (a que roda, as outras, aviso quando a primeira do PATH não é a que roda ou quando um hook chama pelo nome e não há nenhuma) e a linha `merges` (`.gitattributes` e driver do clone).
- Docs EN/PT do `doctor`, CHANGELOG.

## Scope boundaries

O `doctor` continua só relatando: não remove instalação nem roda o `hooks install`. A leitura do PATH no Windows procura o shim `.cmd` do npm; gerenciadores que usam outro formato aparecem com versão desconhecida.

## Verification

<!--
How you will know the change is correctly applied. Use checkboxes: every
box here is a claim that must be PROVEN before the change is done.
`doctrina change archive` refuses to archive while any box below is
unchecked (pass --force to archive anyway and record the gap). Distinguish
"task marked done" from "verification passed" — link the evidence.
-->

- [x] Automated checks pass (`doctrina verify`, or the project's typecheck/test/build).
- [x] The affected spec's acceptance criteria are met and cite their evidence (`doctrina coverage`).

## Open questions

Nenhuma.

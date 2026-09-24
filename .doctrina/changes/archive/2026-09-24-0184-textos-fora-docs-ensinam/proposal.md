# Change 0184-textos-fora-docs-ensinam — textos fora de docs ensinam o caminho aposentado

- **Status:** applied
- **Applied:** 2026-09-24
- **Date:** 2026-09-24
- **Owner:** Doctrina maintainers
- **Lane:** chore
- **Affects specs:** (none — chore)

- **Documented surface:** n/a — só texto de contribuição, exemplos e skills; nenhum comando, flag ou saída do CLI muda


## Why

A auditoria pós-0182 achou textos fora de `docs/` ensinando o caminho que
o projeto aposentou:

- O `CONTRIBUTING.md`, a página de contribuição (EN/PT), o template de PR
  e a skill `cut-a-release` diziam que este repositório evolui por commits
  diretos, sem changes, e que `.doctrina/changes/archive/` "deve ficar
  vazio". O repositório usa o Doctrina em si mesmo desde a ADR 0014 e tem
  183 changes arquivadas; o checklist do PR pedia a um contribuidor o
  contrário do que o `AGENTS.md` pede a um agente.
- O "Workflow B" ensinava `change new`, `analyze` e apply/archive à mão,
  e dizia que o CLI nunca faz merge de um delta MODIFIED, o que é falso
  desde os blocos `ops`.
- O exemplo `python-fastapi-urls`, o template de issue, duas skills e o
  `product.md` nomeavam `analyze` (o `product.md` citava até um
  `doctrina apply` que não existe).
- `packages/doctrina-cli/AGENTS.md` era o AGENTS.md de um projeto de
  teste ("Acme", descrição "x") versionado por engano na change 0057; um
  agente que lê o AGENTS.md mais próximo o recebia ao mexer no pacote.

## What

- `CONTRIBUTING.md` e `docs/{en,pt}/contributing.md`: um workflow só,
  `prime` → `work` → `change check` → `close`, um commit por change.
- Template de PR e skill `cut-a-release` alinhados a esse workflow.
- Template de issue, skills `patch-doctrina-files-as-crlf` e
  `stage-a-change-backlog`, `product.md` e o exemplo python passam a
  nomear `change check` e `close`.
- `packages/doctrina-cli/AGENTS.md` removido.

## Scope boundaries

- ADRs e changes arquivadas continuam citando `analyze`: são registro
  histórico e imutáveis.
- O teste que impede a regressão é a 0185.

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


# Change 0038-playbooks-sao-templates — playbooks sao templates

- **Status:** applied
- **Applied:** 2026-09-07
- **Date:** 2026-09-07
- **Owner:**
- **Affects specs:** templates

## Why

o playbook do work sao cem linhas de console.log literais e o mesmo procedimento vive tambem no AGENTS.md e em dois arquivos de docs; mover os playbooks para templates sobrescriviveis pela cadeia projeto sobre bundled

## What

Os playbooks saem do código e viram templates resolvidos pela cadeia projeto→bundled
que a ADR 0019 já estabeleceu: `templates/playbooks/{work,chore,bootstrap}.md.template`.
São TRÊS, não quatro: o backfill (`--from-diff`) compartilha ~90% do texto com o
work, e duplicá-lo num quarto arquivo recriaria exatamente a duplicação que esta
change existe para acabar. Ele é o mesmo template com três tokens preenchidos.

- `printPlaybook` e `printChorePlaybook` em `work.js` e o playbook de `intake.js` passam a renderizar template.
- `templates check` passa a verificar a presença e a forma dos playbooks.
- Um adotante pode adaptar o playbook ao seu processo — hoje impossível.
- Delta em `specs/templates`.

Achado F17 da auditoria. `printPlaybook()` são ~100 linhas de `console.log` literais,
incluindo a documentação da gramática de ops, e o mesmo procedimento está descrito no
`AGENTS.md` e de novo em `docs/en/workflow.md` e `docs/pt/workflow.md`. Isso contraria
o princípio de design nº 1 do projeto: nenhuma informação tem duas casas.

## Scope boundaries

- A migração é fiel: o conteúdo do playbook não muda nesta change, só a sua casa.
- Reduzir a duplicação em `AGENTS.md` e nos docs (fazê-los apontar em vez de repetir) é a última tarefa desta change, não um trabalho separado.
- Não toca o playbook de bootstrap impresso pelo `intake` quando não há fonte.

## Verification

- [x] Automated checks pass (`doctrina verify`, or the project's typecheck/test/build).
- [x] The affected spec's acceptance criteria are met and cite their evidence (`doctrina coverage`).
- [x] A saída de `doctrina work` e `doctrina work --chore` é byte-idêntica à anterior.
- [x] Um playbook colocado em `.doctrina/templates/playbooks/` sobrepõe o bundled, por arquivo.
- [x] `templates check` acusa um playbook ausente ou malformado.

## Open questions

- Resolvida: PRÉ-RENDERIZAR. Cada parte variável (o ranking, o aviso de prompt
  magro, o bloco de capacidade) é montada pelo código e entra como uma string
  simples; o `substitute` continua sendo um mapa de strings. Estender o
  substitutor transformaria o template numa linguagem com condicionais e
  laços — e a única regra extra necessária foi bem menor: uma linha que
  contém APENAS um token vazio é removida, e é isso que permite os blocos
  opcionais serem tokens em vez de `if`s no template.

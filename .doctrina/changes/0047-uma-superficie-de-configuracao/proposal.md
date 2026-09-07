# Change 0047-uma-superficie-de-configuracao — uma superficie de configuracao

- **Status:** proposed
- **Date:** 2026-09-07
- **Owner:**
- **Affects specs:** scaffolding

## Why

existem cinco arquivos de configuracao e apenas um tem --init, e dois deles nao sao criados nem documentados em lugar nenhum, entao um projeto pt-BR fica com o clarify vermelho sem nenhuma pista; consolidar a configuracao e reportar o que esta configurado

## What

Consolida a configuração do projeto. Hoje existem cinco superfícies —
`index.json` (com `config.context_budget`), `config.json` (idioma, lido só pelo
`clarify`), `rules.json`, `verify.json` e `verify.signoffs.json` — e apenas
`verify.json` tem `--init`.

- `.doctrina/config.json` passa a ser a casa declarada: idioma, orçamento de contexto e regras de projeto.
- Os caminhos antigos continuam sendo lidos como fallback; a remoção é anunciada, não feita aqui.
- `init` scaffolda o arquivo; `doctor` reporta o que está configurado e o que está no padrão.
- Delta em `specs/scaffolding`.

Achado F19 da auditoria. `config.json` e `rules.json` não são criados por `init`, não
aparecem no bloco de superfície do AGENTS.md e não são mencionados pelo `doctor` — só
existem se alguém ler o código. O sintoma: um projeto pt-BR fica com o `clarify`
permanentemente vermelho e nenhuma pista de por quê.

## Scope boundaries

- Não remove nenhum arquivo nesta change: só declara a casa nova e mantém a leitura antiga.
- `verify.signoffs.json` fica de fora: é estado gravado pelo CLI, não configuração escrita por humano.
- Não muda a semântica de nenhuma opção; só onde ela é declarada.

## Verification

- [ ] Automated checks pass (`doctrina verify`, or the project's typecheck/test/build).
- [ ] The affected spec's acceptance criteria are met and cite their evidence (`doctrina coverage`).
- [ ] Um projeto com `config.json` novo e um com os arquivos antigos se comportam igual.
- [ ] `init` scaffolda o arquivo com os valores padrão comentados.
- [ ] `doctor` lista cada opção com o valor efetivo e a origem (configurado ou padrão).

## Open questions

- `verify.json` migra para dentro do `config.json` ou fica separado por ser executável e ter vida própria em CI?

# Change 0047-uma-superficie-de-configuracao — uma superficie de configuracao

- **Status:** applied
- **Applied:** 2026-09-07
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

- [x] Automated checks pass (`doctrina verify`, or the project's typecheck/test/build).
- [x] The affected spec's acceptance criteria are met and cite their evidence (`doctrina coverage`).
- [x] Um projeto com `config.json` novo e um com os arquivos antigos se comportam igual.
- [x] `init` scaffolda o arquivo documentando as opções e os padrões (sem declará-los — ver Open questions).
- [x] `doctor` lista cada opção com o valor efetivo e a origem (configurado ou padrão).

## Open questions

- **`verify.json` migra? — Resolvido: fica separado, e a razão não é
  tamanho, é gênero.** As três opções que entraram no `config.json`
  (idioma, orçamento, regras) são PREFERÊNCIAS: declaram como a ferramenta
  deve se comportar, e o pior efeito de errar uma delas é um lint no idioma
  errado. O `verify.json` declara COMANDOS EXECUTÁVEIS com expectativas de
  saída — é o gate de build real (ADR 0008), roda em CI, tem `--init`
  próprio e tem um irmão de estado gravado pelo CLI
  (`verify.signoffs.json`). Juntar os dois convidaria alguém a editar o
  gate de build enquanto acha que está mudando uma preferência, e é
  exatamente esse tipo de proximidade que faz uma configuração ser mexida
  sem querer. Somando: dos cinco arquivos, três viram um; `verify.json` e o
  seu arquivo de assinaturas permanecem, agora por decisão registrada e não
  por acidente.
- **O scaffold declara os padrões? — Não, e isso foi uma correção no meio
  da change.** A primeira versão escrevia cada opção com o seu valor
  padrão, o que parecia mais didático e quebrou dois testes por um motivo
  real: um padrão escrito é uma declaração, então (a) o `doctor` deixava de
  distinguir escolha de padrão, e (b) o arquivo novo passava a vencer,
  silenciosamente, a declaração legada de um projeto que nunca o editou —
  um `context_budget` configurado no `index.json` virava letra morta. O
  scaffold agora documenta as opções no `$comment` e não declara nenhuma:
  a primeira chave que o projeto adiciona é a primeira escolha que ele fez.

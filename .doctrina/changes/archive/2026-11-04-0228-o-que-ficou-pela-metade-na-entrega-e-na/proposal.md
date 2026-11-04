# Change 0228-o-que-ficou-pela-metade-na-entrega-e-na — o que ficou pela metade na entrega e na documentacao

- **Status:** applied
- **Applied:** 2026-11-04
- **Date:** 2026-11-04
- **Owner:** Doctrina maintainers
- **Lane:** product (uncertain)
- **Affects specs:** authoring, cli, core, delivery, docs, gates, insight, workspace, scaffolding, skills


## Why

As changes 0226 e 0227 fecharam com partes pela metade, listadas pelo próprio autor a pedido do humano: CRLF virando LF, avisos do review ignorados, requisitos em specs que não são donas do código, docs atrás do ADR 0030 e do EN, guia e diagramas nunca conferidos. Ao corrigir, o percurso do guia, a auditoria e um agente real acharam mais furos no CLI.

## What

- Fim de linha preservado (`eolOf`/`withEol`) em `delivery tick`, `change tick`, `work --delivery` e no cabeçalho da entrega; `delivery tick` conta só o que marcou e `check` lê a Release pelo mesmo leitor.
- `change delta` com flags repetidas (`flagAll`); `change check --verbose` mostra a spec antes e depois; `review --change` lê a spec como a change a deixa.
- `workspace list` regenera os arquivos do orquestrador; dica de ferramenta genérica; `verify --init` semeado pelo inventário; o pacote de contexto lê a change em foco sem comentários; help com todo subcomando e toda flag.
- Specs: requisitos movidos para authoring e insight; deltas em core, gates, cli, workspace, docs, scaffolding e skills.
- Docs EN/PT alinhados ao ADR 0030 e entre si; glossário em ordem; guia de ponta a ponta executado em teste; skills atualizadas e uma nova.

## Scope boundaries

O CI de Windows e macOS só roda num pull request; aqui o CRLF é coberto por testes com arquivos CRLF e o tmpdir do macOS é emulado rodando a suíte com um TMPDIR por symlink. As 48 candidatas do `skill suggest` não viram skills uma a uma: as lições que se repetem foram para as skills acima.

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

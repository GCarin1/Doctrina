# Change 0179-documentacao-defasada — documentacao defasada

- **Status:** applied
- **Applied:** 2026-09-24
- **Date:** 2026-09-24
- **Owner:**
- **Lane:** product
- **Affects specs:** docs

- **Documented surface:** n/a — cita `init`, `next`, `work`, `close`, `prime`, `validate` e outros para corrigir o que a documentação ensinava; nenhum comando ou flag muda aqui

## Why

Varredura da documentação depois das changes 0173–0178. O que estava defasado:

- **README do pacote (a página do npm):** a lista de comandos, escrita à mão, não tinha `close`, `prime`, `status`, `show`, `why`, `handoff`, `doctor`, `review`, `triage` e outros. A lista das checagens do `validate` tinha 21 itens, contra 28 na referência.
- **Página inicial do site (`docs/*/README.md`):** o "uso em 5 minutos" fazia a pessoa conduzir tudo à mão (`spec new`, `change new`, `change apply`, `change archive`), sem `work` nem `close`. Também dizia que um delta MODIFIED é "manual" e que o `validate` tem "18 checagens". A tabela de comandos do dia a dia não tinha `prime`, `work` nem `close`.
- **Delta MODIFIED descrito como sempre manual:** glossário, workflow e guia de início diziam isso, dois releases depois de os blocos `ops` (ADR 0007) o tornarem mecânico. O guia de início não mencionava o `close`.
- **Benchmarks:** "`validate` fica abaixo de 100 ms", medido em junho. Rodando `scripts/bench.js` hoje dá 137–173 ms, porque o `validate` ganhou checagens.
- **Estado da primeira versão apresentado como atual:** comparison e deferred ainda diziam "em v0.1.0".
- **Resíduos das fusões:** menções em prosa ao `report` como comando próprio.

## What

- `packages/doctrina-cli/README.md`: resumo dos comandos por momento, igual ao `--help`, com `doctrina --help` e a referência como listas completas; a lista das checagens do `validate` deixa de ser uma segunda cópia e passa a ser um link; `--project-description`, verbos das `ops` e `close` atualizados.
- `docs/{en,pt}/README.md`: "uso em 5 minutos" no modelo em que o agente conduz (init → agente → `work` → `change check`/`close` → decisões); tabela diária com `prime`, `work` e `close`; contagem do `validate` trocada por link.
- `docs/{en,pt}/{glossary,workflow,getting-started}.md`: MODIFIED aplicado pelo bloco `ops`; o guia ganha o `close` como definição de pronto.
- `docs/{en,pt}/benchmarks.md`: nova run de referência e headline "abaixo de 200 ms", com nota sobre a run antiga e uma medição a 300 specs e 1.500 changes.
- `docs/{en,pt}/{comparison,deferred}.md`: "em v0.1.0" vira o estado atual.
- `docs/{en,pt}/{cli-reference,flow}.md`: o `report` em prosa vira `status --view report`.
- Teste `packages/doctrina-cli/test/a-documentacao-acompanha-o-catalogo.test.js`: o resumo do README do pacote cobre toda operação viva, e nenhuma página ensina um comando depreciado ou removido fora das linhas que o aposentam.

## Scope boundaries

- Contagens de comandos e operações já eram checadas pelo `scripts/check-docs.js`; o teste novo cobre só o que ele não via.
- O conteúdo conceitual (multi-agent, context-engineering, antipatterns) não foi reescrito: não encontrei nada nele contradizendo o CLI.

## Verification

- [x] O teste passa (2 testes); no texto anterior, o resumo do README do pacote falha, e uma instrução `doctrina report` injetada num guia faz a segunda guarda falhar.
- [x] `node scripts/check-docs.js` limpo (27 arquivos EN, 27 PT); `node scripts/bench.js` rodado para os números novos.
- [x] Automated checks pass (`doctrina verify`).
- [x] The affected spec's acceptance criteria are met and cite their evidence (`doctrina coverage`).

## Open questions

Nenhuma.

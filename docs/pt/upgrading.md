# Atualizando o Doctrina

> Tradução. A fonte é o inglês: [docs/en/upgrading.md](../en/upgrading.md).

Atualizar a CLI não atualiza o projeto que você esqueletizou com ela.
São coisas separadas, e a distância entre as duas é de onde vem a
maioria dos relatos de "por que meu AGENTS.md não tem os comandos
novos?".

```bash
npm update -g doctrina-cli   # a ferramenta
doctrina upgrade --write     # o projeto
```

`doctrina upgrade` faz preview por padrão. `--write` aplica.

## O que o `upgrade` faz de fato

Três passos, cada um delegando para um comando que já existe, para
que haja uma única definição de cada:

1. **Forma do scaffold** (`templates update`) — adiciona seções
   recomendadas que estejam faltando e regenera os dois blocos que a
   CLI é dona no `AGENTS.md`: a superfície de comandos e o changelog
   voltado ao agente. **Só aditivo.** Nunca reescreve uma linha sua.
2. **Índice e carimbo de versão** (`index rebuild`) — regenera o
   `.doctrina/index.json` a partir da árvore e registra qual versão
   da CLI gerenciou o projeto por último.
3. **Checagem estrutural** (`validate --fix`) — reporta o que um
   upgrade aditivo não consegue corrigir sozinho e conserta a parte
   mecânica.

## Um `upgrade --write` cobre todos os agents que instalei?

**Sim, para os arquivos ponteiro** — e é só isso que há para cobrir.
Todo adapter (`CLAUDE.md`, `.cursor/rules/`, `GEMINI.md`, …) é um
ponteiro fino para o único `AGENTS.md`. Regenerar o hub é o que
atualiza todos eles, porque nenhum carrega uma segunda cópia de nada.
Essa é a razão de existir do design de ponteiros.

Duas coisas que o `upgrade` deliberadamente **não** faz:

- **Instalar adapters que você não tem.** Adicionar um agent é uma
  decisão separada, não efeito colateral de atualizar (ADR 0016). Use
  `doctrina adapter add <nome>`.
- **Tocar no seu conteúdo autoral.** A prosa do `AGENTS.md`, o
  `product.md`, as specs e os ADRs são seus.

Veja o que está instalado:

```bash
doctrina adapter list
```

## Verificando que o upgrade pegou

<!-- illustrative -->
```
doctrina upgrade --write
✓ project upgraded to 0.14.0
```

Depois confirme que o hub carrega mesmo a superfície atual:

```bash
doctrina validate           # 0 erros
doctrina context --concat   # o que um agent vai realmente ler
```

Se o `validate` reportar drift no bloco `doctrina:surface`, a
regeneração não rodou — verifique se o `AGENTS.md` ainda contém os
dois comentários marcadores. Os blocos pertencem à CLI; edições
dentro deles são sobrescritas por design (ADR 0015).

## Mudanças de formato em disco

Toda mudança de formato vem com sua migração dentro do `upgrade` e
com um teste que lê uma árvore escrita antes da mudança. Campos
opcionais são o caso normal: ausente significa o default anterior,
então um projeto que nunca optou por ele continua se comportando
como antes.

A `0.14.0` adicionou uma: um bloco `config` opcional no `index.json`.

```json
{ "config": { "context_budget": 15000 } }
```

Ausente significa o default de 15.000 tokens. Veja
[Engenharia de contexto](context-engineering.md#o-orçamento-de-contexto).

## Depois de atualizar para a 0.14.0

Dois comandos valem uma rodada, porque agem sobre artefatos que já
existem e não sobre artefatos novos:

```bash
doctrina decision scope     # propõe um escopo para cada ADR sem escopo
doctrina context cli        # confirma que o pack cabe no orçamento
```

ADRs são imutáveis e nunca se aposentam, então sem escopo toda
decisão aceita entra em todo pack de contexto para sempre. O
`decision scope` propõe um por ADR a partir do change arquivado que o
cita; `--write` aplica. Revise antes de escrever: um escopo estreito
demais esconde uma decisão do pack que precisava dela.

## Se algo parecer errado

```bash
doctrina doctor
```

Ele agrega todos os gates e imprime o remédio de cada achado, em vez
de fazer você adivinhar qual gate perguntar.

## Material relacionado

- [Referência da CLI](cli-reference.md) — `upgrade`, `adapter`,
  `templates`, `doctor`.
- [Adapters](adapters.md) — como os arquivos ponteiro funcionam.
- [Templates](templates.md) — a cadeia de resolução projeto-sobre-
  bundled, e como sobrepor um arquivo.
- [Exit codes](exit-codes.md) — o que um upgrade não-zero significa.

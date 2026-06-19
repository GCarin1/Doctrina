# Doctrina v0.4.0 — Relatório de implementação

> Versão anterior: **0.3.0** → versão atual: **0.4.0** (bump *minor*: features novas
> + correções, sem quebra de compatibilidade da CLI ou dos artefatos).
> Origem: review externo do framework (testado num projeto "Cidade Viva").
> Estado: **118 testes passando**, `validate` verde, `index rebuild --check` limpo.

---

## Resumo em uma linha

O Doctrina deixou de validar só *ligação* e passou a validar *proveniência de
intenção* — e ganhou guardrails que faltavam: versionamento do índice, registro
de "decisão implementada", detecção de colisão de ADR, busca com ranking e um
portão de clarificação na entrada (`intake`/`work`).

---

## O que foi implementado e o que agrega

| # | Feature | O que agrega ao projeto |
|---|---------|--------------------------|
| 1 | **`doctrina trace`** (proveniência de intenção, ADR 0006) | Fecha a metade determinística do loop *intenção → capability → critério → teste*. Mostra promessa do produto sem capability (dropped), referência quebrada (dangling) e spec sem intenção (untraceable). |
| 2 | **Portão de clarificação** (`intake` + `work`) | Pega input raso/vago **na entrada** e manda o agente esclarecer com o usuário antes de inventar spec/change. Reduz especulação do LLM sobre brief fino. |
| 3 | **`doctrina decision land`** + header `Landed:` | Permite marcar "este ADR agora está implementado e verificado aqui" sem editar o corpo imutável — antes só dava com supersede pesado. |
| 4 | **`framework_version` no `index.json`** | O índice registra qual CLI o gerencia; `validate` avisa divergência e `index rebuild` migra. Schema deixa de envelhecer em silêncio. |
| 5 | **Detecção de ADR duplicado** (`validate`) | Colisão de numeração entre branches vira **erro** em vez de um ADR sombrear o outro no índice silenciosamente. |
| 6 | **`search` com ranking** | Resultados ordenados por relevância (heading/metadata/frase/nome do arquivo) — o agente lê o mais relevante primeiro, não uma lista crua. |
| 7 | **Correção: drift do `change apply`** | O índice ficava dessincronizado entre `apply` e `archive` (o `index rebuild --check` do pre-commit falhava). Agora a entrada do change espelha o `proposal.md`. |

---

## Detalhe enxuto por item

### 1. `doctrina trace` — proveniência de intenção (ADR 0006)
- **Como usar:** tag em `product.md` (`- [SC1] ...`) + header na spec (`**Realizes:** SC1`).
- **Reporta:** *dropped* (intenção sem spec), *dangling* (id citado inexistente), *untraceable* (spec active sem `Realizes:`).
- **Limite honesto (no ADR):** prova que o vínculo **existe e está completo** — **não** julga se o critério é *fiel* à intenção. Isso fica para um futuro `trace --semantic` (com LLM). O gate determinístico nunca reivindica fidelidade que não consegue provar.
- **Disparo:** `doctrina trace` (read-only; `--strict` gateia em CI).

### 2. Portão de clarificação (review Topic A)
- **Detecta determinístico:** poucas palavras, nenhum termo concreto (só filler), ou densidade alta de termos vagos/weasel.
- **Disparo:** a **cada** `doctrina intake` e `doctrina work`. Advisory — não bloqueia (o `intake`/change é capturado mesmo assim; o agente esclarece antes de escrever deltas). Coerente com o ADR 0005 ("a CLI instrui, o agente pensa").

### 3. `doctrina decision land`
- Carimba o header `Landed:` (data + provas em backtick) de um ADR *accepted*, sem tocar no corpo. O `validate` passa a considerar `Evidence ∪ Landed`.

### 4. `framework_version`
- Carimbado em toda escrita do índice e no `init`. `validate` avisa divergência; `index rebuild` migra (já migrou 0.3.0 → 0.4.0 neste release).

### 5. ADR duplicado
- `validate` dá erro quando dois arquivos têm o mesmo `NNNN` (a colisão que o repo já tinha contornado reservando o `0002`).

### 6. `search` ranqueado
- Mesma saída (`path:linha: texto`), agora ordenada por score — sem índice novo, determinístico.

### 7. Correção do `change apply`
- Bug **pré-existente** achado na varredura de integração: `apply` virava o `proposal.md` para `applied` mas não sincronizava o `status` da entrada no índice → drift na janela apply→archive. Corrigido nos dois caminhos (com delta e metadata-only), com testes de regressão.

---

## Como o fluxo de trabalho mudou

Visão geral **antes → agora**:

| Momento | Antes (0.3.0) | Agora (0.4.0) |
|---------|---------------|----------------|
| Entrada de intenção | aceitava qualquer descrição/prompt | **portão de clarificação** avisa se está raso |
| Ligar intenção a código | só `coverage` (critério↔teste) | `coverage` **+ `trace`** (intenção↔capability) |
| ADR implementado | só `supersede` (pesado) | **`decision land`** (carimba sem editar o corpo) |
| Índice | sem versão; drift no `apply` | `framework_version` carimbado; `apply` sem drift |

### Iniciando o projeto
1. `doctrina init --intake <arquivo>` (ou `doctrina intake "<descrição>"`).
   → **[NOVO]** se a descrição for rasa, aparece `⚠ thin intake` pedindo para
   esclarecer com o usuário **antes** de o agente inventar specs.
2. O agente executa o bootstrap playbook → preenche `product.md`
   (**[NOVO]** pode marcar âncoras de intenção: `- [SC1] ...`) → cria specs
   (**[NOVO]** pode declarar `**Realizes:** SC1`).
3. Gates de qualidade: `validate` + `coverage` + **[NOVO] `trace`** + `verify --init`.
   O `index.json` já nasce com **[NOVO] `framework_version`** carimbado.

### Relatando bugs
- `doctrina work "<descrição do bug>"` → **[NOVO]** um report vago ("não
  funciona", "tá quebrado") dispara `⚠ thin prompt`, pedindo repro, comportamento
  esperado e como saber que foi resolvido **antes** de abrir o change.
- Alternativa para bug com spec dedicada: `doctrina spec new <cap> --bug`.

### Correção de bugs
- Fluxo: `work` → delta → tasks → implementar → `analyze` → `apply` → `verify`
  + `coverage` → `archive` → `validate`.
- **[CORRIGIDO]** entre `apply` e `archive` o índice **não dá mais drift** — o
  `index rebuild --check` do pre-commit deixa de falhar nessa janela.

### Novas features
- `doctrina work "<feature detalhada>"` → se o prompt for concreto, o portão
  fica quieto; se for raso, pede detalhe.
- Crie/edite a spec com `**Realizes:** SCx` e rode **[NOVO] `trace`** para
  confirmar que a feature realiza uma intenção declarada do produto — em vez de
  ser "largura comprada no crédito" (capability sem intenção por trás).

### Ajustes de arquitetura
- `doctrina decision new "<título>"` → `decision accept <n>`.
- Quando a decisão é de fato implementada: **[NOVO] `decision land <n> <provas>`**
  carimba `Landed:` (data + arquivos) **sem** tocar no corpo imutável do ADR.
- `validate` agora: **[NOVO]** dá **erro** em número de ADR duplicado (colisão de
  merge) e checa evidência via `Evidence ∪ Landed`.

### Revisões de projeto
- A superfície de review ficou mais completa e respondível por comando:
  - `validate` — forma + ligação + consistência (índice, ADRs, specs).
  - `coverage` — cada critério cita um teste real.
  - **[NOVO] `trace`** — cada intenção do produto tem capability; cada capability
    rastreia uma intenção.
  - `clarify --all` — vagueza léxica nos documentos vivos.
  - `metrics` — adoção derivada do git.
- Dá para responder, com comando: *"essa intenção tem capability?"* (`trace`),
  *"esse critério tem teste?"* (`coverage`), *"esse ADR foi implementado?"*
  (`validate` + `Landed`).

---

## Como ter certeza de que está tudo funcionando

```
cd packages/doctrina-cli
node --test                               # 118 testes, todos passam
node src/index.js --version               # 0.4.0
node src/index.js validate                # ok, 0 erros
node src/index.js index rebuild --check   # "index.json matches the tree"
node src/index.js trace                   # relatório de proveniência
node src/index.js work "fix it"           # mostra o ⚠ thin prompt (advisory)
```

---

## O que ainda falta (roadmap)

Nenhuma é bug — são features novas disparadas por **outros** comandos (não `intake`/`work`):

- **`trace --semantic`** (3.1/3.2 metade semântica, LLM) — pega "critério mais frouxo que a intenção".
- **3.5** reconciliar ADR ↔ spec/código (`validate`).
- **3.3** DoD qualitativa / checks não-bloqueantes (`verify`).
- **B/S2** escala de contexto e budget por turno (`context`/`next`).
- **3.7** perfil protótipo + **dividir a `specs/cli/spec.md`** (único `warn` atual: 414 linhas > soft cap de 400).
- **C1/D1, S1** single-source de índice, multi-repo.

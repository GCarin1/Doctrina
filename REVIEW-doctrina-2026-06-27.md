# Avaliação do Framework Doctrina — Cidade Viva como caso de uso

> **Versão avaliada:** Doctrina CLI **0.6.0** (instalada). A review anterior no
> repositório (`REVIEW-doctrina-2026-06-18.md`) mirou a **0.3.0**; o `CHANGELOG`
> do Doctrina mostra que **0.3.0 e 0.4.0 foram explicitamente
> "framework-review follow-ups"** — ou seja, o framework evolui *sendo revisado
> por exatamente este tipo de exercício*. Isso é parte do achado.
>
> **Método.** Rodei toda a superfície de comandos contra o `Cidade-viva`, li os
> artefatos `.doctrina/` e li o código-fonte da CLI
> (`packages/doctrina-cli/src/**`, ~6.200 LOC). Onde cito o projeto, é como
> evidência do comportamento do *framework*, não como defeito do programa.
>
> **Data:** 2026-06-27.

---

## 1. Resumo executivo

O Doctrina **cumpre o propósito central** para o qual foi criado: transformar
intenção crua em artefatos navegáveis, governados e *com significado de "pronto"
executável*. No Cidade Viva isso é visível e funciona — `intake → product →
9 specs EARS`, `coverage` 100% (61/61 critérios com evidência), `verify` rodando
`pytest` de verdade (96 testes verdes), contrato de runtime consistente, e
disciplina de duas-axes (documento vs. implementação). A documentação **não
divergiu da realidade** — o caso raro de "specs honestas sobre código que
existe".

Porém a avaliação expõe três verdades desconfortáveis:

1. **O teto conceitual é real e admitido pelos próprios mantenedores.** O
   framework valida *ligação* (existe um teste para o critério) e *completude do
   elo* (`trace`), mas **não valida fidelidade à intenção**. O `trace.js`
   literalmente documenta que não julga se "o critério codifica fielmente a
   intenção" (`trace.js:23-25`). A métrica mais forte — `coverage` 100% — é
   satisfeita escrevendo o critério que casa com o código.

2. **A maior parte do valor entregue veio do agente, não do framework.** A
   fidelidade que importava (ex.: a tabela de pesos `morte=10…comeu=1` do intake
   foi preservada *intacta* na spec — `event-sourcing/spec.md:26-29`) é fruto de
   **diligência do agente**, não de garantia do Doctrina. O framework forneceu o
   gabarito e checou a *forma*; o agente forneceu a *substância*.

3. **A prova mais contundente está no estado atual do repositório: o gate
   primário do próprio framework está VERMELHO.** `doctrina validate` falha agora
   com 2 erros (drift de `index.json` nos ADRs 0002 e 0006) e 1 warning
   (`framework_version: 0.0.0`). A causa-raiz é a falha de design que detalho na
   seção 8 — a **dupla fonte de verdade** (arquivo + índice) e o fato de que o
   agente *contornou* o comando `decision supersede` e editou à mão.

**Bottom line:** Doctrina é um bom *organizador e governador* de desenvolvimento
spec-driven, com gates que tornam o auto-engano *grosseiro* difícil. Não é
(ainda) um *garantidor de fidelidade*, e várias de suas melhores capacidades
morrem por serem **opt-in que ninguém liga**.

---

## 2. Visão geral do Doctrina

Doctrina é uma CLI Node (ESM, `>=20.12`) que implementa "spec-driven
development, AGENTS.md-native" para agentes de IA. A arquitetura é limpa e
legível:

- **Dispatcher fino** (`src/index.js`, 124 linhas): mapeia 21 comandos para
  módulos, com `suggest()` de "did you mean".
- **Comandos** (`src/commands/*.js`): cada um é autocontido, exporta `run()` e
  `help`.
- **Biblioteca** (`src/lib/*.js`): `scan.js` (o coração — `deriveIndex`),@browser:
  `ears.js`, `clarity.js`, `diff.js`, `templates.js`, etc.

O modelo mental é sólido:

- **Os arquivos são a fonte da verdade**; `index.json` é *derivado* deles
  (`scan.js:36 deriveIndex`).
- **A CLI é deliberadamente "burra"**: faz slug e contagem de termos; "tudo que é
  semântico é trabalho do agente" (`work.js:16-18`, ancorado no ADR 0005). Essa
  fronteira é **uma decisão de design correta** — não tenta fingir entender
  linguagem natural.
- **"Block, never imprison"**: todo gate novo tem escape hatch (`--force`, notas
  "n/a — <porquê>"). O `CHANGELOG` afirma isso explicitamente.
- **Um "teto honesto" assumido**: os gates determinísticos param *antes* do juízo
  semântico e *dizem isso no próprio código*.

A superfície de comandos cobre o ciclo completo: `intake/work` (entrada),
`spec/change/decision/contract` (artefatos), `analyze/clarify/coverage/trace/
validate/verify` (gates), `context/search/next/metrics` (navegação e
observabilidade), `index/templates/hooks/skill` (manutenção).

---

## 3. Como o Cidade Viva evidencia pontos fortes e fracos

| Dimensão | O que o Cidade Viva mostra | Quem entregou o valor |
|---|---|---|
| Captura de intenção | `intake.md` (188 linhas, riquíssimo) → `product.md` enxuto → 9 specs | **Framework** (funil) + agente (síntese) |
| Specs EARS | Formato consistente Ubiquitous/Event/State/Unwanted/Optional + Acceptance | **Framework** (template + `ears.js` lint) |
| Fidelidade de detalhe | Tabela de pesos `morte=10…` preservada intacta na spec | **Agente** (o framework não verifica isso) |
| "Pronto" significa algo | `coverage` 100%, `verify` (pytest 96✓), duas-axes de status | **Framework** (gates reais) |
| Costuras/runtime | `contracts/runtime.md` consistente (`contract check` ok) | **Framework** (artefato dedicado) |
| Governança de decisões | 6 ADRs, modelo de supersede/land | **Framework**, mas **mal usado** (ver §8) |
| Rastreabilidade de intenção | `trace`: **"no markers found"** — feature inteiramente ignorada | Ninguém — **gap de adoção** |
| Higiene do índice | **`validate` falhando agora** por drift | **Falha de design** (dupla fonte) |

A leitura honesta: **onde o framework define forma e roda um gate executável, o
resultado é bom e confiável. Onde o framework depende de disciplina manual
opt-in, o resultado degrada ou some.**

---

## 4. Funcionalidades bem aproveitadas

1. **Funil `intake → product → specs`.** O `intake.md` cru de 188 linhas virou um
   `product.md` navegável com Vision/Problem/Scope/Success criteria/Delivery
   order. Esse é o ganho mais claro e imediato do framework.
2. **Specs EARS com duas axes de status.** Cada spec separa `Status:` (documento)
   de `Implementation:` (capacidade: planned→partial→implemented→verified). O
   `validate` pune a desonestidade "active + planned sem nota"
   (`validate.js:259-266`). Isso é design *bom* — força distinguir "escrevi" de
   "construí".
3. **`coverage` — ligação spec↔teste como sinal de primeira classe.** 61/61
   critérios citam evidência real, com detecção de teste *skipped*
   (`coverage.js:180-191` → "conditional", não conta como prova). É um avanço
   genuíno sobre validar só markdown.
4. **`verify` — o gate de verdade.** `verify.json` declara `python -m pytest -q`;
   roda 96 testes verdes. Separar `validate` (forma) de `verify` (o código
   funciona) é a decisão mais importante do framework.
5. **`contracts/runtime.md`.** As costuras que nenhuma capacidade possui (portas,
   env, interfaces snapshot/event/decision-log) têm dono explícito; `contract
   check` valida sem colisão.
6. **`change` workflow.** 5 mudanças arquivadas (0001–0005) com
   `proposal/tasks/design/deltas`, `LEDGER.md` batendo com o índice. A disciplina
   de delta→apply→archive foi seguida de fato.
7. **Higiene de ADR endurecida (0.4.0+).** `validate` agora detecta número de ADR
   duplicado (`validate.js:188-197`), evidência pendente/dangling, e drift de
   metadados como **erro** (não warning).

---

## 5. Funcionalidades subutilizadas

Estas existem, são boas, e **não foram ligadas** — o caso mais revelador da
review:

1. **`trace` / intent-provenance (ADR 0006, a feature *mais nova*).** Resultado
   no projeto: *"no intent-provenance markers found"*. O `product.md` tem
   critérios de sucesso excelentes mas **sem âncoras `[SC1]`**, e nenhuma spec
   declara `**Realizes:**`. A funcionalidade desenhada justamente para fechar o
   elo intenção→capacidade está **100% ociosa**. Por quê? Porque é opt-in e nada
   no `work` playbook força a tagueação.
2. **`skills` — o caso mais extremo de subutilização (gap destacado).**
   Diretório só com `.gitkeep`: **zero skills**. É a memória procedural
   on-demand do framework — carregada no context pack só por nome+descrição
   (`context.js:71-82`), custo de contexto ~zero quando vazia. O problema **não**
   é a pasta vazia em si (para muitos projetos pequenos não ter skill é
   legítimo); o problema é que **nada no Doctrina te leva a escrevê-las**.
   Confirmado no código: `next.js` (o motor de "o que fazer agora") nunca sugere
   criar skill; `work.js` (o playbook principal) não as menciona; e todo comando
   que toca em "skill" (`context`, `validate`, `search`, `index-rebuild`,
   `templates`) só *consome/valida/lista* o que já existe. O `skill.js` expõe
   apenas `new/list/sync`. O sistema de skills é, portanto, **inteiramente
   passivo** — valida e carrega o que existe, mas nada no loop puxa a criação.

   **E neste projeto elas teriam valido.** A **change 0003** foi literalmente
   *"corrige parsing do JSON do LLM real — tolera code fences"*: uma lição cara,
   ganha na marra, que é o exemplo de manual de uma skill (`how-to: parsear saída
   do LLM`) para não ser reaprendida pelo próximo agente/sessão. O mesmo vale para
   convenções recorrentes entre changes: teste de determinismo (mesma seed →
   mesmos eventos/saldos), o harness de grounding (anti-alucinação de nomes) e a
   regra do handoff de snapshot thread-safe. Nenhuma virou skill; o conhecimento
   foi reabsorvido por diligência do agente — exatamente aquilo de que skills
   existem para não depender.

   **Veredito:** é um gap de **adoção causado por design passivo**, não um buraco
   na implementação (que é competente). Conecta-se ao gap de right-sizing (§6.3):
   num protótipo descartável skills podem não pagar a cerimônia — por isso o
   defeito não é "estar vazio", é a *combinação* de **haver casos de uso reais
   aqui** com o **framework nunca os trazer à tona**.
3. **`decision land`.** Existe para carimbar "este ADR aceito agora está
   implementado e verificado" sem violar a imutabilidade (`decision.js:210-276`).
   **Nunca usado.** Os ADRs ainda carregam `Evidence: n/a — design-stage
   decision; no implementation in this repo yet` mesmo com tudo implementado e
   verificado. A feature que resolve exatamente esse apodrecimento ficou na
   prateleira.
4. **`metrics`, `next`, `search`, `context`.** São observabilidade/navegação
   úteis (o `next` corretamente aponta "index rebuild — drifted"), mas não há
   sinal de que tenham entrado no loop de trabalho.
5. **Stamp `framework_version`.** Deveria ser carimbado em toda escrita (0.4.0);
   o índice ainda diz `0.0.0`, e o projeto nunca rodou `index rebuild` para
   migrar.

**Padrão claro:** o Doctrina **oferece** capacidades de fechamento de loop, mas
**não as puxa para o caminho default**, então elas murcham. Uma capacidade
opt-in que ninguém adota tem, na prática, valor zero — pior, dá falsa sensação de
cobertura.

---

## 6. Funcionalidades ausentes

1. **Verificação de fidelidade intenção↔spec (a lacuna conceitual).** Nada
   confronta um critério de spec com a cláusula de origem no intake/product. É
   possível encolher a promessa do intake na spec, implementar a versão frouxa,
   vincular o teste que casa, e colher `coverage` 100% + `validate` ok +
   `clarify` limpo. Os mantenedores **sabem** disso e deferiram a uma "futura
   camada assistida por LLM" (`trace.js:23-25`).
2. **Auto-rebuild do índice.** Não existe. O hook pre-commit roda `validate`
   (bloqueia no drift) mas **não** `index rebuild`. O ônus de sincronizar a dupla
   fonte é humano/agente — e foi exatamente onde o projeto quebrou.
3. **"Modo protótipo" / right-sizing.** Mesma cerimônia (product + 9 specs +
   6 ADRs + contract + changes) para um protótipo descartável de um dev solo e
   para um sistema de produção multi-time. Não há perfil de cerimônia nem sinal
   de sobre-especificação. (Era o 3.7 da review anterior; segue aberto.)
4. **JSON Schema real para o índice.** `validate.js:68` compara `$schema_version`
   a uma string literal; um índice malformado mas com versão certa passa (D2 da
   review anterior).
5. **Alocação de número de ADR concorrente.** Há *detecção* de colisão, mas não
   *prevenção* (reserva de bloco, ULID, sufixo de hash). Em multi-autor isto
   reaparece.
6. **Gate qualitativo / não-bloqueante.** Para um projeto cujo critério de
   sucesso é *qualitativo* ("a crônica é gostosa de ler?"), o framework só
   oferece `verify` binário (exit code do pytest). Não há noção de
   eval-harness/rubrica/checkpoint humano registrado.

---

## 7. Gaps identificados (processos ainda manuais demais)

- **Sincronização do índice é manual e frágil.** O drift atual nasceu porque o
  agente fez supersede *à mão* (o `index.json` registra `"status":
  "superseded"`, mas o comando `decision supersede` escreveria `"superseded by
  0006"` e sincronizaria o índice — `decision.js:136-157`). Ou seja: **o comando
  correto existe e foi ignorado**, e o framework não tem rede de segurança
  automática.
- **Tagueação de provenance é manual e, portanto, ausente.** Sem âncoras no
  `product.md`, `trace` é inerte.
- **`decision land` é manual e, portanto, ausente.** Evidência de ADR apodrece.
- **`index rebuild` / `validate --fix` precisam ser lembrados.** O `next` avisa,
  mas não age.
- **Right-sizing é decisão 100% do desenvolvedor**, sem orientação no template.

---

## 8. Limitações arquiteturais do Doctrina

**8.1 — A dupla fonte de verdade é a tensão central.** O design diz "arquivos
são a verdade; o índice é derivado" (`scan.js:36`). Mas o `index.json` é
**commitado e editável à mão**. Resultado: ele *drifta*. O framework respondeu
endurecendo a *detecção* (drift de metadados virou **erro** em
`validate.js:99-111`) em vez de *eliminar* a classe (gitignore + rebuild, ou
auto-rebuild no hook). A consequência é o footgun que estamos vendo ao vivo:
qualquer edição manual de metadado (como flipar um status de ADR) sem `index
rebuild` deixa o repositório com o gate primário vermelho. **Isto é arquitetural,
não acidental** — é o preço de manter um cache materializado e editável como se
fosse fonte.

**8.2 — O teto de fidelidade é estrutural.** A cadeia do framework é `produto →
capacidade (trace) → critério → teste (coverage)`. Cada elo verifica
*existência/ligação*, nunca *correção semântica*. `clarify` é léxico (`clarity.js`
— regex de weasel words), não semântico; o nome "clarify" promete mais do que
entrega. Isto é uma escolha consciente (ADR 0005: semântica é do agente), mas
significa que **a inteligência do Doctrina é inteiramente emprestada do agente
que o opera**. O framework é um trilho; quem dirige é o LLM.

**8.3 — Capacidades opt-in sem força de adoção.** `trace`, `skills`, `decision
land`, stamp de versão — todas existem, nenhuma é puxada pelo fluxo default
(`work` playbook não exige tags de provenance, não sugere skills, não roda
`land`). Arquiteturalmente, falta um mecanismo que feche o gap entre "a feature
existe" e "a feature é usada" — por exemplo, `work` falhar/avisar quando uma spec
nova não declara `Realizes:`.

**8.4 — Performance: re-derivação total a cada comando.** `next`, `validate`,
`search`, `context` fazem walk completo da árvore e releem todo arquivo a cada
invocação (sem usar o índice como cache com mtime). Irrelevante nesta escala
(<100ms), mas é um O(n) por comando que contradiz a própria tese de "seleção
sobre dump" em repos grandes. `findNestedAgentsMd` (`validate.js:462`) varre a
árvore-fonte inteira no pre-commit.

**8.5 — Pontos positivos da arquitetura:** módulos pequenos e coesos (maior
arquivo 552 linhas), zero dependências de runtime exóticas, parsing tolerante
(`scan.js:8-14` aceita header ADR-style e spec-style), `stableStringify`
determinístico para comparação de índice, e separação limpa commands/lib.
**Adicionar um comando novo é trivial** (criar `commands/x.js` com `run`+`help`,
registrar no dispatcher) — extensibilidade é boa. A manutenibilidade é alta; o
acoplamento é baixo (commands dependem de lib, não entre si).

---

## 9. Oportunidades de evolução

1. **Eliminar a classe de drift, não só detectá-la.** Auto-`index rebuild` no
   pre-commit (ou tratar `index.json` como build artifact gitignorado e
   regenerado). Some C1+D1 de uma vez. *(Maior impacto, menor esforço.)*
2. **Puxar provenance para o default.** `spec new` insere `**Realizes:**`
   obrigatório; `work` playbook manda taguear `product.md`; `validate` avisa
   specs sem âncora. Faz `trace` deixar de ser letra morta.
3. **Intent-drift check (semântico, assistido por LLM).** O passo que os próprios
   mantenedores prometeram: confrontar cada critério com a cláusula-fonte e
   flaguear enfraquecimento. É o que separaria Doctrina de um bom gerador de
   documentação.
4. **Perfis de cerimônia / `--prototype`.** Colapsar specs, tornar ADR/contract
   opcionais, sinalizar quando a razão artefato/escopo está desproporcional.
5. **Gate qualitativo não-bloqueante.** Suportar checks de relatório
   (eval/rubrica/aprovação humana registrada) no `verify.json`, e um tipo de
   critério "qualitativo" que exija evidência de avaliação em vez de um booleano.
6. **Prevenção de colisão de número de ADR** (ULID ou reserva por autor) e **JSON
   Schema real** para o índice.

---

## 10. Avaliação da experiência de desenvolvimento

- **Ficou mais eficiente?** *Parcialmente.* Para um protótipo solo, a cerimônia
  tem custo real (9 specs + 6 ADRs + contract para um projeto descartável é
  pesado). O ganho de eficiência aparece **menos** na velocidade e **mais** na
  *não-regressão de entendimento*: o contexto não se perde entre sessões/agentes.
- **Reduz complexidade ou organiza melhor?** **Organiza melhor.** Não reduz a
  complexidade do problema; impõe estrutura sobre ela. Isso é valioso, mas é
  importante não confundir.
- **Melhora a qualidade?** Sim, na *consistência* e na *honestidade* (duas-axes,
  gates reais). A qualidade de *conteúdo* (specs boas, fidelidade) continua sendo
  do agente.
- **Reduz erros?** Reduz a classe "documentação mente sobre a realidade" — o
  `coverage`+`verify` fecham o erro grosseiro. **Introduz** uma classe nova de
  atrito: o gate vermelho por drift de índice (que vimos ao vivo).
- **Aumenta consistência?** **Fortemente.** É o benefício mais inequívoco.
- **Onde faz mais diferença:** projetos longevos, multi-agente, multi-sessão,
  onde perder contexto é caro. **Onde quase não ajuda:** protótipo descartável de
  um dev — aí a cerimônia pode custar mais do que rende.

---

## 11. Avaliação final do framework

**O Doctrina está cumprindo o propósito para o qual foi criado? — Sim, com
ressalvas sérias e bem delimitadas.**

Ele cumpre o propósito *declarado e realista*: ser um framework spec-driven,
AGENTS.md-native, que estrutura intenção, governa decisões e torna "pronto"
verificável — **sem** prometer entender semântica (que delega ao agente,
honestamente). Nesse escopo, é maduro, bem arquitetado e está **ativamente
evoluindo por review** (0.3.0/0.4.0 absorveram quase toda a review anterior; a
0.6.0 atual já traz `trace`, `decision land`, detecção de drift como erro,
ranking em `search`).

As ressalvas:

- **Maturidade real ≠ maturidade percebida.** Várias das melhores features são
  opt-in e estão *ociosas* no único projeto que as deveria exercitar. Um
  framework cuja capacidade de fechamento de loop depende de o usuário lembrar de
  ligá-la tem maturidade de *design* superior à maturidade de *adoção*.
- **O gate primário falha no estado atual.** Não por bug, mas pela tensão
  arquitetural da dupla fonte de verdade combinada com um comando que o agente
  contornou. É a evidência mais limpa de que o framework **organiza, mas ainda
  não blinda**.
- **O teto de fidelidade é o degrau que falta.** É também o degrau que os
  mantenedores já mapearam. Enquanto não existir, `coverage 100%` significa "tem
  teste", não "a intenção foi cumprida".

**Veredito:** um bom framework, honesto sobre seus limites, num estágio em que
**define forma e verifica ligação muito bem, mas ainda terceiriza substância e
fidelidade ao agente** — e perde valor por não forçar a adoção das próprias
features que fechariam o loop.

---

## 12. Priorização das melhorias recomendadas (maior → menor impacto)

| # | Melhoria | Por quê | Esforço |
|---|---|---|---|
| 1 | **Eliminar drift do índice** (auto-rebuild no hook *ou* índice como artefato gerado) | Resolve a falha que está vermelha **agora**; mata uma classe inteira de erro; remove o footgun da dupla fonte | Baixo |
| 2 | **Forçar adoção das features passivas** — `trace`/provenance (`Realizes:` no template, aviso no `validate`, passo no `work`); **`skills`** (`work`/`next` sugerindo `skill new` em changes do tipo *fix* ou recorrentes); e **surfaçar `doctrina context`** no template do `AGENTS.md` (seção "How to read context efficiently"), não só no playbook do `work` (§13) | Transforma as features agent-facing de maior valor (elo intenção→capacidade; memória procedural; montagem de contexto) de inertes em ativas, em toda tarefa e não só nas iniciadas por `work` | Baixo–médio |
| 3 | **Intent-drift check semântico (LLM-assistido)** | O degrau conceitual que falta; separa Doctrina de "gerador de docs" | Alto |
| 4 | **Perfis de cerimônia / `--prototype`** | Doctrina pesa igual em protótipo e produção; right-sizing falta desde a review 0.3.0 | Médio |
| 5 | **Gate qualitativo não-bloqueante** (eval/rubrica) | Projetos com DoD qualitativa (como este) não cabem no `verify` binário | Médio |
| 6 | **Puxar `decision land` e stamp de versão para o fluxo** (ou rodá-los no apply/archive) | Evidência de ADR e versão do índice apodrecem por serem manuais | Baixo |
| 7 | **Prevenção de colisão de ADR + JSON Schema real do índice** | Robustez multi-autor e validação estrutural verdadeira | Médio |

---

## 13. Utilidade dos comandos para o agente (não só para o humano)

O Doctrina é, no discurso, **agent-first**: `context`, `search`, `next` e `work`
existem para alimentar/guiar o agente, não o humano (o próprio `next.js:106`
diz "agents and humans run it to resume work"). A pergunta honesta desta seção é:
nesta avaliação, quanto disso eu *de fato* usei, e quais comandos teriam mudado
meu trabalho versus quais só produzem relatório para o usuário?

**Premissa (e primeiro achado):** *nenhum* comando me foi bloqueado — todos
rodaram. O gap não é "não consegui usar"; é que **ou não pensei em usar (minha
ferramenta nativa Read/Grep/Bash já cobria), ou o output não mudou nenhuma
decisão minha**. Isto é, por si, um achado: até os comandos desenhados para o
agente sofrem do mesmo design passivo das skills — nada no loop os traz à tona.
Eu só soube deles porque rodei `doctrina` (help) e porque o usuário colou a
lista. Num fluxo de trabalho normal, a descoberta desses comandos depende de o
agente já conhecê-los.

### A admissão mais clara: `context`

Eu **re-implementei `doctrina context` à mão**. Para montar o pacote de leitura
(AGENTS.md → product.md → spec da capacidade → ADRs aceitos) fiz várias chamadas
`Read`/`Grep` separadas. O comando `doctrina context <capability> --concat`
produz exatamente esse pacote, na ordem canônica, em uma só chamada
(`context.js`). É um comando construído **para mim** que eu ignorei e que teria
economizado várias operações. Esse é o exemplo perfeito de valor agent-facing que
existe mas não chega ao agente.

### Classificação dos 33 comandos pela ótica do agente

Legenda de **Foco**: `Gate` = me dá ground truth; `Anti-footgun` = scaffolda a
partir do template e/ou sincroniza o índice, evitando que eu produza artefato
malformado ou drift; `Orientação` = inventário barato; `Nativo cobre` = minha
tool já faz; `Humano` = relatório que não muda minha ação.

| Comando | Usei? | Foco | Veredito p/ o agente |
|---|---|---|---|
| `validate` | ✓ | Gate | Central — achou a falha viva |
| `verify` | ✓ | Gate | Central — o "código funciona" real |
| `coverage` | ✓ | Gate | Central — ligação spec↔teste |
| `contract check` | ✓ | Gate | Útil — costuras consistentes |
| `trace` | ✓ | Gate | Rodou inerte (feature não adotada) |
| `clarify` | ✓ | Gate fraco | Léxico; esse juízo eu já faço sozinho |
| `next` | ✓ | Orientação | Útil — "onde retomo" |
| `spec list` | ✓ | Orientação | Útil — inventário barato |
| `decision list` | ✓ | Orientação | Útil — inventário barato |
| `metrics` | ✓ | **Humano** | Não mudou decisão; é p/ mantenedor |
| `context` | ✗ | **Agente (alto)** | **Maior miss — re-implementei à mão** |
| `change diff` | ✗ | Agente | Preview antes do apply — usaria em dev |
| `analyze` | ✗ | Agente | Pré-flight antes do apply — usaria em dev |
| `search` | ✗ | **Nativo cobre** | Grep é mais flexível p/ mim |
| `work` | ✗ | Agente | Playbook executável; review é read-only |
| `intake` | ✗ | Agente | Bootstrap único; imprime playbook |
| `init` | ✗ | Setup | Bootstrap único |
| `spec new` | ✗ | Anti-footgun | Alto valor latente (headers/nome certos) |
| `change new` | ✗ | Anti-footgun | Idem |
| `change apply` | ✗ | Anti-footgun | Sincroniza índice |
| `change archive` | ✗ | Anti-footgun | Recusa boxes/verificação aberta |
| `contract new` | ✗ | Anti-footgun | Idem |
| `decision new` | ✗ | Anti-footgun | Idem |
| `decision accept` | ✗ | Anti-footgun | Sincroniza índice |
| `decision land` | ✗ | Anti-footgun | **Não-uso apodrece evidência de ADR** |
| `decision supersede` | ✗ | Anti-footgun | **Não-uso CAUSOU a falha viva (§8.1)** |
| `index rebuild` | ✗ | Anti-footgun | Repara o drift que eu posso introduzir |
| `skill new` | ✗ | Agente latente | Gap: ninguém me leva até ele (§5) |
| `skill list` | ✗ | — | Só se houver skills |
| `skill sync` | ✗ | — | Só se houver skills |
| `templates list` | ✗ | Manutenção | Baixo p/ mim |
| `templates check` | ✗ | Manutenção | Auto-auditoria ocasional |
| `hooks install` | ✗ | **Humano** | Setup de ops, uma vez |

### Síntese

- **Genuinamente úteis a mim (não "conversão para o usuário"):** os *gates*
  (`validate`, `verify`, `coverage`, `contract check`) — eles me dão verdade em
  vez de eu adivinhar; o `context` (que ignorei, para minha perda); a *orientação*
  barata (`next`, `spec list`, `decision list`); e os *scaffolders anti-footgun*,
  cujo valor é justamente impedir que eu erre formato/sincronia. A prova de que
  os scaffolders importam é negativa e está no próprio repo: **bypassar `decision
  supersede` é o que deixou o `validate` vermelho** (§8.1), e **não rodar
  `decision land` é o que faz a evidência dos ADRs apodrecer** (§5).
- **Substituídos pela minha tool nativa:** `search` (uso `Grep`). Doctrina search
  agrega pouco para mim.
- **Majoritariamente humano-facing (não mudaram minha ação):** `metrics`,
  `hooks install`, `templates list`. Úteis para o mantenedor/usuário, não para o
  meu raciocínio.
- **Inerte por não-adoção:** `trace` (rodou e voltou vazio), `skill *` (sem
  skills). Não é que sejam inúteis a mim — é que o projeto nunca os ativou.

**Conclusão da seção:** o Doctrina *é* desenhado para o agente, e os comandos de
maior valor para mim são reais (gates + `context` + scaffolders). Mas o valor
efetivo que extraí pendeu para os **gates** e a **orientação**, enquanto a
**montagem de contexto** (`context`) eu desperdicei fazendo à mão e a
**sincronia de estado** (`supersede`/`land`/`index rebuild`) foi *não-usada* —
e é exatamente esse não-uso que produziu as falhas vivas. O denominador comum com
o gap de skills é o **design passivo**: o framework tem as alavancas certas para
o agente, mas não as coloca na mão dele no momento certo.

### Recomendação concreta: surfaçar `doctrina context` fora do `work`

*(Correção de uma sugestão anterior, após verificar o código.)* O playbook do
`work` **já** traz `doctrina context <cap> --concat` como passo 1
(`work.js:383-384`) — logo, "adicionar como passo 0 do `work`" seria redundante.
O gap real é mais preciso: **esse comando só é surfaçado quando se entra pelo
`work`**. Para tarefas que não começam por `work` — review, exploração, debug,
"responda uma pergunta sobre o repo" (foi o meu caso) — nada leva o agente ao
`context`, e foi por isso que eu montei o pacote de leitura à mão.

A correção certa está no **`AGENTS.md` (sempre carregado)**: sua seção *"How to
read context efficiently"* enumera exatamente o que `doctrina context` automatiza
(AGENTS.md → product.md → spec → changes → ADRs aceitos → skills on-demand), mas
**nunca nomeia o comando** — descreve a ordem como passos manuais de abrir
arquivo. Como esse `AGENTS.md` é gerado pelo template do `doctrina init`, a
mudança é no template do framework:

> Reescrever a seção para **liderar com** `doctrina context [<capability>]
> --concat` como a forma de materializar o pacote em uma chamada, mantendo a
> lista numerada apenas como descrição do que o comando monta.

Efeito: o comando agent-facing de maior valor (que eu desperdicei) passa a ser
visível em **toda** tarefa, não só nas iniciadas por `work` — fechando, para o
`context`, o mesmo "design passivo" diagnosticado para skills e `trace`. Custo:
baixo (uma edição de template). É a mesma alavanca do item #2 da priorização.

---

## Apêndice A — Evidências coletadas (2026-06-27)

- `doctrina --version` → **0.6.0**
- `doctrina validate` → **fail, 2 errors, 1 warning** (drift de `index.json` em
  decisions 0002 e 0006; `framework_version` "0.0.0")
- `doctrina coverage` → **ok, 61/61 critérios (100%)** em 9 specs
- `doctrina trace` → **"no intent-provenance markers found"** (feature ociosa)
- `doctrina clarify --all` → **ok, no smells in 10 living documents**
- `doctrina contract check` → **ok, 1 contract consistent**
- `doctrina verify` → **ok, 1/1 checks passed** (`python -m pytest -q`, 96 testes)
- `doctrina next` → **"index.json has drifted from the tree"**
- `.doctrina/skills/` → apenas `.gitkeep` (zero skills)
- `event-sourcing/spec.md:26-29` → tabela de pesos do intake preservada intacta
- Fontes lidas da CLI: `index.js`, `lib/scan.js`, `lib/clarity.js`,
  `commands/validate.js`, `commands/coverage.js`, `commands/trace.js`,
  `commands/decision.js`, `commands/context.js`, `commands/work.js`

*Nenhum código, spec, ADR ou configuração foi modificado para produzir este
documento.*

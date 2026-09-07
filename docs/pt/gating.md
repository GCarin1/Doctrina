# Gating

> Tradução da [versão em inglês](../en/gating.md). O inglês é a
> fonte de verdade; este arquivo o segue.

O pipeline Doctrina é overhead. Este doc te diz quando ele
compensa e quando não.

## A pergunta-gatilho

> "Eu ficaria irritado se o agente interpretasse os requisitos de
> forma diferente do que eu quis dizer?"

Se a resposta é sim, você quer uma spec. Se não, não. Essa única
pergunta substitui o checklist na maior parte das vezes.

## Gatilhos concretos

O ciclo completo (abrir change → escrever delta → aplicar →
arquivar) compensa quando **qualquer** um destes vale:

- O trabalho toca uma capability coberta por spec existente.
- O trabalho muda comportamento observável para usuários ou
  outros sistemas.
- O trabalho tem mais de uma implementação plausível e você
  quer que o agente escolha uma e mantenha.
- O trabalho cruza uma fronteira de subsistema ou afeta uma
  interface.
- O trabalho introduz ou muda uma dependência.
- O trabalho tem implicações de segurança ou compliance.

O ciclo completo **não** compensa para os cinco cenários abaixo
que a literatura de SDD (marmelab, Augment, arXiv:2602.00180)
converge como ROI-negativo para cerimônia de spec:

1. **Protótipos descartáveis.** Código que você vai jogar fora em
   uma semana.
2. **Projetos solo de curta duração.** Sem segundo leitor, sem
   você-futuro para agradecer.
3. **Código exploratório.** Spikes cujo objetivo é aprender, não
   entregar.
4. **Fixes de uma linha.** Typos, formatação, bugfix de uma linha,
   renomeações mecânicas de campos privados.
5. **CRUD óbvio.** Boilerplate cuja forma é ditada inteiramente por
   um schema, sem julgamento.

Em qualquer um desses casos: escreva o código, rode os testes,
commite. Sem proposal, sem delta, sem archive.

A regra de bolso que a pesquisa destila: **use o mínimo de rigor de
spec que remove a ambiguidade no seu contexto**. Mais estrutura por
si só produz a burocracia que este doc alerta.

## Quando escrever um ADR

Abra um ADR (independente de qualquer change) quando a decisão é:

- Difícil de reverter (engine de banco, topologia de deploy,
  shape de API pública).
- Arquiteturalmente significativa (modelo de concorrência,
  ownership de dados, estratégia de autenticação).
- Uma escolha que o próximo leitor reabriria do zero.

**Não** escreva um ADR para:

- Detalhes de implementação que aparecem no código (nomes de
  variável, estruturas de dados internas).
- Decisões que já vivem numa spec.
- Decisões que você não se daria ao trabalho de explicar a um
  colega novo.

Regra de bolso: se você escreveria um post interno sobre, é um
ADR.

## Quando atualizar `product.md`

Atualize `product.md` quando o escopo, usuários-alvo ou
não-objetivos do projeto mudam. Bug fixes e features pequenas
não mexem em `product.md`; pivots mexem.

## Quando refatorar os docs

Refatore os docs quando um doc existente foi lido por você ou por
um agente e produziu ação errada. Se ninguém esbarra, ninguém
conserta. O `doctrina validate` não checa frescor de doc — humanos
checam, por revisão de PR e pela pergunta-gatilho acima.

## Onde a lista de gates realmente mora

Três superfícies rodam gates: o `doctrina close` (a sequência de
fechamento), o `doctrina doctor` (as linhas do diagnóstico) e a action de
CI. As três leem **uma única declaração** — `SEQUENCES` em
`packages/doctrina-cli/src/lib/gates.js` — que nomeia cada passo, o
quanto ele morde (bloqueante, consultivo ou forçável) e o comando que o
reexecuta sozinho.

Isso importa na hora de decidir o que gatear: acrescentar um gate é uma
edição de uma linha nessa declaração, não quatro edições que podem sair
de sincronia em silêncio. O `action.yml` é gerado a partir dela
(`doctrina ci --emit github`) e continua versionado, então um projeto que
consome a action não precisa do CLI; um teste de drift quebra o build se
o arquivo versionado e a declaração discordarem.

## O cabeçalho que você não mantém: Implementation

O `**Implementation:**` (`planned` → `partial` → `implemented` →
`verified`) era mantido de cabeça, e o playbook do `work` pedia isso duas
vezes. Só que o `doctrina coverage` já calcula, por spec, quantos
critérios de aceite citam prova que resolve — que é a definição de
`verified`. Então o valor é **derivado**:

| Coverage dos critérios da spec | Estado derivado |
|--------------------------------|-----------------|
| todos cobertos, nada dangling, conditional, unguarded ou deferred | `verified` |
| ao menos um coberto, mas não todos | `partial` |
| nenhum coberto | `planned` |

Três superfícies leem essa única derivação, então não têm como dar três
respostas: o `validate` avisa quando o cabeçalho escrito discorda dela, o
`doctrina close` imprime o op `set-header Implementation:` para as
capabilities que a change tocou, e o `doctrina spec set <cap>
--implementation auto` aplica o valor.

Nada reescreve o cabeçalho sozinho — um gate que editasse a afirmação que
ele mesmo confere estaria corrigindo a própria prova. Duas coisas
silenciam o aviso, ambas de propósito:

- **Uma nota depois da palavra de estado** (`planned — backend adiado,
  ver ADR 0007`). É o mesmo escape de adiamento declarado que o gate de
  coverage já honra: prosa que alguém escreveu de propósito não é
  atropelada por uma contagem.
- **`implemented` onde a aritmética sustenta `verified`.** Esse degrau
  quer dizer "o código está lá; eu não certifiquei", e subestimar
  exatamente por ele é a escada funcionando.

O critério é "resolve no disco", não "foi executado": o `coverage --run`
é o opt-in que roda a prova, e fazer uma leitura estrutural depender de
uma execução de testes colocaria uma suíte dentro do `validate`. Um
critério cuja única prova é uma suíte pulada já conta como `conditional`,
então nunca passa por prova.

## O close se autorevisa

O `doctrina review` é a análise de conformidade mais rica do projeto: ele
reporta capabilities cujo código andou enquanto a spec ficou parada,
dependentes que uma change afeta, e critérios de aceite cuja prova ficou
danglando. Por dois releases nenhum driver o invocava, então ele só rodava
quando alguém lembrava de digitar o comando.

Agora ele roda dentro do `doctrina close`, **antes do apply** — o ponto em
que os achados dele ainda podem mudar o que vai ser escrito numa spec — e é
**consultivo**: reporta, o close segue, e o código de saída dele não move o
do close.

Consultivo de propósito, por ora. O `review` levanta um break para *toda*
capability com código tocado e spec parada, e parte disso é legítimo: um
refactor que não muda comportamento não deveria ter que editar uma spec para
provar isso. Esse ruído precisa ser medido em changes reais antes de poder
recusar alguma coisa — o ledger e o log de uso é que vão medir. Quem quiser
que o CI bloqueie hoje continua tendo o `doctrina review --strict`.

## O que o ledger sabe

`.doctrina/changes/archive/LEDGER.md` é uma linha append-only por change
arquivada: a data, o id, o título e as capabilities que a change tocou, com a
operação feita em cada uma. É o único registro da árvore escrito em
**capabilities** e não em arquivos — o git conta que um arquivo mudou nove
vezes; só o ledger conta que uma capability mudou.

Três superfícies o leem:

- `doctrina report` lista o **churn por capability** do período.
- `doctrina review` anota uma capability tocada que aterrissou várias
  changes recentemente.
- `doctrina close` lista os **dependentes** das capabilities tocadas, com a
  cobertura de cada um.

Os três são consultivos, e o número de churn não carrega veredito. Uma
capability que muda muito pode estar mal desenhada ou pode ser simplesmente
onde o trabalho está, e nada na CLI distingue os dois casos (ADR 0005) — o
número é contexto para quem lê, não um achado. A lista de dependentes é
consultiva por outro motivo: o close restringe o gate de coverage às
capabilities que a change tocou, justamente para que uma spec adiada em
outro canto não bloqueie uma change que nunca chegou perto dela. Ampliar o
gate até os dependentes devolveria esse problema; nomeá-los, não.

O cabeçalho do próprio arquivo promete que a CLI só faz append e convida
você a editá-lo. A promessa é cumprida: uma linha fora da gramática é lida
como nota e ignorada, nunca reescrita e nunca fatal.

## O único gate que você não escolhe: runtime

Tudo acima trata de *quando* abrir um change. O gate de runtime é
diferente: ele roda em todo `doctrina close` e na action de CI, tendo o
trabalho valido ou não um change, porque o que ele checa não é um
documento — é se as declarações que um contrato faz sobre o sistema em
execução ainda valem (RT01-RT05: a variável que nenhum workflow exporta,
o default que um valor vazio do CI nunca dispara, o enum que ninguém
valida, o seletor que não casa com nada e mesmo assim sai 0).

Essa classe de quebra sobrevive a todos os outros gates: os artefatos
estão bem formados, as specs traçam, os critérios citam prova, e o
pipeline fica verde enquanto o processo nunca vê a variável. Por isso o
check fica na sequência, e não no seu julgamento.

O custo é limitado pelo que você declarou:

- **Sem contratos** — uma linha, saída 0. Nada muda.
- **Contratos sem linhas de `Wiring`/`Selectors`** — reportado como
  **UNCHECKED**, nunca como aprovado. Silêncio não é prova; é a ausência
  de uma declaração a checar.
- **Linhas declaradas** — um erro bloqueia o close, um aviso é reportado
  e o close segue.

Ou seja: o gate não custa nada até você declarar algo, e a partir daí ele
cobra o que foi declarado. Essa é a troca a fazer de propósito: declare
as linhas que importam, não todas as que caberiam.

## Antipattern: gating em tudo

O ponto do Doctrina é reduzir surpresas, não fabricar cerimônia.
Times que rodam o pipeline completo em todo commit produzem o
documentation theater que ADR 0003 alertou. Se `doctrina validate`
é a única coisa mantendo artefatos em sincronia com a realidade,
os artefatos não estão puxando o peso.

A disciplina pragmática:

1. Por padrão, pule.
2. Abra um change só quando a pergunta-gatilho dispara.
3. Mantenha specs curtas, densas, atuais.
4. Arquive proposals rápido.

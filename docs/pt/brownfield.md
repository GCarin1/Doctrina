# Adotando Doctrina num projeto brownfield

> Tradução da [versão em inglês](../en/brownfield.md). O inglês é a
> fonte de verdade; este arquivo o segue.

Um projeto brownfield é um com codebase rodando, testes
existentes, usuários reais e decisões cujas justificativas
originais ninguém lembra completamente. Doctrina mira tanto
greenfield quanto brownfield, mas a entrada é diferente. Este doc
é a entrada brownfield.

## Por que brownfield é mais difícil

Em um projeto greenfield você escreve specs porque o código ainda
não existe; a spec é o contrato do que você está prestes a
construir. Em um projeto brownfield o código já existe e funciona.
A tentação é "back-fill" specs para toda capability antes de
tocar em qualquer coisa. Não.

Três razões:

- **Inflação de specs tem custo de qualidade.** Toda spec que um
  humano não precisou produz token tax para todo agente que lê
  (ETH Zurich) mais superfície de drift que ninguém mantém.
- **Engenharia reversa é lenta e imperfeita.** A spec que você
  escreve lendo código captura o que o código faz, não o que
  deveria fazer. Essas duas coisas não são a mesma.
- **O ROI chega rápido quando você specifica o que toca, lento
  quando specifica o que não toca.** Specifique uma capability
  que vai ter um change em breve; pule o resto até que ganhem o
  mesmo gatilho.

## Regra 1 — Spec just-in-time

Quando um change estiver prestes a tocar a capability X, specifique
X primeiro. Use `doctrina spec new <x>` para semear o arquivo,
depois escreva só os requisitos que o change se importa. A spec
cresce conforme é tocada; nunca cresce à frente do trabalho.

Isso é o inverso do pattern típico brownfield-primeira-semana-
após-adoção (sentar, listar todo módulo, escrever 40 specs em
três dias). Esse pattern produz documentation theater em um
trimestre. O pattern just-in-time produz specs que puxam o
próprio peso.

## Regra 2 — ADRs retroativos para decisões passadas

Quando você descobrir uma decisão arquitetural passada lendo
código — "escolhemos Postgres porque precisávamos de JSONB",
"rodamos billing num worker por causa de timing de webhook de
cartão de crédito", "auth é serviço separado para satisfazer
compliance" — escreva um ADR com data de descoberta e nota
"descoberto, não authored nesta data":

```
- Status: accepted
- Date: 2026-06-10  (descoberto lendo src/billing/)
- Original decision date: desconhecida, anterior à adoção do Doctrina
```

O ADR é honesto sobre o que registra (uma decisão descoberta,
não um julgamento atual) e remove a necessidade do próximo
leitor re-litigar a escolha.

**Não** invente ADRs para parecer retroativamente organizado.
ADRs falsamente authored como se tivessem sido escritos no
momento da decisão corrompem a história de decisões do projeto.
Se a justificativa estiver genuinamente perdida, escreva um ADR
que diz isso:

```
- Status: accepted (rationale unrecovered)
- Date: 2026-06-10
- Original decision date: desconhecida
- Notes: a implementação atual exige essa escolha; o raciocínio
  original não pôde ser reconstruído pelo git history ou
  entrevistas.
```

Honesto bate arrumado.

## Regra 3 — Deixe `validate` e `clarify` fazerem o onboarding

Uma vez instalado o framework e algumas specs existentes, rode:

```
doctrina validate
doctrina clarify <cada spec que você escreveu>
```

A saída é um instrumento silencioso de onboarding:

- Warnings de órfãos sinalizam arquivos que existem em disco mas
  nunca entraram no index — geralmente specs antigas meio-começadas.
- Warnings de stale-reference sinalizam links em specs e ADRs
  para arquivos movidos ou deletados.
- Warnings de tamanho sinalizam specs grandes demais que deveriam
  ser divididas.
- Warnings de clarify sinalizam weasel words e placeholders
  deixados de drafts apressados.

Nenhum desses é erro. São sinais. Times brownfield que corrigem
conforme aparecem ficam abaixo do teto lost-in-the-middle sem
esforço.

## Regra 4 — Aplique o pattern de conventions-repo na casa legada

Se o projeto brownfield vive dentro de uma organização com outros
projetos, o pattern de repositório de conventions de
[context-engineering.md](context-engineering.md) é a primitiva
certa de compartilhamento. Um repo pequeno possui:

- Um `AGENTS.md` base com o estilo da casa (a linha "não toque em
  legado sem ADR"; o formato canônico de commit; o gatilho de
  review de segurança).
- Snippets opcionais para bullets comuns de estilo de código.

Novos projetos (e adotantes brownfield) colam ou `@`-importam
esse conteúdo antes do bloco projeto-específico do `AGENTS.md`. O
conteúdo base é atualizado à mão; não há sync automático.

## Antipatterns específicos de brownfield

- **O spec sprint do primeiro dia.** Escrever 40 specs na semana
  um produz 38 specs não-lidas na semana oito. Specifique o que
  toca.
- **Falsificar ADRs como se você tivesse escrito no tempo.**
  Sempre marque ADRs retroativos como descobertas com data atual.
- **Specificar código estável que ninguém está mudando.** Se
  uma capability não mudou em dois anos e ninguém vai mudar em
  breve, ela não precisa de spec Doctrina. O código é a spec.
- **Tratar warnings do `clarify` como erros no tempo de adoção.**
  Prosa existente não foi escrita com o framework em mente.
  Limpe smells de clarify conforme você toca cada arquivo; não
  faça sprint neles.
- **Traduzir jargão interno em linguagem de spec por atacado.**
  Specs são escritas para o próximo leitor, não como glossário.
  Se um termo carrega significado só para o time original,
  defina uma vez em `product.md` e use normalmente em outros
  lugares.

## Quando brownfield encontra o workflow de changes

Uma vez que algumas capabilities estão spec'd, projetos brownfield
usam o ciclo normal de changes. Dois ajustes que vale conhecer:

- **Specs no formato de bug são comuns no primeiro mês.** Use
  `doctrina spec new <cap> --bug` para issues encontradas lendo
  código. O template current/expected/unchanged behaviour casa
  com o ritmo brownfield de descobrir-depois-decidir.
- **Changes de refactor carregam mais peso de ADR que os
  greenfield.** Um refactor num projeto brownfield geralmente
  traz à tona uma decisão passada que não é mais ótima; essa
  decisão pertence a um ADR mesmo quando o refactor em si é
  pequeno.

## Material relacionado

- [Workflow](workflow.md) — o ciclo no qual as regras acima
  plugam.
- [Gating](gating.md) — quando o pipeline completo se paga.
- [Engenharia de contexto](context-engineering.md) — os
  princípios que estas regras aplicam.
- [Antipatterns](antipatterns.md) — os modos gerais de falha que
  projetos brownfield batem mais forte que greenfield.

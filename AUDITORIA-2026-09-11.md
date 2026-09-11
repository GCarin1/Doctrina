# Auditoria completa — Doctrina

**Data:** 2026-09-11
**Escopo:** repositório inteiro na branch `develop` (`409a78e`), idêntica a `main` (`f8617cd`)
**Versão auditada:** framework 0.16.0 / CLI 0.16.0

---

## Veredito

A árvore de artefatos está saudável e os oito checks do `doctrina verify`
passam localmente. O problema não está no código: está no **pipeline**. O
CI está vermelho em `main` há pelo menos dez execuções consecutivas, desde
2026-08-06. Nenhuma versão publicada deste projeto passou pela própria
esteira desde então.

Um framework cujo argumento de venda é "gates honestos" está publicando com
o gate vermelho. Essa é a constatação central desta auditoria.

Duas causas independentes mantêm o CI vermelho, e uma delas foi reproduzida
localmente com causa-raiz identificada.

---

## Achados bloqueantes

### B1. O harness end-to-end quebrou quando a derivação de slug mudou

**Onde:** `scripts/e2e-packed.mjs:151`
**Impacto:** job `End-to-end (packed install)` falha em ubuntu e windows
**Status:** reproduzido localmente, causa-raiz confirmada

O harness fixa o identificador da change:

```js
const changeId = "0001-add-refunds";
```

A change 0070 (2026-09-08) passou a filtrar stopwords na derivação de slug.
`add` está na lista de stopwords em `packages/doctrina-cli/src/lib/lexicon.js`,
então o comando produz outro identificador:

```
$ doctrina work "add refunds" --capability billing --quiet
created .doctrina/changes/0001-refunds/proposal.md
created .doctrina/changes/0001-refunds/specs/billing/delta.md (Operation: MODIFIED prefilled)
```

O CLI está correto. O harness é que ficou para trás. É um defeito de teste,
não de produto, mas custa o pipeline inteiro.

### B2. Quatro testes falham apenas em macOS com Node 20.12

**Onde:** `test/context-retrieval.test.js:263` e `test/integration.test.js:1392`
**Impacto:** job `Tests + self-validate (Node 20.12 / macos-latest)` falha
**Status:** não reproduzível em Linux; exige um runner macOS para fechar

A mesma combinação passa em ubuntu e windows com Node 20.12, e passa em
macOS com Node 22. Só a interseção macOS + Node 20.12 falha.

Os dois testes identificados verificam a montagem do pacote de contexto, e
em ambos os artefatos sob `.doctrina/` estão ausentes do pacote produzido.
Um deles espera o cabeçalho de `.doctrina/product.md` na saída `--concat` e
recebe um pacote que termina logo após `AGENTS.md`. O outro espera que algum
ADR seja degradado sob orçamento de 13000 tokens e nada é degradado, o que é
consistente com um pacote menor do que deveria.

Este achado ficou aberto por cerca de cinco semanas antes do B1 aparecer,
o que sugere que o vermelho passou a ser lido como ruído de fundo.

---

## Achados altos

### A1. A política de segurança contradiz a implementação

**Onde:** `SECURITY.md`

O documento afirma, sob "Posture and commitments":

> **No process spawning beyond declared commands.** The CLI does not invoke
> subprocesses except the pre-commit hook it installs at the user's request.

Isso é factualmente falso em duas frentes.

Onze módulos invocam `git` como subprocesso através de
`packages/doctrina-cli/src/lib/git.js`, entre eles `review`, `status`,
`context`, `work`, `metrics`, `report` e `skill`.

Mais relevante: `doctrina verify` executa strings de shell arbitrárias lidas
de `.doctrina/verify.json`, com `shell: true`, em
`packages/doctrina-cli/src/commands/verify.js:245`. Esse é exatamente o
cenário que a própria política lista como incidente reportável — "an
attacker controlling a malicious template or change folder could cause the
CLI to execute arbitrary code". Clonar um repositório desconhecido e rodar
`doctrina verify` executa os comandos que aquele repositório declarou.

O comportamento é legítimo e é o mesmo contrato de `npm test`. O defeito é a
política dizer o contrário. Enquanto ela disser, qualquer leitor que confie
no texto está mal informado sobre o limite de confiança real.

A tabela de versões suportadas também está congelada em `0.1.x`, enquanto o
projeto publica 0.16.0.

**Nota de crédito:** as demais promessas se sustentam. Não há chamadas de
rede, não há `eval` nem `new Function`, não há dependências de runtime, e as
invocações de `git` passam argumentos por array, sem interpolação em shell.

---

## Achados médios

### M1. Os dois exemplos publicados apodreceram, e o CI não consegue ver

**Onde:** `examples/`

```
examples/python-fastapi-urls        index.json em framework_version 0.14.0
examples/typescript-express-retrofit index.json em framework_version 0.14.0
examples/typescript-express-retrofit .doctrina/specs/api-quota/spec.md:39
```

O segundo é o mais sério. A linha 39 diz:

> While the process is running, all counters are held in memory.

Falta o `shall`. É precisamente o erro de EARS que o exemplo existe para
ensinar a evitar, e o comentário no próprio `ci.yml` registra que esse mesmo
defeito já havia sido corrigido uma vez. Ele regrediu.

O passo de CI que roda os exemplos usa `doctrina validate`, que sai com
código 0 quando há apenas warnings. Os dois defeitos são warnings. O gate
existe, roda, e não pode reprovar.

### M2. O `assert` do harness não interrompe a execução

**Onde:** `scripts/e2e-packed.mjs:63`

```js
function assert(cond, what, detail) {
  if (cond) ok(what);
  else fail(what, detail);
}
```

Quando a asserção do B1 falha, a execução continua até o `readFileSync`
seguinte e morre com um `ENOENT` cru. O log de CI mostra um stack trace de
`node:fs` em vez da mensagem que o harness preparou. A causa real fica
enterrada sob um sintoma.

### M3. O lockfile está defasado em relação ao workspace

`package-lock.json` registra `packages/doctrina-cli` na versão `0.14.0`,
enquanto `packages/doctrina-cli/package.json` declara `0.16.0`.

`npm ci` tolera a divergência e passa, então nada quebra. O custo é outro:
qualquer `npm install` reescreve o arquivo e suja a árvore. Com a árvore
suja, `doctrina review` passa a reportar nove falsos "spec não atualizada",
porque enxerga arquivos alterados em capacidades que ninguém tocou.

### M4. O gate de release é mais fraco que o gate de PR

**Onde:** `.github/workflows/release.yml`

O job de publicação roda typecheck, a suíte de testes e `validate`. Não roda
o harness de instalação empacotada, nem coverage, trace, index-drift,
contract-check ou docs-shape.

O harness ausente é justamente o que exercita o que o npm publica de fato.
O comentário no `ci.yml` registra que três defeitos foram invisíveis a
partir do checkout e óbvios a partir da instalação empacotada. O publish
segue desprotegido contra essa classe.

O workflow também concede `id-token: write` mas publica sem `--provenance`,
então a permissão está aberta sem uso.

---

## Achados baixos

### L1. Falso positivo permanente no gate de cobertura

O critério #72 de `.doctrina/specs/gates/spec.md` cita `specs/legacy.md` e
`specs/carteira/spec-old.md` como *cenário de entrada* — caminhos que o
teste constrói para provar que `validate` os denuncia. O extrator de
evidências em `packages/doctrina-cli/src/lib/coverage-model.js` trata
qualquer caminho entre crases com barra como citação de prova, e reporta os
dois como não resolvíveis em toda execução.

O heurístico já isenta diretórios e nomes sem barra. Falta isentar a menção
em prosa. Enquanto não isentar, o marcador `!` aparece sempre, e um aviso
que nunca muda é um aviso que ninguém lê.

### L2. Teste amarrado ao conteúdo vivo do repositório

`test/context-retrieval.test.js:263` fixa `--budget 13000` e depende de que
esse número caia entre o núcleo irredutível do pacote e seu tamanho cheio.
O comentário assume isso explicitamente. À medida que a árvore cresce, o
número sai da janela e o teste quebra sem que nada de errado tenha
acontecido.

### L3. Itens de orçamento estrutural

`.doctrina/specs/gates/spec.md` está com 434 linhas, acima do teto suave de
400. O projeto já tem a skill `split-an-oversized-spec` para esse caso.

`AGENTS.md` está em 147 de 150 linhas. O bloco de superfície de comandos é
gerado e cresce com o catálogo, então restam três linhas de folga.

### L4. PRs para `develop` não disparam CI

`.github/workflows/ci.yml` dispara em `push` e `pull_request` apenas para
`main`. O fluxo corrente é `develop` → `main`, que dispara normalmente, mas
um PR de branch de feature para `develop` não roda gate nenhum. O PR #15 foi
exatamente esse caso.

---

## O que foi verificado e está saudável

Os oito checks de `doctrina verify` passam localmente, uma vez instaladas as
dependências:

| Check | Resultado |
|---|---|
| typecheck | limpo |
| test | 853 passam, 0 falham |
| self-validate | 0 erros, 1 warning |
| index-drift | índice em sincronia |
| contract-check | 1 contrato consistente |
| coverage --strict | 261/261 critérios |
| trace --strict | 5/5 âncoras |
| docs-shape | 27 arquivos EN, 27 PT |

Também conferidos: `clarify --all` limpo em 20 documentos vivos, 27 ADRs com
numeração e formato corretos, `templates check` sem pendências, `doctor` sem
falhas, e os 90 arquivos de `src/` sem nenhum marcador `TODO` ou `FIXME`
real — as sete ocorrências pertencem ao próprio linter do `clarify`.

O typecheck falha em um checkout fresco apenas porque `@types/node` é uma
devDependency e o container não rodou `npm install`. Não é defeito do
código. Vale registrar que a mensagem do gate não sugere `npm install`, o
que custa alguns minutos a quem encontra o erro pela primeira vez.

---

## Dívida declarada, não é defeito

A ausência de `.gitattributes` está registrada em `docs/en/deferred.md` sob
"Line-ending policy", com justificativa e plano de retomada. A decisão de
não renormalizar 519 arquivos para não enterrar o `git blame` é defensável e
está escrita. Cinco arquivos sob `.doctrina/` já estão em CRLF, todos
arquivados.

Isso é dívida declarada e documentada, tratada aqui como tal.

---

## Ordem sugerida de correção

1. **B1** — alinhar o identificador esperado em `scripts/e2e-packed.mjs`
   com a derivação atual, ou derivá-lo do comando em vez de fixá-lo.
   Devolve dois jobs ao verde.
2. **M2** — fazer o `assert` do harness abortar na primeira falha, para que
   a próxima regressão apareça com a mensagem certa.
3. **A1** — corrigir `SECURITY.md` para descrever o que o CLI realmente
   executa, e atualizar a tabela de versões.
4. **M1** — regravar os stamps dos exemplos e corrigir o `shall` ausente;
   fazer o passo de CI reprovar em warning, senão o defeito volta uma
   terceira vez.
5. **B2** — reproduzir em runner macOS com Node 20.12 e fechar a causa.
6. **M3**, **M4**, **L1**, **L2**, **L3**, **L4** — na cadência normal.

Os itens 1 a 4 são alterações pequenas e localizadas. Recomendo conduzi-los
pelo próprio ciclo do framework, com `doctrina work`, para que a correção
carregue a mesma proveniência que o projeto exige de qualquer outra
mudança.

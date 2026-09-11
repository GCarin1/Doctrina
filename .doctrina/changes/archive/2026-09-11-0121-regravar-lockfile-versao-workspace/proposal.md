# Change 0121-regravar-lockfile-versao-workspace — regravar o lockfile para a versao 0.16.0 do workspace doctrina-cli

- **Status:** applied
- **Applied:** 2026-09-11
- **Date:** 2026-09-11
- **Owner:**
- **Lane:** chore (confident; signals: lockfile) — opened as chore
- **Affects specs:** (none — chore)

## Why

`package-lock.json` registra `packages/doctrina-cli` na versão `0.14.0`,
enquanto `packages/doctrina-cli/package.json` declara `0.16.0`. O stamp
ficou para trás em dois cortes de versão seguidos.

`npm ci` tolera a divergência e passa, então nada quebra no CI. O custo
aparece no trabalho local: qualquer `npm install` reescreve o arquivo e
suja a árvore. Com a árvore suja, `doctrina review` enxerga um arquivo
alterado que não pertence a nenhuma capacidade e passa a reportar nove
falsos "spec não atualizada", um para cada capacidade cujo código o
lockfile parece tocar.

O ruído cai exatamente sobre o gate que existe para dizer se uma spec
ficou para trás, que é o pior lugar para um falso positivo morar.

## What

Regravar `package-lock.json` com `npm install`, de modo que o stamp do
workspace acompanhe o `package.json` do pacote.

Alteração de um único valor, sem efeito sobre a árvore de dependências:
o pacote não tem dependências de runtime, e as quatro devDependencies do
monorepo continuam resolvidas nas mesmas versões.

## Scope boundaries

Não toca a versão declarada em `packages/doctrina-cli/package.json`, que
já está correta em `0.16.0`. Não mexe no processo de corte de versão nem
na skill `cut-a-release`; se o stamp voltar a atrasar, a causa é aquele
processo e o conserto é lá, não aqui.

## Verification

- [x] Automated checks pass (`doctrina verify`, or the project's typecheck/test/build).
- [x] The affected spec's acceptance criteria are met and cite their evidence (`doctrina coverage`).
- [x] `npm ci` continua instalando a partir do lockfile sem erro.
- [x] Um `npm install` seguido de `git status` deixa a árvore limpa.

## Open questions

Nenhuma.

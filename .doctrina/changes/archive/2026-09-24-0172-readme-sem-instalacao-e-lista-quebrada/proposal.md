# Change 0172-readme-sem-instalacao-e-lista-quebrada — README sem instalacao e lista quebrada

- **Status:** applied
- **Applied:** 2026-09-24
- **Date:** 2026-09-24
- **Owner:**
- **Lane:** product
- **Affects specs:** docs

- **Documented surface:** n/a — cita `npm install`, `init`, `prime`, `work` e `close` para ensinar o caminho; não altera nenhum deles

## Why

O README é a porta do projeto e tinha cinco defeitos:

- Nenhum comando de instalação: são 180 linhas sobre o framework, e o `npm install -g doctrina-cli` só aparecia em `docs/en/getting-started.md`.
- A lista de documentação estava partida: três guias (Antipatterns, Validation, Glossary) ficavam soltos depois da linha "Project policy", em EN e PT.
- Sete guias não eram listados, entre eles `exit-codes.md` e `upgrading.md`.
- O item de adapters nomeava 8 dos 12 que o próprio README anuncia.
- O `deferred.md` se intitulava "Deferred at v0.1.0", embora registre itens bem posteriores (a falha de macOS da change 0134).

O README em português ainda mandava habilitar o Pages por "Deploy from a branch → `main` / `docs`", enquanto o inglês e o `pages.yml` usam GitHub Actions.

## What

- `README.md` e `README.pt.md`: seção de instalação antes do diagrama; lista de documentação inteira e completa; os 12 adapters; o item "Deferred" sem "v0.1.0". No PT, a instrução do Pages igual à do EN.
- `docs/{en,pt}/deferred.md`: título "Deferred" / "Adiado", e a introdução diz que o registro abriu em v0.1.0 e cresce.
- Teste `packages/doctrina-cli/test/o-readme-leva-a-cada-guia.test.js`: nos dois idiomas, o README traz o comando de instalação antes do diagrama, linka cada guia (com isenções nomeadas) e não deixa guia solto depois da linha de política.

## Scope boundaries

- O conteúdo dos guias não muda, só o título e a introdução do `deferred.md`.
- Isenções do teste: o índice e a navegação do site, o guia de contribuição (linkado como `CONTRIBUTING.md`) e a página de doações.

## Verification

- [x] O teste passa (6/6) e falha 6/6 nos READMEs anteriores (`git stash`).
- [x] `node scripts/check-docs.js` limpo; todo link relativo dos dois READMEs resolve.
- [x] Automated checks pass (`doctrina verify`).
- [x] The affected spec's acceptance criteria are met and cite their evidence (`doctrina coverage`).

## Open questions

Nenhuma.

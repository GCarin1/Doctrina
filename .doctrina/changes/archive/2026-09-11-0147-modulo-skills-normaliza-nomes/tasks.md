# Tasks — Change 0147-modulo-skills-normaliza-nomes

- [x] Expor o slug de skill para teste e cobrir o dano com um caso que
      falha hoje: acento e maiúscula em `skillSlug`, e o token normalizado
      da semente do slug.
- [x] Rotear `skillSlug()` e a normalização de `seedTokens` pelo `fold()`
      de `lib/lexicon.js`; `commitSlug()` delega em vez de repetir o recorte.
- [x] Garantir que o slug começa por letra, como a spec de skills exige,
      descartando um prefixo puramente numérico.
- [x] Registrar a prova na spec `skills` (delta com `append-criterion`) e
      rodar os gates.

## Closing steps

- [x] Apply the change: merge each delta into the corresponding spec.
- [x] Archive the change folder to `.doctrina/changes/archive/2026-09-11-0147-modulo-skills-normaliza-nomes/`.
- [x] Update `.doctrina/index.json` with new or modified artifacts.

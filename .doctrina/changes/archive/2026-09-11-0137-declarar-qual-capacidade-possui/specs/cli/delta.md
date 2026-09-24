# Spec Delta — capability: cli

**Operation:** MODIFIED
**Target spec on apply:** `.doctrina/specs/cli/spec.md`

---

`tsconfig.json` configura o checker sobre o código desta capacidade, que
já declara o arranjo em dois requisitos e dois critérios — checkJs, sem
emissão. Faltava a declaração de posse.

```ops
set-header Source: `packages/doctrina-cli/src/index.js`, `packages/doctrina-cli/src/commands/next.js`, `packages/doctrina-cli/src/lib/{commands,args,flag-catalog,exit-codes,json-out,colors,suggest,version,project,prompt,actions}.js`, `tsconfig.json`
bump-version patch
set-header Last updated: 2026-09-11
```

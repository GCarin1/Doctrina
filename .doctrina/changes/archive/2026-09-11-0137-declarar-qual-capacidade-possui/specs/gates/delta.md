# Spec Delta — capability: gates

**Operation:** MODIFIED
**Target spec on apply:** `.doctrina/specs/gates/spec.md`

---

`action.yml` é gerado por `doctrina ci --emit github` a partir da mesma
declaração que `close` e `doctor` leem, e um critério desta spec já o
fixa byte a byte. Faltava a declaração de posse.

```ops
set-header Source: `packages/doctrina-cli/src/commands/{coverage,trace,review,verify,analyze,clarify,close,doctor,ci}.js`, `packages/doctrina-cli/src/lib/{gates,coverage-model,trace-model,analysis,clarity,reproducibility,signoff,runtime,docs-impact}.js`, `scripts/bench.js`, `action.yml`
bump-version patch
set-header Last updated: 2026-09-11
```

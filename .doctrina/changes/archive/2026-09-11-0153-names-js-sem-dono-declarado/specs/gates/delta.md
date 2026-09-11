# Spec Delta — capability: gates

**Operation:** MODIFIED
**Target spec on apply:** `.doctrina/specs/gates/spec.md`

---

O harness de instalação empacotada é aparelho de verificação, ao lado do
benchmark e da action. Passa a ser declarado como tal.

```ops
set-header Source: `packages/doctrina-cli/src/commands/{coverage,trace,review,verify,analyze,clarify,close,doctor,ci}.js`, `packages/doctrina-cli/src/lib/{gates,coverage-model,trace-model,analysis,clarity,reproducibility,signoff,runtime,docs-impact}.js`, `scripts/bench.js`, `scripts/e2e-packed.mjs`, `action.yml`
bump-version patch
```

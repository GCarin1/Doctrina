# Spec Delta — capability: docs

**Operation:** MODIFIED
**Target spec on apply:** `.doctrina/specs/docs/spec.md`

---

Audit items D3, D4, D5, D6. Four documentation claims that no gate could
see: a reference section outliving its command, no upgrade guide at all,
shipped examples that no longer validate, and a README command count that
had drifted.

```ops
bump-version minor
set-header Last updated: 2026-08-06
append-requirement ubiquitous: The system shall reject a CLI reference that documents a command absent from the catalog, as well as a catalog command absent from the reference, so drift is caught in both directions.
append-requirement ubiquitous: The system shall reject a README whose stated command or operation count differs from the catalog.
append-requirement event: When the documentation gate runs, the system shall validate every project under examples/ against the installed CLI.
append-criterion [verified] A reference section naming a command the catalog does not carry fails the docs gate — `scripts/check-docs.js` check 11, exercised by `packages/doctrina-cli/test/check-docs.test.js`.
append-criterion [verified] A README stating the wrong command count fails the docs gate — `scripts/check-docs.js` check 12.
append-criterion [verified] Every project under `examples/` validates against the installed CLI — the "Examples validate" job in `.github/workflows/ci.yml`.
append-criterion [verified] An upgrade guide exists in both languages and states what `upgrade` does and does not touch — `docs/en/upgrading.md`, `docs/pt/upgrading.md`.
```

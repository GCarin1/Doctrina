# Spec Delta — capability: validation

**Operation:** MODIFIED
**Target spec on apply:** `.doctrina/specs/validation/spec.md`

---

<!-- delta body below -->

ADR 0021 declared one document model that owns the on-disk grammar, and three
parsers lived outside it — in two command modules, which `lib/scan.js` then
imported FROM, inverting the layering. This delta states the ownership as a
requirement rather than as an ADR nobody could enforce.

```ops
append-requirement ubiquitous: The system shall keep the grammar for reading an artifact off disk in one document model, and every module that parses an artifact shall read that grammar from there rather than define its own.
append-criterion [verified] The frontmatter and spec-delta parsers live in the document model, no other module defines them, and no library depends on a command module — verified by `packages/doctrina-cli/test/one-collector.test.js`.
bump-version minor
```

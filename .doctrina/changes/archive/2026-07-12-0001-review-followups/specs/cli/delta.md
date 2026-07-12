# Spec Delta — capability: cli

**Operation:** MODIFIED
**Target spec on apply:** `.doctrina/specs/cli/spec.md`

Prose additions (merged by hand below the ops block, since they add new EARS
requirements — the one case that stays authored): the 0.12.0 surface — `intent
add|list`, `upgrade`, `coverage --only/--run` + deferred verdict, `close`
scoped to touched capabilities, clarify language lexicons + `clarify:ok`
suppression, `change apply` ADDED-onto-scaffold replacement, `change new
--design`, `work --title` + word-boundary slug, `spec set --version` + spec
version echo, `Depends on:` header (index/why/context/review), and
`.doctrina/rules.json` enforcement in validate.

```ops
set-header Implementation: implemented
bump-version minor
```

---

<!-- Prose requirements below were merged into the target spec by hand
     (new EARS items cannot be expressed as ops verbs). See the target
     spec's Requirements section, "0.12.0 field-review follow-ups". -->

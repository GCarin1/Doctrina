# Spec Delta — capability: authoring

**Operation:** MODIFIED
**Target spec on apply:** `.doctrina/specs/authoring/spec.md`

---

O `skill sync` fica depreciado em favor do `index rebuild`.

```ops
replace-requirement event 20: When the deprecated `doctrina skill sync` runs, the system shall leave the index `doctrina index rebuild` leaves — every skill on disk registered, each frontmatter `description:` mirrored, a written description never replaced by a scaffold placeholder, skills without a `description:` field reported and skipped — and shall name the rebuild on stderr.
bump-version patch
```

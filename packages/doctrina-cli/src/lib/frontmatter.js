// @ts-check
// Skill frontmatter parsing.
//
// `validate` and `context` both need a skill's `name` / `description` /
// `when` fields, and both used to import this out of `commands/skill.js` — a
// renderer being used as a parser (audit finding F7). It is a pure function
// over text, so it belongs in lib/ where every surface reads it from one
// place.

export function parseFrontmatter(text, key) {
  // Match frontmatter blocks bounded by `---` lines at start of file.
  const fmMatch = text.match(/^---\s*\n([\s\S]*?)\n---\s*\n/);
  if (!fmMatch) return null;
  const block = fmMatch[1];
  const lineRe = new RegExp(`^${key}\\s*:\\s*(.+)$`, "m");
  const m = block.match(lineRe);
  return m ? m[1].trim() : null;
}

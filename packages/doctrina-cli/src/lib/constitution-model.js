// @ts-check
import path from "node:path";
import { readdirSync } from "node:fs";
import { isDir, isFile, read } from "./fs-ops.js";
import { listHeader } from "./scan.js";

// The standing-rules MODEL: the accepted ADRs and the named sections of
// product.md that together are the project's constitution. `constitution`
// renders them in full and `prime` digests them to titles, so the reading
// belongs here rather than in either command (audit finding F7).

// Accepted ADRs (NNNN-slug.md with Status: accepted), oldest first, with the
// title read from the `# ADR NNNN — <title>` heading. Exported for `prime`,
// which digests the same standing rules into the session primer.
export function acceptedDecisions(projectRoot) {
  const dir = path.join(projectRoot, ".doctrina", "decisions");
  const out = [];
  if (!isDir(dir)) return out;
  for (const f of readdirSync(dir).sort()) {
    const m = f.match(/^(\d{4})-.*\.md$/);
    if (!m) continue;
    const text = read(path.join(dir, f));
    if ((listHeader(text, "Status") ?? "").toLowerCase() !== "accepted") continue;
    const titleMatch = text.match(/^#\s+ADR\s+\d{4}\s*[—-]\s*(.+)$/m);
    out.push({ id: m[1], title: titleMatch ? titleMatch[1].trim() : f });
  }
  return out;
}

// Bullets under a named `## <section>` of product.md, each accumulated across
// its continuation lines so a wrapped bullet reads as one rule. Exported for
// `prime`.
export function productSection(projectRoot, name) {
  const p = path.join(projectRoot, ".doctrina", "product.md");
  if (!isFile(p)) return [];
  const lines = read(p).split(/\r?\n/);
  let inSection = false;
  const out = [];
  let cur = null;
  const flush = () => {
    if (cur) out.push(cur.replace(/\s+/g, " ").trim());
    cur = null;
  };
  for (const line of lines) {
    if (/^##\s+/.test(line)) {
      if (inSection) {
        flush();
        break;
      }
      if (new RegExp(`^##\\s+${name}\\b`, "i").test(line)) inSection = true;
      continue;
    }
    if (!inSection) continue;
    const m = line.match(/^\s*[-*]\s+(.+)$/);
    if (m) {
      flush();
      cur = m[1];
    } else if (cur && line.trim() !== "") {
      cur += " " + line.trim();
    } else if (line.trim() === "") {
      flush();
    }
  }
  flush();
  return out;
}

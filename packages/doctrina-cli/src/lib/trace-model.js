// @ts-check
import path from "node:path";
import { readdirSync } from "node:fs";
import { isDir, isFile, read } from "./fs-ops.js";
import { specHeader } from "./scan.js";

// The trace MODEL: product intent anchors, the specs that realize them, and
// the provenance arithmetic over the two. Lifted out of `commands/trace.js`
// so `status`, `review` and the snapshot read it directly instead of
// importing out of a command module (audit finding F7). Nothing here prints.

const ANCHOR_RE = /[A-Z]+\d+/g;

// Pure summary of intent provenance, for other commands (`status`, `review`)
// that need the numbers without the report output.
export function summarize(projectRoot) {
  const anchors = collectAnchors(projectRoot);
  const specs = collectSpecs(projectRoot);
  const anchorIds = new Set(anchors.map((a) => a.id));
  const realizedBy = new Map();
  let dangling = 0;
  for (const s of specs) {
    if (s.realizes === null) continue;
    for (const id of s.realizes) {
      if (anchorIds.has(id)) {
        if (!realizedBy.has(id)) realizedBy.set(id, []);
        realizedBy.get(id).push(s.cap);
      } else {
        dangling += 1;
      }
    }
  }
  const untraceable = specs.filter((s) => s.realizes === null && s.status === "active").length;
  let realized = 0;
  for (const a of anchors) if ((realizedBy.get(a.id) ?? []).length > 0) realized += 1;
  return {
    anchors: anchors.length,
    realized,
    dropped: anchors.length - realized,
    dangling,
    untraceable,
  };
}

// Every "[A-Z]+\d+" tag at the head of a bullet in product.md is an intent
// anchor. Section-agnostic so Success-criteria and In-scope bullets both work.
export function collectAnchors(projectRoot) {
  const productPath = path.join(projectRoot, ".doctrina", "product.md");
  if (!isFile(productPath)) return [];
  const out = [];
  const seen = new Set();
  for (const line of read(productPath).split(/\r?\n/)) {
    const m = line.match(/^\s*[-*]\s+\[([A-Z]+\d+)\]\s+/);
    if (m && !seen.has(m[1])) {
      seen.add(m[1]);
      out.push({ id: m[1] });
    }
  }
  return out;
}

// Anchor ids declared MORE THAN ONCE in product.md (change 0108). The
// collector above keeps the first bullet per id, which is right for the
// graph and wrong as the only reading: the second intent under the same id
// vanished from trace, why, intent list and every pack, with `trace
// --strict` green. Returned as {id, lines} so trace can name both bullets.
export function collectAnchorDuplicates(projectRoot) {
  const productPath = path.join(projectRoot, ".doctrina", "product.md");
  if (!isFile(productPath)) return [];
  const lines = new Map();
  const rows = read(productPath).split(/\r?\n/);
  for (let i = 0; i < rows.length; i++) {
    const m = rows[i].match(/^\s*[-*]\s+\[([A-Z]+\d+)\]\s+/);
    if (!m) continue;
    if (!lines.has(m[1])) lines.set(m[1], []);
    lines.get(m[1]).push(i + 1);
  }
  return [...lines].filter(([, at]) => at.length > 1).map(([id, at]) => ({ id, lines: at }));
}

export function collectSpecs(projectRoot) {
  const specsDir = path.join(projectRoot, ".doctrina", "specs");
  if (!isDir(specsDir)) return [];
  const out = [];
  for (const cap of readdirSync(specsDir).sort()) {
    const specPath = path.join(specsDir, cap, "spec.md");
    if (!isFile(specPath)) continue;
    const text = read(specPath);
    const realizesRaw = specHeader(text, "Realizes");
    const realizes = realizesRaw === null ? null : (realizesRaw.match(ANCHOR_RE) ?? []);
    const status = (specHeader(text, "Status") ?? "active").trim().toLowerCase();
    out.push({ cap, status, realizes });
  }
  return out;
}

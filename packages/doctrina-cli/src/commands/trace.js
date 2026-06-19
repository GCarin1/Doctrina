import path from "node:path";
import process from "node:process";
import { readdirSync } from "node:fs";
import { exists, isDir, isFile, read } from "../lib/fs-ops.js";
import { specHeader } from "../lib/scan.js";
import { flagBool } from "../lib/args.js";
import { c } from "../lib/colors.js";

// Intent-provenance report (ADR 0006). `coverage` proves a criterion has a
// test; `trace` proves a capability traces to a stated intent. Together they
// form the chain product-intent -> capability -> criterion -> test.
//
// Conventions (all opt-in; absent markers are "not yet traced", not errors):
//   - product.md tags an intent anchor at the head of a bullet: "- [SC1] ...".
//     Any "[A-Z]+\d+" tag is an anchor (Success criteria, In scope, ...).
//   - a capability spec declares "**Realizes:** SC1, SC3".
//
// trace reports three provenance breaks: dropped intent (an anchor no spec
// realizes), dangling realizes (a spec cites an unknown id), and untraceable
// spec (an active spec with no Realizes: header). It is read-only; --strict
// turns any break into a non-zero exit for CI.
//
// What it does NOT do (the honest ceiling, per ADR 0006): judge whether a
// criterion faithfully encodes the intent. That semantic check is deferred to
// a future LLM-assisted layer and is never claimed by this deterministic gate.

const ANCHOR_RE = /[A-Z]+\d+/g;

export async function run(_positional, flags) {
  const projectRoot = process.cwd();
  if (!exists(path.join(projectRoot, ".doctrina"))) {
    throw new Error("not a Doctrina project (no .doctrina/ in cwd). Run `doctrina init` first.");
  }
  const strict = flagBool(flags, "strict", false);

  const anchors = collectAnchors(projectRoot); // [{ id }], in document order
  const specs = collectSpecs(projectRoot); // [{ cap, status, realizes: [id] }]

  const anchorIds = new Set(anchors.map((a) => a.id));
  const anyRealizes = specs.some((s) => s.realizes !== null);

  // The feature is unused: do not nag a project that never opted in.
  if (anchors.length === 0 && !anyRealizes) {
    console.log(
      c.gray(
        "no intent-provenance markers found — tag product.md bullets with `[SC1]` " +
          "and add `**Realizes:** SC1` to the specs that deliver them",
      ),
    );
    return 0;
  }

  // anchor id -> [capability]
  const realizedBy = new Map();
  const dangling = []; // { cap, id }
  for (const s of specs) {
    if (s.realizes === null) continue;
    for (const id of s.realizes) {
      if (anchorIds.has(id)) {
        if (!realizedBy.has(id)) realizedBy.set(id, []);
        realizedBy.get(id).push(s.cap);
      } else {
        dangling.push({ cap: s.cap, id });
      }
    }
  }
  // Untraceable: an active capability tied to no stated intent.
  const untraceable = specs
    .filter((s) => s.realizes === null && s.status === "active")
    .map((s) => s.cap);

  console.log(c.bold("Trace") + c.gray(" — product intent → capability provenance:"));
  console.log("");

  let realized = 0;
  for (const a of anchors) {
    const caps = realizedBy.get(a.id);
    if (caps && caps.length > 0) {
      realized += 1;
      console.log(`  ${c.cyan(a.id.padEnd(6))} ${c.green("✓")} realized by: ${caps.sort().join(", ")}`);
    } else {
      console.log(`  ${c.cyan(a.id.padEnd(6))} ${c.red("✗")} dropped — no spec realizes this intent`);
    }
  }

  if (dangling.length > 0 || untraceable.length > 0) console.log("");
  for (const d of dangling) {
    console.log(`  ${c.yellow("!")} dangling: spec "${d.cap}" realizes ${d.id} (no such anchor in product.md)`);
  }
  if (untraceable.length > 0) {
    console.log(`  ${c.yellow("!")} untraceable specs (no Realizes:): ${untraceable.sort().join(", ")}`);
  }

  const dropped = anchors.length - realized;
  console.log("");
  const summary =
    `${realized} of ${anchors.length} intent anchor${anchors.length === 1 ? "" : "s"} realized` +
    `; ${dropped} dropped, ${dangling.length} dangling, ${untraceable.length} untraceable`;
  const clean = dropped === 0 && dangling.length === 0 && untraceable.length === 0;
  if (clean) {
    console.log(c.green("ok") + " " + summary);
    return 0;
  }
  console.log((strict ? c.red("fail") : c.yellow("gap")) + " " + summary);
  // A report by default (exit 0); a gate under --strict (exit 1 for CI).
  return strict ? 1 : 0;
}

// Every "[A-Z]+\d+" tag at the head of a bullet in product.md is an intent
// anchor. Section-agnostic so Success-criteria and In-scope bullets both work.
function collectAnchors(projectRoot) {
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

function collectSpecs(projectRoot) {
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

export const help = `
Usage: doctrina trace [--strict]

Report intent provenance: how product.md intent maps to capability specs
(ADR 0006). Tag product bullets with an anchor — \`- [SC1] ...\` — and add
\`**Realizes:** SC1\` to the specs that deliver them.

trace reports three provenance breaks:
  dropped intent     an anchor that no spec realizes
  dangling realizes  a spec cites an id absent from product.md
  untraceable spec   an active spec with no Realizes: header

Read-only. Exits 0 as a report; with --strict, exits 1 when any break
exists (CI gate). It checks that the link exists and is complete — not
that a criterion is faithful to the intent (that stays a human/LLM call).
`;

// @ts-check
import path from "node:path";
import process from "node:process";
import { readdirSync } from "node:fs";
import { exists, isDir, isFile, read } from "../lib/fs-ops.js";
import { specHeader } from "../lib/scan.js";
import { flagBool } from "../lib/args.js";
import { c } from "../lib/colors.js";
import { emitJson } from "../lib/json-out.js";
import { notADoctrinaProject } from "../lib/exit-codes.js";
import { summarize, collectAnchors, collectSpecs } from "../lib/trace-model.js";

// The provenance arithmetic lives in lib/trace-model.js, which `status`,
// `review` and the project snapshot read too (audit finding F7).
export { summarize } from "../lib/trace-model.js";

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

// Flags this command accepts. Declared HERE, with the command, so
// adding a command never requires editing the entrypoint — the gap that
// let six flags ship undeclared and silently swallow a positional (C3).
// This command builds its own JSON payload; the entrypoint must not
// wrap it in the generic envelope.
export const jsonNative = true;

export const flags = { boolean: ["json", "strict"], string: [] };

export async function run(_positional, flags) {
  const projectRoot = process.cwd();
  if (!exists(path.join(projectRoot, ".doctrina"))) {
    throw notADoctrinaProject();
  }
  const strict = flagBool(flags, "strict", false);
  const json = flagBool(flags, "json", false);

  const anchors = collectAnchors(projectRoot); // [{ id }], in document order
  const specs = collectSpecs(projectRoot); // [{ cap, status, realizes: [id] }]

  const anchorIds = new Set(anchors.map((a) => a.id));
  // A spec OPTED IN when it cites at least one anchor id. The header alone
  // is not opting in: `spec new` scaffolds `**Realizes:** n/a — <reason>`,
  // which parses to an empty id list and used to count as participation.
  // One scaffolded spec was therefore enough to take a project out of the
  // never-opted-in branch and into the normal report, where zero anchors
  // rendered as `ok 0 of 0 intent anchors realized` — a green verdict over
  // nothing, on the very first read a new project gets about itself, while
  // `doctor` read the same collection and warned (change 0083). Absence is
  // not approval — the half change 0057 fixed in `coverage` and not here.
  const anyRealizes = specs.some((s) => s.realizes !== null && s.realizes.length > 0);

  // The feature is unused: do not nag a project that never opted in.
  if (anchors.length === 0 && !anyRealizes) {
    if (json) {
      emitJson("trace", { anchors: [], dangling: [], untraceable: [], summary: summarize(projectRoot) });
      return 0;
    }
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

  if (json) {
    const rows = anchors.map((a) => ({ id: a.id, realizedBy: (realizedBy.get(a.id) ?? []).sort() }));
    const clean = rows.every((r) => r.realizedBy.length > 0) && dangling.length === 0 && untraceable.length === 0;
    emitJson("trace", { anchors: rows, dangling, untraceable, summary: summarize(projectRoot) });
    return clean ? 0 : strict ? 1 : 0;
  }

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
  const summary = anchors.length === 0
    ? `no intent anchors declared in product.md` +
      `; ${dangling.length} dangling, ${untraceable.length} untraceable`
    : `${realized} of ${anchors.length} intent anchor${anchors.length === 1 ? "" : "s"} realized` +
      `; ${dropped} dropped, ${dangling.length} dangling, ${untraceable.length} untraceable`;
  // Reaching the report with no anchors at all is never clean: there is
  // nothing to have realized, and a ratio over zero says nothing true.
  const clean = anchors.length > 0
    && dropped === 0 && dangling.length === 0 && untraceable.length === 0;
  if (clean) {
    console.log(c.green("ok") + " " + summary);
    return 0;
  }
  console.log((strict ? c.red("fail") : c.yellow("gap")) + " " + summary);
  // A report by default (exit 0); a gate under --strict (exit 1 for CI).
  return strict ? 1 : 0;
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
exists (CI gate). --json emits anchors/dangling/untraceable + summary
as JSON. It checks that the link exists and is complete — not that a
criterion is faithful to the intent (that stays a human/LLM call).
`;

import path from "node:path";
import process from "node:process";
import { readdirSync } from "node:fs";
import { exists, isDir, isFile, read } from "../lib/fs-ops.js";
import { specHeader, listHeader } from "../lib/scan.js";
import { parseAcceptanceCriteria, isVerified } from "../lib/criteria.js";
import * as idx from "../lib/index-json.js";
import { c } from "../lib/colors.js";
import { suggest } from "../lib/suggest.js";

// Provenance explainer (review 2026-06-27 passive-user feature #5): answer
// "why does this capability exist / why was it built this way?" by assembling
// the chain the framework already records — product intent (the [SC1] anchors
// it Realizes) → the capability's purpose → the acceptance criteria that prove
// it → the accepted ADRs that decided it — into one read. The human (or agent)
// asks; the tool answers from the artifacts, instead of grepping by hand.
// Read-only. Builds on the Realizes:/trace provenance (ADR 0006/0011).

export async function run(positional, _flags) {
  const cap = positional[0];
  const projectRoot = process.cwd();
  if (!exists(path.join(projectRoot, ".doctrina"))) {
    throw new Error("not a Doctrina project (no .doctrina/ in cwd). Run `doctrina init` first.");
  }
  const specsDir = path.join(projectRoot, ".doctrina", "specs");
  const known = isDir(specsDir) ? readdirSync(specsDir).filter((e) => isFile(path.join(specsDir, e, "spec.md"))) : [];

  if (!cap) {
    console.error(c.red("error:") + " why requires a <capability>");
    if (known.length) console.error(c.gray("known: ") + known.sort().join(", "));
    return 2;
  }
  const specPath = path.join(specsDir, cap, "spec.md");
  if (!isFile(specPath)) {
    console.error(c.red("error:") + ` no spec for capability "${cap}"`);
    const guess = suggest(cap, known);
    if (guess) console.error(c.gray("hint: ") + `did you mean "${guess}"?`);
    else if (known.length) console.error(c.gray("known: ") + known.sort().join(", "));
    return 1;
  }

  const text = read(specPath);
  console.log(c.bold(`Why "${cap}"`) + c.gray(" — provenance chain (intent → capability → proof → decisions)"));
  console.log("");

  // 1. Product intent it realizes.
  const realizesRaw = specHeader(text, "Realizes");
  const anchorIds = realizesRaw ? (realizesRaw.match(/[A-Z]+\d+/g) ?? []) : [];
  console.log(c.bold("  Product intent"));
  if (realizesRaw && /^n\/a\b/i.test(realizesRaw.trim())) {
    console.log(`    ${c.gray("n/a — " + realizesRaw.trim().replace(/^n\/a\s*[—-]?\s*/i, ""))}`);
  } else if (anchorIds.length === 0) {
    console.log(`    ${c.yellow("none declared")} ${c.gray("— add a **Realizes:** header (doctrina trace)")}`);
  } else {
    const anchors = productAnchors(projectRoot);
    for (const id of anchorIds) {
      const line = anchors.get(id);
      console.log(`    ${c.cyan(id)}  ${line ? line : c.yellow("(no matching anchor in product.md)")}`);
    }
  }

  // 2. The capability itself.
  console.log("");
  console.log(c.bold("  Capability"));
  const status = specHeader(text, "Status") ?? "—";
  const impl = specHeader(text, "Implementation") ?? "—";
  console.log(`    ${c.gray("status:")} ${status}   ${c.gray("implementation:")} ${impl}`);
  const purpose = sectionParagraph(text, "Purpose");
  if (purpose) console.log("    " + purpose.replace(/\s+/g, " ").trim());

  // 3. The proof (acceptance criteria with cited evidence). Read through the
  //    shared multi-line parser so the marks here agree with `doctrina
  //    coverage` — a criterion that cites its proof on a continuation line is
  //    no longer mis-reported as "no evidence cited". The mark distinguishes
  //    the three honest states, including the one that used to read as a false
  //    green: a [verified] claim that cites nothing.
  console.log("");
  console.log(c.bold("  Proof"));
  const criteria = parseAcceptanceCriteria(text);
  if (criteria.length === 0) {
    console.log(`    ${c.gray("no acceptance criteria declared")}`);
  } else {
    for (const cr of criteria) {
      const paths = cr.proofPaths.map((p) => `\`${p}\``).join(", ");
      let mark, note;
      if (isVerified(cr) && cr.proofPaths.length > 0) {
        mark = c.green("✓");
        note = c.gray(paths);
      } else if (isVerified(cr)) {
        mark = c.yellow("~");
        note = c.yellow("marked verified but cites no proof");
      } else if (cr.marker !== null) {
        mark = c.yellow("○");
        note = cr.proofPaths.length ? c.gray(paths) : c.gray(`[${cr.marker}]`);
      } else {
        mark = c.gray("·");
        note = cr.proofPaths.length ? c.gray(paths) : c.yellow("no evidence cited");
      }
      console.log(`    ${mark} #${cr.n}  ${note}`);
    }
  }

  // 4. The decisions that shaped it (accepted ADRs naming the capability).
  console.log("");
  console.log(c.bold("  Decisions"));
  const adrs = decisionsMentioning(projectRoot, cap);
  if (adrs.length === 0) {
    console.log(`    ${c.gray("no accepted ADR names this capability")}`);
  } else {
    for (const a of adrs) console.log(`    ${c.cyan("ADR " + a.id)}  ${a.title}`);
  }

  // 5. History — the archived changes that built this capability. The default
  //    context pack excludes changes/archive/ by design, so "what shaped this
  //    spec?" otherwise loses the change trail. The index ledger already
  //    records each archived change's affected capabilities (specs_affected);
  //    surface them here so the provenance chain reaches back to the work that
  //    delivered the spec, not only the intent and decisions in front of it.
  console.log("");
  console.log(c.bold("  History"));
  const history = archivedChangesFor(projectRoot, cap);
  if (history.length === 0) {
    console.log(`    ${c.gray("no archived change recorded against this capability")}`);
  } else {
    for (const ch of history) {
      console.log(`    ${c.cyan(ch.applied ?? "—")}  ${ch.title} ${c.gray(`(${ch.op})`)}`);
    }
  }

  return 0;
}

// Archived changes whose recorded specs_affected include this capability,
// oldest first. Read from the index ledger (the same data `index rebuild`
// derives from each change's spec deltas); absent or unreadable index → none.
function archivedChangesFor(projectRoot, cap) {
  let index;
  try {
    index = idx.load(projectRoot);
  } catch {
    return [];
  }
  const out = [];
  for (const ch of index.artifacts?.changes_archive ?? []) {
    const hit = (ch.specs_affected ?? []).find((s) => s.capability === cap);
    if (hit) out.push({ applied: ch.applied, title: ch.title, op: hit.operation ?? "MODIFIED" });
  }
  return out.sort((a, b) => String(a.applied ?? "").localeCompare(String(b.applied ?? "")));
}

// Map of anchor id -> the product.md bullet text that declares it.
function productAnchors(projectRoot) {
  const out = new Map();
  const p = path.join(projectRoot, ".doctrina", "product.md");
  if (!isFile(p)) return out;
  for (const line of read(p).split(/\r?\n/)) {
    const m = line.match(/^\s*[-*]\s+\[([A-Z]+\d+)\]\s+(.+)$/);
    if (m && !out.has(m[1])) out.set(m[1], m[2].trim());
  }
  return out;
}

// First non-comment paragraph under a "## <name>" heading.
function sectionParagraph(text, name) {
  const lines = text.split(/\r?\n/);
  let inSection = false;
  const buf = [];
  for (const line of lines) {
    if (/^##\s+/.test(line)) {
      if (inSection) break;
      if (new RegExp(`^##\\s+${name}\\b`, "i").test(line)) inSection = true;
      continue;
    }
    if (!inSection) continue;
    if (/^\s*<!--/.test(line) || /-->/.test(line)) continue;
    if (line.trim() === "") {
      if (buf.length) break;
      continue;
    }
    buf.push(line.trim());
  }
  return buf.join(" ");
}

// Accepted ADRs whose body names the capability (word-ish boundary).
function decisionsMentioning(projectRoot, cap) {
  const adrDir = path.join(projectRoot, ".doctrina", "decisions");
  const out = [];
  if (!isDir(adrDir)) return out;
  const re = new RegExp(`\\b${cap.replace(/[-]/g, "[- ]?")}\\b`, "i");
  for (const f of readdirSync(adrDir).sort()) {
    const m = f.match(/^(\d{4})-.*\.md$/);
    if (!m) continue;
    const text = read(path.join(adrDir, f));
    const status = (listHeader(text, "Status") ?? "").toLowerCase();
    if (status !== "accepted") continue;
    if (!re.test(text)) continue;
    const titleMatch = text.match(/^#\s+ADR\s+\d{4}\s*[—-]\s*(.+)$/m);
    out.push({ id: m[1], title: titleMatch ? titleMatch[1].trim() : f });
  }
  return out;
}

export const help = `
Usage: doctrina why <capability>

Explain a capability's provenance by assembling the chain Doctrina already
records into one read: the product intent it **Realizes:** ([SC1] anchors),
the capability's purpose and status, the acceptance criteria that prove it
(with cited evidence), the accepted ADRs that name it, and the archived
changes that built it (from the index ledger). Read-only.

Builds on the intent provenance (ADR 0006/0011) — answer "why was X built,
and built this way?" without grepping the tree by hand.
`;

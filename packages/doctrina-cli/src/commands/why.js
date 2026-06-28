import path from "node:path";
import process from "node:process";
import { readdirSync } from "node:fs";
import { exists, isDir, isFile, read } from "../lib/fs-ops.js";
import { specHeader, listHeader } from "../lib/scan.js";
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

  // 3. The proof (acceptance criteria with cited evidence).
  console.log("");
  console.log(c.bold("  Proof"));
  const criteria = acceptanceWithEvidence(text);
  if (criteria.length === 0) {
    console.log(`    ${c.gray("no acceptance criteria declared")}`);
  } else {
    for (const cr of criteria) {
      const proof = cr.proof.length ? c.gray(cr.proof.map((p) => `\`${p}\``).join(", ")) : c.yellow("no evidence cited");
      console.log(`    ${cr.mark} #${cr.n}  ${proof}`);
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

  return 0;
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

// Numbered acceptance criteria with their [mark] and any backtick proof paths.
function acceptanceWithEvidence(text) {
  const lines = text.split(/\r?\n/);
  let inSection = false;
  const out = [];
  for (const line of lines) {
    if (/^##\s+/.test(line)) {
      inSection = /^##\s+Acceptance criteria\b/i.test(line);
      continue;
    }
    if (!inSection) continue;
    const m = line.match(/^\s*(\d+)\.\s+(.*)$/);
    if (!m) continue;
    const body = m[2];
    const markMatch = body.match(/^\[([^\]]+)\]/);
    const mark = markMatch
      ? (/^verified/i.test(markMatch[1]) ? c.green("✓") : c.yellow("○"))
      : c.gray("·");
    const proof = [...body.matchAll(/`([^`]+)`/g)].map((x) => x[1]).filter((s) => s.includes("/") || /\.[a-z0-9]{1,8}$/i.test(s));
    out.push({ n: m[1], mark, proof });
  }
  return out;
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
(with cited evidence), and the accepted ADRs that name it. Read-only.

Builds on the intent provenance (ADR 0006/0011) — answer "why was X built,
and built this way?" without grepping the tree by hand.
`;

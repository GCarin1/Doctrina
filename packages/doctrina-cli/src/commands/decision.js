import path from "node:path";
import process from "node:process";
import { exists, read, relPath, write } from "../lib/fs-ops.js";
import { walk } from "../lib/fs-ops.js";
import { locateTemplatesDir, substitute } from "../lib/templates.js";
import * as idx from "../lib/index-json.js";
import { today, slugify, padNumber } from "../lib/dates.js";
import { c } from "../lib/colors.js";
import { suggest } from "../lib/suggest.js";

const SUBCOMMANDS = ["new", "supersede", "accept", "land", "list"];

export async function run(positional, _flags) {
  const sub = positional[0];
  switch (sub) {
    case "new":
      return decisionNew(positional.slice(1));
    case "supersede":
      return decisionSupersede(positional.slice(1));
    case "accept":
      return decisionAccept(positional.slice(1));
    case "land":
      return decisionLand(positional.slice(1));
    case "list":
      return decisionList();
    default:
      console.error(c.red("error:") + ` unknown decision subcommand "${sub ?? ""}"`);
      const guess = suggest(sub, SUBCOMMANDS);
      console.error(c.gray("hint: ") + (guess
        ? `did you mean \`doctrina decision ${guess}\`?`
        : `available: ${SUBCOMMANDS.join(", ")}`));
      return 2;
  }
}

function decisionNew(args) {
  const title = args.join(" ").trim();
  if (!title) {
    console.error(c.red("error:") + " decision new requires \"<title>\"");
    return 2;
  }
  const projectRoot = process.cwd();
  ensureDoctrinaProject(projectRoot);

  const next = nextDecisionNumber(projectRoot);
  const date = today();
  const slug = slugify(title);
  const filename = `${next}-${slug}.md`;
  const targetPath = path.join(projectRoot, ".doctrina", "decisions", filename);
  if (exists(targetPath)) {
    console.error(c.red("error:") + ` ${relPath(projectRoot, targetPath)} already exists`);
    return 1;
  }

  const templatesDir = locateTemplatesDir();
  const tpl = read(path.join(templatesDir, "decision.md.template"));
  const body = substitute(tpl, {
    DECISION_NUMBER: next,
    DECISION_TITLE: title,
    DECISION_SLUG: slug,
    DATE: date,
  });
  write(targetPath, body, { force: false });
  console.log(c.green("created") + ` ${relPath(projectRoot, targetPath)}`);

  const index = idx.load(projectRoot);
  idx.addDecision(index, {
    id: next,
    path: `.doctrina/decisions/${filename}`,
    title,
    status: "proposed",
    date,
  });
  idx.touch(index, date);
  idx.save(projectRoot, index);
  console.log(c.green("indexed") + ` decision ${next}`);
  return 0;
}

function decisionSupersede(args) {
  const target = args[0];
  if (!target) {
    console.error(c.red("error:") + " decision supersede requires the target ADR number (e.g. 0003)");
    return 2;
  }
  const projectRoot = process.cwd();
  ensureDoctrinaProject(projectRoot);

  const padded = padNumber(parseInt(target, 10));
  const adrDir = path.join(projectRoot, ".doctrina", "decisions");
  const files = walk(adrDir);
  const oldFile = files.find((f) => path.basename(f).startsWith(`${padded}-`));
  if (!oldFile) {
    console.error(c.red("error:") + ` no ADR found with number ${padded} in ${relPath(projectRoot, adrDir)}`);
    return 1;
  }
  const oldText = read(oldFile);
  const oldStatusMatch = oldText.match(/^-\s+\*\*Status:\*\*\s+(.+)$/m);
  if (!oldStatusMatch) {
    console.error(c.red("error:") + ` ADR at ${relPath(projectRoot, oldFile)} has no Status: header`);
    return 1;
  }
  const oldStatus = oldStatusMatch[1].trim();
  if (oldStatus.toLowerCase().startsWith("superseded")) {
    console.error(c.red("error:") + ` ADR ${padded} is already superseded`);
    return 1;
  }

  // Title for new ADR is read from argv after the target number, or prompted.
  const title = args.slice(1).join(" ").trim();
  if (!title) {
    console.error(c.red("error:") + " supply the new ADR title as the second argument");
    return 2;
  }

  // Create the new ADR using the same path the `new` flow uses.
  const next = nextDecisionNumber(projectRoot);
  const date = today();
  const slug = slugify(title);
  const filename = `${next}-${slug}.md`;
  const newPath = path.join(adrDir, filename);
  const templatesDir = locateTemplatesDir();
  const tpl = read(path.join(templatesDir, "decision.md.template"));
  let body = substitute(tpl, {
    DECISION_NUMBER: next,
    DECISION_TITLE: title,
    DECISION_SLUG: slug,
    DATE: date,
  });
  // Inject Supersedes link
  body = body.replace(/(\*\*Supersedes:\*\*)\s+—/, `$1 ${padded}`);
  write(newPath, body, { force: false });
  console.log(c.green("created") + ` ${relPath(projectRoot, newPath)}`);

  // Mutate ONLY the Status: and Superseded by: headers of the old ADR
  const updated = oldText
    .replace(/^(-\s+\*\*Status:\*\*)\s+.+$/m, `$1 superseded by ${next}`)
    .replace(/^(-\s+\*\*Superseded by:\*\*)\s+.+$/m, `$1 ${next}`);
  write(oldFile, updated, { force: true });
  console.log(c.green("updated") + ` ${relPath(projectRoot, oldFile)} status -> superseded by ${next}`);

  // Update index
  const index = idx.load(projectRoot);
  idx.addDecision(index, {
    id: next,
    path: `.doctrina/decisions/${filename}`,
    title,
    status: "proposed",
    date,
    supersedes: padded,
  });
  idx.updateDecision(index, padded, () => ({
    status: `superseded by ${next}`,
    superseded_by: next,
  }));
  idx.touch(index, date);
  idx.save(projectRoot, index);
  console.log(c.green("indexed") + ` supersession recorded`);
  return 0;
}

function decisionAccept(args) {
  const target = args[0];
  if (!target) {
    console.error(c.red("error:") + " decision accept requires the target ADR number (e.g. 0003)");
    return 2;
  }
  const projectRoot = process.cwd();
  ensureDoctrinaProject(projectRoot);

  const padded = padNumber(parseInt(target, 10));
  const adrDir = path.join(projectRoot, ".doctrina", "decisions");
  const file = walk(adrDir).find((f) => path.basename(f).startsWith(`${padded}-`));
  if (!file) {
    console.error(c.red("error:") + ` no ADR found with number ${padded} in ${relPath(projectRoot, adrDir)}`);
    return 1;
  }
  const text = read(file);
  const statusMatch = text.match(/^-\s+\*\*Status:\*\*\s+(.+)$/m);
  if (!statusMatch) {
    console.error(c.red("error:") + ` ADR at ${relPath(projectRoot, file)} has no Status: header`);
    return 1;
  }
  const status = statusMatch[1].trim().toLowerCase();
  if (status !== "proposed") {
    console.error(c.red("error:") + ` ADR ${padded} is "${statusMatch[1].trim()}", not "proposed" — nothing to accept`);
    return 1;
  }

  // Mutate ONLY the Status: header; the body stays immutable.
  write(file, text.replace(/^(-\s+\*\*Status:\*\*)\s+.+$/m, "$1 accepted"), { force: true });
  console.log(c.green("accepted") + ` ${relPath(projectRoot, file)}`);

  const date = today();
  const index = idx.load(projectRoot);
  idx.updateDecision(index, padded, () => ({ status: "accepted" }));
  idx.touch(index, date);
  idx.save(projectRoot, index);
  console.log(c.green("indexed") + ` decision ${padded} -> accepted`);
  return 0;
}

// Record that an accepted ADR is now implemented and verified, without
// editing the immutable body. Mutates ONLY the **Landed:** header line (the
// same "headers are updatable, the decision prose is not" pattern that accept
// and supersede already use), stamping today's date plus any cited proof
// paths. This closes the gap where a design-time ADR ("Evidence: n/a — no
// implementation yet") had no first-class way to record that reality caught up
// short of a heavyweight supersede. (3.4)
function decisionLand(args) {
  const target = args[0];
  if (!target) {
    console.error(c.red("error:") + " decision land requires the target ADR number (e.g. 0003)");
    return 2;
  }
  const projectRoot = process.cwd();
  ensureDoctrinaProject(projectRoot);

  const padded = padNumber(parseInt(target, 10));
  const adrDir = path.join(projectRoot, ".doctrina", "decisions");
  const file = walk(adrDir).find((f) => path.basename(f).startsWith(`${padded}-`));
  if (!file) {
    console.error(c.red("error:") + ` no ADR found with number ${padded} in ${relPath(projectRoot, adrDir)}`);
    return 1;
  }
  const text = read(file);
  const statusMatch = text.match(/^-\s+\*\*Status:\*\*\s+(.+)$/m);
  if (!statusMatch) {
    console.error(c.red("error:") + ` ADR at ${relPath(projectRoot, file)} has no Status: header`);
    return 1;
  }
  const status = statusMatch[1].trim().toLowerCase();
  if (status !== "accepted") {
    console.error(
      c.red("error:") +
        ` ADR ${padded} is "${statusMatch[1].trim()}", not "accepted" — accept it before recording that it landed`,
    );
    return 1;
  }

  const date = today();
  const proofPaths = args.slice(1).filter(Boolean);
  const cited = proofPaths.map((p) => `\`${p}\``).join(", ");
  const landedValue = cited ? `${date} — ${cited}` : date;

  // Rewrite the existing Landed header, or insert one (after Evidence, else
  // after Status) for ADRs that predate the field. The body stays untouched.
  let updated;
  if (/^-\s+\*\*Landed:\*\*/m.test(text)) {
    updated = text.replace(/^(-\s+\*\*Landed:\*\*)\s+.*$/m, `$1 ${landedValue}`);
  } else if (/^-\s+\*\*Evidence:\*\*.*$/m.test(text)) {
    updated = text.replace(/^(-\s+\*\*Evidence:\*\*.*)$/m, `$1\n- **Landed:** ${landedValue}`);
  } else {
    updated = text.replace(/^(-\s+\*\*Status:\*\*.*)$/m, `$1\n- **Landed:** ${landedValue}`);
  }
  write(file, updated, { force: true });
  console.log(c.green("landed") + ` ${relPath(projectRoot, file)} on ${date}`);

  const index = idx.load(projectRoot);
  // Store the same value the header now carries, so the index matches what
  // `index rebuild` would derive from the file (no perpetual drift).
  idx.updateDecision(index, padded, () => ({ landed: landedValue }));
  idx.touch(index, date);
  idx.save(projectRoot, index);
  console.log(c.green("indexed") + ` decision ${padded} landed`);

  // Parity with `validate`: cited proof that does not resolve is a dangling
  // citation, surfaced now rather than at the next validate.
  for (const p of proofPaths) {
    const candidates = [path.resolve(path.dirname(file), p), path.resolve(projectRoot, p)];
    if (!candidates.some(exists)) {
      console.log(c.yellow("warn:") + ` cited proof \`${p}\` not found on disk`);
    }
  }
  return 0;
}

function decisionList() {
  const projectRoot = process.cwd();
  ensureDoctrinaProject(projectRoot);

  const adrDir = path.join(projectRoot, ".doctrina", "decisions");
  const rows = [];
  for (const f of walk(adrDir)) {
    const m = path.basename(f).match(/^(\d{4})-.*\.md$/);
    if (!m) continue;
    const text = read(f);
    const titleMatch = text.match(/^#\s+ADR\s+\d{4}\s*[—-]\s*(.+)$/m);
    const statusMatch = text.match(/^-\s+\*\*Status:\*\*\s+(.+)$/m);
    const dateMatch = text.match(/^-\s+\*\*Date:\*\*\s+(\S+)/m);
    rows.push({
      id: m[1],
      status: statusMatch ? statusMatch[1].trim() : "?",
      date: dateMatch ? dateMatch[1] : "—",
      title: titleMatch ? titleMatch[1].trim() : path.basename(f),
    });
  }
  if (rows.length === 0) {
    console.log(c.gray("no ADRs found in .doctrina/decisions/"));
    return 0;
  }
  console.log(c.bold("Decisions:"));
  console.log("");
  for (const r of rows) {
    console.log(`  ${c.cyan(r.id)}  ${r.status.padEnd(20)} ${r.date}  ${r.title}`);
  }
  console.log("");
  console.log(c.gray(`${rows.length} ADR${rows.length === 1 ? "" : "s"}`));
  return 0;
}

function nextDecisionNumber(projectRoot) {
  const adrDir = path.join(projectRoot, ".doctrina", "decisions");
  const files = walk(adrDir);
  let max = 0;
  for (const f of files) {
    const m = path.basename(f).match(/^(\d{4})-/);
    if (m) {
      const n = parseInt(m[1], 10);
      if (n > max) max = n;
    }
  }
  return padNumber(max + 1);
}

function ensureDoctrinaProject(projectRoot) {
  if (!exists(path.join(projectRoot, ".doctrina"))) {
    throw new Error("not a Doctrina project (no .doctrina/ in cwd). Run `doctrina init` first.");
  }
}

export const help = `
Usage: doctrina decision <subcommand> [args]

Subcommands:
  new "<title>"                        Create the next sequentially numbered ADR
  accept <number>                      Flip a proposed ADR to accepted (rewrites
                                       only the Status: header) and update the index
  land <number> [path ...]             Stamp an accepted ADR as implemented:
                                       rewrites only the Landed: header with today's
                                       date plus any cited proof paths. The decision
                                       body stays immutable. Satisfies the accepted-
                                       ADR evidence check without a supersede.
  supersede <number> "<new title>"     Create a new ADR that supersedes the target
                                       and rewrite the target's Status: header
  list                                 One line per ADR: number, status, date,
                                       title. Read-only.
`;

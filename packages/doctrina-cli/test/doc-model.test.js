import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync, readdirSync, statSync, mkdtempSync, rmSync, writeFileSync, mkdirSync } from "node:fs";
import { spawnSync } from "node:child_process";
import path from "node:path";
import os from "node:os";
import { fileURLToPath } from "node:url";
import {
  ARTIFACT_KIND, HEADER_STYLE, kindFromPath, canonicalStyle,
  getHeader, setHeader, readAllHeaders, nonConformingHeaders, repairHeaders,
  getSection, getSectionParagraph, hasSection, listSections, getTitle, preamble,
} from "../src/lib/doc-model.js";

// M3. The `.doctrina/` format is Doctrina's public API, and its
// specification had ten homes: the ADR `Status:` grammar as ten regex
// literals across three files (not equivalent — two were anchored so a
// trailing space defeated them), and section extraction reimplemented six
// times under six names. This suite pins the one grammar.

const here = path.dirname(fileURLToPath(import.meta.url));
const repoRoot = path.resolve(here, "..", "..", "..");
const cliEntry = path.resolve(here, "..", "src", "index.js");

test("header reading is lenient: every recognised written form parses", () => {
  const forms = [
    ["**Status:** active", "active", HEADER_STYLE.BARE],
    ["- **Status:** accepted", "accepted", HEADER_STYLE.LIST],
    ["**Status**: active", "active", HEADER_STYLE.BARE],
    ["- **Status**: accepted", "accepted", HEADER_STYLE.LIST],
    ["**Status:**   spaced out   ", "spaced out", HEADER_STYLE.BARE],
    // The trailing-space case that defeated two of the old copies.
    ["- **Status:** accepted   ", "accepted", HEADER_STYLE.LIST],
  ];
  for (const [line, value, style] of forms) {
    const text = `# Title\n\n${line}\n`;
    assert.equal(getHeader(text, "Status"), value, `failed to read: ${JSON.stringify(line)}`);
    assert.equal(readAllHeaders(text)[0].style, style);
  }
});

test("header reading ignores bold prose that is not a metadata header", () => {
  // Every ADR carries `**Positive**` / `**Negative**` / `**Neutral**`
  // blocks, and prose lead-ins like `**Something happened:** ...`. Neither
  // is a header; reading them as one floods every conformance report.
  const text = [
    "# ADR 0001 — A choice", "",
    "- **Status:** accepted", "",
    "## Consequences", "",
    "**Positive**", "",
    "- it works", "",
    "**Standing constraints lived in agent memory:** they now have a home.",
  ].join("\n");
  const names = readAllHeaders(text).map((h) => h.name);
  assert.deepEqual(names, ["Status"], `read non-headers: ${names.join(", ")}`);
  assert.match(preamble(text), /Status/);
  assert.doesNotMatch(preamble(text), /Positive/);
});

test("header writing is strict: one canonical form, style preserved", () => {
  const bare = "# S\n\n**Status**: draft\n";
  assert.match(setHeader(bare, "Status", "active"), /^\*\*Status:\*\* active$/m);

  const list = "# A\n\n- **Status**  :  proposed\n";
  assert.match(setHeader(list, "Status", "accepted"), /^- \*\*Status:\*\* accepted$/m);

  // A set that silently does nothing is the drift this prevents.
  assert.equal(setHeader("# S\n\nno headers\n", "Status", "x"), null);
});

test("a non-canonical header is reported, and repaired in place", () => {
  const text = "# ADR 0001 — X\n\n- **Status**: accepted\n- **Date:** 2026-08-06\n";
  const bad = nonConformingHeaders(text, ARTIFACT_KIND.DECISION);
  assert.equal(bad.length, 1);
  assert.equal(bad[0].name, "Status");

  const { text: fixed, repaired } = repairHeaders(text, ARTIFACT_KIND.DECISION);
  assert.equal(repaired, 1);
  assert.match(fixed, /^- \*\*Status:\*\* accepted$/m);
  assert.equal(nonConformingHeaders(fixed, ARTIFACT_KIND.DECISION).length, 0);
  // Content is untouched.
  assert.match(fixed, /^# ADR 0001 — X$/m);
  assert.equal(getHeader(fixed, "Date"), "2026-08-06");
});

test("the wrong header STYLE for an artifact kind is reported and normalised", () => {
  // Mixing the two forms is a documented, recurring authoring mistake.
  const spec = "# Spec — billing\n\n- **Status:** active\n- **Version:** 0.1.0\n";
  const bad = nonConformingHeaders(spec, ARTIFACT_KIND.SPEC);
  assert.equal(bad.length, 2, "a spec written in list style must be reported");
  assert.ok(bad.every((h) => h.wrongStyle));

  const { text: fixed } = repairHeaders(spec, ARTIFACT_KIND.SPEC);
  assert.match(fixed, /^\*\*Status:\*\* active$/m);
  assert.match(fixed, /^\*\*Version:\*\* 0\.1\.0$/m);
});

test("kindFromPath maps every artifact path to its canonical header style", () => {
  const cases = [
    [".doctrina/specs/billing/spec.md", ARTIFACT_KIND.SPEC, HEADER_STYLE.BARE],
    [".doctrina/contracts/system.md", ARTIFACT_KIND.CONTRACT, HEADER_STYLE.BARE],
    [".doctrina/decisions/0001-x.md", ARTIFACT_KIND.DECISION, HEADER_STYLE.LIST],
    [".doctrina/changes/0001-y/proposal.md", ARTIFACT_KIND.PROPOSAL, HEADER_STYLE.LIST],
    [".doctrina/intake.md", ARTIFACT_KIND.INTAKE, HEADER_STYLE.LIST],
    [".doctrina/product.md", ARTIFACT_KIND.PRODUCT, HEADER_STYLE.BARE],
  ];
  for (const [p, kind, style] of cases) {
    assert.equal(kindFromPath(p), kind, p);
    assert.equal(canonicalStyle(kind), style, p);
    // Windows separators must map identically.
    assert.equal(kindFromPath(p.replace(/\//g, "\\")), kind);
  }
});

test("section extraction replaces the six helpers with one behaviour", () => {
  const text = [
    "# Doc", "",
    "## Why", "",
    "<!-- a comment -->", "",
    "The first paragraph.", "More of it.", "",
    "A second paragraph.", "",
    "### A subsection", "",
    "still inside Why", "",
    "## Verification", "",
    "- [ ] one", "- [x] two", "",
  ].join("\n");

  assert.ok(hasSection(text, "Why"));
  assert.ok(!hasSection(text, "Absent"));
  assert.equal(getSection(text, "Absent"), "");
  assert.deepEqual(listSections(text), ["Why", "Verification"]);
  assert.equal(getTitle(text), "Doc");

  const why = getSection(text, "Why");
  assert.match(why, /The first paragraph\./);
  assert.match(why, /still inside Why/, "a deeper heading must not end the section");
  assert.doesNotMatch(why, /\[ \] one/, "the next section must not bleed in");

  // The paragraph helper skips comments and stops at the blank line.
  assert.equal(getSectionParagraph(text, "Why"), "The first paragraph. More of it.");

  const verification = getSection(text, "Verification");
  assert.equal((verification.match(/^\s*-\s*\[ \]/gm) ?? []).length, 1);
});

// The property test the audit asks for: every real artifact in this repo
// and in the shipped examples round-trips through the model unchanged.
function everyArtifact() {
  const roots = [
    path.join(repoRoot, ".doctrina"),
    ...readdirSync(path.join(repoRoot, "examples"), { withFileTypes: true })
      .filter((e) => e.isDirectory())
      .map((e) => path.join(repoRoot, "examples", e.name, ".doctrina")),
  ];
  const out = [];
  const walk = (dir) => {
    let entries;
    try { entries = readdirSync(dir, { withFileTypes: true }); } catch { return; }
    for (const e of entries) {
      const p = path.join(dir, e.name);
      if (e.isDirectory()) walk(p);
      else if (e.name.endsWith(".md")) out.push(p);
    }
  };
  for (const r of roots) if (safeStat(r)) walk(r);
  return out;
}

function safeStat(p) {
  try { return statSync(p); } catch { return null; }
}

test("every artifact in the repo and the examples round-trips unchanged", () => {
  const files = everyArtifact();
  assert.ok(files.length > 20, `expected a real corpus, found ${files.length} files`);

  const problems = [];
  for (const file of files) {
    const rel = path.relative(repoRoot, file).replace(/\\/g, "/");
    const text = readFileSync(file, "utf8");
    const kind = kindFromPath(rel);

    // Repairing an already-canonical artifact must be a no-op. This is the
    // round-trip property: parse -> serialise -> identical bytes.
    const { text: out, repaired } = repairHeaders(text, kind);
    if (rel.includes("/changes/archive/")) continue; // history, not maintained
    if (out !== text) {
      problems.push(`${rel}: repairHeaders changed ${repaired} line(s) of an artifact in the tree`);
    }

    // Reading a header must not depend on which helper is used.
    for (const h of readAllHeaders(text)) {
      if (getHeader(text, h.name) !== h.value) {
        problems.push(`${rel}: getHeader and readAllHeaders disagree on "${h.name}"`);
      }
    }
  }
  assert.deepEqual(problems, [], problems.join("\n"));
});

test("validate --fix repairs a non-canonical header end to end", () => {
  const tmp = mkdtempSync(path.join(os.tmpdir(), "doctrina-docmodel-"));
  try {
    spawnSync(process.execPath, [cliEntry, "init", "--non-interactive",
      "--project-name", "Acme", "--project-description", "x"], { cwd: tmp, encoding: "utf8" });
    spawnSync(process.execPath, [cliEntry, "spec", "new", "billing"], { cwd: tmp, encoding: "utf8" });

    // Write the spec's headers in the WRONG style for its kind.
    const specPath = path.join(tmp, ".doctrina", "specs", "billing", "spec.md");
    writeFileSync(specPath, readFileSync(specPath, "utf8")
      .replace(/^\*\*Status:\*\*/m, "- **Status**:"));

    const before = spawnSync(process.execPath, [cliEntry, "validate"], { cwd: tmp, encoding: "utf8" });
    assert.match(before.stdout, /header "Status"/, "the non-canonical header must be reported");

    const fix = spawnSync(process.execPath, [cliEntry, "validate", "--fix"], { cwd: tmp, encoding: "utf8" });
    assert.match(fix.stdout, /normalised headers/, "--fix must report the repair");
    // `spec new` scaffolds an honest draft; the repair fixes the FORM, never
    // the value.
    assert.match(readFileSync(specPath, "utf8"), /^\*\*Status:\*\* draft\r?$/m);

    const after = spawnSync(process.execPath, [cliEntry, "validate"], { cwd: tmp, encoding: "utf8" });
    assert.doesNotMatch(after.stdout, /header "Status"/, "the finding must be gone");
  } finally {
    rmSync(tmp, { recursive: true, force: true });
  }
});

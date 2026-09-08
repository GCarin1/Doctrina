import { test } from "node:test";
import assert from "node:assert/strict";
import { mkdtempSync, rmSync, mkdirSync, writeFileSync } from "node:fs";
import path from "node:path";
import os from "node:os";
import { runChecks } from "../../../scripts/check-docs.js";

// The docs gate used to check shape only — a page could document a removed
// command, a renamed flag, or stale output and `doctrina verify` stayed
// green (audit item D1). These tests seed each violation into a fixture
// tree and assert the gate reports it: a gate nobody has watched fail is a
// gate nobody knows works.

// A minimal repo root the shape checks pass on, so each test isolates the
// one accuracy violation it seeds.
function makeDocsFixture(pages = {}) {
  const tmp = mkdtempSync(path.join(os.tmpdir(), "doctrina-docs-"));
  mkdirSync(path.join(tmp, "docs", "en"), { recursive: true });
  mkdirSync(path.join(tmp, "docs", "pt"), { recursive: true });

  const enBody = pages.en ?? "# Page\n\nEnglish body.\n";
  const ptBody = pages.pt ?? "# Página\n\nTradução; o inglês é a fonte.\n";
  writeFileSync(path.join(tmp, "docs", "en", "page.md"), enBody);
  writeFileSync(path.join(tmp, "docs", "pt", "page.md"), ptBody);
  writeFileSync(path.join(tmp, "README.md"), "# R\n\nSee docs/en/page.md\n");
  writeFileSync(path.join(tmp, "README.pt.md"), "# R\n\nVeja docs/pt/page.md\n");
  writeFileSync(path.join(tmp, "AGENTS.md"), "# AGENTS\n");
  if (pages.cliReferenceEn) {
    writeFileSync(path.join(tmp, "docs", "en", "cli-reference.md"), pages.cliReferenceEn);
    writeFileSync(
      path.join(tmp, "docs", "pt", "cli-reference.md"),
      "# Referência\n\nO inglês é a fonte.\n",
    );
  }
  return tmp;
}

const failures = (result, kind) => result.problems.filter((p) => p.startsWith(`${kind}:`));

test("docs gate: a clean fixture reports no problems", async () => {
  const tmp = makeDocsFixture();
  try {
    const r = await runChecks(tmp);
    assert.deepEqual(r.problems, [], r.problems.join("\n"));
  } finally {
    rmSync(tmp, { recursive: true, force: true });
  }
});

test("docs gate: catches a documented command that is not in the catalog", async () => {
  const tmp = makeDocsFixture({
    en: "# Page\n\nRun `doctrina frobnicate` to do the thing.\n",
  });
  try {
    const r = await runChecks(tmp);
    const hits = failures(r, "command");
    assert.equal(hits.length, 1, r.problems.join("\n"));
    assert.match(hits[0], /frobnicate/);
  } finally {
    rmSync(tmp, { recursive: true, force: true });
  }
});

test("docs gate: a real command in prose is not mistaken for a bad reference", async () => {
  const tmp = makeDocsFixture({
    en: "# Page\n\nThe doctrina framework is a thing. Run `doctrina validate --fix`.\n",
  });
  try {
    const r = await runChecks(tmp);
    assert.deepEqual(failures(r, "command"), [], r.problems.join("\n"));
  } finally {
    rmSync(tmp, { recursive: true, force: true });
  }
});

test("docs gate: catches an undeclared flag in a cli-reference flag table", async () => {
  // `validate` declares no --frobnicate. The table row attributes it to
  // `validate` structurally: section heading names the command, row names
  // the flag.
  const tmp = makeDocsFixture({
    cliReferenceEn: [
      "# CLI reference",
      "",
      "## `doctrina validate`",
      "",
      "| Flag | Purpose |",
      "|------|---------|",
      "| `--frobnicate` | Not a real flag. |",
      "",
    ].join("\n"),
  });
  try {
    const r = await runChecks(tmp);
    const hits = failures(r, "flag");
    // Only fires once `validate` exports a flag spec; until then the row is
    // counted as unchecked. Assert whichever state this build is in, so the
    // test is meaningful before AND after C3 lands.
    if (r.unspecced > 0) {
      assert.equal(hits.length, 0);
      assert.ok(r.unspecced >= 1, "an unspecced command must be counted, not silently passed");
    } else {
      assert.equal(hits.length, 1, r.problems.join("\n"));
      assert.match(hits[0], /--frobnicate/);
    }
  } finally {
    rmSync(tmp, { recursive: true, force: true });
  }
});

test("docs gate: catches unmarked CLI output and accepts a marked block", async () => {
  const unmarked = makeDocsFixture({
    en: "# Page\n\n```\n$ doctrina validate\nok 0 errors, 0 warnings\n```\n",
  });
  try {
    const r = await runChecks(unmarked);
    const hits = failures(r, "output-block");
    assert.equal(hits.length, 1, r.problems.join("\n"));
  } finally {
    rmSync(unmarked, { recursive: true, force: true });
  }

  const marked = makeDocsFixture({
    en: "# Page\n\n<!-- illustrative -->\n\n```\n$ doctrina validate\nok 0 errors, 0 warnings\n```\n",
  });
  try {
    const r = await runChecks(marked);
    assert.deepEqual(failures(r, "output-block"), [], r.problems.join("\n"));
  } finally {
    rmSync(marked, { recursive: true, force: true });
  }
});

test("docs gate: an invocation-only block needs no marker", async () => {
  const tmp = makeDocsFixture({
    en: "# Page\n\n```\ndoctrina validate --fix\n```\n",
  });
  try {
    const r = await runChecks(tmp);
    assert.deepEqual(failures(r, "output-block"), [], r.problems.join("\n"));
  } finally {
    rmSync(tmp, { recursive: true, force: true });
  }
});

test("docs gate: catches a broken relative link but allows docsify routes and fenced samples", async () => {
  const broken = makeDocsFixture({
    en: "# Page\n\nSee [the missing page](./nope.md).\n",
  });
  try {
    const r = await runChecks(broken);
    assert.equal(failures(r, "link").length, 1, r.problems.join("\n"));
  } finally {
    rmSync(broken, { recursive: true, force: true });
  }

  const fine = makeDocsFixture({
    en: "# Page\n\nRoute: [flow](/en/flow.md).\n\n```\n- [sample](../specs/x/spec.md)\n```\n",
  });
  try {
    const r = await runChecks(fine);
    assert.deepEqual(failures(r, "link"), [], r.problems.join("\n"));
  } finally {
    rmSync(fine, { recursive: true, force: true });
  }
});

test("docs gate: catches EN/PT content divergence that filename parity cannot see", async () => {
  const tmp = makeDocsFixture({
    en: "# Page\n\n" + "English line.\n".repeat(100),
    pt: "# Página\n\nO inglês é a fonte.\n",
  });
  try {
    const r = await runChecks(tmp);
    const hits = failures(r, "content-parity");
    assert.equal(hits.length, 1, r.problems.join("\n"));
    assert.match(hits[0], /diverged/);
  } finally {
    rmSync(tmp, { recursive: true, force: true });
  }
});

// ------------------------------- change 0059: the surface size has an owner

// The catalog owns how many commands and operations exist; the decisions
// directory owns how many ADRs there are. Every count written into prose is
// a copy, and four of them had drifted in four different directions under a
// check that only looked at two files and one claim form.

test("docs gate: an operation count is checked, not just a command count", async () => {
  const tmp = makeDocsFixture();
  try {
    writeFileSync(path.join(tmp, "README.md"),
      "# R\n\nSee docs/en/page.md — the CLI ships 3 operations.\n");
    const r = await runChecks(tmp);
    const found = failures(r, "count");
    assert.equal(found.length, 1, r.problems.join("\n"));
    assert.match(found[0], /claims 3 operations/, found[0]);
  } finally {
    rmSync(tmp, { recursive: true, force: true });
  }
});

test("docs gate: a count under docs/ is checked, not only the root READMEs", async () => {
  const tmp = makeDocsFixture({ en: "# Page\n\n3 commands, and English body.\n" });
  try {
    const r = await runChecks(tmp);
    const found = failures(r, "count");
    assert.equal(found.length, 1, r.problems.join("\n"));
    assert.match(found[0], /docs[/\\]en[/\\]page\.md claims 3 commands/, found[0]);
  } finally {
    rmSync(tmp, { recursive: true, force: true });
  }
});

test("docs gate: a documented ADR range must reach the highest decision on disk", async () => {
  const tmp = makeDocsFixture();
  try {
    mkdirSync(path.join(tmp, ".doctrina", "decisions"), { recursive: true });
    for (const n of ["0001", "0002", "0003"]) {
      writeFileSync(path.join(tmp, ".doctrina", "decisions", `${n}-x.md`), `# ADR ${n}\n`);
    }
    writeFileSync(path.join(tmp, "README.md"),
      "# R\n\nSee docs/en/page.md — the ADRs 0001–0002 describe the framework.\n");
    const r = await runChecks(tmp);
    const found = failures(r, "count");
    assert.equal(found.length, 1, r.problems.join("\n"));
    assert.match(found[0], /highest decision on disk is 0003/, found[0]);

    // Adding the missing one clears it — the remedy resolves the finding.
    writeFileSync(path.join(tmp, "README.md"),
      "# R\n\nSee docs/en/page.md — the ADRs 0001–0003 describe the framework.\n");
    assert.deepEqual(failures(await runChecks(tmp), "count"), []);
  } finally {
    rmSync(tmp, { recursive: true, force: true });
  }
});

test("docs gate: this repository's own counts agree with its catalog", async () => {
  const repoRoot = path.resolve(path.dirname(new URL(import.meta.url).pathname), "..", "..", "..");
  const r = await runChecks(repoRoot);
  assert.deepEqual(failures(r, "count"), [], failures(r, "count").join("\n"));
});

import { test } from "node:test";
import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import { mkdtempSync, rmSync, writeFileSync, mkdirSync } from "node:fs";
import path from "node:path";
import os from "node:os";
import { fileURLToPath } from "node:url";

// Change 0079 — clarify does not mistake a question for vagueness.
//
// The vague rule matched the quantifier `many` inside the INTERROGATIVE
// "how many". A requirement that says "shall report how many contracts
// declared no rows" names exactly the number the command must print — the
// opposite of vague. Five of this repository's seventeen smells were that
// phrase, and the noise is what hid the one real finding among them: a
// requirement that said "name some of them" without saying how many.
//
// A gate that cries wolf teaches people to ignore it, and the escape hatch
// is not the answer to a structural false positive: annotating five lines
// pays the price of the defect instead of fixing it.

const here = path.dirname(fileURLToPath(import.meta.url));
const cliEntry = path.resolve(here, "..", "src", "index.js");
const repoRoot = path.resolve(here, "..", "..", "..");

function run(cwd, args) {
  return spawnSync(process.execPath, [cliEntry, ...args], {
    cwd, encoding: "utf8", env: { ...process.env, NO_COLOR: "1" },
  });
}

// A project with one document, so the assertions are about that text alone.
function withDoc(body, name = "spec.md") {
  const dir = mkdtempSync(path.join(os.tmpdir(), "doctrina-clarify-"));
  mkdirSync(path.join(dir, ".doctrina"), { recursive: true });
  const file = path.join(dir, name);
  writeFileSync(file, body);
  return { dir, file };
}

const smells = (dir, file) => run(dir, ["clarify", file]).stdout;

test("the interrogative passes; the quantifier still does not", () => {
  const { dir, file } = withDoc([
    "# Doc", "",
    "- The system shall report how many contracts declared no rows.",
    "- The system shall name some of them.",
    "",
  ].join("\n"));
  try {
    const out = smells(dir, file);
    assert.doesNotMatch(out, /line 3:/, "how many is a question, not a smell");
    assert.match(out, /line 4: vague "some"/, "a bare quantifier is still a smell");
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
});

test("the phrase survives a line break — prose wraps", () => {
  // The scanner reads a line at a time, so "report how / many" used to smell
  // on the wrapped line and not on the unwrapped one: the same sentence,
  // two verdicts, decided by where the paragraph happened to fold.
  const { dir, file } = withDoc([
    "# Doc", "",
    "- When `doctrina coverage` runs, the system shall report per spec how",
    "  many criteria cite an evidence path that exists.",
    "",
  ].join("\n"));
  try {
    assert.doesNotMatch(smells(dir, file), /vague "many"/);
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
});

test("the previous line is context, never content", () => {
  // The lookbehind window must not turn a smell on line N into a smell
  // reported twice, nor report line N's word against line N+1.
  const { dir, file } = withDoc([
    "# Doc", "",
    "- The system shall handle some cases.",
    "- The system shall be fine.",
    "",
  ].join("\n"));
  try {
    const out = smells(dir, file);
    assert.match(out, /line 3: vague "some"/);
    assert.doesNotMatch(out, /line 4: vague/);
    assert.equal((out.match(/vague "some"/g) ?? []).length, 1);
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
});

test("a number after the quantifier still exempts it, as before", () => {
  const { dir, file } = withDoc([
    "# Doc", "",
    "- The system shall keep at most many 8 entries.",
    "",
  ].join("\n"));
  try {
    assert.doesNotMatch(smells(dir, file), /vague/);
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
});

test("this repository's own living documents are clean", () => {
  // The point of the change is not a smaller number, it is a number that
  // means something. 17 before, 0 after — and the one real finding among
  // them ("name some of them") was fixed, not silenced.
  const out = run(repoRoot, ["clarify", "--all"]);
  assert.equal(out.status, 0, out.stdout + out.stderr);
  assert.match(out.stdout, /no smells in \d+ living documents/);
});

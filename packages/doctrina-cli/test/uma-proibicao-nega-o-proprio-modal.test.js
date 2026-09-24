// @ts-check
import { test } from "node:test";
import assert from "node:assert/strict";
import { readdirSync, readFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { checkEars } from "../src/lib/ears.js";

// A PROHIBITION NEGATES ITS OWN MODAL.
//
// The must-not rule asked whether "not", "no" or "never" appeared ANYWHERE in
// the requirement. "no" is an ordinary determiner, so a positive obligation
// carrying it passed the grammar check for a section whose entire job is to
// forbid: "the system shall report it as a finding, because a claim over code
// that is not there..." forbids nothing and sat under must-not.
//
// Two of this repository's own requirements were exactly that. The section is
// the one place where the sentence's shape IS the meaning, so the check reads
// the modal.

const here = path.dirname(fileURLToPath(import.meta.url));
const repoRoot = path.resolve(here, "..", "..", "..");

const spec = (requirement) =>
  `## Requirements (EARS)\n\n### Unwanted-behavior (must-not)\n\n- ${requirement}\n`;
const findings = (requirement) => checkEars(spec(requirement)).map((f) => f.message);

test("a negation attached to the modal is a prohibition", () => {
  for (const req of [
    "The system shall not delete the ledger on startup.",
    "The system shall never retry a write it did not confirm.",
    // The object negated instead of the modal — same prohibition.
    "The hook installed by `doctrina hooks install` shall do no work when nothing changed.",
    "A site infrastructure file shall carry neither prose nor examples of its own.",
  ]) {
    assert.deepEqual(findings(req), [], req);
  }
});

test("a sentence that merely contains \"no\" is not a prohibition", () => {
  for (const req of [
    "The system shall report when no contracts are declared.",
    "If a spec declares a pattern that matches no file on disk, the system shall report it as a finding.",
    "The system shall accept an artifact with no title heading.",
  ]) {
    const f = findings(req);
    assert.equal(f.length, 1, `expected one finding for: ${req}`);
    assert.match(f[0], /missing a negation on "shall"/);
    assert.match(f[0], /belongs in another section/,
      "the message must say where such a requirement goes, not only that it is wrong");
  }
});

// The rule has to keep answering for the sentences that pay for it: this
// repository's own must-not sections, every one of which is a real
// prohibition once the two misfiled obligations are reworded.
test("every must-not requirement in this repository forbids something", () => {
  const specsDir = path.join(repoRoot, ".doctrina", "specs");
  const offenders = [];
  let checked = 0;
  for (const cap of readdirSync(specsDir).sort()) {
    const p = path.join(specsDir, cap, "spec.md");
    let text;
    try {
      text = readFileSync(p, "utf8");
    } catch {
      continue;
    }
    for (const f of checkEars(text)) {
      if (!/^Unwanted-behavior:/.test(f.message)) continue;
      offenders.push(`${cap}:${f.line} ${f.message.slice(0, 60)}`);
    }
    checked += 1;
  }
  assert.ok(checked > 5, `expected a real sample of specs; read ${checked}`);
  assert.deepEqual(offenders, [],
    "a positive obligation under must-not is a requirement nobody can fail to meet");
});

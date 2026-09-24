// @ts-check
import { test } from "node:test";
import assert from "node:assert/strict";
import { readdirSync, readFileSync, statSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { sequenceLabels, sequence } from "../src/lib/gates.js";
import { help as closeHelp } from "../src/commands/close.js";

// A SEQUENCE A READER CAN COUNT IS A SEQUENCE A READER WILL TRUST.
//
// The closing sequence was written out by hand in four places. All four had
// gone stale, each to a different list: `close --help` named ten steps of
// thirteen, the flow page eleven, and the two adapter command files four —
// "verify → coverage → archive → validate", which is not even the order the
// close runs them in. `review`, `implementation`, `docs` and the index-drift
// check were added over three changes and no copy moved.
//
// Change 0145 fixed the playbooks by pointing at the declaration instead of
// restating it. This holds the rest: the help RENDERS the declaration, and
// any prose that still spells the chain out has to spell out the real one.

const here = path.dirname(fileURLToPath(import.meta.url));
const repoRoot = path.resolve(here, "..", "..", "..");

test("the close help renders the declared sequence rather than restating it", () => {
  for (const label of sequenceLabels("close")) {
    assert.ok(closeHelp.includes(label),
      `\`close --help\` must name the declared step "${label}"`);
  }
  // Not merely present — in order, which is the half a substring check misses.
  const positions = sequenceLabels("close").map((l) => closeHelp.indexOf(l));
  assert.deepEqual(positions, [...positions].sort((a, b) => a - b),
    "the help must print the steps in the order the close runs them");
});

// Every step id a documented chain can name, mapped to the declaration. The
// names a reader writes ("change apply", "index-drift") are the ones a reader
// reads back, so the map is generous about spelling and strict about the set.
const ALIASES = new Map([
  ["analyze", "analyze"],
  ["adr checkpoint", "adr-checkpoint"],
  ["checkpoint de adr", "adr-checkpoint"],
  ["review", "review"],
  ["apply", "apply"], ["change apply", "apply"],
  ["runtime", "runtime"],
  ["implementation", "implementation"],
  ["verify", "verify"],
  ["coverage", "coverage"],
  ["trace", "trace"],
  ["docs", "docs"],
  ["archive", "archive"], ["change archive", "archive"],
  ["index drift", "index-drift"], ["index-drift", "index-drift"],
  ["validate", "validate"],
]);

// One arrow-separated segment to a step id. A segment carries prose on either
// side of the name — "Drives analyze", "validate, then skill suggest" — so the
// alias that appears EARLIEST in the segment wins, longest spelling first at
// the same position.
const ALIAS_KEYS = [...ALIASES.keys()].sort((a, b) => b.length - a.length);

function idOf(segment) {
  const s = segment
    .replace(/\*\*/g, "").replace(/\(advisory\)|\(forceable\)/g, "")
    .replace(/`/g, "").replace(/--\w[\w-]*/g, "")
    .trim().toLowerCase();
  let best = null;
  for (const key of ALIAS_KEYS) {
    const at = s.search(new RegExp(`(^|[^a-z-])${key.replace(/[-]/g, "[- ]")}([^a-z-]|$)`));
    if (at < 0) continue;
    if (best === null || at < best.at) best = { at, id: ALIASES.get(key) };
  }
  return best?.id ?? null;
}

// A chain is a run of arrow-separated names. Markdown emphasis, the
// "(advisory)" markers and a mermaid line break are decoration around them.
//
// Not every arrow chain is a claim about the CLOSE: the work playbook's own
// steps read the same way and are a different, accurate list. A chain counts
// here when it names the ADR checkpoint — a step only the close has — or when
// the sentence introducing it says `doctrina close`.
function chainsIn(text) {
  const out = [];
  // Per PARAGRAPH. Flattening the whole document lets a chain in one section
  // run into the prose of the next, and the trailing segment then swallows the
  // rest of the file — which is how an earlier draft of this test "found"
  // steps three sections away and missed the one in front of it.
  for (const block of text.split(/\r?\n\s*\r?\n/)) {
    const flat = block.replace(/<br\/?>/g, " ").replace(/\r?\n\s*/g, " ");
    for (const m of flat.matchAll(/[A-Za-z][^→\n]*(?:→[^→\n]+){2,}/g)) {
      const ids = m[0].split("→").map(idOf);
      if (ids.filter(Boolean).length < 3) continue; // some other diagram
      const lead = flat.slice(Math.max(0, (m.index ?? 0) - 200), m.index ?? 0);
      // `doctrina close` can sit just before the chain or inside its first
      // segment ("Close it: `doctrina close <id>` (verify → …"), so both count.
      const aboutClose = ids.includes("adr-checkpoint") || /doctrina close/.test(lead + m[0]);
      if (aboutClose) out.push({ text: m[0], ids });
    }
  }
  return out;
}

function markdownUnder(dir) {
  const out = [];
  for (const entry of readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) out.push(...markdownUnder(full));
    else if (/\.md(\.template)?$/.test(entry.name)) out.push(full);
  }
  return out;
}

const GOVERNED = ["docs/en", "docs/pt", ".doctrina/templates", ".claude", ".cursor"]
  .map((d) => path.join(repoRoot, d))
  .filter((d) => { try { return statSync(d).isDirectory(); } catch { return false; } });

test("every documented close chain names the whole declared sequence", () => {
  const declared = sequence("close").map((s) => s.id);
  const wrong = [];
  for (const dir of GOVERNED) {
    for (const file of markdownUnder(dir)) {
      for (const chain of chainsIn(readFileSync(file, "utf8"))) {
        const named = chain.ids.filter(Boolean);
        const missing = declared.filter((id) => !named.includes(id));
        if (missing.length > 0) {
          wrong.push(`${path.relative(repoRoot, file)}: missing ${missing.join(", ")}`);
        }
      }
    }
  }
  assert.deepEqual(wrong, [],
    "a chain that names the close must name all of it — an abridged copy is "
    + "how four surfaces came to describe four different sequences");
});

// The guard only guards if it can fail: an abridged chain must be caught.
test("an abridged chain is detected, and an unrelated one is left alone", () => {
  const stale = chainsIn("Close it: `doctrina close <id>` (verify → coverage → archive → validate)");
  assert.equal(stale.length, 1, "a chain introduced by `doctrina close` is a claim about the close");
  const named = stale[0].ids.filter(Boolean);
  assert.ok(sequence("close").map((s) => s.id).some((id) => !named.includes(id)),
    "the stale four-step chain must read as incomplete");

  // The work playbook's own steps are a different, accurate list.
  assert.deepEqual(
    chainsIn("prints the ordered steps: context → spec delta → tasks → implement → analyze → apply"),
    [], "a playbook narrative is not a claim about the closing sequence");
});

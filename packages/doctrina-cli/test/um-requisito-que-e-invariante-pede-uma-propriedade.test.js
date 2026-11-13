// @ts-check
import { test } from "node:test";
import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import { mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import path from "node:path";
import os from "node:os";
import { fileURLToPath } from "node:url";
import { propertyLibraryIn, propertyShape, requirementsOf } from "../src/lib/properties.js";

// A REQUIREMENT THAT IS AN INVARIANT ASKS FOR A PROPERTY (change 0254).
//
// "The system shall never return a code already in use" claims something of
// every input; the criterion for it cited an example test — three inputs
// somebody thought of — and coverage called it proven. Kiro generates
// property-based tests from EARS requirements with a model. The CLI does
// the two deterministic halves: it names the requirements that read as
// invariants, and it counts a criterion marked [property] only when the
// test it cites generates its inputs.

const here = path.dirname(fileURLToPath(import.meta.url));
const cliEntry = path.resolve(here, "..", "src", "index.js");

test("a property-based test is told from an example test, per library", () => {
  assert.equal(propertyLibraryIn("from hypothesis import given, strategies as st\n\n@given(st.text())\ndef test_roundtrip(s): ..."), "Hypothesis");
  assert.equal(propertyLibraryIn("import fc from 'fast-check';\ntest('x', () => fc.assert(fc.property(fc.string(), (s) => true)));"), "fast-check");
  assert.equal(propertyLibraryIn("@Property\nvoid codesAreUnique(@ForAll String url) {}"), "jqwik");
  assert.equal(propertyLibraryIn("proptest! {\n  #[test]\n  fn roundtrip(s in \".*\") {}\n}"), "proptest");
  assert.equal(propertyLibraryIn("def test_three_cases():\n    assert shorten('a') != shorten('b')"), null, "three examples generate nothing");
  assert.equal(propertyLibraryIn("test('given a url, it shortens', () => {})"), null, "the word alone is not the decorator");
});

test("the words of a requirement say which property it suggests, in English and Portuguese", () => {
  const shape = (/** @type {string} */ text) => propertyShape(text)?.id ?? null;
  assert.equal(shape("When a code is decoded, the system shall give back the URL that was encoded."), "round-trip");
  assert.equal(shape("When the same request arrives twice, the system shall answer as it did the first time."), "idempotence");
  assert.equal(shape("The system shall return at most 100 items."), "bound");
  assert.equal(shape("The system shall issue a unique code per link."), "uniqueness");
  assert.equal(shape("The system shall list links sorted by creation date."), "order");
  assert.equal(shape("The system shall never expose a deleted link."), "invariant");
  assert.equal(shape("The system shall never issue a code that is already in use."), "uniqueness", "the specific shape wins over the bare never");
  assert.equal(shape("O sistema nunca deve emitir um código já em uso."), "uniqueness");
  assert.equal(shape("O sistema deve devolver no máximo 100 itens."), "bound");
  assert.equal(shape("Quando o mesmo pedido chega duas vezes, o sistema deve responder igual."), "idempotence");
  assert.equal(shape("When a user signs in, the system shall answer 200."), null, "one event, one answer: an example is the proof");
  assert.equal(shape("The system shall read the `--always` flag."), null, "a word inside a code span is a name, not a claim");

  const reqs = requirementsOf("# Spec\n\n## Requirements (EARS)\n\n### Ubiquitous\n\n- The system shall never\n  repeat a code.\n\n### Event-driven\n\n-\n- When posted, answer.\n\n## Acceptance criteria\n\n1. x\n");
  assert.deepEqual(reqs.map((r) => `${r.section} ${r.n}: ${r.text}`), ["ubiquitous 1: The system shall never repeat a code.", "event 1: When posted, answer."],
    "a wrapped bullet is one requirement, and a placeholder bullet is none");
});

function project() {
  const dir = mkdtempSync(path.join(os.tmpdir(), "doctrina-property-"));
  const run = (/** @type {string[]} */ args) => {
    const r = spawnSync(process.execPath, [cliEntry, ...args], { cwd: dir, encoding: "utf8", env: { ...process.env, NO_COLOR: "1" } });
    return { status: r.status, out: r.stdout + r.stderr };
  };
  run(["init", "--non-interactive", "--project-name", "links"]);
  run(["spec", "new", "codes"]);
  writeFileSync(path.join(dir, "pyproject.toml"), "[project]\nname = \"links\"\n[project.optional-dependencies]\ndev = [\"pytest\", \"hypothesis\"]\n");
  mkdirSync(path.join(dir, "tests"));
  writeFileSync(path.join(dir, "tests", "test_codes.py"), "def test_two_urls():\n    assert shorten('a') != shorten('b')\n");
  writeFileSync(path.join(dir, "tests", "test_codes_property.py"),
    "from hypothesis import given, strategies as st\n\n@given(st.lists(st.text(), unique=True))\ndef test_no_two_codes_collide(urls):\n    assert len({shorten(u) for u in urls}) == len(urls)\n");
  const spec = path.join(dir, ".doctrina", "specs", "codes", "spec.md");
  const setCriteria = (/** @type {string[]} */ ...criteria) => {
    const text = readFileSync(spec, "utf8");
    const at = text.indexOf("## Acceptance criteria");
    const after = text.indexOf("\n## ", at + 5);
    writeFileSync(spec, `${text.slice(0, at)}## Acceptance criteria\n\n${criteria.map((c, i) => `${i + 1}. ${c}`).join("\n")}\n${after < 0 ? "" : text.slice(after)}`);
    run(["index", "rebuild"]);
  };
  return { dir, run, spec, setCriteria, done: () => rmSync(dir, { recursive: true, force: true }) };
}

test("a [property] criterion is proven by a test that generates its inputs, and by nothing less", () => {
  const p = project();
  try {
    p.setCriteria("[property] No two codes collide, whatever the URLs — verified by `tests/test_codes.py`.");
    const example = p.run(["coverage", "--strict"]);
    assert.equal(example.status, 1, example.out);
    assert.match(example.out, /#1 {2}property claim is proven by no property: `tests\/test_codes\.py` generates no input/);
    assert.match(example.out, /1 unguarded/);
    assert.doesNotMatch(p.run(["validate"]).out, /criterion mark must be one of/, "[property] is a mark the grammar knows");

    p.setCriteria("[property] No two codes collide, whatever the URLs — verified by `tests/test_codes_property.py`.");
    const proven = p.run(["coverage", "--strict"]);
    assert.equal(proven.status, 0, proven.out);
    assert.match(proven.out, /1 of 1 acceptance criteria .* \(100%\)/);

    // The same example test is honest proof of an example claim.
    p.setCriteria("[verified] Two different URLs get two different codes — verified by `tests/test_codes.py`.");
    assert.equal(p.run(["coverage", "--strict"]).status, 0);
    p.setCriteria("[proven] x — verified by `tests/test_codes.py`.");
    assert.match(p.run(["validate"]).out, /a criterion mark must be one of verified\|unverified\|orchestration\|property/);
  } finally {
    p.done();
  }
});

test("coverage --properties names the requirements that read as invariants, and change delta --property claims one", () => {
  const p = project();
  try {
    p.setCriteria("[verified] It exists — verified by `pyproject.toml`.");
    p.run(["work", "Codes are unique", "--title", "unique", "--capability", "codes", "--quiet"]);
    const written = p.run(["change", "delta", "0001-unique", "codes",
      "--requirement", "ubiquitous: The system shall never issue a code that is already in use.",
      "--requirement", "ubiquitous: The system shall return at most 100 links per page.",
      "--requirement", "event: When a link is posted, the system shall answer 201."]);
    // Told when the requirement is written, while its test does not exist yet.
    assert.match(written.out, /note: "ubiquitous: The system shall never issue a code that is already in us…" reads as uniqueness — /, "a long requirement is cut, never wrapped");
    assert.match(written.out, /note: "ubiquitous: The system shall return at most 100 links per page\." reads as bound — /);
    assert.equal(written.out.match(/note: /g)?.length, 2, "the event with one answer draws no note");
    assert.equal(written.out.match(/--property "<what holds/g)?.length, 1, "the command is named once");
    const tasks = path.join(p.dir, ".doctrina", "changes", "0001-unique", "tasks.md");
    writeFileSync(tasks, readFileSync(tasks, "utf8").replace(/(- \[ \]\r?\n){3}/, "- [ ] Do it.\n"));
    const proposal = path.join(p.dir, ".doctrina", "changes", "0001-unique", "proposal.md");
    writeFileSync(proposal, readFileSync(proposal, "utf8").replace(/## What\r?\n\r?\n<!--[\s\S]*?-->\r?\n/, "## What\n\nCodes.\n"));
    p.run(["change", "apply", "0001-unique"]);

    const list = p.run(["coverage", "--properties"]);
    assert.equal(list.status, 0, "a readout, never a gate");
    assert.match(list.out, /codes {2}2 requirements read as invariants, 0 criteria are properties/);
    assert.match(list.out, /ubiquitous 2 +The system shall return at most 100 links per page\.\n\s+bound: for any input, the result stays inside the stated bound/);
    assert.match(list.out, /ubiquitous 1 +The system shall never issue a code[\s\S]*uniqueness: /, "the specific shape, not the bare \"never\"");
    assert.doesNotMatch(list.out, /answer 201/, "one event with one answer is not a candidate");
    assert.ok(list.out.indexOf("at most 100") < list.out.indexOf("never issue"), "the more specific shape is listed first");
    assert.match(list.out, /generates its inputs with Hypothesis, then claim it/, "the library the project already declares");

    const claimed = p.run(["change", "delta", "0001-unique", "codes", "--property", "No two codes collide, whatever the URLs — verified by `tests/test_codes_property.py`."]);
    assert.equal(claimed.status, 0, claimed.out);
    assert.doesNotMatch(claimed.out, /note: /);
    assert.match(readFileSync(path.join(p.dir, ".doctrina", "changes", "0001-unique", "specs", "codes", "delta.md"), "utf8"),
      /append-criterion \[property\] No two codes collide/);
    p.run(["change", "apply", "0001-unique"]);
    assert.match(p.run(["coverage", "--properties"]).out, /2 requirements read as invariants, 1 criterion is a property/);
    assert.equal(JSON.parse(p.run(["coverage", "--properties", "--json"]).out.trim()).library.name, "Hypothesis");
  } finally {
    p.done();
  }
});

import { test } from "node:test";
import assert from "node:assert/strict";
import { writeFileSync, mkdtempSync, mkdirSync, rmSync } from "node:fs";
import path from "node:path";
import os from "node:os";
import {
  parseRuntimeDeclaration, readWorkflowEnv, referencedVar, globToRegExp,
  checkWiring, checkEmptySemantics, checkEnums, checkSelectors,
  parseBudgets, collectRuntimeFindings, checkLocalEnv,
} from "../src/lib/runtime.js";

// The runtime surface (change 0029). Every check here answers one line of
// the field evaluation: "I configured the secret in GitHub and the process
// never saw it", "the default never applied because the value was empty,
// not absent", "the contract declares an enum nothing validates", "the job
// was green and ran zero cases".
//
// The discipline these tests pin: each fixture FAILS before the fix and
// PASSES after, and no check ever needs to know what GitHub Actions or
// Behave are — only what the contract declared.

function fixture() {
  const dir = mkdtempSync(path.join(os.tmpdir(), "doctrina-runtime-"));
  mkdirSync(path.join(dir, ".doctrina", "contracts"), { recursive: true });
  mkdirSync(path.join(dir, ".github", "workflows"), { recursive: true });
  return dir;
}

function writeContract(dir, body, name = "system") {
  writeFileSync(path.join(dir, ".doctrina", "contracts", `${name}.md`), body);
}

function codes(findings) {
  return findings.map((f) => f.code);
}

const WIRED_WORKFLOW = `name: e2e
on: [push]
jobs:
  test:
    runs-on: ubuntu-latest
    env:
      AXE_SEVERITY: \${{ vars.AXE_SEVERITY }}
    steps:
      - uses: actions/checkout@v4
      - name: run
        run: behave
`;

const UNWIRED_WORKFLOW = `name: e2e
on: [push]
jobs:
  test:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - name: run
        run: behave
`;

const WIRING_CONTRACT = `# Contract — system

**Status:** active

## Wiring

| Variable     | Origin | Workflow                       | Job/Step | Consumer  |
|--------------|--------|--------------------------------|----------|-----------|
| AXE_SEVERITY | vars   | .github/workflows/e2e.yml      | test     | config.py |
`;

// ------------------------------------------------------- declaration model

test("every runtime section is optional: a pre-0029 contract declares nothing", () => {
  const legacy = `# Contract — system\n\n## Ports\n\n| Service | Port |\n|---|---|\n| api | 80 |\n`;
  const decl = parseRuntimeDeclaration(legacy);
  assert.deepEqual(decl.wiring, []);
  assert.deepEqual(decl.selectors, []);
  assert.deepEqual(decl.budgets, []);
});

test("template placeholder rows are scaffolding, not declarations", () => {
  const scaffold = `## Wiring\n\n| Variable | Origin | Workflow | Job/Step | Consumer |\n|---|---|---|---|---|\n| <VARIABLE> | vars | <path> | <job> | <file> |\n`;
  assert.deepEqual(parseRuntimeDeclaration(scaffold).wiring, []);
});

test("a wiring row parses into its declared fields", () => {
  const decl = parseRuntimeDeclaration(WIRING_CONTRACT);
  assert.equal(decl.wiring.length, 1);
  assert.deepEqual(decl.wiring[0], {
    name: "AXE_SEVERITY",
    origin: "vars",
    workflow: ".github/workflows/e2e.yml",
    job: "test",
    consumer: "config.py",
  });
});

// ------------------------------------------------------- the workflow read

test("readWorkflowEnv finds env: keys and attributes them to their job", () => {
  const wf = readWorkflowEnv(WIRED_WORKFLOW);
  assert.equal(wf.readable, true);
  assert.equal(wf.entries.length, 1);
  assert.equal(wf.entries[0].key, "AXE_SEVERITY");
  assert.equal(wf.entries[0].job, "test");
});

test("a workflow with no env: block yields no entries but is still readable", () => {
  const wf = readWorkflowEnv(UNWIRED_WORKFLOW);
  assert.equal(wf.readable, true);
  assert.deepEqual(wf.entries, []);
});

test("an unreadable file is reported as unreadable, never as absent", () => {
  assert.equal(readWorkflowEnv("this is not a workflow at all\n").readable, false);
});

test("referencedVar reads the origin and name out of a CI expression", () => {
  assert.deepEqual(referencedVar("${{ vars.FOO }}"), { origin: "vars", name: "FOO" });
  assert.deepEqual(referencedVar("${{ secrets.TOKEN }}"), { origin: "secrets", name: "TOKEN" });
  assert.equal(referencedVar("a literal value"), null);
});

// --------------------------------------------------- RT01: the flag is wired

test("RT01: a declared flag absent from every env: block is an error", () => {
  const dir = fixture();
  try {
    writeFileSync(path.join(dir, ".github", "workflows", "e2e.yml"), UNWIRED_WORKFLOW);
    const findings = checkWiring(dir, parseRuntimeDeclaration(WIRING_CONTRACT));
    assert.deepEqual(codes(findings), ["RT01"]);
    assert.equal(findings[0].level, "error");
    assert.match(findings[0].message, /never reaches the process/);
    // The remedy is the literal line to paste, not a description of one.
    assert.match(findings[0].remedy, /AXE_SEVERITY: \$\{\{ vars\.AXE_SEVERITY \}\}/);
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
});

test("RT01: the same declaration passes once the env: line exists", () => {
  const dir = fixture();
  try {
    writeFileSync(path.join(dir, ".github", "workflows", "e2e.yml"), WIRED_WORKFLOW);
    assert.deepEqual(checkWiring(dir, parseRuntimeDeclaration(WIRING_CONTRACT)), []);
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
});

test("RT01: a workflow path that does not exist is an error against the contract", () => {
  const dir = fixture();
  try {
    const findings = checkWiring(dir, parseRuntimeDeclaration(WIRING_CONTRACT));
    assert.deepEqual(codes(findings), ["RT01"]);
    assert.match(findings[0].message, /does not exist/);
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
});

test("RT02: declaring vars while the workflow reads secrets is an error", () => {
  const dir = fixture();
  try {
    writeFileSync(
      path.join(dir, ".github", "workflows", "e2e.yml"),
      WIRED_WORKFLOW.replace("vars.AXE_SEVERITY", "secrets.AXE_SEVERITY"),
    );
    const findings = checkWiring(dir, parseRuntimeDeclaration(WIRING_CONTRACT));
    assert.deepEqual(codes(findings), ["RT02"]);
    assert.equal(findings[0].level, "error");
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
});

test("RT02: an export whose source name differs warns about the silent rename", () => {
  const dir = fixture();
  try {
    writeFileSync(
      path.join(dir, ".github", "workflows", "e2e.yml"),
      WIRED_WORKFLOW.replace("vars.AXE_SEVERITY", "vars.AXE_LEVEL"),
    );
    const findings = checkWiring(dir, parseRuntimeDeclaration(WIRING_CONTRACT));
    assert.deepEqual(codes(findings), ["RT02"]);
    assert.equal(findings[0].level, "warn");
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
});

test("a literal env: value is legitimate wiring, not a finding", () => {
  const dir = fixture();
  try {
    writeFileSync(
      path.join(dir, ".github", "workflows", "e2e.yml"),
      WIRED_WORKFLOW.replace("${{ vars.AXE_SEVERITY }}", "critical"),
    );
    assert.deepEqual(checkWiring(dir, parseRuntimeDeclaration(WIRING_CONTRACT)), []);
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
});

// ------------------------------------------ RT03: empty is not unset

test("RT03: a getenv default that an empty value never triggers is an error", () => {
  const dir = fixture();
  try {
    writeFileSync(path.join(dir, ".github", "workflows", "e2e.yml"), WIRED_WORKFLOW);
    writeFileSync(path.join(dir, "config.py"), 'SEVERITY = os.getenv("AXE_SEVERITY", "critical")\n');
    const findings = checkEmptySemantics(dir, parseRuntimeDeclaration(WIRING_CONTRACT));
    assert.deepEqual(codes(findings), ["RT03"]);
    assert.match(findings[0].message, /documented default silently does not apply/);
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
});

test("RT03: reading the raw value and testing for blank passes", () => {
  const dir = fixture();
  try {
    writeFileSync(path.join(dir, ".github", "workflows", "e2e.yml"), WIRED_WORKFLOW);
    writeFileSync(
      path.join(dir, "config.py"),
      'raw = os.getenv("AXE_SEVERITY")\nSEVERITY = raw if raw else "critical"\n',
    );
    assert.deepEqual(checkEmptySemantics(dir, parseRuntimeDeclaration(WIRING_CONTRACT)), []);
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
});

test("RT03: `??` is the JavaScript shape of the same bug; `||` is not", () => {
  const dir = fixture();
  const contract = WIRING_CONTRACT.replace("config.py", "config.js");
  try {
    writeFileSync(path.join(dir, ".github", "workflows", "e2e.yml"), WIRED_WORKFLOW);

    writeFileSync(path.join(dir, "config.js"), 'const s = process.env.AXE_SEVERITY ?? "critical";\n');
    assert.deepEqual(codes(checkEmptySemantics(dir, parseRuntimeDeclaration(contract))), ["RT03"]);

    // `||` treats "" as falsy, so the default DOES apply — not a finding.
    writeFileSync(path.join(dir, "config.js"), 'const s = process.env.AXE_SEVERITY || "critical";\n');
    assert.deepEqual(checkEmptySemantics(dir, parseRuntimeDeclaration(contract)), []);
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
});

// ------------------------------------------------------ RT04: declared enums

const ENUM_CONTRACT = `# Contract — system

## Environment

| Variable     | Required | Values                  | Example  |
|--------------|----------|-------------------------|----------|
| AXE_SEVERITY | no       | none\\|critical\\|serious | critical |

## Wiring

| Variable     | Origin | Workflow                  | Job/Step | Consumer  |
|--------------|--------|---------------------------|----------|-----------|
| AXE_SEVERITY | vars   | .github/workflows/e2e.yml | test     | config.py |
`;

test("RT04: an .env.example value outside the declared enum is an error", () => {
  const dir = fixture();
  try {
    writeFileSync(path.join(dir, ".env.example"), "AXE_SEVERITY=true\n");
    const findings = checkEnums(dir, parseRuntimeDeclaration(ENUM_CONTRACT));
    assert.ok(codes(findings).includes("RT04"));
    // The offending value is named here — .env.example is committed, not secret.
    assert.match(findings[0].message, /none\|critical\|serious/);
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
});

test("RT04: a member value passes", () => {
  const dir = fixture();
  try {
    writeFileSync(path.join(dir, ".env.example"), "AXE_SEVERITY=critical\n");
    assert.deepEqual(checkEnums(dir, parseRuntimeDeclaration(ENUM_CONTRACT)), []);
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
});

test("RT04: an enum the consumer never mentions warns that nothing validates it", () => {
  const dir = fixture();
  try {
    writeFileSync(path.join(dir, ".env.example"), "AXE_SEVERITY=critical\n");
    writeFileSync(path.join(dir, "config.py"), 'SEVERITY = read("AXE_SEVERITY")\n');
    const findings = checkEnums(dir, parseRuntimeDeclaration(ENUM_CONTRACT));
    assert.deepEqual(codes(findings), ["RT04"]);
    assert.equal(findings[0].level, "warn");
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
});

// -------------------------------------------------- RT05: selector inventory

const SELECTOR_CONTRACT = `# Contract — system

## Selectors

| Selector | Source                | Pattern           | Used by     |
|----------|-----------------------|-------------------|-------------|
| tags     | features/**/*.feature | @([a-z0-9_-]+)    | smoke-test  |
`;

test("RT05: a selector matching zero targets is an error, with the near-miss named", () => {
  const dir = fixture();
  try {
    mkdirSync(path.join(dir, "features"), { recursive: true });
    // The tag exists with an underscore; the dispatch uses a hyphen.
    writeFileSync(path.join(dir, "features", "a.feature"), "@smoke_test\nFeature: x\n");
    const findings = checkSelectors(dir, parseRuntimeDeclaration(SELECTOR_CONTRACT));
    assert.deepEqual(codes(findings), ["RT05"]);
    assert.match(findings[0].message, /executes 0 cases and exits 0/);
    assert.match(findings[0].message, /the separator differs/);
    assert.match(findings[0].remedy, /smoke_test/);
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
});

test("RT05: the matching selector passes", () => {
  const dir = fixture();
  try {
    mkdirSync(path.join(dir, "features"), { recursive: true });
    writeFileSync(path.join(dir, "features", "a.feature"), "@smoke-test\nFeature: x\n");
    assert.deepEqual(checkSelectors(dir, parseRuntimeDeclaration(SELECTOR_CONTRACT)), []);
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
});

test("RT05: a source glob matching no files at all is an error", () => {
  const dir = fixture();
  try {
    const findings = checkSelectors(dir, parseRuntimeDeclaration(SELECTOR_CONTRACT));
    assert.deepEqual(codes(findings), ["RT05"]);
    assert.match(findings[0].message, /matches no files/);
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
});

test("RT05: an uncompilable pattern is reported, never thrown", () => {
  const dir = fixture();
  const bad = SELECTOR_CONTRACT.replace("@([a-z0-9_-]+)", "@([a-z");
  try {
    mkdirSync(path.join(dir, "features"), { recursive: true });
    writeFileSync(path.join(dir, "features", "a.feature"), "@smoke-test\n");
    const findings = checkSelectors(dir, parseRuntimeDeclaration(bad));
    assert.deepEqual(codes(findings), ["RT05"]);
    assert.match(findings[0].message, /invalid Pattern regex/);
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
});

// -------------------------------------------------------------- glob support

test("the glob understands ** across directories and * within one segment", () => {
  assert.ok(globToRegExp("features/**/*.feature").test("features/a.feature"));
  assert.ok(globToRegExp("features/**/*.feature").test("features/x/y/a.feature"));
  assert.ok(!globToRegExp("features/**/*.feature").test("other/a.feature"));
  assert.ok(globToRegExp("src/*.js").test("src/a.js"));
  assert.ok(!globToRegExp("src/*.js").test("src/deep/a.js"));
  // A literal dot is a literal dot, not "any character".
  assert.ok(!globToRegExp("src/*.js").test("src/axjs"));
});

// ------------------------------------------------------------------ budgets

test("budgets parse into named input/output ceilings", () => {
  const contract = `## Budgets\n\n| Limit | Direction | Value |\n|---|---|---|\n| ai-pack | input | 12000 |\n| ai-summary | output | 800 |\n`;
  const budgets = parseBudgets(parseRuntimeDeclaration(contract));
  assert.equal(budgets.get("ai-pack").direction, "input");
  assert.equal(budgets.get("ai-summary").value, 800);
});

// ------------------------------------------------- the aggregate + local env

test("collectRuntimeFindings reports which contract each finding came from", () => {
  const dir = fixture();
  try {
    writeContract(dir, WIRING_CONTRACT);
    const { findings, contracts } = collectRuntimeFindings(dir);
    assert.equal(contracts, 1);
    assert.ok(findings.length > 0);
    assert.equal(findings[0].contract, ".doctrina/contracts/system.md");
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
});

test("a project with no contracts produces no runtime findings", () => {
  const dir = mkdtempSync(path.join(os.tmpdir(), "doctrina-runtime-"));
  try {
    mkdirSync(path.join(dir, ".doctrina"), { recursive: true });
    assert.deepEqual(collectRuntimeFindings(dir).findings, []);
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
});

test("doctor --env reports membership WITHOUT ever printing the value", () => {
  const dir = fixture();
  try {
    writeContract(dir, ENUM_CONTRACT);
    writeFileSync(path.join(dir, ".env"), "AXE_SEVERITY=hunter2-not-an-enum-member\n");
    const findings = checkLocalEnv(dir);
    assert.deepEqual(codes(findings), ["RT06"]);
    // The whole point of the check: it names the variable and the allowed
    // set, and the offending value appears nowhere in the output.
    const rendered = JSON.stringify(findings);
    assert.ok(!rendered.includes("hunter2-not-an-enum-member"));
    assert.match(findings[0].message, /value withheld/);
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
});

test("a required variable missing from a local .env is reported", () => {
  const dir = fixture();
  const required = ENUM_CONTRACT.replace("| AXE_SEVERITY | no ", "| AXE_SEVERITY | yes");
  try {
    writeContract(dir, required);
    writeFileSync(path.join(dir, ".env"), "SOMETHING_ELSE=1\n");
    assert.deepEqual(codes(checkLocalEnv(dir)), ["RT06"]);
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
});

test("no local .env is not a finding — the check is opt-in by file presence", () => {
  const dir = fixture();
  try {
    writeContract(dir, ENUM_CONTRACT);
    assert.deepEqual(checkLocalEnv(dir), []);
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
});

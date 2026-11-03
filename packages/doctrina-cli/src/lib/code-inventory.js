// @ts-check
import { readdirSync } from "node:fs";
import path from "node:path";
import { isDir, isFile, read } from "./fs-ops.js";
import { gitLines } from "./git.js";

// The INVENTORY of an existing codebase (change 0221): what `intake
// --from-code` stores as the intake of a repository that already has code
// and no specs. Deterministic, local and cheap — it reads manifests and
// counts files; it never interprets prose and never reads a secret.
//
// It is the FACTS half of absorbing a project. The agent does the other
// half — reading the code it points at and writing what the system does
// today — through the absorb playbook (ADR 0005: the CLI does no
// interpretation).

const SKIP_DIRS = new Set([
  ".git", "node_modules", ".doctrina", "dist", "build", "out", "target", "vendor", "coverage",
  ".venv", "venv", "__pycache__", ".next", ".nuxt", ".gradle", ".idea", ".vscode", "bin", "obj",
  ".terraform", ".pytest_cache", ".mypy_cache", "Pods", ".dart_tool", ".expo",
]);
const MAX_FILES = 20000;

// Dependency name → what it tells about the project.
const JS_SIGNALS = {
  react: "React", next: "Next.js", vue: "Vue", nuxt: "Nuxt", "@angular/core": "Angular", svelte: "Svelte",
  "react-native": "React Native", expo: "Expo", express: "Express", fastify: "Fastify", "@nestjs/core": "NestJS",
  koa: "Koa", graphql: "GraphQL", prisma: "Prisma", typeorm: "TypeORM", sequelize: "Sequelize", mongoose: "Mongoose",
  jest: "Jest", vitest: "Vitest", mocha: "Mocha", "@playwright/test": "Playwright", playwright: "Playwright",
  cypress: "Cypress", "@cucumber/cucumber": "Cucumber", webdriverio: "WebdriverIO", "@testing-library/react": "Testing Library",
  storybook: "Storybook", "@storybook/react": "Storybook", typescript: "TypeScript", "k6": "k6",
};
const PY_SIGNALS = {
  django: "Django", flask: "Flask", fastapi: "FastAPI", pytest: "pytest", behave: "Behave",
  "robotframework": "Robot Framework", selenium: "Selenium", playwright: "Playwright", requests: "requests",
  sqlalchemy: "SQLAlchemy", pandas: "pandas", pyspark: "PySpark", locust: "Locust", celery: "Celery",
};
const JVM_SIGNALS = {
  "spring-boot": "Spring Boot", junit: "JUnit", "rest-assured": "REST Assured", cucumber: "Cucumber",
  testng: "TestNG", selenium: "Selenium", kotlin: "Kotlin", mockito: "Mockito",
};

const TEST_FILE = /(\.(test|spec)\.[cm]?[jt]sx?$)|(^test_.*\.py$)|(_test\.(py|go)$)|(\.feature$)|(Tests?\.(java|kt|cs)$)|(\.robot$)|(_spec\.rb$)/;
const CI_FILES = [
  [".github/workflows", "GitHub Actions"], [".gitlab-ci.yml", "GitLab CI"], ["Jenkinsfile", "Jenkins"],
  ["azure-pipelines.yml", "Azure Pipelines"], ["bitbucket-pipelines.yml", "Bitbucket Pipelines"], [".circleci", "CircleCI"],
];
const INFRA_FILES = [
  ["Dockerfile", "Docker"], ["docker-compose.yml", "Docker Compose"], ["docker-compose.yaml", "Docker Compose"],
  ["compose.yml", "Docker Compose"], ["helm", "Helm"], ["k8s", "Kubernetes manifests"], ["kubernetes", "Kubernetes manifests"],
  ["serverless.yml", "Serverless"], ["Procfile", "Procfile"],
];
const ENV_EXAMPLES = [".env.example", ".env.sample", ".env.template", ".env.dist"];
const AREA_ROOTS = ["src", "app", "lib", "packages", "apps", "services", "modules", "features", "pages", "components", "tests", "test", "e2e", "cypress"];

function walk(root) {
  const files = [];
  let truncated = false;
  const stack = [""];
  while (stack.length && !truncated) {
    const rel = stack.pop();
    let entries;
    try {
      entries = readdirSync(path.join(root, rel), { withFileTypes: true });
    } catch {
      continue;
    }
    for (const e of entries) {
      const r = rel ? `${rel}/${e.name}` : e.name;
      if (e.isDirectory()) {
        if (!SKIP_DIRS.has(e.name)) stack.push(r);
      } else if (e.isFile()) {
        files.push(r);
        if (files.length >= MAX_FILES) {
          truncated = true;
          break;
        }
      }
    }
  }
  return { files: files.sort(), truncated };
}

function readJson(p) {
  try {
    return JSON.parse(read(p));
  } catch {
    return null;
  }
}

function signalsFrom(names, table) {
  const out = new Set();
  for (const n of names) {
    const key = String(n).toLowerCase();
    for (const [dep, label] of Object.entries(table)) {
      // Exact names only (a scope prefix aside): `express` must not read as
      // `expo`, nor `nextjs-toolbox` as Next.js.
      if (key === dep || key.endsWith("/" + dep)) out.add(label);
    }
  }
  return [...out];
}

/** Every `KEY=` name in an env example file — names only, never a value. */
export function envNames(text) {
  return String(text).split(/\r?\n/)
    .map((l) => l.match(/^\s*(?:export\s+)?([A-Z][A-Z0-9_]*)\s*=/)?.[1])
    .filter(Boolean);
}

function readmeSummary(root) {
  for (const name of ["README.md", "readme.md", "README.MD", "README"]) {
    const p = path.join(root, name);
    if (!isFile(p)) continue;
    const lines = read(p).split(/\r?\n/);
    const title = lines.find((l) => /^#\s+/.test(l))?.replace(/^#\s+/, "").trim() ?? "";
    const para = [];
    let started = false;
    for (const l of lines) {
      if (/^#/.test(l) || /^\s*(<|!\[|\[!\[)/.test(l)) {
        if (started) break;
        continue;
      }
      if (l.trim() === "") {
        if (started) break;
        continue;
      }
      started = true;
      para.push(l.trim());
    }
    return { file: name, title, summary: para.join(" ").slice(0, 400) };
  }
  return null;
}

function gitFacts(root) {
  const dates = gitLines(root, ["log", "--format=%cs"]);
  if (!dates || dates.length === 0) return null;
  return { commits: dates.length, first: dates[dates.length - 1], last: dates[0] };
}

/**
 * The inventory of the codebase at `root`.
 */
export function inventory(root) {
  const { files, truncated } = walk(root);
  const has = (rel) => files.includes(rel) || isDir(path.join(root, rel));
  const stack = new Set();
  const signals = new Set();
  const checks = [];

  const pkg = isFile(path.join(root, "package.json")) ? readJson(path.join(root, "package.json")) : null;
  if (pkg) {
    stack.add(isFile(path.join(root, "tsconfig.json")) ? "Node.js / TypeScript" : "Node.js");
    const deps = [...Object.keys(pkg.dependencies ?? {}), ...Object.keys(pkg.devDependencies ?? {})];
    for (const s of signalsFrom(deps, JS_SIGNALS)) signals.add(s);
    const runner = isFile(path.join(root, "pnpm-lock.yaml")) ? "pnpm" : isFile(path.join(root, "yarn.lock")) ? "yarn" : "npm";
    for (const name of ["typecheck", "lint", "test", "build"]) {
      if (pkg.scripts?.[name]) checks.push({ name, command: `${runner} run ${name}`, from: "package.json scripts" });
    }
    for (const [name, cmd] of Object.entries(pkg.scripts ?? {})) {
      if (/^(test:|e2e)/.test(name)) checks.push({ name, command: `${runner} run ${name}`, from: `package.json scripts (${String(cmd).slice(0, 60)})` });
    }
  }
  const pyFiles = ["pyproject.toml", "requirements.txt", "requirements-dev.txt", "setup.py", "Pipfile"].filter((f) => isFile(path.join(root, f)));
  if (pyFiles.length) {
    stack.add("Python");
    const text = pyFiles.map((f) => read(path.join(root, f))).join("\n").toLowerCase();
    const names = text.match(/[a-z][a-z0-9_.-]+/g) ?? [];
    for (const s of signalsFrom([...new Set(names)].filter((n) => PY_SIGNALS[n]), PY_SIGNALS)) signals.add(s);
    if (signals.has("pytest")) checks.push({ name: "test", command: "pytest", from: pyFiles.join(", ") });
    if (signals.has("Behave")) checks.push({ name: "bdd", command: "behave", from: pyFiles.join(", ") });
  }
  const jvm = ["pom.xml", "build.gradle", "build.gradle.kts"].filter((f) => isFile(path.join(root, f)));
  if (jvm.length) {
    stack.add(jvm[0] === "pom.xml" ? "Java / Maven" : "JVM / Gradle");
    const text = jvm.map((f) => read(path.join(root, f))).join("\n").toLowerCase();
    for (const [dep, label] of Object.entries(JVM_SIGNALS)) if (text.includes(dep)) signals.add(label);
    checks.push(jvm[0] === "pom.xml"
      ? { name: "test", command: "mvn -q test", from: "pom.xml" }
      : { name: "test", command: isFile(path.join(root, "gradlew")) ? "./gradlew test" : "gradle test", from: jvm[0] });
  }
  if (isFile(path.join(root, "go.mod"))) {
    stack.add("Go");
    checks.push({ name: "test", command: "go test ./...", from: "go.mod" });
  }
  if (isFile(path.join(root, "Cargo.toml"))) {
    stack.add("Rust");
    checks.push({ name: "test", command: "cargo test", from: "Cargo.toml" });
  }
  if (files.some((f) => /\.(csproj|sln)$/.test(f))) {
    stack.add(".NET");
    checks.push({ name: "test", command: "dotnet test", from: "*.csproj" });
  }
  if (isFile(path.join(root, "pubspec.yaml"))) {
    stack.add("Dart / Flutter");
    checks.push({ name: "test", command: "flutter test", from: "pubspec.yaml" });
  }
  if (isFile(path.join(root, "Gemfile"))) stack.add("Ruby");
  if (isFile(path.join(root, "composer.json"))) stack.add("PHP");
  if (isDir(path.join(root, "android"))) signals.add("Android project");
  if (isDir(path.join(root, "ios"))) signals.add("iOS project");
  if (files.some((f) => f.endsWith(".tf"))) signals.add("Terraform");

  const testFiles = files.filter((f) => TEST_FILE.test(path.basename(f)) || /(^|\/)(cypress|e2e)\/.+\.[cm]?[jt]sx?$/.test(f));
  const testDirs = new Map();
  for (const f of testFiles) {
    const dir = f.includes("/") ? f.split("/").slice(0, Math.min(2, f.split("/").length - 1)).join("/") : ".";
    testDirs.set(dir, (testDirs.get(dir) ?? 0) + 1);
  }
  const ci = CI_FILES.filter(([p]) => has(p)).map(([p, label]) => ({ path: p, label }));
  const infra = INFRA_FILES.filter(([p]) => has(p)).map(([p, label]) => ({ path: p, label }));
  const env = [];
  for (const f of ENV_EXAMPLES) {
    if (isFile(path.join(root, f))) env.push({ file: f, names: envNames(read(path.join(root, f))) });
  }

  // Candidate AREAS: the folders one level under the conventional source
  // roots, with how many files each holds — where capabilities usually are.
  const areas = new Map();
  for (const f of files) {
    const parts = f.split("/");
    if (parts.length < 3 || !AREA_ROOTS.includes(parts[0])) continue;
    const key = `${parts[0]}/${parts[1]}`;
    areas.set(key, (areas.get(key) ?? 0) + 1);
  }
  const topDirs = new Map();
  for (const f of files) {
    const top = f.includes("/") ? f.split("/")[0] : null;
    if (top) topDirs.set(top, (topDirs.get(top) ?? 0) + 1);
  }

  return {
    root,
    files: files.length,
    truncated,
    readme: readmeSummary(root),
    stack: [...stack],
    signals: [...signals].sort(),
    checks,
    tests: { files: testFiles.length, dirs: [...testDirs.entries()].sort((a, b) => b[1] - a[1]).slice(0, 10) },
    ci,
    infra,
    env,
    areas: [...areas.entries()].sort((a, b) => b[1] - a[1]).slice(0, 25),
    topDirs: [...topDirs.entries()].sort((a, b) => b[1] - a[1]).slice(0, 15),
    git: gitFacts(root),
  };
}

/** The inventory as the Markdown body of an intake. */
export function inventoryMarkdown(inv, projectName) {
  const L = [];
  L.push(`Code inventory of ${projectName} — the FACTS an agent absorbs the project from.`);
  L.push("Written by `doctrina intake --from-code`: manifests read, files counted, nothing interpreted.");
  L.push("Business intent is NOT in here: what the code cannot say goes to the human as a question.");
  L.push("");
  if (inv.readme) {
    L.push(`## README (${inv.readme.file})`, "");
    if (inv.readme.title) L.push(`- Title: ${inv.readme.title}`);
    if (inv.readme.summary) L.push(`- Opening: ${inv.readme.summary}`);
    L.push("");
  }
  L.push("## Stack", "");
  L.push(`- Languages / build: ${inv.stack.length ? inv.stack.join(", ") : "none detected from manifests"}`);
  L.push(`- Frameworks and tools: ${inv.signals.length ? inv.signals.join(", ") : "none detected"}`);
  L.push(`- Files scanned: ${inv.files}${inv.truncated ? ` (stopped at ${MAX_FILES})` : ""}`);
  if (inv.git) L.push(`- History: ${inv.git.commits} commits, ${inv.git.first} → ${inv.git.last}`);
  L.push("");
  L.push("## Where the code is", "");
  for (const [dir, n] of inv.topDirs) L.push(`- \`${dir}/\` — ${n} files`);
  if (inv.topDirs.length === 0) L.push("- (flat repository)");
  L.push("");
  L.push("## Candidate areas (one capability each, usually)", "");
  for (const [dir, n] of inv.areas) L.push(`- \`${dir}/\` — ${n} files`);
  if (inv.areas.length === 0) L.push("- none under the conventional roots — derive areas from the top-level folders");
  L.push("");
  L.push("## Tests", "");
  L.push(`- ${inv.tests.files} test file${inv.tests.files === 1 ? "" : "s"}`);
  for (const [dir, n] of inv.tests.dirs) L.push(`- \`${dir}\` — ${n}`);
  L.push("");
  L.push("## Build and test commands (candidates for `doctrina verify --init`)", "");
  for (const ch of inv.checks) L.push(`- \`${ch.command}\` — ${ch.name}, from ${ch.from}`);
  if (inv.checks.length === 0) L.push("- none detected — ask the human how this project is built and tested");
  L.push("");
  L.push("## Delivery", "");
  for (const c of inv.ci) L.push(`- CI: ${c.label} (\`${c.path}\`)`);
  for (const i of inv.infra) L.push(`- Runtime: ${i.label} (\`${i.path}\`)`);
  if (inv.ci.length + inv.infra.length === 0) L.push("- no CI or runtime manifest found");
  L.push("");
  L.push("## Configuration (names only — values are never read)", "");
  for (const e of inv.env) L.push(`- \`${e.file}\`: ${e.names.length ? e.names.map((n) => `\`${n}\``).join(", ") : "(no KEY= lines)"}`);
  if (inv.env.length === 0) L.push("- no env example file");
  return L.join("\n") + "\n";
}


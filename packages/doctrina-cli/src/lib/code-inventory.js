// @ts-check
import { readdirSync, statSync } from "node:fs";
import process from "node:process";
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
//
// Change 0229: every fact is read from the whole repository, not its root.
// Measured on public projects, the root-only reading distorted what an agent
// would absorb: an eleven-service polyglot demo (Go, C#, Node, Python, Java)
// read as ".NET"; a FastAPI + React template read as "no framework" with one
// candidate area, an e-mail template package; a Spring application's areas
// were `src/main/` and `src/test/`; and a `--watch` script was offered to
// `verify --init`, a gate that would then never return. So the inventory
// now reads every UNIT (a directory with its own manifest), points at entry
// points, interfaces, data, delivery and the documentation that already
// exists, and ends with what it could not see — a fact the agent must not
// fill in by guessing.

const SKIP_DIRS = new Set([
  ".git", "node_modules", ".doctrina", "dist", "build", "out", "target", "vendor", "coverage",
  ".venv", "venv", "env", "__pycache__", ".next", ".nuxt", ".gradle", ".idea", ".vscode", "bin", "obj",
  ".terraform", ".pytest_cache", ".mypy_cache", ".ruff_cache", ".tox", "Pods", ".dart_tool", ".expo",
  ".turbo", ".cache", ".svelte-kit", ".angular", ".parcel-cache", ".output", "storybook-static",
  ".serverless", ".aws-sam", "DerivedData", ".pnpm-store", ".yarn",
]);
const MAX_FILES = 20000;
// How deep a manifest may sit and still name a unit (examples/x/y/package.json is 3).
const MAX_UNIT_DEPTH = 5;

// Dependency name → what it tells about the project.
const JS_SIGNALS = {
  react: "React", next: "Next.js", vue: "Vue", nuxt: "Nuxt", "@angular/core": "Angular", svelte: "Svelte",
  "@sveltejs/kit": "SvelteKit", "solid-js": "Solid", "@remix-run/react": "Remix", astro: "Astro", vite: "Vite",
  "react-native": "React Native", expo: "Expo", electron: "Electron", express: "Express", fastify: "Fastify",
  "@nestjs/core": "NestJS", koa: "Koa", hono: "Hono", "@trpc/server": "tRPC", graphql: "GraphQL",
  "@apollo/server": "Apollo Server", prisma: "Prisma", "@prisma/client": "Prisma", "drizzle-orm": "Drizzle",
  typeorm: "TypeORM", sequelize: "Sequelize", mongoose: "Mongoose", "@tanstack/react-query": "TanStack Query",
  "@tanstack/react-router": "TanStack Router", redux: "Redux", "@reduxjs/toolkit": "Redux", zustand: "Zustand",
  tailwindcss: "Tailwind CSS", jest: "Jest", vitest: "Vitest", mocha: "Mocha", "@playwright/test": "Playwright",
  playwright: "Playwright", cypress: "Cypress", "@cucumber/cucumber": "Cucumber", webdriverio: "WebdriverIO",
  "@testing-library/react": "Testing Library", storybook: "Storybook", "@storybook/react": "Storybook",
  typescript: "TypeScript", k6: "k6", "socket.io": "Socket.IO", "@grpc/grpc-js": "gRPC", kafkajs: "Kafka",
  amqplib: "RabbitMQ", redis: "Redis", ioredis: "Redis", stripe: "Stripe", "next-auth": "NextAuth",
  "better-auth": "Better Auth",
};
const PY_SIGNALS = {
  django: "Django", djangorestframework: "Django REST framework", flask: "Flask", fastapi: "FastAPI",
  sqlmodel: "SQLModel", pydantic: "Pydantic", pytest: "pytest", behave: "Behave", robotframework: "Robot Framework",
  ruff: "Ruff", mypy: "mypy",
  selenium: "Selenium", playwright: "Playwright", requests: "requests", httpx: "HTTPX", sqlalchemy: "SQLAlchemy",
  alembic: "Alembic", pandas: "pandas", pyspark: "PySpark", locust: "Locust", celery: "Celery", grpcio: "gRPC",
  streamlit: "Streamlit", langchain: "LangChain", openai: "OpenAI SDK", anthropic: "Anthropic SDK", uvicorn: "Uvicorn",
  gunicorn: "Gunicorn", "opentelemetry-api": "OpenTelemetry",
};
const JVM_SIGNALS = {
  "spring-boot": "Spring Boot", "spring-cloud": "Spring Cloud", quarkus: "Quarkus", micronaut: "Micronaut",
  junit: "JUnit", "rest-assured": "REST Assured", cucumber: "Cucumber", testng: "TestNG", selenium: "Selenium",
  kotlin: "Kotlin", mockito: "Mockito", hibernate: "Hibernate", flyway: "Flyway", liquibase: "Liquibase",
  "grpc-": "gRPC", kafka: "Kafka",
};
const DOTNET_SIGNALS = {
  "Microsoft.AspNetCore": "ASP.NET Core", "Microsoft.EntityFrameworkCore": "Entity Framework Core",
  xunit: "xUnit", NUnit: "NUnit", MSTest: "MSTest", "Grpc.": "gRPC", "Aspire.": ".NET Aspire",
  MediatR: "MediatR", Blazor: "Blazor", "Microsoft.Maui": ".NET MAUI", RabbitMQ: "RabbitMQ",
};

// Manifest file → the kind of unit it declares.
/** @type {Array<[RegExp, string]>} */
const MANIFESTS = [
  [/^package\.json$/, "node"], [/^pyproject\.toml$/, "python"], [/^requirements(-[\w]+)?\.txt$/, "python"],
  [/^setup\.py$/, "python"], [/^Pipfile$/, "python"], [/^pom\.xml$/, "jvm"], [/^build\.gradle(\.kts)?$/, "jvm"],
  [/^go\.mod$/, "go"], [/^Cargo\.toml$/, "rust"], [/\.csproj$/, "dotnet"], [/\.fsproj$/, "dotnet"],
  [/^pubspec\.yaml$/, "dart"], [/^Gemfile$/, "ruby"], [/^composer\.json$/, "php"], [/^mix\.exs$/, "elixir"],
  [/^Package\.swift$/, "swift"],
];
const KIND_LABEL = {
  node: "Node.js", python: "Python", jvm: "JVM", go: "Go", rust: "Rust", dotnet: ".NET", dart: "Dart / Flutter",
  ruby: "Ruby", php: "PHP", elixir: "Elixir", swift: "Swift",
};

const LANG_BY_EXT = {
  ts: "TypeScript", tsx: "TypeScript", mts: "TypeScript", cts: "TypeScript", js: "JavaScript", jsx: "JavaScript",
  mjs: "JavaScript", cjs: "JavaScript", py: "Python", go: "Go", java: "Java", kt: "Kotlin", kts: "Kotlin",
  cs: "C#", fs: "F#", rb: "Ruby", php: "PHP", rs: "Rust", swift: "Swift", dart: "Dart", scala: "Scala",
  ex: "Elixir", exs: "Elixir", c: "C", h: "C", cpp: "C++", cc: "C++", hpp: "C++", m: "Objective-C",
  vue: "Vue", svelte: "Svelte", sql: "SQL", tf: "Terraform", sh: "Shell", ps1: "PowerShell",
  feature: "Gherkin", proto: "Protocol Buffers", graphql: "GraphQL", gql: "GraphQL", razor: "Razor",
  cshtml: "Razor", html: "HTML", css: "CSS", scss: "SCSS",
};

const TEST_FILE = /(\.(test|spec)\.[cm]?[jt]sx?$)|(^test_.*\.py$)|(_test\.(py|go)$)|(\.feature$)|(Tests?\.(java|kt|cs)$)|(\.robot$)|(_spec\.rb$)|(_test\.exs$)/;
const TEST_DIR = /(^|\/)(tests?|__tests__|spec|e2e|cypress|src\/test|integration-tests|UnitTests|FunctionalTests)(\/|$)/i;
const CI_FILES = [
  [".github/workflows", "GitHub Actions"], [".gitlab-ci.yml", "GitLab CI"], ["Jenkinsfile", "Jenkins"],
  ["azure-pipelines.yml", "Azure Pipelines"], ["bitbucket-pipelines.yml", "Bitbucket Pipelines"], [".circleci", "CircleCI"],
  [".drone.yml", "Drone"], [".travis.yml", "Travis CI"], ["cloudbuild.yaml", "Cloud Build"], [".buildkite", "Buildkite"],
];
const ENV_EXAMPLE = /^\.env(\.[\w-]+)?\.(example|sample|template|dist)$|^\.env\.(example|sample|template|dist)$|^example\.env$/;
const ENV_REAL = /^\.env(\.[\w-]+)?$/;
// The conventional roots under which capabilities usually live. A test root
// is never an area: tests are evidence, listed under Tests.
const AREA_ROOTS = [
  "src", "app", "lib", "packages", "apps", "services", "modules", "features", "pages", "components",
  "frontend", "backend", "server", "client", "api", "web", "mobile", "cmd", "internal", "pkg", "domain",
];
const TEST_ROOTS = new Set(["test", "tests", "e2e", "cypress", "__tests__", "spec"]);
const NOT_A_UNIT_SEGMENT = /^(examples?|samples?|fixtures?|templates?|docs?|demo|playground|benchmarks?)$/i;
// Examples, fixtures and docs are read where they sit in the LAYOUT — the
// first two folders — never deeper: Spring's own sample lives in the Java
// package `org.springframework.samples.petclinic`, and that is the code.
const isAside = (/** @type {string} */ p) => p.split("/").slice(0, 2).some((s) => NOT_A_UNIT_SEGMENT.test(s));
// A script is offered to `verify --init` only when it returns on its own.
const LONG_RUNNING = /(--watch(All)?\b|\bwatch\b|\s-w(\s|$)|--ui\b|--update\b|\b-u\b|\bserve\b|\bdev\b|\bstart\b|--open\b|\bnodemon\b|\bstorybook\b(?!\s+build))/;
// The flags that make a watching runner return (second audit, change 0233):
// `jest --watchAll` was seeded — `\bwatch\b` cannot see a word that goes on —
// while `vitest --watch=false` was refused for the word it switches off.
const RETURNS = /--(no-watch|watch(All)?=false|single-run)\b|\bCI=(true|1)\b/g;
// Runners that watch unless told not to: Angular's `ng test` and Create
// React App's `react-scripts test` and `karma start` never return on their own.
const WATCHES_BY_DEFAULT = /\bng\s+test\b|\breact-scripts\s+test\b|\bkarma\s+start\b/;

/** True when a package script keeps running until someone stops it. */
export function scriptLongRunning(body) {
  const text = String(body);
  const off = new RegExp(RETURNS.source).test(text);
  if (WATCHES_BY_DEFAULT.test(text) && !off) return true;
  // Told not to watch: the runner itself (`karma start`) is no longer a server.
  return LONG_RUNNING.test(text.replace(RETURNS, " ").replace(new RegExp(WATCHES_BY_DEFAULT.source, "g"), " "));
}

function walk(root) {
  const files = [];
  const skipped = new Set();
  let truncated = false;
  const stack = [""];
  while (stack.length && !truncated) {
    const rel = stack.pop() ?? "";
    let entries;
    try {
      entries = readdirSync(path.join(root, rel), { withFileTypes: true });
    } catch {
      continue;
    }
    for (const e of entries) {
      const r = rel ? `${rel}/${e.name}` : e.name;
      if (e.isDirectory()) {
        if (SKIP_DIRS.has(e.name)) { if (e.name !== ".git") skipped.add(e.name); }
        else stack.push(r);
      } else if (e.isFile()) {
        files.push(r);
        if (files.length >= MAX_FILES) {
          truncated = true;
          break;
        }
      }
    }
  }
  return { files: files.sort(), truncated, skipped: [...skipped].sort() };
}

function readJson(p) {
  try {
    return JSON.parse(read(p));
  } catch {
    return null;
  }
}

function readText(root, rel) {
  try {
    return read(path.join(root, rel));
  } catch {
    return "";
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
  for (const name of ["README.md", "readme.md", "README.MD", "Readme.md", "README.rst", "README"]) {
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
  const shallow = (gitLines(root, ["rev-parse", "--is-shallow-repository"]) ?? [])[0] === "true";
  return { commits: dates.length, first: dates[dates.length - 1], last: dates[0], shallow };
}

const dirOf = (/** @type {string} */ f) => (f.includes("/") ? f.slice(0, f.lastIndexOf("/")) : "");
const baseOf = (/** @type {string} */ f) => (f.includes("/") ? f.slice(f.lastIndexOf("/") + 1) : f);
const depth = (/** @type {string} */ d) => (d === "" ? 0 : d.split("/").length);
const under = (/** @type {string} */ f, /** @type {string} */ dir) => dir === "" || f === dir || f.startsWith(dir + "/");
const shown = (/** @type {string} */ d) => (d === "" ? "." : `${d}/`);

/** The package manager a Node unit runs its scripts with. */
function nodeRunner(root, unitDir, pkg, rootPkg) {
  const declared = String(pkg?.packageManager ?? rootPkg?.packageManager ?? "").split("@")[0];
  if (["pnpm", "yarn", "npm", "bun"].includes(declared)) return declared;
  for (const dir of [unitDir, ""]) {
    const at = (/** @type {string} */ f) => isFile(path.join(root, dir, f));
    if (at("bun.lock") || at("bun.lockb")) return "bun";
    if (at("pnpm-lock.yaml")) return "pnpm";
    if (at("yarn.lock")) return "yarn";
    if (at("package-lock.json")) return "npm";
  }
  return "npm";
}

/** Names of the dependencies a Python manifest declares (a lexical reading). */
function pythonDeps(text) {
  const names = new Set();
  for (const m of String(text).toLowerCase().matchAll(/(?:^|["'\s,[])([a-z][a-z0-9_.-]*)\s*(?:\[[^\]]*\])?\s*(?:[<>=~!;]|["',\]\n]|$)/gm)) {
    names.add(m[1].replace(/_/g, "-"));
  }
  return [...names];
}

function unitName(kind, root, dir, manifests) {
  const at = (/** @type {string} */ f) => readText(root, dir ? `${dir}/${f}` : f);
  if (kind === "node") return readJson(path.join(root, dir, "package.json"))?.name ?? null;
  if (kind === "python") return at("pyproject.toml").match(/^\s*name\s*=\s*["']([^"']+)["']/m)?.[1] ?? null;
  if (kind === "go") return at("go.mod").match(/^module\s+(\S+)/m)?.[1] ?? null;
  if (kind === "rust") return at("Cargo.toml").match(/^\s*name\s*=\s*"([^"]+)"/m)?.[1] ?? null;
  if (kind === "jvm") {
    // The project's own artifactId — the first one belongs to <parent> when
    // there is one, and naming a Spring app "spring-boot-starter-parent" is
    // the distortion this inventory exists to avoid.
    const pom = at("pom.xml").replace(/<parent>[\s\S]*?<\/parent>/, "").replace(/<dependencies>[\s\S]*$/, "");
    return pom.match(/<artifactId>([^<]+)<\/artifactId>/)?.[1]
      ?? at("settings.gradle").match(/rootProject\.name\s*=\s*['"]([^'"]+)['"]/)?.[1]
      ?? at("settings.gradle.kts").match(/rootProject\.name\s*=\s*"([^"]+)"/)?.[1] ?? null;
  }
  if (kind === "dotnet") return manifests.find((m) => /\.(cs|fs)proj$/.test(m))?.replace(/\.(cs|fs)proj$/, "") ?? null;
  if (kind === "dart") return at("pubspec.yaml").match(/^name:\s*(\S+)/m)?.[1] ?? null;
  return null;
}

/**
 * Every directory that declares its own build — a unit — with what its
 * manifest says. The root is a unit too when it holds a manifest.
 */
function readUnits(root, files) {
  /** @type {Map<string, Set<string>>} */
  const byDir = new Map();
  /** @type {Map<string, string[]>} */
  const manifestsOf = new Map();
  for (const f of files) {
    const dir = dirOf(f);
    if (depth(dir) > MAX_UNIT_DEPTH) continue;
    const kind = MANIFESTS.find(([re]) => re.test(baseOf(f)))?.[1];
    if (!kind) continue;
    if (!byDir.has(dir)) byDir.set(dir, new Set());
    byDir.get(dir)?.add(kind);
    manifestsOf.set(dir, [...(manifestsOf.get(dir) ?? []), baseOf(f)]);
  }
  const rootPkg = isFile(path.join(root, "package.json")) ? readJson(path.join(root, "package.json")) : null;
  const units = [];
  for (const dir of [...byDir.keys()].sort((a, b) => depth(a) - depth(b) || a.localeCompare(b))) {
    const kinds = [...(byDir.get(dir) ?? [])].sort();
    const manifests = (manifestsOf.get(dir) ?? []).sort();
    const signals = new Set();
    let runner = null;
    let scripts = {};
    for (const kind of kinds) {
      if (kind === "node") {
        const pkg = readJson(path.join(root, dir, "package.json")) ?? {};
        const deps = [...Object.keys(pkg.dependencies ?? {}), ...Object.keys(pkg.devDependencies ?? {}), ...Object.keys(pkg.peerDependencies ?? {})];
        for (const s of signalsFrom(deps, JS_SIGNALS)) signals.add(s);
        if (isFile(path.join(root, dir, "tsconfig.json"))) signals.add("TypeScript");
        runner = nodeRunner(root, dir, pkg, rootPkg);
        scripts = pkg.scripts ?? {};
      } else if (kind === "python") {
        const text = manifests.filter((m) => MANIFESTS.some(([re, k]) => k === "python" && re.test(m)))
          .map((m) => readText(root, dir ? `${dir}/${m}` : m)).join("\n");
        for (const s of signalsFrom(pythonDeps(text).filter((n) => PY_SIGNALS[n]), PY_SIGNALS)) signals.add(s);
      } else if (kind === "jvm") {
        const text = manifests.filter((m) => /^(pom\.xml|build\.gradle(\.kts)?)$/.test(m))
          .map((m) => readText(root, dir ? `${dir}/${m}` : m)).join("\n").toLowerCase();
        for (const [dep, label] of Object.entries(JVM_SIGNALS)) if (text.includes(dep)) signals.add(label);
      } else if (kind === "dotnet") {
        const text = manifests.filter((m) => /\.(cs|fs)proj$/.test(m)).map((m) => readText(root, dir ? `${dir}/${m}` : m)).join("\n");
        for (const [dep, label] of Object.entries(DOTNET_SIGNALS)) if (text.includes(`Include="${dep}`)) signals.add(label);
        if (/Sdk="Microsoft\.NET\.Sdk\.Web"/.test(text)) signals.add("ASP.NET Core");
      }
    }
    units.push({
      dir, kinds, manifests, name: unitName(kinds[0], root, dir, manifests),
      signals: [...signals].sort(), runner, scripts,
      // A project deep inside a test folder is a fixture (Django keeps one
      // five levels under tests/); a test project at its top is a unit.
      example: isAside(dir) || (TEST_ROOTS.has(dir.split("/")[0]) && depth(dir) > 2),
    });
  }
  return units;
}

/** The unit a file belongs to: the deepest unit directory above it. */
function unitOf(units, f) {
  let best = null;
  for (const u of units) if (under(f, u.dir) && (best === null || depth(u.dir) > depth(best.dir))) best = u;
  return best;
}

function workspaceTools(root, files) {
  const out = [];
  const rootPkg = isFile(path.join(root, "package.json")) ? readJson(path.join(root, "package.json")) : null;
  if (rootPkg?.workspaces) out.push({ tool: "npm/yarn workspaces", file: "package.json" });
  for (const [file, tool] of [["pnpm-workspace.yaml", "pnpm workspaces"], ["turbo.json", "Turborepo"], ["nx.json", "Nx"],
    ["lerna.json", "Lerna"], ["rush.json", "Rush"], ["go.work", "Go workspace"]]) {
    if (isFile(path.join(root, file))) out.push({ tool, file });
  }
  // A settings file names the root project; only an `include` makes it multi-project.
  for (const file of ["settings.gradle", "settings.gradle.kts"]) {
    if (/^\s*include\b/m.test(readText(root, file))) out.push({ tool: "Gradle multi-project", file });
  }
  if (/^\s*\[workspace\]/m.test(readText(root, "Cargo.toml"))) out.push({ tool: "Cargo workspace", file: "Cargo.toml" });
  if (/<modules>/.test(readText(root, "pom.xml"))) out.push({ tool: "Maven multi-module", file: "pom.xml" });
  for (const f of files.filter((x) => !x.includes("/") && /\.slnx?$/.test(x))) out.push({ tool: ".NET solution", file: f });
  return out;
}

/** Commands a unit's build declares, each marked safe to seed or not. */
function unitCommands(root, unit, units, workspaces, files) {
  const at = (/** @type {string} */ f) => isFile(path.join(root, unit.dir, f));
  const cwd = unit.dir || undefined;
  const tag = unit.dir ? ` (${unit.dir})` : "";
  /** @type {Array<{name: string, command: string, from: string, cwd?: string, seed: boolean, why?: string}>} */
  const out = [];
  const nested = (/** @type {string} */ kind) => units.some((u) => u !== unit && u.kinds.includes(kind) && under(unit.dir, u.dir) && u.dir !== unit.dir);
  for (const kind of unit.kinds) {
    if (kind === "node") {
      const ws = unit.dir === "" ? false : units.some((u) => u.dir === "" && u.kinds.includes("node") && Object.keys(u.scripts).length > 0);
      for (const [name, body] of Object.entries(unit.scripts ?? {})) {
        const canonical = ["typecheck", "lint", "test", "build"].includes(name);
        if (!canonical && !/^(test|e2e|lint|typecheck|check)(:|$)/.test(name)) continue;
        const longRunning = scriptLongRunning(body) || /(:watch|:ui|:update|:dev)$/.test(name);
        // `npm init` writes this; it fails by design and tests nothing.
        const placeholder = /no test specified/i.test(String(body));
        out.push({
          name: `${name}${tag}`, command: `${unit.runner} run ${name}`, cwd,
          from: `${unit.dir ? unit.dir + "/" : ""}package.json scripts (${String(body).slice(0, 60)})`,
          seed: canonical && !longRunning && !ws && !placeholder,
          why: placeholder ? "npm's placeholder — no test declared" : longRunning ? "long-running or interactive"
            : !canonical ? "an extra script" : ws ? "the root workspace runs it" : undefined,
        });
      }
    } else if (kind === "python") {
      const own = files.filter((f) => unitOf(units, f) === unit);
      const from = `${unit.dir ? unit.dir + "/" : ""}${unit.manifests.join(", ")}`;
      const pyproject = readText(root, unit.dir ? `${unit.dir}/pyproject.toml` : "pyproject.toml");
      const setupCfg = readText(root, unit.dir ? `${unit.dir}/setup.cfg` : "setup.cfg");
      const locked = (/** @type {string} */ f) => at(f) || isFile(path.join(root, f));
      const via = locked("uv.lock") ? "uv run " : locked("poetry.lock") ? "poetry run " : locked("Pipfile.lock") ? "pipenv run " : "";
      // The linter and the type checker the project DECLARES (seventh audit,
      // change 0250): a Python project was seeded with its tests and nothing
      // else, where a Node one gets `lint` and `typecheck` from its scripts.
      // Python has no scripts table, so the declaration is the dependency or
      // the tool's own configuration.
      if (unit.signals.includes("Ruff") || at("ruff.toml") || at(".ruff.toml") || /\[tool\.ruff/.test(pyproject)) {
        out.push({ name: `lint${tag}`, command: `${via}ruff check .`, cwd, from, seed: true });
      }
      if (unit.signals.includes("mypy") || at("mypy.ini") || /\[tool\.mypy/.test(pyproject) || /^\[mypy\]/m.test(setupCfg)) {
        out.push({ name: `typecheck${tag}`, command: `${via}mypy .`, cwd, from, seed: true });
      }
      const hasTests = own.some((f) => /(^|\/)(test_[^/]*|[^/]*_test)\.py$/.test(f));
      if (!hasTests) continue; // pytest declared with nothing to run is not a gate
      // Seed the runner the project DECLARES. Test files alone say nothing
      // about how they run: Django's run through tests/runtests.py.
      const pytestDeclared = unit.signals.includes("pytest") || at("pytest.ini") || at("conftest.py")
        || /\[tool\.pytest/.test(readText(root, unit.dir ? `${unit.dir}/pyproject.toml` : "pyproject.toml"))
        || /\[tool:pytest\]/.test(readText(root, unit.dir ? `${unit.dir}/setup.cfg` : "setup.cfg"));
      const lock = (/** @type {string} */ f) => at(f) || isFile(path.join(root, f));
      const runner = lock("uv.lock") ? "uv run " : lock("poetry.lock") ? "poetry run " : lock("Pipfile.lock") ? "pipenv run " : "";
      const runtests = own.find((f) => baseOf(f) === "runtests.py");
      if (pytestDeclared) {
        out.push({ name: `test${tag}`, command: `${runner}pytest`, cwd, from: `${unit.dir ? unit.dir + "/" : ""}${unit.manifests.join(", ")}`, seed: true });
      } else {
        out.push({ name: `test${tag}`, command: runtests ? `python ${unit.dir ? runtests.slice(unit.dir.length + 1) : runtests}` : "(no test runner declared)",
          cwd, from: `${unit.dir ? unit.dir + "/" : ""}${unit.manifests.join(", ")}`, seed: false,
          why: runtests ? "a test script, not a declared runner — confirm how it is run" : "test files, but no test runner declared — ask the human" });
      }
    } else if (kind === "jvm") {
      if (nested("jvm") && units.some((u) => u.kinds.includes("jvm") && u.dir !== unit.dir && under(unit.dir, u.dir))) continue;
      const parentBuilds = units.some((u) => u.kinds.includes("jvm") && u.dir !== unit.dir && under(unit.dir, u.dir));
      if (parentBuilds) continue;
      const maven = unit.manifests.includes("pom.xml");
      // A wrapper committed without its execute bit runs through sh — the
      // Online Boutique's `gradlew` is one, and `./gradlew` fails to start.
      const wrap = (/** @type {string} */ f) => {
        try {
          return (statSync(path.join(root, unit.dir, f)).mode & 0o111) || process.platform === "win32" ? `./${f}` : `sh ./${f}`;
        } catch {
          return `./${f}`;
        }
      };
      const wrapper = maven ? (at("mvnw") ? wrap("mvnw") : "mvn") : (at("gradlew") ? wrap("gradlew") : "gradle");
      out.push({ name: `test${tag}`, command: maven ? `${wrapper} -q test` : `${wrapper} test`, cwd, from: `${unit.dir ? unit.dir + "/" : ""}${maven ? "pom.xml" : unit.manifests.find((m) => m.startsWith("build.gradle"))}`, seed: true });
    } else if (kind === "go") {
      out.push({ name: `test${tag}`, command: "go test ./...", cwd, from: `${unit.dir ? unit.dir + "/" : ""}go.mod`, seed: true });
    } else if (kind === "rust") {
      if (units.some((u) => u.kinds.includes("rust") && u.dir !== unit.dir && under(unit.dir, u.dir))) continue;
      out.push({ name: `test${tag}`, command: "cargo test", cwd, from: `${unit.dir ? unit.dir + "/" : ""}Cargo.toml`, seed: true });
    } else if (kind === "dotnet") {
      const solution = workspaces.find((w) => w.tool === ".NET solution");
      if (solution) continue; // one solution-wide command, added once below
      if (!unit.manifests.some((m) => /tests?\.(cs|fs)proj$/i.test(m))) continue;
      out.push({ name: `test${tag}`, command: "dotnet test", cwd, from: `${unit.dir ? unit.dir + "/" : ""}${unit.manifests.join(", ")}`, seed: true });
    } else if (kind === "dart") {
      out.push({ name: `test${tag}`, command: "flutter test", cwd, from: `${unit.dir ? unit.dir + "/" : ""}pubspec.yaml`, seed: true });
    }
  }
  return out;
}

/** Feature folders of a JVM source tree: the segment after the common package. */
function jvmAreas(unitFiles, unitDir) {
  const out = new Map();
  for (const lang of ["java", "kotlin"]) {
    const prefix = `${unitDir ? unitDir + "/" : ""}src/main/${lang}/`;
    const pkgs = unitFiles.filter((f) => f.startsWith(prefix)).map((f) => dirOf(f.slice(prefix.length)).split("/").filter(Boolean));
    if (pkgs.length === 0) continue;
    let common = pkgs[0];
    for (const p of pkgs) {
      let i = 0;
      while (i < common.length && i < p.length && common[i] === p[i]) i++;
      common = common.slice(0, i);
    }
    for (const p of pkgs) {
      const key = prefix + [...common, ...(p.length > common.length ? [p[common.length]] : [])].join("/");
      out.set(key, (out.get(key) ?? 0) + 1);
    }
  }
  return out;
}

/**
 * The inventory of the codebase at `root`.
 */
export function inventory(root) {
  const { files, truncated, skipped } = walk(root);
  const has = (rel) => files.includes(rel) || isDir(path.join(root, rel));
  const units = readUnits(root, files);
  const workspaces = workspaceTools(root, files);

  // Languages, counted by file extension — what is actually written here.
  const languages = new Map();
  for (const f of files) {
    const ext = baseOf(f).includes(".") ? (baseOf(f).split(".").pop() ?? "").toLowerCase() : "";
    const lang = LANG_BY_EXT[ext];
    if (lang) languages.set(lang, (languages.get(lang) ?? 0) + 1);
  }

  const stack = new Set();
  const signals = new Set();
  for (const u of units.filter((x) => !x.example)) {
    for (const k of u.kinds) stack.add(k === "node" && u.signals.includes("TypeScript") ? "Node.js / TypeScript" : KIND_LABEL[k]);
    for (const s of u.signals) signals.add(s);
  }
  if (stack.has("Node.js / TypeScript")) stack.delete("Node.js");
  if (isDir(path.join(root, "android"))) signals.add("Android project");
  if (isDir(path.join(root, "ios"))) signals.add("iOS project");
  if (files.some((f) => f.endsWith(".tf"))) signals.add("Terraform");

  // Commands: every unit's, seeded only when they return on their own.
  const commands = [];
  for (const u of units.filter((x) => !x.example)) commands.push(...unitCommands(root, u, units, workspaces, files));
  const solution = workspaces.find((w) => w.tool === ".NET solution");
  if (solution) commands.push({ name: "test", command: `dotnet test ${solution.file}`, from: solution.file, cwd: undefined, seed: true, why: undefined });
  const checks = commands.filter((c) => c.seed).map(({ name, command, from, cwd }) => ({ name, command, from, ...(cwd ? { cwd } : {}) }));

  const testFiles = files.filter((f) => TEST_FILE.test(baseOf(f)) || /(^|\/)(cypress|e2e)\/.+\.[cm]?[jt]sx?$/.test(f));
  const testDirs = new Map();
  for (const f of testFiles) {
    const parts = f.split("/");
    const dir = parts.length > 1 ? parts.slice(0, Math.min(2, parts.length - 1)).join("/") : ".";
    testDirs.set(dir, (testDirs.get(dir) ?? 0) + 1);
  }

  // Candidate AREAS: folders where behaviour usually lives, read inside each
  // unit — the unit itself when it is one of several, the folders one level
  // under its conventional roots, a JVM tree's feature packages. A hint from
  // the layout, never a capability by itself.
  const areas = new Map();
  const realUnits = units.filter((u) => !u.example);
  for (const u of realUnits) {
    if (u.dir !== "" && realUnits.length > 1 && !TEST_DIR.test(u.dir)) {
      const n = files.filter((f) => under(f, u.dir)).length;
      areas.set(`${u.dir}`, n);
    }
  }
  for (const f of files) {
    const u = unitOf(realUnits, f);
    const base = u ? u.dir : "";
    const rel = base ? f.slice(base.length + 1) : f;
    const parts = rel.split("/");
    if (parts.length < 3 || !AREA_ROOTS.includes(parts[0]) || TEST_ROOTS.has(parts[1]) || isAside(f)) continue;
    if (/^(src|app)\/(main|test)$/.test(`${parts[0]}/${parts[1]}`)) continue; // JVM layout, read below
    const key = `${base ? base + "/" : ""}${parts[0]}/${parts[1]}`;
    // Already a unit, or the folder above units (a container, not an area).
    if (realUnits.some((x) => x.dir === key || under(x.dir, key))) continue;
    areas.set(key, (areas.get(key) ?? 0) + 1);
  }
  for (const u of realUnits.filter((x) => x.kinds.includes("jvm"))) {
    for (const [k, n] of jvmAreas(files.filter((f) => under(f, u.dir)), u.dir)) areas.set(k, n);
  }

  // Entry points: where a reader starts.
  const ENTRY = /^(main\.go|Program\.cs|Startup\.cs|manage\.py|wsgi\.py|asgi\.py|main\.dart|config\.ru|App\.(tsx|jsx|vue|svelte)|MainActivity\.(kt|java)|AppDelegate\.swift)$/;
  const UNIT_ENTRY = /^((src\/|app\/)?(main|index|server|app)\.([cm]?[jt]sx?|py)|src\/app\/layout\.(tsx|jsx)|pages\/_app\.(tsx|jsx)|app\/layout\.(tsx|jsx))$/;
  const entryPoints = [];
  for (const f of files) {
    if (isAside(f) || TEST_DIR.test(f)) continue;
    const u = unitOf(realUnits, f);
    const rel = u && u.dir ? f.slice(u.dir.length + 1) : f;
    if (ENTRY.test(baseOf(f)) || UNIT_ENTRY.test(rel) || /^[A-Z]\w*Application\.(java|kt)$/.test(baseOf(f))) entryPoints.push(f);
  }

  // Interfaces a capability or a contract is drawn from.
  const isSpecFile = (/** @type {string} */ f) => /(^|\/)[^/]*(openapi|swagger)[^/]*\.(ya?ml|json)$/i.test(f);
  const interfaces = {
    http: files.filter(isSpecFile),
    grpc: files.filter((f) => f.endsWith(".proto")),
    graphql: files.filter((f) => /\.(graphql|gql)$/.test(f)),
    events: files.filter((f) => /(^|\/)asyncapi[^/]*\.(ya?ml|json)$/i.test(f)),
    routeDirs: [...new Set(files.filter((f) => /\.(py|[cm]?[jt]sx?|go|java|kt|cs|rb|php)$/.test(f) && !TEST_DIR.test(f) && !isAside(f))
      .map(dirOf).filter((d) => /(^|\/)(routes|routers|controllers|handlers|endpoints|resolvers|api)$/i.test(d)))].sort(),
  };

  // Data: schemas and migrations — the shape of what the system stores.
  const data = {
    migrations: [...new Set(files.map(dirOf).filter((d) => /(^|\/)(migrations?|alembic\/versions|db\/migrate|db\/migration)$/i.test(d)))].sort()
      .map((d) => [d, files.filter((f) => dirOf(f) === d).length]),
    schemas: files.filter((f) => /(^|\/)(schema\.prisma|drizzle\.config\.[cm]?[jt]s|schema\.sql|.*\.dbml)$/.test(f)),
    sqlFiles: files.filter((f) => f.endsWith(".sql")).length,
  };

  const ci = CI_FILES.filter(([p]) => has(p)).map(([p, label]) => ({ path: p, label, files: isDir(path.join(root, p)) ? files.filter((f) => under(f, p)).length : 1 }));
  const dockerfiles = files.filter((f) => /^(Dockerfile|Containerfile)(\.[\w-]+)?$|\.Dockerfile$/.test(baseOf(f)));
  const infra = [];
  if (dockerfiles.length) infra.push({ label: "Docker", paths: dockerfiles });
  const compose = files.filter((f) => depth(dirOf(f)) <= 2 && /^(docker-)?compose(\.[\w-]+)?\.ya?ml$/.test(baseOf(f)));
  if (compose.length) infra.push({ label: "Docker Compose", paths: compose });
  const helm = files.filter((f) => baseOf(f) === "Chart.yaml").map(dirOf);
  if (helm.length) infra.push({ label: "Helm charts", paths: helm });
  const kustomize = files.filter((f) => /^kustomization\.ya?ml$/.test(baseOf(f))).map(dirOf);
  if (kustomize.length) infra.push({ label: "Kustomize", paths: kustomize.map((d) => d || ".") });
  const k8s = [...new Set(files.map((f) => f.split("/").slice(0, 2).join("/")).filter((d) => /(^|\/)(k8s|kubernetes|kubernetes-manifests|manifests)$/.test(d)))];
  if (k8s.length) infra.push({ label: "Kubernetes manifests", paths: k8s });
  const tfDirs = [...new Set(files.filter((f) => f.endsWith(".tf")).map(dirOf))];
  if (tfDirs.length) infra.push({ label: "Terraform", paths: tfDirs.map((d) => d || ".") });
  for (const [file, label] of [["skaffold.yaml", "Skaffold"], ["serverless.yml", "Serverless"], ["Procfile", "Procfile"],
    ["fly.toml", "Fly.io"], ["vercel.json", "Vercel"], ["netlify.toml", "Netlify"], ["render.yaml", "Render"], ["app.yaml", "App Engine"]]) {
    const found = files.filter((f) => baseOf(f) === file && depth(dirOf(f)) <= 2);
    if (found.length) infra.push({ label, paths: found });
  }

  const env = files.filter((f) => ENV_EXAMPLE.test(baseOf(f)) && depth(dirOf(f)) <= 3)
    .map((f) => ({ file: f, names: envNames(readText(root, f)) }));
  const envReal = files.filter((f) => ENV_REAL.test(baseOf(f)) && !ENV_EXAMPLE.test(baseOf(f)) && depth(dirOf(f)) <= 3);

  // What already explains the project: read it before writing a word.
  const docs = {
    readmes: files.filter((f) => /^readme(\.\w+)?$/i.test(baseOf(f)) && f.includes("/") && !isAside(dirOf(f))).slice(0, 30),
    docDirs: [...new Set(files.map((f) => f.split("/")[0]).filter((d) => /^(docs?|documentation|dev-docs|wiki|adr)$/i.test(d)))],
    adrs: [...new Set(files.filter((f) => /(^|\/)(adrs?|decisions|architecture\/decisions)\/[^/]+\.(md|adoc|rst)$/i.test(f)).map(dirOf))],
    files: files.filter((f) => /^(CHANGELOG|CONTRIBUTING|CODEOWNERS|ARCHITECTURE|SECURITY)(\.md)?$/i.test(baseOf(f)) && depth(dirOf(f)) <= 1),
    agents: files.filter((f) => /^(AGENTS\.md|CLAUDE\.md|GEMINI\.md|\.cursorrules|copilot-instructions\.md)$/.test(baseOf(f)) || /^\.cursor\/rules\//.test(f) || /^\.(claude|agents)\/(skills|agents|commands)\//.test(f)),
  };

  const topDirs = new Map();
  for (const f of files) {
    const top = f.includes("/") ? f.split("/")[0] : null;
    if (top) topDirs.set(top, (topDirs.get(top) ?? 0) + 1);
  }

  // Code no unit builds — none above it, or one that builds another
  // language (a Python script under a Node root): a fact to ask about.
  const KIND_OF_EXT = { py: "python", js: "node", mjs: "node", cjs: "node", ts: "node", tsx: "node", jsx: "node",
    go: "go", java: "jvm", kt: "jvm", cs: "dotnet", rb: "ruby", php: "php", rs: "rust", swift: "swift", dart: "dart", ex: "elixir", exs: "elixir" };
  const orphanCode = new Map();
  for (const f of files) {
    const kind = KIND_OF_EXT[baseOf(f).split(".").pop() ?? ""];
    if (!kind || isAside(f) || !f.includes("/") || TEST_DIR.test(f)) continue;
    const owner = unitOf(units, f);
    if (owner && owner.kinds.includes(kind)) continue;
    // A JS/TS file beside any JS-building unit above it is that unit's.
    if (kind === "node" && units.some((u) => u.kinds.includes("node") && under(f, u.dir))) continue;
    const where = dirOf(f).split("/").slice(0, 3).join("/");
    orphanCode.set(where, (orphanCode.get(where) ?? 0) + 1);
  }

  const git = gitFacts(root);
  return {
    root,
    files: files.length,
    truncated,
    skipped,
    readme: readmeSummary(root),
    languages: [...languages.entries()].sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0])).slice(0, 12),
    stack: [...stack].sort(),
    signals: [...signals].sort(),
    units: units.map(({ dir, kinds, name, signals: s, runner, example, manifests }) => ({
      dir, kinds, name, signals: s, runner, example, manifests,
      tests: testFiles.filter((f) => unitOf(units, f)?.dir === dir).length,
    })),
    workspaces,
    checks,
    otherCommands: commands.filter((c) => !c.seed),
    tests: { files: testFiles.length, dirs: [...testDirs.entries()].sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0])).slice(0, 12) },
    entryPoints: entryPoints.slice(0, 40),
    interfaces,
    data,
    ci,
    infra,
    env,
    envReal,
    docs,
    areas: [...areas.entries()].sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0])).slice(0, 40),
    topDirs: [...topDirs.entries()].sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0])).slice(0, 15),
    orphanCode: [...orphanCode.entries()].sort((a, b) => b[1] - a[1]),
    git,
  };
}

const list = (/** @type {string[]} */ items, max = 12) =>
  items.slice(0, max).map((x) => `\`${x}\``).join(", ") + (items.length > max ? `, … and ${items.length - max} more` : "");

/** The inventory as the Markdown body of an intake. */
export function inventoryMarkdown(inv, projectName) {
  const L = [];
  L.push(`Code inventory of ${projectName} — the FACTS an agent absorbs the project from.`);
  L.push("Written by `doctrina intake --from-code`: manifests read, files counted, nothing interpreted.");
  L.push("Every line names the file it was read from. Business intent is NOT in here:");
  L.push("what the code cannot say goes to the human as a question, never into a spec.");
  L.push("");
  if (inv.readme) {
    L.push(`## README (${inv.readme.file})`, "");
    if (inv.readme.title) L.push(`- Title: ${inv.readme.title}`);
    if (inv.readme.summary) L.push(`- Opening: ${inv.readme.summary}`);
    L.push("");
  }
  L.push("## Stack", "");
  L.push(`- Builds declared: ${inv.stack.length ? inv.stack.join(", ") : "none detected from manifests"}`);
  L.push(`- Languages written (files by extension): ${inv.languages.length ? inv.languages.map(([l, n]) => `${l} ${n}`).join(", ") : "none recognised"}`);
  L.push(`- Frameworks and tools (from the manifests' dependencies): ${inv.signals.length ? inv.signals.join(", ") : "none detected"}`);
  L.push(`- Files scanned: ${inv.files}${inv.truncated ? ` (stopped at ${MAX_FILES})` : ""}`);
  if (inv.git) {
    L.push(inv.git.shallow
      ? `- History: shallow clone — ${inv.git.commits} commit${inv.git.commits === 1 ? "" : "s"} fetched (${inv.git.first} → ${inv.git.last}); the project's real age and churn are not visible`
      : `- History: ${inv.git.commits} commit${inv.git.commits === 1 ? "" : "s"}, ${inv.git.first} → ${inv.git.last}`);
  }
  L.push("");
  const real = inv.units.filter((u) => !u.example);
  if (real.length > 1 || inv.workspaces.length) {
    L.push(`## Units (${real.length} directories that declare their own build)`, "");
    if (inv.workspaces.length) L.push(`- Workspace tooling: ${inv.workspaces.map((w) => `${w.tool} (\`${w.file}\`)`).join(", ")}`);
    for (const u of real.slice(0, 40)) {
      const bits = [u.kinds.map((k) => KIND_LABEL[k]).join(" + "), u.name ? `name \`${u.name}\`` : null,
        u.runner ? `runs with ${u.runner}` : null, u.signals.length ? u.signals.join(", ") : null,
        `${u.tests} test file${u.tests === 1 ? "" : "s"}`].filter(Boolean);
      L.push(`- \`${shown(u.dir)}\` — ${bits.join(" · ")} (${u.manifests.join(", ")})`);
    }
    if (real.length > 40) L.push(`- … and ${real.length - 40} more units`);
    const examples = inv.units.filter((u) => u.example);
    if (examples.length) L.push(`- Not counted as units (examples, fixtures, templates, docs): ${list(examples.map((u) => shown(u.dir)), 8)}`);
    L.push("");
  }
  L.push("## Where the code is", "");
  for (const [dir, n] of inv.topDirs) L.push(`- \`${dir}/\` — ${n} file${n === 1 ? "" : "s"}`);
  if (inv.topDirs.length === 0) L.push("- (flat repository)");
  L.push("");
  L.push("## Candidate areas (folder layout — a hint to read, not a capability yet)", "");
  for (const [dir, n] of inv.areas) L.push(`- \`${dir}/\` — ${n} file${n === 1 ? "" : "s"}`);
  if (inv.areas.length === 0) L.push("- none under the conventional roots — derive areas from the top-level folders");
  L.push("");
  L.push("## Entry points (start reading here)", "");
  for (const f of inv.entryPoints) L.push(`- \`${f}\``);
  if (inv.entryPoints.length === 0) L.push("- none recognised by name — find them from the manifests (`main`, `bin`, scripts)");
  L.push("");
  const i = inv.interfaces;
  L.push("## Interfaces (where the contracts between parts are written)", "");
  if (i.http.length) L.push(`- HTTP / OpenAPI: ${list(i.http)}`);
  if (i.grpc.length) L.push(`- gRPC / protobuf: ${list(i.grpc)}`);
  if (i.graphql.length) L.push(`- GraphQL: ${list(i.graphql)}`);
  if (i.events.length) L.push(`- Events / AsyncAPI: ${list(i.events)}`);
  if (i.routeDirs.length) L.push(`- Route / controller folders: ${list(i.routeDirs, 15)}`);
  if (!i.http.length && !i.grpc.length && !i.graphql.length && !i.events.length && !i.routeDirs.length) L.push("- none found by name");
  L.push("");
  L.push("## Data", "");
  for (const [d, n] of inv.data.migrations) L.push(`- Migrations: \`${d}/\` — ${n} file${n === 1 ? "" : "s"}`);
  if (inv.data.schemas.length) L.push(`- Schemas: ${list(inv.data.schemas)}`);
  if (inv.data.sqlFiles) L.push(`- SQL files: ${inv.data.sqlFiles}`);
  if (!inv.data.migrations.length && !inv.data.schemas.length && !inv.data.sqlFiles) L.push("- no migration, schema or SQL file found");
  L.push("");
  L.push("## Tests", "");
  L.push(`- ${inv.tests.files} test file${inv.tests.files === 1 ? "" : "s"}`);
  for (const [dir, n] of inv.tests.dirs) L.push(`- \`${dir}\` — ${n}`);
  L.push("");
  L.push("## Build and test commands", "");
  L.push("Seeded into `doctrina verify --init` (each returns on its own):");
  for (const ch of inv.checks) L.push(`- \`${ch.command}\`${ch.cwd ? ` in \`${ch.cwd}/\`` : ""} — ${ch.name}, from ${ch.from}`);
  if (inv.checks.length === 0) L.push("- none detected — ask the human how this project is built and tested");
  if (inv.otherCommands.length) {
    L.push("", "Also declared, NOT seeded:");
    for (const ch of inv.otherCommands.slice(0, 20)) L.push(`- \`${ch.command}\`${ch.cwd ? ` in \`${ch.cwd}/\`` : ""} — ${ch.why}, from ${ch.from}`);
    if (inv.otherCommands.length > 20) L.push(`- … and ${inv.otherCommands.length - 20} more`);
  }
  L.push("");
  L.push("## Delivery", "");
  for (const c of inv.ci) L.push(`- CI: ${c.label} (\`${c.path}\`${c.files > 1 ? `, ${c.files} files` : ""})`);
  for (const r of inv.infra) L.push(`- Runtime: ${r.label} — ${list(r.paths, 10)}`);
  if (inv.ci.length + inv.infra.length === 0) L.push("- no CI or runtime manifest found");
  L.push("");
  L.push("## Configuration (names only — values are never read)", "");
  for (const e of inv.env) L.push(`- \`${e.file}\`: ${e.names.length ? e.names.map((n) => `\`${n}\``).join(", ") : "(no KEY= lines)"}`);
  if (inv.env.length === 0) L.push("- no env example file");
  if (inv.envReal.length) L.push(`- Present and NOT read (may hold secrets): ${list(inv.envReal)}`);
  L.push("");
  const d = inv.docs;
  L.push("## Documentation that already exists (read it before writing a spec)", "");
  if (d.docDirs.length) L.push(`- Documentation folders: ${list(d.docDirs.map((x) => `${x}/`))}`);
  if (d.adrs.length) L.push(`- Architecture decisions: ${list(d.adrs.map((x) => `${x}/`))} — candidates for \`doctrina decision new\`, cited, not re-decided`);
  if (d.files.length) L.push(`- ${list(d.files)}`);
  if (d.readmes.length) L.push(`- READMEs below the root: ${list(d.readmes, 15)}`);
  if (d.agents.length) L.push(`- Agent instructions already written: ${list(d.agents, 10)}`);
  if (!d.docDirs.length && !d.adrs.length && !d.files.length && !d.readmes.length && !d.agents.length) L.push(inv.readme ? "- none beyond the root README" : "- none found — the repository has no README either");
  L.push("");
  L.push("## What this inventory could not see", "");
  L.push("- Why any rule exists, who the users are, what is out of scope — ask the human.");
  L.push("- Runtime behaviour, data in databases, private packages, code generated at build time.");
  if (inv.truncated) L.push(`- Everything after the first ${MAX_FILES} files: the scan stopped there.`);
  if (inv.skipped.length) L.push(`- Folders skipped as generated or vendored: ${list(inv.skipped.map((x) => `${x}/`), 10)}`);
  if (inv.git?.shallow) L.push("- The project's history: this clone is shallow.");
  if (inv.orphanCode.length) L.push(`- How this code is built — no manifest above it: ${inv.orphanCode.map(([dir, n]) => `\`${dir}/\` (${n} files)`).join(", ")}`);
  return L.join("\n") + "\n";
}

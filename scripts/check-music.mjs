// Harbor Learn — music content checker (fast, one grade band at a time):
//   node scripts/check-music.mjs            → every band
//   node scripts/check-music.mjs k1 g23     → just those content files (lib/learn/mus/content/<band>.ts)
// Builds the band's worlds exactly like the course does, then runs every item through the music
// rules (lib/learn/mus/check.ts), the skill-tag rule, review coverage (every skill can come back as
// a fresh item) and lesson-id uniqueness. Prints a per-world summary. The full checker
// (scripts/check-learn.mjs) runs all of this too, plus the drawings check.

import { mkdirSync, readdirSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { createRequire } from "node:module";
import { tmpdir } from "node:os";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..");
const require = createRequire(join(ROOT, "package.json"));
const ts = require("typescript");
const build = join(tmpdir(), "harbor-music-check");
rmSync(build, { recursive: true, force: true });
mkdirSync(build, { recursive: true });
for (const f of readdirSync(join(ROOT, "lib", "learn"), { recursive: true }).map(String).filter((f) => f.endsWith(".ts"))) {
  const src = readFileSync(join(ROOT, "lib", "learn", f), "utf8");
  mkdirSync(dirname(join(build, f)), { recursive: true });
  writeFileSync(join(build, f.replace(/\.ts$/, ".js")), ts.transpileModule(src, { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2020 } }).outputText);
}
const load = createRequire(join(build, "x.js"));
const { buildWorlds, makeItemsFor } = load("./gen.js");
const { musicProblems, songProblems } = load("./mus/check.js");

const bands = process.argv.slice(2).length ? process.argv.slice(2) : ["k1", "g23", "g45", "g6", "g78"];
let problems = 0;
const bad = (where, msg) => {
  problems++;
  if (problems <= 80) console.log("✗", where, "—", msg);
};
for (const p of songProblems()) bad("songs", p);
const ids = new Set();
let totalWorlds = 0;
let totalLevels = 0;
let totalItems = 0;
for (const band of bands) {
  let worlds;
  try {
    worlds = load(`./mus/content/${band}.js`).WORLDS;
  } catch (err) {
    bad(band, `failed to load: ${err.message}`);
    continue;
  }
  const units = buildWorlds("music", "mus", worlds, 0);
  const itemsFor = makeItemsFor(worlds);
  const kinds = new Map();
  for (const u of units) {
    let items = 0;
    for (const l of u.lessons) {
      if (ids.has(l.id)) bad(l.id, "duplicate lesson id");
      ids.add(l.id);
      if (!l.activities.length) bad(l.id, "empty lesson");
      l.activities.forEach((a, i) => {
        items++;
        kinds.set(a.kind, (kinds.get(a.kind) ?? 0) + 1);
        const where = `${l.id}#${i + 1} ${a.kind}`;
        if (!a.skill) bad(where, "no skill tag");
        else if (!a.skill.startsWith("u:")) bad(where, `skill ${a.skill} must start with u:`);
        for (const p of musicProblems(a)) bad(where, p);
        if (a.kind === "choice") {
          const optIds = a.options.map((o) => o.id);
          if (!optIds.includes(a.answer)) bad(where, `answer ${a.answer} not in ${optIds}`);
          if (new Set(optIds).size !== optIds.length) bad(where, "duplicate option ids");
        }
        if (a.kind === "sort") for (const it of a.items) if (!a.bins.some((b) => b.id === it.bin)) bad(where, `sort item ${it.id} → missing bin`);
      });
    }
    totalItems += items;
    totalLevels += u.lessons.length;
    console.log(`  ${band.padEnd(4)} ${u.grade.padEnd(4)} ${u.title.padEnd(34)} ${String(u.lessons.length).padStart(2)} levels ${String(items).padStart(3)} items${u.lessons.some((l) => l.unlocks?.length) ? "  unlocks: " + u.lessons.flatMap((l) => l.unlocks ?? []).join(", ") : ""}`);
  }
  totalWorlds += units.length;
  const skills = new Set(units.flatMap((u) => u.lessons.flatMap((l) => l.skills)));
  const empty = [...skills].filter((s) => !itemsFor(s, 3, `check:${s}`).length);
  if (empty.length) bad(band, `${empty.length} skill(s) can't be reviewed: ${empty.slice(0, 10).join(", ")}`);
  console.log(`  ${band}: kinds ${[...kinds.entries()].map(([k, n]) => `${k}×${n}`).join(" ")}`);
}
console.log(`\nmusic: ${totalWorlds} worlds · ${totalLevels} levels · ${totalItems} items`);
console.log(problems ? `${problems} problem(s)` : "All good.");
process.exit(problems ? 1 : 0);

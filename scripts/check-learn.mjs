// Harbor Learn content checker — run after editing any course:
//   node scripts/check-learn.mjs
// Proves every coding level's answer really wins (and every "fix the bug" program really fails),
// that every choice item's answer is among its options with no look-alike duplicates, that sort/
// match/order items are well-formed, that every skill can be brought back for review, and that
// lesson ids are unique. Exits non-zero on any problem.

import { mkdirSync, readdirSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { createRequire } from "node:module";
import { tmpdir } from "node:os";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..");
const require = createRequire(join(ROOT, "package.json"));
const ts = require("typescript");
const build = join(tmpdir(), "harbor-learn-check");
rmSync(build, { recursive: true, force: true });
mkdirSync(build, { recursive: true });
for (const f of readdirSync(join(ROOT, "lib", "learn")).filter((f) => f.endsWith(".ts"))) {
  const src = readFileSync(join(ROOT, "lib", "learn", f), "utf8");
  writeFileSync(join(build, f.replace(/\.ts$/, ".js")), ts.transpileModule(src, { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2020 } }).outputText);
}
const load = createRequire(join(build, "x.js"));
const t0 = Date.now();
const { COURSES } = load("./curriculum.js");
const loadMs = Date.now() - t0;
const { runLevel, blockCount } = load("./program.js");
const { genStats } = load("./codeGen.js");

let problems = 0;
const bad = (where, msg) => {
  problems++;
  if (problems <= 60) console.log("✗", where, "—", msg);
};

// ── Code ──
let levels = 0;
for (const u of COURSES.code.units)
  for (const l of u.lessons)
    l.activities.forEach((a, i) => {
      const lv = a.level;
      const where = `${l.id}#${i + 1} (${lv.sim}) ${lv.goal}`;
      levels++;
      const res = runLevel(lv, lv.solution);
      if (!res.won) bad(where, `answer doesn't win: ${JSON.stringify(res.results.map((r) => r.fail || (r.overflow ? "overflow" : "no-win")))}`);
      if (blockCount(lv.solution) > lv.best) bad(where, `answer uses ${blockCount(lv.solution)} blocks > best ${lv.best}`);
      if (lv.buggy && runLevel(lv, lv.buggy).won) bad(where, "the buggy program still wins");
      const ops = new Set();
      const walk = (p) => p.forEach((b) => (b.body || b.else ? (walk(b.body || []), walk(b.else || [])) : ops.add(b.op)));
      walk(lv.solution);
      for (const op of ops) if (op !== "call" && !lv.palette.includes(op)) bad(where, `palette is missing ${op}`);
      const json = JSON.stringify(lv.solution);
      if (json.includes('"repeat"') && !lv.loops) bad(where, "needs loops but none offered");
      if (json.includes('"until"') && !lv.untils) bad(where, "needs repeat-until but none offered");
      if ((json.includes('"if"') || json.includes('"ifelse"')) && !lv.ifs) bad(where, "needs if/else but none offered");
      if (json.includes('"def"') && !lv.funcs) bad(where, "needs functions but none offered");
      for (const m of lv.maps ?? []) if (new Set(m.map((r) => r.length)).size > 1) bad(where, `ragged map ${JSON.stringify(m)}`);
    });
if (genStats.fallbacks) bad("code", `${genStats.fallbacks} generated level(s) fell back to a plain map`);

// ── Everything else ──
for (const c of Object.values(COURSES)) {
  let items = 0;
  for (const u of c.units)
    for (const l of u.lessons) {
      if (!l.activities.length) bad(l.id, "empty lesson");
      l.activities.forEach((a, i) => {
        items++;
        const where = `${l.id}#${i + 1} ${a.kind}`;
        if (!a.skill) bad(where, "no skill tag");
        if (a.kind === "choice" || a.kind === "scenario") {
          const ids = a.options.map((o) => o.id);
          if (new Set(ids).size !== ids.length) bad(where, `duplicate options ${ids}`);
          if (!ids.includes(a.answer)) bad(where, `answer ${a.answer} not in ${ids}`);
          if (a.options.length < 2) bad(where, "fewer than 2 options");
          const faces = a.options.map((o) => `${o.text ?? ""}|${o.emoji ?? ""}|${JSON.stringify(o.visual ?? null)}`);
          if (new Set(faces).size !== faces.length) bad(where, `options look identical ${faces}`);
        }
        if (a.kind === "keypad" && !Number.isFinite(a.answer)) bad(where, "keypad answer isn't a number");
        if (a.kind === "sort") {
          const bins = new Set(a.bins.map((b) => b.id));
          for (const it of a.items) if (!bins.has(it.bin)) bad(where, `item ${it.id} → missing bin ${it.bin}`);
          if (new Set(a.items.map((x) => x.id)).size !== a.items.length) bad(where, "duplicate sort ids");
        }
        if (a.kind === "order" && new Set(a.items.map((x) => x.id)).size !== a.items.length) bad(where, "duplicate order ids");
        if (a.kind === "match") {
          const as = a.pairs.map((p) => p.a.id);
          const bs = a.pairs.map((p) => p.b.id);
          if (new Set(as).size !== as.length || new Set(bs).size !== bs.length) bad(where, "duplicate match ids");
        }
        if (a.kind === "build" && a.word.word.length > a.tiles.join("").length) bad(where, "build: not enough tiles");
        if (a.kind === "find-letter" && !a.options.includes(a.letter)) bad(where, "find-letter: answer missing");
        if ((a.kind === "first-sound" || a.kind === "rhyme") && !a.options.some((o) => o.word === a.answer)) bad(where, `${a.kind}: answer missing`);
        if (a.kind === "read-word" && !a.options.includes(a.word)) bad(where, "read-word: answer missing");
        if (a.kind === "count" && !a.options.includes(a.n)) bad(where, "count: answer missing");
        if (a.kind === "add" && !a.options.includes(a.a + a.b)) bad(where, "add: answer missing");
        if (a.kind === "blend" && !a.options.some((o) => o.word === a.word.word)) bad(where, "blend: answer missing");
        if (a.kind === "verse") {
          const words = a.text.split(/\s+/).filter(Boolean).map((t) => t.replace(/^[^A-Za-z']*|[^A-Za-z']*$/g, ""));
          const v = a.v;
          if (v.step === "blanks") {
            if (!v.blanks.length) bad(where, "verse: no blanks");
            for (const b of v.blanks) {
              if (!v.blanks.every((x, i, all) => i === 0 || all[i - 1].at < x.at)) bad(where, "verse: blanks out of order");
              if (!b.options.includes(words[b.at])) bad(where, `verse: blank ${b.at} answer "${words[b.at]}" not in ${b.options}`);
              if (new Set(b.options.map((o) => o.toLowerCase())).size !== b.options.length) bad(where, `verse: duplicate blank options ${b.options}`);
              if (b.options.length < 2) bad(where, "verse: fewer than 2 blank options");
            }
          }
          if (v.step === "tiles") {
            if (v.chunks.join(" ") !== a.text.split(/\s+/).filter(Boolean).join(" ")) bad(where, `verse: tiles don't rebuild the verse`);
            if (v.chunks.length < 2) bad(where, "verse: fewer than 2 tiles");
            for (const d of v.decoys ?? []) if (v.chunks.includes(d)) bad(where, "verse: a decoy is also a real piece");
          }
          if (v.step === "ref" && (!v.options.includes(a.ref) || new Set(v.options).size !== v.options.length || v.options.length < 2)) bad(where, `verse: bad ref options ${v.options}`);
          if (v.step === "meaning" && (!v.options.includes(v.answer) || new Set(v.options).size !== v.options.length)) bad(where, "verse: bad meaning options");
        }
        if (a.kind === "spot") {
          if (a.lines.length < 2) bad(where, "spot: fewer than 2 lines");
          if (!a.answer.length || a.answer.some((i) => i < 0 || i >= a.lines.length) || new Set(a.answer).size !== a.answer.length) bad(where, `spot: bad answer ${a.answer}`);
          if (a.answer.length >= a.lines.length) bad(where, "spot: every line is an answer");
        }
        if (a.kind === "slots") {
          if (!a.slots.length) bad(where, "slots: none");
          for (const s of a.slots) if (!s.options.includes(s.answer) || new Set(s.options).size !== s.options.length || s.options.length < 2) bad(where, `slots: bad options ${s.options}`);
        }
        if (a.kind === "reflect" && a.options.length < 2) bad(where, "reflect: fewer than 2 options");
        if (a.kind === "story") {
          if (a.scenes.length < 2) bad(where, "story: fewer than 2 scenes");
          for (const sc of a.scenes) {
            const act = sc.act;
            if (!act) continue;
            if (act.type === "tap" && !(act.n >= 1)) bad(where, "story: tap needs n ≥ 1");
            if (act.type === "find" && (act.decoys.includes(act.target) || act.decoys.length < 2)) bad(where, "story: find target is also a decoy (or too few decoys)");
            if (act.type === "collect" && !act.items.length) bad(where, "story: collect has no items");
          }
        }
        if (a.kind === "scenario") for (const o of a.options) if (o.then && !o.then.text) bad(where, "scenario: empty consequence");
      });
    }
  if (c.itemsFor) {
    const skills = new Set(c.units.flatMap((u) => u.lessons.flatMap((l) => l.skills)));
    const empty = [...skills].filter((s) => !c.itemsFor(s, 3, `check:${s}`).length);
    if (empty.length) bad(c.id, `${empty.length} skill(s) can't be reviewed: ${empty.slice(0, 8).join(", ")}`);
  }
  const lessons = c.units.reduce((n, u) => n + u.lessons.length, 0);
  console.log(`${c.id.padEnd(8)} ${String(c.units.length).padStart(3)} worlds ${String(lessons).padStart(4)} levels ${String(items).padStart(5)} items`);
}
const ids = new Set();
for (const c of Object.values(COURSES)) for (const u of c.units) for (const l of u.lessons) {
  if (ids.has(l.id)) bad(l.id, "duplicate lesson id");
  ids.add(l.id);
}
console.log(`code puzzles: ${levels} · loaded in ${loadMs}ms`);
console.log(problems ? `\n${problems} problem(s)` : "\nAll good.");
process.exit(problems ? 1 : 0);

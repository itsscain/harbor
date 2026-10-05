// Harbor Learn content checker — run after editing any course:
//   node scripts/check-learn.mjs
// Proves every coding level's answer really wins (and every "fix the bug" program really fails),
// that every choice item's answer is among its options with no look-alike duplicates, that sort/
// match/order items are well-formed, that every skill can be brought back for review, that every
// Python Peek program really prints (or crashes) the way the lesson says (learn-python.mjs), that
// lesson ids are unique, and that every emoji Learn shows has a drawing (learn-art.mjs). Exits
// non-zero on any problem.

import { mkdirSync, readdirSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { createRequire } from "node:module";
import { tmpdir } from "node:os";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { pythonProblems, pythonSelfTest } from "./learn-python.mjs";

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..");
const require = createRequire(join(ROOT, "package.json"));
const ts = require("typescript");
const build = join(tmpdir(), "harbor-learn-check");
rmSync(build, { recursive: true, force: true });
mkdirSync(build, { recursive: true });
for (const f of readdirSync(join(ROOT, "lib", "learn"), { recursive: true }).map(String).filter((f) => f.endsWith(".ts"))) {
  const src = readFileSync(join(ROOT, "lib", "learn", f), "utf8");
  mkdirSync(dirname(join(build, f)), { recursive: true });
  writeFileSync(join(build, f.replace(/\.ts$/, ".js")), ts.transpileModule(src, { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2020 } }).outputText);
}
const load = createRequire(join(build, "x.js"));
const t0 = Date.now();
const { COURSES } = load("./curriculum.js");
const loadMs = Date.now() - t0;
const { runLevel, blockCount } = load("./program.js");
const { genStats } = load("./codeGen.js");
const lab = load("./codelab.js");
const { expand } = load("./codeLabContent.js");

let problems = 0;
const bad = (where, msg) => {
  problems++;
  if (problems <= 60) console.log("✗", where, "—", msg);
};
for (const p of pythonSelfTest()) bad("python interpreter", p);

// ── Code ──
let levels = 0;
for (const u of COURSES.code.units)
  for (const l of u.lessons)
    l.activities.forEach((a, i) => {
      if (a.kind !== "code") return;
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
        if (!a.skill && a.kind !== "concept") bad(where, "no skill tag");
        checkLab(a, where);
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
function checkLab(a, where) {
  const distinct = (xs) => new Set(xs).size === xs.length;
  switch (a.kind) {
    case "concept":
      if (a.lines.length < 2) bad(where, "concept: fewer than 2 lines");
      break;
    case "predict": {
      const r = runLevel(a.level, a.program).results[0];
      if (a.ask === "end") {
        if (!r || r.fail) bad(where, "predict: the program crashes");
        const f = r?.final;
        const m = a.level.maps?.[0] ?? [];
        if (!f || f.x < 0 || f.y < 0 || f.y >= m.length || f.x >= m[0].length) bad(where, "predict: ends off the map");
      }
      if (a.ask === "count" && expand(a.program).length !== a.answer) bad(where, `predict: count ${a.answer} ≠ ${expand(a.program).length}`);
      if (a.ask === "count" && r?.fail) bad(where, "predict: the counted program fails its own target");
      if (a.ask === "pick") {
        const wins = (a.options ?? []).filter((o) => runLevel(a.level, o).won).length;
        if (wins !== 1) bad(where, `predict: ${wins} winning options (need exactly 1)`);
        if (!distinct((a.options ?? []).map((o) => JSON.stringify(o)))) bad(where, "predict: duplicate options");
      }
      break;
    }
    case "loopfind": {
      const chunk = a.ops.slice(0, a.unit);
      const body = a.ops.slice(0, a.unit * a.times);
      if (a.times < 2 || !body.every((o, k) => o === chunk[k % a.unit])) bad(where, "loopfind: the ops don't repeat the chunk");
      let per = a.unit;
      for (let q = 1; q < a.unit; q++) if (chunk.every((x, k) => x === chunk[k % q])) { per = q; break; }
      if (per !== a.unit) bad(where, "loopfind: the chunk itself repeats (ambiguous)");
      const keys = [chunk, ...a.decoys].map((d) => d.join(","));
      if (a.decoys.length < 2 || !distinct(keys)) bad(where, "loopfind: decoys missing or equal to the answer");
      break;
    }
    case "recipe": {
      const ids = a.steps.map((x) => x.id);
      if (!distinct(ids)) bad(where, "recipe: duplicate step ids");
      for (const x of a.steps) for (const n of x.needs ?? []) if (!ids.includes(n)) bad(where, `recipe: ${x.id} needs unknown ${n}`);
      if (!lab.recipeAnswer(a.steps).length) bad(where, "recipe: no order works");
      if (lab.recipeFail(ids, a.steps) !== -1) bad(where, "recipe: the written order doesn't work");
      if (a.buggy && lab.recipeFail(a.buggy, a.steps) < 0) bad(where, "recipe: the buggy order works");
      if (a.steps.every((x) => !x.needs?.length)) bad(where, "recipe: order doesn't matter at all");
      break;
    }
    case "factory": {
      const binIds = a.bins.map((b) => b.id);
      for (const r of a.answer) if (!a.conds.some((c) => c.id === r.cond) || !binIds.includes(r.bin)) bad(where, "factory: answer uses a missing cond or bin");
      if (!binIds.includes(a.elseBin)) bad(where, "factory: else bin missing");
      if (!distinct(a.items.map((x) => x.id))) bad(where, "factory: duplicate items");
      const used = new Set(a.items.map((it) => lab.route(it, a.answer, a.elseBin, a.conds)));
      if (used.size !== binIds.length) bad(where, `factory: only ${used.size} of ${binIds.length} bins get items`);
      if (lab.factoryWins(a.items, [], a.elseBin, a.conds, a.answer, a.elseBin)) bad(where, "factory: everything-to-else already wins");
      break;
    }
    case "variable":
      if (lab.runVar(a.lines).value !== a.answer) bad(where, "variable: answer doesn't match the program");
      if (!a.options.includes(a.answer) || !distinct(a.options) || a.options.length < 2) bad(where, `variable: bad options ${a.options}`);
      break;
    case "events": {
      const sp = a.sprites.map((x) => x.id);
      const ac = a.actions.map((x) => x.id);
      if (!distinct(sp) || !distinct(ac)) bad(where, "events: duplicate sprites or actions");
      for (const g of a.goal) if (!sp.includes(g.sprite) || !ac.includes(g.action)) bad(where, "events: goal uses a missing sprite or action");
      if (a.goal.length !== a.sprites.length) bad(where, "events: every sprite needs a goal");
      break;
    }
    case "binary":
      if (a.target < 1 || a.target > 2 ** a.bits - 1) bad(where, "binary: target out of range");
      if (a.mode === "read" && (!a.options?.includes(a.target) || !distinct(a.options))) bad(where, "binary: bad read options");
      break;
    case "search":
      if (a.max < 4 || a.limit < Math.ceil(Math.log2(a.max + 1))) bad(where, "search: limit is impossible");
      break;
    case "swapsort":
      if (a.values.every((v, k) => k === 0 || a.values[k - 1] <= v)) bad(where, "swapsort: already sorted");
      break;
    case "cipher": {
      const dec = a.mode === "shift" ? lab.shiftText(a.coded, -(a.shift ?? 1)) : null;
      if (dec !== null && dec !== a.answer) bad(where, `cipher: decodes to ${dec}, not ${a.answer}`);
      if (!a.options.includes(a.answer) || !distinct(a.options)) bad(where, "cipher: bad options");
      if (a.mode === "symbol" && !(a.key ?? []).length) bad(where, "cipher: no key");
      break;
    }
    case "logic":
      if (!["AND", "OR", "NOT"].includes(a.gate)) bad(where, "logic: unknown gate");
      break;
    case "machine":
      for (const [x, y] of a.examples) if (lab.applyMachine(a.steps, x) !== y) bad(where, "machine: an example breaks the rule");
      if (a.mode === "output" && String(lab.applyMachine(a.steps, a.input)) !== a.answer) bad(where, "machine: wrong output answer");
      if (a.mode === "rule" && lab.machineText(a.steps) !== a.answer) bad(where, "machine: wrong rule answer");
      if (!a.options.includes(a.answer) || !distinct(a.options) || a.options.length < 2) bad(where, `machine: bad options ${a.options}`);
      break;
    case "coderead":
      if (!a.lines.length || !a.output.length || !a.why) bad(where, "coderead: missing code, output or why");
      if (!a.options.includes(a.answer) || !distinct(a.options) || a.options.length < 3) bad(where, `coderead: bad options ${a.options}`);
      if (/^What does this print/.test(a.question) && a.output.join("\n") !== a.answer) bad(where, `coderead: answer ${a.answer} is not the output ${a.output}`);
      if (a.fix) {
        const f = a.fix;
        if (a.answer !== `Line ${f.line}` || !a.lines[f.line - 1]?.trim()) bad(where, "coderead: the bug line doesn't match the answer");
        if (a.lines[f.line - 1] === f.code) bad(where, "coderead: the fix doesn't change the line");
        if (!f.output.length || f.output.join("\n") === a.output.join("\n")) bad(where, "coderead: the fix doesn't change the output");
      }
      // Run it for real: the shown output, the answer and the fix must be what Python does.
      for (const p of pythonProblems(a)) bad(where, `python: ${p}`);
      break;
    case "plot": {
      const [x, y] = a.target;
      if (x < 0 || y < 0 || x >= a.cols || y >= a.rows) bad(where, "plot: target off the grid");
      if (a.mode === "read" && (!a.options?.includes(`(${x}, ${y})`) || !distinct(a.options))) bad(where, "plot: bad options");
      break;
    }
    case "lab": {
      const sp = a.spec;
      if (["float", "magnet", "circuit"].includes(sp.lab)) {
        if (sp.things.length < 2 || !distinct(sp.things.map((t) => t.id))) bad(where, "lab: needs 2+ distinct things");
        for (const t of sp.things) if (!t.why) bad(where, `lab: ${t.id} has no explanation`);
      }
      if (sp.lab === "states" && sp.goal === sp.start) bad(where, "lab: states goal = start");
      if (sp.lab === "plant" && !sp.need.length) bad(where, "lab: plant needs nothing");
      break;
    }
  }
}

const ids = new Set();
for (const c of Object.values(COURSES)) for (const u of c.units) for (const l of u.lessons) {
  if (ids.has(l.id)) bad(l.id, "duplicate lesson id");
  ids.add(l.id);
}
console.log(`code puzzles: ${levels} · loaded in ${loadMs}ms`);

// ── Pictures: every emoji Learn shows must have a drawing (Learn never shows the emoji font) ──
{
  const { execFileSync } = await import("node:child_process");
  try {
    const out = execFileSync(process.execPath, [join(ROOT, "scripts", "learn-art.mjs"), "missing", "--strict"], { encoding: "utf8" });
    console.log(out.split("\n")[0]);
  } catch (err) {
    const out = String(err.stdout ?? "");
    bad("pictures", `${out.split("\n")[0]} — draw them in components/kiosk/learn/art/pics (see STYLE.md): ${out.split("\n")[1] ?? ""}`);
  }
}
console.log(problems ? `\n${problems} problem(s)` : "\nAll good.");
process.exit(problems ? 1 : 0);

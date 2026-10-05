// Harbor Learn pictures — review and coverage.
//   node scripts/learn-art.mjs sheet <category|all> [...]   contact sheets (PNG) of the drawings
//   node scripts/learn-art.mjs show 🍎 🐶 …                  just these, big
//   node scripts/learn-art.mjs missing [--strict]           emoji Learn shows that have no drawing
// Sheets go to <tmp>/harbor-art-sheets (or --out <dir>). Each tile shows the drawing big, a 36px
// copy (top right — it must still read that small) and its number + name.

import { mkdirSync, readdirSync, readFileSync, rmSync, writeFileSync, existsSync } from "node:fs";
import { createRequire } from "node:module";
import { tmpdir } from "node:os";
import { dirname, join, relative } from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..");
const require = createRequire(join(ROOT, "package.json"));
const ts = require("typescript");

const args = process.argv.slice(2);
const cmd = args[0] ?? "sheet";
const outIdx = args.indexOf("--out");
const OUT = outIdx >= 0 ? args[outIdx + 1] : join(tmpdir(), "harbor-art-sheets");
const rest = args.slice(1).filter((a, i, all) => a !== "--out" && all[i - 1] !== "--out" && !a.startsWith("--"));

/** Transpile a folder of .ts to CommonJS in a temp dir and return a require for it. */
function compile(srcDir, name) {
  const build = join(tmpdir(), `harbor-${name}-${process.pid}`);
  rmSync(build, { recursive: true, force: true });
  mkdirSync(build, { recursive: true });
  for (const f of readdirSync(srcDir, { recursive: true }).map(String).filter((f) => f.endsWith(".ts"))) {
    const src = readFileSync(join(srcDir, f), "utf8");
    mkdirSync(dirname(join(build, f)), { recursive: true });
    writeFileSync(join(build, f.replace(/\.ts$/, ".js")), ts.transpileModule(src, { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2020 } }).outputText);
  }
  return { load: createRequire(join(build, "x.js")), build };
}

const ART_DIR = join(ROOT, "components", "kiosk", "learn", "art");
const art = compile(ART_DIR, "art");
const pen = art.load("./pen.js");
const picKey = (e) => e.replace(/️/g, "").replace(/[\u{1F3FB}-\u{1F3FF}]/gu, "").trim();
// Each category loads on its own, so one file that's mid-edit can't break the others.
const CATEGORIES = {};
for (const f of readdirSync(join(ART_DIR, "pics")).filter((f) => f.endsWith(".ts"))) {
  const name = f.replace(/\.ts$/, "");
  try {
    const m = art.load(`./pics/${name}.js`);
    CATEGORIES[name] = Object.values(m).find(Array.isArray) ?? [];
  } catch (err) {
    console.log(`✗ pics/${f} doesn't load: ${String(err.message).split("\n")[0]}`);
    CATEGORIES[name] = [];
  }
}
const BY = new Map();
for (const list of Object.values(CATEGORIES)) for (const def of list) if (!BY.has(picKey(def[0]))) BY.set(picKey(def[0]), def);
const hasPic = (e) => BY.has(picKey(e));

const esc = (s) => String(s).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");

async function sheet(title, defs, size = 112) {
  const sharp = require("sharp");
  mkdirSync(OUT, { recursive: true });
  const T = size + 20;
  const L = 18;
  const cols = size > 150 ? 4 : 8;
  const perPage = cols * (size > 150 ? 3 : 6);
  const files = [];
  for (let p = 0; p * perPage < defs.length; p++) {
    const page = defs.slice(p * perPage, (p + 1) * perPage);
    const rows = Math.ceil(page.length / cols);
    const W = cols * T + 16;
    const H = rows * (T + L) + 40;
    const bg = [`<svg xmlns="http://www.w3.org/2000/svg" width="${W}" height="${H}"><rect width="${W}" height="${H}" fill="#e6f0f8"/>`, `<text x="12" y="26" font-family="Segoe UI, Arial" font-size="17" font-weight="700" fill="#2a2f45">${esc(title)}${defs.length > perPage ? ` · page ${p + 1}` : ""}</text>`];
    const comps = [];
    for (let i = 0; i < page.length; i++) {
      const [e, name] = page[i];
      const x = 8 + (i % cols) * T;
      const y = 36 + Math.floor(i / cols) * (T + L);
      bg.push(`<rect x="${x + 2}" y="${y + 2}" width="${T - 4}" height="${T - 4}" rx="14" fill="#ffffff"/>`);
      bg.push(`<text x="${x + T / 2}" y="${y + T + 12}" text-anchor="middle" font-family="Segoe UI, Arial" font-size="12" fill="#2a2f45">${p * perPage + i + 1}. ${esc(name)}</text>`);
      try {
        const a = pen.draw(page[i][2]);
        const big = await sharp(Buffer.from(a.svg)).resize(size, size, { fit: "contain", background: { r: 0, g: 0, b: 0, alpha: 0 } }).png().toBuffer();
        comps.push({ input: big, left: x + 10, top: y + 10 });
        if (size <= 150) {
          const mini = await sharp(Buffer.from(a.svg)).resize(34, 34, { fit: "contain", background: { r: 0, g: 0, b: 0, alpha: 0 } }).png().toBuffer();
          comps.push({ input: mini, left: x + T - 40, top: y + 4 });
        }
      } catch (err) {
        bg.push(`<text x="${x + 12}" y="${y + 60}" font-family="Segoe UI, Arial" font-size="12" fill="#d00">ERROR: ${esc(String(err.message).slice(0, 40))}</text>`);
        console.log(`✗ ${e} ${name}: ${err.message}`);
      }
    }
    bg.push("</svg>");
    const file = join(OUT, `${title.replace(/[^a-z0-9-]+/gi, "_")}${defs.length > perPage ? `-${p + 1}` : ""}.png`);
    await sharp(Buffer.from(bg.join(""))).composite(comps).png().toFile(file);
    files.push(file);
  }
  return files;
}

/** Every emoji Harbor Learn shows: lesson content, collections, and the Learn screens' code. */
function usedEmoji() {
  const seg = new Intl.Segmenter(undefined, { granularity: "grapheme" });
  const isEmoji = (g) => /\p{Extended_Pictographic}|\p{Regional_Indicator}|⃣/u.test(g);
  const count = new Map();
  const add = (s, where) => {
    for (const { segment: g } of seg.segment(s)) {
      if (!isEmoji(g) || /^[©®™]$/.test(g)) continue;
      const k = picKey(g);
      if (!count.has(k)) count.set(k, { e: g, n: 0, where: new Set() });
      const o = count.get(k);
      o.n++;
      o.where.add(where);
    }
  };
  // Lesson content and collections, as the app builds them.
  const lib = compile(join(ROOT, "lib", "learn"), "learn");
  const walk = (v, where, depth = 0) => {
    if (depth > 30 || v == null) return;
    if (typeof v === "string") return add(v, where);
    if (typeof v === "function") return;
    if (Array.isArray(v)) return v.forEach((x) => walk(x, where, depth + 1));
    if (typeof v === "object") for (const x of Object.values(v)) walk(x, where, depth + 1);
  };
  const { COURSES } = lib.load("./curriculum.js");
  for (const c of Object.values(COURSES)) for (const u of c.units) walk(u, `${c.id}`);
  for (const f of ["stickers", "badges", "heroes", "meta", "reef", "bible", "aquarium", "skills", "parent"]) {
    try {
      walk(Object.values(lib.load(`./${f}.js`)), f);
    } catch {
      /* not every module loads standalone */
    }
  }
  // The Learn screens (string literals in the code).
  const ui = join(ROOT, "components", "kiosk", "learn");
  for (const f of readdirSync(ui, { recursive: true }).map(String).filter((f) => /\.(tsx?|ts)$/.test(f) && !f.startsWith("art") && !f.startsWith("tank"))) {
    add(readFileSync(join(ui, f), "utf8"), `ui:${f.replace(/\\/g, "/")}`);
  }
  return [...count.values()].sort((a, b) => b.n - a.n);
}

if (cmd === "sheet") {
  const want = rest.length && rest[0] !== "all" ? rest : Object.keys(CATEGORIES);
  if (args.includes("--merge")) {
    const defs = want.flatMap((c) => CATEGORIES[c] ?? []);
    console.log((await sheet(want.length > 1 ? "all" : want[0], defs)).join("\n"));
    process.exit(0);
  }
  for (const c of want) {
    const defs = CATEGORIES[c];
    if (!defs) {
      console.log(`no category "${c}" (have: ${Object.keys(CATEGORIES).join(", ")})`);
      continue;
    }
    if (!defs.length) {
      console.log(`${c}: empty`);
      continue;
    }
    const files = await sheet(c, defs);
    console.log(`${c}: ${defs.length} pictures → ${files.join(", ")}`);
  }
} else if (cmd === "show") {
  const all = Object.values(CATEGORIES).flat();
  const defs = rest.map((e) => all.find((d) => picKey(d[0]) === picKey(e))).filter(Boolean);
  const files = await sheet("show", defs, 220);
  console.log(files.join("\n"));
} else if (cmd === "missing") {
  const used = usedEmoji();
  const miss = used.filter((u) => !hasPic(u.e));
  const total = used.reduce((s, u) => s + u.n, 0);
  const missN = miss.reduce((s, u) => s + u.n, 0);
  console.log(`Learn shows ${used.length} different emoji (${total} times). Drawn: ${used.length - miss.length}. Missing: ${miss.length} (${missN} times).`);
  if (miss.length) console.log(miss.map((u) => `${u.e}${u.n}`).join(" "));
  if (args.includes("--where")) for (const u of miss.slice(0, 80)) console.log(u.e, u.n, [...u.where].slice(0, 6).join(", "));
  if (args.includes("--json")) writeFileSync(join(OUT, "missing.json"), JSON.stringify(miss.map((u) => ({ e: u.e, n: u.n, where: [...u.where] })), null, 1));
  if (args.includes("--strict") && miss.length) process.exit(1);
} else {
  console.log("usage: node scripts/learn-art.mjs sheet <category|all> | show <emoji…> | missing [--strict]");
}
rmSync(art.build, { recursive: true, force: true });
void existsSync;
void relative;

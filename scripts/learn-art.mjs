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
} else if (cmd === "pets") {
  console.log((await petSheet(rest)).join("\n"));
} else if (cmd === "gear") {
  console.log((await gearSheet()).join("\n"));
} else {
  console.log("usage: node scripts/learn-art.mjs sheet <category|all> | show <emoji…> | missing [--strict] | pets [ids…]");
}

/** Living pets in their poses — the CSS motions frozen at their extremes, so a part that
 *  detaches when it turns (a wing, a tail, an ear) shows up on the sheet. */
async function petSheet(ids) {
  const sharp = require("sharp");
  const kit = compileSome(join(ROOT, "components", "kiosk", "learn"), ["art", "boat"], "pets");
  const { PET_RIGS, petInner } = kit.load("./boat/pets/index.js");
  const rigs = ids.length ? PET_RIGS.filter((p) => ids.some((i) => p.id.includes(i))) : PET_RIGS;
  const POSES = {
    idle: {},
    blink: { eyes: "s:1,0.1" },
    cheer: { all: "t:0,-12", armL: "r:115", armR: "r:-115", tail: "r:12", show: ["happy", "open"], hide: ["eyes", "mouth"] },
    oops: { head: "r:-11", earL: "r:-18", earR: "r:18" },
    sleep: { head: "r:6", show: ["sleep"], hide: ["eyes"] },
  };
  const TRICK = {
    spin: { turn: "s:-1,1" }, flip: { turn: "r:160", all: "t:0,-26" }, jump: { all: "t:0,-28" },
    flap: { armL: "r:65", armR: "r:-65", all: "t:0,-14" }, wave: { armR: "r:-140" },
    dance: { all: "r:-10", armL: "r:115", armR: "r:-115" }, shake: { all: "t:-5,0" },
    roar: { head: "s:1.12,1.12", show: ["open"], hide: ["mouth"] },
    hide: { head: "s:0.15,0.15", armL: "s:0.15,0.15", armR: "s:0.15,0.15", tail: "s:0.15,0.15" }, bounce: { all: "t:0,-14" },
  };
  const tf = (op, px, py) => {
    if (!op) return "";
    const [k, v] = op.split(":");
    const n = v.split(",").map(Number);
    if (k === "r") return `rotate(${n[0]} ${px} ${py})`;
    if (k === "s") return `translate(${px} ${py}) scale(${n[0]} ${n[1]}) translate(${-px} ${-py})`;
    return `translate(${n[0]} ${n[1]})`;
  };
  const pose = (inner, p) =>
    `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 -20 100 120"><g transform="${tf(p.all, 50, 92)}"><g transform="${tf(p.turn, 50, 56)}">` +
    inner.replace(/<g class="pp-(\w+)" style="transform-origin:([-\d.]+)px ([-\d.]+)px">/g, (m, name, px, py) => {
      const hidden = (p.hide ?? []).includes(name) || (["happy", "sleep", "open"].includes(name) && !(p.show ?? []).includes(name));
      return `<g class="pp-${name}"${p[name] ? ` transform="${tf(p[name], +px, +py)}"` : ""}${hidden ? ` display="none"` : ""}>`;
    }) +
    `</g></g></svg>`;
  mkdirSync(OUT, { recursive: true });
  if (args.includes("--big")) {
    // Each pet's resting pose, big, to check the details.
    const B = 300;
    const shots = await Promise.all(
      rigs.map(async (rig, i) => ({
        input: await sharp(Buffer.from(pose(petInner(rig.id), {}))).resize(B, B, { fit: "contain", background: { r: 255, g: 255, b: 255, alpha: 1 } }).png().toBuffer(),
        left: 10 + (i % 4) * (B + 10),
        top: 10 + Math.floor(i / 4) * (B + 10),
      })),
    );
    const file = join(OUT, `pets-big${ids.length ? "-" + ids.join("-").replace(/[^a-z0-9-]+/gi, "") : ""}.png`);
    await sharp({ create: { width: 10 + Math.min(4, rigs.length) * (B + 10), height: 10 + Math.ceil(rigs.length / 4) * (B + 10), channels: 4, background: "#e6f0f8" } }).composite(shots).png().toFile(file);
    rmSync(kit.build, { recursive: true, force: true });
    return [file];
  }
  const S = 130;
  const cols = 8;
  const W = cols * (S + 10) + 20;
  const H = rigs.length * (S + 34) + 40;
  const bg = [`<svg xmlns="http://www.w3.org/2000/svg" width="${W}" height="${H}"><rect width="${W}" height="${H}" fill="#e6f0f8"/><text x="12" y="26" font-family="Segoe UI, Arial" font-size="17" font-weight="700" fill="#2a2f45">pets · ${rigs.length}</text>`];
  const comps = [];
  for (let r = 0; r < rigs.length; r++) {
    const rig = rigs[r];
    const inner = petInner(rig.id);
    const shots = [...Object.entries(POSES), ...rig.tricks.slice(0, 2).map((t) => [t, TRICK[t] ?? {}])];
    const y = 36 + r * (S + 34);
    for (let c = 0; c < shots.length; c++) {
      const x = 10 + c * (S + 10);
      bg.push(`<rect x="${x}" y="${y}" width="${S}" height="${S}" rx="14" fill="#ffffff"/>`);
      bg.push(`<text x="${x + S / 2}" y="${y + S + 15}" text-anchor="middle" font-family="Segoe UI, Arial" font-size="12" fill="#2a2f45">${c === 0 ? esc(rig.id) + " · " : ""}${shots[c][0]}</text>`);
      const png = await sharp(Buffer.from(pose(inner, shots[c][1]))).resize(S - 8, S - 8, { fit: "contain", background: { r: 0, g: 0, b: 0, alpha: 0 } }).png().toBuffer();
      comps.push({ input: png, left: x + 4, top: y + 4 });
    }
    const x = 10 + shots.length * (S + 10);
    bg.push(`<rect x="${x}" y="${y}" width="56" height="56" rx="10" fill="#ffffff"/>`);
    const mini = await sharp(Buffer.from(pose(inner, {}))).resize(46, 46, { fit: "contain", background: { r: 0, g: 0, b: 0, alpha: 0 } }).png().toBuffer();
    comps.push({ input: mini, left: x + 5, top: y + 5 });
  }
  bg.push("</svg>");
  const file = join(OUT, `pets${ids.length ? "-" + ids.join("-").replace(/[^a-z0-9-]+/gi, "") : ""}.png`);
  await sharp(Buffer.from(bg.join(""))).composite(comps).png().toFile(file);
  rmSync(kit.build, { recursive: true, force: true });
  return [file];
}

/** Figureheads and deck gear: each board big (its fixing point marked red), and each one placed on
 *  a little sloop the way the boat renderer places it. */
async function gearSheet() {
  const sharp = require("sharp");
  const kit = compileSome(join(ROOT, "components", "kiosk", "learn"), ["art", "boat"], "gear");
  const { FIGUREHEADS, GEAR, partInner } = kit.load("./boat/gear.js");
  const ids = [...Object.keys(FIGUREHEADS), ...Object.keys(GEAR)];
  const ANCHOR = (id) => (id.startsWith("fig-") ? [10, 30] : id === "gear-ring" ? [20, 20] : id === "gear-anchor" ? [20, 4] : id === "gear-nest" ? [20, 22] : [20, 38]);
  const SPOT = { "gear-ring": [96, 108], "gear-anchor": [119, 98], "gear-nest": [64, 44], "gear-bell": [112, 92], "gear-telescope": [110, 92], "gear-lantern": [26, 95], "gear-wheel": [30, 95] };
  const hull = "M14 94 Q70 99 128 90 Q120 118 100 121 L40 121 Q20 117 14 94 Z";
  const S = 150;
  const cols = 6;
  const cells = [];
  for (const id of ids) {
    const inner = partInner(id);
    const [ax, ay] = ANCHOR(id);
    cells.push({ label: id, svg: `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 40 40"><rect width="40" height="40" fill="#f6f9fc"/>${inner}<circle cx="${ax}" cy="${ay}" r="1.2" fill="#ff2d55"/></svg>` });
    const k = id.startsWith("fig-") ? 26 / 40 : id === "gear-nest" ? 30 / 40 : 22 / 40;
    const [sx, sy] = id.startsWith("fig-") ? [128, 90] : SPOT[id] ?? [84, 95];
    const mast = `<rect x="62" y="20" width="4.5" height="76" rx="2" fill="#a0652c" stroke="#2a2f45" stroke-width="2"/>`;
    cells.push({
      label: `${id} on board`,
      svg: `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 140 140"><rect width="140" height="140" fill="#dff3ff"/>${mast}<path d="${hull}" fill="#ff7363" stroke="#2a2f45" stroke-width="3"/><g transform="translate(${sx - ax * k} ${sy - ay * k}) scale(${k})">${inner}</g></svg>`,
    });
  }
  mkdirSync(OUT, { recursive: true });
  const W = cols * (S + 10) + 10;
  const H = Math.ceil(cells.length / cols) * (S + 28) + 10;
  const bg = [`<svg xmlns="http://www.w3.org/2000/svg" width="${W}" height="${H}"><rect width="${W}" height="${H}" fill="#e6f0f8"/>`];
  const comps = [];
  for (let i = 0; i < cells.length; i++) {
    const x = 10 + (i % cols) * (S + 10);
    const y = 10 + Math.floor(i / cols) * (S + 28);
    bg.push(`<text x="${x + S / 2}" y="${y + S + 16}" text-anchor="middle" font-family="Segoe UI, Arial" font-size="11" fill="#2a2f45">${esc(cells[i].label)}</text>`);
    comps.push({ input: await sharp(Buffer.from(cells[i].svg)).resize(S, S).png().toBuffer(), left: x, top: y });
  }
  bg.push("</svg>");
  const file = join(OUT, "gear.png");
  await sharp(Buffer.from(bg.join(""))).composite(comps).png().toFile(file);
  rmSync(kit.build, { recursive: true, force: true });
  return ids.length ? [file] : ["(nothing drawn yet)"];
}

/** Like compile(), for only some sub-folders of a folder (keeping their relative paths). */
function compileSome(baseDir, subdirs, name) {
  const build = join(tmpdir(), `harbor-${name}-${process.pid}`);
  rmSync(build, { recursive: true, force: true });
  for (const sub of subdirs)
    for (const f of readdirSync(join(baseDir, sub), { recursive: true }).map(String).filter((f) => f.endsWith(".ts"))) {
      const rel = join(sub, f);
      mkdirSync(dirname(join(build, rel)), { recursive: true });
      writeFileSync(join(build, rel.replace(/\.ts$/, ".js")), ts.transpileModule(readFileSync(join(baseDir, rel), "utf8"), { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2020 } }).outputText);
    }
  return { load: createRequire(join(build, "x.js")), build };
}
rmSync(art.build, { recursive: true, force: true });
void existsSync;
void relative;

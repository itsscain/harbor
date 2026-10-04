// A tiny Python interpreter for checking Python Peek content (used by check-learn.mjs). It runs
// the small subset the lessons use — numbers, strings, lists, + - * // % **, comparisons, and/or/
// not, if/elif/else, for … in range(), while, def/return, print, len, max, min, append — and
// reports the crashes real Python would hit: IndexError, IndentationError (a block with nothing
// indented under it), SyntaxError (e.g. `if x = 5:`), plus a step limit for endless loops.

const PREC = { or: 1, and: 2, "<": 4, ">": 4, "<=": 4, ">=": 4, "==": 4, "!=": 4, "+": 5, "-": 5, "*": 6, "%": 6, "//": 6, "**": 8 };

function tokenize(s) {
  const out = [];
  const re = /\s*(?:(\d+)|("[^"]*")|([A-Za-z_]\w*)|(\*\*|>=|<=|==|!=|\/\/|[-+*%<>()[\],.:=]))/y;
  while (re.lastIndex < s.length) {
    const at = re.lastIndex;
    const m = re.exec(s);
    if (!m) {
      if (/^\s*$/.test(s.slice(at))) break;
      throw new SyntaxError(`can't read: ${s.slice(at)}`);
    }
    if (m[1]) out.push({ k: "num", v: Number(m[1]) });
    else if (m[2]) out.push({ k: "str", v: m[2].slice(1, -1) });
    else if (m[3]) out.push({ k: "name", v: m[3] });
    else out.push({ k: "op", v: m[4] });
  }
  return out;
}

/** Pratt parser for one expression. */
function parseExpr(tokens) {
  let i = 0;
  const peek = () => tokens[i];
  const take = (v) => {
    const t = tokens[i++];
    if (!t || (v !== undefined && t.v !== v)) throw new SyntaxError(`expected ${v ?? "more"}, got ${t?.v}`);
    return t;
  };
  const list = (close) => {
    const items = [];
    while (peek()?.v !== close) {
      items.push(expr(0));
      if (peek()?.v === ",") take(",");
      else break;
    }
    take(close);
    return items;
  };
  function primary() {
    const t = take();
    if (t.k === "num" || t.k === "str") return { k: "lit", v: t.v };
    if (t.k === "name") {
      if (t.v === "True" || t.v === "False") return { k: "lit", v: t.v === "True" };
      if (t.v === "not") return { k: "not", a: expr(3) };
      return { k: "name", v: t.v };
    }
    if (t.v === "(") {
      const e = expr(0);
      take(")");
      return e;
    }
    if (t.v === "[") return { k: "list", items: list("]") };
    if (t.v === "-") return { k: "neg", a: expr(7) };
    throw new SyntaxError(`unexpected ${t.v}`);
  }
  function postfix(e) {
    for (;;) {
      const v = peek()?.v;
      if (v === "(") {
        take("(");
        e = { k: "call", f: e, args: list(")") };
      } else if (v === "[") {
        take("[");
        const ix = expr(0);
        take("]");
        e = { k: "index", a: e, i: ix };
      } else if (v === ".") {
        take(".");
        e = { k: "attr", a: e, name: take().v };
      } else return e;
    }
  }
  function expr(min) {
    let left = postfix(primary());
    for (;;) {
      const t = peek();
      const op = t && (t.k === "op" || t.v === "and" || t.v === "or") ? t.v : null;
      const p = op ? PREC[op] : undefined;
      if (p === undefined || p <= min) return left;
      take();
      // ** groups to the right; everything else to the left.
      left = { k: "bin", op, a: left, b: expr(op === "**" ? p - 1 : p) };
    }
  }
  const e = expr(0);
  if (i !== tokens.length) throw new SyntaxError(`invalid syntax near ${tokens[i].v}`);
  return e;
}
const E = (s) => parseExpr(tokenize(s));

class IndentError extends Error {}

/** Statements, nested by indentation. */
function parseProgram(lines) {
  const src = lines.map((l) => ({ ind: l.match(/^ */)[0].length, text: l.trim() })).filter((l) => l.text);
  let pos = 0;
  function block(ind) {
    const out = [];
    while (pos < src.length && src[pos].ind === ind) {
      const { text } = src[pos++];
      const body = () => {
        if (pos >= src.length || src[pos].ind <= ind) throw new IndentError(`expected an indented block after: ${text}`);
        return block(src[pos].ind);
      };
      let m;
      if ((m = text.match(/^for (\w+) in (.+):$/))) out.push({ t: "for", v: m[1], it: E(m[2]), body: body() });
      else if ((m = text.match(/^while (.+):$/))) out.push({ t: "while", c: E(m[1]), body: body() });
      else if ((m = text.match(/^if (.+):$/))) {
        const branches = [[E(m[1]), body()]];
        for (;;) {
          const nx = src[pos];
          if (!nx || nx.ind !== ind) break;
          const em = nx.text.match(/^elif (.+):$/);
          if (em) {
            pos++;
            branches.push([E(em[1]), body()]);
          } else if (nx.text === "else:") {
            pos++;
            branches.push([null, body()]);
            break;
          } else break;
        }
        out.push({ t: "if", branches });
      } else if ((m = text.match(/^def (\w+)\(([^)]*)\):$/))) out.push({ t: "def", name: m[1], params: m[2].split(",").map((p) => p.trim()).filter(Boolean), body: body() });
      else if ((m = text.match(/^return (.+)$/))) out.push({ t: "return", e: E(m[1]) });
      else if ((m = text.match(/^(\w+) (\+|-|\*)= (.+)$/))) out.push({ t: "aug", name: m[1], op: m[2], e: E(m[3]) });
      else if ((m = text.match(/^(\w+) = (.+)$/))) out.push({ t: "set", name: m[1], e: E(m[2]) });
      else out.push({ t: "expr", e: E(text) });
    }
    return out;
  }
  const prog = block(0);
  if (pos !== src.length) throw new IndentError(`unexpected indent: ${src[pos].text}`);
  return prog;
}

const repr = (v) => (typeof v === "string" ? `'${v}'` : show(v));
/** How print() shows a value. */
function show(v) {
  if (v === true) return "True";
  if (v === false) return "False";
  if (v === null || v === undefined) return "None";
  if (Array.isArray(v)) return `[${v.map(repr).join(", ")}]`;
  return String(v);
}
const truthy = (v) => (Array.isArray(v) ? v.length > 0 : Boolean(v));
function binop(op, a, b) {
  switch (op) {
    case "+":
      if (Array.isArray(a) && Array.isArray(b)) return [...a, ...b];
      if (typeof a !== typeof b) throw new TypeError(`can't add ${typeof a} and ${typeof b}`);
      return a + b;
    case "-": return a - b;
    case "*":
      if (typeof a === "string" && typeof b === "number") return a.repeat(b);
      if (typeof a === "number" && typeof b === "number") return a * b;
      throw new TypeError(`can't multiply ${typeof a} by ${typeof b}`);
    case "%": return ((a % b) + b) % b;
    case "//": return Math.floor(a / b);
    case "**": return a ** b;
    case "<": return a < b;
    case ">": return a > b;
    case "<=": return a <= b;
    case ">=": return a >= b;
    case "==": return a === b;
    case "!=": return a !== b;
  }
  throw new SyntaxError(`unknown operator ${op}`);
}

/** Run a program. Returns what it printed and, if it crashed, the Python error name
 *  ("IndexError", "IndentationError", "SyntaxError", "TypeError", …) or "loop" for an endless loop. */
export function runPython(lines, maxSteps = 10000) {
  const out = [];
  const globals = new Map();
  let steps = 0;
  const get = (env, n) => {
    for (let e = env; e; e = e.parent) if (e.vars.has(n)) return e.vars.get(n);
    throw new ReferenceError(`name '${n}' is not defined`);
  };
  function ev(x, env) {
    switch (x.k) {
      case "lit": return x.v;
      case "name": return get(env, x.v);
      case "list": return x.items.map((i) => ev(i, env));
      case "not": return !truthy(ev(x.a, env));
      case "neg": return -ev(x.a, env);
      case "bin": {
        if (x.op === "and") {
          const a = ev(x.a, env);
          return truthy(a) ? ev(x.b, env) : a;
        }
        if (x.op === "or") {
          const a = ev(x.a, env);
          return truthy(a) ? a : ev(x.b, env);
        }
        return binop(x.op, ev(x.a, env), ev(x.b, env));
      }
      case "index": {
        const a = ev(x.a, env);
        const i = ev(x.i, env);
        if (i < 0 || i >= a.length) throw new RangeError("IndexError");
        return a[i];
      }
      case "attr": throw new SyntaxError("attribute without a call");
      case "call": {
        const args = x.args.map((a) => ev(a, env));
        if (x.f.k === "attr") {
          const obj = ev(x.f.a, env);
          if (x.f.name === "append" && Array.isArray(obj)) return void obj.push(args[0]);
          throw new TypeError(`no method ${x.f.name}`);
        }
        if (x.f.k === "name" && !envHas(env, x.f.v)) {
          switch (x.f.v) {
            case "print":
              out.push(args.map(show).join(" "));
              return null;
            case "range": {
              const [lo, hi] = args.length === 1 ? [0, args[0]] : args;
              return Array.from({ length: Math.max(0, hi - lo) }, (_, i) => lo + i);
            }
            case "len": return args[0].length;
            case "max": return Math.max(...(args.length === 1 ? args[0] : args));
            case "min": return Math.min(...(args.length === 1 ? args[0] : args));
          }
        }
        const fn = ev(x.f, env);
        if (!fn?.fn) throw new TypeError("not callable");
        const local = { vars: new Map(fn.params.map((p, i) => [p, args[i]])), parent: { vars: globals } };
        try {
          exec(fn.body, local);
        } catch (e) {
          if (e && typeof e === "object" && "ret" in e) return e.ret;
          throw e;
        }
        return null;
      }
    }
    throw new SyntaxError(`unknown expression ${x.k}`);
  }
  const envHas = (env, n) => {
    for (let e = env; e; e = e.parent) if (e.vars.has(n)) return true;
    return false;
  };
  function exec(stmts, env) {
    for (const s of stmts) {
      if (++steps > maxSteps) throw new Error("loop");
      switch (s.t) {
        case "set": env.vars.set(s.name, ev(s.e, env)); break;
        case "aug": env.vars.set(s.name, binop(s.op, get(env, s.name), ev(s.e, env))); break;
        case "expr": ev(s.e, env); break;
        case "for":
          for (const v of ev(s.it, env)) {
            env.vars.set(s.v, v);
            exec(s.body, env);
          }
          break;
        case "while":
          while (truthy(ev(s.c, env))) {
            if (++steps > maxSteps) throw new Error("loop");
            exec(s.body, env);
          }
          break;
        case "if":
          for (const [c, body] of s.branches)
            if (c === null || truthy(ev(c, env))) {
              exec(body, env);
              break;
            }
          break;
        case "def": env.vars.set(s.name, { fn: true, params: s.params, body: s.body }); break;
        case "return": throw { ret: ev(s.e, env) };
      }
    }
  }
  let prog;
  try {
    prog = parseProgram(lines);
  } catch (e) {
    return { out, error: e instanceof IndentError ? "IndentationError" : "SyntaxError" };
  }
  try {
    exec(prog, { vars: globals });
  } catch (e) {
    const name = e?.message === "loop" ? "loop" : e instanceof RangeError ? "IndexError" : e instanceof TypeError ? "TypeError" : e instanceof ReferenceError ? "NameError" : `crash: ${e?.message}`;
    return { out, error: name };
  }
  return { out };
}

/** The interpreter checks itself against results known from real Python. */
export function pythonSelfTest() {
  const cases = [
    [["x = 3", "x = x + 4", "print(x)"], ["7"]],
    [['print("ho" * 3)'], ["hohoho"]],
    [["for i in range(2, 5):", "    print(i)"], ["2", "3", "4"]],
    [["bag = []", "for i in range(3):", "    bag.append(i)", "print(bag)"], ["[0, 1, 2]"]],
    [["print(7 % 2 == 1 and 3 > 2)"], ["True"]],
    [["print(17 // 5, 2 ** 3 ** 2, max(4, 9, 2))"], ["3 512 9"]],
    [["def f(n):", "    if n > 2:", "        return n", "    return 0", "", "print(f(5) + f(1))"], ["5"]],
    [["s = 75", "if s >= 90:", '    print("a")', "elif s >= 70:", '    print("b")', "else:", '    print("c")'], ["b"]],
    [['p = ["a", "b"]', "print(p[2])"], "IndexError"],
    [["for i in range(2):", 'print("*")'], "IndentationError"],
    [["x = 1", "if x = 1:", '    print("y")'], "SyntaxError"],
    [["n = 1", "while n > 0:", "    n = n + 1"], "loop"],
  ];
  const problems = [];
  for (const [lines, want] of cases) {
    const r = runPython(lines);
    const got = typeof want === "string" ? r.error : r.error ?? r.out.join("|");
    if (got !== (typeof want === "string" ? want : want.join("|"))) problems.push(`self-test ${lines.join(" / ")}: got ${got}`);
  }
  return problems;
}

/** What the right answer must be for each kind of Python Peek question, from the real output. */
function answerFrom(q, out) {
  if (/^What does this print/.test(q)) return out.join("\n");
  const times = q.match(/^How many times does it print "(.*)"\?$/);
  if (times) return String(out.filter((o) => o === times[1]).length);
  if (q === "What is the LAST number it prints?") return out[out.length - 1];
  if (q === "How many stars does it print?") return String(out.filter((o) => o === "*").length);
  if (q === "How many numbers does it print?") return String(out.length);
  return undefined;
}

/** Problems with one `coderead` activity: its shown output, answer and fix must match real Python. */
export function pythonProblems(a) {
  const problems = [];
  const res = runPython(a.lines);
  if (a.fix) {
    // The broken run must be exactly what's shown: a crash, an endless loop, or wrong output.
    const last = a.output[a.output.length - 1] ?? "";
    if (res.error === "loop") {
      const shown = a.output.slice(0, -1);
      if (!last.includes("never stops") || res.out.slice(0, shown.length).join("|") !== shown.join("|")) problems.push(`endless loop shown wrong: ${a.output}`);
    } else if (res.error) {
      const want = [...res.out, res.error].join("|");
      const shown = [...a.output.slice(0, -1), last.split(":")[0]].join("|");
      if (want !== shown) problems.push(`crash shown wrong: real ${want}, shown ${a.output}`);
    } else if (res.out.join("|") !== a.output.join("|")) problems.push(`buggy output shown wrong: real ${res.out}, shown ${a.output}`);
    // The fixed program must run cleanly and print the goal.
    const fixed = runPython(a.lines.map((l, i) => (i === a.fix.line - 1 ? a.fix.code : l)));
    if (fixed.error || fixed.out.join("|") !== a.fix.output.join("|")) problems.push(`the fix gives ${fixed.error ?? fixed.out}, not ${a.fix.output}`);
    return problems;
  }
  if (res.error) return [`the program crashes (${res.error})`];
  if (res.out.join("\n") !== a.output.join("\n")) problems.push(`shown output ${a.output} but Python prints ${res.out}`);
  const right = answerFrom(a.question, res.out);
  if (right === undefined) problems.push(`unknown question: ${a.question}`);
  else {
    if (right !== a.answer) problems.push(`answer ${a.answer} but Python says ${right}`);
    for (const o of a.options) if (o !== a.answer && o === right) problems.push(`wrong option ${o} is actually right`);
  }
  return problems;
}

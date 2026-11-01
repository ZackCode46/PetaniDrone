(function (root) {
  "use strict";
  var OP = "op";
  function E(ln, m) { return new Error("Baris " + ln + ": " + m); }
  function wrap(x, ln) {
    if (x && x.message && !/^Baris/.test(x.message)) x.message = "Baris " + ln + ": " + x.message;
    return x;
  }

  function tokenize(s, ln) {
    var t = [], m, re = /\s*(?:(\d+(?:\.\d+)?)|([A-Za-z_]\w*)|("[^"]*"|'[^']*')|(==|!=|<=|>=|\/\/|\*\*|\+=|-=|\*=|\/=|[-+*\/%<>=(),:]))/y;
    s = s.replace(/#.*$/, "");
    while (re.lastIndex < s.length) {
      if (/^\s*$/.test(s.slice(re.lastIndex))) break;
      m = re.exec(s);
      if (!m) throw E(ln, "karakter tidak dikenal");
      if (m[1] !== undefined) t.push({ k: "num", v: parseFloat(m[1]) });
      else if (m[2] !== undefined) t.push({ k: "id", v: m[2] });
      else if (m[3] !== undefined) t.push({ k: "str", v: m[3].slice(1, -1) });
      else t.push({ k: "op", v: m[4] });
    }
    return t;
  }

  function mk(tk, ln) {
    var i = 0;
    var P = {
      done: function () { return i >= tk.length; },
      next: function () { if (i >= tk.length) throw E(ln, "ekspresi tidak lengkap"); return tk[i++]; },
      is: function (v) { return i < tk.length && (tk[i].k === "op" || tk[i].k === "id") && tk[i].v === v; },
      eat: function (v) { if (!P.is(v)) throw E(ln, "seharusnya '" + v + "'"); i++; },
      end: function () { if (i < tk.length) throw E(ln, "token tak terduga: " + tk[i].v); },
      expr: function () { return orE(); }
    };
    function bin(o, l, r) { return { t: "bin", o: o, l: l, r: r, ln: ln }; }
    function orE() { var l = andE(); while (P.is("or")) { i++; l = { t: "or", l: l, r: andE() }; } return l; }
    function andE() { var l = notE(); while (P.is("and")) { i++; l = { t: "and", l: l, r: notE() }; } return l; }
    function notE() { if (P.is("not")) { i++; return { t: "not", e: notE() }; } return cmp(); }
    function cmp() {
      var l = add();
      while (tk[i] && tk[i].k === "op" && /^(==|!=|<|>|<=|>=)$/.test(tk[i].v)) { var o = tk[i++].v; l = bin(o, l, add()); }
      return l;
    }
    function add() { var l = mul(); while (P.is("+") || P.is("-")) { var o = tk[i++].v; l = bin(o, l, mul()); } return l; }
    function mul() {
      var l = un();
      while (P.is("*") || P.is("/") || P.is("//") || P.is("%")) { var o = tk[i++].v; l = bin(o, l, un()); }
      return l;
    }
    function un() { if (P.is("-")) { i++; return { t: "neg", e: un() }; } return pw(); }
    function pw() { var l = prim(); if (P.is("**")) { i++; return bin("**", l, un()); } return l; }
    function prim() {
      var t = P.next();
      if (t.k === "num" || t.k === "str") return { t: "lit", v: t.v };
      if (t.k === "op" && t.v === "(") { var e = orE(); P.eat(")"); return e; }
      if (t.k === "id") {
        if (t.v === "True") return { t: "lit", v: true };
        if (t.v === "False") return { t: "lit", v: false };
        if (t.v === "None") return { t: "lit", v: null };
        if (P.is("(")) {
          i++;
          var a = [];
          while (!P.is(")")) { a.push(orE()); if (P.is(",")) i++; else break; }
          P.eat(")");
          return { t: "call", n: t.v, a: a, ln: ln };
        }
        return { t: "name", n: t.v, ln: ln };
      }
      throw E(ln, "token tak terduga: " + t.v);
    }
    return P;
  }

  function parse(src) {
    var items = [], pos = 0;
    src.split("\n").forEach(function (raw, i) {
      if (/^\s*(#.*)?$/.test(raw)) return;
      items.push({ ind: /^\s*/.exec(raw)[0].replace(/\t/g, "    ").length, ln: i + 1, tk: tokenize(raw, i + 1) });
    });
    function block(ind) {
      var out = [];
      while (pos < items.length && items[pos].ind === ind) out.push(stmt(ind));
      if (pos < items.length && items[pos].ind > ind) throw E(items[pos].ln, "indentasi tidak sesuai");
      return out;
    }
    function body(ind, ln) {
      var n = items[pos];
      if (!n || n.ind <= ind) throw E(ln, "butuh blok kode setelah ':'");
      return block(n.ind);
    }
    function head(P) { var c = P.expr(); P.eat(":"); P.end(); return c; }
    function stmt(ind) { var l0 = items[pos].ln, st = stmt0(ind); if (!st.ln) st.ln = l0; return st; }
    function stmt0(ind) {
      var it = items[pos++], P = mk(it.tk, it.ln), f = it.tk[0], kw = f.k === "id" ? f.v : "", ln = it.ln;
      if (kw === "if") {
        P.next();
        var node = { t: "if", c: head(P), b: body(ind, ln), e: null }, cur = node;
        while (pos < items.length && items[pos].ind === ind && items[pos].tk[0].k === "id" && /^(elif|else)$/.test(items[pos].tk[0].v)) {
          var j = items[pos++], Q = mk(j.tk, j.ln), w = Q.next().v;
          if (w === "elif") { var n2 = { t: "if", c: head(Q), b: body(ind, j.ln), e: null }; cur.e = [n2]; cur = n2; }
          else { Q.eat(":"); Q.end(); cur.e = body(ind, j.ln); break; }
        }
        return node;
      }
      if (kw === "while") { P.next(); return { t: "while", c: head(P), b: body(ind, ln) }; }
      if (kw === "for") {
        P.next(); var v = P.next().v; P.eat("in");
        return { t: "for", v: v, i: head(P), b: body(ind, ln) };
      }
      if (kw === "def") {
        P.next(); var name = P.next().v, ps = []; P.eat("(");
        while (!P.is(")")) { ps.push(P.next().v); if (P.is(",")) P.next(); else break; }
        P.eat(")"); P.eat(":"); P.end();
        return { t: "def", n: name, p: ps, b: body(ind, ln) };
      }
      if (kw === "return") { P.next(); var e = P.done() ? null : P.expr(); P.end(); return { t: "ret", e: e }; }
      if (/^(break|continue|pass)$/.test(kw)) { P.next(); P.end(); return { t: kw }; }
      if (f.k === "id" && it.tk[1] && it.tk[1].k === "op" && /^(=|\+=|-=|\*=|\/=)$/.test(it.tk[1].v)) {
        var nm = P.next().v, op = P.next().v, ex = P.expr(); P.end();
        return { t: "set", n: nm, op: op, e: ex, ln: ln };
      }
      var x = P.expr(); P.end();
      return { t: "expr", e: x };
    }
    var prog = block(items.length ? items[0].ind : 0);
    if (pos < items.length) throw E(items[pos].ln, "indentasi tidak sesuai");
    return prog;
  }

  function get(env, n, ln) {
    for (var s = env; s; s = s.p) if (n in s.v) return s.v[n];
    var lc = n.toLowerCase(), hint = "";
    for (var q = env; q; q = q.p) for (var k in q.v) if (k.toLowerCase() === lc) hint = " (maksudmu '" + k + "'?)";
    throw E(ln, "nama '" + n + "' belum didefinisikan" + hint);
  }
  function arith(o, a, b, ln) {
    if ((o === "/" || o === "//" || o === "%") && b === 0) throw E(ln, "pembagian dengan nol");
    switch (o) {
      case "+": return a + b; case "-": return a - b; case "*": return a * b;
      case "/": return a / b; case "//": return Math.floor(a / b);
      case "%": return ((a % b) + b) % b; case "**": return Math.pow(a, b);
      case "==": return a === b; case "!=": return a !== b;
      case "<": return a < b; case ">": return a > b; case "<=": return a <= b; case ">=": return a >= b;
    }
  }

  function* ev(e, env, R) {
    switch (e.t) {
      case "lit": return e.v;
      case "name": return get(env, e.n, e.ln);
      case "neg": return -(yield* ev(e.e, env, R));
      case "not": return !(yield* ev(e.e, env, R));
      case "or": { var a = yield* ev(e.l, env, R); return a ? a : yield* ev(e.r, env, R); }
      case "and": { var b = yield* ev(e.l, env, R); return b ? yield* ev(e.r, env, R) : b; }
      case "bin": { var l = yield* ev(e.l, env, R), r = yield* ev(e.r, env, R); return arith(e.o, l, r, e.ln); }
      case "call": {
        var f = get(env, e.n, e.ln), args = [];
        for (var k = 0; k < e.a.length; k++) args.push(yield* ev(e.a[k], env, R));
        if (typeof f === "function") {
          try {
            var res = f.apply(null, args);
            if (res && typeof res.next === "function") res = yield* res;
            return res;
          } catch (x) { throw wrap(x, e.ln); }
        }
        if (f && f.def) {
          if (++R.depth > 200) throw E(e.ln, "rekursi terlalu dalam");
          var loc = { v: {}, p: f.env };
          f.def.p.forEach(function (pn, ix) { loc.v[pn] = args[ix] === undefined ? null : args[ix]; });
          var sig = yield* run(f.def.b, loc, R);
          R.depth--;
          return sig && sig.k === "ret" ? sig.v : null;
        }
        throw E(e.ln, "'" + e.n + "' bukan fungsi");
      }
    }
  }

  function* run(body, env, R) {
    for (var i = 0; i < body.length; i++) {
      var s = body[i], sig;
      R.line = s.ln;
      switch (s.t) {
        case "expr": yield* ev(s.e, env, R); break;
        case "set": {
          var v = yield* ev(s.e, env, R);
          if (s.op !== "=") v = arith(s.op[0], get(env, s.n, s.ln), v, s.ln);
          env.v[s.n] = v; break;
        }
        case "def": env.v[s.n] = { def: s, env: env }; break;
        case "if":
          sig = (yield* ev(s.c, env, R)) ? yield* run(s.b, env, R) : (s.e ? yield* run(s.e, env, R) : null);
          if (sig) return sig;
          break;
        case "while":
          while (yield* ev(s.c, env, R)) {
            yield OP;
            sig = yield* run(s.b, env, R);
            if (sig) { if (sig.k === "break") break; if (sig.k === "ret") return sig; }
          }
          break;
        case "for": {
          var list = yield* ev(s.i, env, R);
          if (!Array.isArray(list)) throw new Error("for hanya bisa memakai range(...)");
          for (var j = 0; j < list.length; j++) {
            env.v[s.v] = list[j];
            yield OP;
            sig = yield* run(s.b, env, R);
            if (sig) { if (sig.k === "break") break; if (sig.k === "ret") return sig; }
          }
          break;
        }
        case "ret": return { k: "ret", v: s.e ? yield* ev(s.e, env, R) : null };
        case "break": return { k: "break" };
        case "continue": return { k: "continue" };
      }
    }
    return null;
  }

  function range(a, b, c) {
    var s = 0, e = a, st = c || 1, o = [];
    if (b !== undefined) { s = a; e = b; }
    for (var i = s; st > 0 ? i < e : i > e; i += st) { o.push(i); if (o.length > 100000) break; }
    return o;
  }

  function* callGen(f, args, R) {
    var loc = { v: {}, p: f.env };
    f.def.p.forEach(function (pn, ix) { loc.v[pn] = args[ix] === undefined ? null : args[ix]; });
    yield* run(f.def.b, loc, R);
  }
  var api = {
    OP: OP,
    // Throws on syntax error; returns a generator that yields OP / "tick" markers.
    run: function (src, builtins) {
      var ast = parse(src), vars = Object.assign({ range: range }, builtins);
      var R = { depth: 0, line: 0 }, g = run(ast, { v: vars, p: null }, R);
      g.R = R;
      return g;
    },
    // Start a user-defined function (def) as its own generator (used by spawn_drone).
    spawn: function (f, args) {
      if (!(f && f.def)) throw new Error("spawn_drone butuh nama fungsi buatanmu (def)");
      var R = { depth: 0, line: f.def.b[0] ? f.def.b[0].ln : 0 }, g = callGen(f, args || [], R);
      g.R = R;
      return g;
    }
  };
  if (typeof module !== "undefined" && module.exports) module.exports = api;
  else root.PyLite = api;
})(typeof window !== "undefined" ? window : globalThis);

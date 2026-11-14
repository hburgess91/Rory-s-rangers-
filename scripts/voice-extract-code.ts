// Finds the spoken lines written straight into game code (src/game): say/adapt/ping(speaker, text, extra?) calls,
// voice.say(speaker, text) and { s: speaker, t: text } object literals. Uses the TypeScript checker to follow
// identifiers to their declarations, so `const me = G.s.player; say(me, "...")` or `const BARKS = [...];
// say(x, pick(BARKS))` resolve. A speaker chosen at run time (the player, a random lad, a townswoman) is expanded to
// every id that can actually say it; each text expression is expanded to every string it can be. Expressions that
// can't be resolved are listed (unresolved) so they can be added to SPEAKERS / TEXTS below.
import ts from "typescript";
import { join } from "node:path";

export interface CodeLine { s: string; t: string; mood?: string; file: string }
export interface Unresolved { file: string; line: number; what: "speaker" | "text"; expr: string }

type Ctx = {
  PLAYABLE: string[];
  LADS: string[];
  /** more run-time speakers, by `file:expression` */
  extra: Record<string, string[]>;
  /** whole lines whose speaker and text go together, by `file:speakerExpr|textExpr` (e.g. a giver and his quest) */
  pairs: Record<string, [string, string][]>;
  /** lines that only pass along dialogue recorded elsewhere, by `file:speakerExpr|textExpr` */
  ignore: Set<string>;
  /** speakers never recorded (silent, or held): their unknown lines aren't worth listing */
  quiet: Set<string>;
};

/**
 * Speakers picked at run time, by `file:expression` (or `*:expression` for any file). Read from the code:
 * see the comment on each. Values may contain "@PLAYER" (every playable id) and "@LADS" (every lad bar Mikey).
 */
function speakerTable(c: Ctx): Record<string, string[]> {
  const ladsWithout = (p: string) => c.LADS.filter((x) => x !== p);
  const nth = (n: number) => [...new Set(c.PLAYABLE.map((p) => ladsWithout(p)[n]).filter(Boolean))];
  return {
    "*:s.player": c.PLAYABLE,
    "*:G.s.player": c.PLAYABLE,
    "*:this.s.player": c.PLAYABLE,
    "*:this.player.id": c.PLAYABLE,
    "*:playerFace(G.s)": [...c.PLAYABLE, "SANMIK"],
    "*:playerFace(s)": [...c.PLAYABLE, "SANMIK"],
    "*:this.dancerName()": ["DESTINY", "CRYSTAL"], // ClubScene: the dancer on shift
    "*:this.driver": ["SANMIK", "GABOR THE GOAT"], // DriveScene: SanMik drives, or Gabor when you're Mikey
    "*:sanRadio()": ["SANMIK", "SANCHZ"], // the SanMikverse radio
    // VignetteScene: youTo(alt) = alt when you're Mikey, otherwise you
    "VignetteScene.ts:this.youTo(\"SANCHZ\")": ["SANCHZ", ...c.PLAYABLE.filter((p) => p !== "MIKEY")],
    "VignetteScene.ts:this.youTo(\"KREBLIS\")": ["KREBLIS", ...c.PLAYABLE.filter((p) => p !== "MIKEY")],
    // VignetteScene revenge/crobson: const [a, b(, c)] = LADS.filter((p) => p !== G.s.player)
    "VignetteScene.ts:a": nth(0),
    "VignetteScene.ts:b": nth(1),
    "VignetteScene.ts:c": nth(2),
    // VignetteScene pudding(spy): spy = the player (pudding_spy)
    "VignetteScene.ts:spy": c.PLAYABLE,


    ...c.extra,
  };
}

export function extractCode(root: string, ctx: Ctx, texts: Record<string, string[]> = {}): { lines: CodeLine[]; unresolved: Unresolved[] } {
  const cfgPath = join(root, "tsconfig.json");
  const cfg = ts.parseJsonConfigFileContent(ts.readConfigFile(cfgPath, ts.sys.readFile).config, ts.sys, root);
  const program = ts.createProgram(cfg.fileNames.filter((f) => f.includes("/src/")), { ...cfg.options, noEmit: true });
  const checker = program.getTypeChecker();
  const SP = speakerTable(ctx);
  const lines: CodeLine[] = [];
  const unresolved: Unresolved[] = [];
  const gameDir = join(root, "src/game") + "/";
  const files = program.getSourceFiles().filter((f) => f.fileName.startsWith(gameDir)).sort((a, b) => a.fileName.localeCompare(b.fileName));

  const strip = (e: ts.Expression): ts.Expression => {
    while (ts.isParenthesizedExpression(e) || ts.isAsExpression(e) || ts.isNonNullExpression(e) || ts.isSatisfiesExpression(e) || ts.isTypeAssertionExpression(e)) e = e.expression;
    return e;
  };
  const base = (f: ts.SourceFile) => f.fileName.slice(f.fileName.lastIndexOf("/") + 1);
  const norm = (e: ts.Node) => e.getText().replace(/\s+/g, " ").replace(/\?\./g, ".");
  const lookup = (table: Record<string, string[]>, f: ts.SourceFile, e: ts.Node) => table[`${base(f)}:${norm(e)}`] ?? table[`*:${norm(e)}`];

  /** The initializer a plain identifier refers to (const x = ...), following imports. */
  function declInit(id: ts.Identifier): ts.Expression | undefined {
    let sym = checker.getSymbolAtLocation(id);
    if (sym && sym.flags & ts.SymbolFlags.Alias) sym = checker.getAliasedSymbol(sym);
    const d = sym?.valueDeclaration ?? sym?.declarations?.[0];
    if (d && ts.isVariableDeclaration(d) && ts.isIdentifier(d.name) && d.initializer) {
      const list = d.parent;
      if (ts.isVariableDeclarationList(list) && list.flags & ts.NodeFlags.Const) return d.initializer;
      // a `let` only counts if it's never reassigned: too fiddly, treat as unknown
    }
    if (d && ts.isPropertyAssignment(d)) return d.initializer;
    return undefined;
  }

  /** While expanding the lines of one speaker: `TABLE[<speaker expression>]` only looks up that speaker's row. */
  let bind: { expr: string; val: string } | null = null;
  const MISSING: string[] = [];

  /** For-of variables and .map/.filter callback parameters over a literal array: the array's rows. */
  function rowsOf(id: ts.Identifier): { rows: ts.Expression[]; get: (row: ts.Expression, prop?: string) => ts.Expression | undefined } | null {
    const sym = checker.getSymbolAtLocation(id);
    const d = sym?.valueDeclaration ?? sym?.declarations?.[0];
    if (!d) return null;
    let iter: ts.Expression | undefined;
    let idx = -1;
    if (ts.isVariableDeclaration(d) && ts.isVariableDeclarationList(d.parent) && ts.isForOfStatement(d.parent.parent)) iter = d.parent.parent.expression;
    else {
      let param: ts.Node = d;
      if (ts.isBindingElement(d) && ts.isArrayBindingPattern(d.parent)) {
        idx = d.parent.elements.indexOf(d);
        param = d.parent.parent;
      }
      if (ts.isParameter(param) && ts.isArrowFunction(param.parent) && param.parent.parameters[0] === param) {
        const call = param.parent.parent;
        if (ts.isCallExpression(call) && ts.isPropertyAccessExpression(call.expression) && /^(map|forEach|filter|flatMap|find|some)$/.test(call.expression.name.text)) iter = call.expression.expression;
      }
    }
    if (!iter) return null;
    const rows = rowList(iter, 0);
    if (!rows) return null;
    return {
      rows,
      get: (row, prop) => {
        const r = strip(row);
        if (idx >= 0) return ts.isArrayLiteralExpression(r) ? r.elements[idx] : undefined;
        if (!prop) return r;
        if (ts.isObjectLiteralExpression(r)) {
          const p = r.properties.find((x) => ts.isPropertyAssignment(x) && x.name.getText() === prop) as ts.PropertyAssignment | undefined;
          return p?.initializer;
        }
        return undefined;
      },
    };
  }
  /** The elements of a literal array, through consts and .filter/.slice/.map-free chains. */
  function rowList(e0: ts.Expression, depth: number): ts.Expression[] | null {
    if (depth > 8) return null;
    const e = strip(e0);
    if (ts.isArrayLiteralExpression(e)) return e.elements.some(ts.isSpreadElement) ? null : [...e.elements];
    if (ts.isIdentifier(e)) {
      const i = declInit(e);
      return i ? rowList(i, depth + 1) : null;
    }
    if (ts.isPropertyAccessExpression(e)) {
      const i = propInit(e);
      return i ? rowList(i, depth + 1) : null;
    }
    if (ts.isCallExpression(e) && ts.isPropertyAccessExpression(e.expression) && /^(filter|slice|sort|reverse)$/.test(e.expression.name.text)) return rowList(e.expression.expression, depth + 1);
    return null;
  }
  /** `x` or `x.prop` where x is a row of a literal array: every row's value. */
  function rowExprs(e: ts.Expression): ts.Expression[] | null {
    let id: ts.Identifier | undefined, prop: string | undefined;
    if (ts.isIdentifier(e)) id = e;
    else if (ts.isPropertyAccessExpression(e) && ts.isIdentifier(e.expression)) (id = e.expression), (prop = e.name.text);
    if (!id) return null;
    const r = rowsOf(id);
    if (r) {
      const out = r.rows.map((row) => r.get(row, prop));
      return out.every(Boolean) ? (out as ts.Expression[]) : null;
    }
    // const x = ARR[i]; x.prop
    const init = declInit(id);
    if (prop && init && ts.isElementAccessExpression(strip(init))) {
      const rows = rowList((strip(init) as ts.ElementAccessExpression).expression, 0);
      if (!rows) return null;
      const out = rows.map((row) => {
        const o = strip(row);
        return ts.isObjectLiteralExpression(o) ? (o.properties.find((x) => ts.isPropertyAssignment(x) && x.name.getText() === prop) as ts.PropertyAssignment | undefined)?.initializer : undefined;
      });
      return out.every(Boolean) ? (out as ts.Expression[]) : null;
    }
    return null;
  }
  function rowKey(e: ts.Expression): ts.Node | null {
    const id = ts.isIdentifier(e) ? e : ts.isPropertyAccessExpression(e) && ts.isIdentifier(e.expression) ? e.expression : null;
    if (!id) return null;
    const sym = checker.getSymbolAtLocation(id);
    const d = sym?.valueDeclaration;
    if (!d || !rowsOf(id)) return null;
    return ts.isBindingElement(d) ? d.parent : d;
  }

  const CAP = 400;
  const uniq = (xs: string[]) => [...new Set(xs)];

  /** Every string this expression can be, or null if unknown. */
  function strs(e0: ts.Expression, f: ts.SourceFile, depth = 0): string[] | null {
    if (depth > 12) return null;
    const e = strip(e0);
    const hit = lookup(texts, f, e);
    if (hit) return hit;
    if (ts.isStringLiteral(e) || ts.isNoSubstitutionTemplateLiteral(e)) return [e.text];
    if (ts.isTemplateExpression(e)) {
      let acc: string[] = [e.head.text];
      for (const span of e.templateSpans) {
        const v = strs(span.expression, f, depth + 1) ?? (/^-?\d/.test("") ? null : null);
        if (!v) return null;
        acc = acc.flatMap((a) => v.map((x) => a + x + span.literal.text));
        if (acc.length > CAP) return null;
      }
      return uniq(acc);
    }
    if (ts.isConditionalExpression(e)) {
      const a = strs(e.whenTrue, f, depth + 1), b = strs(e.whenFalse, f, depth + 1);
      return a && b ? uniq([...a, ...b]) : null;
    }
    if (ts.isBinaryExpression(e)) {
      const k = e.operatorToken.kind;
      if (k === ts.SyntaxKind.QuestionQuestionToken || k === ts.SyntaxKind.BarBarToken) {
        const a = strs(e.left, f, depth + 1), b = strs(e.right, f, depth + 1);
        if (a === MISSING) return b;
        if (bind && a && a.length && ts.isElementAccessExpression(strip(e.left)) && norm((strip(e.left) as ts.ElementAccessExpression).argumentExpression) === bind.expr) return a;
        // `RECRUIT[x] ?? ["..."]`: the left side may be an array lookup handled by arr()
        return a && b ? uniq([...a, ...b]) : null;
      }
      if (k === ts.SyntaxKind.PlusToken) {
        const a = strs(e.left, f, depth + 1), b = strs(e.right, f, depth + 1);
        if (!a || !b || a.length * b.length > CAP) return null;
        return uniq(a.flatMap((x) => b.map((y) => x + y)));
      }
    }
    if (ts.isElementAccessExpression(e)) {
      // ARRAY[random] / TABLE[key]: every element (TABLE[speaker]: that speaker's row)
      if (bind && norm(e.argumentExpression) === bind.expr) {
        const r = tableRow(e.expression, bind.val, f, depth + 1);
        if (r !== null) return r;
      }
      return arr(e.expression, f, depth + 1) ?? tableVals(e.expression, f, depth + 1);
    }
    {
      const rx = rowExprs(e);
      if (rx) {
        const vs = rx.map((x) => strs(x, f, depth + 1));
        if (vs.every(Boolean)) return uniq(vs.flat() as string[]);
      }
    }
    if (ts.isCallExpression(e)) {
      const callee = strip(e.expression);
      // pick(ARRAY) / Phaser.Utils.Array.GetRandom(ARRAY) / ARRAY.at(...)
      const name = ts.isIdentifier(callee) ? callee.text : ts.isPropertyAccessExpression(callee) ? callee.name.text : "";
      if (/^(pick|choose|rnd|random|GetRandom|sample|oneOf)$/.test(name) && e.arguments[0]) return arr(e.arguments[0], f, depth + 1);
      if (ts.isPropertyAccessExpression(callee) && name === "replace" && e.arguments.length === 2) {
        const subj = strs(callee.expression, f, depth + 1), what = strs(e.arguments[0], f, depth + 1), by = strs(e.arguments[1], f, depth + 1);
        if (!subj || !what || !by || subj.length * by.length * what.length > CAP) return null;
        return uniq(subj.flatMap((x) => what.flatMap((w) => by.map((y) => x.split(w).join(y)))));
      }
      if (ts.isPropertyAccessExpression(callee) && /^(toUpperCase|toLowerCase|trim)$/.test(name)) {
        const v = strs(callee.expression, f, depth + 1);
        return v && v.map((x) => (name === "trim" ? x.trim() : name === "toUpperCase" ? x.toUpperCase() : x.toLowerCase()));
      }
      if (ts.isPropertyAccessExpression(callee) && name === "at") return arr(callee.expression, f, depth + 1);
    }
    if (ts.isIdentifier(e)) {
      const init = declInit(e);
      if (init) return strs(init, f, depth + 1);
      const t = checker.getTypeAtLocation(e);
      return literalUnion(t);
    }
    if (ts.isPropertyAccessExpression(e)) {
      // CONST_OBJ.key / imported namespace member
      const sym = checker.getSymbolAtLocation(e);
      let s2 = sym && sym.flags & ts.SymbolFlags.Alias ? checker.getAliasedSymbol(sym) : sym;
      const d = s2?.valueDeclaration;
      if (d && ts.isVariableDeclaration(d) && d.initializer) return strs(d.initializer, f, depth + 1);
      if (d && ts.isPropertyAssignment(d) && isConstish(d)) return strs(d.initializer, f, depth + 1);
      return literalUnion(checker.getTypeAtLocation(e));
    }
    return null;
  }
  function isConstish(d: ts.PropertyAssignment) {
    // a property of an object literal assigned to a const
    let n: ts.Node = d.parent;
    while (n && !ts.isVariableDeclaration(n)) {
      if (ts.isFunctionLike(n)) return false;
      n = n.parent;
    }
    return !!n && ts.isVariableDeclarationList(n.parent) && !!(n.parent.flags & ts.NodeFlags.Const);
  }
  function literalUnion(t: ts.Type): string[] | null {
    const ts_ = t.isUnion() ? t.types : [t];
    if (ts_.length > 30 || !ts_.every((x) => x.isStringLiteral())) return null;
    return ts_.map((x) => (x as ts.StringLiteralType).value);
  }
  /** The string elements of an array expression (flattening spreads and .filter/.slice/.map-free chains). */
  function arr(e0: ts.Expression, f: ts.SourceFile, depth = 0): string[] | null {
    if (depth > 12) return null;
    const e = strip(e0);
    const hit = lookup(texts, f, e);
    if (hit) return hit;
    if (ts.isArrayLiteralExpression(e)) {
      const out: string[] = [];
      for (const el of e.elements) {
        const v = ts.isSpreadElement(el) ? arr(el.expression, f, depth + 1) : strs(el, f, depth + 1);
        if (!v) return null;
        out.push(...v);
      }
      return uniq(out);
    }
    if (ts.isIdentifier(e) || ts.isPropertyAccessExpression(e)) {
      const init = ts.isIdentifier(e) ? declInit(e) : propInit(e);
      return init ? arr(init, f, depth + 1) : null;
    }
    if (ts.isCallExpression(e) && ts.isPropertyAccessExpression(e.expression) && /^(filter|slice|concat|sort|reverse|flat)$/.test(e.expression.name.text)) {
      const a = arr(e.expression.expression, f, depth + 1);
      if (!a) return null;
      if (e.expression.name.text === "concat") {
        const more = e.arguments.map((x) => arr(x, f, depth + 1) ?? strs(x, f, depth + 1));
        if (more.some((m) => !m)) return null;
        return uniq([...a, ...more.flat() as string[]]);
      }
      return a;
    }
    if (ts.isBinaryExpression(e) && (e.operatorToken.kind === ts.SyntaxKind.QuestionQuestionToken || e.operatorToken.kind === ts.SyntaxKind.BarBarToken)) {
      const L = strip(e.left);
      if (bind && ts.isElementAccessExpression(L) && norm(L.argumentExpression) === bind.expr) {
        const r = tableRow(L.expression, bind.val, f, depth + 1);
        if (r === MISSING) return arr(e.right, f, depth + 1);
        if (r) return r;
      }
      const a = arr(e.left, f, depth + 1) ?? (ts.isElementAccessExpression(L) ? tableVals(L.expression, f, depth + 1) : null);
      const b = arr(e.right, f, depth + 1);
      return a && b ? uniq([...a, ...b]) : null;
    }
    if (ts.isElementAccessExpression(e)) return tableVals(e.expression, f, depth + 1);
    if (ts.isConditionalExpression(e)) {
      const a = arr(e.whenTrue, f, depth + 1), b = arr(e.whenFalse, f, depth + 1);
      return a && b ? uniq([...a, ...b]) : null;
    }
    return null;
  }
  function propInit(e: ts.PropertyAccessExpression): ts.Expression | undefined {
    let sym = checker.getSymbolAtLocation(e);
    if (sym && sym.flags & ts.SymbolFlags.Alias) sym = checker.getAliasedSymbol(sym);
    const d = sym?.valueDeclaration;
    if (d && ts.isVariableDeclaration(d)) return d.initializer;
    if (d && ts.isPropertyAssignment(d) && isConstish(d)) return d.initializer;
    if (d && ts.isPropertyDeclaration(d) && d.initializer && d.modifiers?.some((m) => m.kind === ts.SyntaxKind.ReadonlyKeyword)) return d.initializer;
    return undefined;
  }
  /** TABLE[val] for one key: its strings, MISSING if the table has no such key, null if unknown. */
  function tableRow(e0: ts.Expression, val: string, f: ts.SourceFile, depth: number): string[] | null {
    const e = strip(e0);
    const init = ts.isIdentifier(e) ? declInit(e) : ts.isPropertyAccessExpression(e) ? propInit(e) : undefined;
    const o = init && strip(init);
    if (!o || !ts.isObjectLiteralExpression(o)) return null;
    const p = o.properties.find((x) => ts.isPropertyAssignment(x) && x.name.getText().replace(/^["']|["']$/g, "") === val) as ts.PropertyAssignment | undefined;
    if (!p) return MISSING;
    return arr(p.initializer, f, depth + 1) ?? strs(p.initializer, f, depth + 1);
  }
  /** TABLE[key] where TABLE = { K: [...] | "..." }: every value. */
  function tableVals(e0: ts.Expression, f: ts.SourceFile, depth: number): string[] | null {
    const e = strip(e0);
    const init = ts.isIdentifier(e) ? declInit(e) : ts.isPropertyAccessExpression(e) ? propInit(e) : undefined;
    const o = init && strip(init);
    if (o && ts.isObjectLiteralExpression(o)) {
      const out: string[] = [];
      for (const p of o.properties) {
        if (!ts.isPropertyAssignment(p)) return null;
        const v = arr(p.initializer, f, depth + 1) ?? strs(p.initializer, f, depth + 1);
        if (!v) return null;
        out.push(...v);
      }
      return uniq(out);
    }
    if (o && ts.isArrayLiteralExpression(o)) {
      // an array of arrays (e.g. [["WHO", "text"], ...]) is handled by its caller; plain nested arrays here
      return arr(o, f, depth + 1);
    }
    return null;
  }

  /** Every speaker id this expression can be, or null. */
  function speakers(e0: ts.Expression, f: ts.SourceFile, depth = 0): string[] | null {
    if (depth > 12) return null;
    const e = strip(e0);
    const hit = lookup(SP, f, e);
    if (hit) return hit;
    if (ts.isStringLiteral(e) || ts.isNoSubstitutionTemplateLiteral(e)) return e.text === "YOU" ? ctx.PLAYABLE : [e.text];
    if (ts.isConditionalExpression(e)) {
      const a = speakers(e.whenTrue, f, depth + 1), b = speakers(e.whenFalse, f, depth + 1);
      return a && b ? uniq([...a, ...b]) : null;
    }
    if (ts.isBinaryExpression(e) && (e.operatorToken.kind === ts.SyntaxKind.QuestionQuestionToken || e.operatorToken.kind === ts.SyntaxKind.BarBarToken)) {
      const a = speakers(e.left, f, depth + 1), b = speakers(e.right, f, depth + 1);
      return a && b ? uniq([...a, ...b]) : null;
    }
    if (ts.isIdentifier(e)) {
      const init = declInit(e);
      if (init) return speakers(init, f, depth + 1);
    }
    {
      const rx = rowExprs(e);
      if (rx) {
        const vs = rx.map((x) => speakers(x, f, depth + 1));
        if (vs.every(Boolean)) return uniq(vs.flat() as string[]);
      }
    }
    if (ts.isElementAccessExpression(e)) {
      const a = arr(e.expression, f, depth + 1);
      if (a) return a;
    }
    if (ts.isCallExpression(e)) {
      // lad(["A", "B"]) and friends: a pick from a literal list (VignetteScene planeEscape falls back to Kreblis)
      const callee = strip(e.expression);
      const name = ts.isIdentifier(callee) ? callee.text : ts.isPropertyAccessExpression(callee) ? callee.name.text : "";
      if (name === "lad" && e.arguments[0]) {
        const a = arr(e.arguments[0], f, depth + 1);
        if (a) return uniq([...a, "KREBLIS"]);
      }
      if (/^(pick|GetRandom)$/.test(name) && e.arguments[0]) return arr(e.arguments[0], f, depth + 1);
    }
    const lit = literalUnion(checker.getTypeAtLocation(e));
    if (lit && lit.length <= 16) return lit.map((x) => (x === "YOU" ? ctx.PLAYABLE : [x])).flat();
    return null;
  }

  const mood = (o?: ts.Expression) => {
    if (!o || !ts.isObjectLiteralExpression(strip(o))) return undefined;
    for (const p of (strip(o) as ts.ObjectLiteralExpression).properties)
      if (ts.isPropertyAssignment(p) && p.name.getText() === "mood" && ts.isStringLiteral(p.initializer)) return p.initializer.text;
    return undefined;
  };
  const prop = (o: ts.ObjectLiteralExpression, k: string) =>
    o.properties.find((p): p is ts.PropertyAssignment | ts.ShorthandPropertyAssignment => (ts.isPropertyAssignment(p) || ts.isShorthandPropertyAssignment(p)) && p.name.getText() === k);
  const propVal = (p: ts.PropertyAssignment | ts.ShorthandPropertyAssignment) => (ts.isPropertyAssignment(p) ? p.initializer : p.name);

  function emit(f: ts.SourceFile, node: ts.Node, sp: ts.Expression, tx: ts.Expression, extra: ts.Expression | undefined) {
    const file = "game/" + f.fileName.slice(gameDir.length);
    const ln = f.getLineAndCharacterOfPosition(node.getStart()).line + 1;
    const site = `${base(f)}:${norm(sp)}|${norm(tx)}`;
    if (ctx.ignore.has(site)) return;
    const m = mood(extra);
    if (ctx.pairs[site]) {
      for (const [s, t] of ctx.pairs[site]) lines.push({ s, t, mood: m, file });
      return;
    }
    // a row of a literal table: speaker and text from the same row ([who, text] pairs, { name, hi } rows)
    const sk = rowKey(strip(sp));
    if (sk && sk === rowKey(strip(tx))) {
      const id = (ts.isIdentifier(strip(sp)) ? strip(sp) : (strip(sp) as ts.PropertyAccessExpression).expression) as ts.Identifier;
      const idT = (ts.isIdentifier(strip(tx)) ? strip(tx) : (strip(tx) as ts.PropertyAccessExpression).expression) as ts.Identifier;
      const r = rowsOf(id)!, rT = rowsOf(idT)!;
      const pS = ts.isPropertyAccessExpression(strip(sp)) ? (strip(sp) as ts.PropertyAccessExpression).name.text : undefined;
      const pT = ts.isPropertyAccessExpression(strip(tx)) ? (strip(tx) as ts.PropertyAccessExpression).name.text : undefined;
      let ok = true;
      for (const row of r.rows) {
        const se = r.get(row, pS), te = rT.get(row, pT);
        const who = se && speakers(se, f), txt = te && strs(te, f);
        if (!who || !txt) { ok = false; continue; }
        for (const s of who) for (const t of txt) lines.push({ s, t, mood: m, file });
      }
      if (!ok) unresolved.push({ file, line: ln, what: "text", expr: site });
      return;
    }
    const who = speakers(sp, f);
    if (!who) {
      unresolved.push({ file, line: ln, what: "speaker", expr: norm(sp) });
      return;
    }
    const talkers = who.filter((x) => !ctx.quiet.has(x.toUpperCase()));
    if (!talkers.length) return;
    // text per speaker: TABLE[speaker] picks that speaker's own lines
    const bound = norm(tx).includes(`[${norm(sp)}]`);
    const per = new Map<string, string[] | null>();
    for (const s of talkers) {
      bind = bound ? { expr: norm(sp), val: s } : null;
      per.set(s, strs(tx, f));
      bind = null;
    }
    if ([...per.values()].some((v) => !v)) unresolved.push({ file, line: ln, what: "text", expr: norm(tx).slice(0, 140) });
    for (const [s, txt] of per) if (txt) for (const t of txt) lines.push({ s, t, mood: m, file });
    // variants: { PLAYER: "text" } said instead by that player (or by the speaker, when it isn't the player)
    const ex = extra && strip(extra);
    if (ex && ts.isObjectLiteralExpression(ex)) {
      const v = prop(ex, "variants");
      const vo = v && strip(propVal(v));
      if (vo && ts.isObjectLiteralExpression(vo))
        for (const p of vo.properties) {
          if (!ts.isPropertyAssignment(p)) continue;
          const key = p.name.getText().replace(/^["']|["']$/g, "");
          const vt = strs(p.initializer, f);
          if (!vt) { unresolved.push({ file, line: ln, what: "text", expr: norm(p.initializer).slice(0, 140) }); continue; }
          const by = talkers.includes(key) && talkers.length > 1 ? [key] : talkers;
          for (const s of by) for (const t of vt) lines.push({ s, t, mood: m, file });
        }
    }
  }

  /** say/adapt/ping from content/dsl.ts (not some local helper with the same name). */
  function fromDsl(id: ts.Identifier) {
    let sym = checker.getSymbolAtLocation(id);
    if (sym && sym.flags & ts.SymbolFlags.Alias) sym = checker.getAliasedSymbol(sym);
    return !!sym?.declarations?.some((d) => d.getSourceFile().fileName.endsWith("/src/content/dsl.ts"));
  }

  for (const f of files) {
    const visit = (n: ts.Node) => {
      if (ts.isCallExpression(n)) {
        const c = strip(n.expression);
        const isLineFn = ts.isIdentifier(c) && /^(say|adapt|ping)$/.test(c.text) && fromDsl(c);
        const isVoice = ts.isPropertyAccessExpression(c) && c.name.text === "say" && /(^|\.)voice$/.test(c.expression.getText());
        if ((isLineFn || isVoice) && n.arguments.length >= 2 && !ts.isFunctionLike(n.parent)) emit(f, n, n.arguments[0], n.arguments[1], isLineFn ? n.arguments[2] : undefined);
      } else if (ts.isObjectLiteralExpression(n)) {
        const s = prop(n, "s"), t = prop(n, "t");
        const isDir = prop(n, "dir");
        if (s && t && !isDir) {
          const sv = strip(propVal(s));
          if (!(ts.isStringLiteral(sv) && (sv.text === "NARRATOR"))) emit(f, n, propVal(s), propVal(t), n);
        }
      }
      ts.forEachChild(n, visit);
    };
    visit(f);
  }
  return { lines, unresolved };
}

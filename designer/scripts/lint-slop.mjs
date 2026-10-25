#!/usr/bin/env node
// Automated anti-slop gate (static). Mirrors references/anti-slop.md; does not replace the screenshot review.
//
//   node lint-slop.mjs <file|dir> [...more] [--mode game|fivem|product-app|marketing] [--tokens tokens.css] [--json]
//
// Verdict: PASS (0 ban categories) | PATCH (1-2) | REDO_TOKENS (3+). Exit code 0 / 0 / 2.
// Web rules cite their source: [H..] Hallmark gate (references/web-gates.md), [V] Vercel guidelines, [NAS] no-ai-slop.
// They are skipped under --mode game and fivem. Categories a11y and finish, and WARN hits, never count toward the verdict.
import { readFileSync, readdirSync, statSync, existsSync } from 'node:fs';
import { join, extname, relative, resolve } from 'node:path';
import { parseCss, rootVars, resolveVars } from './lib/css.mjs';
import { decodeEntities } from './lib/html.mjs';
import { parseColor, rgbToOklch, ANY_COLOR_RE } from './lib/color.mjs';
import {
  families, firstFamily, isBannedFont, isGenericLike, INDIGO_HEX_RE, INDIGO_TW_RE, TAILWIND_STOCK_RE, bannedGradient, bannedGradientHues, twGradientHues,
  NAS_BANNED_WORDS, NAS_ADVERBS, NAS_PHRASES, NAS_PATTERN_PHRASES, HALLMARK_BUZZ_RE, TELLS19, REBUTTAL_RE, NOT_X_ITS_Y_RE, PLACEHOLDER_NAME_RE,
  SECOND_CTA_RE, SAAS_COPY_RE, FAKE_STATS_RE, wordListRe,
} from './lib/slop.mjs';

const args = process.argv.slice(2);
const paths = [];
const opt = { mode: null, tokens: null, json: false };
for (let i = 0; i < args.length; i++) {
  if (args[i] === '--mode') opt.mode = args[++i];
  else if (args[i] === '--tokens') opt.tokens = args[++i];
  else if (args[i] === '--json') opt.json = true;
  else paths.push(args[i]);
}
if (!paths.length) { console.error('usage: lint-slop.mjs <file|dir> [--mode game|fivem|product-app|marketing] [--tokens tokens.css] [--json]'); process.exit(1); }
const ruleMode = opt.mode === 'fivem' ? 'game' : opt.mode; // FiveM NUI is a game UI for the game-only rules
const WEB = !['game', 'fivem'].includes(opt.mode);

const EXT = new Set(['.html', '.htm', '.css', '.scss', '.jsx', '.tsx', '.js', '.ts', '.vue', '.svelte', '.astro']);
const MARKUP = new Set(['.html', '.htm', '.jsx', '.tsx', '.vue', '.svelte', '.astro']);
const SKIP_DIR = new Set(['node_modules', '.git', 'dist', 'build', '.next', 'out', 'coverage', 'Library', 'Temp', '.variant-studio', 'translated']);
const files = [];
function collect(p) {
  const st = statSync(p);
  if (st.isDirectory()) { for (const f of readdirSync(p)) if (!SKIP_DIR.has(f)) collect(join(p, f)); }
  else if (EXT.has(extname(p).toLowerCase()) && !/\.min\./.test(p)) files.push(p);
}
for (const p of paths) { if (!existsSync(p)) { console.error(`not found: ${p}`); process.exit(1); } collect(resolve(p)); }

// legacy rules: [category, id, regex, message, modes?]
const RULES = [
  ['type', 'generic-font-import', /fonts\.googleapis\.com\/css2?\?family=(Inter|Geist|Roboto|Open\+Sans)(?![^"']*family=)/gi, 'Only a generic Google font loaded [H1]'],
  ['type', 'tw-font-sans', /\bfont-sans\b/g, 'Tailwind default font-sans', ['game']],
  ['color', 'indigo-hex', INDIGO_HEX_RE, 'Indigo/purple SaaS accent [H74]'],
  ['color', 'indigo-tw', INDIGO_TW_RE, 'Tailwind indigo/violet/purple utility [H74]'],
  ['color', 'saas-dark', /\bbg-zinc-950\b/g, 'SaaS dark palette (zinc-950) [H74]'],
  ['shape', 'rounded-xl', /\brounded-(xl|2xl|3xl)\b/g, 'rounded-xl/2xl/3xl'],
  ['shape', 'big-radius', /border-radius\s*:\s*(1[6-9]|2\d|3\d)px/gi, 'Large default radius (16px+) on panels', ['game']],
  ['shape', 'pill-button', /\brounded-full\b/g, 'Pill shape (rounded-full)', ['game']],
  ['material', 'glass', /\bbackdrop-blur-(xl|2xl|3xl)\b|backdrop-filter\s*:\s*blur\(\s*(1[6-9]|[2-9]\d)px/g, 'Heavy glassmorphism blur [H29]'],
  ['material', 'tw-shadow', /\bshadow-(lg|xl|2xl)\b/g, 'Tailwind default shadow as the only depth'],
  ['layout', 'shadcn-card', /<Card(Header|Content|Title)?\b|from ["']@\/components\/ui\/card["']/g, 'shadcn Card used as a layout', ['game']],
  ['icons', 'emoji', /(?:>|["'`])[^<"'`]*?[\u{1F300}-\u{1FAFF}\u{2600}-\u{27BF}]/gu, 'Emoji used as an icon [H30a]'],
  ['icons', 'lucide-in-game', /from ["'](lucide-react|@heroicons\/react)/g, 'Generic Lucide/Heroicons in a game UI', ['game']],
  ['motion', 'bounce', /cubic-bezier\(\s*[\d.]+\s*,\s*(1\.[1-9]|[2-9])|ease-(in-out-|out-|in-)?(elastic|bounce|back)\b|animate-bounce/g, 'Bounce/elastic/overshoot easing [H12]', ['game']],
  ['motion', 'infinite-shimmer', /animation\s*:[^;]*\binfinite\b[^;]*(shimmer|glow|pulse)|animate-pulse/gi, 'Infinite shimmer/pulse on static content'],
  ['copy', 'saas-copy', SAAS_COPY_RE, 'SaaS marketing copy [H19]'],
  ['copy', 'fake-stats', FAKE_STATS_RE, 'Invented social proof / stats [H46a]'],
  ['copy', 'get-started-in-game', /\bGet Started\b/g, '"Get Started" CTA inside a game UI', ['game']],
];

const hits = [];
let rawHex = 0;
const tokenVars = opt.tokens && existsSync(opt.tokens) ? rootVars(parseCss(readFileSync(opt.tokens, 'utf8'))) : null;
const trunc = (s, n = 60) => { s = String(s).replace(/\s+/g, ' ').trim(); return s.length > n ? s.slice(0, n - 1) + '…' : s; };

// ---------- parsing helpers (markup tags with positions, CSS blocks with lines)
const lineAt = (src) => { const nl = []; for (let i = 0; i < src.length; i++) if (src[i] === '\n') nl.push(i); return (pos) => { let lo = 0, hi = nl.length; while (lo < hi) { const m = (lo + hi) >> 1; if (nl[m] < pos) lo = m + 1; else hi = m; } return lo + 1; }; };
const VOIDS = new Set(['area', 'base', 'br', 'col', 'embed', 'hr', 'img', 'input', 'link', 'meta', 'source', 'track', 'wbr']);
const TAG_RE = /<!--[\s\S]*?-->|<(\/?)([a-zA-Z][\w:.-]*)((?:\s*(?:\{(?:[^{}]|\{(?:[^{}]|\{[^{}]*\})*\})*\}|[^\s"'>\/={}]+(?:\s*=\s*(?:"[^"]*"|'[^']*'|\{(?:[^{}]|\{(?:[^{}]|\{[^{}]*\})*\})*\}|[^\s"'=<>`]+))?))*)\s*(\/?)>/g;
function scanTags(src, isHtml) {
  const tags = [];
  TAG_RE.lastIndex = 0;
  let m;
  while ((m = TAG_RE.exec(src))) {
    if (!m[2]) continue;
    const raw = m[2], name = raw.toLowerCase();
    const t = { name, comp: /^[A-Z]/.test(raw), raw, attrs: m[3] || '', close: !!m[1], self: !!m[4] || VOIDS.has(name), pos: m.index, end: TAG_RE.lastIndex };
    tags.push(t);
    if (!t.close && (name === 'script' || name === 'style') && (isHtml || !t.comp)) {
      const c = src.toLowerCase().indexOf(`</${name}`, t.end);
      if (c < 0) break;
      TAG_RE.lastIndex = c;
    }
  }
  return tags;
}
function closeIdx(tags, i) {
  const t = tags[i];
  if (t.close || t.self) return -1;
  let d = 0;
  for (let k = i + 1; k < tags.length; k++) {
    if (tags[k].raw !== t.raw) continue;
    if (tags[k].close) { if (d === 0) return k; d--; } else if (!tags[k].self) d++;
  }
  return -1;
}
function getAttr(attrs, name) {
  const names = name === 'class' ? 'class|className' : name.replace(/[-]/g, '\\-');
  const m = new RegExp(`(?:^|\\s)(?:${names})\\s*=\\s*(?:"([^"]*)"|'([^']*)'|\\{\\s*["'\`]([^"'\`]*)["'\`]\\s*\\}|\\{([^}]*)\\}|([^\\s"'=<>\`]+))`, 'i').exec(attrs);
  return m ? (m[1] ?? m[2] ?? m[3] ?? m[4] ?? m[5] ?? '') : null;
}
const hasAttr = (attrs, name) => new RegExp(`(?:^|\\s)${name}(?=[\\s=/>]|$)`, 'i').test(attrs);
const classes = (t) => (getAttr(t.attrs, 'class') || '').split(/\s+/).filter(Boolean);
const plain = (html) => decodeEntities(html.replace(/<!--[\s\S]*?-->/g, ' ').replace(/<(script|style)\b[\s\S]*?<\/\1>/gi, ' ').replace(/\{[^{}]*\}/g, ' ').replace(/<[^>]*>/g, ' ')).replace(/\s+/g, ' ').trim();

// prose: same length as src, everything but visible text blanked (keeps offsets for line numbers)
function proseOf(src, ext, tags) {
  const out = src.split('');
  const blank = (a, b) => { for (let i = a; i < b && i < out.length; i++) if (out[i] !== '\n') out[i] = ' '; };
  const jsx = ext === '.jsx' || ext === '.tsx';
  if (!jsx) {
    blank(0, 0);
    for (const m of src.matchAll(/<!--[\s\S]*?-->|<(script|style)\b[\s\S]*?<\/\1\s*>/gi)) blank(m.index, m.index + m[0].length);
    if (ext === '.astro') { const fm = /^---[\s\S]*?\n---/.exec(src); if (fm) blank(0, fm[0].length); }
    for (const t of tags) blank(t.pos, t.end);
    if (ext !== '.html' && ext !== '.htm') for (const m of src.matchAll(/\{\{[\s\S]*?\}\}|\{[^{}]*\}/g)) blank(m.index, m.index + m[0].length);
    return decodeKeep(out.join(''));
  }
  const keep = new Array(src.length).fill(false);
  for (let i = 0; i + 1 < tags.length; i++) {
    const a = tags[i].end, b = tags[i + 1].pos;
    const seg = src.slice(a, b).replace(/\{(?:[^{}]|\{[^{}]*\})*\}/g, (s) => ' '.repeat(s.length));
    if (!seg.trim() || /[;{}()=<>]|=>|\b(return|const|let|import|function)\b/.test(seg)) continue;
    for (let k = 0; k < seg.length; k++) if (seg[k] !== ' ') keep[a + k] = true;
  }
  return decodeKeep(out.map((c, i) => (keep[i] || c === '\n' ? c : ' ')).join(''));
}
// decode entities without shifting offsets: entity -> char + padding spaces
const decodeKeep = (s) => s.replace(/&(#x[0-9a-f]+|#\d+|[a-z]+);/gi, (m) => { const d = decodeEntities(m); return d === m ? m : d + ' '.repeat(Math.max(0, m.length - d.length)); });

function cssBlocks(src, ext) {
  if (ext === '.css' || ext === '.scss') return [{ css: src, offset: 0 }];
  if (!MARKUP.has(ext)) return [];
  return [...src.matchAll(/<style\b[^>]*>([\s\S]*?)<\/style\s*>/gi)].map((m) => ({ css: m[1], offset: m.index + m[0].indexOf('>') + 1 }));
}
// rules with absolute positions; keyframes expanded into rules with .keyframes = name
function cssRules(block) {
  const out = [];
  let cursor = 0;
  const pos = (needle) => { const k = block.css.indexOf(needle, cursor); if (k >= 0) { cursor = k; return block.offset + k; } return block.offset + cursor; };
  for (const r of parseCss(block.css)) {
    if (r.type === 'rule') out.push({ ...r, pos: pos(r.selector.split(',')[0].trim()) });
    else if (r.type === 'at' && /keyframes$/.test(r.name) && r.body) {
      const name = r.prelude.replace(/^@[\w-]*keyframes\s+/i, '').trim(), p = pos(r.prelude);
      for (const k of parseCss(r.body)) if (k.type === 'rule') out.push({ ...k, keyframes: name, pos: p });
    } else if (r.type === 'at' && r.name === 'starting-style') out.push({ type: 'rule', selector: '@starting-style', decls: [], startingBody: r.body || '', pos: pos(r.prelude) });
  }
  return out;
}
const isTokenRule = (r) => /^(:root|html)$/.test(r.selector.trim()) && r.decls.length && r.decls.every((d) => d.prop.startsWith('--'));
const HEADING_SEL = /(^|[\s,>+~(])h[1-6]\b|__title|__display|__headline|hero__(title|display|headline|h\d)|wordmark|masthead|display/i;
const pxOf = (v) => { const m = /^(-?\d*\.?\d+)(px|rem|em)$/.exec(String(v || '').trim()); return m ? (m[2] === 'px' ? +m[1] : +m[1] * 16) : null; };

// ---------- pass 1: read every file
const docs = files.map((f) => {
  const src = readFileSync(f, 'utf8');
  const ext = extname(f).toLowerCase();
  const isMarkup = MARKUP.has(ext);
  const tags = isMarkup ? scanTags(src, ext === '.html' || ext === '.htm') : [];
  const rules = cssBlocks(src, ext).flatMap(cssRules);
  return { f, src, ext, isMarkup, tags, rules, lineOf: lineAt(src) };
});
const allRules = docs.flatMap((d) => d.rules.map((r) => ({ ...r, doc: d })));
const vars = {};
for (const d of docs) Object.assign(vars, rootVars(d.rules.filter((r) => !r.keyframes)));
const rv = (v) => resolveVars(String(v ?? ''), vars);
const anyMarkup = docs.some((d) => d.isMarkup && d.tags.length);
const classDecls = new Map();
for (const r of allRules) {
  if (r.keyframes || r.media) continue;
  for (const part of r.selector.split(',')) {
    const m = /^\.([\w-]+)$/.exec(part.trim());
    if (m) classDecls.set(m[1], [...(classDecls.get(m[1]) || []), ...r.decls]);
  }
}
const declsFor = (cls) => cls.flatMap((c) => classDecls.get(c) || []);
const dval = (decls, prop) => { const d = decls.filter((x) => x.prop === prop).pop(); return d ? rv(d.value) : null; };

// ---------- reporting
const perRule = new Map();
function add(doc, pos, cat, id, gate, msg, match = '', level = 'fail') {
  const key = `${doc ? doc.f : '-'}|${id}`;
  const n = perRule.get(key) || 0;
  if (n >= 20) return;
  perRule.set(key, n + 1);
  hits.push({ cat, id, gate, level, msg: `${gate ? `[${gate}] ` : ''}${msg}`, file: doc ? doc.f : '-', line: doc ? (pos == null ? 1 : doc.lineOf(pos)) : 0, match: trunc(match) });
}
const declPos = (r, prop) => { const s = r.doc.src; const k = s.slice(r.pos).search(new RegExp(`(^|[\\s;{])${prop.replace(/[-]/g, '\\-')}\\s*:`)); return k >= 0 ? r.pos + k + 1 : r.pos; };

// ---------- legacy regex rules + raw hex + studio check (unchanged behavior)
for (const d of docs) {
  const { f, src } = d;
  for (const [cat, id, re, msg, modes] of RULES) {
    if (modes && opt.mode && !modes.includes(ruleMode)) continue;
    if (modes && !opt.mode) continue;
    re.lastIndex = 0;
    let m, n = 0;
    while ((m = re.exec(src)) && n < 20) { hits.push({ cat, id, gate: (/\[([^\]]+)\]$/.exec(msg) || [])[1] || null, level: 'fail', msg, file: f, line: d.lineOf(m.index), match: m[0].slice(0, 60).trim() }); n++; }
  }
  if (tokenVars) {
    for (const line of src.split('\n')) {
      if (/^\s*--[\w-]+\s*:/.test(line)) continue;
      rawHex += (line.match(/#[0-9a-fA-F]{3,8}\b(?![\w-])/g) || []).length;
    }
  }
  if (/body\s*{[^}]*height\s*:\s*100vh/.test(src)) hits.push({ cat: 'studio', id: 'body-100vh', gate: null, level: 'fail', msg: 'height:100vh on body breaks Variant Studio component/section previews', file: f, line: 1, match: '100vh' });
}
if (tokenVars && rawHex > 0) hits.push({ cat: 'tokens', id: 'raw-hex', gate: null, level: 'fail', msg: `${rawHex} raw hex colors outside the locked tokens (use var(--…))`, file: '-', line: 0, match: '' });

// generic-font (legacy id, Hallmark list): a banned default carrying the stack alone, every mode
for (const d of docs) {
  for (const m of d.src.matchAll(/(?:^|[\s;{"'])(font-family|--font-[\w-]+)\s*:\s*([^;}\n]+)/gi)) {
    let v = m[2];
    if ((v.match(/"/g) || []).length % 2) v = v.slice(0, v.lastIndexOf('"'));
    const fams = families(rv(v));
    if (!fams.length || !isBannedFont(fams[0]) && !isGenericLike(fams[0]) || fams[0].startsWith('var(')) continue;
    if (/^(serif|sans-serif|monospace|system-ui|ui-[\w-]+|inherit|initial|unset|cursive|fantasy)$/i.test(fams[0]) && fams.length > 1) continue;
    if (!isBannedFont(fams[0]) && !/^(geist)$/i.test(fams[0])) continue;
    if (fams.slice(1).some((x) => !isGenericLike(x))) continue;
    add(d, m.index + 1, 'type', 'generic-font', 'H1', `Generic font as the only family (${fams[0]})`, m[0]);
  }
}

// bento (narrowed): uniform 3-column grids holding a set of tiles, every mode
const UNIFORM3 = /^repeat\(\s*3\s*,\s*(minmax\(\s*0(px)?\s*,\s*1fr\s*\)|1fr)\s*\)$|^(1fr|minmax\(\s*0(px)?\s*,\s*1fr\s*\))(\s+(1fr|minmax\(\s*0(px)?\s*,\s*1fr\s*\))){2}$/;
const kids = (d, i) => { const c = closeIdx(d.tags, i); const out = []; if (c < 0) return out; for (let k = i + 1, depth = 0; k < c; k++) { const t = d.tags[k]; if (t.close) { depth--; continue; } if (depth === 0) out.push(k); if (!t.self) depth++; } return out; };
{
  const uniformCls = new Set();
  for (const r of allRules) {
    const g = r.decls.find((x) => x.prop === 'grid-template-columns' && UNIFORM3.test(rv(x.value).trim()));
    if (!g) continue;
    const cls = (r.selector.match(/\.[\w-]+/g) || []).map((c) => c.slice(1));
    if (!anyMarkup || !cls.length) add(r.doc, declPos(r, 'grid-template-columns'), 'layout', 'bento', 'H3', `Uniform 3-column grid (${trunc(r.selector, 30)})`, g.value);
    else cls.forEach((c) => uniformCls.add(c));
  }
  for (const d of docs) d.tags.forEach((t, i) => {
    if (t.close) return;
    const c = classes(t);
    const tw = c.some((x) => /^(?:[\w-]+:)?grid-cols-3$/.test(x));
    if (!tw && !c.some((x) => uniformCls.has(x))) return;
    const ks = kids(d, i);
    if (ks.length >= 3 && !ks.some((k) => /\b(?:[\w-]+:)?(col|row)-span-/.test(getAttr(d.tags[k].attrs, 'class') || ''))) add(d, t.pos, 'layout', 'bento', 'H3', `Bento / uniform 3-column card grid (${ks.length} equal tiles)`, c.join(' '));
  });
}

// ---------- web rules (product-app / marketing / no mode)
if (WEB) {
  const bare = docs.map((d) => d.src.replace(/\/\*[\s\S]*?\*\/|<!--[\s\S]*?-->/g, ''));
  const prmAnywhere = bare.some((s) => /prefers-reduced-motion|motion-reduce:|motion-safe:/.test(s));
  const focusVisibleAnywhere = bare.some((s) => /:focus-visible|focus-visible:/.test(s));
  let motionAt = null;

  // ----- CSS rules
  for (const r of allRules) {
    const d = r.doc, sel = r.selector;
    if (sel === '@font-face' || sel === '@starting-style') continue;
    const token = isTokenRule(r);
    const decl = (p) => r.decls.filter((x) => x.prop === p).pop();
    // type: display face [H1]
    for (const x of r.decls) {
      if ((/^--font-(display|heading|title|hero)/.test(x.prop) && token) || (x.prop === 'font-family' && !token && HEADING_SEL.test(sel))) {
        const fam = firstFamily(rv(x.value));
        if (isBannedFont(fam)) add(d, declPos(r, x.prop), 'type', 'generic-display-font', 'H1', `Banned default "${fam}" as the display face`, `${x.prop}: ${x.value}`);
      }
    }
    if (r.keyframes) {
      for (const x of r.decls) if (/^(width|height|top|left|right|bottom|inset)$/.test(x.prop)) add(d, r.pos, 'motion', 'layout-animation', 'H10a', `@keyframes ${r.keyframes} animates ${x.prop}`, `${x.prop}: ${x.value}`);
      motionAt = motionAt || { d, pos: r.pos };
      continue;
    }
    // color
    for (const x of r.decls) {
      if (/gradient\(/i.test(x.value) && !/^repeating-/.test(x.value.trim())) {
        const b = bannedGradient(rv(x.value));
        if (b) add(d, declPos(r, x.prop), 'color', 'purple-gradient', 'H2a', `${b} gradient on ${trunc(sel, 30)}`, x.value);
      }
    }
    const clip = r.decls.find((x) => /background-clip$/.test(x.prop) && /\btext\b/.test(x.value));
    if (clip && (r.decls.some((x) => /^background(-image)?$/.test(x.prop) && /gradient\(/i.test(rv(x.value))) || r.decls.some((x) => /^(color|-webkit-text-fill-color)$/.test(x.prop) && /transparent/.test(x.value)))) add(d, declPos(r, clip.prop), 'color', 'gradient-text', 'H2b', `Gradient text on ${trunc(sel, 30)}`, clip.value);
    if (!token) for (const x of r.decls) {
      if (!/^(color|background|background-color|border-color|outline-color|fill|stroke)$/.test(x.prop) || /var\(/.test(x.value)) continue;
      for (const m of x.value.matchAll(new RegExp(`${ANY_COLOR_RE.source}|\\b(white|black)\\b`, 'gi'))) {
        const c = parseColor(m[0]);
        if (c && c.a >= 1 && ((c.r > 254.5 && c.g > 254.5 && c.b > 254.5) || (c.r < 0.5 && c.g < 0.5 && c.b < 0.5))) { add(d, declPos(r, x.prop), 'color', 'pure-black-white', 'H7a', `Pure ${c.r > 127 ? '#fff' : '#000'} outside the token block (${trunc(sel, 24)})`, `${x.prop}: ${x.value}`); break; }
      }
    }
    for (const x of r.decls) {
      if (x.prop !== 'box-shadow') continue;
      for (const part of rv(x.value).split(/,(?![^(]*\))/)) {
        const cm = part.match(new RegExp(ANY_COLOR_RE.source, 'i'));
        const c = cm && parseColor(cm[0]);
        if (!c || c.a <= 0.05 || rgbToOklch(c).C <= 0.04) continue;
        const lens = part.replace(cm[0], ' ').replace(/\binset\b/, ' ').trim().split(/\s+/).map((v) => (v === '0' ? 0 : pxOf(v)));
        if (lens.length >= 3 && lens[0] === 0 && lens[1] === 0 && lens[2] > 20) { add(d, declPos(r, 'box-shadow'), 'color', 'glow-orb', 'H29', `Chromatic zero-offset glow (blur ${Math.round(lens[2])}px) on ${trunc(sel, 30)}`, x.value); break; }
      }
    }
    if (/::?(before|after)/.test(sel) && /absolute|fixed/.test(decl('position')?.value || '')) {
      const n = parseFloat((/blur\(\s*(\d+(?:\.\d+)?)px/.exec(decl('filter')?.value || '') || [])[1] || 0);
      if (n > 40) add(d, declPos(r, 'filter'), 'color', 'glow-orb', 'H29', `Blurred orb: filter blur(${n}px) on ${trunc(sel, 30)}`, decl('filter').value);
    }
    // layout
    if (/hero/i.test(sel)) for (const x of r.decls) if (/^(min-)?height$/.test(x.prop) && /\d\s*vh\b/i.test(rv(x.value))) add(d, declPos(r, x.prop), 'layout', 'hero-vh', 'H6a', `Hero sized in vh: ${x.prop}: ${x.value} (${trunc(sel, 24)})`, x.value);
    const htmlBody = sel.split(',').some((p) => /^\s*(html|body)\s*$/.test(p));
    if (htmlBody && /\bhidden\b/.test(decl('overflow-x')?.value || '')) add(d, declPos(r, 'overflow-x'), 'layout', 'viewport-overflow', 'H34', `overflow-x: hidden on ${sel} breaks sticky; use clip on html and body`, 'overflow-x: hidden');
    for (const x of r.decls) if (/^(width|min-width)$/.test(x.prop) && /(^|[^\w.-])100vw\b/.test(x.value)) add(d, declPos(r, x.prop), 'layout', 'viewport-overflow', 'H34', `${x.prop}: ${x.value} on ${trunc(sel, 24)} (scrollbar overflow)`, x.value);
    // chrome
    const ch = /(browser|window|mac|osx)[-_]?(bar|chrome|dots|controls)|traffic[-_]?light|title[-_]?bar|window[-_]?(dots|buttons)|url[-_]?(bar|pill)/i.exec(sel) || /phone[-_]?(frame|mock(up)?)|device[-_]?frame|\bnotch\b|terminal[-_]?(chrome|frame|bar|dots|header)|(ide|editor)[-_]?(chrome|frame)|(browser|window)[-_]?frame/i.exec(sel);
    if (ch && !anyMarkup) add(d, r.pos, 'chrome', 'drawn-chrome', /phone|device|notch|terminal|ide|editor|frame/i.test(ch[0]) ? 'H47b' : 'H47a', `Re-drawn chrome selector ${trunc(sel, 30)}`, ch[0]);
    // type: tracked caps label [H67]
    if (!token && !/::first-letter/.test(sel)) {
      const tt = decl('text-transform'), fv = r.decls.find((x) => /^font-variant(-caps)?$/.test(x.prop) && /small-caps/.test(x.value));
      const fsz = decl('font-size'), px = fsz ? pxOf((/clamp\(\s*([^,]+),/.exec(rv(fsz.value)) || [, rv(fsz.value)])[1]) : null;
      const ls = decl('letter-spacing');
      const em = ls ? (/^(-?\d*\.?\d+)em$/.test(rv(ls.value).trim()) ? parseFloat(rv(ls.value)) : pxOf(rv(ls.value)) != null ? pxOf(rv(ls.value)) / (px || 16) : null) : null;
      const caps = (tt && /uppercase/.test(rv(tt.value))) || !!fv, tracked = em != null && em > 0.03, small = px != null && px <= 15;
      const LABEL = /label|caption|meta|eyebrow|kicker|tag\b|badge|chip|small|folio|footnote|legend|\bth\b|thead|figcaption|overline|dateline|byline|credit|note\b|\bnav\b|menu|link|pill|status|unit|smallcaps|count|placard/i;
      const labelish = LABEL.test(sel) && (px == null || px < 20);
      const heading = HEADING_SEL.test(sel) && !labelish, control = /btn|button|cta|control/i.test(sel);
      if (!heading && !control && ((caps && (labelish || !!fv || tracked || small)) || (tracked && (labelish || small)))) add(d, r.pos, 'type', 'tracked-caps-label', 'H67', `${trunc(sel, 30)}: ${fv ? 'small caps' : caps ? 'uppercase' : 'letter-spaced'}${tracked ? ` tracked ${+em.toFixed(3)}em` : ''}${px != null ? ` at ${Math.round(px)}px` : ''} in a label role`, sel);
    }
    // type: accent word inside a heading, CSS-only projects [H38iii]
    if (!anyMarkup && /(?:^|[\s,])(h[1-3]|\.display|\.headline|\.title)[^\s,>+~]*\s*(?:>|\s)\s*(em|i|b|strong|span|mark|\.[\w-]+)\s*$/i.test(sel) && r.decls.some((x) => /^(color|background|background-color|font-style|font-weight)$/.test(x.prop) && !/^(inherit|currentcolor|unset|initial|normal)$/i.test(x.value.trim()))) add(d, r.pos, 'type', 'accent-word-heading', 'H38iii', `Accented word inside a heading (${trunc(sel, 30)})`, sel);
    // motion
    for (const x of r.decls) {
      if (x.prop === 'transition' || x.prop === 'transition-property') {
        if (/(^|,)\s*all\b/.test(x.value.trim())) add(d, declPos(r, x.prop), 'motion', 'transition-all', 'H10a', `${x.prop}: all on ${trunc(sel, 30)}`, x.value);
        else { const h = /(?<![\w-])(width|height|top|left|right|bottom)(?![\w-])/.exec(x.value); if (h) add(d, declPos(r, x.prop), 'motion', 'layout-animation', 'H10a', `Transitioning ${h[1]} on ${trunc(sel, 30)}`, x.value); }
        if (/transform|\ball\b/.test(x.value)) motionAt = motionAt || { d, pos: declPos(r, x.prop) };
      }
    }
    if (/:focus(-visible|-within)?\b/.test(sel)) {
      const t = r.decls.find((x) => /^transition/.test(x.prop) && /outline|box-shadow|opacity|\ball\b/.test(x.value));
      if (t) add(d, declPos(r, t.prop), 'motion', 'focus-fade', 'H15', `Focus ring transition on ${trunc(sel, 30)} (the ring fades in)`, t.value);
    }
    // a11y: outline removed with no replacement [V]
    if (/^(none|0)$/.test((decl('outline')?.value || decl('outline-style')?.value || '').trim()) && !focusVisibleAnywhere && !r.decls.some((x) => x.prop === 'box-shadow' || /^border/.test(x.prop))) add(d, declPos(r, 'outline'), 'a11y', 'outline-none', 'V', `outline: none on ${trunc(sel, 30)} with no :focus-visible replacement`, 'outline: none');
  }

  // focus ring that fades in via the base rule [H15] (Hallmark check15Fade)
  {
    const base = (p) => p.replace(/:focus-visible|:focus-within|:focus|:hover|:active/g, '').trim() || '*';
    const ringProps = new Map();
    for (const r of allRules) for (const p of r.selector.split(',')) if (/:focus-visible/.test(p)) { const s = ringProps.get(base(p)) || new Set(); for (const x of r.decls) { if (x.prop === 'box-shadow') s.add('box-shadow'); if (/^outline/.test(x.prop)) s.add('outline'); } ringProps.set(base(p), s); }
    const global = ringProps.get('*') || new Set();
    for (const r of allRules) {
      if (r.keyframes || /:focus|:hover|:active/.test(r.selector)) continue;
      const t = r.decls.find((x) => /^transition(-property)?$/.test(x.prop) && ['box-shadow', 'outline'].some((p) => new RegExp(`(^|[\\s,])${p}\\b`).test(x.value) && (global.has(p) || r.selector.split(',').some((s) => ringProps.get(base(s))?.has(p)))));
      if (t) add(r.doc, declPos(r, t.prop), 'motion', 'focus-fade', 'H15', `${trunc(r.selector, 30)} transitions the property :focus-visible sets (the ring fades in)`, t.value);
    }
  }

  // content hidden at rest [H62]
  {
    const starting = allRules.filter((r) => r.selector === '@starting-style').map((r) => r.startingBody).join(' ');
    const shows = new Set(allRules.filter((r) => r.keyframes && /to|100%/.test(r.selector) && r.decls.some((x) => x.prop === 'opacity' && parseFloat(x.value) === 1)).map((r) => r.keyframes));
    const HIDE_OK = /tooltip|popover|menu|dropdown|modal|dialog|toast|overlay|backdrop|sheet|drawer|panel|:hover|:focus|:checked|:target|\[open|\[aria-(?:expanded|selected|current|pressed)|::before|::after|\.is-|\[hidden|\[aria-hidden|sr-only|visually-hidden|skip|placeholder|::marker|\[data-slot/i;
    for (const r of allRules) {
      if (r.keyframes || (r.media && /\bprint\b/.test(r.media)) || r.selector.startsWith('@')) continue;
      const h = r.decls.find((x) => (x.prop === 'opacity' && parseFloat(rv(x.value)) === 0) || (x.prop === 'visibility' && /hidden/.test(x.value)));
      if (!h || HIDE_OK.test(r.selector.replace(/:not\([^)]*\)/g, '')) || /(^|[\s,])(html|body)?\.js\b|\[data-js|\.no-js|has-js/i.test(r.selector) || starting.includes(r.selector)) continue;
      if (!/reveal|fade|animate|aos|in-view|inview|appear|enter|rise|slide|stagger|observe|lazy/i.test(r.selector) && !r.decls.some((x) => x.prop === 'transform' && /translate|scale/.test(x.value))) continue;
      const anim = r.decls.find((x) => x.prop === 'animation' || x.prop === 'animation-name');
      if (anim && anim.value.split(/[\s,]+/).some((w) => shows.has(w))) continue;
      add(r.doc, declPos(r, h.prop), 'motion', 'hidden-at-rest', 'H62', `${trunc(r.selector, 30)} is hidden at rest (${h.prop}: ${h.value}) and needs a script to appear`, `${h.prop}: ${h.value}`);
    }
  }

  // tokens: stock Tailwind swatches [H74], placeholder images [H47c]
  for (const d of docs) {
    if (!d.isMarkup && !['.css', '.scss'].includes(d.ext)) continue;
    for (const m of d.src.matchAll(TAILWIND_STOCK_RE)) add(d, m.index, 'color', 'tailwind-stock', 'H74', `Default Tailwind swatch ${m[0]}; mix the colour for this page`, m[0]);
    for (const m of d.src.matchAll(/placehold\.co|via\.placeholder\.com|placeholder\.com\/|source\.unsplash\.com\/random|dummyimage\.com|picsum\.photos|placekitten\.com|loremflickr\.com|fakeimg\.pl/gi)) add(d, m.index, 'chrome', 'placeholder-image', 'H47c', `Placeholder image service ${m[0]}`, m[0]);
  }

  // ----- markup rules
  const EN = new Set(['the', 'and', 'you', 'your', 'of', 'to', 'for', 'with', 'is', 'are', 'it', 'in', 'on', 'that', 'this', 'we', 'our', 'a', 'an', 'from', 'by', 'what', 'how']);
  const nasWords = wordListRe(NAS_BANNED_WORDS), nasPhrases = wordListRe([...NAS_PHRASES, ...NAS_PATTERN_PHRASES, 'built for the modern team', "in today's landscape", 'click here', 'enter your email below', 'quietly trusted by']);
  const extraBuzz = wordListRe(['reimagine', 'reimagined', 'journey']);
  const adverbs = wordListRe(NAS_ADVERBS);
  for (const d of docs) {
    if (!d.isMarkup) continue;
    const { tags, src } = d;
    const isHtml = d.ext === '.html' || d.ext === '.htm';
    const inner = (i) => { const c = closeIdx(tags, i); return c < 0 ? '' : src.slice(tags[i].end, tags[c].pos); };
    // tag-level checks
    const stack = [];
    let firstH1 = -1;
    tags.forEach((t, i) => {
      if (t.close) { for (let k = stack.length - 1; k >= 0; k--) if (stack[k].raw === t.raw) { stack.splice(k); break; } return; }
      const cls = classes(t), clsStr = cls.join(' ');
      // card in card [H4]
      const isCard = (t.comp && t.raw === 'Card') || cls.some((c) => { const b = c.split('--')[0]; return /(^|-)card$/i.test(b) && !/(grid|list|rail|row|wrap|deck|group|stack|container|section|scroller|track)/i.test(b); });
      if (isCard && stack.some((s) => s.isCard)) add(d, t.pos, 'layout', 'card-in-card', 'H4', `Card nested in a card (${t.comp ? `<${t.raw}>` : `class="${trunc(clsStr, 30)}"`})`, clsStr || t.raw);
      if (!t.self) stack.push({ raw: t.raw, isCard });
      if (t.name === 'h1' && firstH1 < 0) firstH1 = i;
      // tailwind: gradients, gradient text, caps labels, orbs, hero vh, viewport, outline
      if (clsStr) {
        const g = bannedGradientHues(twGradientHues(clsStr));
        if (g) add(d, t.pos, 'color', 'purple-gradient', 'H2a', `${g} gradient utilities`, clsStr);
        if (/\bbg-clip-text\b/.test(clsStr) && /\btext-transparent\b/.test(clsStr)) add(d, t.pos, 'color', 'gradient-text', 'H2b', 'Gradient text (bg-clip-text + text-transparent)', clsStr);
        if (/(^|\s)absolute(\s|$)/.test(clsStr) && /\brounded-full\b/.test(clsStr) && /(^|\s)blur-(2xl|3xl|\[(?:[4-9]\d|\d{3,})px\])/.test(clsStr)) add(d, t.pos, 'color', 'glow-orb', 'H29', 'Blurred orb (absolute + rounded-full + blur)', clsStr);
        const caps = /(^|\s)(uppercase|small-caps)(\s|$)/.test(clsStr), tracked = /(^|\s)tracking-(wide|wider|widest|\[0?\.(0[4-9]|[1-9])\d*em\])(\s|$)/.test(clsStr), small = /(^|\s)text-(xs|sm|\[(?:1[0-5]|[0-9])px\])(\s|$)/.test(clsStr);
        if (!/^h[1-6]$/.test(t.name) && !/^(button)$/.test(t.name) && ((caps && (small || tracked)) || (tracked && small))) add(d, t.pos, 'type', 'tracked-caps-label', 'H67', `Tracked-caps label <${t.raw}>: ${cls.filter((c) => /uppercase|small-caps|tracking-|^text-(xs|sm|\[)/.test(c)).join(' ')}`, clsStr);
        if (/(^|\s)(min-)?h-(screen|\[100vh\])(\s|$)/.test(clsStr) && (/hero/i.test(clsStr) || (/^(section|header)$/.test(t.name) && /<h1\b/i.test(inner(i))))) add(d, t.pos, 'layout', 'hero-vh', 'H6a', 'Hero sized to the viewport with h-screen (use dvh/svh)', clsStr);
        if (/^(html|body)$/.test(t.name) && /\boverflow-x-hidden\b/.test(clsStr)) add(d, t.pos, 'layout', 'viewport-overflow', 'H34', `overflow-x-hidden on <${t.name}> (use overflow-x-clip)`, clsStr);
        if (/(^|\s)w-(screen|\[100vw\])(\s|$)/.test(clsStr)) add(d, t.pos, 'layout', 'viewport-overflow', 'H34', 'w-screen / 100vw width (scrollbar overflow)', clsStr);
        if (/(^|\s)(?:[\w-]+:)*transition-all(\s|$)/.test(clsStr)) add(d, t.pos, 'motion', 'transition-all', 'H10a', 'transition-all utility', clsStr);
        if (/(^|\s)(?:[\w-]+:)*animate-|(^|\s)(?:[\w-]+:)*transition(-transform)?(\s|$)/.test(clsStr)) motionAt = motionAt || { d, pos: t.pos };
        if (/(^|\s)(?:[\w-]+:)*outline-none(\s|$)/.test(clsStr) && !/focus-visible:|focus:ring|focus:outline-(?!none)/.test(clsStr) && !focusVisibleAnywhere) add(d, t.pos, 'a11y', 'outline-none', 'V', 'outline-none with no focus-visible replacement', clsStr);
        const chrome = /(browser|window|mac|osx)[-_]?(bar|chrome|dots|controls)|traffic[-_]?light|title[-_]?bar|window[-_]?(dots|buttons)|url[-_]?(bar|pill)/i.exec(clsStr) || /phone[-_]?(frame|mock(up)?)|device[-_]?frame|\bnotch\b|terminal[-_]?(chrome|frame|bar|dots|header)|(ide|editor)[-_]?(chrome|frame)|(browser|window)[-_]?frame/i.exec(clsStr);
        if (chrome) add(d, t.pos, 'chrome', 'drawn-chrome', /phone|device|notch|terminal|ide|editor|frame/i.test(chrome[0]) ? 'H47b' : 'H47a', `Re-drawn chrome class "${chrome[0]}"`, clsStr);
      }
      // a11y [V]
      if ((t.name === 'div' || t.name === 'span') && !t.comp && /(^|\s)on[cC]lick\s*=/.test(t.attrs) && !hasAttr(t.attrs, 'role')) add(d, t.pos, 'a11y', 'div-onclick', 'V', `<${t.name}> with a click handler (use <button> or <a>)`, t.attrs);
      if (t.raw === 'img') {
        if (!hasAttr(t.attrs, 'alt')) add(d, t.pos, 'a11y', 'img-alt', 'V', '<img> without alt (alt="" if decorative)', t.attrs);
        if (!(hasAttr(t.attrs, 'width') && hasAttr(t.attrs, 'height'))) add(d, t.pos, 'a11y', 'img-size', 'V', '<img> without width and height (layout shift)', t.attrs);
      }
      if ((t.name === 'button' || t.raw === 'Button') && !t.self && !/aria-label|aria-labelledby|(^|\s)title\s*=/.test(t.attrs)) {
        const inn = inner(i);
        if (/<(svg|i|img)\b|<[A-Z]\w*Icon\b|<Icon\b/.test(inn) && !/[\p{L}\p{N}]/u.test(plain(inn))) add(d, t.pos, 'a11y', 'icon-button-label', 'V', 'Icon-only button without aria-label', trunc(inn, 40));
      }
      if (t.name === 'meta' && /name\s*=\s*["']viewport/i.test(t.attrs) && /user-scalable\s*=\s*(no|0)|maximum-scale\s*=\s*1(\.0+)?(?![\d.])/i.test(t.attrs)) add(d, t.pos, 'a11y', 'no-zoom', 'V', 'Viewport disables zoom (user-scalable=no / maximum-scale=1)', t.attrs);
    });
    for (const m of src.matchAll(/onPaste\s*=\s*\{[^}]*preventDefault|onpaste\s*=\s*["'][^"']*(return false|preventDefault)|addEventListener\(\s*['"]paste['"][\s\S]{0,200}?preventDefault/gi)) add(d, m.index, 'a11y', 'paste-blocked', 'V', 'Paste blocked on an input', m[0]);
    if (isHtml && /<html\b/i.test(src)) {
      const ht = tags.find((t) => t.name === 'html' && !t.close);
      if (ht && !getAttr(ht.attrs, 'lang')) add(d, ht.pos, 'a11y', 'html-lang', 'V', '<html> without lang', '<html>');
      if (!/<title\b[^>]*>\s*[^<\s][^<]*<\/title>/i.test(src)) add(d, 0, 'a11y', 'doc-title', 'V', 'Document without a <title>', '');
    }

    // heading internals: italic word [H38i], accent word [H38iii], eyebrow [H54], colon reveal [NAS]
    const anc = [];
    { const st = []; tags.forEach((t, i) => { if (t.close) { const k = st.map((x) => x.raw).lastIndexOf(t.raw); if (k >= 0) st.length = k; return; } anc[i] = st.map((x) => x.name); if (!t.self) st.push(t); }); }
    tags.forEach((t, i) => {
      if (t.close || !/^h[1-3]$/.test(t.name)) return;
      const inn = inner(i), headLen = plain(inn).replace(/\s+/g, '').length || 1;
      if (/<(em|i)\b[^>]*>[\s\S]*?[\p{L}\p{N}][\s\S]*?<\/\1>/u.test(inn)) add(d, t.pos, 'type', 'italic-word-heading', 'H38i', `<em>/<i> inside <${t.name}>`, plain(inn));
      for (const m of inn.matchAll(/<(span|strong|b|mark)\b([^>]*)>([\s\S]*?)<\/\1>/gi)) {
        const c = (getAttr(m[2], 'class') || '').split(/\s+/).filter(Boolean);
        const cover = plain(m[3]).replace(/\s+/g, '').length / headLen;
        if (!c.length || cover >= 0.8 || !/[\p{L}\p{N}]/u.test(plain(m[3]))) continue;
        const twMark = c.some((x) => /^(italic|font-serif|bg-clip-text|underline|(text|bg|decoration)-(?!transparent|inherit|current|left|right|center|xs|sm|base|lg|[2-9]?xl|balance|pretty|wrap|nowrap)[a-z]+(-\d{2,3})?(\/\d+)?)$/.test(x));
        const cssMark = declsFor(c).some((x) => /^(color|background|background-color|font-style|font-weight|-webkit-text-stroke|text-decoration|text-decoration-color|border-bottom|box-shadow)$/.test(x.prop) && !/^(inherit|currentcolor|unset|initial|normal)$/i.test(x.value.trim()));
        if (twMark || cssMark) { add(d, t.pos, 'type', 'accent-word-heading', 'H38iii', `Accented word "${trunc(plain(m[3]), 24)}" inside <${t.name}>`, plain(inn)); break; }
      }
      const text = plain(inn);
      if (/^[A-Z][^:]{1,40}:\s+[a-z]/.test(text)) add(d, t.pos, 'copy', 'colon-reveal', 'NAS', `Colon reveal in a heading: "${trunc(text, 40)}"`, text);
      // eyebrow: the element right before the heading, short and inert
      let k = i - 1;
      if (k < 0 || !tags[k].close) return;
      if (src.slice(tags[k].end, t.pos).trim()) return;
      const closeTag = tags[k];
      let open = -1;
      for (let j = k - 1, depth = 0; j >= 0; j--) { if (tags[j].raw !== closeTag.raw) continue; if (tags[j].close) depth++; else if (depth === 0) { open = j; break; } else depth--; }
      if (open < 0) return;
      const A = tags[open];
      if (/^(figcaption|label|legend|caption|th|dt|summary|option|code|kbd|button|select|nav|time|a|img|svg|ul|ol|table|form|section|article|header|footer|main|figure|aside)$/.test(A.name)) return;
      if (/aria-hidden\s*=\s*["']?true|role\s*=\s*["']status|aria-live|(^|\s)for\s*=/i.test(A.attrs) || hasAttr(t.attrs, 'hidden')) return;
      if ((anc[open] || []).some((n) => /^(form|fieldset|table|thead|tbody|nav|menu|dl|select|figcaption|label|button)$/.test(n))) return;
      const aInner = src.slice(A.end, closeTag.pos);
      if (/<(p|ul|ol|hr|h[1-6]|img|table|figure|section|article|blockquote|form|dl|br)\b/i.test(aInner) || /<time\b[^>]*\sdatetime\s*=/i.test(aInner)) return;
      if (/<a\b[^>]*\shref\s*=\s*["'](?!#?["'])/i.test(aInner)) return;
      const at = plain(aInner);
      if (!at || at.split(/[\s·/|—–]+/).filter(Boolean).length > 7 || at.length > 56 || /^[\d.,]+\s*(?:[%°+]|[a-z]{1,3})$/i.test(at) || /[\w/-]+\.[a-z]{1,4}$/i.test(at)) return;
      const ac = getAttr(A.attrs, 'class') || '';
      if (/logo|brand|wordmark/i.test(ac)) return;
      const stripped = at.replace(/^\s*(?:no\.?\s*)?\d{1,3}(?:\s*[·./—–-]\s*|\s+|$)/i, '').trim();
      if ((stripped.match(/\d/g) || []).length >= 2) return;
      const ANNOUNCE = /^(features?|benefits?|introducing|new|how it works?|the (process|tour)|our (process|story|work|team|approach|values?)|why (us|choose|we)|pricing|plans?|faq|questions?|testimonials?|reviews?|trusted by|as seen in|what we do|about( us)?|services?|solutions?|use cases?|get started|contact|team|work|projects?|gallery|blog|news|resources?|examples?|overview)$/i;
      const CLS = /\b(eyebrow|kicker|overline|superhead|suphead|rubric|strap(line)?|pre-?(title|head(ing)?)|section-?label|num-?label|chapter|ordinal|topic|category|dept)\b|__(num|label|tag|kicker|chip|badge|meta|index|caps|micro)\b|\b(tag|chip|badge|meta|caps|micro|label|index)\b/i;
      const ad = declsFor(ac.split(/\s+/).filter(Boolean));
      const capsSig = /\buppercase\b/.test(ac) || /uppercase/.test(dval(ad, 'text-transform') || '') || (at.replace(/[^A-Za-z]/g, '').length >= 3 && (at.match(/[A-Z]/g) || []).length / at.replace(/[^A-Za-z]/g, '').length >= 0.6);
      const trackSig = /\btracking-(wide|wider|widest)\b/.test(ac) || /em|px/.test(dval(ad, 'letter-spacing') || '');
      if ((anc[open] || []).includes('ol') && !ANNOUNCE.test(stripped)) return;
      if (CLS.test(ac) || ANNOUNCE.test(stripped) || (capsSig && (trackSig || /\btext-(xs|sm)\b/.test(ac) || (pxOf(dval(ad, 'font-size')) || 99) <= 15 || A.name === 'span' || A.name === 'small'))) add(d, A.pos, 'type', 'eyebrow', 'H54', `Eyebrow "${trunc(at, 30)}" before <${t.name}>`, at);
    });

    // hero: stock second action [H19]
    if (firstH1 >= 0) {
      let hero = -1;
      for (let j = firstH1 - 1; j >= 0; j--) { const t = tags[j]; if (!t.close && /^(section|header)$/.test(t.name)) { const c = closeIdx(tags, j); if (c > firstH1) { hero = j; break; } } }
      if (hero >= 0) {
        const end = closeIdx(tags, hero), ctrls = [];
        for (let j = hero + 1; j < end; j++) {
          const t = tags[j];
          if (t.close || t.self || !(t.name === 'button' || t.raw === 'Button' || (t.name === 'a' && /btn|cta|button/i.test(getAttr(t.attrs, 'class') || '')))) continue;
          ctrls.push({ t, label: plain(inner(j)).replace(/[→›»]|->/g, '').trim() });
        }
        if (ctrls.length >= 2 && SECOND_CTA_RE.test(ctrls[1].label)) add(d, ctrls[1].t.pos, 'copy', 'stock-cta', 'H19', `Stock second action in the hero: "${trunc(ctrls[0].label, 20)}" then "${ctrls[1].label}"`, ctrls[1].label);
      }
    }

    // template punctuation [H63]
    const TEXT_TAGS = /^(p|span|li|small|a|div|figcaption|td|th|h[1-6]|time|dd|dt|cite|strong|em|b|label|button|summary)$/;
    tags.forEach((t, i) => {
      if (t.close || t.self || !TEXT_TAGS.test(t.name) || /marquee|ticker|tape|crawl/i.test(getAttr(t.attrs, 'class') || '')) return;
      const inn = inner(i);
      if (!inn || /<(p|div|li|section|article|ul|ol|table)\b/i.test(inn)) return;
      const text = plain(inn);
      if ((` ${text} `.match(/\s[·•]\s/g) || []).length >= 2) add(d, t.pos, 'copy', 'meta-dots', 'H63', `Middle-dot meta string "${trunc(text, 40)}"`, text);
      if ((t.name === 'a' || t.name === 'button' || t.raw === 'Button' || t.raw === 'Link') && /(→|->|›|»|⟶)\s*$/.test(text)) add(d, t.pos, 'copy', 'glued-arrow', 'H63', `Arrow glued to the label "${trunc(text, 30)}"`, text);
    });

    // copy over visible prose
    const prose = proseOf(src, d.ext, tags);
    const words = prose.toLowerCase().match(/[a-z']+/g) || [];
    const htmlLang = (/<html\b[^>]*\slang\s*=\s*["']?([\w-]+)/i.exec(src) || [])[1];
    const english = htmlLang ? /^en\b/i.test(htmlLang) : words.length >= 5 && words.filter((w) => EN.has(w)).length / words.length >= 0.08;
    const seen = new Set();
    const once = (m, id, gate, label, level = 'fail', cat = 'copy') => { const w = m[0].toLowerCase().replace(/\s+/g, ' '); if (seen.has(id + w)) return; seen.add(id + w); add(d, m.index, cat, id, gate, `${label} "${m[0].trim()}"`, m[0], level); };
    for (const m of prose.matchAll(nasWords)) once(m, 'nas-word', 'NAS', 'Banned word');
    for (const m of prose.matchAll(nasPhrases)) once(m, 'nas-phrase', 'NAS', 'Empty phrase');
    for (const m of prose.matchAll(new RegExp(HALLMARK_BUZZ_RE.source, 'gi'))) if (!seen.has('nas-word' + m[0].toLowerCase())) once(m, 'buzzword', 'H19', 'Buzzword');
    for (const m of prose.matchAll(extraBuzz)) once(m, 'buzzword', 'H19', 'Buzzword');
    for (const [re, what] of TELLS19) { const m = re.exec(prose); if (m) add(d, m.index, 'copy', 'copy-tell', 'H19', `${what}: "${trunc(m[0], 40)}"`, m[0], what === 'template footer line' ? 'warn' : 'fail'); }
    for (const m of prose.matchAll(new RegExp(PLACEHOLDER_NAME_RE.source, 'g'))) once(m, 'placeholder-name', 'H19', 'Placeholder name');
    for (const m of prose.matchAll(/\b(Nexus|Item \d|Card Title)\b/g)) once(m, 'placeholder-name', 'H19', 'Placeholder name');
    const flat = prose.replace(/[\r\n\t]/g, ' ');
    const rebut = [...flat.matchAll(new RegExp(REBUTTAL_RE.source, 'gi'))];
    if (rebut.length >= 3) add(d, rebut[0].index, 'copy', 'rebuttal-cadence', 'H19', `Rebuttal cadence repeated ${rebut.length} times ("${trunc(rebut[0][0], 40)}")`, rebut[0][0]);
    const binary = [...flat.matchAll(new RegExp(NOT_X_ITS_Y_RE.source, 'gi'))];
    if (binary.length >= 3) add(d, binary[0].index, 'copy', 'binary-contrast', 'NAS', `"Not X, it's Y" used ${binary.length} times`, binary[0][0]);
    if (english) { const m = /\w\s--\s\w|[—–]/.exec(prose); if (m) add(d, m.index, 'finish', 'dash', 'H19', `Dash "${m[0].trim()}" in English copy: a comma, colon, full stop or parentheses`, m[0], 'warn'); }
    const adv = [...prose.matchAll(adverbs)];
    if (adv.length >= 4) add(d, adv[0].index, 'finish', 'nas-adverbs', 'NAS', `${adv.length} often-empty adverbs (${[...new Set(adv.map((m) => m[0].toLowerCase()))].slice(0, 5).join(', ')})`, adv[0][0], 'warn');
    for (const m of prose.matchAll(/(?<!\.)\.\.\.(?!\.)/g)) { add(d, m.index, 'a11y', 'ascii-ellipsis', 'V', '"..." instead of "…"', m[0]); break; }
  }

  // ----- project level
  if (motionAt && !prmAnywhere) add(motionAt.d, motionAt.pos, 'motion', 'no-reduced-motion', 'H27', 'Motion present, no prefers-reduced-motion fallback (or motion-reduce:/motion-safe:)', '');
  {
    const cand = ['--paper', '--color-paper', '--bg', '--background', '--color-background', '--color-bg', '--surface', '--color-surface'].map((k) => vars[k]).find(Boolean);
    let bg = cand ? rv(cand) : null;
    if (!bg) for (const r of allRules) if (!r.media && r.selector.split(',').some((p) => /^\s*(html|body)\s*$/.test(p))) { const x = r.decls.filter((y) => /^background(-color)?$/.test(y.prop)).pop(); if (x) bg = rv(x.value); }
    const c = bg && parseColor((String(bg).match(new RegExp(ANY_COLOR_RE.source, 'i')) || [])[0] || '');
    const dark = c && rgbToOklch(c).L < 0.4;
    const bodyTag = docs.flatMap((d) => d.tags.filter((t) => (t.name === 'html' || t.name === 'body') && !t.close).map((t) => ({ d, t }))).find(({ t }) => /\bdark\b|bg-(zinc|slate|neutral|gray|stone|black)-(9\d\d)|bg-black/.test(getAttr(t.attrs, 'class') || ''));
    if ((dark || bodyTag) && !bare.some((s) => /color-scheme/.test(s))) {
      const at = bodyTag || { d: docs.find((d) => d.rules.length) || docs[0], t: null };
      add(at.d, at.t ? at.t.pos : 0, 'a11y', 'color-scheme', 'V', 'Dark UI without color-scheme: dark (scrollbars, form controls stay light)', bg || '');
    }
  }
}

const BAN_CATS = ['type', 'color', 'shape', 'material', 'layout', 'icons', 'motion', 'copy', 'chrome'];
const counted = (h) => h.level !== 'warn' && BAN_CATS.includes(h.cat);
const cats = [...new Set(hits.filter(counted).map((h) => h.cat))];
const verdict = cats.length >= 3 ? 'REDO_TOKENS' : cats.length ? 'PATCH' : 'PASS';
const result = { verdict, ban_categories: cats, files: files.length, uncounted: hits.filter((h) => !counted(h) && h.cat !== 'studio' && h.cat !== 'tokens').length, hits: hits.map((h) => ({ ...h, counted: counted(h), file: h.file === '-' ? '-' : relative(process.cwd(), h.file) })) };

if (opt.json) console.log(JSON.stringify(result, null, 2));
else {
  console.log(`anti-slop: ${verdict}  (${cats.length} ban categories: ${cats.join(', ') || 'none'}; ${files.length} files)`);
  for (const h of result.hits) console.log(`  [${h.cat}] ${h.file}:${h.line}  ${h.level === 'warn' ? 'WARN ' : ''}${h.msg}${h.match ? `  -> ${h.match}` : ''}`);
  if (result.uncounted) console.log(`  (${result.uncounted} a11y/finish/WARN hits listed above do not count toward the verdict; fix them anyway)`);
  if (verdict === 'REDO_TOKENS') console.log('3+ categories: redo tokens and layout, do not patch colors.');
}
process.exit(verdict === 'REDO_TOKENS' ? 2 : 0);

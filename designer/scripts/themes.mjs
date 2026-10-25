#!/usr/bin/env node
// Hallmark theme seeds: list | match "<brief>" | show <slug> | tokens <slug>  [--json]
import { readFileSync, existsSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import path from 'node:path';
import { parseColor, toHex, flattenOklch, flattenColors, oklchToRgb, rgbToOklch } from './lib/color.mjs';

const DIR = path.join(path.dirname(fileURLToPath(import.meta.url)), '..', 'data', 'hallmark', 'themes');
const FAMILIES = ['editorial', 'modern-minimal', 'atmospheric', 'playful'];

export function loadIndex() { return JSON.parse(readFileSync(path.join(DIR, 'index.json'), 'utf8')).themes; }
function getTheme(slug) {
  const s = String(slug || '').toLowerCase().trim();
  const t = loadIndex().find(x => x.slug === s || x.name.toLowerCase() === s);
  if (!t) throw new Error(`unknown theme "${slug}" (try: themes.mjs list)`);
  return t;
}
const mdOf = t => readFileSync(path.join(DIR, `${t.slug}.md`), 'utf8');

// ---------- list
export function list(family) {
  if (family && !FAMILIES.includes(family)) throw new Error(`--family must be one of ${FAMILIES.join('|')}`);
  return loadIndex().filter(t => !family || t.genre === family);
}

// ---------- match
const STOP = new Set('a an the and or for with of to in on at by from my our your this that is are be app site page website web landing product new'.split(' '));
const stem = w => w.length > 4 && w.endsWith('ies') ? w.slice(0, -3) + 'y' : w.length > 3 && w.endsWith('s') && !w.endsWith('ss') ? w.slice(0, -1) : w;
const words = s => String(s).toLowerCase().split(/[^\p{L}\p{N}]+/u).filter(w => w.length > 1);
const GENRE_WORDS = {
  atmospheric: 'ai generative music video image voice model playground moody cinematic nocturnal night after-dark creative film synth audio',
  editorial: 'portfolio manifesto specimen typography agency magazine podcast brand story journal blog editorial essay publication studio',
  'modern-minimal': 'saas enterprise api platform developer infra infrastructure b2b dashboard billing minimal tool devtool analytics',
  playful: 'playful fun friendly soft kid kids child children game games community family toy cute teen',
};
const DARK = new Set(['dark', 'night', 'nocturnal', 'black', 'moody', 'noir']);
const LIGHT = new Set(['light', 'bright', 'white', 'airy', 'pale']);
const LOUD = new Set(['bold', 'loud', 'vivid', 'colorful', 'colourful', 'vibrant', 'maximal', 'saturated']);
const QUIET = new Set(['calm', 'quiet', 'restrained', 'minimal', 'subtle', 'understated', 'serene']);
const CLASS_WORDS = ['serif', 'sans', 'mono', 'pixel', 'handwritten', 'condensed', 'slab', 'rounded', 'geometric', 'blackletter', 'grotesk', 'heavy'];

export function match(brief, n = 5) {
  const q = String(brief).toLowerCase();
  const qs = new Set(words(q).filter(w => !STOP.has(w)).map(stem));
  if (!qs.size) throw new Error('empty brief');
  const out = loadIndex().map(t => {
    let score = 0; const why = [];
    const add = (v, r) => { score += v; why.push(r); };
    if (qs.has(t.slug) || q.includes(t.name.toLowerCase())) add(4, `name ${t.name}`);
    const kw = [];
    for (const k of t.keywords) {
      const hit = k.includes(' ') ? q.includes(k) : qs.has(stem(k));
      if (hit) { score += k.includes(' ') ? 3 : 2; kw.push(k); }
    }
    if (kw.length) why.push(`keywords: ${kw.join(', ')}`);
    const gw = GENRE_WORDS[t.genre].split(' ').filter(w => qs.has(stem(w)) || (w.includes('-') && q.includes(w)));
    if (gw.length) add(Math.min(3, 1.5 * gw.length), `genre ${t.genre} (${gw.join(', ')})`);
    if (qs.has(t.genre) || (t.genre === 'modern-minimal' && q.includes('modern minimal'))) add(2, `genre named`);
    if (t.paper.band === 'dark' && [...DARK].some(w => qs.has(w))) add(2, 'dark paper');
    if (t.paper.band === 'light' && [...LIGHT].some(w => qs.has(w))) add(1, 'light paper');
    if (/^warm|^cool/.test(t.accent.band) && qs.has(t.accent.band)) add(1, `${t.accent.band} accent`);
    if (['full-palette', 'drenched'].includes(t.posture) && [...LOUD].some(w => qs.has(w))) add(1.5, `posture ${t.posture}`);
    if (t.posture === 'restrained' && [...QUIET].some(w => qs.has(w))) add(1, 'restrained posture');
    const face = t.display.face.toLowerCase();
    if (q.includes(face)) add(3, `face ${t.display.face}`);
    const cw = CLASS_WORDS.filter(w => qs.has(w) && t.display.class.includes(w));
    if (cw.length) add(1, `display ${t.display.class}`);
    const mw = [...new Set(words(t.material).filter(w => w.length > 3 && !STOP.has(w)).map(stem))].filter(w => qs.has(w));
    if (mw.length) add(Math.min(2, 0.5 * mw.length), `material: ${mw.join(', ')}`);
    return { slug: t.slug, name: t.name, genre: t.genre, posture: t.posture, display: t.display.face, score: +score.toFixed(2), why, material: t.material };
  }).filter(r => r.score > 0).sort((a, b) => b.score - a.score || a.slug.localeCompare(b.slug));
  return out.slice(0, n);
}

// ---------- tokens
function rootBlock(md) {
  const m = md.match(/```css\s*\n\s*:root\s*\{([\s\S]*?)\n\}/);
  if (!m) throw new Error('theme has no :root token block');
  const decl = {}; let d = 0, st = 0; const s = m[1];
  const push = seg => { const k = seg.indexOf(':'); if (k > 0) { const name = seg.slice(0, k).trim(); if (name.startsWith('--')) decl[name] = seg.slice(k + 1).trim(); } };
  for (let i = 0; i < s.length; i++) {
    if (s[i] === '(') d++; else if (s[i] === ')') d--;
    else if (s[i] === ';' && d === 0) { push(s.slice(st, i)); st = i + 1; }
  }
  push(s.slice(st));
  return decl;
}
function resolveVars(v, decl, depth = 0) {
  if (depth > 12) return v;
  let out = '', i = 0;
  while (i < v.length) {
    const k = v.indexOf('var(', i);
    if (k < 0) { out += v.slice(i); break; }
    out += v.slice(i, k);
    let d = 0, e = k;
    for (; e < v.length; e++) { if (v[e] === '(') d++; else if (v[e] === ')' && --d === 0) break; }
    const inner = v.slice(k + 4, e); const c = inner.indexOf(',');
    const name = (c < 0 ? inner : inner.slice(0, c)).trim(), fb = c < 0 ? null : inner.slice(c + 1).trim();
    const val = decl[name] ?? fb;
    out += val == null ? v.slice(k, e + 1) : resolveVars(val, decl, depth + 1);
    i = e + 1;
  }
  return out;
}
function colorOf(name, decl) {
  if (!decl[name]) return null;
  const v = flattenColors(flattenOklch(resolveVars(decl[name], decl)));
  return parseColor(v.trim());
}
const over = (c, bg) => c.a >= 1 || !bg ? c : { r: c.r * c.a + bg.r * (1 - c.a), g: c.g * c.a + bg.g * (1 - c.a), b: c.b * c.a + bg.b * (1 - c.a), a: 1 };
const lum = c => { const f = x => { x /= 255; return x <= 0.04045 ? x / 12.92 : ((x + 0.055) / 1.055) ** 2.4; }; return 0.2126 * f(c.r) + 0.7152 * f(c.g) + 0.0722 * f(c.b); };
export const contrast = (a, b) => { const x = lum(a), y = lum(b); return (Math.max(x, y) + 0.05) / (Math.min(x, y) + 0.05); };

export function tokens(slug) {
  const t = getTheme(slug), decl = rootBlock(mdOf(t));
  const paper = colorOf('--color-paper', decl);
  const roles = {}, source = {}, notes = [];
  const set = (role, from, alts = []) => {
    for (const f of [from, ...alts]) {
      const c = colorOf(f, decl);
      if (c) { const o = over(c, paper); roles[role] = toHex(o); source[role] = f + (c.a < 1 ? ' (alpha over paper)' : ''); return o; }
    }
    return null;
  };
  set('--ink', '--color-ink'); set('--ink-dim', '--color-muted', ['--color-ink-2']);
  set('--paper', '--color-paper'); set('--paper-2', '--color-paper-2');
  set('--accent', '--color-accent'); set('--accent-ink', '--color-accent-ink');
  // danger: no theme defines one; derive a red that holds 4.5:1 on paper
  const pL = rgbToOklch(paper).L, dark = pL < 0.6;
  let L = dark ? 0.68 : 0.55, dc = oklchToRgb(L, 0.16, 27);
  for (let k = 0; k < 20 && contrast(dc, paper) < 4.5; k++) { L += dark ? 0.02 : -0.02; dc = oklchToRgb(L, 0.16, 27); }
  roles['--danger'] = toHex(dc); source['--danger'] = `derived oklch(${Math.round(L * 100)}% 0.16 27)`;
  if (!set('--rare', '--color-accent-2', ['--color-accent-deep'])) notes.push('--rare: theme spends a single accent; no second accent to map');
  set('--rule', '--color-rule'); set('--border-inner', '--color-rule');
  if (!set('--border-outer', '--color-rule-2')) {
    const r = colorOf('--color-rule', decl);
    if (r) { const o = rgbToOklch(over(r, paper)); roles['--border-outer'] = toHex(oklchToRgb(Math.max(0, o.L + (dark ? 0.08 : -0.08)), o.C, o.H)); source['--border-outer'] = 'derived from --color-rule (L ' + (dark ? '+' : '-') + '8%)'; }
  }
  set('--focus', '--color-focus');
  if (decl['--radius-card']) { roles['--radius'] = resolveVars(decl['--radius-card'], decl); source['--radius'] = '--radius-card'; }
  for (const [role, from] of [['--font-display', '--font-display'], ['--font-body', '--font-body'], ['--font-mono', '--font-outlier']])
    if (decl[from]) { roles[role] = resolveVars(decl[from], decl); source[role] = from; }
  if (!decl['--font-outlier']) notes.push('--font-mono: theme has no outlier face');
  const chk = (a, b, min, label) => { const x = parseColor(roles[a] || ''), y = parseColor(roles[b] || ''); if (x && y) { const r = contrast(x, y); if (r < min) notes.push(`${label} ${r.toFixed(2)}:1 < ${min}:1`); } };
  chk('--ink', '--paper', 4.5, 'ink on paper'); chk('--ink-dim', '--paper', 4.5, 'ink-dim on paper');
  chk('--accent-ink', '--accent', 4.5, 'accent-ink on accent'); chk('--focus', '--paper', 3, 'focus on paper');
  return { slug: t.slug, name: t.name, genre: t.genre, roles, source, notes };
}

function faces(decl) {
  const fam = v => (v || '').split(',')[0].trim().replace(/^["']|["']$/g, '');
  const r = {};
  for (const [k, n] of [['display', '--font-display'], ['body', '--font-body'], ['outlier', '--font-outlier']]) if (decl[n]) r[k] = fam(resolveVars(decl[n], decl));
  return r;
}

// ---------- CLI
function main(argv) {
  const json = argv.includes('--json');
  const a = argv.filter(x => x !== '--json');
  const opt = k => { const i = a.indexOf(k); if (i < 0) return undefined; const v = a[i + 1]; a.splice(i, 2); return v; };
  const family = opt('--family'), nOpt = opt('-n');
  const [cmd, ...rest] = a;
  const arg = rest.join(' ');
  const say = o => console.log(JSON.stringify(o, null, 2));
  if (cmd === 'list') {
    const r = list(family);
    if (json) return say(r.map(t => ({ slug: t.slug, name: t.name, genre: t.genre, posture: t.posture, paper: t.paper.band, display: t.display.face, accent: t.accent.band, material: t.material })));
    const pad = (s, w) => String(s).padEnd(w);
    console.log(`${r.length} themes${family ? ` (${family})` : ''}`);
    for (const t of r) console.log(`  ${pad(t.slug, 12)} ${pad(t.genre, 15)} ${pad(t.posture, 13)} ${pad(t.paper.band, 6)} ${pad(t.display.face, 22)} ${t.accent.band}`);
    return;
  }
  if (cmd === 'match') {
    if (!arg) throw new Error('usage: themes.mjs match "<brief>"');
    const n = nOpt ? Math.max(1, Math.min(20, parseInt(nOpt, 10) || 5)) : 5;
    const r = match(arg, n);
    if (json) return say({ brief: arg, results: r });
    if (!r.length) { console.log('no clean match; editorial is the default family: themes.mjs list --family editorial'); return; }
    for (const m of r) console.log(`${m.slug.padEnd(12)} ${String(m.score).padStart(5)}  ${m.genre}, ${m.posture}, ${m.display}\n  ${m.why.join('; ')}\n  ${m.material}`);
    console.log('\nnext: themes.mjs show <slug> | tokens <slug>. A seed lends palette, type and surfaces, never layout.');
    return;
  }
  if (cmd === 'show') {
    const t = getTheme(arg), md = mdOf(t), f = faces(rootBlock(md));
    if (json) return say({ ...t, faces: f, markdown: md });
    console.log(`faces: ${Object.entries(f).map(([k, v]) => `${v} (${k})`).join(', ')}\n`);
    console.log(md);
    return;
  }
  if (cmd === 'tokens') {
    const r = tokens(arg);
    if (json) return say(r);
    const w = Math.max(...Object.keys(r.roles).map(k => k.length));
    console.log(`/* ${r.name} (${r.genre}), Hallmark theme seed converted to hex; lock your own tokens from here */`);
    console.log(':root {');
    for (const [k, v] of Object.entries(r.roles)) console.log(`  ${(k + ':').padEnd(w + 1)} ${v};${/derived|alpha/.test(r.source[k]) ? ` /* ${r.source[k]} */` : ''}`);
    for (const n of r.notes) console.log(`  /* ${n} */`);
    console.log('}');
    return;
  }
  console.log(`usage:
  themes.mjs list [--family ${FAMILIES.join('|')}] [--json]
  themes.mjs match "<brief>" [-n 5] [--json]
  themes.mjs show <slug> [--json]
  themes.mjs tokens <slug> [--json]`);
  if (cmd) process.exitCode = 1;
}

const isMain = process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url);
if (isMain) {
  try { if (!existsSync(DIR)) throw new Error(`missing ${DIR}`); main(process.argv.slice(2)); }
  catch (e) { console.error(`themes: ${e.message}`); process.exit(1); }
}

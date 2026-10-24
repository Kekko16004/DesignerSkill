#!/usr/bin/env node
// UI/UX knowledge search over data/uupm (zero-dependency port of UI/UX Pro Max core.py + search.py, MIT).
//
//   node search.mjs "<query>" [--domain <d>] [--stack <name>] [-n 3] [--json] [--full] [--raw]
//   node search.mjs brief "<product description>" [--json]
//
// Domains: style color chart landing product ux typography google-fonts icons gsap react web
// Every result carries designer_flags (lib/slop.mjs); flagged rows sort below clean ones unless --raw.
import { readFileSync, existsSync, readdirSync } from 'node:fs';
import { join, resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { slopFlags, isBannedFont, TAILWIND_STOCK_HEXES, INDIGO_HEXES } from './lib/slop.mjs';
import { parseColor } from './lib/color.mjs';

const SKILL = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const DATA = join(SKILL, 'data', 'uupm');
const MAX_RESULTS = 3;
const TRUNCATE_AT = 300;

// ---- config (verbatim from core.py)
const CSV_CONFIG = {
  style: { file: 'styles.csv', search_cols: ['Style ID', 'Style Category', 'Aliases', 'Keywords', 'Best For', 'Type', 'AI Prompt Keywords'], output_cols: ['Style ID', 'Style Category', 'Aliases', 'Status', 'Parent Style ID', 'Preferred Mode', 'Type', 'Keywords', 'Primary Colors', 'Effects & Animation', 'Best For', 'Light Mode ✓', 'Dark Mode ✓', 'Performance', 'Accessibility', 'Framework Compatibility', 'Complexity', 'AI Prompt Keywords', 'CSS/Technical Keywords', 'Implementation Checklist', 'Design System Variables'] },
  color: { file: 'colors.csv', search_cols: ['Product Type', 'Notes'], output_cols: ['Product Type', 'Primary', 'On Primary', 'Secondary', 'On Secondary', 'Accent', 'On Accent', 'Background', 'Foreground', 'Card', 'Card Foreground', 'Muted', 'Muted Foreground', 'Border', 'Destructive', 'On Destructive', 'Ring', 'Notes'] },
  chart: { file: 'charts.csv', search_cols: ['Data Type', 'Keywords', 'Best Chart Type', 'When to Use', 'When NOT to Use', 'Accessibility Notes'], output_cols: ['Data Type', 'Keywords', 'Best Chart Type', 'Secondary Options', 'When to Use', 'When NOT to Use', 'Data Volume Threshold', 'Color Guidance', 'Accessibility Grade', 'Accessibility Risk', 'Accessibility Notes', 'A11y Fallback', 'Library Recommendation', 'Interactive Level'] },
  landing: { file: 'landing.csv', search_cols: ['Pattern ID', 'Pattern Name', 'Aliases', 'Keywords', 'Conversion Optimization', 'Section Order'], output_cols: ['Pattern ID', 'Pattern Name', 'Aliases', 'Keywords', 'Section Order', 'Primary CTA Placement', 'Color Strategy', 'Conversion Optimization'] },
  product: { file: 'products.csv', search_cols: ['Product Type', 'Keywords', 'Primary Style Recommendation', 'Key Considerations'], output_cols: ['Product Type', 'Keywords', 'Primary Style Recommendation', 'Secondary Styles', 'Landing Page Pattern', 'Dashboard Style (if applicable)', 'Color Palette Focus'] },
  ux: { file: 'ux-guidelines.csv', search_cols: ['Category', 'Issue', 'Description', 'Platform'], output_cols: ['Category', 'Issue', 'Platform', 'Description', 'Do', "Don't", 'Code Example Good', 'Code Example Bad', 'Severity'] },
  typography: { file: 'typography.csv', search_cols: ['Font Pairing Name', 'Category', 'Mood/Style Keywords', 'Best For', 'Heading Font', 'Body Font'], output_cols: ['Font Pairing Name', 'Category', 'Heading Font', 'Body Font', 'Mood/Style Keywords', 'Best For', 'Google Fonts URL', 'CSS Import', 'Tailwind Config', 'Notes'] },
  icons: { file: 'icons.csv', search_cols: ['Category', 'Icon Name', 'Keywords', 'Best For', 'Library'], output_cols: ['Category', 'Icon Name', 'Keywords', 'Library', 'Import Code', 'Usage', 'Best For', 'Style', 'Semantic Role', 'Allowed Contexts'] },
  gsap: { file: 'motion.csv', search_cols: ['Category', 'Intensity Tier', 'Keywords', 'Trigger'], output_cols: ['Category', 'Intensity Tier', 'Trigger', 'Duration', 'Easing', 'GSAP Snippet', 'Framework Notes', 'Do', "Don't", 'Performance Notes'] },
  react: { file: 'react-performance.csv', search_cols: ['Category', 'Issue', 'Keywords', 'Description'], output_cols: ['Category', 'Issue', 'Platform', 'Description', 'Do', "Don't", 'Code Example Good', 'Code Example Bad', 'Severity'] },
  web: { file: 'app-interface.csv', search_cols: ['Category', 'Issue', 'Keywords', 'Description'], output_cols: ['Category', 'Issue', 'Platform', 'Description', 'Do', "Don't", 'Code Example Good', 'Code Example Bad', 'Severity'] },
  // designer: License column appended to the vendored google-fonts.csv
  'google-fonts': { file: 'google-fonts.csv', search_cols: ['Family', 'Category', 'Stroke', 'Classifications', 'Keywords', 'Subsets', 'Designers'], output_cols: ['Family', 'Category', 'Stroke', 'Classifications', 'Styles', 'Variable Axes', 'Subsets', 'Designers', 'Popularity Rank', 'Google Fonts URL', 'License'] },
};
const UNTRUNCATED_COLS = new Set(['Code Example Good', 'Code Example Bad', 'Code Good', 'Code Bad', 'Implementation Checklist', 'Design System Variables', 'CSS Import', 'Tailwind Config', 'GSAP Snippet']);
const STACK_COLS = { search_cols: ['Category', 'Guideline', 'Description', 'Do', "Don't", 'Code Good', 'Code Bad'], output_cols: ['Category', 'Guideline', 'Description', 'Do', "Don't", 'Code Good', 'Code Bad', 'Severity', 'Docs URL', 'Applies To', 'Status', 'Verified At'] };
const STACKS = existsSync(join(DATA, 'stacks')) ? readdirSync(join(DATA, 'stacks')).filter((f) => f.endsWith('.csv')).map((f) => f.slice(0, -4)).sort() : [];
const STACK_CURRENT_VERSIONS = { react: [19], nextjs: [16], vue: [3], svelte: [5], astro: [7], 'html-tailwind': [4], 'react-native': [0, 86], flutter: [3, 44], swiftui: [16] };
const STACK_QUERY_NAMES = { react: 'react', nextjs: 'next(?:\\.js|js)?', vue: 'vue', svelte: 'svelte', astro: 'astro', 'html-tailwind': 'tailwind(?:\\s*css)?', 'react-native': 'react[\\s-]*native', flutter: 'flutter', swiftui: '(?:ios|swiftui\\s+ios)' };

const FLOORS = { style: 4.3, landing: 4.0, product: 6.0, icons: 5.8, react: 3.3 };
const THRESHOLDS = Object.fromEntries(Object.keys(CSV_CONFIG).map((d) => [d, { min_score: FLOORS[d] || 0, min_margin: 0, min_coverage: d === 'landing' ? 0.5 : 0 }]));
const STACK_THRESHOLD = { min_score: 3.6, min_margin: 0, min_coverage: 1 / 3 };
const NO_THRESHOLD = { min_score: 0, min_margin: 0, min_coverage: 0 };
const STYLE_IDENTITY_FIELDS = ['Style ID', 'Style Category', 'Aliases'];
const LANDING_IDENTITY_FIELDS = ['Pattern ID', 'Pattern Name', 'Aliases'];
const nulls = (terms) => Object.fromEntries(terms.map((t) => [t, null]));
const REWRITES = {
  color: nulls(['color', 'palette', 'hex', 'rgb', 'token', 'semantic', 'destructive', 'muted', 'foreground']),
  landing: { testimonial: 'testimonials' },
  style: nulls(['css', 'implementation', 'variable', 'checklist', 'tailwind']),
  ux: { ux: 'accessibility', usability: 'accessibility', wcag: 'accessibility' },
  'google-fonts': { typography: 'font' },
  icons: nulls(['lucide', 'symbol', 'glyph', 'pictogram']),
  gsap: { gsap: 'animation', quickto: null, scrolltrigger: 'scroll', 'flip plugin': null, splittext: null },
  react: { nextjs: 'react', usecallback: 'memoization', useeffect: 'effects' },
  web: { aria: 'accessibility', outline: 'focus', semantic: null, autocomplete: 'input', preconnect: null },
};
const TIEBREAK = ['ux', 'product', 'style', 'color', 'typography', 'google-fonts', 'chart', 'landing', 'icons', 'gsap', 'react', 'web'];

// ---- text
const W = '[\\p{L}\\p{M}\\p{N}_]';
const reEsc = (s) => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
const STOPWORDS = new Set(['to', 'in', 'on', 'at', 'is', 'of', 'by', 'or', 'an', 'if', 'no', 'so', 'do', 'be', 'we', 'it', 'as', 'the', 'and', 'for', 'are', 'was']);
const SYNONYMS = { 'q&a': 'question answer', 'e-commerce': 'ecommerce', 'dark-mode': 'dark', darkmode: 'dark', 'light-mode': 'light', lightmode: 'light', a11y: 'accessibility', nav: 'navigation', 'sign-up': 'signup', 'log-in': 'login', colour: 'color', colours: 'colors', customisation: 'customization', organisation: 'organization', behaviour: 'behavior', 'ux/ui': 'ux ui' };
const SYN_PATTERNS = Object.entries(SYNONYMS).sort((a, b) => b[0].length - a[0].length).map(([v, c]) => [new RegExp(`(?<!${W})${reEsc(v)}(?!${W})`, 'giu'), c]);
const normalize = (text) => SYN_PATTERNS.reduce((s, [re, c]) => s.replace(re, c), String(text));
const fold = (s) => String(s ?? '').toLowerCase();
function tokenize(text) {
  return normalize(String(text).toLowerCase()).replace(/[^\p{L}\p{M}\p{N}_\s]/gu, ' ').split(/\s+/).filter((w) => w && [...w].length >= 2 && !STOPWORDS.has(w));
}
const containsPhrase = (text, phrase) => (new RegExp(W, 'u').test(phrase) ? new RegExp(`(?<!${W})${reEsc(phrase)}(?!${W})`, 'u').test(text) : text.includes(phrase));
const wordsU = (s) => String(s).match(/[\p{L}\p{M}\p{N}_]+/gu) || [];

// ---- RFC 4180 CSV -> array of objects keyed by header (BOM stripped, quoted newlines, "" escapes)
const csvCache = new Map();
function loadCsv(file) {
  if (csvCache.has(file)) return csvCache.get(file);
  let t = readFileSync(file, 'utf8');
  if (t.charCodeAt(0) === 0xfeff) t = t.slice(1);
  const rows = [];
  let row = [], f = '', q = false, i = 0;
  for (; i < t.length; i++) {
    const c = t[i];
    if (q) { if (c === '"') { if (t[i + 1] === '"') { f += '"'; i++; } else q = false; } else f += c; }
    else if (c === '"') q = true;
    else if (c === ',') { row.push(f); f = ''; }
    else if (c === '\n' || c === '\r') { if (c === '\r' && t[i + 1] === '\n') i++; row.push(f); rows.push(row); row = []; f = ''; }
    else f += c;
  }
  if (f || row.length) { row.push(f); rows.push(row); }
  const head = rows.shift() || [];
  const out = rows.filter((r) => r.length > 1 || r[0] !== '').map((r) => Object.fromEntries(head.map((h, k) => [h, r[k] ?? ''])));
  out.columns = head;
  csvCache.set(file, out);
  return out;
}
const loadRowsOrEmpty = (file) => { try { return loadCsv(file); } catch { return []; } };

// ---- BM25 (k1 1.5, b 0.75, idf ln((N-df+.5)/(df+.5)+1))
class BM25 {
  constructor(k1 = 1.5, b = 0.75) { Object.assign(this, { k1, b, N: 0, avgdl: 0, idf: new Map(), df: new Map(), tfs: [], lens: [] }); }
  fit(docs) {
    const corpus = docs.map(tokenize);
    this.N = corpus.length;
    if (!this.N) return this;
    this.lens = corpus.map((d) => d.length);
    this.avgdl = this.lens.reduce((a, b) => a + b, 0) / this.N || 1;
    for (const d of corpus) {
      const tf = new Map();
      for (const w of d) tf.set(w, (tf.get(w) || 0) + 1);
      this.tfs.push(tf);
      for (const w of tf.keys()) this.df.set(w, (this.df.get(w) || 0) + 1);
    }
    for (const [w, n] of this.df) this.idf.set(w, Math.log((this.N - n + 0.5) / (n + 0.5) + 1));
    return this;
  }
  score(query) {
    const qt = tokenize(query);
    const out = [];
    for (let i = 0; i < this.N; i++) {
      let s = 0;
      const tf = this.tfs[i], dl = this.lens[i];
      for (const t of qt) {
        const idf = this.idf.get(t);
        if (idf === undefined) continue;
        const f = tf.get(t) || 0;
        s += (idf * f * (this.k1 + 1)) / (f + this.k1 * (1 - this.b + (this.b * dl) / this.avgdl));
      }
      out.push([i, s]);
    }
    return out.sort((a, b) => b[1] - a[1]);
  }
  vocabulary() { return [...this.idf.keys()]; }
}

function coverage(index, query) {
  const t = new Set(tokenize(query));
  if (!t.size) return 0;
  let n = 0;
  for (const x of t) if (index.idf.has(x)) n++;
  return n / t.size;
}

function rewriteQuery(query, domain, index) {
  const kw = domainKeywords();
  if (!domain || !kw[domain]) return [query, []];
  const norm = normalize(query.toLowerCase());
  const rewrites = new Set(), terms = new Set();
  for (const k of kw[domain]) {
    if (!containsPhrase(norm, k)) continue;
    if (tokenize(k).some((t) => index.idf.has(t))) continue;
    const r = (REWRITES[domain] || {})[k];
    if (r) { rewrites.add(`${k}->${r}`); terms.add(r); }
  }
  if (!terms.size) return [query, []];
  return [`${query} ${[...terms].sort().join(' ')}`, [...rewrites].sort()];
}

function searchCsv(file, searchCols, outputCols, query, max, threshold, domain = null, rowFilter = null) {
  if (!existsSync(file)) return { results: [], index: null, diag: { reason: 'missing-file' } };
  let data;
  try { data = loadCsv(file); } catch { return { results: [], index: null, diag: { reason: 'read-error', error: `Unable to read search data: ${file}` } }; }
  if (rowFilter) data = data.filter(rowFilter);
  if (!data.length) return { results: [], index: null, diag: { reason: 'empty-data' } };
  const index = new BM25().fit(data.map((r) => searchCols.map((c) => String(r[c] ?? '')).join(' ')));
  const [sq, rewrites] = rewriteQuery(query, domain, index);
  const ranked = index.score(sq);
  const th = threshold || NO_THRESHOLD;
  const top = ranked[0] ? ranked[0][1] : 0, second = ranked[1] ? ranked[1][1] : 0;
  const cov = coverage(index, sq);
  const abstain = top <= th.min_score || cov < th.min_coverage || (th.min_margin > 0 && top - second < th.min_margin);
  const results = [];
  if (!abstain) for (const [i, s] of ranked.slice(0, max)) if (s > 0) results.push(project(data[i], outputCols));
  return { results, index, diag: { normalized_query: normalize(query), search_query: sq, query_rewrites: rewrites, top_score: top, runner_up_score: second, token_coverage: cov, abstained: abstain, reason: abstain ? 'low-confidence' : 'matched' } };
}
const project = (row, cols) => Object.fromEntries(cols.filter((c) => c in row).map((c) => [c, row[c]]));

// ---- difflib.SequenceMatcher(None, a, b).ratio() (no junk; autojunk only matters for len(b) >= 200)
function seqRatio(a, b) {
  a = [...a]; b = [...b];
  const la = a.length, lb = b.length;
  if (!la && !lb) return 1;
  const b2j = new Map();
  b.forEach((ch, j) => { if (!b2j.has(ch)) b2j.set(ch, []); b2j.get(ch).push(j); });
  const longest = (alo, ahi, blo, bhi) => {
    let bi = alo, bj = blo, bs = 0, j2len = new Map();
    for (let i = alo; i < ahi; i++) {
      const next = new Map();
      for (const j of b2j.get(a[i]) || []) {
        if (j < blo) continue;
        if (j >= bhi) break;
        const k = (j2len.get(j - 1) || 0) + 1;
        next.set(j, k);
        if (k > bs) { bi = i - k + 1; bj = j - k + 1; bs = k; }
      }
      j2len = next;
    }
    while (bi > alo && bj > blo && a[bi - 1] === b[bj - 1]) { bi--; bj--; bs++; }
    while (bi + bs < ahi && bj + bs < bhi && a[bi + bs] === b[bj + bs]) bs++;
    return [bi, bj, bs];
  };
  let matched = 0;
  const queue = [[0, la, 0, lb]];
  while (queue.length) {
    const [alo, ahi, blo, bhi] = queue.pop();
    const [i, j, k] = longest(alo, ahi, blo, bhi);
    if (!k) continue;
    matched += k;
    if (alo < i && blo < j) queue.push([alo, i, blo, j]);
    if (i + k < ahi && j + k < bhi) queue.push([i + k, ahi, j + k, bhi]);
  }
  return la + lb ? (2 * matched) / (la + lb) : 1;
}
const cmpTuple = (x, y) => { for (let i = 0; i < Math.max(x.length, y.length); i++) { if (x[i] === undefined) return -1; if (y[i] === undefined) return 1; if (x[i] < y[i]) return -1; if (x[i] > y[i]) return 1; } return 0; };

function passes(index, q, th) {
  const r = index.score(q);
  const top = r[0] ? r[0][1] : 0, second = r[1] ? r[1][1] : 0;
  return top > th.min_score && coverage(index, q) >= th.min_coverage && (th.min_margin <= 0 || top - second >= th.min_margin);
}
function suggestTerms(index, query, th = null, limit = 6) {
  if (!index) return [];
  const qt = new Set(tokenize(query));
  if (!qt.size) return [];
  const cands = [];
  for (const term of index.vocabulary()) {
    if (qt.has(term)) continue;
    const sim = Math.max(...[...qt].map((t) => seqRatio(t, term)));
    if (sim >= 0.72 && (!th || passes(index, term, th))) cands.push([-sim, -(index.df.get(term) || 0), term]);
  }
  return cands.sort(cmpTuple).slice(0, limit).map((c) => c[2]);
}
const rowIdentities = (row, fields) => fields.flatMap((f) => (f === 'Aliases' ? String(row[f] || '').split('|') : [row[f] || '']).map((v) => v.trim()).filter(Boolean));
function suggestIdentities(rows, query, fields, limit = 6) {
  const qt = new Set(tokenize(query));
  if (!qt.size) return [];
  const seen = new Set(), cands = [];
  for (const row of rows) {
    for (const id of rowIdentities(row, fields)) {
      const it = new Set(tokenize(id));
      if (!it.size) continue;
      let sim = 0;
      for (const s of qt) for (const t of it) sim = Math.max(sim, seqRatio(s, t));
      const key = `${sim}\u0000${it.size}\u0000${id}`;
      if (sim >= 0.72 && fold(id) !== fold(String(query).trim()) && !seen.has(key)) { seen.add(key); cands.push([-sim, it.size, id]); }
    }
  }
  return cands.sort(cmpTuple).slice(0, limit).map((c) => c[2]);
}

// ---- domain detection
let KW = null;
function domainKeywords() {
  if (KW) return KW;
  const seed = ['saas', 'ecommerce', 'fintech', 'healthcare', 'gaming', 'portfolio', 'crypto', 'fitness', 'marketplace', 'banking', 'cybersecurity', 'education', 'travel', 'restaurant', 'real estate', 'social media', 'beauty', 'spa', 'salon', 'wellness', 'booking'];
  const product = new Set(seed);
  for (const r of loadRowsOrEmpty(join(DATA, CSV_CONFIG.product.file))) {
    const label = String(r['Product Type'] || '').replace(/\([^)]*\)/g, '').trim().toLowerCase();
    if (label.length >= 4) product.add(label);
  }
  KW = {
    color: ['color', 'palette', 'hex', 'rgb', 'token', 'semantic', 'accent', 'destructive', 'muted', 'foreground'],
    chart: ['time series', 'chart', 'graph', 'visualization', 'trend', 'bar chart', 'pie', 'scatter', 'heatmap', 'funnel', 'forecast'],
    landing: ['landing', 'page', 'cta', 'conversion', 'hero', 'testimonial', 'pricing', 'section'],
    product: [...product].sort((a, b) => b.length - a.length),
    style: ['style', 'design', 'ui', 'minimalism', 'glassmorphism', 'neumorphism', 'brutalism', 'dark mode', 'flat', 'aurora', 'css', 'implementation', 'variable', 'checklist', 'tailwind'],
    ux: ['ux', 'usability', 'accessibility', 'wcag', 'touch', 'scroll', 'animation', 'keyboard', 'navigation', 'mobile'],
    typography: ['font pairing', 'typography pairing', 'heading font', 'body font'],
    'google-fonts': ['google font', 'font family', 'font weight', 'font style', 'variable font', 'noto', 'font for', 'find font', 'font subset', 'font language', 'monospace font', 'serif font', 'sans serif font', 'display font', 'handwriting font', 'font', 'typography', 'serif', 'sans'],
    icons: ['icon', 'icons', 'lucide', 'phosphor', 'heroicons', 'symbol', 'glyph', 'pictogram', 'svg icon'],
    gsap: ['gsap', 'quickto', 'scrolltrigger', 'stagger', 'magnetic cursor', 'parallax', 'page transition', 'scroll reveal', 'scroll-triggered', 'scrollytelling', 'flip plugin', 'splittext', 'shimmer', 'skeleton loader'],
    react: ['react', 'next.js', 'nextjs', 'suspense', 'memo', 'usecallback', 'useeffect', 'rerender', 'bundle', 'waterfall', 'barrel', 'dynamic import', 'rsc', 'server component'],
    web: ['aria', 'focus', 'outline', 'semantic', 'virtualize', 'autocomplete', 'form', 'input type', 'preconnect', 'drag reorder', 'single pointer', 'touch target', 'native accessibility'],
  };
  return KW;
}
export function detectDomain(query) {
  const q = normalize(query.toLowerCase());
  const scores = {};
  for (const [d, kws] of Object.entries(domainKeywords())) {
    let t = 0;
    for (const k of kws) if (containsPhrase(q, k)) { const spec = Math.max(1, k.split(/\s+/).filter(Boolean).length); t += d === 'product' ? spec : 2 * spec; }
    scores[d] = t;
  }
  if (/(?<![\p{L}\p{M}\p{N}_])#[0-9a-f]{3,8}(?![\p{L}\p{M}\p{N}_])/iu.test(q)) scores.color += 2;
  const rank = (d) => { const i = TIEBREAK.indexOf(d); return i < 0 ? 999 : i; };
  const ranked = Object.entries(scores).sort((a, b) => b[1] - a[1] || rank(a[0]) - rank(b[0]));
  return { domain: ranked[0][1] > 0 ? ranked[0][0] : 'style', runner_up: ranked[1] && ranked[1][1] > 0 ? ranked[1][0] : null };
}

// ---- identities
function styleIdentity(rows, query, allowContained = true) {
  const folded = fold(String(query ?? '').trim());
  const qt = new Set(wordsU(normalize(folded)));
  const generic = new Set(['app', 'design', 'interface', 'style', 'system', 'ui']);
  const cands = [];
  for (const row of rows) {
    const ids = rowIdentities(row, STYLE_IDENTITY_FIELDS);
    if (ids.some((i) => fold(i) === folded)) return row;
    if (!allowContained) continue;
    for (const id of ids) {
      const it = new Set(wordsU(normalize(fold(id))));
      if (it.size && [...it].every((t) => qt.has(t)) && [...it].some((t) => [...t].length >= 4)) cands.push([[...it].filter((t) => !generic.has(t)).length, it.size, id.length, row]);
    }
  }
  if (!cands.length) return null;
  cands.sort((x, y) => y[0] - x[0] || y[1] - x[1]);
  const best = cands[0];
  const ids = new Set(cands.filter((c) => c[0] === best[0] && c[1] === best[1] && c[2] === best[2]).map((c) => c[3]['Style ID'] || ''));
  return ids.size === 1 ? best[3] : null;
}
function exactRowIdentity(rows, query, fields) {
  const folded = fold(String(query ?? '').trim());
  const m = rows.filter((r) => rowIdentities(r, fields).some((i) => fold(i) === folded));
  return m.length === 1 ? m[0] : null;
}
function styleDestination(rows, matched) {
  if (!matched || (matched.Status ?? 'active') !== 'deprecated') return [matched, null];
  const parent = String(matched['Parent Style ID'] || '').trim();
  if (parent) return [rows.find((r) => r['Style ID'] === parent) || null, null];
  const domain = String(matched['Replacement Domain'] || '').trim(), rid = String(matched['Replacement ID'] || '').trim();
  if (domain === 'style' && rid) return [rows.find((r) => r['Style ID'] === rid) || null, null];
  if (domain && rid) return [null, { domain, id: rid }];
  return [null, null];
}
const exactDiag = (query, reason) => ({ normalized_query: normalize(query), search_query: query, query_rewrites: [], top_score: 0, runner_up_score: 0, token_coverage: 1, abstained: false, reason });
const validMax = (n) => Number.isInteger(n) && n >= 1 && n <= 20;

export function search(query, domain = null, max = MAX_RESULTS) {
  if (!validMax(max)) return { error: 'max_results must be an integer from 1 to 20', domain };
  const auto = domain == null;
  let runner = null, styleRows = null, exact = null, redirect = null, landingRows = null;
  if (auto) {
    styleRows = loadRowsOrEmpty(join(DATA, CSV_CONFIG.style.file));
    const m = styleIdentity(styleRows, query, false);
    if (m) { domain = 'style'; [exact, redirect] = styleDestination(styleRows, m); }
    else ({ domain, runner_up: runner } = detectDomain(query));
  }
  const sd = CSV_CONFIG[domain] ? domain : 'style';
  const cfg = CSV_CONFIG[sd];
  const file = join(DATA, cfg.file);
  if (!existsSync(file)) return { error: `File not found: ${file}`, domain };
  if (sd === 'style' && !exact && !redirect) {
    styleRows = styleRows || loadRowsOrEmpty(file);
    [exact, redirect] = styleDestination(styleRows, styleIdentity(styleRows, query));
  } else if (sd === 'landing') {
    landingRows = loadRowsOrEmpty(file);
    exact = exactRowIdentity(landingRows, query, LANDING_IDENTITY_FIELDS);
  }
  let results, index = null, diag;
  if (exact) { results = [project(exact, cfg.output_cols)]; diag = exactDiag(query, 'exact-identity'); }
  else if (redirect) { results = []; diag = { abstained: true, reason: 'cross-domain-redirect' }; }
  else ({ results, index, diag } = searchCsv(file, cfg.search_cols, cfg.output_cols, query, max, THRESHOLDS[sd], sd, sd === 'style' ? (r) => (r.Status ?? 'active') === 'active' : null));
  if (sd === 'icons' && containsPhrase(normalize(query.toLowerCase()), 'lucide')) { results = []; diag = { ...diag, abstained: true, reason: 'unsupported-library' }; }
  const out = { domain, query, file: cfg.file, count: results.length, results };
  if (auto) { out.auto_detected = true; if (runner) out.runner_up_domain = runner; }
  if (redirect) out.redirect = redirect;
  if (diag.error) out.error = diag.error;
  if (!results.length) out.suggestions = sd === 'landing' ? suggestIdentities(landingRows, query, LANDING_IDENTITY_FIELDS) : suggestTerms(index, query, THRESHOLDS[sd]);
  return out;
}

// ---- stacks
function stackWantsLegacy(query, stack) {
  const n = normalize(fold(query));
  const cur = STACK_CURRENT_VERSIONS[stack], name = STACK_QUERY_NAMES[stack];
  const migration = /\b(?:migrat\w*|upgrad\w*|replac\w*|instead|modern|current)\b/;
  if (cur && name) {
    const req = [...n.matchAll(new RegExp(`\\b(?:${name})\\s*(?:sdk|ui)?\\s*(?:[@(]\\s*)?(?:v(?:ersion)?\\s*)?(\\d+)(?:\\.(\\d+))?\\s*\\)?`, 'g'))].map((m) => m.slice(1).filter((x) => x !== undefined).map(Number));
    if (req.length) {
      if (migration.test(n) && req.some((r) => cmpTuple(r, cur.slice(0, r.length)) >= 0)) return false;
      return req.every((r) => cmpTuple(r, cur.slice(0, r.length)) < 0);
    }
  }
  if (migration.test(n)) return false;
  return /\b(?:legacy|deprecated)\b/.test(n);
}
function stackRowFilter(rows, query, stack) {
  const statuses = new Set(rows.map((r) => r.Status ?? 'unverified'));
  const legacy = stackWantsLegacy(query, stack);
  let filter, variant;
  if (statuses.has('deprecated') && legacy) { filter = (r) => r.Status === 'deprecated'; variant = 'legacy-only'; }
  else if (legacy && STACK_CURRENT_VERSIONS[stack]) return [() => false, 'legacy-unavailable'];
  else if (statuses.has('active')) { filter = (r) => r.Status === 'active'; variant = 'current-only'; }
  else { filter = (r) => (r.Status ?? 'unverified') !== 'deprecated'; variant = 'non-legacy'; }
  if (stack !== 'shadcn') return [filter, variant];
  const n = normalize(fold(query));
  const base = n.includes('base ui') ? 'base' : n.includes('react aria') ? 'aria' : n.includes('radix') || n.includes('aschild') ? 'radix' : null;
  if (!base) return [filter, variant];
  return [(r) => { const m = /\bbase=([^;]+)/.exec(fold(r['Applies To'])); return filter(r) && (m ? m[1].split('|') : []).includes(base); }, `${variant};base=${base}`];
}
function exactStackIdentifier(rows, query, filter) {
  const id = String(query ?? '').trim();
  if (id.length < 6 || /\s/.test(id)) return null;
  const re = new RegExp(`(?<![A-Za-z0-9_])${reEsc(id)}(?![A-Za-z0-9_])`, 'i');
  const m = rows.filter((r) => filter(r) && ['Guideline', 'Description', 'Do', "Don't", 'Code Good', 'Code Bad'].some((f) => re.test(r[f] || '')));
  return m.length === 1 ? m[0] : null;
}
export function searchStack(query, stack, max = MAX_RESULTS) {
  if (!validMax(max)) return { error: 'max_results must be an integer from 1 to 20', stack };
  if (!STACKS.includes(stack)) return { error: `Unknown stack: ${stack}. Available: ${STACKS.join(', ')}` };
  const rel = `stacks/${stack}.csv`, file = join(DATA, rel);
  const rows = loadRowsOrEmpty(file);
  const [filter, variant] = stackRowFilter(rows, query, stack);
  const th = variant === 'legacy-only' ? NO_THRESHOLD : STACK_THRESHOLD;
  const exact = exactStackIdentifier(rows, query, filter);
  let results, index = null, diag;
  if (exact) { results = [project(exact, STACK_COLS.output_cols)]; diag = exactDiag(query, 'exact-identifier'); }
  else ({ results, index, diag } = searchCsv(file, STACK_COLS.search_cols, STACK_COLS.output_cols, query, max, th, null, filter));
  const out = { domain: 'stack', stack, query, file: rel, count: results.length, results };
  if (diag.error) out.error = diag.error;
  if (!results.length) out.suggestions = suggestTerms(index, query, th);
  return out;
}

// ---- designer layer: flags, ordering, output
function flagResults(out, raw) {
  if (!out.results) return out;
  const tagged = out.results.map((r) => ({ ...r, designer_flags: slopFlags(r) }));
  out.results = raw ? tagged : [...tagged.filter((r) => !r.designer_flags.length), ...tagged.filter((r) => r.designer_flags.length)];
  return out;
}
function formatOutput(r, full) {
  if (r.error) return `Error: ${r.error}`;
  const o = [];
  if (r.stack) { o.push('## UI Pro Max Stack Guidelines', `**Stack:** ${r.stack} | **Query:** ${r.query}`); }
  else {
    let note = r.domain;
    if (r.auto_detected) note += ` (auto-detected${r.runner_up_domain ? `, runner-up: ${r.runner_up_domain}` : ''})`;
    o.push('## UI Pro Max Search Results', `**Domain:** ${note} | **Query:** ${r.query}`);
  }
  o.push(`**Source:** data/uupm/${r.file} | **Found:** ${r.count} results\n`);
  if (!r.count) {
    if (r.redirect) { o.push(`This legacy style label is now modeled in the \`${r.redirect.domain}\` domain as \`${r.redirect.id}\`. Search that domain instead of treating a page composition as a visual style.`); return o.join('\n'); }
    o.push('No matches. This is not a match with an empty value -- the query did not hit the database. Retry with broader/different keywords before falling back to general defaults, and say explicitly that no database match was found if you do fall back.');
    if (r.suggestions?.length) o.push(`**Closest known terms:** ${r.suggestions.join(', ')}`);
    return o.join('\n');
  }
  r.results.forEach((row, i) => {
    const flags = row.designer_flags || [];
    o.push(`### Result ${i + 1}${flags.length ? `  ⚠ designer slop flags: ${flags.join(', ')}` : ''}`);
    for (const [k, v] of Object.entries(row)) {
      if (k === 'designer_flags') continue;
      let s = String(v);
      if (!full && !UNTRUNCATED_COLS.has(k) && s.length > TRUNCATE_AT) s = s.slice(0, TRUNCATE_AT) + '...';
      o.push(`- **${k}:** ${s}`);
    }
    o.push('');
  });
  if (r.results.some((x) => x.designer_flags?.length)) o.push('Flagged rows match references/anti-slop.md bans: use them only if the brief explicitly asks for that look.');
  return o.join('\n');
}

// ---- brief: slim port of design_system.py (no persistence, no Inter/#2563EB/hero+features+CTA fallbacks)
const CONDITION_SIGNALS = {
  if_booking: ['booking', 'appointment', 'calendar'], if_boutique: ['boutique'], if_casual: ['casual', 'playful'], if_checkout: ['checkout', 'payment', 'purchase'],
  if_children: ['child', 'children', 'kids'], if_collaboration: ['collaboration', 'multiplayer', 'co-edit'], if_competitive: ['competitive', 'leaderboard'],
  if_content_focused: ['content', 'article', 'reading', 'documentation'], if_conversion_focused: ['conversion', 'sales', 'signup', 'purchase'],
  if_creative_field: ['creative', 'artist', 'portfolio'], if_crop_focused: ['crop', 'farm', 'agriculture'], if_dashboard: ['dashboard', 'operations', 'monitoring'],
  if_data_heavy: ['data heavy', 'data-heavy', 'analytics', 'large dataset'], if_delivery: ['delivery', 'courier', 'shipping'],
  if_discovery_focused: ['discover', 'discovery', 'browse', 'directory'], if_engagement_metric: ['engagement', 'retention', 'contribution'],
  if_experience_focused: ['experience', 'immersive', 'journey'], if_gamification: ['gamification', 'badges', 'streak'], if_health: ['health', 'medical', 'patient'],
  if_hero_needed: ['hero', 'showcase', 'launch'], if_large_dataset: ['large dataset', 'thousands', 'millions'], if_light_mode_needed: ['light mode', 'light theme'],
  if_low_performance: ['low performance', 'low-end', 'slow device'], if_luxury: ['luxury', 'premium', 'high-end'], if_medication: ['medication', 'medicine', 'prescription'],
  if_meditation: ['meditation', 'breathing', 'mindfulness'], if_minimal_portfolio: ['minimal portfolio', 'simple portfolio'], if_mobile: ['mobile', 'phone', 'tablet', 'ios', 'android'],
  if_personalized: ['personalized', 'personalised', 'recommendation'], if_pre_launch: ['pre-launch', 'prelaunch', 'coming soon', 'waitlist'],
  if_salary_focused: ['salary', 'compensation', 'pay range'], if_team_collaboration: ['team collaboration', 'team workspace'],
  if_trust_needed: ['trust', 'secure', 'verified', 'authority'], if_ux_focused: ['ux', 'usability', 'accessibility', 'accessible'], if_video_ready: ['video ready', 'product video', 'demo video'],
};
function applyDecisionRules(rules, query) {
  const n = fold(query);
  const res = { activated: [], style_ids: [], constraints: [], pattern: null, mode: null };
  for (const [cond, actions] of Object.entries(rules || {})) {
    if (!Array.isArray(actions)) continue;
    const on = cond === 'must_have' || (CONDITION_SIGNALS[cond] || []).some((s) => new RegExp(`(?<!${W})${reEsc(s)}(?!${W})`, 'u').test(n));
    if (!on) continue;
    res.activated.push({ condition: cond, actions: [...actions] });
    for (const a of actions) {
      const k = String(a).indexOf(':');
      if (k < 0) continue;
      const p = a.slice(0, k), v = a.slice(k + 1);
      if (p === 'style' && !res.style_ids.includes(v)) res.style_ids.push(v);
      else if (p === 'constraint' && !res.constraints.includes(v)) res.constraints.push(v);
      else if (p === 'pattern') res.pattern = v;
      else if (p === 'mode' && (v === 'dark' || v === 'light')) res.mode = v;
    }
  }
  return res;
}
function luminance(hex) {
  const c = parseColor(String(hex || '').trim());
  if (!c) return null;
  const l = (v) => { v /= 255; return v <= 0.04045 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4; };
  return 0.2126 * l(c.r) + 0.7152 * l(c.g) + 0.0722 * l(c.b);
}
const contrast = (a, b) => { const x = luminance(a), y = luminance(b); return x == null || y == null ? null : (Math.max(x, y) + 0.05) / (Math.min(x, y) + 0.05); };
const paletteIsDark = (p) => { const l = luminance(p?.Background); return l != null && l < 0.18; };
const DARK_PRIMARY = ['dark mode primary', 'dark primary', 'dark-only', 'dark only', 'dark preferred', 'dark focused', 'dark-first', 'dark rich', 'light mode only as exception'];
const DARK_QUERY = ['dark mode', 'dark theme', 'dark ui', 'dark-mode', 'darkmode', 'night mode', 'midnight', 'oled'];
function styleIsDark(s) {
  if (!s) return false;
  const pm = fold(String(s['Preferred Mode'] || '').trim());
  if (pm === 'dark' || pm === 'light') return pm === 'dark';
  if (s['Light Mode ✓'] === 'not-recommended' && s['Dark Mode ✓'] === 'supported') return true;
  const d = fold(`${s['Light Mode ✓'] || ''} ${s['Dark Mode ✓'] || ''}`);
  return DARK_PRIMARY.some((m) => d.includes(m));
}
function deriveDark(p) {
  const bg = '#14120F';
  const ring = [p.Ring, p.Accent, p.Primary].find((c) => (contrast(c, bg) || 0) >= 3) || null;
  return { ...p, Background: '#14120F', Foreground: '#F2EEE6', Card: '#1C1915', 'Card Foreground': '#F2EEE6', Muted: '#26221D', 'Muted Foreground': '#B8B0A3', Border: '#3A342C', Ring: ring || p.Ring, _mode_derivation: 'derived-dark (designer neutrals, not slate)' };
}
const STOCK = new Set([...TAILWIND_STOCK_HEXES, ...INDIGO_HEXES].map((h) => h.toLowerCase()));
const isStock = (hex) => STOCK.has(String(hex || '').replace('#', '').toLowerCase());
const paletteFlags = (p) => { const f = slopFlags(p); if (['Primary', 'Accent', 'Background'].some((k) => isStock(p[k]))) f.push('stock-tailwind'); return [...new Set(f)]; };
const typoFlags = (t) => { const f = []; if (isBannedFont(t['Heading Font'])) f.push('generic-display-font'); if (isBannedFont(t['Body Font'])) f.push('generic-body-font'); return f; };

export function brief(query) {
  const notes = [];
  const reasoningRows = loadRowsOrEmpty(join(DATA, 'ui-reasoning.csv'));
  const styleRows = loadRowsOrEmpty(join(DATA, 'styles.csv'));
  const landingRows = loadRowsOrEmpty(join(DATA, 'landing.csv'));
  const styleLookup = new Map();
  for (const s of styleRows) for (const k of rowIdentities(s, STYLE_IDENTITY_FIELDS)) styleLookup.set(fold(k), s);
  const landingLookup = new Set(landingRows.flatMap((r) => rowIdentities(r, LANDING_IDENTITY_FIELDS).map(fold)));
  const resolveStyle = (ref) => {
    let s = styleLookup.get(fold(String(ref || '').trim())) || null;
    const seen = new Set();
    while (s && (s.Status ?? 'active') === 'deprecated') {
      const id = s['Style ID'], parent = s['Parent Style ID'];
      if (!parent || seen.has(id)) return null;
      seen.add(id);
      s = styleLookup.get(fold(parent)) || null;
    }
    return s;
  };

  const product = search(query, 'product', 1);
  const category = product.results?.[0]?.['Product Type'] || null;
  if (!category) notes.push('No product type matched: the brief below comes from direct searches only.');
  const rule = category ? reasoningRows.find((r) => fold(String(r.UI_Category || '').trim()) === fold(category.trim())) : null;
  let rules = {};
  try { rules = rule ? JSON.parse(rule.Decision_Rules || '{}') : {}; } catch { notes.push('Decision rules for this category did not parse; skipped.'); }
  const applied = applyDecisionRules(rules, query);
  const priority = rule ? [...applied.style_ids.map((id) => resolveStyle(id)?.['Style Category'] || id), ...String(rule.Style_Priority || '').split('+').map((s) => s.trim()).filter(Boolean)] : [];
  const reasoning = rule ? { pattern: applied.pattern || rule.Recommended_Pattern || '', color_mood: rule.Color_Mood || '', typography_mood: rule.Typography_Mood || '', key_effects: rule.Key_Effects || '', anti_patterns: rule.Anti_Patterns || '', severity: rule.Severity || 'MEDIUM' } : { pattern: '', color_mood: '', typography_mood: '', key_effects: '', anti_patterns: '', severity: null };
  if (category && !rule) notes.push(`No reasoning rule for "${category}".`);

  const resolved = [query, category, applied.constraints.map((c) => c.replace(/-/g, ' ')).join(' ')].filter(Boolean).join(' ');
  const styleRes = search(priority.length ? `${resolved} ${priority.slice(0, 2).join(' ')}` : resolved, 'style', 3).results || [];
  const colorRes = search(`${reasoning.color_mood} ${resolved}`.trim(), 'color', 5).results || [];
  const landingQuery = reasoning.pattern && landingLookup.has(fold(reasoning.pattern)) ? reasoning.pattern : `${reasoning.pattern} ${resolved}`.trim();
  const landingRes = search(landingQuery || query, 'landing', 2).results || [];
  const typoRes = search(`${reasoning.typography_mood} ${resolved}`.trim(), 'typography', 2).results || [];

  // style: canonical reasoning first (as upstream), then keyword match; slop-flagged picks drop to the next clean one
  let style = null;
  if (styleRes.length) {
    for (const p of priority) { const s = resolveStyle(p); if (s && (s.Status ?? 'active') !== 'deprecated') { style = s; break; } }
    if (!style) {
      const scored = styleRes.map((r) => {
        let sc = 0;
        for (const kw of priority) {
          const kt = new Set(fold(kw).match(/[a-z0-9]+/g) || []), nt = new Set(fold(r['Style Category']).match(/[a-z0-9]+/g) || []);
          if (kt.size && [...kt].every((t) => nt.has(t))) sc += 10;
          else if ((fold(r.Keywords).match(/[a-z0-9]+/g) || []).some((t) => kt.has(t))) sc += 3;
          else if ([...kt].some((t) => fold(JSON.stringify(r)).includes(t))) sc += 1;
        }
        return [sc, r];
      }).sort((a, b) => b[0] - a[0]);
      style = scored[0][0] > 0 ? scored[0][1] : styleRes[0];
    }
  }
  const styleCands = [style, ...styleRes].filter(Boolean);
  const cleanStyle = styleCands.find((s) => !slopFlags(s).length);
  if (style && !cleanStyle) notes.push(`Every style candidate is slop-flagged (${slopFlags(style).join(', ')}); kept "${style['Style Category']}" but restyle it before use.`);
  else if (style && cleanStyle !== style) notes.push(`"${style['Style Category']}" is slop-flagged (${slopFlags(style).join(', ')}); used "${cleanStyle['Style Category']}" instead.`);
  style = cleanStyle || style;

  const mode = applied.mode || (DARK_QUERY.some((m) => fold(query).includes(m)) || styleIsDark(style) ? 'dark' : 'light');
  const orderedColors = [...colorRes.filter((p) => p['Product Type'] === category), ...colorRes.filter((p) => p['Product Type'] !== category)];
  let palette = null;
  for (const p of orderedColors) {
    if (paletteFlags(p).length) continue;
    palette = mode === 'dark' && !paletteIsDark(p) ? (orderedColors.find((x) => paletteIsDark(x) && !paletteFlags(x).length) || deriveDark(p)) : p;
    break;
  }
  const stockRoles = palette ? ['Foreground', 'Muted Foreground', 'Card', 'Border', 'Ring'].filter((k) => isStock(palette[k])) : [];
  if (stockRoles.length) notes.push(`Palette roles ${stockRoles.map((k) => `${k} ${palette[k]}`).join(', ')} are Tailwind defaults: tint them toward the paper hue before locking [H74].`);
  if (!palette && colorRes.length) notes.push(`All ${colorRes.length} palette matches use stock Tailwind/indigo colors (${[...new Set(colorRes.flatMap(paletteFlags))].join(', ')}): none used. Build the palette from the references.`);
  if (!colorRes.length) notes.push('No palette matched.');

  const typo = typoRes.find((t) => !typoFlags(t).length) || null;
  if (!typo) notes.push(typoRes.length ? `Typography matches pair banned defaults (${typoRes.map((t) => `${t['Heading Font']} / ${t['Body Font']}`).join('; ')}): none used. Try \`search.mjs --domain google-fonts "<mood>"\`.` : 'No typography pairing matched.');

  let landing = landingRes.find((r) => r['Pattern Name'] === reasoning.pattern) || landingRes[0] || null;
  if (landing && slopFlags(landing).includes('hero-3-cards')) { notes.push(`Landing pattern "${landing['Pattern Name']}" is the hero + feature cards template: not used. Pick a shape from data/hallmark/macrostructures.md.`); landing = landingRes.find((r) => r !== landing && !slopFlags(r).includes('hero-3-cards')) || null; }
  if (!landing && !landingRes.length) notes.push('No landing pattern matched.');

  const radius = (/--border-radius:\s*([^,]+)/.exec(style?.['Design System Variables'] || '') || [])[1]?.trim() || null;
  const serif = (f, t) => (/serif/i.test(t?.Category || '') && !/sans/i.test(String(t?.Category || '').split('+')[f === 'h' ? 0 : 1] || '') ? 'serif' : 'sans-serif');
  const fam = (name, fb) => `"${name}", ${fb}`;
  const P = palette || {};
  const line = (k, v, src) => (v ? `  ${k}: ${v};${src ? ` /* ${src} */` : ''}` : `  /* ${k}: no clean match, choose from references */`);
  const css = [':root {',
    line('--ink', P.Foreground, 'Foreground'), line('--ink-dim', P['Muted Foreground'], 'Muted Foreground'),
    line('--paper', P.Background, 'Background'), line('--paper-2', P.Card && P.Card !== P.Background ? P.Card : P.Muted, P.Card && P.Card !== P.Background ? 'Card' : 'Muted'),
    line('--accent', P.Primary, 'Primary'), line('--danger', P.Destructive, 'Destructive'), line('--rare', P.Accent, 'Accent/CTA'),
    line('--border-inner', P.Border, 'Border'), '  /* --border-outer: no source in uupm; a darker step of --paper */', line('--focus', P.Ring, 'Ring'),
    line('--radius', radius, radius ? `style ${style['Style ID']}` : ''),
    line('--font-display', typo && fam(typo['Heading Font'], serif('h', typo)), typo && typo['Font Pairing Name']),
    line('--font-body', typo && fam(typo['Body Font'], serif('b', typo)), typo && typo['Font Pairing Name']),
    '}'].join('\n');

  return {
    query, category, color_mode: mode, reasoning_rule: rule ? rule.UI_Category : null, severity: reasoning.severity,
    style: style ? { id: style['Style ID'], name: style['Style Category'], effects: style['Effects & Animation'], keywords: style.Keywords, light_mode: style['Light Mode ✓'], dark_mode: style['Dark Mode ✓'], designer_flags: slopFlags(style) } : null,
    palette: palette ? { source: palette['Product Type'], derivation: palette._mode_derivation || null, ...Object.fromEntries(CSV_CONFIG.color.output_cols.slice(1).map((k) => [k, palette[k]])) } : null,
    typography: typo ? { pairing: typo['Font Pairing Name'], heading: typo['Heading Font'], body: typo['Body Font'], mood: typo['Mood/Style Keywords'], google_fonts_url: typo['Google Fonts URL'] } : null,
    landing: landing ? { name: landing['Pattern Name'], sections: landing['Section Order'], cta: landing['Primary CTA Placement'], designer_flags: slopFlags(landing) } : null,
    key_effects: style?.['Effects & Animation'] || reasoning.key_effects || null,
    anti_patterns: mode === 'dark' ? reasoning.anti_patterns.split('+').filter((c) => !/dark (mode|modes|theme)/i.test(c)).map((c) => c.trim()).filter(Boolean).join(' + ') : reasoning.anti_patterns,
    constraints: applied.constraints, activated_rules: applied.activated, notes, root_css: css,
  };
}
function formatBrief(b) {
  const o = [`## Design brief draft: ${b.query}`, ''];
  o.push(`- **Product type:** ${b.category || 'no match'}${b.reasoning_rule ? ` (reasoning rule: ${b.reasoning_rule}, severity ${b.severity})` : ''}`);
  o.push(`- **Color mode:** ${b.color_mode}`);
  o.push(`- **Style:** ${b.style ? `${b.style.name} (\`${b.style.id}\`)${b.style.designer_flags.length ? ` ⚠ ${b.style.designer_flags.join(', ')}` : ''}` : 'no match'}`);
  if (b.style?.effects) o.push(`- **Effects:** ${b.style.effects}`);
  o.push(`- **Palette:** ${b.palette ? `${b.palette.source}${b.palette.derivation ? ` (${b.palette.derivation})` : ''}` : 'no clean match'}`);
  o.push(`- **Typography:** ${b.typography ? `${b.typography.heading} / ${b.typography.body} (${b.typography.pairing})` : 'no clean match'}`);
  if (b.typography?.google_fonts_url) o.push(`  - ${b.typography.google_fonts_url}`);
  o.push(`- **Page shape:** ${b.landing ? `${b.landing.name}: ${b.landing.sections}` : 'no clean match (see data/hallmark/macrostructures.md)'}`);
  if (b.constraints.length) o.push(`- **Constraints:** ${b.constraints.join(', ')}`);
  if (b.anti_patterns) o.push(`- **Avoid:** ${b.anti_patterns}`);
  if (b.notes.length) { o.push('', '### Notes'); for (const n of b.notes) o.push(`- ${n}`); }
  o.push('', '### Token draft (designer roles; review before locking)', '', '```css', b.root_css, '```', '', 'Draft from data/uupm only. References and the anti-slop gate still decide; replace anything that reads as a template.');
  return o.join('\n');
}

// ---- CLI
const isMain = process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url);
if (isMain) {
  const args = process.argv.slice(2);
  const opt = { domain: null, stack: null, n: MAX_RESULTS, json: false, full: false, raw: false };
  const pos = [];
  for (let i = 0; i < args.length; i++) {
    const a = args[i];
    if (a === '--domain' || a === '-d') opt.domain = args[++i];
    else if (a === '--stack' || a === '-s') opt.stack = args[++i];
    else if (a === '-n' || a === '--max-results') opt.n = Number(args[++i]);
    else if (a === '--json') opt.json = true;
    else if (a === '--full') opt.full = true;
    else if (a === '--raw') opt.raw = true;
    else pos.push(a);
  }
  const usage = () => {
    console.error('usage: search.mjs "<query>" [--domain <d>] [--stack <name>] [-n 3] [--json] [--full] [--raw]\n       search.mjs brief "<product description>" [--json]');
    console.error(`domains: ${Object.keys(CSV_CONFIG).join(', ')}\nstacks: ${STACKS.join(', ')}`);
    process.exit(1);
  };
  if (!pos.length) usage();
  if (pos[0] === 'brief') {
    const q = pos.slice(1).join(' ').trim();
    if (!q) usage();
    const b = brief(q);
    console.log(opt.json ? JSON.stringify(b, null, 2) : formatBrief(b));
  } else {
    const q = pos.join(' ');
    if (opt.domain && !CSV_CONFIG[opt.domain]) { console.error(`unknown domain: ${opt.domain}. Domains: ${Object.keys(CSV_CONFIG).join(', ')}`); process.exit(1); }
    if (!validMax(opt.n)) { console.error('-n must be an integer from 1 to 20'); process.exit(1); }
    const r = flagResults(opt.stack ? searchStack(q, opt.stack, opt.n) : search(q, opt.domain, opt.n), opt.raw);
    console.log(opt.json ? JSON.stringify(r, null, 2) : formatOutput(r, opt.full));
    if (r.error) process.exit(1);
  }
}

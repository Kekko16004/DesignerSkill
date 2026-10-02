#!/usr/bin/env node
// Automated anti-slop gate (static). Mirrors references/anti-slop.md; does not replace the screenshot review.
//
//   node lint-slop.mjs <file|dir> [...more] [--mode game|product-app|marketing] [--tokens tokens.css] [--json]
//
// Verdict: PASS (0 ban categories) | PATCH (1-2) | REDO_TOKENS (3+). Exit code 0 / 0 / 2.
import { readFileSync, readdirSync, statSync, existsSync } from 'node:fs';
import { join, extname, relative, resolve } from 'node:path';
import { parseCss, rootVars } from './lib/css.mjs';

const args = process.argv.slice(2);
const paths = [];
const opt = { mode: null, tokens: null, json: false };
for (let i = 0; i < args.length; i++) {
  if (args[i] === '--mode') opt.mode = args[++i];
  else if (args[i] === '--tokens') opt.tokens = args[++i];
  else if (args[i] === '--json') opt.json = true;
  else paths.push(args[i]);
}
if (!paths.length) { console.error('usage: lint-slop.mjs <file|dir> [--mode game|product-app|marketing] [--tokens tokens.css] [--json]'); process.exit(1); }

const EXT = new Set(['.html', '.htm', '.css', '.scss', '.jsx', '.tsx', '.js', '.ts', '.vue', '.svelte', '.astro']);
const SKIP_DIR = new Set(['node_modules', '.git', 'dist', 'build', '.next', 'out', 'coverage', 'Library', 'Temp', '.variant-studio', 'translated']);
const files = [];
function collect(p) {
  const st = statSync(p);
  if (st.isDirectory()) { for (const f of readdirSync(p)) if (!SKIP_DIR.has(f)) collect(join(p, f)); }
  else if (EXT.has(extname(p).toLowerCase()) && !/\.min\./.test(p)) files.push(p);
}
for (const p of paths) { if (!existsSync(p)) { console.error(`not found: ${p}`); process.exit(1); } collect(resolve(p)); }

// rule: [category, id, regex, message, modes?]
const RULES = [
  ['type', 'generic-font', /font-family\s*:\s*["']?(Inter|Geist|Roboto|Arial|Open Sans|Helvetica)\b(?![^;]*,\s*["']?(?!sans-serif|system-ui|-apple-system|ui-sans-serif|BlinkMacSystemFont|Segoe UI|Helvetica|Arial)[A-Z])/gi, 'Generic font as the only family (Inter/Geist/Roboto/Arial/Open Sans)'],
  ['type', 'generic-font-import', /fonts\.googleapis\.com\/css2?\?family=(Inter|Geist|Roboto|Open\+Sans)(?![^"']*family=)/gi, 'Only a generic Google font loaded'],
  ['type', 'tw-font-sans', /\bfont-sans\b/g, 'Tailwind default font-sans', ['game']],
  ['color', 'indigo-hex', /#(6366f1|4f46e5|4338ca|818cf8|8b5cf6|7c3aed|a855f7|9333ea|6d28d9)\b/gi, 'Indigo/purple SaaS accent'],
  ['color', 'indigo-tw', /\b(from|to|via|bg|text|border|ring|shadow)-(indigo|violet|purple)-\d{2,3}\b/g, 'Tailwind indigo/violet/purple utility'],
  ['color', 'saas-dark', /\bbg-zinc-950\b/g, 'SaaS dark palette (zinc-950)'],
  ['shape', 'rounded-xl', /\brounded-(xl|2xl|3xl)\b/g, 'rounded-xl/2xl/3xl'],
  ['shape', 'big-radius', /border-radius\s*:\s*(1[6-9]|2\d|3\d)px/gi, 'Large default radius (16px+) on panels', ['game']],
  ['shape', 'pill-button', /\brounded-full\b/g, 'Pill shape (rounded-full)', ['game']],
  ['material', 'glass', /\bbackdrop-blur-(xl|2xl|3xl)\b|backdrop-filter\s*:\s*blur\(\s*(1[6-9]|[2-9]\d)px/g, 'Heavy glassmorphism blur'],
  ['material', 'tw-shadow', /\bshadow-(lg|xl|2xl)\b/g, 'Tailwind default shadow as the only depth'],
  ['layout', 'bento', /\bgrid-cols-3\b[\s\S]{0,400}\bgrid-cols-3\b|\bbento\b/gi, 'Bento / 3-column card grid'],
  ['layout', 'shadcn-card', /<Card(Header|Content|Title)?\b|from ["']@\/components\/ui\/card["']/g, 'shadcn Card used as a layout', ['game']],
  ['icons', 'emoji', /(?:>|["'`])[^<"'`]*?[\u{1F300}-\u{1FAFF}\u{2600}-\u{27BF}]/gu, 'Emoji used as an icon'],
  ['icons', 'lucide-in-game', /from ["'](lucide-react|@heroicons\/react)/g, 'Generic Lucide/Heroicons in a game UI', ['game']],
  ['motion', 'bounce', /cubic-bezier\(\s*[\d.]+\s*,\s*(1\.[1-9]|[2-9])|ease-(in-out-|out-|in-)?(elastic|bounce|back)\b|animate-bounce/g, 'Bounce/elastic/overshoot easing', ['game']],
  ['motion', 'infinite-shimmer', /animation\s*:[^;]*\binfinite\b[^;]*(shimmer|glow|pulse)|animate-pulse/gi, 'Infinite shimmer/pulse on static content'],
  ['copy', 'saas-copy', /\b(unlock your potential|next[- ]generation|seamless(ly)?|elevate your|supercharge|game[- ]changer)\b/gi, 'SaaS marketing copy'],
  ['copy', 'fake-stats', /\b(10x faster|99\.9%|loved by thousands|trusted by \d+)/gi, 'Invented social proof / stats'],
  ['copy', 'get-started-in-game', /\bGet Started\b/g, '"Get Started" CTA inside a game UI', ['game']],
];

const hits = [];
let rawHex = 0;
const tokenVars = opt.tokens && existsSync(opt.tokens) ? rootVars(parseCss(readFileSync(opt.tokens, 'utf8'))) : null;

for (const f of files) {
  const src = readFileSync(f, 'utf8');
  const lineOf = (i) => src.slice(0, i).split('\n').length;
  for (const [cat, id, re, msg, modes] of RULES) {
    if (modes && opt.mode && !modes.includes(opt.mode)) continue;
    if (modes && !opt.mode) continue;
    re.lastIndex = 0;
    let m, n = 0;
    while ((m = re.exec(src)) && n < 20) { hits.push({ cat, id, msg, file: f, line: lineOf(m.index), match: m[0].slice(0, 60).trim() }); n++; }
  }
  // raw hex after the token lock: any color literal outside a custom-property declaration
  if (tokenVars) {
    for (const line of src.split('\n')) {
      if (/^\s*--[\w-]+\s*:/.test(line)) continue;
      rawHex += (line.match(/#[0-9a-fA-F]{3,8}\b(?![\w-])/g) || []).length;
    }
  }
  if (/body\s*{[^}]*height\s*:\s*100vh/.test(src)) hits.push({ cat: 'studio', id: 'body-100vh', msg: 'height:100vh on body breaks Variant Studio component/section previews', file: f, line: 1, match: '100vh' });
}
if (tokenVars && rawHex > 0) hits.push({ cat: 'tokens', id: 'raw-hex', msg: `${rawHex} raw hex colors outside the locked tokens (use var(--…))`, file: '-', line: 0, match: '' });

const BAN_CATS = ['type', 'color', 'shape', 'material', 'layout', 'icons', 'motion', 'copy'];
const cats = [...new Set(hits.map((h) => h.cat).filter((c) => BAN_CATS.includes(c)))];
const verdict = cats.length >= 3 ? 'REDO_TOKENS' : cats.length ? 'PATCH' : 'PASS';
const result = { verdict, ban_categories: cats, files: files.length, hits: hits.map((h) => ({ ...h, file: h.file === '-' ? '-' : relative(process.cwd(), h.file) })) };

if (opt.json) console.log(JSON.stringify(result, null, 2));
else {
  console.log(`anti-slop: ${verdict}  (${cats.length} ban categories: ${cats.join(', ') || 'none'}; ${files.length} files)`);
  for (const h of result.hits) console.log(`  [${h.cat}] ${h.file}:${h.line}  ${h.msg}${h.match ? `  -> ${h.match}` : ''}`);
  if (verdict === 'REDO_TOKENS') console.log('3+ categories: redo tokens and layout, do not patch colors.');
}
process.exit(verdict === 'REDO_TOKENS' ? 2 : 0);

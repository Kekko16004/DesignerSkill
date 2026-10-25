#!/usr/bin/env node
// Asserts lint-slop verdicts and rule ids on evals/fixtures. Exit 1 on any mismatch.
import { execFileSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import path from 'node:path';

const root = path.dirname(path.dirname(fileURLToPath(import.meta.url)));
const lint = path.join(root, 'scripts', 'lint-slop.mjs');
const fx = p => path.join(root, 'evals', 'fixtures', p);
const WEB_IDS = ['generic-display-font', 'purple-gradient', 'gradient-text', 'tailwind-stock', 'card-in-card', 'eyebrow', 'buzzword', 'placeholder-name', 'viewport-overflow', 'transition-all', 'focus-fade', 'layout-animation', 'no-reduced-motion', 'img-size'];

const CASES = [
  { path: 'slopped', verdict: 'REDO_TOKENS', has: WEB_IDS.concat('generic-font') },
  { path: 'slopped', mode: 'game', verdict: 'REDO_TOKENS', has: ['generic-font', 'indigo-hex', 'emoji'], not: WEB_IDS },
  { path: 'slopped', mode: 'fivem', has: ['generic-font'], not: WEB_IDS },
  { path: 'clean', verdict: 'PASS', zero: true },
  { path: 'eyebrow-fail', has: ['eyebrow'], count: { eyebrow: 6 } },
  { path: 'eyebrow-pass', not: ['eyebrow'] },
  { path: 'copy-fail', verdict: 'PATCH', has: ['colon-reveal', 'stock-cta', 'dash'], cats: ['copy'] },
  { path: 'copy-pass-it', verdict: 'PASS', not: ['dash'] },
  { path: 'motion-fail', verdict: 'PATCH', has: ['transition-all', 'layout-animation', 'focus-fade', 'hidden-at-rest', 'no-reduced-motion'], cats: ['motion'] },
  { path: 'motion-pass', verdict: 'PASS', zero: true },
  { path: 'color-fail', verdict: 'PATCH', has: ['purple-gradient', 'gradient-text', 'pure-black-white', 'glow-orb', 'tailwind-stock'], cats: ['color'] },
  { path: 'color-pass', verdict: 'PASS' },
  { path: 'type-fail', verdict: 'PATCH', has: ['generic-font', 'generic-display-font', 'tracked-caps-label', 'italic-word-heading', 'accent-word-heading'], cats: ['type'] },
  { path: 'type-pass', verdict: 'PASS', zero: true },
  { path: 'a11y-fail', verdict: 'PASS', has: ['outline-none', 'no-zoom', 'img-alt', 'img-size', 'div-onclick', 'icon-button-label', 'paste-blocked', 'html-lang', 'doc-title', 'ascii-ellipsis', 'color-scheme'] },
  { path: 'tailwind-fail', verdict: 'REDO_TOKENS', has: ['purple-gradient', 'gradient-text', 'tracked-caps-label', 'hero-vh', 'bento', 'glow-orb', 'outline-none', 'transition-all', 'eyebrow'] },
  { path: 'tailwind-pass', verdict: 'PASS', zero: true },
  { path: 'layout-fail', verdict: 'PATCH', has: ['bento', 'hero-vh', 'viewport-overflow', 'card-in-card', 'drawn-chrome', 'placeholder-image'], cats: ['layout', 'chrome'] },
];

let fails = 0;
for (const c of CASES) {
  const args = [lint, fx(c.path), '--json'];
  if (c.mode) args.push('--mode', c.mode);
  let out;
  try { out = execFileSync(process.execPath, args, { encoding: 'utf8' }); }
  catch (e) { out = e.stdout; }
  const r = JSON.parse(out);
  const ids = r.hits.map(h => h.id);
  const errs = [];
  if (c.verdict && r.verdict !== c.verdict) errs.push(`verdict ${r.verdict} != ${c.verdict}`);
  for (const id of c.has || []) if (!ids.includes(id)) errs.push(`missing ${id}`);
  for (const id of c.not || []) if (ids.includes(id)) errs.push(`unexpected ${id}`);
  if (c.zero && r.hits.length) errs.push(`expected 0 hits, got ${r.hits.length} (${[...new Set(ids)].join(',')})`);
  if (c.cats && [...r.ban_categories].sort().join() !== [...c.cats].sort().join()) errs.push(`categories ${r.ban_categories} != ${c.cats}`);
  for (const [id, n] of Object.entries(c.count || {})) { const k = ids.filter(x => x === id).length; if (k !== n) errs.push(`${id} x${k} != ${n}`); }
  for (const h of r.hits) if (!/^\[(H\d+[a-z]*|V|NAS)\]/.test(h.msg) && !/\[(H\d+[a-z]*|V|NAS)\]$/.test(h.msg) && h.id !== 'raw-hex' && h.id !== 'body-100vh') { errs.push(`no gate cited: ${h.id}`); break; }
  const name = c.path + (c.mode ? ` --mode ${c.mode}` : '');
  if (errs.length) { fails++; console.log(`FAIL  ${name}: ${errs.join('; ')}`); }
  else console.log(`ok    ${name}  ${r.verdict}  ${r.hits.length} hits`);
}
console.log(fails ? `\n${fails}/${CASES.length} cases failed` : `\nall ${CASES.length} cases passed`);
process.exit(fails ? 1 : 0);

#!/usr/bin/env node
// Mechanical style scan of an existing project, input for /createstyle (the agent interprets it).
//
//   node extract-style.mjs [projectDir] [--top 12]
//
// Prints JSON: stack, custom properties, color/font/radius/shadow/spacing/motion frequencies, entry files to screenshot.
import { readFileSync, readdirSync, statSync, existsSync } from 'node:fs';
import { join, extname, relative, resolve, basename } from 'node:path';
import { parseCss } from './lib/css.mjs';
import { parseColor, toHex, COLOR_RE } from './lib/color.mjs';

const args = process.argv.slice(2);
const root = resolve(args.find((a) => !a.startsWith('--')) || '.');
const TOP = +(args[args.indexOf('--top') + 1] || 12) || 12;
const SKIP = new Set(['node_modules', '.git', 'dist', 'build', '.next', 'out', 'coverage', 'Library', 'Temp', 'Logs', 'obj', 'Packages', '.variant-studio', 'translated', 'vendor', '.cache', '.turbo', 'public/build']);
const STYLE_EXT = new Set(['.css', '.scss', '.sass', '.less', '.uss', '.pcss']);
const MARKUP_EXT = new Set(['.html', '.htm', '.jsx', '.tsx', '.vue', '.svelte', '.astro', '.uxml']);

const files = [];
(function walk(d, depth) {
  if (depth > 8 || files.length > 4000) return;
  for (const f of readdirSync(d)) {
    if (SKIP.has(f) || f.startsWith('.') && f !== '.storybook') continue;
    const p = join(d, f);
    let st; try { st = statSync(p); } catch { continue; }
    if (st.isDirectory()) walk(p, depth + 1);
    else if ((STYLE_EXT.has(extname(f)) || MARKUP_EXT.has(extname(f)) || /^tailwind\.config\.|^theme\.|tokens?\./.test(f)) && st.size < 1_500_000 && !/\.min\./.test(f)) files.push(p);
  }
})(root, 0);

const tally = () => new Map();
const bump = (m, k, n = 1) => k && m.set(k, (m.get(k) || 0) + n);
const top = (m, n = TOP) => [...m].sort((a, b) => b[1] - a[1]).slice(0, n).map(([value, count]) => ({ value, count }));
const colors = tally(), fonts = tally(), radii = tally(), shadows = tally(), sizes = tally(), spacing = tally(), durations = tally(), easings = tally(), twClasses = tally();
const vars = {};
const fontImports = new Set();

const normColor = (c) => { const p = parseColor(c); return p ? toHex(p) : null; };

for (const f of files) {
  const src = readFileSync(f, 'utf8');
  const rel = relative(root, f);
  let css = '';
  if (STYLE_EXT.has(extname(f))) css = src;
  else {
    for (const m of src.matchAll(/<style[^>]*>([\s\S]*?)<\/style>/gi)) css += m[1] + '\n';
    for (const m of src.matchAll(/style\s*=\s*"([^"]*)"/g)) css += `x{${m[1]}}\n`;
    for (const m of src.matchAll(/class(?:Name)?\s*=\s*["'`]([^"'`]+)["'`]/g)) for (const c of m[1].split(/\s+/)) if (/^(bg|text|border|rounded|shadow|font|p[xytrbl]?|m[xytrbl]?|gap|duration|ease)-/.test(c)) bump(twClasses, c);
  }
  for (const m of src.matchAll(/fonts\.googleapis\.com\/css2?\?([^"')\s]+)/g)) for (const fam of m[1].matchAll(/family=([^&:;]+)/g)) fontImports.add(decodeURIComponent(fam[1]).replace(/\+/g, ' '));
  for (const m of src.matchAll(/@font-face\s*{[^}]*font-family\s*:\s*["']?([^"';]+)/g)) fontImports.add(m[1].trim());
  if (!css) continue;
  let rules = [];
  try { rules = parseCss(css.replace(/^\s*@(use|import|forward)[^;]*;/gm, '')); } catch { continue; }
  for (const r of rules) {
    if (r.type !== 'rule') continue;
    const scope = r.selector.length > 60 ? r.selector.slice(0, 57) + '...' : r.selector;
    for (const d of r.decls) {
      const v = d.value;
      if (d.prop.startsWith('--')) { (vars[d.prop] ||= []).length < 4 && vars[d.prop].push({ value: v, scope, file: rel }); }
      for (const c of v.match(COLOR_RE) || []) bump(colors, normColor(c));
      if (d.prop === 'font-family') bump(fonts, v.replace(/\s+/g, ' '));
      if (d.prop === 'font') bump(fonts, v.replace(/^.*?\d+(px|rem|em)(\/\S+)?\s+/, ''));
      if (/radius/.test(d.prop)) bump(radii, v);
      if (d.prop === 'box-shadow' && v !== 'none') bump(shadows, v);
      if (d.prop === 'font-size') bump(sizes, v);
      if (/^(padding|margin|gap|row-gap|column-gap)/.test(d.prop)) for (const t of v.split(/\s+/)) if (/\d/.test(t)) bump(spacing, t);
      if (/^(transition|animation)/.test(d.prop)) {
        for (const t of v.match(/\d*\.?\d+m?s\b/g) || []) bump(durations, t);
        for (const e of v.match(/cubic-bezier\([^)]*\)|ease(-in-out|-in|-out)?|linear|steps\([^)]*\)/g) || []) bump(easings, e);
      }
    }
  }
}

const pkg = existsSync(join(root, 'package.json')) ? JSON.parse(readFileSync(join(root, 'package.json'), 'utf8')) : null;
const deps = pkg ? { ...pkg.dependencies, ...pkg.devDependencies } : {};
const stack = [];
const has = (...ks) => ks.some((k) => k in deps);
if (has('next')) stack.push('next'); else if (has('react')) stack.push('react');
if (has('react-native', 'expo')) stack.push('react-native');
if (has('vue', 'nuxt')) stack.push('vue');
if (has('svelte', '@sveltejs/kit')) stack.push('svelte');
if (has('tailwindcss')) stack.push('tailwind');
if (existsSync(join(root, 'components.json'))) stack.push('shadcn');
if (existsSync(join(root, 'ProjectSettings')) && existsSync(join(root, 'Assets'))) stack.push('unity');
if (existsSync(join(root, 'fxmanifest.lua')) || files.some((f) => /fxmanifest\.lua$/.test(f))) stack.push('fivem');
if (existsSync(join(root, 'pubspec.yaml'))) stack.push('flutter');
if (!stack.length && files.some((f) => extname(f) === '.html')) stack.push('html');

const entries = files.filter((f) => /(^|[\\/])(index\.html|App\.(t|j)sx|page\.(t|j)sx|layout\.(t|j)sx|_app\.(t|j)sx|main\.(t|j)sx|globals?\.css|tailwind\.config\.\w+|theme\.\w+|tokens?\.\w+|[\w-]+\.uxml)$/i.test(f)).slice(0, 25).map((f) => relative(root, f));

const usage = (name) => { let n = 0; for (const f of files) { const s = readFileSync(f, 'utf8'); n += s.split(`var(${name}`).length - 1; } return n; };
const varList = Object.entries(vars).slice(0, 200).map(([name, defs]) => ({ name, defs }));
for (const v of varList.slice(0, 80)) v.uses = usage(v.name);

console.log(JSON.stringify({
  project: root,
  name: pkg?.name || basename(root),
  stack,
  files_scanned: files.length,
  entries,
  custom_properties: varList.sort((a, b) => (b.uses || 0) - (a.uses || 0)),
  colors: top(colors, 24),
  fonts: top(fonts), font_imports: [...fontImports],
  radius: top(radii), shadows: top(shadows, 8), font_sizes: top(sizes), spacing: top(spacing),
  motion: { durations: top(durations, 8), easings: top(easings, 8) },
  tailwind_classes: top(twClasses, 30),
  next: 'Read the entry files, screenshot the running UI if possible, then fill STYLE.md + tokens.css (references/styles.md).',
}, null, 2));

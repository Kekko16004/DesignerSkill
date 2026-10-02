#!/usr/bin/env node
// Fast, deterministic first pass from an approved HTML/CSS preview to a real UI stack.
// It never replaces review: every lossy step is listed in <out>/<Name>.report.md.
//
//   node translate.mjs uitk   <variant.html> [--css f.css ...] [--out dir] [--name Inventory]   Unity UI Toolkit (UXML + USS)
//   node translate.mjs react  <variant.html> [...]                                            React component (JSX + CSS)
//   node translate.mjs rn     <variant.html> [...]                                            React Native (View/Text + StyleSheet)
//   node translate.mjs html   <variant.html> [...]                                            standalone HTML page (CSS inlined, no studio)
//   node translate.mjs tokens <tokens.css|variant.html> [--out dir] [--name tokens]           tokens -> json, tailwind, uss, ts, dart, swift
//
// Variant Studio fragments: `_shared.css` next to the file and `.variant-studio/global.css` are picked up automatically.
import { readFileSync, writeFileSync, mkdirSync, existsSync } from 'node:fs';
import { dirname, join, resolve, basename, extname } from 'node:path';
import { parseCss, parseDecls, rootVars, resolveVars, splitTop } from './lib/css.mjs';
import { parseHtml, find, walk, textContent, collapse, VOID } from './lib/html.mjs';
import { flattenColors, parseColor, toHex, COLOR_RE } from './lib/color.mjs';

const [target, input, ...rest] = process.argv.slice(2);
const opt = { css: [], out: null, name: null };
for (let i = 0; i < rest.length; i++) {
  if (rest[i] === '--css') opt.css.push(rest[++i]);
  else if (rest[i] === '--out') opt.out = rest[++i];
  else if (rest[i] === '--name') opt.name = rest[++i];
}
if (!['uitk', 'react', 'rn', 'html', 'tokens'].includes(target) || !input) {
  console.error('usage: translate.mjs <uitk|react|rn|html|tokens> <file> [--css f.css] [--out dir] [--name Name]');
  process.exit(1);
}

const inPath = resolve(input);
const outDir = resolve(opt.out || join(dirname(inPath), 'translated'));
const pascal = (s) => s.replace(/(^|[^a-zA-Z0-9]+)([a-zA-Z0-9])/g, (_, __, c) => c.toUpperCase()).replace(/^[0-9]/, 'V$&');
const name = opt.name || pascal(basename(inPath, extname(inPath)));
const warnings = new Map(); // message -> count
const warn = (m) => warnings.set(m, (warnings.get(m) || 0) + 1);
mkdirSync(outDir, { recursive: true });

// ---------- load sources ----------
const src = readFileSync(inPath, 'utf8');
const isCss = extname(inPath).toLowerCase() === '.css';
const doc = isCss ? { type: 'root', children: [] } : parseHtml(src);
let cssText = isCss ? src : '';
if (!isCss) {
  const near = [];
  // .variant-studio/global.css then <round>/_shared.css (same order as the studio)
  let d = dirname(inPath);
  for (let k = 0; k < 4; k++, d = dirname(d)) {
    if (basename(d) === '.variant-studio' && existsSync(join(d, 'global.css'))) { near.push(join(d, 'global.css')); break; }
  }
  if (existsSync(join(dirname(inPath), '_shared.css'))) near.push(join(dirname(inPath), '_shared.css'));
  walk(doc, (n) => {
    if (n.type !== 'el') return;
    if (n.tag === 'link' && /stylesheet/i.test(n.attrs.rel || '') && n.attrs.href && !/^(https?:)?\/\//.test(n.attrs.href)) {
      const p = resolve(dirname(inPath), n.attrs.href);
      if (existsSync(p)) near.push(p); else warn(`Linked stylesheet not found: ${n.attrs.href}`);
    }
  });
  for (const p of [...new Set([...near, ...opt.css.map((c) => resolve(c))])]) cssText += '\n' + readFileSync(p, 'utf8');
  walk(doc, (n) => { if (n.type === 'el' && n.tag === 'style') cssText += '\n' + (n.text || ''); });
}
const rules = parseCss(cssText);
const vars = rootVars(rules);
const body = find(doc, (n) => n.tag === 'body') || doc;

// ---------- helpers ----------
const lit = (v) => flattenColors(resolveVars(v, vars));
const px = (v) => v.replace(/(-?[\d.]+)r?em\b/g, (_, n) => `${+(parseFloat(n) * 16).toFixed(2)}px`);
const xmlEsc = (s) => s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
const kebab = (s) => s.replace(/[A-Z]/g, (c) => '-' + c.toLowerCase());
const camel = (s) => s.replace(/-([a-z0-9])/g, (_, c) => c.toUpperCase());
const classes = (n) => (n.attrs?.class || '').split(/\s+/).filter(Boolean);
const INLINE_TEXT = new Set(['b', 'strong', 'em', 'i', 'span', 'small', 'br', 'u', 's', 'sup', 'sub', 'code', 'mark', 'abbr', 'time', 'kbd']);
const TEXT_TAGS = new Set(['p', 'h1', 'h2', 'h3', 'h4', 'h5', 'h6', 'span', 'label', 'small', 'strong', 'em', 'b', 'i', 'li', 'td', 'th', 'dt', 'dd', 'figcaption', 'legend', 'caption', 'code', 'kbd', 'time', 'abbr', 'mark', 'div', 'a', 'blockquote', 'cite', 'q', 'output']);
const SKIP = new Set(['script', 'style', 'link', 'meta', 'title', 'head', 'template', 'noscript']);
// text-only = only text and bare inline formatting; an inline child with its own class/id/style is a real element
const isTextOnly = (n) => (n.children || []).every((c) => c.type === 'text' || (INLINE_TEXT.has(c.tag) && !c.attrs.class && !c.attrs.id && !c.attrs.style && isTextOnly(c)));
const hasText = (n) => collapse(textContent(n)) !== '';

// class -> flags from single-class rules (uppercase text, scroll containers, pointer-events)
const classFlags = {};
for (const r of rules) {
  if (r.type !== 'rule' || r.media) continue;
  for (const sel of r.selector.split(',')) {
    const m = sel.trim().match(/^\.([\w-]+)$/);
    if (!m) continue;
    const f = (classFlags[m[1]] ||= {});
    for (const d of r.decls) {
      if (d.prop === 'text-transform') f.transform = d.value;
      if (d.prop === 'overflow' || d.prop === 'overflow-y' || d.prop === 'overflow-x') if (/auto|scroll/.test(d.value)) f.scroll = true;
      if (d.prop === 'pointer-events' && d.value === 'none') f.ignore = true;
    }
  }
}
const inheritedTransform = (chain) => {
  for (let k = chain.length - 1; k >= 0; k--) for (const c of classes(chain[k])) if (classFlags[c]?.transform) return classFlags[c].transform;
  return null;
};
const applyTransform = (t, tr) => (tr === 'uppercase' ? t.toUpperCase() : tr === 'lowercase' ? t.toLowerCase() : tr === 'capitalize' ? t.replace(/\b\w/g, (c) => c.toUpperCase()) : t);
const flag = (n, k) => classes(n).some((c) => classFlags[c]?.[k]);

// type selectors used in CSS -> become classes `t-<tag>` (USS/RN type selectors mean C# types, not tags)
const usedTypes = new Set();
for (const r of rules) {
  if (r.type !== 'rule') continue;
  for (const m of r.selector.matchAll(/(^|[\s>+~,(])([a-z][a-z0-9]*)(?=[.#:\[\s>+~,)]|$)/g)) usedTypes.add(m[2]);
}

function report(extra = []) {
  const lines = [`# Translation report: ${name} (${target})`, '', `Source: \`${inPath}\``, ''];
  lines.push(...extra);
  if (warnings.size) {
    lines.push('', '## Manual follow-up', '');
    for (const [m, c] of [...warnings].sort((a, b) => b[1] - a[1])) lines.push(`- ${m}${c > 1 ? ` (x${c})` : ''}`);
  } else lines.push('', 'No lossy steps.');
  writeFileSync(join(outDir, `${name}.report.md`), lines.join('\n') + '\n');
}

function done(files) {
  console.log(JSON.stringify({ target, name, out: outDir, files: files.map((f) => join(outDir, f)), warnings: warnings.size, report: join(outDir, `${name}.report.md`) }, null, 2));
}

// ======================================================================
// tokens
// ======================================================================
function tokensTarget() {
  const tok = {};
  for (const [k, v] of Object.entries(vars)) tok[k.slice(2)] = lit(v);
  const dark = {};
  for (const r of rules) {
    if (r.type !== 'rule' || !/data-theme=["']?dark|\.dark\b|prefers-color-scheme:\s*dark/.test(r.selector + (r.media || ''))) continue;
    for (const d of r.decls) if (d.prop.startsWith('--')) dark[d.prop.slice(2)] = lit(d.value);
  }
  if (!Object.keys(tok).length) { console.error('No :root custom properties found.'); process.exit(2); }
  const isColor = (v) => !!parseColor(v.trim());
  const num = (v) => { const m = v.trim().match(/^(-?[\d.]+)(px|ms)?$/); return m ? parseFloat(m[1]) : null; };
  const group = (k, v) => (isColor(v) ? 'color' : /font|family/.test(k) ? 'font' : /radius/.test(k) ? 'radius' : /shadow|glow|elev/.test(k) ? 'shadow' : /move|dur|ease|motion/.test(k) ? 'motion' : /pad|gap|space|safe|hit|size/.test(k) ? 'space' : 'other');

  const json = { $schema: 'designer/tokens@1', name, tokens: {}, dark: Object.keys(dark).length ? dark : undefined };
  for (const [k, v] of Object.entries(tok)) (json.tokens[group(k, v)] ||= {})[k] = v;
  writeFileSync(join(outDir, `${name}.tokens.json`), JSON.stringify(json, null, 2) + '\n');

  // Tailwind: reference the CSS variables so runtime theming keeps working
  const tw = { colors: {}, borderRadius: {}, fontFamily: {}, boxShadow: {}, spacing: {}, transitionDuration: {} };
  for (const [k, v] of Object.entries(tok)) {
    const g = group(k, v);
    const ref = `var(--${k})`;
    if (g === 'color') tw.colors[k] = ref;
    else if (g === 'radius') tw.borderRadius[k.replace(/^radius-?/, '') || 'DEFAULT'] = ref;
    else if (g === 'font') tw.fontFamily[k.replace(/^font-?/, '')] = [ref];
    else if (g === 'shadow') tw.boxShadow[k] = ref;
    else if (g === 'space') tw.spacing[k] = ref;
    else if (g === 'motion' && /ms|s$/.test(v)) tw.transitionDuration[k] = ref;
  }
  writeFileSync(join(outDir, `${name}.tailwind.js`), `// tailwind.config.js -> theme.extend\nexport default ${JSON.stringify(tw, null, 2)};\n`);

  // USS (Unity): only values USS understands
  const uss = [':root {'];
  for (const [k, v] of Object.entries(tok)) {
    if (/font/.test(k)) { uss.push(`  /* --${k}: ${v} -> assign a Font Asset via -unity-font-definition */`); continue; }
    if (/shadow|glow|ease|safe/.test(k) || /calc\(|env\(|max\(|min\(|clamp\(/.test(v)) { uss.push(`  /* --${k}: ${v} (not representable in USS) */`); continue; }
    uss.push(`  --${k}: ${px(v)};`);
  }
  uss.push('}');
  writeFileSync(join(outDir, `${name}.tokens.uss`), uss.join('\n') + '\n');

  // TypeScript (React Native / web)
  const ts = Object.entries(tok).map(([k, v]) => { const n = num(v); return `  ${camel(k)}: ${n !== null ? n : JSON.stringify(v)},`; });
  writeFileSync(join(outDir, `${name}.tokens.ts`), `export const ${camel(name)}Tokens = {\n${ts.join('\n')}\n} as const;\n`);

  // Flutter
  const dart = [`import 'package:flutter/material.dart';`, '', `class ${pascal(name)}Tokens {`];
  for (const [k, v] of Object.entries(tok)) {
    const c = parseColor(v.trim()), n = num(v);
    if (c) dart.push(`  static const ${camel(k)} = Color(0x${toHex({ ...c, a: 1 }).slice(1).padStart(6, '0').replace(/^/, Math.round(c.a * 255).toString(16).padStart(2, '0')).toUpperCase()});`);
    else if (n !== null) dart.push(`  static const double ${camel(k)} = ${n};`);
    else dart.push(`  // ${k}: ${v}`);
  }
  dart.push('}');
  writeFileSync(join(outDir, `${name}.tokens.dart`), dart.join('\n') + '\n');

  // SwiftUI
  const sw = ['import SwiftUI', '', `enum ${pascal(name)}Tokens {`];
  for (const [k, v] of Object.entries(tok)) {
    const c = parseColor(v.trim()), n = num(v);
    if (c) sw.push(`  static let ${camel(k)} = Color(.sRGB, red: ${(c.r / 255).toFixed(3)}, green: ${(c.g / 255).toFixed(3)}, blue: ${(c.b / 255).toFixed(3)}, opacity: ${+c.a.toFixed(3)})`);
    else if (n !== null) sw.push(`  static let ${camel(k)}: CGFloat = ${n}`);
    else sw.push(`  // ${k}: ${v}`);
  }
  sw.push('}');
  writeFileSync(join(outDir, `${name}.tokens.swift`), sw.join('\n') + '\n');

  report([`Tokens: ${Object.keys(tok).length}${Object.keys(dark).length ? `, dark overrides: ${Object.keys(dark).length}` : ''}.`, '', 'Unity UGUI has no stylesheet: read `.tokens.json` from a ScriptableObject / theme script.']);
  done([`${name}.tokens.json`, `${name}.tailwind.js`, `${name}.tokens.uss`, `${name}.tokens.ts`, `${name}.tokens.dart`, `${name}.tokens.swift`]);
}

// ======================================================================
// USS (Unity UI Toolkit)
// ======================================================================
const USS_PROPS = new Set(('align-content align-items align-self background-color background-image background-position background-position-x background-position-y background-repeat background-size ' +
  'border-bottom-color border-bottom-left-radius border-bottom-right-radius border-bottom-width border-color border-left-color border-left-width border-radius border-right-color border-right-width ' +
  'border-top-color border-top-left-radius border-top-right-radius border-top-width border-width bottom color display flex flex-basis flex-direction flex-grow flex-shrink flex-wrap font-size height ' +
  'justify-content left letter-spacing margin margin-bottom margin-left margin-right margin-top max-height max-width min-height min-width opacity overflow padding padding-bottom padding-left padding-right ' +
  'padding-top position right rotate scale text-overflow text-shadow top transform-origin transition transition-delay transition-duration transition-property transition-timing-function translate ' +
  'visibility white-space width word-spacing').split(' '));
const USS_EASE = new Set(['ease', 'ease-in', 'ease-out', 'ease-in-out', 'linear', 'ease-in-sine', 'ease-out-sine', 'ease-in-out-sine', 'ease-in-cubic', 'ease-out-cubic', 'ease-in-out-cubic', 'ease-in-circ', 'ease-out-circ', 'ease-in-out-circ', 'ease-in-elastic', 'ease-out-elastic', 'ease-in-out-elastic', 'ease-in-back', 'ease-out-back', 'ease-in-out-back', 'ease-in-bounce', 'ease-out-bounce', 'ease-in-out-bounce']);
const TEXT_ALIGN = { left: 'middle-left', start: 'middle-left', center: 'middle-center', right: 'middle-right', end: 'middle-right', justify: 'middle-left' };

function firstColorOf(v) {
  const m = lit(v).match(COLOR_RE);
  return m ? m[0] : null;
}

function evalMath(v) {
  // clamp(a, b, c) -> c (max) ; min(a, b) -> a ; max(a, b) -> b ; calc(px +- px) -> px
  let out = v.replace(/clamp\(([^()]*)\)/g, (_, a) => splitTop(a, ',').pop().trim())
    .replace(/min\(([^()]*)\)/g, (_, a) => splitTop(a, ',')[0].trim())
    .replace(/max\(([^()]*)\)/g, (_, a) => splitTop(a, ',').pop().trim());
  out = out.replace(/calc\(([^()]*)\)/g, (m, e) => {
    const t = px(e).replace(/px/g, '');
    if (!/^[\d.\s+\-*/]+$/.test(t)) return m;
    try { return `${+Function(`return (${t})`)().toFixed(2)}px`; } catch { return m; }
  });
  return out;
}

// returns [[prop, value], ...] in USS or [] (with a warning)
function ussDecl(prop, raw, ctx) {
  if (prop.startsWith('--')) {
    if (/font/.test(prop)) return [];
    const v = px(evalMath(flattenColors(raw.includes('color-mix') || raw.includes('calc') ? lit(raw) : raw)));
    // shadows, easings, multi-length values: not usable as USS custom properties
    if (/env\(|calc\(|cubic-bezier|\binset\b|-?[\d.]+px\s+-?[\d.]+px/.test(v) && !/^var\(/.test(v)) return [];
    return [[prop, v]];
  }
  let v = raw;
  const needsLit = /color-mix|calc\(|clamp\(|min\(|max\(|hsl|env\(/.test(v);
  if (needsLit) v = evalMath(lit(v));
  v = px(v).replace(/(-?[\d.]+)v[hw]\b/g, (_, n) => { warn('vh/vw converted to % of the parent; check full-screen panels'); return `${n}%`; });
  if (/env\(/.test(v)) { warn('env(safe-area-*) dropped: handle safe area with Screen.safeArea in C#'); return []; }
  switch (prop) {
    case 'font-weight': {
      const b = /bold|[6-9]00/.test(v);
      ctx.bold = b;
      return [['-unity-font-style', ctx.italic ? (b ? 'bold-and-italic' : 'italic') : b ? 'bold' : 'normal']];
    }
    case 'font-style': ctx.italic = v === 'italic'; return [['-unity-font-style', ctx.italic ? (ctx.bold ? 'bold-and-italic' : 'italic') : ctx.bold ? 'bold' : 'normal']];
    case 'font-family': warn(`font-family "${lit(v)}": create a Font Asset and set -unity-font-definition`); return [];
    case 'font': {
      // [style] [weight] size[/line-height] family
      const m = v.match(/^(.*?)(-?[\d.]+px)(?:\/[^\s]+)?\s+(.+)$/);
      if (!m) { warn(`font shorthand "${v}" dropped`); return []; }
      const out = [['font-size', m[2]]];
      if (/italic/.test(m[1])) ctx.italic = true;
      if (/bold|[6-9]00/.test(m[1])) ctx.bold = true;
      if (ctx.bold || ctx.italic) out.push(['-unity-font-style', ctx.bold && ctx.italic ? 'bold-and-italic' : ctx.bold ? 'bold' : 'italic']);
      if (!/^(system-ui|inherit|sans-serif|serif|monospace)$/.test(m[3].trim())) warn(`font-family "${lit(m[3]).trim()}": create a Font Asset and set -unity-font-definition`);
      return out;
    }
    case 'text-align': return [['-unity-text-align', TEXT_ALIGN[v] || 'middle-left']];
    case 'text-transform': return []; // applied to the label text in UXML
    case 'line-height': warn('line-height has no USS equivalent (use padding or -unity-paragraph-spacing)'); return [];
    case '-webkit-text-stroke': {
      const [w, ...c] = v.split(/\s+/);
      return [['-unity-text-outline-width', w], ['-unity-text-outline-color', c.join(' ') || 'black']];
    }
    case 'object-fit': return [['-unity-background-scale-mode', { cover: 'scale-and-crop', contain: 'scale-to-fit', fill: 'stretch-to-fill' }[v] || 'scale-to-fit']];
    case 'display':
      if (v === 'none') return [['display', 'none']];
      if (/grid/.test(v)) { warn('display:grid emulated with flex-direction:row + flex-wrap:wrap; set child widths/heights'); ctx.flex = true; ctx.row = true; return [['display', 'flex'], ['flex-direction', 'row'], ['flex-wrap', 'wrap']]; }
      if (/flex/.test(v)) { ctx.flex = true; return [['display', 'flex']]; }
      return [];
    case 'flex-direction': ctx.dir = v; return [['flex-direction', v]];
    case 'gap': case 'row-gap': case 'column-gap': ctx.gap = v.split(/\s+/)[0]; return [];
    case 'grid-template-columns': case 'grid-template-rows': case 'grid-column': case 'grid-row': case 'grid-area': case 'grid-auto-flow': case 'place-items': case 'place-content':
      warn('grid placement dropped: children wrap in a row; size them explicitly'); return [];
    case 'position': return [['position', v === 'relative' || v === 'static' ? 'relative' : 'absolute']];
    case 'inset': {
      const p = v.split(/\s+/);
      const [t, r = t, b = t, l = r] = p;
      return [['top', t], ['right', r], ['bottom', b], ['left', l]];
    }
    case 'border': case 'border-top': case 'border-right': case 'border-bottom': case 'border-left': {
      if (v === 'none' || v === '0') return [[prop === 'border' ? 'border-width' : `${prop}-width`, '0']];
      const w = (v.match(/(^|\s)(\d[\d.]*px|0)(?=\s|$)/) || [, , '1px'])[2];
      const c = firstColorOf(v) || (v.match(/var\([^)]*\)/) || [])[0];
      const out = [[prop === 'border' ? 'border-width' : `${prop}-width`, w]];
      if (c) out.push([prop === 'border' ? 'border-color' : `${prop}-color`, c]);
      if (/dashed|dotted|double/.test(v)) warn('border styles other than solid are not supported in USS');
      return out;
    }
    case 'border-style': return [];
    case 'background': {
      if (/url\(/.test(v)) return [['background-image', v.match(/url\([^)]*\)/)[0]]];
      if (/gradient/.test(v)) {
        warn('gradients are not supported in USS: first color stop used; bake a sprite or use a Vector Image for the real gradient');
        const c = firstColorOf(v); return c ? [['background-color', c]] : [];
      }
      return [['background-color', v]];
    }
    case 'background-image':
      if (/gradient/.test(v)) { warn('gradients are not supported in USS: first color stop used; bake a sprite or use a Vector Image for the real gradient'); const c = firstColorOf(v); return c ? [['background-color', c]] : []; }
      return [['background-image', v]];
    case 'box-shadow': if (v !== 'none') warn('box-shadow dropped: use a 9-slice sprite, nested borders or a Shadow element'); return [];
    case 'filter': case 'backdrop-filter': case 'clip-path': case 'mix-blend-mode': case 'mask': case '-webkit-mask': case 'mask-image':
      warn(`${prop} not supported in USS: bake it into a sprite`); return [];
    case 'z-index': warn('z-index dropped: UI Toolkit draws in hierarchy order (move the element later in the UXML)'); return [];
    case 'pointer-events': return [];
    case 'cursor': case 'user-select': case 'outline': case 'outline-offset': case 'appearance': case '-webkit-appearance': case 'box-sizing': case 'content': case 'will-change': case 'isolation': case 'contain': case 'color-scheme': case '-webkit-font-smoothing': case 'font-variant-numeric': case 'font-feature-settings': case 'list-style': case 'text-decoration': case 'vertical-align': case 'text-rendering': case 'accent-color': case 'caret-color': case 'scroll-behavior': case 'animation': case 'animation-name': case 'resize': case 'tab-size': case 'word-break': case 'overflow-wrap': case 'hyphens': case 'image-rendering':
      if (/animation/.test(prop)) warn('CSS @keyframes animations dropped: use USS transitions or C# experimental.animation');
      return [];
    case 'transform': {
      const out = [];
      const t = v.match(/translate[XY]?\(([^)]*)\)/), s = v.match(/scale\(([^)]*)\)/), r = v.match(/rotate\(([^)]*)\)/);
      if (t) out.push(['translate', t[0].startsWith('translateY') ? `0 ${t[1]}` : t[1].replace(',', ' ')]);
      if (s) out.push(['scale', s[1].replace(',', ' ')]);
      if (r) out.push(['rotate', r[1]]);
      if (!out.length && v !== 'none') warn(`transform "${v}" not converted`);
      return out;
    }
    case 'transition': case 'transition-timing-function': {
      const fixed = v.replace(/cubic-bezier\([^)]*\)/g, () => { warn('cubic-bezier easing mapped to ease-out (USS supports named easings only)'); return 'ease-out'; })
        .replace(/\b(ease-[a-z-]+|ease|linear)\b/g, (e) => (USS_EASE.has(e) ? e : 'ease-out'));
      return [[prop, fixed]];
    }
    case 'overflow': case 'overflow-x': case 'overflow-y':
      return [['overflow', v === 'visible' ? 'visible' : 'hidden']];
    case 'width': case 'height': case 'min-width': case 'max-width': case 'min-height': case 'max-height':
      if (/content|fit|stretch|fr\b/.test(v)) return [];
      return [[prop, v]];
    case 'aspect-ratio': warn('aspect-ratio dropped: set explicit width and height'); return [];
  }
  if (prop.startsWith('-unity-')) return [[prop, v]];
  if (!USS_PROPS.has(prop)) { warn(`property "${prop}" not supported in USS`); return []; }
  if (/currentcolor/i.test(v)) { warn('currentColor not supported in USS'); return []; }
  if (/\b\d[\d.]*fr\b/.test(v)) return [];
  return [[prop, v]];
}

function ussSelector(sel) {
  let s = sel.trim();
  if (/::?(before|after|placeholder|selection|marker|backdrop|-webkit-[\w-]+)/.test(s)) { warn('::before/::after rules dropped: add real child elements in the UXML'); return null; }
  if (/\[|:not\(|:nth-|:first-child|:last-child|:only-child|:has\(|:is\(|:where\(|[+~]/.test(s)) {
    if (/data-theme|\.dark\b/.test(s)) warn('dark theme selectors dropped: make a second USS theme'); else warn(`selector "${s}" not supported in USS`);
    return null;
  }
  s = s.replace(/:focus-visible|:focus-within/g, ':focus');
  if (/:(?!hover|active|focus|checked|disabled|enabled|root|inactive)[a-z-]+/.test(s)) { warn(`pseudo-class in "${s}" not supported in USS`); return null; }
  s = s.replace(/(^|[\s>(])(html|body)(?=[.#:\s>]|$)/g, '$1.t-body');
  s = s.replace(/(^|[\s>(])([a-z][a-z0-9]*)(?=[.#:\s>]|$)/g, (m, p, t) => (t === 'root' ? m : `${p}.t-${t}`));
  return s;
}

function ussTarget(ruleList) {
  const out = [];
  for (const r of ruleList) {
    if (r.type !== 'rule') continue;
    if (r.media) {
      if (!/prefers-reduced-motion|hover|pointer/.test(r.media)) warn(`@media ${r.media.replace(/^@media\s*/, '')} dropped: UI Toolkit has no media queries (switch USS from C# on resolution)`);
      continue;
    }
    const sels = r.selector.split(',').map(ussSelector).filter(Boolean);
    if (!sels.length) continue;
    const ctx = {};
    const decls = [];
    for (const d of r.decls) for (const [p, v] of ussDecl(d.prop, d.value, ctx)) decls.push([p, v]);
    // CSS flex defaults to row, USS defaults to column
    if (ctx.flex && !ctx.dir && !ctx.row) decls.push(['flex-direction', 'row']);
    if (decls.length) out.push(`${sels.join(', ')} {\n${decls.map(([p, v]) => `  ${p}: ${v};`).join('\n')}\n}`);
    if (ctx.gap) {
      const row = ctx.row || (ctx.flex && !/column/.test(ctx.dir || ''));
      out.push(`${sels.map((x) => `${x} > *`).join(', ')} {\n  ${row ? 'margin-right' : 'margin-bottom'}: ${ctx.gap};\n}`);
      warn('gap emulated with a margin on children (last child keeps the margin)');
    }
  }
  return out.join('\n\n');
}

const USS_BASE = `/* html defaults that UI Toolkit lacks */
.t-body { flex-grow: 1; }
.t-tr, .t-thead, .t-tbody { flex-direction: row; }
.t-hr { height: 1px; background-color: rgba(255, 255, 255, 0.2); margin: 8px 0; }
`;

function uitkTarget() {
  const icons = [];
  const lines = [];
  const ind = (d) => '    '.repeat(d);
  const attrs = (n, extra = {}) => {
    const cls = [...classes(n)];
    if (usedTypes.has(n.tag)) cls.push(`t-${n.tag}`);
    const a = { name: n.attrs.id, class: cls.join(' ') || undefined, ...extra };
    if (n.attrs.style) {
      const ctx = {};
      const st = parseDecls(n.attrs.style).flatMap((d) => ussDecl(d.prop, d.value, ctx)).map(([p, v]) => `${p}: ${v}`);
      if (ctx.flex && !ctx.dir) st.push('flex-direction: row');
      if (st.length) a.style = st.join('; ') + ';';
    }
    if (flag(n, 'ignore')) a['picking-mode'] = 'Ignore';
    if (n.attrs.title) a.tooltip = n.attrs.title;
    if (n.attrs.disabled !== undefined) a.enabled = 'false';
    return Object.entries(a).filter(([, v]) => v !== undefined && v !== '').map(([k, v]) => ` ${k}="${xmlEsc(String(v))}"`).join('');
  };
  const rich = (n, tr) => {
    if (n.type === 'text') return applyTransform(n.text, tr);
    const inner = (n.children || []).map((c) => rich(c, tr)).join('');
    if (n.tag === 'b' || n.tag === 'strong') return `<b>${inner}</b>`;
    if (n.tag === 'i' || n.tag === 'em') return `<i>${inner}</i>`;
    if (n.tag === 'br') return '\n';
    return inner;
  };
  const labelText = (n, chain) => collapse(rich(n, inheritedTransform([...chain, n])).replace(/\n/g, '\u0001')).replace(/\u0001/g, '\n');

  function emit(n, d, chain) {
    if (n.type === 'text') {
      const t = collapse(n.text);
      if (t) lines.push(`${ind(d)}<ui:Label text="${xmlEsc(applyTransform(t, inheritedTransform(chain)))}" />`);
      return;
    }
    if (SKIP.has(n.tag) || n.tag === 'br') return;
    const kids = n.children || [];
    const next = [...chain, n];
    const open = (type, extra) => lines.push(`${ind(d)}<${type}${attrs(n, extra)}>`);
    const leaf = (type, extra) => lines.push(`${ind(d)}<${type}${attrs(n, extra)} />`);
    const children = () => kids.forEach((c) => emit(c, d + 1, next));
    switch (n.tag) {
      case 'button': case 'a':
        if (n.tag === 'a' && !/button/.test(n.attrs.role || '') && isTextOnly(n) && !classes(n).some((c) => /btn|button|cta/.test(c))) { leaf('ui:Label', { text: labelText(n, chain) }); return; }
        if (isTextOnly(n)) { leaf('ui:Button', { text: labelText(n, chain) }); return; }
        open('ui:Button'); children(); lines.push(`${ind(d)}</ui:Button>`); return;
      case 'input': {
        const t = (n.attrs.type || 'text').toLowerCase();
        const label = n.attrs['aria-label'] || '';
        if (t === 'checkbox' || t === 'radio') { leaf(t === 'radio' ? 'ui:RadioButton' : 'ui:Toggle', { label, value: n.attrs.checked !== undefined ? 'true' : undefined }); return; }
        if (t === 'range') { leaf('ui:Slider', { label, 'low-value': n.attrs.min || '0', 'high-value': n.attrs.max || '100', value: n.attrs.value }); return; }
        if (t === 'hidden') return;
        if (t === 'submit' || t === 'button') { leaf('ui:Button', { text: n.attrs.value || 'OK' }); return; }
        leaf('ui:TextField', { label, value: n.attrs.value, 'placeholder-text': n.attrs.placeholder, password: t === 'password' ? 'true' : undefined });
        return;
      }
      case 'textarea': leaf('ui:TextField', { multiline: 'true', value: collapse(textContent(n)), 'placeholder-text': n.attrs.placeholder }); return;
      case 'select': {
        const opts = [];
        walk(n, (o) => { if (o.type === 'el' && o.tag === 'option') opts.push(collapse(textContent(o)).replace(/,/g, ' ')); });
        leaf('ui:DropdownField', { choices: opts.join(','), index: '0', label: n.attrs['aria-label'] });
        return;
      }
      case 'progress': case 'meter': leaf('ui:ProgressBar', { value: n.attrs.value || '0', 'high-value': n.attrs.max || '1', title: n.attrs['aria-label'] }); return;
      case 'img': {
        const st = [`background-image: url("${n.attrs.src || ''}")`, '-unity-background-scale-mode: scale-to-fit'];
        if (n.attrs.width) st.push(`width: ${parseFloat(n.attrs.width)}px`);
        if (n.attrs.height) st.push(`height: ${parseFloat(n.attrs.height)}px`);
        warn('<img>: import the image as Sprite/Texture and fix the url("project://database/Assets/...") path');
        lines.push(`${ind(d)}<ui:VisualElement${attrs(n)} style="${xmlEsc(st.join('; ') + ';')}" />`);
        return;
      }
      case 'svg': {
        const id = `${name}-icon-${icons.length + 1}.svg`;
        icons.push([id, serializeSvg(n)]);
        const w = n.attrs.width ? `width: ${parseFloat(n.attrs.width)}px; ` : '', h = n.attrs.height ? `height: ${parseFloat(n.attrs.height)}px; ` : '';
        lines.push(`${ind(d)}<ui:VisualElement${attrs(n, { class: [...classes(n), 'svg-icon'].join(' ') })} style="${w}${h}background-image: url(&quot;${id}&quot;);" />`);
        warn('inline <svg> saved as a separate .svg: import it with the Vector Graphics package (or as a Sprite) and fix the url()');
        return;
      }
      case 'hr': leaf('ui:VisualElement', { class: [...classes(n), 't-hr'].join(' ') }); return;
    }
    if (TEXT_TAGS.has(n.tag) && isTextOnly(n) && hasText(n)) { leaf('ui:Label', { text: labelText(n, chain) }); return; }
    const type = flag(n, 'scroll') ? 'ui:ScrollView' : 'ui:VisualElement';
    if (!kids.length) { leaf(type); return; }
    open(type); children(); lines.push(`${ind(d)}</${type}>`);
  }

  lines.push(`<ui:UXML xmlns:ui="UnityEngine.UIElements" xmlns:uie="UnityEditor.UIElements" editor-extension-mode="False">`);
  lines.push(`    <Style src="${name}.uss" />`);
  lines.push(`    <ui:VisualElement name="${name}" class="t-body">`);
  for (const c of body.children || []) emit(c, 2, []);
  lines.push('    </ui:VisualElement>', '</ui:UXML>');
  writeFileSync(join(outDir, `${name}.uxml`), lines.join('\n') + '\n');
  writeFileSync(join(outDir, `${name}.uss`), `/* Generated by designer translate.mjs from ${basename(inPath)} - review ${name}.report.md */\n\n${USS_BASE}\n${ussTarget(rules)}\n`);
  for (const [f, s] of icons) writeFileSync(join(outDir, f), s);
  report([
    'Unity UI Toolkit. Put `.uxml` + `.uss` under `Assets/UI/`, assign the UXML to a UIDocument, bind callbacks by `name` in C# (`root.Q<Button>("id")`).',
    'Fonts: create TextMeshPro/UITK Font Assets and set `-unity-font-definition` on `.t-body` (inherits).',
  ]);
  done([`${name}.uxml`, `${name}.uss`, ...icons.map(([f]) => f)]);
}

function serializeSvg(n) {
  if (n.type === 'text') return xmlEsc(n.text);
  const a = Object.entries(n.attrs).map(([k, v]) => ` ${k}="${xmlEsc(v)}"`).join('');
  if (n.tag === 'svg' && !n.attrs.xmlns) return `<svg xmlns="http://www.w3.org/2000/svg"${a}>${n.children.map(serializeSvg).join('')}</svg>`;
  if (!n.children.length) return `<${n.tag}${a}/>`;
  return `<${n.tag}${a}>${n.children.map(serializeSvg).join('')}</${n.tag}>`;
}

// ======================================================================
// React (web)
// ======================================================================
const JSX_ATTR = { class: 'className', for: 'htmlFor', tabindex: 'tabIndex', readonly: 'readOnly', maxlength: 'maxLength', minlength: 'minLength', colspan: 'colSpan', rowspan: 'rowSpan', autocomplete: 'autoComplete', autofocus: 'autoFocus', contenteditable: 'contentEditable', crossorigin: 'crossOrigin', srcset: 'srcSet', viewbox: 'viewBox', 'xlink:href': 'xlinkHref', 'xml:space': 'xmlSpace', preserveaspectratio: 'preserveAspectRatio', gradientunits: 'gradientUnits', gradienttransform: 'gradientTransform', patternunits: 'patternUnits', stdDeviation: 'stdDeviation', stddeviation: 'stdDeviation', clippathunits: 'clipPathUnits', markerwidth: 'markerWidth', markerheight: 'markerHeight', refx: 'refX', refy: 'refY' };
const BOOL = new Set(['disabled', 'checked', 'selected', 'readonly', 'required', 'hidden', 'autofocus', 'multiple', 'open']);

function reactTarget() {
  const jsxEsc = (s) => s.replace(/[{}<>]/g, (c) => `{'${c}'}`);
  const styleObj = (s) => `{{ ${parseDecls(s).map((d) => `${d.prop.startsWith('--') ? `'${d.prop}'` : camel(d.prop)}: ${JSON.stringify(d.value)}`).join(', ')} }}`;
  const out = [];
  function emit(n, d) {
    const ind = '  '.repeat(d);
    if (n.type === 'text') { const t = n.text.replace(/\s+/g, ' '); if (t.trim()) out.push(ind + jsxEsc(t.trim())); return; }
    if (SKIP.has(n.tag)) return;
    const a = Object.entries(n.attrs).map(([k, v]) => {
      if (k === 'style') return ` style=${styleObj(v)}`;
      if (/^on/.test(k)) { warn(`inline handler ${k} dropped: wire it as a React prop`); return ''; }
      const key = JSX_ATTR[k] || (/^(data|aria)-/.test(k) ? k : k.includes('-') ? camel(k) : k);
      if (BOOL.has(k) && v === '') return ` ${key}`;
      return ` ${key}=${JSON.stringify(v)}`;
    }).join('');
    if (VOID.has(n.tag) || !n.children.length) { out.push(`${ind}<${n.tag}${a} />`); return; }
    out.push(`${ind}<${n.tag}${a}>`);
    n.children.forEach((c) => emit(c, d + 1));
    out.push(`${ind}</${n.tag}>`);
  }
  (body.children || []).forEach((c) => emit(c, 3));
  const css = cssText.trim();
  writeFileSync(join(outDir, `${name}.jsx`), `import './${name}.css';\n\nexport default function ${name}() {\n  return (\n    <>\n${out.join('\n')}\n    </>\n  );\n}\n`);
  writeFileSync(join(outDir, `${name}.css`), css + '\n');
  report(['React (web). Replace static copy with props/state; keep the CSS variables as the single source of truth (Tailwind: see `translate.mjs tokens`).']);
  done([`${name}.jsx`, `${name}.css`]);
}

// ======================================================================
// React Native
// ======================================================================
function rnTarget() {
  const styles = {};
  const RN_SKIP = /^(cursor|transition|animation|box-sizing|user-select|outline|appearance|-webkit-|backdrop-filter|filter|pointer-events|content|will-change|isolation|color-scheme|list-style|text-rendering|vertical-align)/;
  const num = (v) => { const m = String(v).match(/^(-?[\d.]+)px$/); return m ? parseFloat(m[1]) : /^-?[\d.]+$/.test(v) ? parseFloat(v) : v; };
  const box = (prop, v, o) => {
    const p = v.split(/\s+/).map(num);
    const [t, r = t, b = t, l = r] = p;
    const P = camel(prop);
    Object.assign(o, { [`${P}Top`]: t, [`${P}Right`]: r, [`${P}Bottom`]: b, [`${P}Left`]: l });
  };
  function rnDecls(decls) {
    const o = {};
    let flex = false, dir = false;
    for (const d of decls) {
      if (d.prop.startsWith('--') || RN_SKIP.test(d.prop)) continue;
      let v = px(evalMath(lit(d.value))).trim();
      if (/gradient/.test(v)) { warn('gradients need react-native-linear-gradient; first color stop used'); v = firstColorOf(v) || v; if (d.prop.startsWith('background')) { o.backgroundColor = v; continue; } }
      switch (d.prop) {
        case 'display': if (/flex|grid/.test(v)) { flex = true; if (/grid/.test(v)) { o.flexDirection = 'row'; o.flexWrap = 'wrap'; dir = true; warn('display:grid emulated with row + wrap'); } } else if (v === 'none') o.display = 'none'; continue;
        case 'flex-direction': o.flexDirection = v; dir = true; continue;
        case 'margin': case 'padding': box(d.prop, v, o); continue;
        case 'inset': { const [t, r = t, b = t, l = r] = v.split(/\s+/).map(num); Object.assign(o, { top: t, right: r, bottom: b, left: l }); continue; }
        case 'border': case 'border-top': case 'border-bottom': case 'border-left': case 'border-right': {
          const w = num((v.match(/\d[\d.]*px|\b0\b/) || ['1px'])[0]);
          const c = firstColorOf(v);
          const P = camel(d.prop);
          o[`${P}Width`] = w; if (c) o[`${P}Color`] = c;
          continue;
        }
        case 'background': o.backgroundColor = v; continue;
        case 'box-shadow': {
          const c = firstColorOf(v); const n = v.replace(COLOR_RE, '').trim().split(/\s+/).map(num);
          if (v !== 'none' && c) Object.assign(o, { shadowColor: c, shadowOffset: { width: n[0] || 0, height: n[1] || 0 }, shadowRadius: n[2] || 0, shadowOpacity: 1, elevation: Math.round((n[2] || 0) / 2) });
          continue;
        }
        case 'font-family': o.fontFamily = lit(v).split(',')[0].replace(/["']/g, '').trim(); warn(`font "${o.fontFamily}" must be loaded (expo-font / react-native.config.js)`); continue;
        case 'font-weight': o.fontWeight = String(v); continue;
        case 'position': o.position = v === 'relative' || v === 'static' ? 'relative' : 'absolute'; continue;
        case 'transform': {
          const t = [];
          for (const m of v.matchAll(/(translate[XY]?|scale|rotate)\(([^)]*)\)/g)) {
            if (m[1] === 'translate') { const [x, y = '0'] = m[2].split(/[\s,]+/); t.push({ translateX: num(x) }, { translateY: num(y) }); } else t.push({ [m[1]]: m[1] === 'rotate' ? m[2] : num(m[2]) });
          }
          if (t.length) o.transform = t; continue;
        }
        case 'line-height': if (/^[\d.]+$/.test(v)) { warn('unitless line-height converted assuming font-size 16'); o.lineHeight = parseFloat(v) * 16; } else o.lineHeight = num(v); continue;
        case 'text-shadow': case 'clip-path': case 'mix-blend-mode': case 'z-index':
          if (d.prop === 'z-index') o.zIndex = num(v); else warn(`${d.prop} not supported in React Native`); continue;
      }
      if (/currentcolor|\bfr\b|content|env\(/.test(v)) continue;
      if (/^(width|height|min-|max-)/.test(d.prop) && /v[hw]$/.test(v)) { warn('vh/vw: use useWindowDimensions()'); continue; }
      o[camel(d.prop)] = num(v);
    }
    if (flex && !dir) o.flexDirection = 'row';
    return o;
  }
  for (const r of rules) {
    if (r.type !== 'rule' || r.media) continue;
    for (const sel of r.selector.split(',')) {
      const m = sel.trim().match(/^\.([\w-]+)$/);
      if (!m) { if (!/^(:root|html|body|\*)$/.test(sel.trim())) warn(`selector "${sel.trim()}" skipped: React Native styles are per element (single class only)`); continue; }
      Object.assign((styles[camel(m[1])] ||= {}), rnDecls(r.decls));
    }
  }
  const used = new Set(['View', 'Text']);
  const out = [];
  const sty = (n, extra) => {
    const c = classes(n).map(camel).filter((k) => styles[k]).map((k) => `s.${k}`);
    if (n.attrs?.style) warn('inline style attributes moved out: check the result');
    if (extra) c.push(extra);
    return c.length ? ` style={${c.length === 1 ? c[0] : `[${c.join(', ')}]`}}` : '';
  };
  const txt = (s) => s.replace(/[{}<>]/g, (c) => `{'${c}'}`);
  function emit(n, d, chain) {
    const ind = '  '.repeat(d);
    if (n.type === 'text') { const t = collapse(n.text); if (t) out.push(`${ind}<Text>${txt(t)}</Text>`); return; }
    if (SKIP.has(n.tag) || n.tag === 'br') return;
    const next = [...chain, n];
    if (n.tag === 'img') { used.add('Image'); out.push(`${ind}<Image source={{ uri: ${JSON.stringify(n.attrs.src || '')} }}${sty(n)} accessibilityLabel=${JSON.stringify(n.attrs.alt || '')} />`); return; }
    if (n.tag === 'svg') { warn('inline <svg>: use react-native-svg (copy the markup) or an icon font'); out.push(`${ind}{/* svg: react-native-svg */}`); return; }
    if (n.tag === 'input' || n.tag === 'textarea') {
      const t = (n.attrs.type || '').toLowerCase();
      if (t === 'checkbox' || t === 'range') { used.add('Switch'); out.push(`${ind}<Switch />`); return; }
      used.add('TextInput'); out.push(`${ind}<TextInput${sty(n)} placeholder=${JSON.stringify(n.attrs.placeholder || '')}${n.tag === 'textarea' ? ' multiline' : ''} />`); return;
    }
    if (n.tag === 'button' || (n.tag === 'a' && classes(n).some((c) => /btn|button|cta/.test(c)))) {
      used.add('Pressable');
      out.push(`${ind}<Pressable${sty(n)} onPress={() => {}} accessibilityRole="button">`);
      if (isTextOnly(n)) out.push(`${ind}  <Text>${txt(applyTransform(collapse(textContent(n)), inheritedTransform(next)))}</Text>`); else n.children.forEach((c) => emit(c, d + 1, next));
      out.push(`${ind}</Pressable>`); return;
    }
    if (isTextOnly(n) && hasText(n)) { out.push(`${ind}<Text${sty(n)}>${txt(applyTransform(collapse(textContent(n)), inheritedTransform(next)))}</Text>`); return; }
    const C = flag(n, 'scroll') ? (used.add('ScrollView'), 'ScrollView') : 'View';
    if (!n.children.length) { out.push(`${ind}<${C}${sty(n)} />`); return; }
    out.push(`${ind}<${C}${sty(n)}>`); n.children.forEach((c) => emit(c, d + 1, next)); out.push(`${ind}</${C}>`);
  }
  (body.children || []).forEach((c) => emit(c, 3, []));
  const sheet = JSON.stringify(styles, null, 2).replace(/"([A-Za-z_]\w*)":/g, '$1:');
  writeFileSync(join(outDir, `${name}.tsx`), `import { ${[...used].sort().join(', ')}, StyleSheet } from 'react-native';\n\nexport default function ${name}() {\n  return (\n    <View style={s.root}>\n${out.join('\n')}\n    </View>\n  );\n}\n\nconst s = StyleSheet.create({\n  root: { flex: 1 },\n${sheet.slice(2, -2)}\n});\n`);
  report(['React Native. Tokens are inlined as literals; for theming generate `translate.mjs tokens` and replace literals with the `.tokens.ts` constants.', 'Hover states do not exist on touch: keep pressed/disabled.']);
  done([`${name}.tsx`]);
}

// ======================================================================
// Plain HTML (standalone page, no build step)
// ======================================================================
function htmlTarget() {
  const markup = isFullDoc(src) ? (src.match(/<body[^>]*>([\s\S]*)<\/body>/i) || [, src])[1] : src;
  const clean = markup.replace(/<style[\s\S]*?<\/style>/gi, '').replace(/<link[^>]*stylesheet[^>]*>/gi, '').trim();
  const fonts = [];
  walk(doc, (n) => { if (n.type === 'el' && n.tag === 'link' && /^(https?:)?\/\//.test(n.attrs.href || '')) fonts.push(`  <link rel="stylesheet" href="${n.attrs.href}">`); });
  if (/\/p\//.test(clean + cssText)) warn('"/p/..." studio paths must be rewritten to real project paths');
  const page = `<!doctype html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover">
  <title>${name}</title>
${fonts.join('\n')}
  <style>
*, *::before, *::after { box-sizing: border-box; }
html, body { margin: 0; }
img, svg { display: block; max-width: 100%; }
button, input, select, textarea { font: inherit; color: inherit; }

${cssText.trim()}
  </style>
</head>
<body>
${clean}
</body>
</html>
`;
  writeFileSync(join(outDir, `${name}.html`), page);
  report(['Standalone HTML: open it directly, or move the <style> into a .css file of the site.']);
  done([`${name}.html`]);
}

function isFullDoc(s) {
  return /^\s*(<!doctype|<html)/i.test(s);
}

({ uitk: uitkTarget, react: reactTarget, rn: rnTarget, html: htmlTarget, tokens: tokensTarget })[target]();

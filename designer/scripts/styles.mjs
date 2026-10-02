#!/usr/bin/env node
// Global style + reference library, shared by every agent/host that has designer installed.
// Store: $DESIGNER_HOME or ~/.designer   (each installed skill also gets a `styles` link to it)
//
//   node styles.mjs home                                   store paths
//   node styles.mjs list                                   saved styles (JSON)
//   node styles.mjs show <name>                            paths + meta of one style
//   node styles.mjs match "<full /designer arguments>"     which style the request asks for (JSON)
//   node styles.mjs init <name> [--mode m] [--alias a,b] [--source <dir>|--described] [--force]
//                                                          create/update the style folder from the template
//   node styles.mjs remove <name>                          delete a style (only when the user asks)
//   node styles.mjs lib list | lib path <title>            reverse-engineering notes per game/app/site
import { existsSync, mkdirSync, readdirSync, readFileSync, writeFileSync, rmSync, statSync } from 'node:fs';
import { join, resolve, dirname } from 'node:path';
import { homedir } from 'node:os';
import { fileURLToPath } from 'node:url';

const SKILL = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const HOME = resolve(process.env.DESIGNER_HOME || join(homedir(), '.designer'));
const STYLES = join(HOME, 'styles');
const LIB = join(HOME, 'library');
const out = (o) => console.log(JSON.stringify(o, null, 2));
const slug = (s) => String(s).toLowerCase().normalize('NFKD').replace(/[\u0300-\u036f]/g, '').replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '');
const readJson = (p) => { try { return JSON.parse(readFileSync(p, 'utf8')); } catch { return null; } };

function all() {
  if (!existsSync(STYLES)) return [];
  return readdirSync(STYLES).filter((d) => statSync(join(STYLES, d)).isDirectory() && !d.startsWith('_')).map((d) => {
    const dir = join(STYLES, d);
    const meta = readJson(join(dir, 'meta.json')) || {};
    return { slug: d, name: meta.name || d, aliases: meta.aliases || [], mode: meta.mode || null, summary: meta.summary || '', source: meta.source || null, updated: meta.updated || null, dir, style_md: join(dir, 'STYLE.md'), tokens_css: join(dir, 'tokens.css') };
  });
}

function lookup(word) {
  const w = slug(word.replace(/^[@#]/, ''));
  if (!w) return null;
  return all().find((s) => s.slug === w || slug(s.name) === w || s.aliases.some((a) => slug(a) === w)) || null;
}

function lev(a, b) {
  const d = Array.from({ length: a.length + 1 }, (_, i) => [i, ...Array(b.length).fill(0)]);
  for (let j = 1; j <= b.length; j++) d[0][j] = j;
  for (let i = 1; i <= a.length; i++) for (let j = 1; j <= b.length; j++) d[i][j] = Math.min(d[i - 1][j] + 1, d[i][j - 1] + 1, d[i - 1][j - 1] + (a[i - 1] === b[j - 1] ? 0 : 1));
  return d[a.length][b.length];
}

function match(text) {
  const raw = (text || '').trim();
  const styles = all();
  const res = { style: null, prompt: raw, matched_by: null, candidates: [], suggestions: [], available: styles.map((s) => s.slug) };
  if (!raw || !styles.length) return res;
  const [first, ...rest] = raw.split(/\s+/);
  const hit = lookup(first.replace(/[:,;.]+$/, ''));
  if (hit) return { ...res, style: hit, prompt: rest.join(' '), matched_by: 'first-word' };

  // explicit mentions anywhere in the prompt: "stile kfdev", "style of kfdev", "come kfdev", or the bare name
  const low = raw.toLowerCase();
  const found = [];
  for (const s of styles) {
    for (const n of [s.slug, s.name, ...s.aliases]) {
      const esc = n.toLowerCase().replace(/[.*+?^${}()|[\]\\]/g, '\\$&').replace(/[-\s]+/g, '[-\\s]+');
      const strong = new RegExp(`(stile|style|styled|theme|tema|look|like|come|alla|in the style of|nello stile( di)?|con lo stile( di)?|usa|use)\\s+["'\`]?${esc}\\b`, 'i');
      const bare = new RegExp(`(^|[^\\w-])${esc}($|[^\\w-])`, 'i');
      if (strong.test(low)) { found.push({ s, strength: 2 }); break; }
      if (n.length >= 3 && bare.test(low)) { found.push({ s, strength: 1 }); break; }
    }
  }
  if (found.length) {
    const best = Math.max(...found.map((f) => f.strength));
    const top = found.filter((f) => f.strength === best);
    if (top.length === 1) return { ...res, style: top[0].s, matched_by: best === 2 ? 'mention' : 'bare-name' };
    return { ...res, matched_by: 'ambiguous', candidates: top.map((f) => f.s.slug) };
  }
  // typo help for a slug-looking first word
  const w = slug(first);
  if (/^[a-z0-9-]{3,32}$/.test(w)) res.suggestions = styles.filter((s) => lev(w, s.slug) <= 2).map((s) => s.slug);
  return res;
}

function init(name, flags) {
  const s = slug(name);
  if (!s) { console.error('invalid style name'); process.exit(1); }
  const dir = join(STYLES, s);
  const exists = existsSync(join(dir, 'meta.json'));
  mkdirSync(join(dir, 'screenshots'), { recursive: true });
  const now = new Date().toISOString().slice(0, 10);
  const prev = readJson(join(dir, 'meta.json')) || {};
  const meta = {
    name: prev.name || name,
    slug: s,
    aliases: flags.alias ? flags.alias.split(',').map((a) => a.trim()).filter(Boolean) : prev.aliases || [],
    mode: flags.mode || prev.mode || null,
    summary: prev.summary || '',
    source: flags.described ? { kind: 'description' } : flags.source ? { kind: 'project', path: resolve(flags.source) } : prev.source || null,
    created: prev.created || now,
    updated: now,
  };
  writeFileSync(join(dir, 'meta.json'), JSON.stringify(meta, null, 2) + '\n');
  const tpl = join(SKILL, 'assets', 'style-template.md');
  if ((!exists || flags.force) && existsSync(tpl) && (!existsSync(join(dir, 'STYLE.md')) || flags.force)) {
    writeFileSync(join(dir, 'STYLE.md'), readFileSync(tpl, 'utf8').replaceAll('{{name}}', meta.name).replaceAll('{{slug}}', s).replaceAll('{{date}}', now));
  }
  out({ created: !exists, updated: exists, slug: s, dir, style_md: join(dir, 'STYLE.md'), tokens_css: join(dir, 'tokens.css'), meta: join(dir, 'meta.json'), screenshots: join(dir, 'screenshots'), use: `/designer ${s} <request>` });
}

const [cmd, ...args] = process.argv.slice(2);
const flags = {};
const pos = [];
for (let i = 0; i < args.length; i++) {
  if (args[i].startsWith('--')) { const k = args[i].slice(2); flags[k] = args[i + 1] && !args[i + 1].startsWith('--') ? args[++i] : true; } else pos.push(args[i]);
}

switch (cmd) {
  case 'home': out({ home: HOME, styles: STYLES, library: LIB }); break;
  case 'list': out(all().map(({ dir, style_md, tokens_css, ...r }) => ({ ...r, dir }))); break;
  case 'show': {
    const s = lookup(pos.join(' '));
    if (!s) { out({ error: 'style-not-found', available: all().map((x) => x.slug) }); process.exit(3); }
    out({ ...s, has_tokens: existsSync(s.tokens_css), screenshots: existsSync(join(s.dir, 'screenshots')) ? readdirSync(join(s.dir, 'screenshots')).map((f) => join(s.dir, 'screenshots', f)) : [] });
    break;
  }
  case 'match': out(match(pos.join(' '))); break;
  case 'init': if (!pos[0]) { console.error('usage: init <name>'); process.exit(1); } init(pos.join(' '), flags); break;
  case 'remove': {
    const s = lookup(pos.join(' '));
    if (!s) { out({ error: 'style-not-found' }); process.exit(3); }
    rmSync(s.dir, { recursive: true, force: true });
    out({ removed: s.slug });
    break;
  }
  case 'lib': {
    mkdirSync(LIB, { recursive: true });
    if (pos[0] === 'path' && pos[1]) {
      const p = join(LIB, `${slug(pos.slice(1).join(' '))}.md`);
      out({ path: p, exists: existsSync(p) });
    } else out(readdirSync(LIB).filter((f) => f.endsWith('.md')).map((f) => ({ title: f.slice(0, -3), path: join(LIB, f) })));
    break;
  }
  default:
    console.error('usage: styles.mjs <home|list|show|match|init|remove|lib> ...');
    process.exit(1);
}

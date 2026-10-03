#!/usr/bin/env node
// Proxy to the standalone Variant Studio (https://github.com/Fonlogen/variant-studio).
// It does not contain the studio: it finds it and forwards every argument, so the studio updates on its own.
//
//   node studio.mjs <studio command> ...   forward (start, new, wait, decision, ...)
//   node studio.mjs where                  print JSON { path, script, skill, version, source }
//
// Search order (first folder with scripts/studio.mjs wins):
//   1. env VARIANT_STUDIO_HOME
//   2. config.json -> variantStudio.path (absolute or relative to the skill)
//   3. sibling folder: <skill>/../variant-studio (side-by-side install or repo submodule)
//   4. installed global skills (~/.claude/skills, ~/.agents/skills, ~/.kilo/skills, ...)
//   5. project skills under the cwd (.claude/skills, .agents/skills, ...)
import { existsSync, readFileSync } from 'node:fs';
import { dirname, join, resolve, isAbsolute } from 'node:path';
import { homedir } from 'node:os';
import { fileURLToPath } from 'node:url';
import { spawnSync } from 'node:child_process';

const SKILL = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const NAME = 'variant-studio';
const HOST_DIRS = [
  '.claude/skills', '.agents/skills', '.codex/skills', '.kilo/skills', '.config/kilo/skills',
  '.gemini/antigravity/skills', '.antigravity/skills', '.gemini/skills', '.cline/skills',
  '.copilot/skills', '.config/opencode/skills', '.cursor/skills', '.grok/skills', '.zcode/skills',
];
const PROJECT_DIRS = ['.claude/skills', '.agents/skills', '.kilo/skills', '.agent/skills', '.gemini/skills', '.github/skills', '.opencode/skills'];

function readJson(p) {
  try { return JSON.parse(readFileSync(p, 'utf8')); } catch { return null; }
}

function configPath() {
  const cfg = readJson(join(SKILL, 'config.json')) || readJson(join(SKILL, 'config', 'defaults.json'));
  const p = cfg?.variantStudio?.path;
  if (!p) return null;
  const expanded = p.replace(/^~(?=$|[\\/])/, homedir());
  return isAbsolute(expanded) ? expanded : resolve(SKILL, expanded);
}

function candidates() {
  const out = [];
  if (process.env.VARIANT_STUDIO_HOME) out.push(['env', process.env.VARIANT_STUDIO_HOME]);
  const c = configPath();
  if (c) out.push(['config', c]);
  out.push(['sibling', resolve(SKILL, '..', NAME)]);
  for (const d of HOST_DIRS) out.push(['global', join(homedir(), d, NAME)]);
  for (const d of PROJECT_DIRS) out.push(['project', resolve(process.cwd(), d, NAME)]);
  return out;
}

function find() {
  const tried = [];
  for (const [source, dir] of candidates()) {
    const script = join(dir, 'scripts', 'studio.mjs');
    tried.push(dir);
    if (existsSync(script)) {
      const m = existsSync(join(dir, 'README.md')) && readFileSync(join(dir, 'README.md'), 'utf8').match(/^# Variant Studio\s+([\d.]+)/m);
      return { path: dir, script, skill: join(dir, 'SKILL.md'), version: m ? m[1] : null, source };
    }
  }
  return { tried };
}

const found = find();
const args = process.argv.slice(2);

if (!found.script) {
  console.error(JSON.stringify({
    error: 'variant-studio-not-found',
    hint: 'Install Variant Studio as a standalone skill (designer/install.bat or designer/install.sh, Variant Studio dependency) ' +
      'or: irm https://raw.githubusercontent.com/Fonlogen/variant-studio/main/install.ps1 | iex (Windows) ' +
      '/ curl -fsSL https://raw.githubusercontent.com/Fonlogen/variant-studio/main/install.sh | bash (macOS/Linux) ' +
      '- or set VARIANT_STUDIO_HOME / config.json variantStudio.path. ' +
      'Meanwhile continue without the studio (mock + Playwright).',
    tried: found.tried,
  }, null, 2));
  process.exit(3);
}

if (args[0] === 'where') {
  console.log(JSON.stringify(found, null, 2));
  process.exit(0);
}

const r = spawnSync(process.execPath, [found.script, ...args], { stdio: 'inherit' });
if (r.error) { console.error(r.error.message); process.exit(1); }
process.exit(r.status ?? 1);

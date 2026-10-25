// Shared helpers for the game scripts (game-refs, game-prompt, game-slots): genre profiles, matching, local tools.
import { readFileSync, existsSync, readdirSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { homedir } from 'node:os';
import { fileURLToPath } from 'node:url';
import { spawnSync } from 'node:child_process';

export const SKILL = dirname(dirname(dirname(fileURLToPath(import.meta.url))));
export const DATA = JSON.parse(readFileSync(join(SKILL, 'data', 'game-ui', 'genres.json'), 'utf8'));
export const GENRES = DATA.genres;
export const SCREENS = DATA.screens;

export function config() {
  for (const f of ['config.json', join('config', 'defaults.json')]) {
    try { return JSON.parse(readFileSync(join(SKILL, f), 'utf8')); } catch { /* next */ }
  }
  return {};
}

// Italian briefs: the common genre words, mapped to the English keywords of the profiles
const IT = [[/post[- ]?apocalittic\w*/g, 'post-apocalyptic'], [/sopravvivenza/g, 'survival'], [/gestional\w*/g, 'management tycoon'], [/picchiaduro/g, 'fighting'],
  [/\bcorse\b|automobilistic\w*/g, 'racing'], [/\bcalcio\b/g, 'football'], [/gioco di carte|\bcarte\b/g, 'card game'], [/strategi\w*/g, 'strategy'], [/rompicapo/g, 'puzzle'],
  [/avventura grafica/g, 'point and click'], [/\bavventura\b/g, 'adventure'], [/piattaforme/g, 'platformer'], [/\britmo\b|musical\w*/g, 'rhythm'], [/narrativ\w*|romanzo visivo/g, 'narrative visual novel'],
  [/sparatutto/g, 'shooter fps'], [/\borrore\b/g, 'horror'], [/cooperativ\w*/g, 'co-op'], [/mondo aperto/g, 'open world'], [/simulazione/g, 'simulator'],
  [/fattoria|agricol\w*/g, 'farming cozy'], [/costruzione di citt\w*|citt\w* da costruire/g, 'city builder'], [/gioco di ruolo|\bgdr\b/g, 'rpg'], [/tattic\w*/g, 'tactical']];
const it2en = (s) => IT.reduce((acc, [re, en]) => acc.replace(re, (m) => `${m} ${en}`), s);
// "S.T.A.L.K.E.R." -> "stalker"; accents dropped after the Italian words are mapped
const norm = (s) => it2en(String(s || '').toLowerCase().replace(/\.(?=\w)/g, '')).normalize('NFKD').replace(/[̀-ͯ]/g, '');
// rank genres for a free-text brief: keyword hits (phrases count double), Steam tags, reference titles
export function matchGenres(brief, n = 3) {
  const b = ` ${norm(brief).replace(/[^a-z0-9]+/g, ' ')} `;
  const scored = GENRES.map((g) => {
    let s = 0;
    const why = [];
    for (const k of g.keywords) { const kk = ` ${norm(k).replace(/[^a-z0-9]+/g, ' ').trim()} `; if (b.includes(kk)) { s += (kk.trim().includes(' ') ? 2 : 1) * (k === g.keywords[0] ? 1.5 : 1); why.push(k); } }
    for (const t of g.steam) { const tt = ` ${norm(t).replace(/[^a-z0-9]+/g, ' ').trim()} `; if (b.includes(tt) && !why.includes(t.toLowerCase())) { s += 0.5; why.push(t); } }
    for (const r of g.refs) { const rr = norm(r).replace(/[^a-z0-9]+/g, ' ').trim().split(' ').slice(0, 2).join(' '); if (rr.length > 3 && b.includes(` ${rr}`)) { s += 1.5; why.push(r); } }
    return { id: g.id, label: g.label, score: s, why: [...new Set(why)] };
  }).filter((x) => x.score > 0).sort((a, b2) => b2.score - a.score);
  return scored.slice(0, n);
}
export const genre = (id) => GENRES.find((g) => g.id === id) || null;

// ------------------------------------------------------------ local tools the skill can use when present
const H = homedir();
// GamesTracker (Kekko16004/GamesTracker): SQLite of recent Steam / itch releases with quality scores
export function gamesTrackerDb() {
  const cfg = config();
  const cands = [process.env.GAMESTRACKER_DB, cfg.gameData?.gamesTracker && join(cfg.gameData.gamesTracker, 'data', 'gamestracker.db'), cfg.gameData?.gamesTracker,
    join(H, 'Desktop', 'Dev Things', 'GamesTracker', 'data', 'gamestracker.db'), join(H, 'Desktop', 'GamesTracker', 'data', 'gamestracker.db'),
    join(H, 'Documents', 'GamesTracker', 'data', 'gamestracker.db'), join(H, 'GamesTracker', 'data', 'gamestracker.db')];
  return cands.find((p) => p && /\.db$/i.test(p) && existsSync(p)) || null;
}
// game-launch-strategist (Kekko16004/GameLaunchAnalyzer): installed skill with the Steam research scripts
export function launchStrategist() {
  for (const p of [join(H, '.agents', 'skills', 'game-launch-strategist'), join(H, '.claude', 'skills', 'game-launch-strategist')]) if (existsSync(join(p, 'SKILL.md'))) return p;
  return null;
}

// read-only SQL: node:sqlite (Node 22.5+), else python's sqlite3. Returns rows as objects.
export function sqlite(db, sql, params = []) {
  try {
    const emit = process.emitWarning; process.emitWarning = () => {};
    const { DatabaseSync } = process.getBuiltinModule ? process.getBuiltinModule('node:sqlite') : {};
    process.emitWarning = emit;
    if (DatabaseSync) { const d = new DatabaseSync(db, { readOnly: true }); try { return d.prepare(sql).all(...params); } finally { d.close(); } }
  } catch { /* fall back to python */ }
  const code = 'import sys, json, sqlite3\nc = sqlite3.connect("file:" + sys.argv[1] + "?mode=ro", uri=True)\nc.row_factory = sqlite3.Row\nprint(json.dumps([dict(r) for r in c.execute(sys.argv[2], json.loads(sys.argv[3]))]))';
  for (const py of ['python', 'python3', 'py']) {
    const r = spawnSync(py, ['-I', '-c', code, db, sql, JSON.stringify(params)], { encoding: 'utf8' });
    if (r.status === 0) { try { return JSON.parse(r.stdout); } catch { /* next */ } }
  }
  return null;
}

// comparables chosen by game-launch-strategist in this project (launch/comps.csv)
export function projectComps(project) {
  const f = join(project, 'launch', 'comps.csv');
  if (!existsSync(f)) return [];
  const rows = parseCsv(readFileSync(f, 'utf8'));
  if (!rows.length) return [];
  const head = rows[0].map((h) => h.trim().toLowerCase());
  const ia = head.findIndex((h) => ['appid', 'steam_appid', 'app_id', 'id'].includes(h));
  const it = head.findIndex((h) => ['name', 'title', 'game'].includes(h));
  return rows.slice(1).map((r) => ({ appid: ia >= 0 ? Number(r[ia]) || null : null, title: it >= 0 ? r[it] : null })).filter((x) => x.appid || x.title);
}
function parseCsv(text) {
  const out = []; let row = [], cell = '', q = false;
  for (let i = 0; i < text.length; i++) {
    const ch = text[i];
    if (q) { if (ch === '"' && text[i + 1] === '"') { cell += '"'; i++; } else if (ch === '"') q = false; else cell += ch; continue; }
    if (ch === '"') q = true; else if (ch === ',') { row.push(cell); cell = ''; } else if (ch === '\n' || ch === '\r') { if (ch === '\r' && text[i + 1] === '\n') i++; row.push(cell); if (row.some((c) => c !== '')) out.push(row); row = []; cell = ''; } else cell += ch;
  }
  row.push(cell); if (row.some((c) => c !== '')) out.push(row);
  return out;
}

export function args(argv) {
  const pos = [], o = {};
  for (let i = 0; i < argv.length; i++) {
    const a = argv[i];
    if (a.startsWith('--')) { const k = a.slice(2); if (argv[i + 1] !== undefined && !argv[i + 1].startsWith('--')) o[k] = argv[++i]; else o[k] = true; }
    else if (a === '-n') o.n = argv[++i];
    else pos.push(a);
  }
  return { pos, o };
}
export const list = (v) => (typeof v === 'string' ? v.split(/\s*,\s*/).filter(Boolean) : []);
export const ls = (d) => { try { return readdirSync(d); } catch { return []; } };

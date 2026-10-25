#!/usr/bin/env node
// skillkit — installer engine shared by GameDeveloperSkill and DesignerSkill. Node >= 18, zero dependencies.
// The repo-specific part is <repo>/skillkit.json (+ optional installer/hooks.mjs). See installer/README.md.
//
//   node installer/install.mjs [install] [--yes] [--hosts claude,codex] [--only a,b] [--skip a,b] [--dev] [--lang it|en]
//   node installer/install.mjs update   [--no-pull]           pull this repo, refresh every dependency to its latest, reinstall with saved choices
//   node installer/install.mjs doctor   [--fix]               check canonical copy, links, duplicates, commands, MCP
//   node installer/install.mjs uninstall                      remove what the receipt says this installer created
//   common: --dry-run  --json  --verbose  --no-color (NO_COLOR)  --reuse (saved choices, no questions)
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";
import { spawnSync } from "node:child_process";
import * as ui from "./lib/ui.mjs";
import { setAccent, isTTY, c, g, truncate, cols } from "./lib/term.mjs";
import { HOME, STATE, exists, isLink, linkTarget, link, unlinkOnly, mirror, backup, skillName, readJson, writeJson, mkdirp, tilde, samePath, sameReal, removeTree, isWin } from "./lib/fsx.mjs";
import { run, runSync, which, version, cmp, syncRepo, pullSelf, head, repoDirFor } from "./lib/proc.mjs";
import { HOSTS, CANON, ALWAYS_CLEAN, NATIVE, detectHosts } from "./lib/hosts.mjs";
import { upsertJson, upsertToml, upsertClaude, removeJson, removeToml, removeClaude } from "./lib/mcp.mjs";

export const ENGINE_VERSION = "1.1.0";
const HERE = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(HERE, "..");

// ---------------------------------------------------------------- args
const argv = process.argv.slice(2);
const flags = {};
const positional = [];
for (let i = 0; i < argv.length; i++) {
  const a = argv[i];
  if (!a.startsWith("-")) { positional.push(a); continue; }
  const [k, v] = a.replace(/^-+/, "").split("=");
  const key = k.toLowerCase();
  if (v !== undefined) flags[key] = v;
  else if (["hosts", "only", "skip", "skipmodules", "skip-sources", "skipsources", "lang", "from"].includes(key) && argv[i + 1] && !argv[i + 1].startsWith("-")) flags[key] = argv[++i];
  else flags[key] = true;
}
// PowerShell-style aliases kept from the old installers (install.bat -Quiet / -All / -Hosts / -SkipModules)
if (flags.quiet || flags.all) flags.yes = true;
if (flags.skipmodules) flags.skip = flags.skipmodules;
if (flags.skipsources) flags["skip-sources"] = flags.skipsources;
if (flags.noself) flags["no-pull"] = true;
const cmd = (positional[0] || "install").toLowerCase();
const list = (v) => (typeof v === "string" ? v.split(/[,\s]+/).map((s) => s.trim()).filter(Boolean) : []);
if (flags["no-color"]) process.env.NO_COLOR = "1";

// ---------------------------------------------------------------- manifest + language
const manifestPath = path.join(ROOT, "skillkit.json");
if (!exists(manifestPath)) { console.error(`skillkit.json not found in ${ROOT}`); process.exit(1); }
const M = readJson(manifestPath);
if (!M) { console.error("skillkit.json is not valid JSON"); process.exit(1); }
setAccent(M.brand?.accent);
ui.configure({ json: Boolean(flags.json) });

const sysLocale = (() => { try { return Intl.DateTimeFormat().resolvedOptions().locale || ""; } catch { return ""; } })();
const RECEIPT = path.join(STATE, `${M.id}.json`);
const prev = readJson(RECEIPT);
const lang = (flags.lang || prev?.lang || ((process.env.LANG || process.env.LC_ALL || sysLocale).toLowerCase().startsWith("it") ? "it" : "en")).slice(0, 2);
const T = (v) => (v && typeof v === "object" ? v[lang] || v.en || Object.values(v)[0] : v ?? "");
const S = {
  it: {
    detect: "Rilevamento", hosts: "Host", tools: "Strumenti", install: "Installazione", choose: "Scelte", done: "Fatto",
    pickHosts: "Dove la installo?", pickHostsHelp: "spazio seleziona · a tutti · ⏎ conferma",
    pickComp: "Cosa installo?", pickCompHelp: "spazio seleziona · a tutti · n nessuno · ⏎ conferma",
    reuse: "Uso le scelte dell'ultima installazione?", notFound: "non trovato", missing: "manca", optional: "opzionale",
    native: "legge già ~/.agents/skills", link: "collegamento", required: "richiesto", needs: "serve",
    installTool: (n) => `Installo ${n} adesso?`, abort: "Installazione annullata.", cancelled: "Annullato.",
    skill: "skill", links: "collegamenti", cleaned: "duplicati", commands: "comandi", mcp: "MCP", deps: "dipendenze",
    restart: "Riavvia gli agenti aperti per caricare le modifiche.", backupAt: "Backup delle copie rimosse", nothing: "niente da fare",
    upToDate: "già aggiornato", updated: "aggiornato", summary: "Riepilogo", next: "Poi", dryRun: "prova a secco: nessuna modifica scritta",
    doctor: "Controllo", healthy: "tutto a posto", problems: (n) => `${n} problemi`, fixHint: "Ripara con:", uninstall: "Disinstallazione",
    removed: "rimosso", kept: "lasciato (non è nostro)", pull: "Repo", relaunch: "nuova versione dell'installer: riparto",
    ownedBy: (o) => `installata da ${o}`, receipt: "ricevuta", dev: "modalità sviluppo: le skill puntano ai sorgenti del repo",
    keyMissing: (k) => `${k} non impostata`, keySet: (k) => `${k} impostata`, mcpKept: "già configurato a mano: lasciato com'è",
    dupes: "Duplicati", stale: "copia vecchia", links2: "link", noHosts: "Nessun host selezionato.",
  },
  en: {
    detect: "Detection", hosts: "Hosts", tools: "Tools", install: "Install", choose: "Choices", done: "Done",
    pickHosts: "Where should it go?", pickHostsHelp: "space toggles · a all · enter confirms",
    pickComp: "What should I install?", pickCompHelp: "space toggles · a all · n none · enter confirms",
    reuse: "Reuse the choices of the last install?", notFound: "not found", missing: "missing", optional: "optional",
    native: "reads ~/.agents/skills already", link: "link", required: "required", needs: "needs",
    installTool: (n) => `Install ${n} now?`, abort: "Install aborted.", cancelled: "Cancelled.",
    skill: "skill", links: "links", cleaned: "duplicates", commands: "commands", mcp: "MCP", deps: "dependencies",
    restart: "Restart open agents to load the changes.", backupAt: "Backup of removed copies", nothing: "nothing to do",
    upToDate: "up to date", updated: "updated", summary: "Summary", next: "Next", dryRun: "dry run: nothing written",
    doctor: "Doctor", healthy: "all good", problems: (n) => `${n} problems`, fixHint: "Repair with:", uninstall: "Uninstall",
    removed: "removed", kept: "kept (not ours)", pull: "Repo", relaunch: "new installer version: restarting",
    ownedBy: (o) => `installed by ${o}`, receipt: "receipt", dev: "dev mode: skills point at the repo sources",
    keyMissing: (k) => `${k} not set`, keySet: (k) => `${k} set`, mcpKept: "configured by hand: left as is",
    dupes: "Duplicates", stale: "stale copy", links2: "links", noHosts: "No host selected.",
  },
}[lang];
const DRY = Boolean(flags["dry-run"]);
const VERBOSE = Boolean(flags.verbose);

// ---------------------------------------------------------------- hooks
let hooks = {};
if (M.hooks && exists(path.join(ROOT, M.hooks))) hooks = await import(pathToFileURL(path.join(ROOT, M.hooks)).href);

// ---------------------------------------------------------------- context shared with hooks
const ctx = {
  M, ROOT, HOME, STATE, CANON, lang, T, S, flags, prev, DRY, isWin,
  ui, c, g, run, runSync, which, version, exists, readJson, writeJson, mkdirp, tilde, link, mirror, backup, syncRepo,
  vars: {}, detected: {}, choices: {}, created: { skills: [], links: [], commands: [], mcp: [], repos: [] }, notes: [], footer: [],
};

// ---------------------------------------------------------------- helpers
const rev = () => (exists(path.join(ROOT, ".git")) ? head(ROOT) : "");
const allReceipts = () => {
  if (!exists(STATE)) return [];
  return fs.readdirSync(STATE).filter((f) => f.endsWith(".json") && !f.startsWith("_")).map((f) => readJson(path.join(STATE, f))).filter((r) => r && r.id);
};
function osKey() { return isWin ? "win" : process.platform === "darwin" ? "mac" : "linux"; }

// expand ${var} (ctx.vars, then env) in strings of an object; returns null if a required var is missing
function expand(obj, { soft = [] } = {}) {
  let missing = null;
  const rep = (s) => s.replace(/\$\{(env:)?([A-Za-z0-9_.]+)\}/g, (m, isEnv, k) => {
    if (isEnv) return m;   // env references are translated per client by mcp.mjs, never resolved into a secret
    const v = k.split(".").reduce((o, p) => (o == null ? o : o[p]), ctx.vars);
    if (v) return String(v);
    if (soft.includes(k)) return m;
    missing = k; return m;
  });
  const walk = (v) => (typeof v === "string" ? rep(v) : Array.isArray(v) ? v.map(walk) : v && typeof v === "object" ? Object.fromEntries(Object.entries(v).map(([k, x]) => [k, walk(x)])) : v);
  const out = walk(obj);
  return missing ? { missing } : out;
}
// Windows: a variable set with setx is not in this process yet; read it from the user hive
function userEnv(k) {
  if (!isWin) return "";
  const r = runSync("reg", ["query", "HKCU\\Environment", "/v", k]);
  const m = new RegExp(`${k}\\s+REG_\\w+\\s+(.*)`).exec(r.out);
  return m ? m[1].trim() : "";
}

// discover skill folders inside a synced repo: "." | "*" | ["path", ...]
function discoverSkills(dir, spec) {
  if (spec === "." || (Array.isArray(spec) && spec.length === 1 && spec[0] === ".")) return skillName(dir) ? [dir] : [];
  if (Array.isArray(spec)) return spec.map((p) => path.join(dir, p)).filter((p) => skillName(p));
  const found = [];
  const walk = (d, depth) => {
    if (depth > 3) return;
    if (depth > 0 && skillName(d)) { found.push(d); return; }
    for (const e of fs.readdirSync(d, { withFileTypes: true })) {
      if (e.isDirectory() && !e.name.startsWith(".") && e.name !== "node_modules") walk(path.join(d, e.name), depth + 1);
    }
  };
  if (spec === "*" && skillName(dir) && !fs.readdirSync(dir).includes("skills")) return [dir];
  walk(dir, 0);
  return found;
}

// ---------------------------------------------------------------- requirements
async function checkRequirements() {
  const rows = [];
  let ok = true;
  for (const r of M.requires || []) {
    const v = version(r.cmds || r.id, r.versionArgs);
    const good = v && (!r.min || v === "ok" || cmp(v, r.min) >= 0);
    ctx.detected[r.id] = v;
    if (good) { ui.row("ok", r.label || r.id, v); continue; }
    const hint = T(r.why) || "";
    if (!r.required) { ui.row("warn", r.label || r.id, v ? `${v} < ${r.min}` : S.missing, hint); rows.push(r); continue; }
    ui.row("fail", r.label || r.id, v ? `${v} < ${r.min}` : S.missing, `${S.required}${hint ? " · " + hint : ""}`);
    rows.push(r); ok = false;
  }
  return { ok, missing: rows };
}
async function offerInstall(missing) {
  for (const r of missing) {
    const cmdline = r.install?.[osKey()];
    if (!cmdline) continue;
    if (!(r.required || r.offer)) { ctx.footer.push(`${c.dim(r.label || r.id)}  ${cmdline}`); continue; }
    const yes = await ui.confirm({ title: S.installTool(r.label || r.id), yes: Boolean(r.required), lang });
    if (!yes) continue;
    const [exe, ...args] = cmdline.split(" ");
    const res = await ui.task(r.label || r.id, async (t) => {
      const out = await run(which(exe) || exe, args, { onLine: t.update, shell: true });
      return out.code === 0 ? { note: cmdline } : { state: "fail", note: out.out.split("\n").pop() };
    });
    if (res.state === "ok") ctx.notes.push(lang === "it" ? `${r.label || r.id} installato: apri un nuovo terminale se non viene trovato.` : `${r.label || r.id} installed: open a new terminal if it is not found.`);
  }
}

// ---------------------------------------------------------------- install
async function install({ reuse = false } = {}) {
  if (!flags["no-header"]) ui.header({ mark: M.brand?.mark, name: M.name, subtitle: T(M.brand?.tagline), version: M.version, rev: rev() });
  if (DRY) ui.warn(S.dryRun);

  // 1 ── detection
  ui.open(S.detect);
  const found = detectHosts();
  const foundIds = Object.keys(found).filter((k) => found[k]);
  ui.row(foundIds.length ? "ok" : "warn", S.hosts, foundIds.map((k) => HOSTS[k].label).join(` ${g.dot} `) || "—",
    Object.keys(HOSTS).filter((k) => !found[k]).length ? c.faint(`${S.notFound}: ${Object.keys(HOSTS).filter((k) => !found[k]).map((k) => HOSTS[k].label).join(", ")}`) : "");
  const req = await checkRequirements();
  if (hooks.detect) await hooks.detect(ctx);
  ui.gap();

  // 2 ── choices
  const interactive = isTTY && !flags.yes && !flags.json;
  let saved = Boolean(prev && (reuse || flags.reuse || (flags.yes && !flags.hosts && !flags.only && !flags.skip)));
  if (!saved && prev && interactive && !flags.hosts && !flags.only) saved = await ui.confirm({ title: S.reuse, yes: true, lang });
  let pickedHosts, pickedComps;
  const comps = (M.components || []).map((cm) => ({ ...cm, avail: componentAvailability(cm) }));
  const recommended = comps.filter((cm) => cm.avail.ok && (cm.recommended === "ifLocal" ? Boolean(lookup(cm.useLocal)) : cm.recommended === "ifInstalled" ? allReceipts().some((x) => x.id === cm.id) : cm.recommended !== false)).map((cm) => cm.id);
  if (saved) {
    pickedHosts = (prev.hosts || []).filter((h) => HOSTS[h]);
    // hosts installed after the last run: on, like a fresh install would do
    for (const h of foundIds) if (prev.seenHosts && !prev.seenHosts.includes(h)) pickedHosts.push(h);
    pickedComps = (prev.components || []).filter((id) => comps.some((cm) => cm.id === id));
    // components added to the manifest after the last install: on when recommended
    for (const cm of comps) if (!(prev.seen || []).includes(cm.id) && recommended.includes(cm.id)) pickedComps.push(cm.id);
    ctx.choices = { ...(prev.options || {}) };
    ui.row("ok", S.choose, lang === "it" ? "scelte dell'ultima installazione" : "choices of the last install", c.faint(tilde(RECEIPT)));
  } else if (!interactive) {
    pickedHosts = flags.hosts ? list(flags.hosts) : foundIds.length ? foundIds : ["claude"];
    pickedComps = flags.only ? list(flags.only) : recommended;
  } else {
    pickedHosts = await ui.multiselect({
      title: S.pickHosts, help: S.pickHostsHelp, lang, min: 1,
      items: Object.entries(HOSTS).map(([id, h]) => ({
        id, label: h.label, on: found[id], disabled: false,
        hint: found[id] ? (h.link ? `${S.link} → ${tilde(h.link[0])}` : S.native) : S.notFound,
      })),
    });
    pickedComps = await ui.multiselect({
      title: S.pickComp, help: S.pickCompHelp, lang,
      items: comps.map((cm) => ({ id: cm.id, label: T(cm.label), hint: T(cm.hint), on: recommended.includes(cm.id), disabled: !cm.avail.ok && cm.avail.hard, badge: cm.avail.badge, badgeTone: cm.avail.tone })),
    });
    if (hooks.questions) await hooks.questions(ctx);
  }
  if (flags.skip) pickedComps = pickedComps.filter((id) => !list(flags.skip).includes(id));
  pickedHosts = [...new Set(pickedHosts)].filter((h) => HOSTS[h]);
  if (!pickedHosts.length) { ui.fail(S.noHosts); ui.close(); return 1; }
  pickedComps = [...new Set(pickedComps)];
  ctx.hosts = pickedHosts; ctx.components = pickedComps;

  if (!req.ok || req.missing.length) await offerInstall(req.missing);
  if (!req.ok && !(await checkRequirementsQuiet())) { ui.fail(S.abort); ui.close(); return 1; }
  ui.close();

  // 3 ── install
  ui.open(S.install);
  const dev = Boolean(flags.dev ?? prev?.dev);
  if (dev) ui.note(S.dev);
  const ownSkills = [];
  const depSkills = [];
  const pendingConfig = [];

  for (const sk of M.skills) {
    const src = path.join(ROOT, sk.path);
    const dest = path.join(CANON, sk.name);
    await ui.task(`${S.skill} ${sk.name}`, async () => {
      if (DRY) { ownSkills.push(sk.name); return { note: tilde(dest) }; }
      mkdirp(CANON);
      if (dev) {
        if (!(isLink(dest) && sameReal(dest, src))) { if (exists(dest) && !isLink(dest)) backup(dest, "dev mode link"); link(src, dest); }
      } else {
        if (isLink(dest) && sameReal(dest, src)) unlinkOnly(dest);
        mirror(src, dest, { ignore: sk.exclude || [], keep: sk.keep || [] });
        // repo files outside the skill folder that the skill references (e.g. tools/, docs/)
        for (const [from, to] of sk.include || []) {
          const f = path.join(ROOT, from);
          if (exists(f)) { mkdirp(path.dirname(path.join(dest, to))); fs.cpSync(f, path.join(dest, to), { recursive: true, force: true, filter: (p) => !/[\\/](__pycache__|results|node_modules)([\\/]|$)/.test(p.slice(f.length)) }); }
        }
      }
      pendingConfig.push([sk, dev ? src : dest]);
      ownSkills.push(sk.name);
      ctx.created.skills.push(sk.name);
      return { note: dev ? `${tilde(dest)} ${g.arrow} ${tilde(src)}` : tilde(dest) };
    });
  }

  // components
  for (const cm of comps.filter((x) => pickedComps.includes(x.id))) {
    if (!cm.avail.ok && cm.avail.hard) { await ui.task(T(cm.label), async () => ({ state: "skip", note: cm.avail.badge })); continue; }
    if (cm.kind === "repo") await installRepo(cm, depSkills);
    else if (cm.kind === "skillkit") await installNested(cm);
  }

  // per-machine config.json, after the components so their paths are known
  if (hooks.config && !DRY) for (const [sk, where] of pendingConfig) await hooks.config(ctx, sk, where);

  // links + duplicate cleanup for every skill this run manages
  const managed = [...ownSkills, ...depSkills];
  await ui.task(S.links, async () => {
    if (DRY) return { note: S.nothing };
    const made = [];
    for (const h of pickedHosts) for (const dir of HOSTS[h].link || []) {
      if (!exists(path.dirname(dir)) && !found[h]) continue;
      for (const name of managed) {
        const p = path.join(dir, name);
        const target = path.join(CANON, name);
        if (isLink(p) && samePath(linkTarget(p), target)) { ctx.created.links.push(p); continue; }
        if (exists(p)) backup(p, `replaced by a link to ${target}`);
        link(target, p);
        ctx.created.links.push(p); made.push(p);
      }
    }
    const via = pickedHosts.filter((h) => HOSTS[h].link).map((h) => HOSTS[h].label);
    const nat = pickedHosts.filter((h) => NATIVE.includes(h)).map((h) => HOSTS[h].label);
    return { note: [via.length && `${via.join(", ")} ${g.arrow} ${lang === "it" ? "canonica" : "canonical"}`, nat.length && `(${nat.join(", ")}: ${S.native})`].filter(Boolean).join("  ") || S.nothing };
  });
  await ui.task(S.cleaned, async () => {
    const legacy = M.skills.flatMap((s) => s.legacy || []);
    const res = cleanDuplicates(managed, legacy);
    return res.length ? { note: `${res.length} ${lang === "it" ? "spostati in" : "moved to"} ${tilde(path.join(STATE, "backup"))}` } : { note: lang === "it" ? "nessuno" : "none" };
  });

  // commands
  if (M.commands?.length || M.retiredCommands?.length) await ui.task(S.commands, async () => installCommands(pickedHosts));

  // MCP servers
  for (const cm of comps.filter((x) => pickedComps.includes(x.id) && x.mcp)) await installMcp(cm, pickedHosts);

  if (hooks.after) await hooks.after(ctx);
  ui.close();

  // 4 ── receipt
  const receipt = {
    id: M.id, name: M.name, version: M.version, engine: ENGINE_VERSION, rev: rev(), repo: ROOT, date: new Date().toISOString(), lang, dev,
    hosts: pickedHosts, seenHosts: foundIds, components: pickedComps, seen: comps.map((x) => x.id), options: ctx.choices,
    created: { ...ctx.created, skills: [...new Set(ctx.created.skills)], links: [...new Set(ctx.created.links)] },
  };
  if (!DRY) writeJson(RECEIPT, receipt);

  // 5 ── summary
  const rows = [
    [S.skill, ownSkills.map((n) => tilde(path.join(CANON, n))).join(", ")],
    [S.deps, depSkills.length ? `${depSkills.length} skill ${g.dot} ${depSkills.join(", ")}` : "—"],
    [S.hosts, pickedHosts.map((h) => HOSTS[h].label).join(", ")],
    [S.links2, String(receipt.created.links.length)],
    [S.mcp, ctx.created.mcp.length ? [...new Set(ctx.created.mcp.map((m) => m.name))].join(", ") : "—"],
  ];
  if (hooks.summary) await hooks.summary(ctx, rows);
  ui.summary(`${S.summary} ${g.dot} ${M.name} ${M.version || ""}`.trim(), rows, [...ctx.notes.map((n) => c.dim(n)), c.dim(S.restart), ...ctx.footer]);
  return 0;
}
async function checkRequirementsQuiet() {
  return (M.requires || []).filter((r) => r.required).every((r) => { const v = version(r.cmds || r.id, r.versionArgs); return v && (!r.min || v === "ok" || cmp(v, r.min) >= 0); });
}

const lookup = (k) => (k ? k.split(".").reduce((o, p) => (o == null ? o : o[p]), ctx.vars) : undefined);

// is a component installable on this machine? { ok, hard, badge, tone }
function componentAvailability(cm) {
  if (cm.needs) for (const n of [].concat(cm.needs)) {
    if (n.startsWith("cmd:") && !which(n.slice(4))) return { ok: false, hard: true, badge: `${S.needs} ${n.slice(4)}`, tone: "warn" };
    if (n.startsWith("var:")) { const k = n.slice(4); const v = k.split(".").reduce((o, p) => (o == null ? o : o[p]), ctx.vars); if (!v) return { ok: false, hard: true, badge: S.notFound, tone: "faint" }; }
  }
  if (cm.env) { const has = process.env[cm.env] || userEnv(cm.env); return { ok: true, badge: has ? "" : S.keyMissing(cm.env), tone: "warn" }; }
  if (cm.kind === "skillkit") {
    const r = allReceipts().find((x) => x.id === cm.id);
    if (r) return { ok: true, badge: S.ownedBy(tilde(r.repo || "")), tone: "faint" };
  }
  return { ok: true };
}

async function installRepo(cm, depSkills) {
  const label = T(cm.label);
  let dir;
  const local = lookup(cm.useLocal);
  const res = await ui.task(label, async (t) => {
    if (DRY) return { note: cm.repo };
    if (local && exists(local)) {
      // the user works on a checkout of this repo: use it as is, never pull over their work
      dir = local; ctx.vars[cm.id] = { dir };
      return { note: `${tilde(local)} ${g.dot} ${lang === "it" ? "checkout locale" : "local checkout"}${head(local) ? " " + head(local) : ""}` };
    }
    const r = await syncRepo(cm.repo, { branch: cm.branch, onLine: t.update });
    if (r.error) return { state: "fail", note: r.error };
    dir = r.dir;
    ctx.created.repos.push(dir);
    ctx.vars[cm.id] = { dir };
    const ver = readJson(path.join(dir, "package.json"))?.version;
    const change = r.before && r.changed ? `${r.before} ${g.arrow} ${r.after}` : r.before ? `${r.after} ${g.dot} ${S.upToDate}` : r.after;
    return { note: [change, ver && `v${ver}`].filter(Boolean).join(` ${g.dot} `) };
  });
  if (res.state === "fail" || DRY) return;
  if (cm.skills) {
    const dirs = discoverSkills(dir, cm.skills);
    for (const d of dirs) {
      const name = skillName(d);
      mirror(d, path.join(CANON, name), { ignore: cm.exclude || [], keep: cm.keep || [] });
      depSkills.push(name);
      ctx.created.skills.push(name);
    }
    if (dirs.length > 1) ui.detail(truncate(`${g.arrow} ${dirs.length > 3 ? dirs.length + " skill: " : ""}${dirs.map((d) => skillName(d)).join(", ")}`, cols() - 6));
  }
  if (cm.postInstall) {
    await ui.task(`${label} ${g.dot} setup`, async (t) => {
      const [exe, ...args] = cm.postInstall;
      const r = await run(which(exe) || exe, args, { cwd: dir, onLine: t.update });
      return r.code === 0 ? {} : { state: "warn", note: r.out.split("\n").filter(Boolean).pop() };
    });
  }
}

// another skillkit product (e.g. game-developer needs designer): reuse its install if present, else fetch it and run its installer
// products can point at each other (game-developer ⇄ game-launch-strategist): SKILLKIT_CHAIN stops the loop
const CHAIN = (process.env.SKILLKIT_CHAIN || "").split(",").filter(Boolean);
async function installNested(cm) {
  const label = T(cm.label);
  const existing = allReceipts().find((x) => x.id === cm.id);
  await ui.task(label, async (t) => {
    if (CHAIN.includes(cm.id)) return { state: "skip", note: lang === "it" ? "già in installazione" : "already being installed" };
    if (DRY) return { note: cm.repo };
    let root = existing?.repo && exists(path.join(existing.repo, "skillkit.json")) ? existing.repo : null;
    if (!root) {
      const r = await syncRepo(cm.repo, { onLine: t.update });
      if (r.error) return { state: "fail", note: r.error };
      root = r.dir;
    } else if (cmd === "update" && exists(path.join(root, ".git"))) {
      await pullSelf(root, t.update);
    }
    const args = [path.join(root, "installer", "install.mjs"), "install", "--yes", "--json", "--hosts", ctx.hosts.join(",")];
    if (existing) args.push("--reuse");
    const r = await run(process.execPath, args, { env: { SKILLKIT_CHAIN: [...CHAIN, M.id].join(",") }, onLine: () => t.update(lang === "it" ? `installer di ${cm.id}` : `${cm.id} installer`) });
    const sub = readJson(path.join(root, "skillkit.json")) || {};
    let note = [sub.version && `v${sub.version}`, head(root), tilde(root)].filter(Boolean).join(` ${g.dot} `);
    try {
      const ev = JSON.parse(r.out.slice(r.out.indexOf("[")));
      const bad = ev.filter((e) => e.type === "task" && (e.state === "fail" || e.state === "warn")).map((e) => `${e.label}: ${e.note}`);
      if (bad.length) note += ` ${g.dot} ${bad.join("; ")}`;
    } catch {}
    return r.code === 0 ? { note } : { state: "warn", note: r.out.trim().split("\n").pop() };
  });
}

// ---------------------------------------------------------------- duplicates
// Moves away every copy of a managed skill that a host would see besides the canonical one (and its links).
function cleanDuplicates(names, legacy) {
  const moved = [];
  const all = new Set([...names, ...legacy]);
  const dirs = new Set([...ALWAYS_CLEAN, ...Object.values(HOSTS).flatMap((h) => h.link || []), CANON]);
  for (const d of dirs) {
    if (!exists(d)) continue;
    for (const e of fs.readdirSync(d, { withFileTypes: true })) {
      const p = path.join(d, e.name);
      const inCanon = samePath(d, CANON);
      const isLinkDir = Object.values(HOSTS).some((h) => (h.link || []).some((l) => samePath(l, d)));
      const sn = skillName(p);
      const legacyHit = legacy.includes(e.name) || (sn && legacy.includes(sn));
      const ours = all.has(e.name) || (sn && all.has(sn));
      if (!ours) continue;
      if (inCanon && !legacyHit) continue;                                   // the canonical copy itself
      if (isLinkDir && !legacyHit && isLink(p) && samePath(linkTarget(p), path.join(CANON, e.name))) continue;   // our link
      if (isLinkDir && !legacyHit && !ctx.hosts.some((h) => (HOSTS[h].link || []).some((l) => samePath(l, d)))) {
        // link folder of a host not picked this time: a link to canonical is harmless, a stale copy is not
        if (isLink(p) && samePath(linkTarget(p), path.join(CANON, e.name))) continue;
      }
      if (DRY) { moved.push(p); continue; }
      const b = backup(p, legacyHit ? "legacy name" : "duplicate of the canonical copy");
      moved.push(p);
      if (VERBOSE) ui.detail(`${tilde(p)} ${g.arrow} ${b ? tilde(b) : S.removed}`);
    }
  }
  return moved;
}

// ---------------------------------------------------------------- commands
function toToml(md) {
  const m = /^---\s*[\r\n]+([\s\S]*?)[\r\n]+---\s*[\r\n]*/.exec(md);
  const desc = m && /^description:\s*(.+)$/m.exec(m[1]);
  const body = (m ? md.slice(m[0].length) : md).replace(/\$ARGUMENTS/g, "{{args}}");
  const esc = (s) => s.replace(/\\/g, "\\\\").replace(/"""/g, '\\"\\"\\"');
  return `${desc ? `description = ${JSON.stringify(desc[1].trim().replace(/^["']|["']$/g, ""))}\n` : ""}prompt = """\n${esc(body.trim())}\n"""\n`;
}
function installCommands(hosts) {
  const skillNames = new Set([...M.skills.map((s) => s.name)]);
  // a command named like a skill is a duplicate entry wherever skills are slash commands; allowed only via onlyHosts
  const mine = (M.commands || []).filter((x) => !skillNames.has(x.name) || x.onlyHosts);
  const retired = new Set([...(M.retiredCommands || []), ...(M.commands || []).filter((x) => skillNames.has(x.name) && !x.onlyHosts).map((x) => x.name)]);
  const retiredFor = (id) => new Set([...retired, ...mine.filter((x) => x.onlyHosts && !x.onlyHosts.includes(id)).map((x) => x.name)]);
  const marker = new RegExp(M.commandMarker || M.skills.map((s) => s.name).concat(M.skills.flatMap((s) => s.legacy || [])).join("|"), "i");
  let wrote = 0, removed = 0;
  const shown = new Set();
  const removeOurs = (dir, name) => {
    for (const ext of [".md", ".toml"]) {
      const p = path.join(dir, name + ext);
      if (exists(p) && marker.test(fs.readFileSync(p, "utf8"))) { if (!DRY) fs.rmSync(p); removed++; }
    }
  };
  for (const [id, h] of Object.entries(HOSTS)) {
    const picked = hosts.includes(id);
    for (const dir of h.cleanCommands || []) if (exists(dir)) for (const x of [...mine.map((m) => m.name), ...retired]) removeOurs(dir, x);
    for (const cd of h.commands || []) {
      if (exists(cd.dir)) for (const x of retiredFor(id)) removeOurs(cd.dir, x);
      if (!picked) continue;
      if (!exists(path.dirname(cd.dir))) continue;
      if (!DRY) mkdirp(cd.dir);
      for (const x of mine.filter((m) => !m.onlyHosts || m.onlyHosts.includes(id))) {
        const src = fs.readFileSync(path.join(ROOT, x.file), "utf8");
        const p = path.join(cd.dir, x.name + (cd.format === "toml" ? ".toml" : ".md"));
        const text = cd.format === "toml" ? toToml(src) : src;
        shown.add("/" + x.name);
        if (exists(p) && fs.readFileSync(p, "utf8") === text) { ctx.created.commands.push(p); continue; }
        if (!DRY) fs.writeFileSync(p, text);
        ctx.created.commands.push(p); wrote++;
      }
    }
  }
  const names = [...shown].join(" ");
  return { note: `${names || "—"}${wrote ? ` ${g.dot} ${wrote} ${lang === "it" ? "scritti" : "written"}` : ""}${removed ? ` ${g.dot} ${removed} ${lang === "it" ? "vecchi rimossi" : "old removed"}` : ""}` };
}

// ---------------------------------------------------------------- MCP
async function installMcp(cm, hosts) {
  const label = `${S.mcp} ${cm.mcp.name}`;
  await ui.task(label, async () => {
    const spec = expand(cm.mcp);
    if (spec.missing) return { state: "skip", note: `${spec.missing}: ${S.notFound}` };
    const prevOwned = new Set((prev?.created?.mcp || []).map((m) => `${m.file}|${m.name}`));
    const res = [];
    for (const h of hosts) for (const t of HOSTS[h].mcp || []) {
      const files = t.both ? [t.file, t.alt].filter((f) => f && exists(f)) : [exists(t.file) || !t.alt || !exists(t.alt) ? t.file : t.alt];
      if (t.both && !files.length) files.push(t.file);
      for (const file of files) {
        if (t.onlyIfExists && !exists(file)) continue;
        if (!exists(path.dirname(file)) && t.kind !== "claude") continue;
        const owned = prevOwned.has(`${file}|${cm.mcp.name}`);
        let r;
        if (DRY) r = "dry";
        else if (t.kind === "claude") r = upsertClaude(spec, { owned, claudeJson: file });
        else if (t.kind === "toml") r = upsertToml(file, spec, { owned });
        else r = upsertJson(file, t.format, spec, { owned, envStyle: t.envStyle });
        if (r === "added" || r === "updated" || r === "present" || owned) ctx.created.mcp.push({ host: h, kind: t.kind, format: t.format, file, name: cm.mcp.name });
        res.push({ h, r });
      }
    }
    const errs = res.filter((x) => String(x.r).startsWith("error"));
    const kept = res.filter((x) => x.r === "kept-user");
    const changed = res.filter((x) => x.r === "added" || x.r === "updated");
    const parts = [];
    if (changed.length) parts.push(`${changed.map((x) => HOSTS[x.h].label).filter((v, i, a) => a.indexOf(v) === i).join(", ")}`);
    if (!changed.length && !errs.length) parts.push(S.upToDate);
    if (kept.length) parts.push(`${kept.length}× ${S.mcpKept}`);
    if (cm.env && !(process.env[cm.env] || userEnv(cm.env))) parts.push(S.keyMissing(cm.env));
    if (errs.length) return { state: "warn", note: errs.map((x) => `${HOSTS[x.h].label}: ${String(x.r).slice(6)}`).join("; ") };
    return { state: cm.env && !(process.env[cm.env] || userEnv(cm.env)) ? "warn" : "ok", note: parts.join(` ${g.dot} `) };
  });
  if (cm.env && !(process.env[cm.env] || userEnv(cm.env)) && cm.envHelp) ctx.footer.push(`${c.warn(g.warn)} ${T(cm.envHelp)}`);
}

// ---------------------------------------------------------------- update
async function update() {
  if (!flags["no-pull"]) {
    let r;
    const head0 = { mark: M.brand?.mark, name: M.name, subtitle: T(M.brand?.tagline), version: M.version, rev: rev() };
    ui.header(head0);
    ui.open(S.pull);
    await ui.task(path.basename(ROOT), async (t) => {
      r = await pullSelf(ROOT, t.update);
      if (r.skipped) return { state: "skip", note: lang === "it" ? "non è un clone git" : "not a git clone" };
      if (r.error) return { state: "warn", note: r.error };
      return { note: r.changed ? `${r.before} ${g.arrow} ${r.after}` : `${r.after} ${g.dot} ${S.upToDate}` };
    });
    for (const l of r?.log || []) ui.detail(l);
    ui.close();
    if (r?.changed) {
      // the installer itself may have changed: run the new one
      const res = spawnSync(process.execPath, [fileURLToPath(import.meta.url), "update", "--no-pull", "--no-header", ...argv.filter((a) => a !== "update")], { stdio: "inherit" });
      return res.status ?? 1;
    }
    flags["no-header"] = true;
  }
  return install({ reuse: Boolean(prev) });
}

// ---------------------------------------------------------------- doctor
async function doctor() {
  ui.header({ mark: M.brand?.mark, name: M.name, subtitle: S.doctor, version: M.version, rev: rev() });
  let problems = 0;
  const bad = (label, value, note) => { problems++; ui.row("fail", label, value, note); };
  ui.open(S.doctor);
  if (!prev) bad(S.receipt, S.missing, lang === "it" ? "mai installato con questo installer" : "never installed with this installer");
  const names = [...new Set([...(prev?.created?.skills || []), ...M.skills.map((s) => s.name)])];
  const own = M.skills.map((s) => s.name);
  let depOk = 0;
  for (const n of names) {
    const p = path.join(CANON, n);
    if (!skillName(p)) bad(n, S.missing, tilde(p));
    else if (own.includes(n)) ui.row("ok", n, tilde(p), isLink(p) ? `${g.arrow} ${tilde(linkTarget(p))}` : "");
    else depOk++;
  }
  if (depOk) ui.row("ok", S.deps, `${depOk} skill`, tilde(CANON));
  // every place a host would find each skill
  const dirs = [CANON, ...ALWAYS_CLEAN, ...Object.values(HOSTS).flatMap((h) => h.link || [])];
  for (const n of names) {
    const hits = dirs.map((d) => path.join(d, n)).filter((p) => exists(p) && !(isLink(p) && samePath(linkTarget(p), path.join(CANON, n))) && !samePath(p, path.join(CANON, n)));
    for (const h of hits) bad(S.dupes, tilde(h), S.stale);
  }
  for (const legacyName of M.skills.flatMap((s) => s.legacy || [])) for (const d of dirs) { const p = path.join(d, legacyName); if (exists(p)) bad(S.dupes, tilde(p), lang === "it" ? "nome vecchio" : "legacy name"); }
  for (const h of prev?.hosts || []) for (const d of HOSTS[h]?.link || []) for (const n of names) {
    const p = path.join(d, n);
    if (!exists(path.dirname(d))) continue;
    if (!(isLink(p) && samePath(linkTarget(p), path.join(CANON, n)))) bad(S.links2, tilde(p), S.missing);
  }
  for (const p of prev?.created?.commands || []) if (!exists(p)) bad(S.commands, tilde(p), S.missing);
  for (const m of prev?.created?.mcp || []) {
    const raw = exists(m.file) ? fs.readFileSync(m.file, "utf8") : "";
    if (!raw.includes(`"${m.name}"`) && !raw.includes(`mcp_servers.${m.name}]`)) bad(S.mcp, `${m.name} ${g.dot} ${HOSTS[m.host]?.label || m.host}`, S.missing);
  }
  for (const r of M.requires || []) { const v = version(r.cmds || r.id, r.versionArgs); if (!v && r.required) bad(r.label || r.id, S.missing); else if (v) ui.row("ok", r.label || r.id, v); }
  if (hooks.doctor) problems += (await hooks.doctor(ctx)) || 0;
  ui.gap();
  if (problems) { ui.row("fail", S.doctor, S.problems(problems)); ui.close(`${S.fixHint} ${isWin ? "install.bat --reuse" : "./install.sh --reuse"}  ${lang === "it" ? "oppure" : "or"}  doctor --fix`); }
  else { ui.row("ok", S.doctor, S.healthy); ui.close(); }
  if (problems && flags.fix) return install({ reuse: true });
  return problems ? 2 : 0;
}

// ---------------------------------------------------------------- uninstall
async function uninstall() {
  ui.header({ mark: M.brand?.mark, name: M.name, subtitle: S.uninstall, version: M.version, rev: rev() });
  if (!prev) { ui.warn(lang === "it" ? "Nessuna ricevuta: niente da disinstallare." : "No receipt: nothing to uninstall."); return 0; }
  ui.open(S.uninstall);
  const others = allReceipts().filter((r) => r.id !== M.id);
  const usedElsewhere = (n) => others.some((r) => (r.created?.skills || []).includes(n));
  for (const p of prev.created.links || []) await ui.task(tilde(p), async () => (DRY || unlinkOnly(p) ? { note: S.removed } : { state: "skip" }));
  for (const n of prev.created.skills || []) {
    await ui.task(`${S.skill} ${n}`, async () => {
      if (usedElsewhere(n)) return { state: "skip", note: S.ownedBy(others.find((r) => (r.created?.skills || []).includes(n)).name) };
      const p = path.join(CANON, n);
      if (!exists(p)) return { state: "skip" };
      if (!DRY) { if (isLink(p)) unlinkOnly(p); else backup(p, "uninstall"); }
      return { note: S.removed };
    });
  }
  for (const p of prev.created.commands || []) if (exists(p) && !DRY) fs.rmSync(p);
  for (const m of prev.created.mcp || []) {
    if (others.some((r) => (r.created?.mcp || []).some((x) => x.name === m.name && x.file === m.file))) continue;
    await ui.task(`${S.mcp} ${m.name} ${g.dot} ${HOSTS[m.host]?.label || m.host}`, async () => {
      if (DRY) return {};
      const ok = m.kind === "claude" ? removeClaude(m.name, m.file) : m.kind === "toml" ? removeToml(m.file, m.name) : removeJson(m.file, m.format, m.name);
      return ok ? { note: S.removed } : { state: "skip", note: S.kept };
    });
  }
  if (hooks.uninstall) await hooks.uninstall(ctx);
  if (!DRY) fs.rmSync(RECEIPT, { force: true });
  ui.close(`${S.backupAt}: ${tilde(path.join(STATE, "backup"))}`);
  return 0;
}

// ---------------------------------------------------------------- main
let code = 0;
try {
  if (cmd === "install") code = await install();
  else if (cmd === "update") code = await update();
  else if (cmd === "doctor") code = await doctor();
  else if (cmd === "uninstall") code = await uninstall();
  else if (cmd === "version") console.log(`${M.name} ${M.version || ""} (skillkit ${ENGINE_VERSION})`);
  else { console.error(`unknown command: ${cmd}  (install | update | doctor | uninstall | version)`); code = 1; }
} catch (e) {
  if (e.code === "CANCELLED") { process.stdout.write("\n"); ui.warn(S.cancelled); code = 130; }
  else { ui.fail(e.stack || String(e)); code = 1; }
}
if (flags.json) process.stdout.write(JSON.stringify(ui.jsonEvents(), null, 2) + "\n");
process.exitCode = code;

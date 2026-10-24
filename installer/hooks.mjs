// designer hooks for the skillkit installer: reference sites question, config.json, shared styles store.
import fs from "node:fs";
import path from "node:path";

const SOURCES = [
  ["gameUiDatabase", "Game UI Database", "gameuidatabase.com", true],
  ["interfaceInGame", "Interface In Game", "interfaceingame.com", true],
  ["beautifulUi", "Beautiful UI", "beautifului.dev", true],
  ["twentyFirst", "21st.dev", "catalog", true],
  ["componentGallery", "Component Gallery", "component.gallery", true],
  ["gameIcons", "game-icons.net", "SVG icons", true],
  ["appStore", "App Store / Play", "screenshots", true],
  ["aceternity", "Aceternity UI", "ui.aceternity.com", false],
  ["artStation", "ArtStation", "UI reels", false],
];

const designerHome = (ctx) => process.env.DESIGNER_HOME || path.join(ctx.HOME, ".designer");

export async function detect(ctx) {
  const home = designerHome(ctx);
  const n = (() => { try { return fs.readdirSync(path.join(home, "styles"), { withFileTypes: true }).filter((e) => e.isDirectory()).length; } catch { return 0; } })();
  ctx.ui.row(n ? "ok" : "off", ctx.lang === "it" ? "Stili salvati" : "Saved styles", n ? `${n} ${ctx.g.dot} ${ctx.tilde(path.join(home, "styles"))}` : "—");
}

export async function questions(ctx) {
  const prevSources = ctx.prev?.options?.sources;
  const it = ctx.lang === "it";
  const picked = await ctx.ui.multiselect({
    title: it ? "Siti per il reverse engineering" : "Reverse-engineering sites",
    help: it ? "i siti spenti non vengono mai aperti" : "disabled sites are never opened",
    lang: ctx.lang,
    items: SOURCES.map(([id, label, hint, rec]) => ({ id, label, hint, on: prevSources ? prevSources[id] : rec })),
  });
  ctx.choices.sources = Object.fromEntries(SOURCES.map(([id]) => [id, picked.includes(id)]));
}

export async function config(ctx, skill, dest) {
  const home = designerHome(ctx);
  const on = (id) => ctx.components.includes(id);
  const defaults = ctx.readJson(path.join(ctx.ROOT, skill.path, "config", "defaults.json"), {});
  const user = ctx.readJson(path.join(dest, "config.json"), {}) || {};
  const sources = ctx.choices.sources || ctx.prev?.options?.sources || user.sources || Object.fromEntries(SOURCES.map(([id, , , rec]) => [id, rec]));
  for (const id of String(ctx.flags["skip-sources"] || "").split(",").map((x) => x.trim()).filter(Boolean)) if (id in sources) sources[id] = false;
  if (!on("mcp21st")) sources.twentyFirst = false;
  ctx.choices.sources = sources;
  const studio = path.join(ctx.CANON, "variant-studio");
  const cfg = {
    ...defaults,
    ...user,
    version: defaults.version || 2,
    hosts: ctx.hosts,
    modules: { ...(defaults.modules || {}), variantStudio: on("variantStudio"), transitionsDev: on("transitionsDev"), mcp21st: on("mcp21st"), playwrightMcp: on("playwrightMcp"), designCommand: true },
    sources,
    companion: { ...(defaults.companion || {}), ...(user.companion || {}), enabled: on("variantStudio") || ctx.exists(path.join(studio, "SKILL.md")) },
    variantStudio: { ...(defaults.variantStudio || {}), path: ctx.exists(path.join(studio, "SKILL.md")) ? studio : null, repo: "https://github.com/Fonlogen/variant-studio" },
    styles: { home },
  };
  fs.writeFileSync(path.join(dest, "config.json"), JSON.stringify(cfg, null, 2) + "\n");

  // shared style store, visible from the installed copy as <skill>/styles
  ctx.mkdirp(path.join(home, "styles"));
  ctx.mkdirp(path.join(home, "library"));
  const link = path.join(dest, "styles");
  if (!ctx.exists(link)) ctx.link(path.join(home, "styles"), link);
}

export async function summary(ctx, rows) {
  const it = ctx.lang === "it";
  const s = ctx.choices.sources || {};
  rows.push([it ? "Siti" : "Sites", SOURCES.filter(([id]) => s[id]).map(([, l]) => l).join(", ") || "—"]);
  rows.push([it ? "Stili" : "Styles", ctx.tilde(path.join(designerHome(ctx), "styles"))]);
  rows.push([it ? "Usa" : "Use", "/designer [stile] <richiesta>   /createstyle [nome]".replace("stile", it ? "stile" : "style").replace("richiesta", it ? "richiesta" : "request").replace("nome", it ? "nome" : "name")]);
}

export async function doctor(ctx) {
  let bad = 0;
  const dest = path.join(ctx.CANON, "designer");
  const cfg = ctx.readJson(path.join(dest, "config.json"));
  if (!cfg) { ctx.ui.row("fail", "config.json", ctx.S.missing); bad++; } else ctx.ui.row("ok", "config.json", ctx.tilde(path.join(dest, "config.json")));
  const r = ctx.runSync(process.execPath, [path.join(dest, "scripts", "studio.mjs"), "where"]);
  if (r.code === 0) { try { ctx.ui.row("ok", "Variant Studio", ctx.tilde(JSON.parse(r.out).path)); } catch { ctx.ui.row("ok", "Variant Studio", "ok"); } }
  else { ctx.ui.row("warn", "Variant Studio", ctx.S.missing, ctx.lang === "it" ? "la skill ripiega su mock + Playwright" : "the skill falls back to mock + Playwright"); }
  return bad;
}

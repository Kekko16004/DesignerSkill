// MCP server registration for every host format. Adds or updates only the entries this installer owns;
// servers the user configured by hand are never overwritten.
//
// Server spec (manifest): { name, command, args, env }  or  { name, url, headers }
import fs from "node:fs";
import path from "node:path";
import { exists, readJson, writeJson, stripJsonc, mkdirp, isWin } from "./fsx.mjs";
import { which, runSync } from "./proc.mjs";

// On Windows, launchers that are .cmd shims (npx, uvx from pip) must go through cmd /c in every client.
function launch(spec) {
  if (!spec.command) return spec;
  const shim = isWin && ["npx", "npm", "pnpm", "yarn", "bunx"].includes(spec.command.toLowerCase());
  return shim ? { ...spec, command: "cmd", args: ["/c", spec.command, ...(spec.args || [])] } : spec;
}

const formats = {
  // { "mcpServers": { name: { command, args, env } } }  — Claude Code, Cursor, Gemini CLI, Antigravity, Windsurf, Copilot
  mcpServers: {
    get: (doc, n) => doc?.mcpServers?.[n],
    entry: (s) => s.url ? { type: "http", url: s.url, ...(s.headers ? { headers: s.headers } : {}) } : { command: s.command, args: s.args || [], ...(s.env ? { env: s.env } : {}) },
    set: (doc, n, e) => { doc.mcpServers = doc.mcpServers || {}; doc.mcpServers[n] = e; },
    del: (doc, n) => { if (doc?.mcpServers) delete doc.mcpServers[n]; },
    key: "mcpServers",
  },
  // { "mcp": { name: { type: "local", command: [..], environment, enabled } } }  — Kilo, OpenCode
  mcp: {
    get: (doc, n) => doc?.mcp?.[n],
    entry: (s) => s.url ? { type: "remote", url: s.url, enabled: true, ...(s.headers ? { headers: s.headers } : {}) } : { type: "local", command: [s.command, ...(s.args || [])], enabled: true, ...(s.env ? { environment: s.env } : {}) },
    set: (doc, n, e) => { doc.mcp = doc.mcp || {}; doc.mcp[n] = e; },
    del: (doc, n) => { if (doc?.mcp) delete doc.mcp[n]; },
    key: "mcp",
  },
  // { "servers": { name: { type: "stdio", command, args } } } — VS Code user mcp.json
  servers: {
    get: (doc, n) => doc?.servers?.[n],
    entry: (s) => s.url ? { type: "http", url: s.url, ...(s.headers ? { headers: s.headers } : {}) } : { type: "stdio", command: s.command, args: s.args || [], ...(s.env ? { env: s.env } : {}) },
    set: (doc, n, e) => { doc.servers = doc.servers || {}; doc.servers[n] = e; },
    del: (doc, n) => { if (doc?.servers) delete doc.servers[n]; },
    key: "servers",
  },
};

// Secrets are never written: ${env:NAME} in a spec becomes each client's own env reference syntax.
// style: "dollar" ${NAME} (Claude, Gemini, Copilot) | "dollarEnv" ${env:NAME} (Cursor, Windsurf) | "brace" {env:NAME} (Kilo, OpenCode)
export function envRefs(spec, style = "dollar") {
  const fmt = (n) => (style === "brace" ? `{env:${n}}` : style === "dollarEnv" ? "${env:" + n + "}" : "${" + n + "}");
  const walk = (v) => (typeof v === "string" ? v.replace(/\$\{env:([A-Za-z0-9_]+)\}/g, (x, n) => fmt(n)) : Array.isArray(v) ? v.map(walk) : v && typeof v === "object" ? Object.fromEntries(Object.entries(v).map(([k, x]) => [k, walk(x)])) : v);
  return walk(spec);
}

const same = (a, b) => JSON.stringify(a) === JSON.stringify(b);
// an existing entry is ours when the manifest says how to recognise it (e.g. it runs terminalmcp.js from an old path)
const adopted = (spec, cur) => Boolean(spec.adopt && cur && new RegExp(spec.adopt, "i").test(typeof cur === "string" ? cur : JSON.stringify(cur)));

// JSON / JSONC file. Returns "added" | "updated" | "present" | "kept-user" | "error:..."
export function upsertJson(file, format, spec, { owned = false, envStyle } = {}) {
  const f = formats[format];
  const s = launch(envRefs(spec, envStyle || (format === "mcp" ? "brace" : "dollar")));
  const raw = exists(file) ? fs.readFileSync(file, "utf8") : "";
  let doc;
  try { doc = raw.trim() ? JSON.parse(stripJsonc(raw)) : {}; } catch (e) { return `error:${path.basename(file)} is not valid JSON`; }
  const cur = f.get(doc, spec.name);
  const want = f.entry(s);
  if (cur && same(cur, want)) return "present";
  if (cur && !owned && !adopted(spec, cur)) return "kept-user";
  const commented = raw !== stripJsonc(raw) && /\/\/|\/\*/.test(raw);
  if (commented) {
    // keep the user's comments: splice the entry as text instead of rewriting the whole file
    const text = spliceJsonc(raw, f.key, spec.name, want, Boolean(cur));
    if (!text) return "error:could not edit commented file safely";
    backupOnce(file, raw);
    fs.writeFileSync(file, text);
  } else {
    if (raw) backupOnce(file, raw);
    f.set(doc, spec.name, want);
    writeJson(file, doc);
  }
  return cur ? "updated" : "added";
}
export function removeJson(file, format, name) {
  if (!exists(file)) return false;
  const raw = fs.readFileSync(file, "utf8");
  let doc; try { doc = JSON.parse(stripJsonc(raw)); } catch { return false; }
  if (!formats[format].get(doc, name)) return false;
  if (/\/\/|\/\*/.test(raw) && raw !== stripJsonc(raw)) return false;   // never rewrite commented files on uninstall
  formats[format].del(doc, name);
  writeJson(file, doc);
  return true;
}
function spliceJsonc(raw, key, name, entry, replace) {
  const body = JSON.stringify(entry, null, 2).split("\n").map((l, i) => (i ? "    " + l : l)).join("\n");
  if (replace) return null;   // replacing inside a commented file is not worth the risk: report instead
  const m = new RegExp(`"${key}"\\s*:\\s*\\{`).exec(raw);
  if (m) {
    const at = m.index + m[0].length;
    const empty = /^\s*\}/.test(raw.slice(at));
    return raw.slice(0, at) + `\n    "${name}": ${body}${empty ? "\n  " : ","}` + raw.slice(at);
  }
  const end = raw.lastIndexOf("}");
  if (end < 0) return null;
  const before = raw.slice(0, end).replace(/\s*$/, "");
  const comma = /[{,]$/.test(before) ? "" : ",";
  return `${before}${comma}\n  "${key}": {\n    "${name}": ${body}\n  }\n}\n`;
}
const backedUp = new Set();
function backupOnce(file, raw) {
  if (backedUp.has(file)) return;
  backedUp.add(file);
  try { fs.writeFileSync(file + ".skillkit-bak", raw); } catch {}
}

// ---------------------------------------------------------------- Codex config.toml
const tomlStr = (s) => `'${String(s).replace(/'/g, "''")}'`.replace(/^'(.*)'$/s, (m, x) => (x.includes("'") ? JSON.stringify(String(s)) : m));
export function upsertToml(file, spec, { owned = false } = {}) {
  const s = launch(spec);
  const raw = exists(file) ? fs.readFileSync(file, "utf8") : "";
  const head = `[mcp_servers.${spec.name}]`;
  const lines = [head];
  if (s.url) {
    lines.push(`url = ${tomlStr(s.url)}`);
    const all = Object.entries(s.headers || {}).map(([k, v]) => [k, v, /^\$\{env:([A-Za-z0-9_]+)\}$/.exec(v)?.[1]]);
    const envH = all.filter(([, , n]) => n).map(([k, , n]) => [k, n]);
    const plain = all.filter(([, , n]) => !n);
    if (plain.length) lines.push(`http_headers = { ${plain.map(([k, v]) => `${JSON.stringify(k)} = ${JSON.stringify(v)}`).join(", ")} }`);
    if (envH.length) lines.push(`env_http_headers = { ${envH.map(([k, n]) => `${JSON.stringify(k)} = ${JSON.stringify(n)}`).join(", ")} }`);
  }
  else { lines.push(`command = ${tomlStr(s.command)}`, `args = [${(s.args || []).map(tomlStr).join(", ")}]`); }
  if (s.env) { lines.push(`[mcp_servers.${spec.name}.env]`); for (const [k, v] of Object.entries(s.env)) lines.push(`${k} = ${tomlStr(v)}`); }
  const block = lines.join("\n");
  const re = new RegExp(`^\\[mcp_servers\\.${spec.name}\\][\\s\\S]*?(?=^\\[(?!mcp_servers\\.${spec.name}\\.)|(?![\\s\\S]))`, "m");
  const cur = re.exec(raw);
  if (cur && cur[0].trim() === block.trim()) return "present";
  if (cur && !owned && !adopted(spec, cur[0])) return "kept-user";
  mkdirp(path.dirname(file));
  if (raw) backupOnce(file, raw);
  const text = cur ? raw.replace(re, block + "\n\n") : (raw.trimEnd() + (raw.trim() ? "\n\n" : "") + block + "\n");
  fs.writeFileSync(file, text);
  return cur ? "updated" : "added";
}
export function removeToml(file, name) {
  if (!exists(file)) return false;
  const raw = fs.readFileSync(file, "utf8");
  const re = new RegExp(`^\\[mcp_servers\\.${name}\\][\\s\\S]*?(?=^\\[(?!mcp_servers\\.${name}\\.)|(?![\\s\\S]))`, "m");
  if (!re.test(raw)) return false;
  fs.writeFileSync(file, raw.replace(re, "").replace(/\n{3,}/g, "\n\n"));
  return true;
}

// ---------------------------------------------------------------- Claude Code: official CLI first (it owns ~/.claude.json)
export function upsertClaude(spec, { owned = false, claudeJson }) {
  const exe = which("claude");
  const doc = readJson(claudeJson, {});
  const cur = doc?.mcpServers?.[spec.name];
  const want = formats.mcpServers.entry(launch(envRefs(spec, "dollar")));
  if (cur && same(cur, want)) return "present";
  if (cur && !owned && !adopted(spec, cur)) return "kept-user";
  owned = true;
  if (exe && /\.exe$/i.test(exe) || exe && !isWin) {
    if (cur) runSync(exe, ["mcp", "remove", "-s", "user", spec.name]);
    const r = runSync(exe, ["mcp", "add-json", "-s", "user", spec.name, JSON.stringify(want)]);
    if (r.code === 0) return cur ? "updated" : "added";
  }
  // no CLI (or a .cmd shim that would mangle the JSON): edit the file atomically
  return upsertJson(claudeJson, "mcpServers", spec, { owned: true, envStyle: "dollar" });
}
export function removeClaude(name, claudeJson) {
  const exe = which("claude");
  if (exe && (/\.exe$/i.test(exe) || !isWin)) { const r = runSync(exe, ["mcp", "remove", "-s", "user", name]); if (r.code === 0) return true; }
  return removeJson(claudeJson, "mcpServers", name);
}

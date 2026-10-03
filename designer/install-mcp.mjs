#!/usr/bin/env node
// Adds the 21st.dev MCP server to one client config (macOS / Linux twin of install-mcp.ps1). Never writes a secret
// that is not already in the env: without API_KEY_21ST it writes the ${API_KEY_21ST} placeholder.
//   --claude          ~/.claude.json top-level mcpServers (install.sh prefers `claude mcp add-json -s user`)
//   --generic FILE    any { "mcpServers": {} } JSON file (Cursor, Antigravity)
//   --kilo FILE       kilo.json / kilo.jsonc ("mcp" block, comments allowed)
import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { homedir } from 'node:os';

const header = process.env.API_KEY_21ST || '${API_KEY_21ST}';
const url = 'https://21st.dev/api/mcp';
const [mode, target] = process.argv.slice(2);

const read = (p) => (existsSync(p) ? readFileSync(p, 'utf8') : '');
const write = (p, text) => { mkdirSync(dirname(p), { recursive: true }); writeFileSync(p, text.trimEnd() + '\n'); };

function addJson(p, entry) {
  let doc = {};
  try { doc = JSON.parse(read(p) || '{}'); } catch { console.log(`WARN ${p} is not plain JSON: add 21st to its mcpServers by hand`); return; }
  doc.mcpServers ||= {};
  if (doc.mcpServers['21st']) { console.log(`MCP 21st already in ${p}`); return; }
  doc.mcpServers['21st'] = entry;
  write(p, JSON.stringify(doc, null, 2));
  console.log(`MCP 21st added to ${p}`);
}

if (mode === '--claude') {
  addJson(join(homedir(), '.claude.json'), { type: 'http', url, headers: { 'x-api-key': header } });
} else if (mode === '--generic' && target) {
  addJson(target, { url, headers: { 'x-api-key': header } });
} else if (mode === '--kilo' && target) {
  const snippet = `    "21st": {\n      "type": "remote",\n      "url": "${url}",\n      "headers": { "x-api-key": "${header}" },\n      "enabled": true\n    }`;
  const raw = read(target);
  if (/"21st"\s*:/.test(raw)) { console.log(`MCP 21st already in ${target}`); process.exit(0); }
  if (!raw.trim()) {
    write(target, `{\n  "$schema": "https://app.kilo.ai/config.json",\n  "mcp": {\n${snippet}\n  }\n}`);
  } else if (/"mcp"\s*:\s*\{/.test(raw)) {
    write(target, raw.replace(/("mcp"\s*:\s*\{)/, `$1\n${snippet},`).replace(/,(\s*\})/g, '$1'));
  } else {
    const t = raw.trimEnd();
    const comma = /\{\s*\}$/.test(t) ? '' : ',';
    write(target, t.slice(0, -1).trimEnd().replace(/,$/, '') + `${comma}\n  "mcp": {\n${snippet}\n  }\n}`);
  }
  console.log(`MCP 21st added to ${target}`);
} else {
  console.error('usage: install-mcp.mjs --claude | --generic FILE | --kilo FILE');
  process.exit(1);
}

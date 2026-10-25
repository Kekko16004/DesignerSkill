// Where each agent host looks for skills, commands and MCP servers (user level), checked 2026-10-25.
// Sources: code.claude.com/docs/en/skills, learn.chatgpt.com/docs/build-skills, geminicli.com/docs/cli/skills,
// antigravity codelab, cursor.com/docs/context/skills, opencode.ai/docs/skills, Kilo source (skill/index.ts),
// docs.devin.ai (Windsurf), docs.github.com (Copilot CLI), code.visualstudio.com (Copilot in VS Code), Roo, Cline docs.
//
// Model: every skill lives ONCE in ~/.agents/skills/<name> (the cross-agent folder read natively by Codex, Gemini CLI,
// Cursor, OpenCode, Kilo, Windsurf, Copilot, Roo, the Antigravity app). Only hosts that do NOT read it get a link
// (`link`). Every other host-specific skills folder is a `clean` folder: copies of our skills found there are moved
// to the backup area, because they would show up twice (Codex, Cursor, VS Code list both) or go stale.
import path from "node:path";
import { HOME, exists, isWin } from "./fsx.mjs";

const H = (...p) => path.join(HOME, ...p);
const APPDATA = process.env.APPDATA || H("AppData", "Roaming");

export const CANON = process.env.SKILLKIT_SKILLS || H(".agents", "skills");

export const HOSTS = {
  claude: {
    label: "Claude Code", detect: [H(".claude")],
    link: [H(".claude", "skills")],                       // does not read ~/.agents/skills
    commands: [{ dir: H(".claude", "commands"), format: "md" }],
    mcp: [{ kind: "claude", file: H(".claude.json") }],
  },
  codex: {
    label: "Codex", detect: [H(".codex")],
    clean: [H(".codex", "skills")],                       // legacy folder still scanned: a second copy = two entries
    cleanCommands: [H(".codex", "prompts")],              // custom prompts are deprecated in favour of skills
    mcp: [{ kind: "toml", file: H(".codex", "config.toml") }],
  },
  gemini: {
    label: "Gemini CLI", detect: [H(".gemini", "settings.json")],
    clean: [H(".gemini", "skills")],
    commands: [{ dir: H(".gemini", "commands"), format: "toml" }],
    mcp: [{ kind: "json", format: "mcpServers", file: H(".gemini", "settings.json") }],
  },
  antigravity: {
    label: "Antigravity", detect: [H(".gemini", "antigravity"), H(".gemini", "config"), H(".antigravity")],
    link: [H(".gemini", "config", "skills")],             // the only folder app, IDE and CLI all load
    clean: [H(".gemini", "antigravity", "skills"), H(".gemini", "antigravity", "global_skills"), H(".antigravity", "skills"), H(".gemini", "antigravity-cli", "skills")],
    cleanCommands: [H(".gemini", "config", "global_workflows")],   // old installers wrote the slash command here too: a second entry next to the skill
    mcp: [{ kind: "json", format: "mcpServers", file: H(".gemini", "config", "mcp_config.json") }],
  },
  cursor: {
    label: "Cursor", detect: [H(".cursor")],
    clean: [H(".cursor", "skills")],
    mcp: [{ kind: "json", format: "mcpServers", file: H(".cursor", "mcp.json"), envStyle: "dollarEnv" }],
  },
  opencode: {
    label: "OpenCode", detect: [H(".config", "opencode")],
    clean: [H(".config", "opencode", "skills"), H(".config", "opencode", "skill")],
    commands: [{ dir: H(".config", "opencode", "commands"), format: "md" }],
    cleanCommands: [H(".config", "opencode", "command")],
    mcp: [{ kind: "json", format: "mcp", file: H(".config", "opencode", "opencode.json"), alt: H(".config", "opencode", "opencode.jsonc") }],
  },
  kilo: {
    label: "Kilo Code", detect: [H(".config", "kilo"), H(".kilo"), H(".kilocode")],
    clean: [H(".config", "kilo", "skills"), H(".config", "kilo", "skill"), H(".kilo", "skills"), H(".kilo", "skill"), H(".kilocode", "skills"), H(".kilocode", "skill")],
    // one command root only: the same file in several roots is loaded several times
    commands: [{ dir: H(".config", "kilo", "commands"), format: "md" }],
    cleanCommands: [H(".config", "kilo", "command"), H(".kilo", "command"), H(".kilo", "commands"), H(".kilocode", "command"), H(".kilocode", "commands")],
    mcp: [{ kind: "json", format: "mcp", file: H(".config", "kilo", "kilo.jsonc"), alt: H(".config", "kilo", "kilo.json"), both: true }],
  },
  windsurf: {
    label: "Windsurf", detect: [H(".codeium", "windsurf"), path.join(APPDATA, "devin")],
    clean: [H(".codeium", "windsurf", "skills"), H(".config", "devin", "skills")],
    mcp: [{ kind: "json", format: "mcpServers", file: H(".codeium", "windsurf", "mcp_config.json"), envStyle: "dollarEnv" }, { kind: "json", format: "mcpServers", file: path.join(APPDATA, "devin", "mcp_config.json"), onlyIfExists: true, envStyle: "dollarEnv" }],
  },
  copilot: {
    label: "GitHub Copilot", detect: [H(".copilot")],
    clean: [H(".copilot", "skills")],
    mcp: [{ kind: "json", format: "mcpServers", file: H(".copilot", "mcp-config.json") }],
  },
  roo: { label: "Roo Code", detect: [H(".roo")], clean: [H(".roo", "skills")] },
  cline: { label: "Cline", detect: [H(".cline")], link: [H(".cline", "skills")] },
};

// Always cleaned, whatever hosts are picked: an old copy there is visible to several hosts at once.
export const ALWAYS_CLEAN = Object.values(HOSTS).flatMap((h) => h.clean || []);

export function detectHosts() {
  const found = {};
  for (const [id, h] of Object.entries(HOSTS)) found[id] = h.detect.some((p) => exists(p));
  return found;
}

// Which hosts read the canonical folder by themselves (for the summary line "codex, kilo… read it already").
export const NATIVE = ["codex", "gemini", "cursor", "opencode", "kilo", "windsurf", "copilot", "roo"];
export const isWindows = isWin;

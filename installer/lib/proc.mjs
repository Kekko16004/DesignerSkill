// Child processes and external repositories.
import { spawn, spawnSync } from "node:child_process";
import fs from "node:fs";
import path from "node:path";
import { isWin, exists, mkdirp, removeTree, STATE } from "./fsx.mjs";

// Run a command, stream its last line to `onLine`, resolve { code, out }. Never throws.
export function run(cmd, args = [], { cwd, onLine, env, timeout = 600000, shell } = {}) {
  return new Promise((resolve) => {
    let out = "";
    let child;
    try {
      child = spawn(cmd, args, { cwd, env: { ...process.env, ...env }, shell: shell ?? (isWin && /\.(cmd|bat)$/i.test(cmd)), windowsHide: true });
    } catch (e) { resolve({ code: -1, out: e.message }); return; }
    const timer = setTimeout(() => { try { child.kill(); } catch {} }, timeout);
    const feed = (b) => { const s = b.toString(); out += s; if (onLine) for (const l of s.split(/\r?\n/)) if (l.trim()) onLine(l.trim()); };
    child.stdout?.on("data", feed);
    child.stderr?.on("data", feed);
    child.on("error", (e) => { clearTimeout(timer); resolve({ code: -1, out: out + e.message }); });
    child.on("close", (code) => { clearTimeout(timer); resolve({ code: code ?? -1, out }); });
  });
}
export function runSync(cmd, args = [], opts = {}) {
  const r = spawnSync(cmd, args, { encoding: "utf8", windowsHide: true, shell: isWin && /\.(cmd|bat)$/i.test(cmd), timeout: 20000, ...opts });
  return { code: r.status ?? -1, out: ((r.stdout || "") + (r.stderr || "")).trim() };
}

// Resolve an executable on PATH (PATHEXT aware on Windows). Returns the full path or "".
export function which(name) {
  const exts = isWin ? (process.env.PATHEXT || ".EXE;.CMD;.BAT").split(";").map((e) => e.toLowerCase()) : [""];
  for (const dir of (process.env.PATH || "").split(path.delimiter)) {
    if (!dir) continue;
    for (const e of isWin && path.extname(name) ? [""] : exts) {
      const p = path.join(dir.replace(/^"|"$/g, ""), name + e);
      try { if (fs.statSync(p).isFile()) return p; } catch {}
    }
  }
  return "";
}
export function version(cmd, args = ["--version"]) {
  for (const name of [].concat(cmd)) { const v = versionOf(name, args); if (v) return v; }
  return "";
}
function versionOf(cmd, args) {
  const p = which(cmd);
  if (!p) return "";
  const r = runSync(p, args);
  const m = /(\d+\.\d+(\.\d+)?)/.exec(r.out);
  return r.code === 0 && m ? m[1] : r.code === 0 ? "ok" : "";
}
export const cmp = (a, b) => {
  const pa = String(a).split(".").map(Number), pb = String(b).split(".").map(Number);
  for (let i = 0; i < 3; i++) { const d = (pa[i] || 0) - (pb[i] || 0); if (d) return Math.sign(d); }
  return 0;
};

// ---------------------------------------------------------------- git repositories (always the latest of the tracked branch)
export const REPOS = path.join(STATE, "repos");
const git = (args, opts) => run(which("git") || "git", args, opts);
const gitSync = (args, cwd) => runSync(which("git") || "git", args, { cwd });

export function repoDirFor(url) {
  const name = url.replace(/\.git$/, "").split("/").slice(-2).join("--");
  return path.join(REPOS, name);
}
export function head(dir) {
  const r = gitSync(["rev-parse", "--short", "HEAD"], dir);
  return r.code === 0 ? r.out : "";
}
export function isDirty(dir) { const r = gitSync(["status", "--porcelain", "--untracked-files=no"], dir); return r.code === 0 && r.out.length > 0; }

// Clone or fast-forward `url` into `dir` and return { dir, before, after, changed, source }.
// Without git: download the default branch as a zip (GitHub) and unpack it with the OS tools.
export async function syncRepo(url, { dir = repoDirFor(url), branch, onLine } = {}) {
  mkdirp(path.dirname(dir));
  const hasGit = Boolean(which("git"));
  if (!hasGit) return syncZip(url, dir, branch, onLine);
  if (exists(path.join(dir, ".git"))) {
    const before = head(dir);
    const ref = branch || (await defaultBranch(dir));
    let r = await git(["-C", dir, "fetch", "--depth", "1", "--prune", "origin", ref], { onLine });
    if (r.code !== 0) return { dir, before, after: before, changed: false, error: lastLine(r.out) || "git fetch failed" };
    // managed clone: local edits are not expected; keep them in a stash rather than losing them
    if (isDirty(dir)) await git(["-C", dir, "stash", "push", "-m", "skillkit-autostash"], { onLine });
    r = await git(["-C", dir, "reset", "--hard", "FETCH_HEAD"], { onLine });
    if (r.code !== 0) return { dir, before, after: before, changed: false, error: lastLine(r.out) };
    const after = head(dir);
    return { dir, before, after, changed: before !== after, source: "git" };
  }
  if (exists(dir)) removeTree(dir);
  const args = ["clone", "--depth", "1", "--single-branch"];
  if (branch) args.push("--branch", branch);
  const r = await git([...args, url, dir], { onLine });
  if (r.code !== 0) return { dir, before: "", after: "", changed: false, error: lastLine(r.out) || "git clone failed" };
  return { dir, before: "", after: head(dir), changed: true, source: "git" };
}
async function defaultBranch(dir) {
  const r = gitSync(["symbolic-ref", "--short", "refs/remotes/origin/HEAD"], dir);
  if (r.code === 0 && r.out) return r.out.replace(/^origin\//, "");
  const b = gitSync(["rev-parse", "--abbrev-ref", "HEAD"], dir);
  return b.code === 0 && b.out && b.out !== "HEAD" ? b.out : "main";
}
const lastLine = (s) => String(s).trim().split(/\r?\n/).filter(Boolean).pop() || "";

async function syncZip(url, dir, branch, onLine) {
  const m = /github\.com[/:]([^/]+)\/([^/.]+)/.exec(url);
  if (!m) return { dir, error: "git is required for " + url };
  const zipUrl = `https://codeload.github.com/${m[1]}/${m[2]}/zip/refs/heads/${branch || "HEAD"}`;
  onLine?.(`download ${zipUrl}`);
  const res = await fetch(zipUrl).catch((e) => ({ ok: false, statusText: e.message }));
  if (!res.ok) return { dir, error: `download failed: ${res.statusText || res.status}` };
  const tmp = fs.mkdtempSync(path.join(STATE, "zip-"));
  const zip = path.join(tmp, "repo.zip");
  fs.writeFileSync(zip, Buffer.from(await res.arrayBuffer()));
  const r = isWin
    ? await run("powershell", ["-NoProfile", "-Command", `Expand-Archive -LiteralPath '${zip}' -DestinationPath '${tmp}' -Force`])
    : await run("unzip", ["-q", zip, "-d", tmp]);
  if (r.code !== 0) { removeTree(tmp); return { dir, error: "unzip failed" }; }
  const root = fs.readdirSync(tmp, { withFileTypes: true }).find((e) => e.isDirectory());
  if (exists(dir)) removeTree(dir);
  fs.renameSync(path.join(tmp, root.name), dir);
  removeTree(tmp);
  return { dir, before: "", after: "zip", changed: true, source: "zip" };
}

// Self update of the checkout the installer runs from.
export async function pullSelf(repoRoot, onLine) {
  if (!exists(path.join(repoRoot, ".git")) || !which("git")) return { skipped: true };
  const before = head(repoRoot);
  const r = await git(["-C", repoRoot, "pull", "--ff-only", "--recurse-submodules=no"], { onLine });
  const after = head(repoRoot);
  const log = before && after && before !== after ? gitSync(["log", "--oneline", "--no-decorate", `${before}..${after}`], repoRoot).out.split("\n").slice(0, 12) : [];
  return { before, after, changed: before !== after, error: r.code === 0 ? null : lastLine(r.out), log };
}

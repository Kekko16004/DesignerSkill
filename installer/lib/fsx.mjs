// File system helpers: links that never delete their target, mirrored copies, reversible backups.
import fs from "node:fs";
import path from "node:path";
import os from "node:os";

export const HOME = os.homedir();
export const isWin = process.platform === "win32";
export const STATE = process.env.SKILLKIT_HOME || path.join(HOME, ".agents", "skillkit");
export const tilde = (p) => (p && p.toLowerCase().startsWith(HOME.toLowerCase()) ? "~" + p.slice(HOME.length).replace(/\\/g, "/") : p);

export function lstat(p) { try { return fs.lstatSync(p); } catch { return null; } }
export const exists = (p) => Boolean(lstat(p));
export const isLink = (p) => Boolean(lstat(p)?.isSymbolicLink());   // junctions report as symlinks in Node
export function linkTarget(p) {
  try { return path.resolve(path.dirname(p), fs.readlinkSync(p)); } catch { return null; }
}
export function realpath(p) { try { return fs.realpathSync.native(p); } catch { return null; } }
export const samePath = (a, b) => Boolean(a && b) && path.resolve(a).toLowerCase().replace(/[\\/]+$/, "") === path.resolve(b).toLowerCase().replace(/[\\/]+$/, "");
export function sameReal(a, b) { const ra = realpath(a), rb = realpath(b); return Boolean(ra && rb) && samePath(ra, rb); }

export function mkdirp(p) { fs.mkdirSync(p, { recursive: true }); return p; }

// Remove a link without touching what it points to (rmdir on a junction, unlink on a symlink).
export function unlinkOnly(p) {
  const st = lstat(p);
  if (!st || !st.isSymbolicLink()) return false;
  try { fs.unlinkSync(p); } catch { fs.rmdirSync(p); }
  return true;
}

// Directory link: junction on Windows (no admin, no developer mode), symlink elsewhere.
export function link(target, p) {
  mkdirp(path.dirname(p));
  if (isLink(p)) unlinkOnly(p);
  fs.symlinkSync(path.resolve(target), p, isWin ? "junction" : "dir");
}

// Move a folder to the backup area instead of deleting it: every removal of user-visible content is reversible.
export function backup(p, reason = "replaced") {
  if (!exists(p)) return null;
  if (isLink(p)) { unlinkOnly(p); return null; }
  const stamp = new Date().toISOString().replace(/[:.]/g, "-").slice(0, 19);
  const rel = path.relative(HOME, p).replace(/[\\/:]+/g, "__");
  const dest = path.join(STATE, "backup", stamp, rel);
  mkdirp(path.dirname(dest));
  try { fs.renameSync(p, dest); }
  catch { fs.cpSync(p, dest, { recursive: true, force: true, verbatimSymlinks: true }); removeTree(p); }
  fs.writeFileSync(dest + ".why.txt", `${reason}\n${p}\n`);
  return dest;
}

const DEFAULT_IGNORE = new Set([".git", "node_modules", "__pycache__", ".variant-studio", ".playwright-mcp", ".DS_Store", "Thumbs.db", "desktop.ini"]);

// Copy src into dest so that dest ends up identical to src (minus ignored names).
// Built next to dest and swapped in; falls back to an in-place overwrite when the folder is locked (Windows).
export function mirror(src, dest, { ignore = [], keep = [] } = {}) {
  const skip = new Set([...DEFAULT_IGNORE, ...ignore.filter((x) => !x.includes("*"))]);
  // "*.bak" style patterns match a file or folder name anywhere in the tree
  const globs = ignore.filter((x) => x.includes("*")).map((x) => new RegExp("^" + x.replace(/[.+^${}()|[\]\\]/g, "\\$&").replace(/\*/g, ".*") + "$", "i"));
  const hit = (x) => skip.has(x) || globs.some((re) => re.test(x));
  const filter = (s) => {
    const rel = path.relative(src, s);
    if (!rel) return true;
    const parts = rel.split(path.sep);
    return !parts.some(hit) && !skip.has(rel.replace(/\\/g, "/"));
  };
  const tmp = dest + ".skillkit-new";
  removeTree(tmp);
  fs.cpSync(src, tmp, { recursive: true, filter, force: true, dereference: false, verbatimSymlinks: true });
  // carry over per-machine files that live only in the installed copy (config.json, styles link…)
  for (const k of keep) {
    const from = path.join(dest, k);
    if (exists(from) && !exists(path.join(tmp, k))) {
      if (isLink(from)) { const tg = linkTarget(from); if (tg) link(tg, path.join(tmp, k)); }
      else fs.cpSync(from, path.join(tmp, k), { recursive: true });
    }
  }
  if (isLink(dest)) unlinkOnly(dest);
  if (!exists(dest)) { fs.renameSync(tmp, dest); return "new"; }
  const old = dest + ".skillkit-old";
  removeTree(old);
  try {
    fs.renameSync(dest, old);
    fs.renameSync(tmp, dest);
    removeTree(old);
    return "swap";
  } catch {
    if (exists(old) && !exists(dest)) fs.renameSync(old, dest);
    // locked (an editor or a running server has a handle inside): overwrite in place, then prune extras
    fs.cpSync(tmp, dest, { recursive: true, force: true, verbatimSymlinks: true });
    prune(tmp, dest, skip, keep);
    removeTree(tmp);
    return "inplace";
  }
}
function prune(ref, dest, skip, keep) {
  for (const e of fs.readdirSync(dest, { withFileTypes: true })) {
    if (skip.has(e.name) || keep.includes(e.name)) continue;
    const r = path.join(ref, e.name), d = path.join(dest, e.name);
    if (!exists(r)) { try { removeTree(d); } catch { /* locked: leave it */ } }
    else if (e.isDirectory() && !e.isSymbolicLink()) prune(r, d, skip, []);
  }
}
// rmSync follows nothing, but make sure links inside are unlinked, never descended into
export function removeTree(p) {
  if (!exists(p)) return;
  if (isLink(p)) { unlinkOnly(p); return; }
  for (const e of fs.readdirSync(p, { withFileTypes: true })) {
    const q = path.join(p, e.name);
    if (e.isSymbolicLink()) unlinkOnly(q); else if (e.isDirectory()) removeTree(q); else rmFile(q);
  }
  fs.rmdirSync(p);
}

function rmFile(q) {
  try { fs.rmSync(q, { force: true }); }
  catch (e) { if (e.code !== "EPERM" && e.code !== "EACCES") throw e; fs.chmodSync(q, 0o666); fs.rmSync(q, { force: true }); }   // read-only git objects
}

// SKILL.md frontmatter name (null if the folder is not a skill)
export function skillName(dir) {
  try {
    const head = fs.readFileSync(path.join(dir, "SKILL.md"), "utf8").slice(0, 4000);
    const m = /^---\s*[\r\n]+([\s\S]*?)[\r\n]+---/.exec(head);
    const n = m && /^name:\s*["']?([^"'\r\n]+?)["']?\s*$/m.exec(m[1]);
    return n ? n[1].trim() : null;
  } catch { return null; }
}

export function readJson(p, fallback = null) {
  try { return JSON.parse(stripJsonc(fs.readFileSync(p, "utf8"))); } catch { return fallback; }
}
export function writeJson(p, data) {
  mkdirp(path.dirname(p));
  const tmp = p + ".tmp";
  fs.writeFileSync(tmp, JSON.stringify(data, null, 2) + "\n");
  fs.renameSync(tmp, p);
}
// JSONC → JSON: strips // and /* */ comments and trailing commas, respecting strings.
export function stripJsonc(s) {
  let out = "", i = 0, str = false;
  s = s.replace(/^﻿/, "");
  while (i < s.length) {
    const ch = s[i], nx = s[i + 1];
    if (str) { out += ch; if (ch === "\\") { out += nx ?? ""; i += 2; continue; } if (ch === '"') str = false; i++; continue; }
    if (ch === '"') { str = true; out += ch; i++; continue; }
    if (ch === "/" && nx === "/") { while (i < s.length && s[i] !== "\n") i++; continue; }
    if (ch === "/" && nx === "*") { i += 2; while (i < s.length && !(s[i] === "*" && s[i + 1] === "/")) i++; i += 2; continue; }
    out += ch; i++;
  }
  return out.replace(/,(\s*[}\]])/g, "$1");
}
export const hasComments = (s) => stripJsonc(s).replace(/\s/g, "") !== s.replace(/^﻿/, "").replace(/,(\s*[}\]])/g, "$1").replace(/\s/g, "");

#!/usr/bin/env node
// Updates this skill from wherever it is installed: finds the repo in the installer receipt
// (~/.agents/skillkit/<id>.json), clones it if it is gone, then runs `installer/install.mjs update`
// (git pull + every dependency to its latest + reinstall with the saved choices). Extra args are passed through.
import fs from "node:fs";
import path from "node:path";
import os from "node:os";
import { spawnSync } from "node:child_process";

const ID = "designer";
const REPO_URL = "https://github.com/Kekko16004/DesignerSkill.git";
const state = process.env.SKILLKIT_HOME || path.join(os.homedir(), ".agents", "skillkit");
let receipt = null;
try { receipt = JSON.parse(fs.readFileSync(path.join(state, `${ID}.json`), "utf8")); } catch {}

let repo = receipt?.repo && fs.existsSync(path.join(receipt.repo, "installer", "install.mjs")) ? receipt.repo : null;
if (!repo) {
  repo = path.join(state, "repos", REPO_URL.replace(/\.git$/, "").split("/").slice(-2).join("--"));
  if (!fs.existsSync(path.join(repo, "installer", "install.mjs"))) {
    fs.mkdirSync(path.dirname(repo), { recursive: true });
    const r = spawnSync("git", ["clone", "--depth", "1", REPO_URL, repo], { stdio: "inherit" });
    if (r.status !== 0) { console.error(`git clone ${REPO_URL} failed`); process.exit(1); }
  }
}
const r = spawnSync(process.execPath, [path.join(repo, "installer", "install.mjs"), "update", ...process.argv.slice(2)], { stdio: "inherit" });
process.exit(r.status ?? 1);

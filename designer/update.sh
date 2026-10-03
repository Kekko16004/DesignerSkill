#!/usr/bin/env bash
# One-click update of everything from GitHub (macOS / Linux twin of update.ps1):
#   1. git pull of this repo (the designer skill) + its Variant Studio submodule
#   2. Variant Studio to the latest upstream commit, transitions.dev via npx
#   3. reinstall the skill with the choices of the last install (install.sh --reuse), no questions
#
#   ./update.sh                          everything
#   ./update.sh --no-self                skip step 1 (only external components + reinstall)
#   ./update.sh --no-install             skip step 3
#   ./update.sh --studio-path ~/vs       a standalone Variant Studio folder other than ../variant-studio
set -u

SKILL_SRC="$(cd "$(dirname "$0")" && pwd -P)"
ROOT="$(dirname "$SKILL_SRC")"
STUDIO_PATH=""; NO_SELF=0; NO_INSTALL=0
while [ $# -gt 0 ]; do
  case "$1" in
    --no-self|-NoSelf) NO_SELF=1 ;;
    --no-install|-NoInstall) NO_INSTALL=1 ;;
    --studio-path|-StudioPath) STUDIO_PATH="${2/#\~/$HOME}"; shift ;;
    -h|--help) sed -n '2,10p' "$0"; exit 0 ;;
    *) echo "Unknown option: $1"; exit 1 ;;
  esac
  shift
done
have() { command -v "$1" >/dev/null 2>&1; }
HAS_GIT=0; have git && HAS_GIT=1

# ---------- 1. the skill itself ----------
if [ "$NO_SELF" = 0 ]; then
  echo "--- designer (this repo) ---"
  if [ "$HAS_GIT" = 0 ] || [ ! -d "$ROOT/.git" ]; then
    echo "Not a git clone: download the latest zip from GitHub or clone the repo to get updates."
  else
    before="$(git -C "$ROOT" rev-parse --short HEAD)"
    if ! git -C "$ROOT" pull --ff-only; then
      echo "WARN git pull failed (local changes or diverged branch). Fix it, then run update.sh again. Continuing with the local version."
    else
      after="$(git -C "$ROOT" rev-parse --short HEAD)"
      if [ "$before" = "$after" ]; then echo "Already up to date ($after)."
      else git -C "$ROOT" log --oneline "$before..$after" | head -15 | sed 's/^/  /'; fi
    fi
  fi
fi

# ---------- 2a. Variant Studio ----------
echo "--- Variant Studio ---"
if [ -n "$STUDIO_PATH" ]; then DIR="$STUDIO_PATH"; else DIR="$ROOT/variant-studio"; fi
IS_SUB=0
[ -z "$STUDIO_PATH" ] && [ -d "$ROOT/.git" ] && grep -q "path = variant-studio" "$ROOT/.gitmodules" 2>/dev/null && IS_SUB=1
if [ "$HAS_GIT" = 0 ]; then
  echo "git not found: the reinstall below downloads the latest tarball if the folder is missing."
else
  [ "$IS_SUB" = 1 ] && git -C "$ROOT" submodule update --init variant-studio
  if [ ! -e "$DIR/.git" ]; then
    echo "$DIR is not a git checkout: skipped."
  else
    before="$(git -C "$DIR" rev-parse --short HEAD)"
    if [ "$IS_SUB" = 1 ]; then git -C "$ROOT" submodule update --remote --merge variant-studio; else git -C "$DIR" pull --ff-only; fi
    if [ $? -ne 0 ]; then echo "WARN Variant Studio update failed."
    else
      after="$(git -C "$DIR" rev-parse --short HEAD)"
      if [ "$before" = "$after" ]; then echo "Already up to date ($after)."
      else
        echo "Variant Studio $before -> $after"
        git -C "$DIR" log --oneline "$before..$after" | head -15 | sed 's/^/  /'
      fi
    fi
  fi
fi

# ---------- 2b. transitions.dev (the reinstall below already refreshes it) ----------
if [ "$NO_INSTALL" = 1 ]; then
  echo "--- transitions.dev ---"
  LAST="${DESIGNER_HOME:-$HOME/.designer}/install.json"
  if [ -f "$LAST" ] && ! grep -q '"transitionsDev"' "$LAST"; then echo "Not selected at install: skipped."
  elif have npx; then npx --yes skills add Jakubantalik/transitions.dev -g -y
  else echo "npx not found: skipped."; fi
fi

# ---------- 3. reinstall with the same choices ----------
if [ "$NO_INSTALL" = 0 ]; then
  echo ""
  if [ -n "$STUDIO_PATH" ]; then bash "$SKILL_SRC/install.sh" --reuse --studio-path "$STUDIO_PATH"
  else bash "$SKILL_SRC/install.sh" --reuse; fi
fi

if have node; then
  where="$(node "$SKILL_SRC/scripts/studio.mjs" where 2>/dev/null)" &&
    echo "Variant Studio in use: $(echo "$where" | node -e 'let s="";process.stdin.on("data",d=>s+=d).on("end",()=>console.log(JSON.parse(s).path))')"
fi
echo "Update done. Restart the agents (and studio.mjs stop/start if a gallery was open)."

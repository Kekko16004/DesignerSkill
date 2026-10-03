#!/usr/bin/env bash
# designer - installer (macOS / Linux, bash 3.2+). Same behavior as install.ps1.
#
#   ./install.sh                                  interactive: hosts, dependencies/modules, sites
#   ./install.sh --all                            everything, no questions
#   ./install.sh --quiet                          recommended set, no questions
#   ./install.sh --hosts kilo,claude --skip-modules mcp21st --skip-sources aceternity,artStation
#   ./install.sh --studio-mode copy               copy Variant Studio instead of linking it
#   ./install.sh --studio-path ~/variant-studio   use your own standalone Variant Studio folder
#   ./install.sh --reuse                          repeat the last install's choices (~/.designer/install.json), no questions
#
# The skill is copied into each host's skills folder. External dependencies (dependencies.json) are fetched
# from GitHub only if you say yes; Variant Studio is symlinked to one standalone folder so update.sh
# updates every host at once.
set -eu

SKILL=designer
LEGACY_SKILL=real-world-design
SKILL_SRC="$(cd "$(dirname "$0")" && pwd -P)"
ROOT="$(dirname "$SKILL_SRC")"
STUDIO_REPO="https://github.com/Fonlogen/variant-studio"
DESIGNER_HOME="${DESIGNER_HOME:-$HOME/.designer}"
LAST_INSTALL="$DESIGNER_HOME/install.json"

ALL=0; QUIET=0; REUSE=0; HOSTS_ARG=""; SKIP_MODULES=""; SKIP_SOURCES=""; STUDIO_PATH=""; STUDIO_MODE=""
while [ $# -gt 0 ]; do
  case "$1" in
    --all|-All) ALL=1 ;;
    --quiet|-Quiet) QUIET=1 ;;
    --reuse|-Reuse) REUSE=1 ;;
    --hosts|-Hosts) HOSTS_ARG="$2"; shift ;;
    --skip-modules|-SkipModules) SKIP_MODULES="$2"; shift ;;
    --skip-sources|-SkipSources) SKIP_SOURCES="$2"; shift ;;
    --studio-path|-StudioPath) STUDIO_PATH="$2"; shift ;;
    --studio-mode|-StudioMode) STUDIO_MODE="$2"; shift ;;
    -h|--help) sed -n '2,15p' "$0"; exit 0 ;;
    *) echo "Unknown option: $1"; exit 1 ;;
  esac
  shift
done
case "$STUDIO_MODE" in ""|link|copy) ;; *) echo "--studio-mode must be link or copy"; exit 1 ;; esac

[ -f "$SKILL_SRC/SKILL.md" ] || { echo "FAIL: SKILL.md missing in $SKILL_SRC"; exit 1; }

have() { command -v "$1" >/dev/null 2>&1; }
# json_get FILE KEY -> one value per line (arrays) or the scalar; needs node
json_get() { have node && node -e 'try{const j=JSON.parse(require("fs").readFileSync(process.argv[1],"utf8"));const v=j[process.argv[2]];if(Array.isArray(v))v.forEach(x=>console.log(x));else if(v!=null)console.log(v)}catch{}' "$1" "$2"; }

# ---------- catalogs: id|recommended|label|skills dirs (:)|command dirs (:)|mcp ----------
HOST_CATALOG=(
  "claude|1|Claude Code|.claude/skills|.claude/commands|claude"
  "kilo|1|Kilo Code|.kilo/skills:.config/kilo/skills|.kilo/command:.kilo/commands:.config/kilo/command:.config/kilo/commands|kilo"
  "codex|1|Codex / agents|.codex/skills:.agents/skills|.codex/prompts|"
  "antigravity|1|Antigravity IDE|.gemini/antigravity/skills:.antigravity/skills||antigravity"
  "cursor|0|Cursor|.cursor/skills||cursor"
  "opencode|0|OpenCode|.config/opencode/skills|.config/opencode/command|"
  "copilot|0|GitHub Copilot|.copilot/skills||"
  "windsurf|0|Windsurf|.codeium/windsurf/skills||"
)
MODULE_CATALOG=(
  "variantStudio|1|Variant Studio        (GitHub: Fonlogen/variant-studio, linked standalone)"
  "transitionsDev|1|transitions.dev skill (GitHub: Jakubantalik/transitions.dev, via npx)"
  "mcp21st|1|21st.dev MCP          (component catalog, needs API_KEY_21ST)"
  "designCommand|1|/designer + /createstyle slash commands"
)
SOURCE_CATALOG=(
  "gameUiDatabase|1|Game UI Database  gameuidatabase.com"
  "interfaceInGame|1|Interface In Game  interfaceingame.com"
  "beautifulUi|1|Beautiful UI  beautifului.dev"
  "twentyFirst|1|21st.dev catalog"
  "aceternity|0|Aceternity UI  ui.aceternity.com"
  "componentGallery|1|Component Gallery  component.gallery"
  "gameIcons|1|game-icons.net"
  "artStation|0|ArtStation UI reels"
  "appStore|1|App Store / Play screenshots"
)

field() { echo "$1" | cut -d'|' -f"$2"; }
ids_of() { local e; for e in "$@"; do field "$e" 1; done; }
rec_of() { local e; for e in "$@"; do [ "$(field "$e" 2)" = 1 ] && field "$e" 1; done; return 0; }
host_entry() { local e; for e in "${HOST_CATALOG[@]}"; do [ "$(field "$e" 1)" = "$1" ] && { echo "$e"; return 0; }; done; return 1; }
contains() { local x="$1"; shift; local e; for e in "$@"; do [ "$e" = "$x" ] && return 0; done; return 1; }
split_list() { echo "$1" | tr ', ' '\n\n' | sed '/^$/d'; }
uniq_lines() { awk 'NF && !seen[$0]++'; }

# read_pick TITLE ALLOW_EMPTY entries... -> picked ids on stdout (prompt on the terminal)
read_pick() {
  local title="$1" allow_empty="$2"; shift 2
  local ids=() i=1 e mark raw tok out=""
  for e in "$@"; do ids+=("$(field "$e" 1)"); done
  {
    echo ""; echo "$title"
    echo "  numbers + Enter  |  all  |  none  |  Enter = recommended (*)"
    for e in "$@"; do
      mark=" "; [ "$(field "$e" 2)" = 1 ] && mark="*"
      printf "  [%d]%s %s\n" "$i" "$mark" "$(field "$e" 3)"; i=$((i + 1))
    done
    printf "Select: "
  } > /dev/tty
  IFS= read -r raw < /dev/tty || raw=""
  raw="$(echo "$raw" | tr '[:upper:]' '[:lower:]' | sed 's/^ *//;s/ *$//')"
  if [ -z "$raw" ]; then rec_of "$@"; return; fi
  if [ "$raw" = all ]; then printf '%s\n' "${ids[@]}"; return; fi
  if [ "$raw" = none ]; then
    [ "$allow_empty" = 1 ] && return
    echo "Need at least one. Using recommended." > /dev/tty; rec_of "$@"; return
  fi
  for tok in $(echo "$raw" | tr ',' ' '); do
    case "$tok" in
      *[!0-9]*) for e in "${ids[@]}"; do [ "$(echo "$e" | tr '[:upper:]' '[:lower:]')" = "$tok" ] && out="$out$e"$'\n'; done ;;
      *) [ "$tok" -ge 1 ] && [ "$tok" -le "${#ids[@]}" ] && out="$out${ids[$((tok - 1))]}"$'\n' ;;
    esac
  done
  out="$(printf '%s' "$out" | uniq_lines)"
  if [ -z "$out" ]; then echo "Nothing matched. Using recommended." > /dev/tty; rec_of "$@"; return; fi
  echo "$out"
}

is_skill() { [ -f "$1/SKILL.md" ] && grep -Eq "^name:[[:space:]]*$2[[:space:]]*$" "$1/SKILL.md"; }

copy_skill_to() {
  local dest="$1" f rel
  if [ -e "$dest" ] && [ ! -L "$dest" ] && ! is_skill "$dest" "$SKILL"; then
    echo "SKIP     $dest exists and is not the $SKILL skill"; return 1
  fi
  [ -L "$dest" ] && rm -f "$dest"
  mkdir -p "$dest"
  for f in "$SKILL_SRC"/* "$SKILL_SRC"/.[!.]*; do
    [ -e "$f" ] || continue
    case "$(basename "$f")" in config.json|styles) continue ;; esac
    rm -rf "$dest/$(basename "$f")"
    cp -R "$f" "$dest/"
  done
  # leftovers from older versions (embedded Variant Studio 1.x, visual companion, /design)
  for rel in scripts/visual-companion scripts/ui assets/demo-round references/studio-manifest.md \
      references/studio-platforms.md references/studio-frameworks.md command/design.md update-studio.ps1 update-studio.bat; do
    rm -rf "$dest/$rel" 2>/dev/null || echo "WARN locked leftover $dest/$rel"
  done
  # shared global style store, visible from every installed copy
  if [ ! -e "$dest/styles" ]; then
    mkdir -p "$DESIGNER_HOME/styles"
    ln -s "$DESIGNER_HOME/styles" "$dest/styles"
  fi
  echo "OK skill $dest"
}

remove_legacy() {
  local old="$1/$LEGACY_SKILL"
  if [ -e "$old" ] && is_skill "$old" "$LEGACY_SKILL"; then
    rm -rf "$old" && echo "OK removed old $old" || echo "WARN could not remove old $old"
  fi
}

copy_commands() {
  local dest="$1" c
  mkdir -p "$dest"
  for c in designer.md createstyle.md; do cp -f "$SKILL_SRC/command/$c" "$dest/$c"; done
  # the old /design command conflicted with Claude Code; remove it only if it is ours
  [ -f "$dest/design.md" ] && grep -q "$LEGACY_SKILL" "$dest/design.md" && rm -f "$dest/design.md"
  echo "OK cmd   $dest (designer, createstyle)"
}

# ---------- Variant Studio (standalone) ----------
get_studio_source() {
  [ -f "$STUDIO_DIR/scripts/studio.mjs" ] && { echo "$STUDIO_DIR"; return 0; }
  if have git && [ -z "$STUDIO_PATH" ] && [ -d "$ROOT/.git" ] && [ -f "$ROOT/.gitmodules" ]; then
    git -C "$ROOT" submodule update --init variant-studio >&2 || true
  fi
  [ -f "$STUDIO_DIR/scripts/studio.mjs" ] && { echo "$STUDIO_DIR"; return 0; }
  if have git; then
    rmdir "$STUDIO_DIR" 2>/dev/null || true
    git clone --depth 1 "$STUDIO_REPO" "$STUDIO_DIR" >&2 || true
  else
    echo "git not found: downloading Variant Studio from GitHub (tar.gz)" >&2
    mkdir -p "$STUDIO_DIR"
    curl -fsSL "https://codeload.github.com/Fonlogen/variant-studio/tar.gz/refs/heads/main" \
      | tar -xz -C "$STUDIO_DIR" --strip-components 1 >&2 || echo "WARN download failed" >&2
  fi
  [ -f "$STUDIO_DIR/scripts/studio.mjs" ] && { echo "$STUDIO_DIR"; return 0; }
  return 1
}

install_studio_to() {
  local parent="$1" src="$2" dst="$1/variant-studio" f
  if [ -e "$dst" ] || [ -L "$dst" ]; then
    if [ -L "$dst" ]; then rm -f "$dst"
    elif is_skill "$dst" variant-studio; then rm -rf "$dst"
    else echo "SKIP     $dst exists and is not Variant Studio"; return; fi
  fi
  mkdir -p "$parent"
  if [ "$STUDIO_MODE" = link ]; then
    ln -s "$src" "$dst"; echo "OK link  $dst -> $src"
  else
    mkdir -p "$dst"
    for f in "$src"/* "$src"/.[!.]*; do
      [ -e "$f" ] || continue
      case "$(basename "$f")" in .git|.variant-studio|node_modules|install.sh|install.ps1|install.cmd) continue ;; esac
      cp -R "$f" "$dst/"
    done
    echo "OK copy  $dst"
  fi
}

# ---------- choose ----------
if [ "$REUSE" = 1 ]; then
  if [ -f "$LAST_INSTALL" ] && have node; then
    [ -z "$STUDIO_MODE" ] && STUDIO_MODE="$(json_get "$LAST_INSTALL" studioMode)"
    [ -z "$STUDIO_PATH" ] && STUDIO_PATH="$(json_get "$LAST_INSTALL" studioPath)"
  else
    echo "No previous install found ($LAST_INSTALL): using the recommended set."
    REUSE=0; QUIET=1
  fi
fi
[ -z "$STUDIO_MODE" ] && STUDIO_MODE=link
if [ -n "$STUDIO_PATH" ]; then
  STUDIO_PATH="${STUDIO_PATH/#\~/$HOME}"
  mkdir -p "$STUDIO_PATH" 2>/dev/null || true
  STUDIO_DIR="$(cd "$STUDIO_PATH" && pwd -P)"
else
  STUDIO_DIR="$ROOT/variant-studio"
fi

echo ""
echo "=== designer installer ==="
echo "Source: $SKILL_SRC"

if [ "$REUSE" = 1 ]; then
  PICKED_HOSTS="$(json_get "$LAST_INSTALL" hosts)"
  PICKED_MODULES="$(json_get "$LAST_INSTALL" modules)"
  PICKED_SOURCES="$(json_get "$LAST_INSTALL" sources)"
  echo "Reusing the choices of the last install ($LAST_INSTALL)"
elif [ "$ALL" = 1 ]; then
  PICKED_HOSTS="$(ids_of "${HOST_CATALOG[@]}")"; PICKED_MODULES="$(ids_of "${MODULE_CATALOG[@]}")"; PICKED_SOURCES="$(ids_of "${SOURCE_CATALOG[@]}")"
elif [ "$QUIET" = 1 ] || [ -n "$HOSTS_ARG" ]; then
  if [ -n "$HOSTS_ARG" ]; then PICKED_HOSTS="$(split_list "$HOSTS_ARG")"; else PICKED_HOSTS="$(rec_of "${HOST_CATALOG[@]}")"; fi
  PICKED_MODULES="$(rec_of "${MODULE_CATALOG[@]}")"; PICKED_SOURCES="$(rec_of "${SOURCE_CATALOG[@]}")"
else
  PICKED_HOSTS="$(read_pick "Hosts (where to install the skill)" 0 "${HOST_CATALOG[@]}")"
  PICKED_MODULES="$(read_pick "External dependencies and modules (downloaded from GitHub when selected)" 1 "${MODULE_CATALOG[@]}")"
  PICKED_SOURCES="$(read_pick "Sites the skill may open during reverse engineering" 1 "${SOURCE_CATALOG[@]}")"
fi
if [ -n "$SKIP_MODULES" ]; then PICKED_MODULES="$(echo "$PICKED_MODULES" | grep -vxF "$(split_list "$SKIP_MODULES")" || true)"; fi
if [ -n "$SKIP_SOURCES" ]; then PICKED_SOURCES="$(echo "$PICKED_SOURCES" | grep -vxF "$(split_list "$SKIP_SOURCES")" || true)"; fi

HOSTS=()
for h in $(echo "$PICKED_HOSTS" | sed 's/^github$/copilot/' | uniq_lines); do host_entry "$h" >/dev/null && HOSTS+=("$h"); done
[ "${#HOSTS[@]}" -gt 0 ] || { echo "No hosts selected. Abort."; exit 1; }
MODULES=(); for m in $PICKED_MODULES; do MODULES+=("$m"); done
SOURCES=(); for s in $PICKED_SOURCES; do SOURCES+=("$s"); done
mod() { [ "${#MODULES[@]}" -gt 0 ] && contains "$1" "${MODULES[@]}"; }

js_arr() { local out="" x; for x in "$@"; do out="$out${out:+, }\"$x\""; done; echo "[$out]"; }
js_bool() { if "$@"; then echo true; else echo false; fi; }
js_str() { if [ -n "$1" ]; then printf '"%s"' "$(echo "$1" | sed 's/\\/\\\\/g; s/"/\\"/g')"; else echo null; fi; }

# remembered for `install.sh --reuse` / update.sh
mkdir -p "$DESIGNER_HOME"
cat > "$LAST_INSTALL" <<EOF
{
  "hosts": $(js_arr "${HOSTS[@]}"),
  "modules": $(js_arr ${MODULES[@]+"${MODULES[@]}"}),
  "sources": $(js_arr ${SOURCES[@]+"${SOURCES[@]}"}),
  "studioMode": "$STUDIO_MODE",
  "studioPath": $(js_str "$STUDIO_PATH"),
  "repo": $(js_str "$ROOT"),
  "date": "$(date +%Y-%m-%dT%H:%M:%S)"
}
EOF

echo ""
echo "Hosts:        $(echo "${HOSTS[*]}" | sed 's/ /, /g')"
echo "Modules:      $(echo ${MODULES[@]+"${MODULES[*]}"} | sed 's/ /, /g')"
echo "Sources:      $(echo ${SOURCES[@]+"${SOURCES[*]}"} | sed 's/ /, /g')"
echo "Styles store: $DESIGNER_HOME"

PARENTS="$(for h in "${HOSTS[@]}"; do field "$(host_entry "$h")" 4 | tr ':' '\n'; done | uniq_lines)"
CMD_DIRS="$(for h in "${HOSTS[@]}"; do field "$(host_entry "$h")" 5 | tr ':' '\n'; done | uniq_lines)"

# ---------- Variant Studio ----------
STUDIO_CFG_PATH=""; COMPANION=false
if mod variantStudio; then
  echo ""
  echo "--- Variant Studio (standalone, $STUDIO_MODE) ---"
  if STUDIO_SRC="$(get_studio_source)"; then
    COMPANION=true
    [ "$STUDIO_MODE" = link ] && STUDIO_CFG_PATH="$STUDIO_SRC"
    for p in $PARENTS; do install_studio_to "$HOME/$p" "$STUDIO_SRC"; done
  else
    echo "WARN Variant Studio not installed; the skill falls back to mock + Playwright."
  fi
fi

TWENTY_FIRST=1; mod mcp21st || TWENTY_FIRST=0
sources_json() {
  local e id first=1 v
  for e in "${SOURCE_CATALOG[@]}"; do
    id="$(field "$e" 1)"; v=false
    [ "${#SOURCES[@]}" -gt 0 ] && contains "$id" "${SOURCES[@]}" && v=true
    [ "$id" = twentyFirst ] && [ "$TWENTY_FIRST" = 0 ] && v=false
    [ $first = 1 ] || printf ',\n'; first=0
    printf '    "%s": %s' "$id" "$v"
  done
}
write_config() {
  cat > "$1/config.json" <<EOF
{
  "version": 2,
  "hosts": $(js_arr "${HOSTS[@]}"),
  "modules": {
    "variantStudio": $(js_bool mod variantStudio),
    "designCommand": $(js_bool mod designCommand),
    "mcp21st": $(js_bool mod mcp21st),
    "transitionsDev": $(js_bool mod transitionsDev)
  },
  "sources": {
$(sources_json)
  },
  "companion": { "enabled": $COMPANION, "maxVariants": 8, "askBeforeOpen": false },
  "variantStudio": { "path": $(js_str "$STUDIO_CFG_PATH"), "repo": "$STUDIO_REPO" },
  "styles": { "home": $(js_str "$DESIGNER_HOME") }
}
EOF
}

# ---------- skill ----------
echo ""
echo "--- $SKILL skill ---"
mkdir -p "$DESIGNER_HOME/styles" "$DESIGNER_HOME/library"
for p in $PARENTS; do
  remove_legacy "$HOME/$p"
  if copy_skill_to "$HOME/$p/$SKILL"; then write_config "$HOME/$p/$SKILL"; fi
done
if mod designCommand; then
  for c in $CMD_DIRS; do copy_commands "$HOME/$c"; done
fi

# ---------- MCP ----------
if mod mcp21st; then
  echo ""
  echo "--- MCP 21st (no secret written unless already in env) ---"
  if ! have node && ! have claude; then
    echo "WARN node not found: MCP 21st skipped (install Node.js 18+ and run install.sh again)."
  else
    mcp() { node "$SKILL_SRC/install-mcp.mjs" "$@" || true; }
    for h in "${HOSTS[@]}"; do
      case "$(field "$(host_entry "$h")" 6)" in
        claude)
          if have claude; then
            if claude mcp list 2>/dev/null | grep -Eq '^21st([^[:alnum:]_-]|$)'; then echo "MCP 21st already in Claude Code"
            else
              KEY="${API_KEY_21ST:-}"; [ -n "$KEY" ] || KEY='${API_KEY_21ST}'
              claude mcp add-json 21st "{\"type\":\"http\",\"url\":\"https://21st.dev/api/mcp\",\"headers\":{\"x-api-key\":\"$KEY\"}}" -s user || true
            fi
          else mcp --claude; fi ;;
        kilo)
          kj="$HOME/.config/kilo/kilo.json"; kjc="$HOME/.config/kilo/kilo.jsonc"
          [ -f "$kjc" ] && mcp --kilo "$kjc"
          if [ -f "$kj" ] || [ ! -f "$kjc" ]; then mcp --kilo "$kj"; fi ;;
        cursor) mcp --generic "$HOME/.cursor/mcp.json" ;;
        antigravity)
          mcp --generic "$HOME/.gemini/antigravity/mcp.json"
          mcp --generic "$HOME/.antigravity/mcp_config.json" ;;
      esac
    done
  fi
fi

# ---------- transitions.dev ----------
if mod transitionsDev; then
  echo ""
  echo "--- transitions.dev ---"
  if have npx; then npx --yes skills add Jakubantalik/transitions.dev -g -y || echo "WARN transitions.dev install failed"
  else echo "npx not found. Later: npx skills add Jakubantalik/transitions.dev -g -y"; fi
fi

echo ""
if ! have node; then
  if [ "$(uname)" = Darwin ]; then echo "WARN Node.js 18+ not found: scripts and Variant Studio need it (brew install node, or https://nodejs.org)."
  else echo "WARN Node.js 18+ not found: scripts and Variant Studio need it (https://nodejs.org)."; fi
fi
if mod mcp21st; then
  echo "21st key (installer never writes secrets): add to ~/.zshrc  export API_KEY_21ST=\"your_key\"   https://21st.dev/settings/api-keys"
  [ "$(uname)" = Darwin ] && echo "  apps opened from the Dock/Finder also need: launchctl setenv API_KEY_21ST \"your_key\""
fi
echo "Update external components later with: ./update.sh"
echo "Restart the selected hosts. Use: /designer [style] <request>   /createstyle [name] [description]"
echo "Done."

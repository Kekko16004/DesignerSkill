<#
  designer - installer (Windows PowerShell 5.1+ / pwsh)

    install.bat                                   interactive: hosts, dependencies/modules, sites
    install.bat -All                              everything, no questions
    install.bat -Quiet                            recommended set, no questions
    install.bat -Hosts kilo,claude -SkipModules mcp21st -SkipSources aceternity,artStation
    install.bat -StudioMode copy                  copy Variant Studio instead of linking it
    install.bat -StudioPath D:\variant-studio     use your own standalone Variant Studio folder

  The skill is copied into each host's skills folder. External dependencies (dependencies.json) are fetched
  from GitHub only if you say yes; Variant Studio is linked (junction) to one standalone folder so update.bat
  updates every host at once.
#>
param(
  [switch]$All,
  [switch]$Quiet,
  [string[]]$Hosts,
  [string[]]$SkipModules,
  [string[]]$SkipSources,
  [string]$StudioPath,
  [ValidateSet("link", "copy")]
  [string]$StudioMode = "link"
)

$ErrorActionPreference = "Stop"
$Skill = "designer"
$LegacySkill = "real-world-design"
$SkillSrc = Split-Path -Parent $MyInvocation.MyCommand.Path
$Root = Split-Path -Parent $SkillSrc
$User = $env:USERPROFILE
$McpScript = Join-Path $SkillSrc "install-mcp.ps1"
$StudioRepo = "https://github.com/Fonlogen/variant-studio"
$StudioDir = if ($StudioPath) { [IO.Path]::GetFullPath($StudioPath) } else { Join-Path $Root "variant-studio" }
$DesignerHome = if ($env:DESIGNER_HOME) { $env:DESIGNER_HOME } else { Join-Path $User ".designer" }

if (-not (Test-Path -LiteralPath (Join-Path $SkillSrc "SKILL.md"))) { Write-Host "FAIL: SKILL.md missing in $SkillSrc"; exit 1 }

# Skills = parent folders that receive both `designer` and `variant-studio` (same set for both: unified paths).
# Cmd = folders that receive /designer and /createstyle.
$hostCatalog = [ordered]@{
  claude      = @{ Label = "Claude Code";     Recommended = $true;  Skills = @("$User\.claude\skills"); Cmd = @("$User\.claude\commands"); Mcp = "claude" }
  kilo        = @{ Label = "Kilo Code";       Recommended = $true;  Skills = @("$User\.kilo\skills", "$User\.config\kilo\skills"); Cmd = @("$User\.kilo\command", "$User\.kilo\commands", "$User\.config\kilo\command", "$User\.config\kilo\commands"); Mcp = "kilo" }
  codex       = @{ Label = "Codex / agents";  Recommended = $true;  Skills = @("$User\.codex\skills", "$User\.agents\skills"); Cmd = @("$User\.codex\prompts"); Mcp = $null }
  antigravity = @{ Label = "Antigravity IDE"; Recommended = $true;  Skills = @("$User\.gemini\antigravity\skills", "$User\.antigravity\skills"); Cmd = @(); Mcp = "antigravity" }
  cursor      = @{ Label = "Cursor";          Recommended = $false; Skills = @("$User\.cursor\skills"); Cmd = @(); Mcp = "cursor" }
  opencode    = @{ Label = "OpenCode";        Recommended = $false; Skills = @("$User\.config\opencode\skills"); Cmd = @("$User\.config\opencode\command"); Mcp = $null }
  copilot     = @{ Label = "GitHub Copilot";  Recommended = $false; Skills = @("$User\.copilot\skills"); Cmd = @(); Mcp = $null }
  windsurf    = @{ Label = "Windsurf";        Recommended = $false; Skills = @("$User\.codeium\windsurf\skills"); Cmd = @(); Mcp = $null }
}

$moduleCatalog = [ordered]@{
  variantStudio  = @{ Label = "Variant Studio        (GitHub: Fonlogen/variant-studio, linked standalone)"; Recommended = $true }
  transitionsDev = @{ Label = "transitions.dev skill (GitHub: Jakubantalik/transitions.dev, via npx)";   Recommended = $true }
  mcp21st        = @{ Label = "21st.dev MCP          (component catalog, needs API_KEY_21ST)";            Recommended = $true }
  designCommand  = @{ Label = "/designer + /createstyle slash commands";                                  Recommended = $true }
}

$sourceCatalog = [ordered]@{
  gameUiDatabase   = @{ Label = "Game UI Database  gameuidatabase.com"; Recommended = $true }
  interfaceInGame  = @{ Label = "Interface In Game  interfaceingame.com"; Recommended = $true }
  beautifulUi      = @{ Label = "Beautiful UI  beautifului.dev"; Recommended = $true }
  twentyFirst      = @{ Label = "21st.dev catalog"; Recommended = $true }
  aceternity       = @{ Label = "Aceternity UI  ui.aceternity.com"; Recommended = $false }
  componentGallery = @{ Label = "Component Gallery  component.gallery"; Recommended = $true }
  gameIcons        = @{ Label = "game-icons.net"; Recommended = $true }
  artStation       = @{ Label = "ArtStation UI reels"; Recommended = $false }
  appStore         = @{ Label = "App Store / Play screenshots"; Recommended = $true }
}

function Read-Pick {
  param([string]$Title, [System.Collections.Specialized.OrderedDictionary]$Catalog, [string[]]$DefaultIds, [switch]$AllowEmpty)
  $ids = @($Catalog.Keys)
  Write-Host ""
  Write-Host $Title
  Write-Host "  numbers + Enter  |  all  |  none  |  Enter = recommended (*)"
  for ($i = 0; $i -lt $ids.Count; $i++) {
    $mark = if ($Catalog[$ids[$i]].Recommended) { "*" } else { " " }
    Write-Host ("  [{0}]{1} {2}" -f ($i + 1), $mark, $Catalog[$ids[$i]].Label)
  }
  $raw = Read-Host "Select"
  if ([string]::IsNullOrWhiteSpace($raw)) { return @($DefaultIds) }
  $t = $raw.Trim().ToLowerInvariant()
  if ($t -eq "all") { return @($ids) }
  if ($t -eq "none") { if ($AllowEmpty) { return @() }; Write-Host "Need at least one. Using recommended."; return @($DefaultIds) }
  $picked = New-Object System.Collections.Generic.List[string]
  foreach ($tok in ($raw -split '[,\s]+' | Where-Object { $_ })) {
    $n = 0
    if ([int]::TryParse($tok, [ref]$n) -and $n -ge 1 -and $n -le $ids.Count) { $picked.Add($ids[$n - 1]) }
    elseif ($Catalog.Contains($tok)) { $picked.Add($tok) }
  }
  $uniq = @($picked | Select-Object -Unique)
  if ($uniq.Count -eq 0) { Write-Host "Nothing matched. Using recommended."; return @($DefaultIds) }
  return $uniq
}

function Test-IsLink([string]$p) { $i = Get-Item -LiteralPath $p -Force -ErrorAction SilentlyContinue; return ($i -and $i.LinkType) }
function Remove-LinkOrDir([string]$p) {
  if (Test-IsLink $p) { [IO.Directory]::Delete($p, $false) } else { Remove-Item -LiteralPath $p -Recurse -Force }
}
function Test-SkillName([string]$dir, [string]$name) {
  $s = Join-Path $dir "SKILL.md"
  return (Test-Path -LiteralPath $s) -and [bool](Select-String -LiteralPath $s -Pattern "^name:\s*$([regex]::Escape($name))\s*$" -Quiet)
}

function Copy-SkillTo([string]$Dest) {
  if ((Test-Path -LiteralPath $Dest) -and -not (Test-IsLink $Dest) -and -not (Test-SkillName $Dest $Skill)) {
    Write-Host "SKIP     $Dest exists and is not the $Skill skill"
    return $false
  }
  New-Item -ItemType Directory -Force -Path $Dest | Out-Null
  $skip = @("config.json", "styles")
  Get-ChildItem -LiteralPath $SkillSrc -Force | Where-Object { $skip -notcontains $_.Name } | ForEach-Object {
    Copy-Item -LiteralPath $_.FullName -Destination $Dest -Recurse -Force
  }
  # leftovers from older versions (embedded Variant Studio 1.x, visual companion, /design)
  foreach ($rel in @("scripts\visual-companion", "scripts\ui", "assets\demo-round", "references\studio-manifest.md",
      "references\studio-platforms.md", "references\studio-frameworks.md", "command\design.md", "update-studio.ps1", "update-studio.bat")) {
    $lp = Join-Path $Dest $rel
    if (Test-Path -LiteralPath $lp) { try { Remove-Item -LiteralPath $lp -Recurse -Force } catch { Write-Host "WARN locked leftover $lp" } }
  }
  # shared global style store, visible from every installed copy
  $link = Join-Path $Dest "styles"
  if (-not (Test-Path -LiteralPath $link)) {
    New-Item -ItemType Directory -Force -Path (Join-Path $DesignerHome "styles") | Out-Null
    New-Item -ItemType Junction -Path $link -Target (Join-Path $DesignerHome "styles") | Out-Null
  }
  Write-Host "OK skill $Dest"
  return $true
}

function Remove-Legacy([string]$Parent) {
  $old = Join-Path $Parent $LegacySkill
  if ((Test-Path -LiteralPath $old) -and (Test-SkillName $old $LegacySkill)) {
    try { Remove-LinkOrDir $old; Write-Host "OK removed old $old" } catch { Write-Host "WARN could not remove old $old" }
  }
}

function Write-Config([string]$Dest, $cfg) {
  [System.IO.File]::WriteAllText((Join-Path $Dest "config.json"), ($cfg | ConvertTo-Json -Depth 8).TrimEnd() + "`n", (New-Object System.Text.UTF8Encoding $false))
}

function Copy-Commands([string]$Dest) {
  New-Item -ItemType Directory -Force -Path $Dest | Out-Null
  foreach ($c in @("designer.md", "createstyle.md")) {
    Copy-Item -LiteralPath (Join-Path $SkillSrc "command\$c") -Destination (Join-Path $Dest $c) -Force
  }
  # the old /design command conflicted with Claude Code; remove it only if it is ours
  $old = Join-Path $Dest "design.md"
  if ((Test-Path -LiteralPath $old) -and (Select-String -LiteralPath $old -Pattern $LegacySkill -Quiet)) { Remove-Item -LiteralPath $old -Force }
  Write-Host "OK cmd   $Dest (designer, createstyle)"
}

# ---------- Variant Studio (standalone) ----------
function Get-StudioSource {
  if (Test-Path -LiteralPath (Join-Path $StudioDir "scripts\studio.mjs")) { return $StudioDir }
  $git = Get-Command git -ErrorAction SilentlyContinue
  if ($git -and -not $StudioPath -and (Test-Path -LiteralPath (Join-Path $Root ".gitmodules"))) {
    & git -C $Root submodule update --init variant-studio 2>&1 | Out-Host
  } elseif ($git) {
    & git clone --depth 1 $StudioRepo $StudioDir 2>&1 | Out-Host
  } else {
    Write-Host "git not found: downloading Variant Studio from GitHub (zip)"
    $tmp = Join-Path ([IO.Path]::GetTempPath()) ("vs-" + [guid]::NewGuid().ToString("N"))
    New-Item -ItemType Directory -Path $tmp | Out-Null
    try {
      [Net.ServicePointManager]::SecurityProtocol = [Net.ServicePointManager]::SecurityProtocol -bor [Net.SecurityProtocolType]::Tls12
      Invoke-WebRequest -Uri "https://codeload.github.com/Fonlogen/variant-studio/zip/refs/heads/main" -OutFile (Join-Path $tmp "vs.zip") -UseBasicParsing
      Expand-Archive -LiteralPath (Join-Path $tmp "vs.zip") -DestinationPath $tmp -Force
      $src = (Get-ChildItem -LiteralPath $tmp -Directory | Select-Object -First 1).FullName
      New-Item -ItemType Directory -Force -Path $StudioDir | Out-Null
      Copy-Item -Path (Join-Path $src "*") -Destination $StudioDir -Recurse -Force
    } catch { Write-Host "WARN download failed: $($_.Exception.Message)" }
    finally { Remove-Item -LiteralPath $tmp -Recurse -Force -ErrorAction SilentlyContinue }
  }
  if (Test-Path -LiteralPath (Join-Path $StudioDir "scripts\studio.mjs")) { return $StudioDir }
  return $null
}

function Install-StudioTo([string]$Parent, [string]$Src) {
  $dst = Join-Path $Parent "variant-studio"
  if ((Test-Path -LiteralPath $dst) -or (Test-IsLink $dst)) {
    if ((Test-IsLink $dst) -or (Test-SkillName $dst "variant-studio")) { Remove-LinkOrDir $dst }
    else { Write-Host "SKIP     $dst exists and is not Variant Studio"; return }
  }
  New-Item -ItemType Directory -Force -Path $Parent | Out-Null
  if ($StudioMode -eq "link") {
    New-Item -ItemType Junction -Path $dst -Target $Src | Out-Null
    Write-Host "OK link  $dst -> $Src"
  } else {
    New-Item -ItemType Directory -Force -Path $dst | Out-Null
    $skip = @(".git", ".variant-studio", "node_modules", "install.sh", "install.ps1", "install.cmd")
    Get-ChildItem -LiteralPath $Src -Force | Where-Object { $skip -notcontains $_.Name } | ForEach-Object { Copy-Item -LiteralPath $_.FullName -Destination $dst -Recurse -Force }
    Write-Host "OK copy  $dst"
  }
}

# ---------- choose ----------
$recHosts = @($hostCatalog.Keys | Where-Object { $hostCatalog[$_].Recommended })
$recModules = @($moduleCatalog.Keys | Where-Object { $moduleCatalog[$_].Recommended })
$recSources = @($sourceCatalog.Keys | Where-Object { $sourceCatalog[$_].Recommended })

Write-Host ""
Write-Host "=== designer installer ==="
Write-Host "Source: $SkillSrc"

$split = { param($arr) @($arr | ForEach-Object { $_ -split ',' } | ForEach-Object { $_.Trim() } | Where-Object { $_ }) }
if ($All) {
  $pickedHosts = @($hostCatalog.Keys); $pickedModules = @($moduleCatalog.Keys); $pickedSources = @($sourceCatalog.Keys)
} elseif ($Quiet -or $Hosts) {
  $pickedHosts = if ($Hosts) { & $split $Hosts } else { @($recHosts) }
  $pickedModules = @($recModules); $pickedSources = @($recSources)
} else {
  $pickedHosts = Read-Pick "Hosts (where to install the skill)" $hostCatalog $recHosts
  $pickedModules = Read-Pick "External dependencies and modules (downloaded from GitHub when selected)" $moduleCatalog $recModules -AllowEmpty
  $pickedSources = Read-Pick "Sites the skill may open during reverse engineering" $sourceCatalog $recSources -AllowEmpty
}
if ($SkipModules) { $s = & $split $SkipModules; $pickedModules = @($pickedModules | Where-Object { $s -notcontains $_ }) }
if ($SkipSources) { $s = & $split $SkipSources; $pickedSources = @($pickedSources | Where-Object { $s -notcontains $_ }) }

$pickedHosts = @($pickedHosts | ForEach-Object { if ($_ -eq "github") { "copilot" } else { $_ } } | Where-Object { $hostCatalog.Contains($_) } | Select-Object -Unique)
if ($pickedHosts.Count -eq 0) { Write-Host "No hosts selected. Abort."; exit 1 }

$mod = @{}; foreach ($k in $moduleCatalog.Keys) { $mod[$k] = $pickedModules -contains $k }
$src = @{}; foreach ($k in $sourceCatalog.Keys) { $src[$k] = $pickedSources -contains $k }
if (-not $mod["mcp21st"]) { $src["twentyFirst"] = $false }

$cfg = [ordered]@{
  version = 2
  hosts   = @($pickedHosts)
  modules = [ordered]@{
    variantStudio  = [bool]$mod["variantStudio"]
    designCommand  = [bool]$mod["designCommand"]
    mcp21st        = [bool]$mod["mcp21st"]
    transitionsDev = [bool]$mod["transitionsDev"]
  }
  sources = [ordered]@{}
  companion = [ordered]@{ enabled = [bool]$mod["variantStudio"]; maxVariants = 8; askBeforeOpen = $false }
  variantStudio = [ordered]@{ path = $null; repo = $StudioRepo }
  styles = [ordered]@{ home = $DesignerHome }
}
foreach ($k in $sourceCatalog.Keys) { $cfg.sources[$k] = [bool]$src[$k] }

Write-Host ""
Write-Host "Hosts:        $($pickedHosts -join ', ')"
Write-Host "Modules:      $($pickedModules -join ', ')"
Write-Host "Sources:      $($pickedSources -join ', ')"
Write-Host "Styles store: $DesignerHome"

$parents = @($pickedHosts | ForEach-Object { $hostCatalog[$_].Skills } | Select-Object -Unique)

# ---------- Variant Studio ----------
if ($mod["variantStudio"]) {
  Write-Host ""
  Write-Host "--- Variant Studio (standalone, $StudioMode) ---"
  $studioSrc = Get-StudioSource
  if ($studioSrc) {
    if ($StudioMode -eq "link") { $cfg.variantStudio.path = $studioSrc }
    foreach ($p in $parents) { Install-StudioTo $p $studioSrc }
  } else {
    Write-Host "WARN Variant Studio not installed; the skill falls back to mock + Playwright."
    $cfg.companion.enabled = $false
  }
}

# ---------- skill ----------
Write-Host ""
Write-Host "--- $Skill skill ---"
New-Item -ItemType Directory -Force -Path (Join-Path $DesignerHome "styles"), (Join-Path $DesignerHome "library") | Out-Null
foreach ($p in $parents) {
  Remove-Legacy $p
  $dest = Join-Path $p $Skill
  if (Copy-SkillTo $dest) { Write-Config $dest $cfg }
}
if ($mod["designCommand"]) {
  foreach ($c in @($pickedHosts | ForEach-Object { $hostCatalog[$_].Cmd } | Where-Object { $_ } | Select-Object -Unique)) { Copy-Commands $c }
}

# ---------- MCP ----------
if ($mod["mcp21st"]) {
  Write-Host ""
  Write-Host "--- MCP 21st (no secret written unless already in env) ---"
  $mcp = { param([string[]]$a) & powershell -NoProfile -ExecutionPolicy Bypass -File $McpScript @a }
  foreach ($h in $pickedHosts) {
    switch ($hostCatalog[$h].Mcp) {
      "claude" { & $mcp @("-Claude") }
      "kilo" {
        $kj = "$User\.config\kilo\kilo.json"; $kjc = "$User\.config\kilo\kilo.jsonc"
        if (Test-Path -LiteralPath $kjc) { & $mcp @("-Kilo", "-Target", $kjc) }
        if ((Test-Path -LiteralPath $kj) -or -not (Test-Path -LiteralPath $kjc)) { & $mcp @("-Kilo", "-Target", $kj) }
      }
      "cursor" { & $mcp @("-Generic", "-Target", "$User\.cursor\mcp.json") }
      "antigravity" {
        & $mcp @("-Generic", "-Target", "$User\.gemini\antigravity\mcp.json")
        & $mcp @("-Generic", "-Target", "$User\.antigravity\mcp_config.json")
      }
    }
  }
}

# ---------- transitions.dev ----------
if ($mod["transitionsDev"]) {
  Write-Host ""
  Write-Host "--- transitions.dev ---"
  if (Get-Command npx -ErrorAction SilentlyContinue) { & npx --yes skills add Jakubantalik/transitions.dev -g -y }
  else { Write-Host "npx not found. Later: npx skills add Jakubantalik/transitions.dev -g -y" }
}

Write-Host ""
if (-not (Get-Command node -ErrorAction SilentlyContinue)) { Write-Host "WARN Node.js 18+ not found: scripts and Variant Studio need it (winget install OpenJS.NodeJS.LTS)." }
if ($mod["mcp21st"]) { Write-Host "21st key (installer never writes secrets): setx API_KEY_21ST `"your_key`"   https://21st.dev/settings/api-keys" }
Write-Host "Update external components later with: update.bat"
Write-Host "Restart the selected hosts. Use: /designer [style] <request>   /createstyle [name] [description]"
Write-Host "Done."

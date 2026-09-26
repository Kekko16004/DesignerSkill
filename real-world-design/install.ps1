param(
  [switch]$All,
  [switch]$Quiet,
  [string[]]$Hosts,
  [string[]]$SkipModules,
  [string[]]$SkipSources
)

$ErrorActionPreference = "Stop"
$SkillSrc = Split-Path -Parent $MyInvocation.MyCommand.Path
$User = $env:USERPROFILE
$McpScript = Join-Path $SkillSrc "install-mcp.ps1"

if (-not (Test-Path -LiteralPath (Join-Path $SkillSrc "SKILL.md"))) {
  Write-Host "FAIL: SKILL.md missing in $SkillSrc"
  exit 1
}

$hostCatalog = [ordered]@{
  kilo         = @{ Label = "Kilo Code";           Recommended = $true;  Paths = @("$User\.config\kilo\skills\real-world-design"); Cmd = @("$User\.config\kilo\command", "$User\.config\kilo\commands"); Mcp = "kilo" }
  claude       = @{ Label = "Claude Code";         Recommended = $true;  Paths = @("$User\.claude\skills\real-world-design"); Cmd = @("$User\.claude\commands"); Mcp = "claude" }
  codex        = @{ Label = "Codex / agents";      Recommended = $true;  Paths = @("$User\.codex\skills\real-world-design", "$User\.agents\skills\real-world-design"); Cmd = $null; Mcp = $null }
  antigravity  = @{ Label = "Antigravity IDE";     Recommended = $true;  Paths = @("$User\.gemini\antigravity\skills\real-world-design", "$User\.antigravity\skills\real-world-design"); Cmd = $null; Mcp = "antigravity" }
  cursor       = @{ Label = "Cursor";              Recommended = $false; Paths = @("$User\.cursor\skills\real-world-design"); Cmd = $null; Mcp = "cursor" }
  opencode     = @{ Label = "OpenCode";            Recommended = $false; Paths = @("$User\.config\opencode\skills\real-world-design"); Cmd = $null; Mcp = $null }
  github       = @{ Label = "GitHub Copilot";      Recommended = $false; Paths = @("$User\.github\skills\real-world-design"); Cmd = $null; Mcp = $null }
  windsurf     = @{ Label = "Windsurf";            Recommended = $false; Paths = @("$User\.codeium\windsurf\skills\real-world-design"); Cmd = $null; Mcp = $null }
}

$moduleCatalog = [ordered]@{
  variantStudio   = @{ Label = "Variant Studio skill (git clone Fonlogen/variant-studio)"; Recommended = $true }
  designCommand   = @{ Label = "Kilo /design command";                       Recommended = $true }
  mcp21st         = @{ Label = "MCP 21st.dev";                               Recommended = $true }
  transitionsDev  = @{ Label = "transitions.dev companion skill";            Recommended = $true }
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
  param(
    [string]$Title,
    [System.Collections.Specialized.OrderedDictionary]$Catalog,
    [string[]]$DefaultIds,
    [switch]$AllowEmpty
  )
  $ids = @($Catalog.Keys)
  Write-Host ""
  Write-Host $Title
  Write-Host "  numbers + Enter  |  all  |  none  |  Enter = recommended"
  for ($i = 0; $i -lt $ids.Count; $i++) {
    $id = $ids[$i]
    $mark = if ($Catalog[$id].Recommended) { "*" } else { " " }
    Write-Host ("  [{0}]{1} {2}" -f ($i + 1), $mark, $Catalog[$id].Label)
  }
  $raw = Read-Host "Select"
  if ([string]::IsNullOrWhiteSpace($raw)) { return @($DefaultIds) }
  $t = $raw.Trim().ToLowerInvariant()
  if ($t -eq "all") { return @($ids) }
  if ($t -eq "none") {
    if ($AllowEmpty) { return @() }
    Write-Host "Need at least one. Using recommended."
    return @($DefaultIds)
  }
  $picked = New-Object System.Collections.Generic.List[string]
  foreach ($tok in ($raw -split '[,\s]+' | Where-Object { $_ })) {
    $n = 0
    if ([int]::TryParse($tok, [ref]$n) -and $n -ge 1 -and $n -le $ids.Count) {
      $picked.Add($ids[$n - 1]) | Out-Null
    } elseif ($Catalog.Contains($tok)) {
      $picked.Add($tok) | Out-Null
    }
  }
  $uniq = @($picked | Select-Object -Unique)
  if ($uniq.Count -eq 0) {
    Write-Host "Nothing matched. Using recommended."
    return @($DefaultIds)
  }
  return $uniq
}

function Copy-SkillTo([string]$Dest) {
  New-Item -ItemType Directory -Force -Path $Dest | Out-Null
  Copy-Item -Path (Join-Path $SkillSrc "*") -Destination $Dest -Recurse -Force
  # the studio now comes from the variant-studio skill: drop copies left by older installs
  foreach ($old in @("scripts\studio.mjs", "scripts\ui", "assets\demo-round", "references\studio-manifest.md", "references\studio-platforms.md", "references\studio-frameworks.md")) {
    $o = Join-Path $Dest $old
    if (Test-Path -LiteralPath $o) { Remove-Item -LiteralPath $o -Recurse -Force -ErrorAction SilentlyContinue }
  }
  Write-Host "OK skill  $Dest"
}

function Copy-Cmd([string]$Dest) {
  $src = Join-Path $SkillSrc "command\design.md"
  if (-not (Test-Path -LiteralPath $src)) { return }
  New-Item -ItemType Directory -Force -Path $Dest | Out-Null
  Copy-Item -LiteralPath $src -Destination (Join-Path $Dest "design.md") -Force
  Write-Host "OK cmd    $(Join-Path $Dest 'design.md')"
}

function Write-Config([string]$Dest, $cfg) {
  $json = $cfg | ConvertTo-Json -Depth 8
  $utf8 = New-Object System.Text.UTF8Encoding $false
  [System.IO.File]::WriteAllText((Join-Path $Dest "config.json"), $json.TrimEnd() + "`n", $utf8)
}

function Invoke-Mcp {
  param([string]$Target, [string]$Mode, [switch]$Create, [bool]$Do21)
  if (-not $Do21) { return }
  $args = @("-NoProfile", "-ExecutionPolicy", "Bypass", "-File", $McpScript, "-Target", $Target)
  if ($Create) { $args += "-Create" }
  if ($Mode -eq "claude") { $args += "-Claude" }
  if ($Mode -eq "generic") { $args += "-Generic" }
  if (-not $Do21) { $args += "-Skip21st" }
  & powershell @args
}

$recommendedHosts = @($hostCatalog.Keys | Where-Object { $hostCatalog[$_].Recommended })
$recommendedModules = @($moduleCatalog.Keys | Where-Object { $moduleCatalog[$_].Recommended })
$recommendedSources = @($sourceCatalog.Keys | Where-Object { $sourceCatalog[$_].Recommended })

Write-Host ""
Write-Host "=== Real-World Design installer ==="
Write-Host "Source: $SkillSrc"

if ($All) {
  $pickedHosts = @($hostCatalog.Keys)
  $pickedModules = @($moduleCatalog.Keys)
  $pickedSources = @($sourceCatalog.Keys)
} elseif ($Quiet -or $Hosts) {
  $split = { param($arr) @($arr | ForEach-Object { $_ -split ',' } | ForEach-Object { $_.Trim() } | Where-Object { $_ }) }
  $pickedHosts = if ($Hosts) { & $split $Hosts } else { @($recommendedHosts) }
  $pickedModules = @($recommendedModules)
  $pickedSources = @($recommendedSources)
  if ($SkipModules) {
    $skipM = & $split $SkipModules
    $pickedModules = @($pickedModules | Where-Object { $skipM -notcontains $_ })
  }
  if ($SkipSources) {
    $skipS = & $split $SkipSources
    $pickedSources = @($pickedSources | Where-Object { $skipS -notcontains $_ })
  }
} else {
  $pickedHosts = Read-Pick "Hosts (where to install the skill)" $hostCatalog $recommendedHosts
  $pickedModules = Read-Pick "Modules" $moduleCatalog $recommendedModules -AllowEmpty
  $pickedSources = Read-Pick "Sites the skill may open during reverse-engineering" $sourceCatalog $recommendedSources -AllowEmpty
}

$pickedHosts = @($pickedHosts | Where-Object { $hostCatalog.Contains($_) } | Select-Object -Unique)
if ($pickedHosts.Count -eq 0) {
  Write-Host "No hosts selected. Abort."
  exit 1
}

$mod = @{}
foreach ($k in $moduleCatalog.Keys) { $mod[$k] = $pickedModules -contains $k }
$src = @{}
foreach ($k in $sourceCatalog.Keys) { $src[$k] = $pickedSources -contains $k }

if (-not $mod["mcp21st"]) { $src["twentyFirst"] = $false }

$cfg = [ordered]@{
  version = 1
  hosts   = @($pickedHosts)
  modules = [ordered]@{
    variantStudio   = [bool]$mod["variantStudio"]
    designCommand   = [bool]$mod["designCommand"]
    mcp21st         = [bool]$mod["mcp21st"]
    transitionsDev  = [bool]$mod["transitionsDev"]
  }
  sources = [ordered]@{
    gameUiDatabase   = [bool]$src["gameUiDatabase"]
    interfaceInGame  = [bool]$src["interfaceInGame"]
    beautifulUi      = [bool]$src["beautifulUi"]
    twentyFirst      = [bool]$src["twentyFirst"]
    aceternity       = [bool]$src["aceternity"]
    componentGallery = [bool]$src["componentGallery"]
    gameIcons        = [bool]$src["gameIcons"]
    artStation       = [bool]$src["artStation"]
    appStore         = [bool]$src["appStore"]
  }
  companion = [ordered]@{
    enabled        = [bool]$mod["variantStudio"]
    autoInstall    = $false
    maxVariants    = 8
    askBeforeOpen  = $false
  }
}

Write-Host ""
Write-Host "Installing to: $($pickedHosts -join ', ')"
Write-Host "Modules:      $($pickedModules -join ', ')"
Write-Host "Sources:      $($pickedSources -join ', ')"
Write-Host ""

foreach ($h in $pickedHosts) {
  $info = $hostCatalog[$h]
  foreach ($p in $info.Paths) {
    Copy-SkillTo $p
    Write-Config $p $cfg
  }
  if ($mod["designCommand"] -and $info.Cmd) {
    foreach ($c in @($info.Cmd)) { Copy-Cmd $c }
  }
}

if ($mod["variantStudio"]) {
  Write-Host ""
  Write-Host "--- Variant Studio (github.com/Fonlogen/variant-studio) ---"
  & powershell -NoProfile -ExecutionPolicy Bypass -File (Join-Path $SkillSrc "scripts\install-variant-studio.ps1")
}

$do21 = [bool]$mod["mcp21st"]
if ($do21) {
  Write-Host ""
  Write-Host "--- MCP (env keys, no secrets written unless already in env) ---"
  foreach ($h in $pickedHosts) {
    switch ($hostCatalog[$h].Mcp) {
      "kilo" {
        $kj = "$User\.config\kilo\kilo.json"
        $kjc = "$User\.config\kilo\kilo.jsonc"
        if (Test-Path -LiteralPath $kj) { Invoke-Mcp -Target $kj -Mode "kilo" -Do21 $do21 }
        if (Test-Path -LiteralPath $kjc) { Invoke-Mcp -Target $kjc -Mode "kilo" -Do21 $do21 }
        if (-not (Test-Path -LiteralPath $kj) -and -not (Test-Path -LiteralPath $kjc)) {
          New-Item -ItemType Directory -Force -Path "$User\.config\kilo" | Out-Null
          Invoke-Mcp -Target $kj -Mode "kilo" -Create -Do21 $do21
        }
        Write-Host "OK MCP    Kilo"
      }
      "claude" {
        Invoke-Mcp -Target "$User\.claude.json" -Mode "claude" -Do21 $do21
        Write-Host "OK MCP    Claude ~/.claude.json"
      }
      "cursor" {
        New-Item -ItemType Directory -Force -Path "$User\.cursor" | Out-Null
        Invoke-Mcp -Target "$User\.cursor\mcp.json" -Mode "generic" -Do21 $do21
        Write-Host "OK MCP    Cursor"
      }
      "antigravity" {
        New-Item -ItemType Directory -Force -Path "$User\.gemini\antigravity" | Out-Null
        Invoke-Mcp -Target "$User\.gemini\antigravity\mcp.json" -Mode "generic" -Do21 $do21
        New-Item -ItemType Directory -Force -Path "$User\.antigravity" | Out-Null
        Invoke-Mcp -Target "$User\.antigravity\mcp_config.json" -Mode "generic" -Do21 $do21
        Write-Host "OK MCP    Antigravity"
      }
    }
  }
}

if ($mod["transitionsDev"]) {
  Write-Host ""
  Write-Host "--- transitions.dev ---"
  $npx = Get-Command npx -ErrorAction SilentlyContinue
  if (-not $npx) {
    Write-Host "npx not found. Skip. Later: npx skills add Jakubantalik/transitions.dev -g -y"
  } else {
    & npx --yes skills add Jakubantalik/transitions.dev -g -y
  }
}

Write-Host ""
if ($do21) {
  Write-Host "Keys (installer never writes secrets):"
  Write-Host "  setx API_KEY_21ST `"your_key`"          https://21st.dev/settings/api-keys"
  Write-Host "Then restart the IDE / CLI."
}
Write-Host "Without keys the skill still works (Playwright + WebSearch)."
Write-Host "Restart selected hosts after this install."
Write-Host "Done."

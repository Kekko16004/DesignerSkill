# Updates real-world-design: git pull of the DesignerSkill repo, then re-runs the installer with the choices
# already saved in config.json (hosts, modules, sources). Also refreshes the variant-studio skill.
# Works from the repo checkout or from an installed copy (then the repo lives in %LOCALAPPDATA%\skill-repos).

$ErrorActionPreference = "Stop"
$RepoUrl = "https://github.com/Kekko16004/DesignerSkill.git"
$SkillDir = Split-Path -Parent (Split-Path -Parent $MyInvocation.MyCommand.Path)
$User = $env:USERPROFILE

if (-not (Get-Command git -ErrorAction SilentlyContinue)) { Write-Host "FAIL git not found: install Git for Windows"; exit 1 }

# repo: the checkout this script lives in, else a cached clone
$repo = Split-Path -Parent $SkillDir
if (-not (Test-Path -LiteralPath (Join-Path $repo ".git"))) {
  $repo = Join-Path $env:LOCALAPPDATA "skill-repos\DesignerSkill"
  if (-not (Test-Path -LiteralPath (Join-Path $repo ".git"))) {
    New-Item -ItemType Directory -Force -Path (Split-Path -Parent $repo) | Out-Null
    & git clone --quiet $RepoUrl $repo
    if ($LASTEXITCODE -ne 0) { Write-Host "FAIL git clone $RepoUrl"; exit 1 }
  }
}
$before = & git -C $repo rev-parse --short HEAD
& git -C $repo pull --ff-only --quiet
if ($LASTEXITCODE -ne 0) { Write-Host "FAIL git pull in $repo (local changes or diverged branch)"; exit 1 }
$after = & git -C $repo rev-parse --short HEAD
Write-Host $(if ($before -eq $after) { "OK repo      $repo already at $after" } else { "OK repo      $repo $before -> $after" })

# saved choices from an installed copy
$cfg = $null
foreach ($c in @((Join-Path $SkillDir "config.json"), "$User\.claude\skills\real-world-design\config.json", "$User\.agents\skills\real-world-design\config.json", "$User\.config\kilo\skills\real-world-design\config.json")) {
  if (Test-Path -LiteralPath $c) { try { $cfg = Get-Content -LiteralPath $c -Raw | ConvertFrom-Json; break } catch {} }
}
$argsList = @("-Quiet")
if ($cfg) {
  if ($cfg.hosts) { $argsList += "-Hosts"; $argsList += (@($cfg.hosts) -join ",") }
  $offM = @($cfg.modules.PSObject.Properties | Where-Object { $_.Value -eq $false } | ForEach-Object { $_.Name })
  $offS = @($cfg.sources.PSObject.Properties | Where-Object { $_.Value -eq $false } | ForEach-Object { $_.Name })
  if ($offM.Count) { $argsList += "-SkipModules"; $argsList += ($offM -join ",") }
  if ($offS.Count) { $argsList += "-SkipSources"; $argsList += ($offS -join ",") }
}

Write-Host "Installer:   $($argsList -join ' ')"
& powershell -NoProfile -ExecutionPolicy Bypass -File (Join-Path $repo "real-world-design\install.ps1") @argsList
exit $LASTEXITCODE

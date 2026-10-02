# One-click update of everything from GitHub:
#   1. git pull of this repo (the designer skill) + its Variant Studio submodule
#   2. Variant Studio to the latest upstream commit, transitions.dev via npx
#   3. reinstall the skill with the choices of the last install (install.ps1 -Reuse), no questions
#
#   update.bat                       everything
#   update.bat -NoSelf               skip step 1 (only external components + reinstall)
#   update.bat -NoInstall            skip step 3
#   update.bat -StudioPath D:\vs     a standalone Variant Studio folder other than ../variant-studio
param([string]$StudioPath, [switch]$NoSelf, [switch]$NoInstall)

$ErrorActionPreference = "Stop"
$SkillSrc = Split-Path -Parent $MyInvocation.MyCommand.Path
$Root = Split-Path -Parent $SkillSrc
$User = $env:USERPROFILE
$git = Get-Command git -ErrorAction SilentlyContinue
$isRepo = $git -and (Test-Path -LiteralPath (Join-Path $Root ".git"))

# ---------- 1. the skill itself ----------
if (-not $NoSelf) {
  Write-Host "--- designer (this repo) ---"
  if (-not $isRepo) {
    Write-Host "Not a git clone: download the latest zip from GitHub or clone the repo to get updates."
  } else {
    $before = (& git -C $Root rev-parse --short HEAD).Trim()
    & git -C $Root pull --ff-only
    if ($LASTEXITCODE -ne 0) {
      Write-Host "WARN git pull failed (local changes or diverged branch). Fix it, then run update.bat again. Continuing with the local version."
    } else {
      $after = (& git -C $Root rev-parse --short HEAD).Trim()
      if ($before -eq $after) { Write-Host "Already up to date ($after)." }
      else { & git -C $Root log --oneline "$before..$after" | Select-Object -First 15 | ForEach-Object { Write-Host "  $_" } }
    }
  }
}

# ---------- 2a. Variant Studio ----------
Write-Host "--- Variant Studio ---"
$dir = if ($StudioPath) { [IO.Path]::GetFullPath($StudioPath) } else { Join-Path $Root "variant-studio" }
$isSub = (-not $StudioPath) -and (Test-Path -LiteralPath (Join-Path $Root ".gitmodules")) -and
  (Select-String -LiteralPath (Join-Path $Root ".gitmodules") -Pattern "path = variant-studio" -Quiet)
if (-not $git) {
  Write-Host "git not found: the reinstall below downloads the latest zip if the folder is missing."
} else {
  if ($isSub) { & git -C $Root submodule update --init variant-studio }
  if (-not (Test-Path -LiteralPath (Join-Path $dir ".git"))) {
    Write-Host "$dir is not a git checkout: skipped."
  } else {
    $before = (& git -C $dir rev-parse --short HEAD).Trim()
    if ($isSub) { & git -C $Root submodule update --remote --merge variant-studio } else { & git -C $dir pull --ff-only }
    if ($LASTEXITCODE -ne 0) { Write-Host "WARN Variant Studio update failed." }
    else {
      $after = (& git -C $dir rev-parse --short HEAD).Trim()
      if ($before -eq $after) { Write-Host "Already up to date ($after)." }
      else {
        Write-Host "Variant Studio $before -> $after"
        & git -C $dir log --oneline "$before..$after" | Select-Object -First 15 | ForEach-Object { Write-Host "  $_" }
      }
    }
  }
}

# ---------- 2b. transitions.dev (the reinstall below already refreshes it) ----------
if ($NoInstall) {
Write-Host "--- transitions.dev ---"
$last = Join-Path $(if ($env:DESIGNER_HOME) { $env:DESIGNER_HOME } else { Join-Path $User ".designer" }) "install.json"
$wantTransitions = $true
if (Test-Path -LiteralPath $last) { $wantTransitions = @((Get-Content -Raw -LiteralPath $last | ConvertFrom-Json).modules) -contains "transitionsDev" }
if (-not $wantTransitions) { Write-Host "Not selected at install: skipped." }
elseif (Get-Command npx -ErrorAction SilentlyContinue) { & npx --yes skills add Jakubantalik/transitions.dev -g -y }
else { Write-Host "npx not found: skipped." }
}

# ---------- 3. reinstall with the same choices ----------
if (-not $NoInstall) {
  Write-Host ""
  $a = @("-NoProfile", "-ExecutionPolicy", "Bypass", "-File", (Join-Path $SkillSrc "install.ps1"), "-Reuse")
  if ($StudioPath) { $a += @("-StudioPath", $StudioPath) }
  & powershell @a
}

$where = & node (Join-Path $SkillSrc "scripts\studio.mjs") where 2>$null
if ($LASTEXITCODE -eq 0) { Write-Host "Variant Studio in use: $(($where | ConvertFrom-Json).path)" }
Write-Host "Update done. Restart the agents (and studio.mjs stop/start if a gallery was open)."

# Updates the external components only (dependencies.json), never the designer skill itself.
#   update.bat                      Variant Studio + transitions.dev
#   update.bat -Only variant-studio
#   update.bat -StudioPath D:\vs    a standalone Variant Studio folder other than ../variant-studio
param([string]$StudioPath, [string]$Only)

$ErrorActionPreference = "Stop"
$SkillSrc = Split-Path -Parent $MyInvocation.MyCommand.Path
$Root = Split-Path -Parent $SkillSrc
$User = $env:USERPROFILE
$want = { param($id) -not $Only -or $Only -eq $id }

# ---------- Variant Studio ----------
if (& $want "variant-studio") {
  Write-Host "--- Variant Studio ---"
  $dir = if ($StudioPath) { [IO.Path]::GetFullPath($StudioPath) } else { Join-Path $Root "variant-studio" }
  $git = Get-Command git -ErrorAction SilentlyContinue
  $isSub = (-not $StudioPath) -and (Test-Path -LiteralPath (Join-Path $Root ".gitmodules")) -and
    (Select-String -LiteralPath (Join-Path $Root ".gitmodules") -Pattern "path = variant-studio" -Quiet)
  if (-not $git) {
    Write-Host "git not found: re-run install.bat (it downloads the latest zip)."
  } else {
    if (-not (Test-Path -LiteralPath (Join-Path $dir "scripts\studio.mjs")) -and $isSub) { & git -C $Root submodule update --init variant-studio }
    if (-not (Test-Path -LiteralPath (Join-Path $dir ".git"))) {
      Write-Host "$dir is not a git checkout: re-run install.bat to refresh it."
    } else {
      $before = (& git -C $dir rev-parse --short HEAD).Trim()
      if ($isSub) { & git -C $Root submodule update --remote --merge variant-studio } else { & git -C $dir pull --ff-only }
      if ($LASTEXITCODE -ne 0) { Write-Host "FAIL git update"; exit 1 }
      $after = (& git -C $dir rev-parse --short HEAD).Trim()
      if ($before -eq $after) { Write-Host "Already up to date ($after)." }
      else {
        Write-Host "Variant Studio $before -> $after"
        & git -C $dir log --oneline "$before..$after" | Select-Object -First 15 | ForEach-Object { Write-Host "  $_" }
        if ($isSub) { Write-Host "Pin it in the repo: git add variant-studio && git commit -m 'Bump variant-studio'" }
      }
      # linked installs are already current; refresh copied ones
      $parents = @(".claude\skills", ".agents\skills", ".codex\skills", ".kilo\skills", ".config\kilo\skills", ".gemini\antigravity\skills",
        ".antigravity\skills", ".gemini\skills", ".cline\skills", ".copilot\skills", ".config\opencode\skills", ".cursor\skills", ".codeium\windsurf\skills")
      foreach ($p in $parents) {
        $d = Join-Path (Join-Path $User $p) "variant-studio"
        $item = Get-Item -LiteralPath $d -Force -ErrorAction SilentlyContinue
        if (-not $item) { continue }
        if ($item.LinkType) { Write-Host "OK link $d"; continue }
        if (-not (Select-String -LiteralPath (Join-Path $d "SKILL.md") -Pattern "^name:\s*variant-studio\s*$" -Quiet -ErrorAction SilentlyContinue)) { continue }
        Remove-Item -LiteralPath $d -Recurse -Force
        New-Item -ItemType Directory -Force -Path $d | Out-Null
        $skip = @(".git", ".variant-studio", "node_modules", "install.sh", "install.ps1", "install.cmd")
        Get-ChildItem -LiteralPath $dir -Force | Where-Object { $skip -notcontains $_.Name } | ForEach-Object { Copy-Item -LiteralPath $_.FullName -Destination $d -Recurse -Force }
        Write-Host "OK copy $d"
      }
    }
  }
}

# ---------- transitions.dev ----------
if (& $want "transitions-dev") {
  Write-Host "--- transitions.dev ---"
  if (Get-Command npx -ErrorAction SilentlyContinue) { & npx --yes skills add Jakubantalik/transitions.dev -g -y }
  else { Write-Host "npx not found, skipped." }
}

$where = & node (Join-Path $SkillSrc "scripts\studio.mjs") where 2>$null
if ($LASTEXITCODE -eq 0) { Write-Host "Variant Studio in use: $(($where | ConvertFrom-Json).path)" }
Write-Host "Done. If a studio server was running: studio.mjs stop, then start."

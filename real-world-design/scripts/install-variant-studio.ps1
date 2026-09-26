param(
  [string]$Target   # optional: a single skills folder to install into (default: every skills folder that has real-world-design)
)

# Installs or updates the variant-studio skill (github.com/Fonlogen/variant-studio) next to real-world-design,
# so the design skill always runs the latest studio. Safe to re-run: an existing clone is fast-forwarded.

$ErrorActionPreference = "Stop"
$Repo = "https://github.com/Fonlogen/variant-studio"
$User = $env:USERPROFILE
$SkillDir = Split-Path -Parent (Split-Path -Parent $MyInvocation.MyCommand.Path)

$roots = @()
if ($Target) {
  $roots = @($Target)
} else {
  # the skills folder this copy lives in (not a source checkout), then every host folder where real-world-design is installed
  $own = Split-Path -Parent $SkillDir
  $candidates = @(
    $(if (-not (Test-Path -LiteralPath (Join-Path $own ".git"))) { $own }),
    "$User\.claude\skills", "$User\.agents\skills", "$User\.config\kilo\skills", "$User\.codex\skills",
    "$User\.gemini\antigravity\skills", "$User\.gemini\config\skills", "$User\.antigravity\skills",
    "$User\.cursor\skills", "$User\.config\opencode\skills", "$User\.github\skills", "$User\.codeium\windsurf\skills"
  )
  foreach ($c in @($candidates | Where-Object { $_ })) {
    if ((Test-Path -LiteralPath (Join-Path $c "real-world-design\SKILL.md")) -and ($roots -notcontains $c)) { $roots += $c }
  }
  if ($roots.Count -eq 0) { $roots = @("$User\.agents\skills") }
}

$git = Get-Command git -ErrorAction SilentlyContinue
$zipDir = $null

function Get-ZipCopy {
  if ($script:zipDir) { return $script:zipDir }
  $tmp = Join-Path $env:TEMP ("variant-studio-" + [guid]::NewGuid().ToString("N"))
  $zip = "$tmp.zip"
  Invoke-WebRequest -Uri "$Repo/archive/refs/heads/main.zip" -OutFile $zip -UseBasicParsing
  Expand-Archive -LiteralPath $zip -DestinationPath $tmp -Force
  Remove-Item -LiteralPath $zip -Force
  $script:zipDir = (Get-ChildItem -LiteralPath $tmp -Directory | Select-Object -First 1).FullName
  return $script:zipDir
}

$failed = 0
foreach ($root in $roots) {
  $dst = Join-Path $root "variant-studio"
  try {
    New-Item -ItemType Directory -Force -Path $root | Out-Null
    $item = Get-Item -LiteralPath $dst -Force -ErrorAction SilentlyContinue
    if ($item -and $item.LinkType) {
      Write-Host "SKIP link    $dst (points to $($item.Target))"
      continue
    }
    if ($git -and (Test-Path -LiteralPath (Join-Path $dst ".git"))) {
      & git -C $dst pull --ff-only --quiet
      if ($LASTEXITCODE -ne 0) { throw "git pull failed (local changes?)" }
      Write-Host "OK update    $dst ($(& git -C $dst log -1 --format=%h))"
    } elseif ($git) {
      if ($item) { Remove-Item -LiteralPath $dst -Recurse -Force }
      & git clone --depth 1 --quiet $Repo $dst
      if ($LASTEXITCODE -ne 0) { throw "git clone failed" }
      Write-Host "OK clone     $dst"
    } else {
      $src = Get-ZipCopy
      if ($item) { Remove-Item -LiteralPath $dst -Recurse -Force }
      Copy-Item -LiteralPath $src -Destination $dst -Recurse -Force
      Write-Host "OK zip       $dst (git not found: re-run this script to update)"
    }
    if (-not (Test-Path -LiteralPath (Join-Path $dst "scripts\studio.mjs"))) { throw "scripts\studio.mjs missing after install" }
  } catch {
    $failed++
    Write-Host "FAIL         $dst : $_"
  }
}

if ($zipDir) { Remove-Item -LiteralPath (Split-Path -Parent $zipDir) -Recurse -Force -ErrorAction SilentlyContinue }
if (-not (Get-Command node -ErrorAction SilentlyContinue)) { Write-Host "WARN node not found: Variant Studio needs Node.js >= 18" }
if ($failed -gt 0) { exit 1 }
Write-Host "Variant Studio ready."

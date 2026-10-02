# Adds the 21st.dev MCP server to one client config. Never writes a secret that is not already in the env:
# without API_KEY_21ST it writes the ${API_KEY_21ST} placeholder.
#   -Claude            ~/.claude.json via `claude mcp add-json -s user` (fallback: JSON edit of the top-level mcpServers)
#   -Generic -Target   any { "mcpServers": {} } JSON file (Cursor, Antigravity)
#   -Kilo -Target      kilo.json / kilo.jsonc ("mcp" block, comments allowed)
param(
  [string]$Target,
  [switch]$Claude,
  [switch]$Generic,
  [switch]$Kilo
)

$ErrorActionPreference = "Stop"

$key = [Environment]::GetEnvironmentVariable("API_KEY_21ST", "User")
if (-not $key) { $key = [Environment]::GetEnvironmentVariable("API_KEY_21ST", "Process") }
$header = if ($key) { $key } else { '${API_KEY_21ST}' }
$url = "https://21st.dev/api/mcp"

function Write-Utf8([string]$path, [string]$text) {
  $dir = Split-Path -Parent $path
  if ($dir -and -not (Test-Path -LiteralPath $dir)) { New-Item -ItemType Directory -Force -Path $dir | Out-Null }
  [System.IO.File]::WriteAllText($path, $text.TrimEnd() + "`n", (New-Object System.Text.UTF8Encoding $false))
}

if ($Claude) {
  $cli = Get-Command claude -ErrorAction SilentlyContinue
  $json = (@{ type = "http"; url = $url; headers = @{ "x-api-key" = $header } } | ConvertTo-Json -Compress -Depth 5)
  if ($cli) {
    $list = (& claude mcp list 2>$null) -join "`n"
    if ($list -match '(?m)^21st\b') { Write-Host "MCP 21st already in Claude Code"; return }
    & claude mcp add-json 21st $json -s user | Out-Host
    return
  }
  $node = Get-Command node -ErrorAction SilentlyContinue
  $path = Join-Path $env:USERPROFILE ".claude.json"
  if (-not $node) { Write-Host "WARN claude CLI and node missing: add 21st to the top-level mcpServers of $path by hand"; return }
  $js = "const fs=require('fs');const p=process.argv[1];let j={};try{j=JSON.parse(fs.readFileSync(p,'utf8'))}catch{};j.mcpServers=j.mcpServers||{};if(j.mcpServers['21st']){console.log('MCP 21st already in '+p);process.exit(0)}j.mcpServers['21st']=JSON.parse(process.argv[2]);fs.writeFileSync(p,JSON.stringify(j,null,2));console.log('MCP 21st added to '+p)"
  & node -e $js $path $json
  return
}

if (-not $Target) { throw "-Target is required for -Generic / -Kilo" }

if ($Generic) {
  $doc = if (Test-Path -LiteralPath $Target) { Get-Content -Raw -LiteralPath $Target | ConvertFrom-Json } else { $null }
  if (-not $doc) { $doc = [pscustomobject]@{} }
  if (-not $doc.PSObject.Properties["mcpServers"]) { $doc | Add-Member -NotePropertyName mcpServers -NotePropertyValue ([pscustomobject]@{}) }
  if ($doc.mcpServers.PSObject.Properties["21st"]) { Write-Host "MCP 21st already in $Target"; return }
  $doc.mcpServers | Add-Member -NotePropertyName "21st" -NotePropertyValue ([pscustomobject]@{ url = $url; headers = [pscustomobject]@{ "x-api-key" = $header } })
  Write-Utf8 $Target ($doc | ConvertTo-Json -Depth 32)
  Write-Host "MCP 21st added to $Target"
  return
}

if ($Kilo) {
  $snippet = @"
    "21st": {
      "type": "remote",
      "url": "$url",
      "headers": { "x-api-key": "$header" },
      "enabled": true
    }
"@
  $raw = if (Test-Path -LiteralPath $Target) { [System.IO.File]::ReadAllText($Target) } else { "" }
  if ($raw -match '"21st"\s*:') { Write-Host "MCP 21st already in $Target"; return }
  if (-not $raw.Trim()) {
    Write-Utf8 $Target "{`n  `"`$schema`": `"https://app.kilo.ai/config.json`",`n  `"mcp`": {`n$snippet`n  }`n}"
  } elseif ($raw -match '"mcp"\s*:\s*\{') {
    Write-Utf8 $Target ([regex]::Replace($raw, '("mcp"\s*:\s*\{)', ('$1' + "`n" + $snippet + ","), 1) -replace ',(\s*\})', '$1')
  } else {
    $t = $raw.TrimEnd()
    $comma = if ($t -match '\{\s*\}$') { "" } else { "," }
    Write-Utf8 $Target ($t.Substring(0, $t.Length - 1).TrimEnd().TrimEnd(",") + "$comma`n  `"mcp`": {`n$snippet`n  }`n}")
  }
  Write-Host "MCP 21st added to $Target"
}

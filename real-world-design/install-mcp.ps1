param(
  [Parameter(Mandatory = $true)][string]$Target,
  [switch]$Create,
  [switch]$Claude,
  [switch]$Generic,
  [switch]$Skip21st,
  [switch]$SkipOriginkit
)

$ErrorActionPreference = "Stop"

if ($Skip21st -and $SkipOriginkit) { return }

function Get-EnvExpand([string]$name) {
  $v = [Environment]::GetEnvironmentVariable($name, "User")
  if (-not $v) { $v = [Environment]::GetEnvironmentVariable($name, "Process") }
  if (-not $v) { $v = [Environment]::GetEnvironmentVariable($name, "Machine") }
  return $v
}

$key21 = Get-EnvExpand "API_KEY_21ST"
$keyOk = Get-EnvExpand "ORIGINKIT_API_KEY"
$header21 = if ($key21) { $key21 } else { '${API_KEY_21ST}' }
$headerOk = if ($keyOk) { $keyOk } else { '${ORIGINKIT_API_KEY}' }

function Write-Utf8([string]$path, [string]$text) {
  $dir = Split-Path -Parent $path
  if ($dir -and -not (Test-Path -LiteralPath $dir)) {
    New-Item -ItemType Directory -Force -Path $dir | Out-Null
  }
  $utf8 = New-Object System.Text.UTF8Encoding $false
  [System.IO.File]::WriteAllText($path, $text.TrimEnd() + "`n", $utf8)
}

function Read-Raw([string]$path) {
  if (-not (Test-Path -LiteralPath $path)) { return $null }
  return [System.IO.File]::ReadAllText($path)
}

function Already-Has([string]$raw, [string]$name) {
  return $raw -match ('"' + [regex]::Escape($name) + '"\s*:')
}

$generic21 = @"
    "21st": {
      "url": "https://21st.dev/api/mcp",
      "headers": { "x-api-key": "$header21" }
    }
"@

$genericOk = @"
    "originkit": {
      "url": "https://mcp.originkit.dev/mcp",
      "headers": { "Authorization": "Bearer $headerOk" }
    }
"@

$kilo21 = @"
    "21st": {
      "type": "remote",
      "url": "https://21st.dev/api/mcp",
      "headers": { "x-api-key": "$header21" },
      "enabled": true
    }
"@

$kiloOk = @"
    "originkit": {
      "type": "remote",
      "url": "https://mcp.originkit.dev/mcp",
      "headers": { "Authorization": "Bearer $headerOk" },
      "enabled": true
    }
"@

function Join-Snippets([string[]]$parts) {
  return (($parts | ForEach-Object { $_.TrimEnd() }) -join ",`n")
}

function Inject-McpServers {
  param(
    [string]$Path,
    [string]$WrapperKey,
    [string]$Snippet21,
    [string]$SnippetOk,
    [string]$EmptyDoc
  )

  $want = @()
  if (-not $Skip21st) { $want += @{ name = "21st"; snippet = $Snippet21 } }
  if (-not $SkipOriginkit) { $want += @{ name = "originkit"; snippet = $SnippetOk } }
  if ($want.Count -eq 0) { return }

  $raw = Read-Raw $Path
  if ($null -eq $raw -or $raw.Trim() -eq "") {
    Write-Utf8 $Path $EmptyDoc
    return
  }

  $missing = @()
  foreach ($item in $want) {
    if (-not (Already-Has $raw $item.name)) { $missing += $item }
  }
  if ($missing.Count -eq 0) {
    Write-Host "MCP already present in $Path"
    return
  }

  $inject = Join-Snippets ($missing | ForEach-Object { $_.snippet })

  if ($raw -match [regex]::Escape('"' + $WrapperKey + '"') + '\s*:\s*\{') {
    $raw2 = [regex]::Replace(
      $raw,
      ('("' + [regex]::Escape($WrapperKey) + '"\s*:\s*\{)'),
      ('$1' + "`n" + $inject + ","),
      1
    )
    if ($raw2 -ne $raw) {
      Write-Utf8 $Path $raw2
      return
    }
  }

  $trimmed = $raw.TrimEnd()
  if ($trimmed.EndsWith("}")) {
    $comma = ","
    if ($trimmed -match '\{\s*\}$') { $comma = "" }
    $insert = $comma + "`n  `"$WrapperKey`": {`n" + $inject + "`n  }`n}"
    $raw2 = $trimmed.Substring(0, $trimmed.Length - 1).TrimEnd().TrimEnd(",") + $insert
    Write-Utf8 $Path $raw2
    return
  }

  Write-Host "WARN: could not inject MCP into $Path"
}

$emptyParts = @()
if (-not $Skip21st) { $emptyParts += $generic21 }
if (-not $SkipOriginkit) { $emptyParts += $genericOk }
$emptyInner = if ($emptyParts.Count) { Join-Snippets $emptyParts } else { "" }

$emptyClaude = @"
{
  "mcpServers": {
$emptyInner
  }
}
"@

$kiloEmptyParts = @()
if (-not $Skip21st) { $kiloEmptyParts += $kilo21 }
if (-not $SkipOriginkit) { $kiloEmptyParts += $kiloOk }
$kiloInner = if ($kiloEmptyParts.Count) { Join-Snippets $kiloEmptyParts } else { "" }

$emptyKilo = @"
{
  "`$schema": "https://app.kilo.ai/config.json",
  "mcp": {
$kiloInner
  }
}
"@

if ($Claude -or $Generic) {
  Inject-McpServers -Path $Target -WrapperKey "mcpServers" -Snippet21 $generic21 -SnippetOk $genericOk -EmptyDoc $emptyClaude
  return
}

if (-not (Test-Path -LiteralPath $Target) -and -not $Create) { return }
Inject-McpServers -Path $Target -WrapperKey "mcp" -Snippet21 $kilo21 -SnippetOk $kiloOk -EmptyDoc $emptyKilo

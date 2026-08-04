<#
Pushes credential files (.env, tools/credentials.json) up to the Bitwarden
Secrets Manager "AktivAsia" project, creating new secrets or updating
existing ones by matching on relative path. Values are base64-encoded
before being passed to the bws CLI so content with embedded quotes can't
break argument parsing, and command output is suppressed (-o none) so
secret values never land in a terminal transcript.

Requires: bws CLI on PATH (or at %LOCALAPPDATA%\Programs\bws\bws.exe),
BWS_ACCESS_TOKEN_AA set in the environment.
#>

param(
    [string]$ProjectId = "cf9927be-0682-4e02-a50d-b48301191955",
    [string]$ProjectRoot = (Join-Path $PSScriptRoot ".."),
    [string[]]$Files = @(".env", "tools\credentials.json"),
    [string[]]$Only
)

$ErrorActionPreference = "Stop"

$env:BWS_ACCESS_TOKEN = [System.Environment]::GetEnvironmentVariable("BWS_ACCESS_TOKEN_AA", "User")
if (-not $env:BWS_ACCESS_TOKEN) {
    throw "BWS_ACCESS_TOKEN_AA is not set in this session. Open a new terminal (it's saved persistently) or set it manually."
}

$bwsCmd = Get-Command bws -ErrorAction SilentlyContinue
$bws = if ($bwsCmd) { $bwsCmd.Source } else { "$env:LOCALAPPDATA\Programs\bws\bws.exe" }

$existing = & $bws secret list $ProjectId -o json | ConvertFrom-Json

$targets = $Files
if ($Only) {
    $targets = $Files | Where-Object { $Only -contains $_ }
}

foreach ($rel in $targets) {
    $fullPath = Join-Path $ProjectRoot $rel
    if (-not (Test-Path $fullPath)) {
        Write-Warning "Skipping ${rel}: file not found at $fullPath."
        continue
    }
    $file = Get-Item $fullPath
    if ($file.Length -eq 0) {
        Write-Warning "Skipping ${rel}: file is empty, nothing to push."
        continue
    }

    $bytes = [System.IO.File]::ReadAllBytes($fullPath)
    $b64 = [Convert]::ToBase64String($bytes)
    $key = $rel -replace '\\', '/'

    $match = $existing | Where-Object { $_.key -eq $key }
    if ($match) {
        & $bws secret edit --value $b64 $match.id -o none
        Write-Output "Updated secret: $key"
    } else {
        & $bws secret create $key $b64 $ProjectId -o none
        Write-Output "Created secret: $key"
    }
}

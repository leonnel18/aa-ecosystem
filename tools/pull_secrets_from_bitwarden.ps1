<#
Pulls .env and tools/credentials.json from the Bitwarden Secrets Manager
"AktivAsia" project and writes them back to their original locations,
decoding from base64. Use this to restore credentials onto a fresh machine
instead of copying them by hand.

Requires: bws CLI on PATH (or at %LOCALAPPDATA%\Programs\bws\bws.exe),
BWS_ACCESS_TOKEN_AA set in the environment.
#>

param(
    [string]$ProjectId = "cf9927be-0682-4e02-a50d-b48301191955",
    [string]$ProjectRoot = (Join-Path $PSScriptRoot "..")
)

$ErrorActionPreference = "Stop"

$env:BWS_ACCESS_TOKEN = [System.Environment]::GetEnvironmentVariable("BWS_ACCESS_TOKEN_AA", "User")
if (-not $env:BWS_ACCESS_TOKEN) {
    throw "BWS_ACCESS_TOKEN_AA is not set in this session. Open a new terminal (it's saved persistently) or set it manually."
}

$bwsCmd = Get-Command bws -ErrorAction SilentlyContinue
$bws = if ($bwsCmd) { $bwsCmd.Source } else { "$env:LOCALAPPDATA\Programs\bws\bws.exe" }

$secrets = & $bws secret list $ProjectId -o json | ConvertFrom-Json

foreach ($secret in $secrets) {
    $relPath = $secret.key -replace '/', '\'
    $destPath = Join-Path $ProjectRoot $relPath
    $destDir = Split-Path $destPath -Parent
    if (-not (Test-Path $destDir)) {
        New-Item -ItemType Directory -Force -Path $destDir | Out-Null
    }
    $bytes = [Convert]::FromBase64String($secret.value)
    [System.IO.File]::WriteAllBytes($destPath, $bytes)
    Write-Output "Wrote: $($secret.key)"
}

Write-Output "Done. Restored $($secrets.Count) file(s) under $ProjectRoot"

# Run after Codex writes acceptance tests and before they are committed (baseline A17).
# Codex's workspace-write sandbox covers the whole worktree, so the "tests/acceptance/ only" limit is
# enforced here, not by the sandbox. Fails if anything outside tests/acceptance/ changed.
# -Base: compare against this commit instead of HEAD, so commits Codex made itself are checked too.
param([string]$Base = 'HEAD')
$ErrorActionPreference = 'Stop'
Set-Location (Split-Path -Parent $PSScriptRoot)

$allowed = '^tests/acceptance/'
$tracked = @(git diff --name-only --no-renames $Base)
if ($LASTEXITCODE -ne 0) { Write-Host "cannot diff against '$Base'"; exit 1 }
$untracked = @(git ls-files --others --exclude-standard)
$changed = @($tracked + $untracked | Where-Object { $_ } | Sort-Object -Unique)

$bad = @($changed | Where-Object { $_ -notmatch $allowed })
if ($bad.Count -gt 0) {
  Write-Host "Acceptance changes may only touch tests/acceptance/. Not allowed:`n$($bad -join "`n")"
  exit 1
}
Write-Host "acceptance diff ok: $($changed.Count) file(s) under tests/acceptance/"
exit 0

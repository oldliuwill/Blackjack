# Run after Codex writes acceptance tests and before they are committed (baseline A17).
# Codex's workspace-write sandbox covers the whole worktree, so the "tests/acceptance/ only" limit is
# enforced here, not by the sandbox. Fails if anything outside tests/acceptance/ changed.
# -Base: compare against this commit instead of HEAD, so commits Codex made itself are checked too.
param([string]$Base = 'HEAD')
$ErrorActionPreference = 'Stop'
[Console]::OutputEncoding = [System.Text.UTF8Encoding]::new()   # read git's UTF-8 paths as UTF-8
Set-Location (Split-Path -Parent $PSScriptRoot)

# NUL-separated, unquoted paths, so non-ASCII or odd file names cannot dodge the prefix match.
function Names([string[]]$GitArgs) {
  $out = (& git -c core.quotePath=false @GitArgs) -join "`n"
  if ($LASTEXITCODE -ne 0) { throw "git $($GitArgs -join ' ') failed (exit $LASTEXITCODE)" }
  @($out -split "`0" | Where-Object { $_ })
}

$changed = @(
  Names @('diff', '--name-only', '-z', '--no-renames', $Base)               # working tree vs Base
  Names @('diff', '--name-only', '-z', '--no-renames', '--cached', $Base)   # index vs Base
  Names @('ls-files', '--others', '--exclude-standard', '-z')               # untracked
) | Sort-Object -Unique

$bad = @($changed | Where-Object { $_ -notmatch '^tests/acceptance/' })
if ($bad.Count -gt 0) {
  Write-Host "Acceptance changes may only touch tests/acceptance/. Not allowed:`n$($bad -join "`n")"
  exit 1
}
Write-Host "acceptance diff ok: $($changed.Count) file(s) under tests/acceptance/"
exit 0

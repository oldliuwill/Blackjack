# Stop hook (SPEC-001 §6.4, baseline A9). Blocks the end of a turn with exit 2 when verify.ps1 -Quick
# fails; stderr goes back to Claude so it keeps fixing. Exit 0 lets the turn end.
# Fast feedback only, not a completion verdict: done and merged are decided by CI on the head commit.
# Remembers the last commit that passed: a different HEAD or uncommitted changes are verified again,
# so committing before stopping does not dodge the gate.
# After two blocks in a row it lets go and asks for a handoff (two-round rule). A hook timeout does not
# count as a block, so only -Quick runs here.
$ErrorActionPreference = 'Continue'
$raw = [Console]::In.ReadToEnd()
$evt = if ($raw) { $raw | ConvertFrom-Json } else { $null }
$sid = if ($evt -and $evt.session_id) { $evt.session_id } else { 'unknown' }

# Use the hook input's cwd: after entering a worktree, CLAUDE_PROJECT_DIR still points at the start folder.
$dir = if ($evt -and $evt.cwd) { $evt.cwd } else { $env:CLAUDE_PROJECT_DIR }
Set-Location $dir
# Every session in the repo loads the project settings; planning, review and coordinator sessions are
# not on a task/* branch and pass straight through.
if ((git rev-parse --abbrev-ref HEAD 2>$null) -notmatch '^task/') { exit 0 }
Set-Location (git rev-parse --show-toplevel)

$gateDir = Join-Path ([System.IO.Path]::GetTempPath()) 'claude-gate'
New-Item -ItemType Directory -Force -Path $gateDir | Out-Null
$counter = Join-Path $gateDir "$sid.count"
$passed  = Join-Path $gateDir "$sid.passed"

$dirty = [bool](git status --porcelain)
$head  = (git rev-parse HEAD 2>$null)
$lastPassed = if (Test-Path $passed) { (Get-Content $passed -Raw).Trim() } else { '' }
if (-not $dirty -and $head -and $head -eq $lastPassed) { exit 0 }   # this commit passed and nothing changed since

$n = if (Test-Path $counter) { [int]((Get-Content $counter -Raw).Trim()) } else { 0 }
$out = & pwsh -NoProfile -File ./scripts/verify.ps1 -Quick 2>&1 | Out-String
if ($LASTEXITCODE -eq 0) {
  Remove-Item $counter -ErrorAction SilentlyContinue
  if (-not $dirty -and $head) { Set-Content -Path $passed -Value $head }   # only record clean-tree commits
  if ($evt -and $evt.transcript_path -and (Test-Path ./scripts/trace-summary.ps1)) {
    & pwsh -NoProfile -File ./scripts/trace-summary.ps1 -Transcript $evt.transcript_path | Out-Null
  }
  exit 0
}

$n++
Set-Content -Path $counter -Value $n
$tail = ($out -split "`r?`n" | Select-Object -Last 40) -join "`n"
if ($n -ge 3) {
  Write-Output "verify.ps1 has failed $n times in a row. Two-round rule: stop, write .ai/handoffs/<TASK>.md (exact expected and actual values, the root error, hypotheses ruled out), then start a new session."
  exit 0
}
[Console]::Error.WriteLine("verify.ps1 -Quick failed (attempt $n; at most two fix rounds). Fix it before ending the turn.`n$tail")
exit 2

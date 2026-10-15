# Summarises a Claude Code transcript (JSONL): turns, verify runs, files touched, commands run (baseline A10).
# The Stop hook calls it when verify passes; it can also be run by hand when a card ends.
# Output goes to .ai/trace/<task>.md, which is git-ignored (local evidence for the reviewer, not repo content).
param(
  [Parameter(Mandatory)] [string]$Transcript,
  [string]$Task = $env:AI_TASK
)
if (-not $Task) { $Task = ((git rev-parse --abbrev-ref HEAD) -replace '[\\/]', '-') }
$turns = 0
$cmds  = [System.Collections.Generic.List[string]]::new()
$edits = [System.Collections.Generic.List[string]]::new()
$reads = [System.Collections.Generic.List[string]]::new()

foreach ($line in [System.IO.File]::ReadLines($Transcript)) {
  $e = $null
  try { $e = $line | ConvertFrom-Json -ErrorAction Stop } catch { continue }
  if (-not $e -or $e.type -ne 'assistant') { continue }
  $turns++
  foreach ($c in @($e.message.content)) {
    if ($c.type -ne 'tool_use') { continue }
    switch ($c.name) {
      'Bash'       { $cmds.Add([string]$c.input.command) }
      'PowerShell' { $cmds.Add([string]$c.input.command) }
      'Edit'       { $edits.Add([string]$c.input.file_path) }
      'Write'      { $edits.Add([string]$c.input.file_path) }
      'Read'       { $reads.Add([string]$c.input.file_path) }
    }
  }
}
$verifyRuns = @($cmds | Where-Object { $_ -match 'verify\.ps1' }).Count
$report = @"
# Trace $Task
turns: $turns
verify_runs: $verifyRuns

## files edited
$(($edits | Sort-Object -Unique) -join "`n")

## files read
$(($reads | Sort-Object -Unique) -join "`n")

## commands
$(($cmds | Sort-Object -Unique) -join "`n")
"@
New-Item -ItemType Directory -Force -Path .ai/trace | Out-Null
Set-Content -Path ".ai/trace/$Task.md" -Value $report -Encoding utf8
Write-Host "trace written: .ai/trace/$Task.md"

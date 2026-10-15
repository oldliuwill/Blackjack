# scripts/verify.ps1 — the only verification entry point, shared by agents, the Stop hook and CI.
# "Passed" has exactly one meaning: this script exits 0. (SPEC-001 §6.2, baseline A8)
param(
  [ValidateSet('L1', 'L2', 'L3')] [string]$Risk = 'L2',
  [switch]$Quick,                    # Stop hook: typecheck, lint and unit only
  [string]$Task = $env:AI_TASK       # task id for verify.log; defaults to the branch name
)
$ErrorActionPreference = 'Stop'
$sw = [System.Diagnostics.Stopwatch]::StartNew()
Set-Location (Split-Path -Parent $PSScriptRoot)
if (-not $Task) { $Task = $env:GITHUB_HEAD_REF }
if (-not $Task) { $Task = ((git rev-parse --abbrev-ref HEAD) -replace '[\\/]', '-') }

# Required gates. A step listed here that did not run fails the script, whatever the reason:
# missing directory, missing tool or skipped. -Quick only requires the steps in $QuickSteps.
$Required = @{
  L1 = @('typecheck', 'lint', 'unit')
  L2 = @('typecheck', 'lint', 'unit', 'build', 'e2e')
  L3 = @('typecheck', 'lint', 'unit', 'build', 'e2e', 'acceptance')
}
$QuickSteps = @('typecheck', 'lint', 'unit')
$ran = [System.Collections.Generic.List[string]]::new()

# One shared browser cache for people, agents and every worktree [D23].
if (-not $env:PLAYWRIGHT_BROWSERS_PATH -and -not $env:CI) {
  $env:PLAYWRIGHT_BROWSERS_PATH = 'D:\ai\.cache\ms-playwright'
}

function Step([string]$Name, [scriptblock]$Cmd) {
  Write-Host "==> $Name"
  $global:LASTEXITCODE = 0
  & $Cmd
  if ($LASTEXITCODE -ne 0) { throw "VERIFY FAILED: $Name (exit $LASTEXITCODE)" }
  $script:ran.Add($Name)
}

function Log([string]$Status) {
  New-Item -ItemType Directory -Force -Path .ai/metrics | Out-Null
  $mode = if ($Quick) { 'quick' } else { 'full' }
  "{0}`t{1}`t{2}`t{3}`t{4}`t{5}s`t{6}" -f (Get-Date -Format s), $Task, $Risk, $mode, $Status, [int]$sw.Elapsed.TotalSeconds, ($ran -join '+') |
    Add-Content -Path .ai/metrics/verify.log
}

try {
  # npx --no: use the locally installed tool, never download one on the fly.
  Step 'typecheck' { npx --no tsc --noEmit }
  Step 'lint' { npx --no eslint . --max-warnings 0 }
  Step 'unit' { npx --no vitest run tests/unit }
  if (-not $Quick) {
    Step 'build' { npx --no vite build }
    Step 'e2e' { npx --no playwright test }
    if ($Risk -eq 'L3') {
      # "Must not be missing or empty" [D15]: no *.test.ts means the step does not run.
      if ((Test-Path tests/acceptance) -and (Get-ChildItem tests/acceptance -Recurse -Filter *.test.ts)) {
        Step 'acceptance' { npx --no vitest run tests/acceptance }
      }
      else {
        Write-Host 'acceptance: tests/acceptance is missing or has no *.test.ts'
      }
    }
  }

  # Completeness check: empty directories, missing tests and missing tools fail here instead of passing quietly.
  $need = $Required[$Risk]
  if ($Quick) { $need = @($need | Where-Object { $_ -in $QuickSteps }) }
  $missing = @($need | Where-Object { $_ -notin $ran })
  if ($missing.Count -gt 0) { throw "VERIFY FAILED: required steps not run: $($missing -join ', ')" }
  if ($ran.Count -eq 0) { throw 'VERIFY FAILED: nothing ran' }

  Log 'PASS'
  Write-Host "VERIFY PASSED ($($ran -join ', '))"
  exit 0
}
catch {
  Log 'FAIL'
  Write-Host $_.Exception.Message
  exit 1
}

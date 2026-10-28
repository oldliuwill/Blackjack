# scripts/card.ps1 — the coordinator's mechanical steps as five subcommands (TASK-008, proposal v2.1 §4.2).
# start: branch and worktree · review: diff, checks and prompt files · pr: push and open the PR
# status: verdict from the GitHub API · close: archive, usage, removal command for the human.
# No LLM is called, `.env` is never read, `gh pr merge` and `gh pr review` are never used.
# The caller's location never changes: every git call uses `git -C` and absolute paths; the one place that
# needs a working directory (tsc and eslint in `review`) uses Push-Location/Pop-Location.
#requires -Version 7
param(
  [Parameter(Position = 0)] [string]$Command,
  [string]$Card,                 # three digits, e.g. 008
  [string]$Worktree,             # absolute path; default <main checkout's parent>\<repo>-wt\task-<NNN>
  [string]$Base,                 # review: diff base; default `git merge-base main HEAD`
  [string]$Archive,              # close: archive folder; default <parent>\<repo>-wt\_archive\task-<NNN>
  [string]$Tools = 'D:\ai\projects\claude_baseline\tools',
  [string]$Since,                # close: ISO time for all-sessions-usage.js
  [string]$Repo = 'oldliuwill/Blackjack'
)
$ErrorActionPreference = 'Stop'
try { [Console]::OutputEncoding = [System.Text.UTF8Encoding]::new() } catch { }

$Utf8 = [System.Text.UTF8Encoding]::new($false)

function Show-Usage {
  Write-Host @'
用法：pwsh -NoProfile -File scripts/card.ps1 <子命令> -Card <NNN> [選項]
  start  -Card NNN [-Worktree <路徑>]                          從 main 建 task/NNN 與 worktree，複製卡並印出 Risk、Allowed Files、Frozen
  review -Card NNN [-Worktree <路徑>] [-Base <sha>]             產生 .ai/reviews/TASK-NNN.diff、.checks.txt、.prompt.md
  pr     -Card NNN [-Worktree <路徑>]                          push task/NNN、開 PR（已有就只印 URL）、需要時加 contract-change
  status -Card NNN                                             用 gh api 印 PR 狀態，最後一行是判決
  close  -Card NNN [-Worktree <路徑>] [-Archive <目錄>] [-Tools <目錄>] [-Since <ISO>]
                                                                存 verify.log 與 trace、記用量、印出給人跑的 worktree remove
'@
}

function Normalize-Path([string]$Path) { [System.IO.Path]::GetFullPath($Path).TrimEnd('\', '/') }
function Same-Path([string]$A, [string]$B) { [string]::Equals((Normalize-Path $A), (Normalize-Path $B), [StringComparison]::OrdinalIgnoreCase) }
function One-Line([string]$Text) { ($Text -replace '\s*[\r\n]+\s*', ' ').Trim() }

# git/gh wrappers: stdout and stderr kept apart; a non-zero exit code throws unless -Soft.
function Invoke-Native([string]$Exe, [string[]]$ArgList, [switch]$Soft) {
  $all = @(& $Exe @ArgList 2>&1)
  $code = $LASTEXITCODE
  $out = (@($all | Where-Object { $_ -isnot [System.Management.Automation.ErrorRecord] }) | ForEach-Object { "$_" }) -join "`n"
  $err = (@($all | Where-Object { $_ -is [System.Management.Automation.ErrorRecord] }) | ForEach-Object { "$_" }) -join "`n"
  if ($Soft) { return [pscustomobject]@{ Code = $code; Out = $out; Err = $err } }
  if ($code -ne 0) { throw (One-Line "$Exe $($ArgList -join ' ') 失敗（exit $code）：$err $out") }
  $out
}
function Git-In([string]$Dir, [string[]]$GitArgs, [switch]$Soft) { Invoke-Native 'git' (@('-C', $Dir) + $GitArgs) -Soft:$Soft }
function Gh([string[]]$GhArgs, [switch]$Soft) { Invoke-Native 'gh' $GhArgs -Soft:$Soft }

# --- main checkout: from the script's own location, never from the caller's directory ---
$Self = Split-Path -Parent $PSScriptRoot
$common = Git-In $Self @('rev-parse', '--path-format=absolute', '--git-common-dir') -Soft
function Resolve-Main {
  if ($common.Code -ne 0 -or (Split-Path -Leaf $common.Out.Trim()) -ne '.git') {
    throw "找不到主 checkout：腳本位置推得的路徑 $Self 不在 git 工作樹內；請從 Blackjack 主 checkout 或其 worktree 裡的 scripts\card.ps1 執行"
  }
  Split-Path -Parent (Normalize-Path $common.Out.Trim())
}

function Assert-Card {
  if ($Card -notmatch '^\d{3}$') { throw "-Card 要三位數字（例如 008），收到：'$Card'" }
}

function Default-Worktree([string]$Main) {
  Join-Path (Split-Path -Parent $Main) "$(Split-Path -Leaf $Main)-wt\task-$Card"
}

# The worktree must exist, belong to the main checkout's repository, be its top level, and be on task/NNN.
function Resolve-Worktree([string]$Main) {
  $wt = if ($Worktree) { Normalize-Path $Worktree } else { Default-Worktree $Main }
  if (-not (Test-Path -LiteralPath $wt -PathType Container)) { throw "worktree 不存在：$wt" }
  $top = Git-In $wt @('rev-parse', '--show-toplevel') -Soft
  if ($top.Code -ne 0 -or -not (Same-Path $top.Out.Trim() $wt)) { throw "不是 git worktree 的頂層：$wt" }
  $c = Git-In $wt @('rev-parse', '--path-format=absolute', '--git-common-dir')
  if (-not (Same-Path $c.Trim() (Join-Path $Main '.git'))) { throw "worktree $wt 不屬於主 checkout $Main 的 repo" }
  $branch = (Git-In $wt @('rev-parse', '--abbrev-ref', 'HEAD')).Trim()
  if ($branch -ne "task/$Card") { throw "worktree $wt 在分支 $branch，不是 task/$Card" }
  $wt
}

function Card-Path([string]$Wt) { Join-Path $Wt ".ai\task-contracts\TASK-$Card.md" }
function Read-CardLines([string]$Wt) {
  $p = Card-Path $Wt
  if (-not (Test-Path -LiteralPath $p -PathType Leaf)) { throw "卡不存在：$p" }
  [System.IO.File]::ReadAllLines($p, $Utf8)
}
function Card-Field([string[]]$Lines, [string]$Name) { $Lines | Where-Object { $_ -match "^$Name[：:]" } | Select-Object -First 1 }
function Card-Allowed([string[]]$Lines) {
  $i = [array]::FindIndex($Lines, [Predicate[string]] { param($l) $l -match '^Allowed Files' })
  if ($i -lt 0) { return @() }
  $out = @($Lines[$i])
  for ($j = $i + 1; $j -lt $Lines.Count -and $Lines[$j].Trim() -ne ''; $j++) { $out += $Lines[$j] }
  $out
}

# Heading table of a spec file (headings inside code fences are not headings): Idx is 1-based.
function Spec-Headings([string[]]$Lines) {
  $fence = $false
  for ($i = 0; $i -lt $Lines.Count; $i++) {
    if ($Lines[$i] -match '^\s*```') { $fence = -not $fence; continue }
    if (-not $fence -and $Lines[$i] -match '^(#{1,6})\s+(.*)$') {
      [pscustomobject]@{ Idx = $i + 1; Level = $Matches[1].Length; Text = $Matches[2] }
    }
  }
}
# Start line of section $Sec (e.g. '6.2') through the line before the next heading of the same or a higher level.
function Section-Range($Headings, [int]$LineCount, [string]$Sec, [string]$File) {
  $h = @($Headings)
  $k = -1
  for ($i = 0; $i -lt $h.Count; $i++) {
    if ($h[$i].Level -ge 2 -and $h[$i].Text -match ('^' + [regex]::Escape($Sec) + '\.?(\s|$)')) { $k = $i; break }
  }
  if ($k -lt 0) { throw "卡的 Spec 欄寫了 §$Sec，但 $File 找不到這個標題" }
  $end = $LineCount
  for ($i = $k + 1; $i -lt $h.Count; $i++) { if ($h[$i].Level -le $h[$k].Level) { $end = $h[$i].Idx - 1; break } }
  [pscustomobject]@{ Start = $h[$k].Idx; End = $end }
}
# '§a–§b' is one range; every other '§n' is its own section. Only the semicolon-separated part naming docs/specs/ counts.
function Spec-Ranges([string[]]$CardLines, [string]$Wt) {
  $specLine = Card-Field $CardLines 'Spec'
  if (-not $specLine) { return @() }
  $res = @()
  foreach ($seg in ($specLine -split '；')) {
    if ($seg -notmatch 'docs/specs/(SPEC-\d+\.md)') { continue }
    $rel = "docs/specs/$($Matches[1])"
    $abs = Join-Path $Wt $rel
    if (-not (Test-Path -LiteralPath $abs -PathType Leaf)) { throw "卡的 Spec 欄指到 $rel，但檔案不存在：$abs" }
    $spec = [System.IO.File]::ReadAllLines($abs, $Utf8)
    $heads = @(Spec-Headings $spec)
    $rest = $seg
    foreach ($m in [regex]::Matches($seg, '§(\d+(?:\.\d+)*)\s*[–-]\s*§(\d+(?:\.\d+)*)')) {
      $a = Section-Range $heads $spec.Count $m.Groups[1].Value $rel
      $b = Section-Range $heads $spec.Count $m.Groups[2].Value $rel
      $res += [pscustomobject]@{ File = $abs; Label = "§$($m.Groups[1].Value)–§$($m.Groups[2].Value)"; Start = $a.Start; End = $b.End }
      $rest = $rest.Replace($m.Value, '')
    }
    $seen = @{}
    foreach ($m in [regex]::Matches($rest, '§(\d+(?:\.\d+)*)')) {
      $s = $m.Groups[1].Value
      if ($seen[$s]) { continue }
      $seen[$s] = $true
      $r = Section-Range $heads $spec.Count $s $rel
      $res += [pscustomobject]@{ File = $abs; Label = "§$s"; Start = $r.Start; End = $r.End }
    }
  }
  $res
}

# ================= start =================
function Invoke-Start {
  $main = Resolve-Main
  $branch = "task/$Card"
  $wt = if ($Worktree) { Normalize-Path $Worktree } else { Default-Worktree $main }
  if ((Git-In $main @('branch', '--list', $branch)).Trim()) { throw "分支 $branch 已存在" }
  if (Test-Path -LiteralPath $wt) { throw "worktree 路徑已存在：$wt" }
  # v2.0 §6 step 6: git -C <main> worktree add <path> -b task/NNN main
  $r = Git-In $main @('worktree', 'add', $wt, '-b', $branch, 'main') -Soft
  if ($r.Code -ne 0) {
    # leave nothing half-made
    if ((Git-In $main @('branch', '--list', $branch)).Trim()) { [void](Git-In $main @('worktree', 'remove', '--force', $wt) -Soft); [void](Git-In $main @('branch', '-D', $branch) -Soft) }
    throw (One-Line "git worktree add 失敗：$($r.Err) $($r.Out)")
  }
  $mainCard = Join-Path $main ".ai\task-contracts\TASK-$Card.md"
  $wtCard = Card-Path $wt
  if (Test-Path -LiteralPath $mainCard -PathType Leaf) {
    New-Item -ItemType Directory -Force -Path (Split-Path -Parent $wtCard) | Out-Null
    Copy-Item -LiteralPath $mainCard -Destination $wtCard -Force
  }
  Write-Host "已建立分支 $branch 與 worktree $wt"
  if (Test-Path -LiteralPath $wtCard -PathType Leaf) {
    $lines = [System.IO.File]::ReadAllLines($wtCard, $Utf8)
    Write-Host "卡：$wtCard"
    foreach ($name in 'Risk') { $f = Card-Field $lines $name; Write-Host ($(if ($f) { $f } else { "$name：（卡上沒有）" })) }
    $allowed = @(Card-Allowed $lines)
    if ($allowed.Count -gt 0) { $allowed | ForEach-Object { Write-Host $_ } } else { Write-Host 'Allowed Files：（卡上沒有）' }
    $f = Card-Field $lines 'Frozen'; Write-Host ($(if ($f) { $f } else { 'Frozen：（卡上沒有）' }))
  }
  else {
    Write-Host '卡不存在，請在 worktree 寫卡並 commit'
  }
}

# ================= review =================
function Invoke-Review {
  $main = Resolve-Main
  $wt = Resolve-Worktree $main
  $cardLines = Read-CardLines $wt
  $own = @(".ai/reviews/TASK-$Card.diff", ".ai/reviews/TASK-$Card.checks.txt", ".ai/reviews/TASK-$Card.prompt.md")
  # the files of an earlier review round of this card do not count as dirt
  $dirty = @((Git-In $wt @('-c', 'core.quotePath=false', 'status', '--porcelain')) -split "`n" | Where-Object { $_ -and ($own -notcontains $_.Substring(3).Trim('"')) })
  if ($dirty.Count -gt 0) { throw "工作區不乾淨，先 commit 再審查：$($dirty -join '; ')" }

  $head = (Git-In $wt @('rev-parse', 'HEAD')).Trim()
  if ($Base) {
    $baseSha = Git-In $wt @('rev-parse', '--verify', '--quiet', "$Base^{commit}") -Soft
    if ($baseSha.Code -ne 0 -or -not $baseSha.Out.Trim()) { throw "-Base $Base 不在這個 repo 的歷史裡" }
    $baseSha = $baseSha.Out.Trim()
    if ((Git-In $wt @('merge-base', '--is-ancestor', $baseSha, 'HEAD') -Soft).Code -ne 0) { throw "-Base $Base 不是 HEAD 的祖先（不在這條分支的歷史裡）" }
  }
  else {
    $baseSha = (Git-In $wt @('merge-base', 'main', 'HEAD')).Trim()   # trial record item 79
  }
  $ranges = @(Spec-Ranges $cardLines $wt)

  $reviews = Join-Path $wt '.ai\reviews'
  New-Item -ItemType Directory -Force -Path $reviews | Out-Null
  $diffPath = Join-Path $reviews "TASK-$Card.diff"
  $checksPath = Join-Path $reviews "TASK-$Card.checks.txt"
  $promptPath = Join-Path $reviews "TASK-$Card.prompt.md"

  # git writes the diff itself: PowerShell's `>` would re-encode UTF-8 (trial record item 37)
  $tmpDiff = Join-Path ([System.IO.Path]::GetTempPath()) "card-$Card-$([guid]::NewGuid().ToString('N')).diff"
  try {
    [void](Git-In $wt @('diff', "--output=$tmpDiff", $baseSha, $head))

    $checks = [System.Collections.Generic.List[string]]::new()
    $checks.Add("base: $baseSha"); $checks.Add("head: $head"); $checks.Add('')
    $codes = @{}
    Push-Location -LiteralPath $wt
    try {
      foreach ($c in @(@('tsc', @('tsc', '--noEmit')), @('eslint', @('eslint', '.', '--max-warnings', '0')))) {
        $out = @(& npx --no -- @($c[1]) 2>&1 | ForEach-Object { "$_" })
        $codes[$c[0]] = $LASTEXITCODE
        $checks.Add("== $($c[1] -join ' ') (exit $($codes[$c[0]]))")
        if ($out.Count -gt 0) { $checks.AddRange([string[]]$out) } else { $checks.Add('(no output)') }
        $checks.Add('')
      }
    }
    finally { Pop-Location }
    $log = Join-Path $wt '.ai\metrics\verify.log'
    $checks.Add('== verify.log (last 3 lines)')
    if (Test-Path -LiteralPath $log -PathType Leaf) { $checks.AddRange([string[]]@(Get-Content -LiteralPath $log -Tail 3 -Encoding utf8)) } else { $checks.Add('(verify.log does not exist)') }

    $specText = if ($ranges.Count -gt 0) { ($ranges | ForEach-Object { "  - $($_.File)：$($_.Label)，第 $($_.Start)–$($_.End) 行" }) -join "`n" } else { '  - （卡的 Spec 欄沒有 SPEC §）' }
    $prompt = @"
# TASK-$Card 審查材料

給審查者的輸入（card.ps1 review 產生）；路徑都是絕對路徑，用 Read 讀。

- 卡：$(Card-Path $wt)
- AGENTS.md：$(Join-Path $wt 'AGENTS.md')
- SPEC 行號範圍（head 的檔案）：
$specText
- diff：$diffPath（``git diff $baseSha $head``）
- 檢查結果：$checksPath
- base：$baseSha
- head：$head

回報規則：
- 行號指檔案本身（Read 看到的行號），不是 diff 檔的行號。
- 用繁體中文回報。
"@
    $created = @()
    try {
      foreach ($p in @($promptPath, $checksPath, $diffPath)) { if (-not (Test-Path -LiteralPath $p)) { $created += $p } }
      [System.IO.File]::WriteAllText($promptPath, ($prompt -replace "`r`n", "`n") + "`n", $Utf8)
      [System.IO.File]::WriteAllText($checksPath, ($checks -join "`n") + "`n", $Utf8)
      Move-Item -LiteralPath $tmpDiff -Destination $diffPath -Force
    }
    catch {
      $created | ForEach-Object { Remove-Item -LiteralPath $_ -Force -ErrorAction SilentlyContinue }
      throw
    }
  }
  finally { if (Test-Path -LiteralPath $tmpDiff) { Remove-Item -LiteralPath $tmpDiff -Force -ErrorAction SilentlyContinue } }

  Write-Host "base: $baseSha"
  Write-Host "head: $head"
  Write-Host "diff: $diffPath"
  Write-Host "checks: $checksPath（tsc exit $($codes['tsc'])、eslint exit $($codes['eslint'])）"
  Write-Host "prompt: $promptPath"
}

# ================= pr =================
function Invoke-Pr {
  $main = Resolve-Main
  $wt = Resolve-Worktree $main
  $branch = "task/$Card"
  $cardLines = Read-CardLines $wt
  if ((Git-In $wt @('status', '--porcelain', '--untracked-files=no')).Trim()) { throw "有未 commit 的修改，先 commit 再開 PR" }
  $first = $cardLines | Select-Object -First 1
  if ($first -notmatch "^#\s*TASK-$Card[：:]\s*(.+)$") { throw "卡的第一行不是『# TASK-${Card}：標題』：$first" }
  $title = "TASK-${Card}：$($Matches[1].Trim())"

  [void](Git-In $wt @('push', '-u', 'origin', $branch))
  $existing = Gh @('pr', 'list', '-R', $Repo, '--head', $branch, '--state', 'all', '--json', 'url,state', '--jq', '.[] | "\(.url) \(.state)"')
  if ($existing.Trim()) {
    $line = ($existing -split "`n" | Select-Object -First 1).Trim()
    Write-Host "PR 已存在，不再建立：$line"
    return
  }

  # contract-change rule: read from the verify.yml contract job, not copied (same rule as CI)
  $yml = [System.IO.File]::ReadAllText((Join-Path $wt '.github\workflows\verify.yml'), $Utf8)
  $m = [regex]::Match($yml, 'touches ''([^'']+)''; then\s+if \[ "\$HAS_LABEL" != true \]')
  if (-not $m.Success) { throw '無法從 .github/workflows/verify.yml 讀出 contract-change 的路徑規則' }
  $rule = $m.Groups[1].Value
  [void](Git-In $wt @('fetch', 'origin', 'main'))
  $names = (Git-In $wt @('-c', 'core.quotePath=false', 'diff', '--name-only', '-z', 'origin/main...HEAD')) -split "`0" | Where-Object { $_ }
  $needLabel = @($names | Where-Object { $_ -match $rule }).Count -gt 0

  $goal = (Card-Field $cardLines 'Goal') -replace '^Goal[：:]\s*', ''
  $ids = @($cardLines | ForEach-Object { if ($_ -match '^\|\s*(A[A-Za-z]*\d+(?:-\d+)?)\s*\|') { $Matches[1] } })
  $records = @(Get-ChildItem -LiteralPath (Join-Path $wt '.ai\reviews') -Filter "TASK-$Card*.md" -ErrorAction SilentlyContinue | Sort-Object Name | ForEach-Object { ".ai/reviews/$($_.Name)" })
  $body = @(
    "## Goal", "", $goal, "",
    "## Acceptance 案例", ""
  ) + @($ids | ForEach-Object { "- $_" }) + @(
    "", "## 審查紀錄", ""
  ) + @($(if ($records.Count -gt 0) { $records | ForEach-Object { "- $_" } } else { '- （尚無）' })) + @(
    "", "本文不放核取方塊：Approve、檢查與合併狀態由 API 核對（``card.ps1 status``）。"
  )
  $bodyFile = Join-Path ([System.IO.Path]::GetTempPath()) "card-$Card-$([guid]::NewGuid().ToString('N')).md"
  try {
    [System.IO.File]::WriteAllText($bodyFile, ($body -join "`n") + "`n", $Utf8)
    $url = (Gh @('pr', 'create', '-R', $Repo, '--base', 'main', '--head', $branch, '--title', $title, '--body-file', $bodyFile) -split "`n" | Where-Object { $_.Trim() } | Select-Object -Last 1).Trim()
  }
  finally { Remove-Item -LiteralPath $bodyFile -Force -ErrorAction SilentlyContinue }

  if ($needLabel) {
    $l = Gh @('pr', 'edit', $url, '-R', $Repo, '--add-label', 'contract-change') -Soft
    if ($l.Code -ne 0) { Write-Host "注意：加 contract-change 標籤失敗，請人加：$(One-Line $l.Err)" } else { Write-Host '已加 contract-change 標籤' }
  }
  Write-Host $url
}

# ================= status =================
function Invoke-Status {
  [void](Resolve-Main)
  $owner, $name = $Repo -split '/', 2
  $branch = "task/$Card"
  $list = Gh @('api', "repos/$Repo/pulls?head=${owner}:$branch&state=all&per_page=5") | ConvertFrom-Json
  $list = @($list)
  if ($list.Count -eq 0) { Write-Host "分支 $branch 沒有 PR"; Write-Host 'NO-PR'; return }
  $num = [int]$list[0].number
  $query = 'query($owner:String!,$name:String!,$number:Int!){repository(owner:$owner,name:$name){pullRequest(number:$number){url number state merged mergedAt headRefOid reviewDecision mergeStateStatus statusCheckRollup{contexts(first:100){nodes{__typename ... on CheckRun{name conclusion status} ... on StatusContext{context state}}}} reviews(first:100){nodes{state submittedAt author{login} commit{oid}}}}}}'
  $pr = (Gh @('api', 'graphql', '-f', "query=$query", '-F', "owner=$owner", '-F', "name=$name", '-F', "number=$num") | ConvertFrom-Json).data.repository.pullRequest

  $checks = @()
  if ($pr.statusCheckRollup) {
    foreach ($n in @($pr.statusCheckRollup.contexts.nodes)) {
      if ($n.__typename -eq 'CheckRun') { $checks += [pscustomobject]@{ Name = $n.name; Result = $(if ($n.conclusion) { "$($n.conclusion)" } else { "$($n.status)" }) } }
      else { $checks += [pscustomobject]@{ Name = $n.context; Result = "$($n.state)" } }
    }
  }
  $reviews = @($pr.reviews.nodes)

  Write-Host "PR #$($pr.number)：$($pr.url)"
  Write-Host "head：$($pr.headRefOid)"
  Write-Host "state：$($pr.state)"
  Write-Host "reviewDecision：$($pr.reviewDecision)"
  foreach ($r in $reviews) { Write-Host "  review：$($r.author.login) $($r.state) @ $("$($r.commit.oid)".Substring(0, 7)) $($r.submittedAt)" }
  Write-Host 'checks：'
  foreach ($c in $checks) { Write-Host "  $($c.Name)：$($c.Result)" }
  Write-Host "mergeStateStatus：$($pr.mergeStateStatus)"
  Write-Host "merged：$(if ($pr.merged) { "是（$($pr.mergedAt)）" } else { '否' })"

  if ($pr.merged) {
    # approved = an APPROVED review on the final head, submitted before the merge (admin bypass record, trial log)
    $merged = [datetime]$pr.mergedAt
    $approved = @($reviews | Where-Object { $_.state -eq 'APPROVED' -and $_.commit.oid -eq $pr.headRefOid -and [datetime]$_.submittedAt -le $merged })
    Write-Host $(if ($approved.Count -gt 0) { 'MERGED' } else { 'MERGED-BYPASS' })
    return
  }
  $missing = @()
  if ($pr.state -ne 'OPEN') { $missing += "PR 已關閉（未合併）" }
  if ($pr.reviewDecision -ne 'APPROVED') { $missing += "reviewDecision 是 $($pr.reviewDecision)，不是 APPROVED" }
  $bad = @($checks | Where-Object { $_.Result -notin 'SUCCESS', 'NEUTRAL', 'SKIPPED' })
  if ($checks.Count -eq 0) { $missing += '沒有任何檢查結果' }
  elseif ($bad.Count -gt 0) { $missing += "檢查未全過：$(($bad | ForEach-Object { "$($_.Name)=$($_.Result)" }) -join '、')" }
  if ($pr.mergeStateStatus -ne 'CLEAN') { $missing += "mergeStateStatus 是 $($pr.mergeStateStatus)，不是 CLEAN" }
  Write-Host $(if ($missing.Count -eq 0) { 'READY' } else { "WAIT: $($missing -join '；')" })
}

# ================= close =================
function Invoke-Close {
  $main = Resolve-Main
  $wt = Resolve-Worktree $main
  $archive = if ($Archive) { Normalize-Path $Archive } else { Join-Path (Split-Path -Parent $main) "$(Split-Path -Leaf $main)-wt\_archive\task-$Card" }
  if ((Test-Path -LiteralPath $archive) -and @(Get-ChildItem -LiteralPath $archive -Force).Count -gt 0) { throw "-Archive 已存在且非空，不覆寫：$archive" }
  $wantUsage = [bool]$Since
  if ($PSBoundParameters.ContainsKey('Tools') -and -not (Test-Path -LiteralPath $Tools -PathType Container)) { throw "-Tools 指到不存在的目錄：$Tools" }
  $usageJs = Join-Path $Tools 'all-sessions-usage.js'
  if ($wantUsage -and -not (Test-Path -LiteralPath $Tools -PathType Container)) { $wantUsage = $false; Write-Host "注意：$Tools 不存在，略過用量" }
  elseif ($wantUsage -and -not (Test-Path -LiteralPath $usageJs -PathType Leaf)) { throw "找不到 $usageJs" }
  elseif (-not $Since) { Write-Host '注意：沒給 -Since，略過用量' }

  $usage = $null
  if ($wantUsage) {
    $u = Invoke-Native 'node' @($usageJs, $Since) -Soft
    if ($u.Code -ne 0) { throw (One-Line "all-sessions-usage.js 失敗（exit $($u.Code)）：$($u.Err)") }
    $usage = $u.Out
  }

  $archiveExisted = Test-Path -LiteralPath $archive
  try {
    New-Item -ItemType Directory -Force -Path $archive | Out-Null
    $log = Join-Path $wt '.ai\metrics\verify.log'
    if (Test-Path -LiteralPath $log -PathType Leaf) { Copy-Item -LiteralPath $log -Destination (Join-Path $archive 'verify.log') } else { Write-Host '注意：worktree 沒有 .ai/metrics/verify.log' }
    $trace = Join-Path $wt '.ai\trace'
    if ((Test-Path -LiteralPath $trace -PathType Container) -and @(Get-ChildItem -LiteralPath $trace -Force).Count -gt 0) {
      Copy-Item -Path (Join-Path $trace '*') -Destination (Join-Path $archive 'trace') -Recurse -Force
    }
    else { Write-Host '注意：worktree 沒有 .ai/trace 內容' }
  }
  catch {
    if (-not $archiveExisted) { Remove-Item -LiteralPath $archive -Recurse -Force -ErrorAction SilentlyContinue }
    throw
  }

  $handoff = Join-Path $wt ".ai\handoffs\TASK-$Card.md"
  New-Item -ItemType Directory -Force -Path (Split-Path -Parent $handoff) | Out-Null
  if (-not (Test-Path -LiteralPath $handoff -PathType Leaf)) {
    $head = (Git-In $wt @('rev-parse', 'HEAD')).Trim()
    $baseSha = (Git-In $wt @('merge-base', 'main', 'HEAD')).Trim()
    $prUrl = Gh @('pr', 'list', '-R', $Repo, '--head', "task/$Card", '--state', 'all', '--json', 'url', '--jq', '.[0].url') -Soft
    $prText = if ($prUrl.Code -eq 0 -and $prUrl.Out.Trim()) { $prUrl.Out.Trim() } else { '（未開）' }
    $skeleton = "# TASK-$Card 狀態`n`n## Base`n$baseSha`n`n## Head`n$head`n`n## PR`n$prText`n`n## 用量`n"
    [System.IO.File]::WriteAllText($handoff, $skeleton, $Utf8)
  }
  if ($null -ne $usage) {
    $existing = [System.IO.File]::ReadAllText($handoff, $Utf8)
    $block = $(if ($existing -match '(?m)^## 用量') { '' } else { "`n## 用量`n" }) + "`n（$Since 起，all-sessions-usage.js）`n`n``````text`n$usage`n```````n"
    [System.IO.File]::AppendAllText($handoff, $block, $Utf8)
  }

  Write-Host "已存到：$archive"
  Write-Host "狀態檔：$handoff"
  Write-Host '給人在一般終端機跑（腳本不刪 worktree）：'
  Write-Host "git -C $main worktree remove $wt"
}

# ================= dispatch =================
try {
  if (-not $Command -or $Command -notin 'start', 'review', 'pr', 'status', 'close') {
    Show-Usage
    exit 1
  }
  Assert-Card
  switch ($Command) {
    'start' { Invoke-Start }
    'review' { Invoke-Review }
    'pr' { Invoke-Pr }
    'status' { Invoke-Status }
    'close' { Invoke-Close }
  }
  exit 0
}
catch {
  Write-Host "錯誤：$(One-Line $_.Exception.Message)"
  exit 1
}

# TASK-006 負向測試紀錄（A6-2、A6-5、A6-6）

日期：2026-10-21 · 協調者 session（Sonnet 5.5）· 實作 commit `4aadac14edaf459ba10ec9367ea22c9fc00ae2d0`（base `500f8116c4c0eb6e30f1c22dde38233f660b7ac6`）· 對照組是 `main`（`41012a6`）的版本，用 `git show main:<path>` 取出。

harness 與暫存檔放在 session 的暫存資料夾（不在 repo）；下面附上 harness 原文，輸出是實際執行的結果。

## A6-5：classify 的 L3、L1 規則

harness `classify.sh`：從 `verify.yml` 用 `sed` 讀出 `l3=`、`l1=` 兩行（不手抄），套進與 workflow 相同的判定迴圈。每組各用改後（本卡）與改前（`main`）的檔案算一次。

```bash
#!/bin/bash
# usage: classify.sh <verify.yml> file...   -> prints risk. Reads l3= and l1= lines from the yml, not hand-copied.
yml=$1; shift
l3=$(sed -nE "s/^ *l3='(.*)'\$/\1/p" "$yml" | head -1)
l1=$(sed -nE "s/^ *l1='(.*)'\$/\1/p" "$yml" | head -1)
[ -n "$l3" ] && [ -n "$l1" ] || { echo "no l3/l1 in $yml"; exit 9; }
files=("$@")
any_l3=false; all_l1=true
for f in "${files[@]}"; do
  [[ $f =~ $l3 ]] && any_l3=true
  [[ $f =~ $l1 ]] || all_l1=false
done
if $any_l3; then risk=L3; elif [ ${#files[@]} -gt 0 ] && $all_l1; then risk=L1; else risk=L2; fi
echo $risk
```

用法：`classify.sh <verify.yml> <file>...`；改後取本卡的 `.github/workflows/verify.yml`，改前取 `git show main:.github/workflows/verify.yml`。

讀到的兩行：

```text
l3 new: ^(src/engine/|\.github/|\.claude/|scripts/|tests/support/|tests/acceptance/)|^(package\.json|package-lock\.json|AGENTS\.md|CLAUDE\.md|vite\.config\.ts|tsconfig\.json|eslint\.config\.mjs|playwright\.config\.ts)$
l1 new: ^(docs/|\.ai/|public/assets/)|\.(md|css)$
l3 old: ^(src/engine/|\.github/|\.claude/|tests/support/)|^(package\.json|package-lock\.json|scripts/verify\.ps1|vite\.config\.ts|tsconfig\.json|eslint\.config\.mjs|playwright\.config\.ts)$
l1 old: ^(docs/|\.ai/|public/assets/)|\.(md|css)$
```

結果（expected 是 SPEC 1.1 §7 的判定）：

```text
files                                                          | expected | old  | new  | result
AGENTS.md                                                      | L3       | L1   | L3   | OK
CLAUDE.md                                                      | L3       | L1   | L3   | OK
scripts/trace-summary.ps1                                      | L3       | L2   | L3   | OK
.claude/agents/diff-reviewer.md                                | L3       | L3   | L3   | OK
tests/acceptance/game.test.ts                                  | L3       | L2   | L3   | OK
src/engine/game.ts                                             | L3       | L3   | L3   | OK
.ai/task-contracts/TASK-007.md                                 | L1       | L1   | L1   | OK
README.md                                                      | L1       | L1   | L1   | OK
docs/specs/SPEC-001.md src/ui/app.ts                           | L2       | L2   | L2   | OK
.ai/task-contracts/TASK-004.md src/ui/app.ts                   | L2       | L2   | L2   | OK
src/ui/app.ts                                                  | L2       | L2   | L2   | OK
```

判讀：改後十一組全部符合 §7；改前 `AGENTS.md`、`CLAUDE.md`、`scripts/trace-summary.ps1`、`tests/acceptance/game.test.ts` 四組分別是 L1、L1、L2、L2，與改後不同，其餘七組相同。測得出差別。

## A6-6：contract 的 Frozen 核對比 PR 的 head

做法（`a66.sh`）：
- 從兩份 workflow 的 `contract` job 用 `awk` 取出 `run: |` 的腳本（不手抄），兩份各 45 行。
- commit X：以本卡的 head 為父，只改 `tests/acceptance/cards.test.ts`（多一行註解）。用暫存的 `GIT_INDEX_FILE` 加 `git commit-tree` 建出，沒有建分支、沒有 worktree、沒有 push，工作區沒有變動。
- 在本卡 worktree（HEAD ＝ 本卡的 head）用 bash 跑：`RISK=L3`、`BRANCH=task/006`、`HAS_LABEL=true`、`BASE_REF=main`，`HEAD_SHA` 分別給 X 與本卡的 head；改前的腳本用 `HEAD_SHA=X` 跑一次。

```bash
#!/bin/bash
# A6-6 negative test. Run from anywhere; operates on the worktree W with git -C / cd inside this subshell only.
W=/d/ai/projects/Blackjack-wt/task-006
SP="/c/Users/willliu/AppData/Local/Temp/claude/D--ai-projects-claude-baseline/869707a5-fce1-4f28-9962-125e54214e67/scratchpad"
cd "$W" || exit 9

# Pull the contract job's run script out of a workflow file (not hand-copied): the block after `run: |` of the job named contract.
extract() { # $1 = yml, $2 = out
  awk '
    /^  [a-z-]+:$/ { job=$1 }
    job=="contract:" && /^        run: \|$/ { inrun=1; next }
    inrun && /^  [a-z-]+:$/ { inrun=0 }
    inrun { sub(/^          /, ""); print }
  ' "$1" > "$2"
}
extract "$SP/verify.new.yml" "$SP/contract.new.sh"
extract "$SP/verify.old.yml" "$SP/contract.old.sh"
echo "extracted: new $(wc -l < "$SP/contract.new.sh") lines, old $(wc -l < "$SP/contract.old.sh") lines"

HEAD=$(git rev-parse HEAD)
echo "card head (HEAD of the worktree): $HEAD"

# Commit X: child of HEAD that changes one file under tests/acceptance/; built with a temporary index, no branch, no worktree, not pushed.
f=$(git ls-files tests/acceptance | head -1)
echo "file changed in X: $f"
export GIT_INDEX_FILE="$SP/a66.index"; rm -f "$GIT_INDEX_FILE"
git read-tree HEAD
blob=$( (git show "HEAD:$f"; echo "// A6-6 negative test: changed after Frozen") | git hash-object -w --stdin )
git update-index --cacheinfo "100644,$blob,$f"
tree=$(git write-tree)
X=$(git -c user.name=t -c user.email=t@example.com commit-tree "$tree" -p HEAD -m "A6-6 negative test commit X (local only)")
unset GIT_INDEX_FILE; rm -f "$SP/a66.index"
echo "X = $X"
echo "git diff --stat HEAD X -- tests/acceptance:"; git diff --stat HEAD "$X" -- tests/acceptance

run() { # $1 label  $2 script  $3 HEAD_SHA
  out=$(RISK=L3 BRANCH=task/006 HAS_LABEL=true BASE_REF=main HEAD_SHA="$3" bash "$2" 2>&1); code=$?
  echo "--- $1 (HEAD_SHA=${3:0:7}) exit=$code"; echo "$out" | sed 's/^/    /'
}
run "new script, HEAD_SHA=X"        "$SP/contract.new.sh" "$X"
run "new script, HEAD_SHA=card head" "$SP/contract.new.sh" "$HEAD"
run "old script, HEAD_SHA=X"        "$SP/contract.old.sh" "$X"
echo "worktree status after: [$(git status --porcelain | tr '\n' ' ')]; branches containing X: [$(git branch --contains "$X" 2>&1 | tr '\n' ' ')]"
```

輸出：

```text
extracted: new 45 lines, old 45 lines
card head (HEAD of the worktree): 4aadac14edaf459ba10ec9367ea22c9fc00ae2d0
file changed in X: tests/acceptance/cards.test.ts
X = a49f82b1313ffbea96a7695e50694143cac6e86d
git diff --stat HEAD X -- tests/acceptance:
 tests/acceptance/cards.test.ts | 1 +
 1 file changed, 1 insertion(+)
--- new script, HEAD_SHA=X (HEAD_SHA=a49f82b) exit=1
    ::error::tests/acceptance/ changed after Frozen SHA d95af4fcf4c75c4b2ab32f1c9e354056d3897794
     tests/acceptance/cards.test.ts | 1 +
     1 file changed, 1 insertion(+)
--- new script, HEAD_SHA=card head (HEAD_SHA=4aadac1) exit=0
    Frozen d95af4fcf4c75c4b2ab32f1c9e354056d3897794: tests/acceptance/ unchanged
--- old script, HEAD_SHA=X (HEAD_SHA=a49f82b) exit=0
    Frozen d95af4fcf4c75c4b2ab32f1c9e354056d3897794: tests/acceptance/ unchanged
worktree status after: []; branches containing X: []
```

判讀：改後的腳本 `HEAD_SHA=X` 結束碼 1、訊息是 tests/acceptance/ 在 Frozen 之後有變動；`HEAD_SHA` 給本卡的 head 結束碼 0。改前的腳本用 `HEAD_SHA=X` 是 0（它比的是 checkout 的 HEAD，沒有 X），所以測得出差別。X 沒有分支也沒有 worktree 指著它（只是物件庫裡一個沒人引用的 commit，之後被 `git gc` 清掉），不用另外刪。

## A6-2：Stop hook 讀中文事件

做法（`a62-test.ps1`）：
- 在 `%TEMP%` 建中文名稱資料夾 `測試資料夾-a62`，`git init`、切到 `task/999`、放一支 `scripts/verify.ps1`（在該資料夾寫 `marker.txt` 後 `exit 1`），commit。
- 事件 JSON 存成 UTF-8 無 BOM（程式檢查第一個位元組不是 `0xEF`），`cwd` 指向該資料夾，`last_assistant_message` 是中文。每次執行用新的 `session_id`，執行前刪掉標記檔。
- 從 `%TEMP%`（不是 git repo）經 `cmd /c "chcp 950 >nul & …"` 固定 Big5 字碼頁，管線（`type event.json | pwsh … -File <hook>`）與導向（`pwsh … -File <hook> < event.json`）各跑一次；改後取本卡的 hook，改前取 `git show main:.claude/hooks/verify-gate.ps1`。
- 測試前把 `CLAUDE_PROJECT_DIR` 清掉：舊 hook 解析事件失敗時會退回這個環境變數指的目錄，桌面版 session 裡它有值，第一輪測試就是因此在 task-006 worktree 真的跑了一次 `verify.ps1 -Quick`（沒有影響結果，但不乾淨，所以重測）。下面是清掉後的結果。
- 測完刪掉暫存資料夾、事件檔與 `%TEMP%\claude-gate\` 底下這幾個 `session_id` 的檔案。

```powershell
param([string]$HookNew, [string]$HookOld)
# A6-2 negative test: Stop hook with a Chinese-named repo and a Chinese last message, Big5 code page (950).
$ErrorActionPreference = 'Stop'
$env:CLAUDE_PROJECT_DIR = $null   # the old hook falls back to it when the event cannot be parsed; keep the run hermetic
$tmp = [System.IO.Path]::GetTempPath()
$work = Join-Path $tmp '測試資料夾-a62'
if (Test-Path $work) { throw "already exists: $work" }
New-Item -ItemType Directory -Path $work | Out-Null
try {
  $marker = Join-Path $work 'marker.txt'
  git -C $work init -q
  git -C $work checkout -q -b task/999
  New-Item -ItemType Directory -Path (Join-Path $work 'scripts') | Out-Null
  Set-Content -Path (Join-Path $work 'scripts/verify.ps1') -Value @'
Set-Content -Path (Join-Path (Split-Path -Parent $PSScriptRoot) 'marker.txt') -Value 'verify ran'
exit 1
'@
  git -C $work add -A
  git -C $work -c user.name=t -c user.email=t@example.com commit -q -m init
  "branch: $(git -C $work rev-parse --abbrev-ref HEAD)"
  "work:   $work"

  $sids = New-Object System.Collections.Generic.List[string]
  function New-Event([string]$sid) {
    $evt = [ordered]@{ session_id = $sid; cwd = $work; hook_event_name = 'Stop'; last_assistant_message = '測試完成，請繼續。' }
    $path = Join-Path $tmp "a62-$sid.json"
    [System.IO.File]::WriteAllText($path, ($evt | ConvertTo-Json -Compress), [System.Text.UTF8Encoding]::new($false))
    $path
  }
  function Run-One([string]$label, [string]$hook, [string]$mode) {
    $sid = "a62-$([guid]::NewGuid().ToString('N').Substring(0,8))"
    $sids.Add($sid)
    $evtPath = New-Event $sid
    if (Test-Path $marker) { Remove-Item $marker }
    $bytes = [System.IO.File]::ReadAllBytes($evtPath)
    $line = if ($mode -eq 'pipe') { "chcp 950 >nul & type `"$evtPath`" | pwsh -NoProfile -ExecutionPolicy Bypass -File `"$hook`"" }
            else { "chcp 950 >nul & pwsh -NoProfile -ExecutionPolicy Bypass -File `"$hook`" < `"$evtPath`"" }
    Push-Location $tmp
    try {
      $err = & cmd /c $line 2>&1 | Out-String
      $code = $LASTEXITCODE
    } finally { Pop-Location }
    $made = Test-Path $marker
    "{0,-12} {1,-6} sid={2} exit={3} marker={4} bom={5}" -f $label, $mode, $sid, $code, $made, ($bytes[0] -eq 0xEF)
    if ($err.Trim()) { '    stderr/stdout: ' + (($err -split "`r?`n" | Select-Object -First 2) -join ' | ') }
  }
  Run-One 'new-hook' $HookNew 'pipe'
  Run-One 'new-hook' $HookNew 'redirect'
  Run-One 'old-hook' $HookOld 'pipe'
  Run-One 'old-hook' $HookOld 'redirect'
}
finally {
  Remove-Item -LiteralPath $work -Recurse -Force -ErrorAction SilentlyContinue
  foreach ($s in $sids) {
    Remove-Item (Join-Path $tmp "a62-$s.json") -ErrorAction SilentlyContinue
    Get-ChildItem (Join-Path $tmp 'claude-gate') -Filter "$s.*" -ErrorAction SilentlyContinue | Remove-Item -ErrorAction SilentlyContinue
  }
  "cleanup: work exists = $(Test-Path -LiteralPath $work)"
}
```

輸出（`stderr/stdout` 那行是 hook 的第一行錯誤訊息；`work:` 那行在這次是用 bash 的 `tee` 轉出來，顯示成亂碼，是顯示問題，測試用的是正確字串）：

```text
warning: in the working copy of 'scripts/verify.ps1', LF will be replaced by CRLF the next time Git touches it
branch: task/999
work:   C:\Users\willliu\AppData\Local\Temp\<Chinese-named folder>-a62   (shown garbled by bash tee; the test used the real string)
new-hook     pipe   sid=a62-789b8b93 exit=2 marker=True bom=False
    stderr/stdout: Set-Location: C:\Users\willliu\AppData\Local\Temp\claude\D--ai-projects-claude-baseline\869707a5-fce1-4f28-9962-125e54214e67\scratchpad\hook.new.ps1:22 | Line |
new-hook     redirect sid=a62-b3cd234c exit=2 marker=True bom=False
    stderr/stdout: Set-Location: C:\Users\willliu\AppData\Local\Temp\claude\D--ai-projects-claude-baseline\869707a5-fce1-4f28-9962-125e54214e67\scratchpad\hook.new.ps1:22 | Line |
old-hook     pipe   sid=a62-17a0a5c5 exit=2 marker=False bom=False
    stderr/stdout: ConvertFrom-Json: C:\Users\willliu\AppData\Local\Temp\claude\D--ai-projects-claude-baseline\869707a5-fce1-4f28-9962-125e54214e67\scratchpad\hook.old.ps1:10 | Line |
old-hook     redirect sid=a62-640a3083 exit=2 marker=False bom=False
    stderr/stdout: ConvertFrom-Json: C:\Users\willliu\AppData\Local\Temp\claude\D--ai-projects-claude-baseline\869707a5-fce1-4f28-9962-125e54214e67\scratchpad\hook.old.ps1:10 | Line |
cleanup: work exists = False
```

判讀（判準是標記檔，不是結束碼）：
- 改後的 hook：管線、導向都是結束碼 2、標記檔產生。
- 改前的 hook：兩次都沒有標記檔。`ConvertFrom-Json` 因為 Big5 解碼出亂碼而失敗，`cwd` 讀不到，hook 沒有進到測試資料夾。

清理：暫存資料夾已刪（`cleanup: work exists = False`），`%TEMP%\claude-gate\` 沒有 `a62-*` 的檔案。舊 hook 在非 git 資料夾會寫 `claude-gate\unknown.count`（見下一節第 2 點），已刪除這個檔；它在測試前可能就存在（舊的 `unknown` session 計數器），內容只是計數，刪掉無影響。

## 附帶觀察（不在本卡範圍，沒有改）

1. 改後的 hook 在 Big5 字碼頁下，`git rev-parse --show-toplevel` 的輸出（UTF-8）被當成 Big5 解，含中文的根目錄路徑變亂碼，`Set-Location` 報錯（非終止），hook 繼續在 `cwd`（正確）執行，所以上面的標記檔仍然產生；若 `cwd` 是 repo 的子資料夾，就會留在子資料夾裡跑 `./scripts/verify.ps1` 而找不到腳本。修法是同時設 `[Console]::OutputEncoding`，這是卡的非目標（卡只要求 `InputEncoding`），列為後續。
2. `(git rev-parse --abbrev-ref HEAD 2>$null) -notmatch '^task/'` 在 git 沒有輸出（不在 repo）時，左運算元是空集合，`-notmatch` 回空陣列（視為假），所以 hook 沒有 `exit 0`，而是繼續往下找 `./scripts/verify.ps1`、失敗、`exit 2`。v2.0 的 A9 範本是同一個寫法。實際使用的 session 幾乎都在 repo 裡，影響小。

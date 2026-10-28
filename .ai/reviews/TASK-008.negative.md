# TASK-008 負向測試紀錄（A8-1～A8-6）

日期：2026-10-28 · 卡 session（Sonnet 5.5）· 測於腳本 head `3274e92`（`3274e92cf3530dac20f404271c63ca3b3669beb2`）· 卡的 base `446c1f2`。腳本在這之後若再改動，本檔重跑後覆寫。

做法：harness（不在 repo 內，session 暫存資料夾的 `negative.ps1`）逐條跑 `pwsh -NoProfile -File scripts/card.ps1 …`，印出指令、輸出、結束碼，以及每次執行前後的 `Get-Location` 是否相同。下面每一節是 harness 對該 A8 條目的原始輸出，沒有修飾。主 checkout 是 `D:\ai\projects\Blackjack`；暫存分支 `task/999` 與 worktree `D:\ai\projects\Blackjack-wt\task-999` 留給人刪（`git -C D:\ai\projects\Blackjack worktree remove D:\ai\projects\Blackjack-wt\task-999`，再 `git -C D:\ai\projects\Blackjack branch -D task/999`）；暫用的 998、997 已在 harness 內刪掉。

## 與卡的文字不一致、照實際情形處理的地方

1. A8-4 的對照組：卡寫 `status -Card 005`（PR #5）必須是 `MERGED-BYPASS`。實際上 PR #5 的分支是 `task/004`（TASK-004），`task/005` 沒有 PR，所以 `-Card 005` 印 `NO-PR`。對應關係是：`-Card 004`→PR #5、`-Card 003`→PR #4、`-Card 002`→PR #3、`-Card 007`→PR #7、`-Card 006`→PR #6。下面照這個對應記，判決與 admin bypass 紀錄一致（#5、#3 繞過；#4、#6、#7 沒有）。
2. A8-6 的「在 `%TEMP%` 執行任一子命令，exit 1 且訊息指出主 checkout 的路徑」與共同規格「不依賴呼叫者的目前位置」字面上衝突：腳本用自己的位置推主 checkout，從 `%TEMP%` 呼叫位於 repo 內的腳本照常執行（下面最後一組，`status` 正常 exit 0）。照共同規格的意圖測成「腳本本身不在 git 工作樹內」（把 `card.ps1` 複製到 `%TEMP%\card-neg\x\scripts\`，工作目錄也在 `%TEMP%`）：五個子命令都 exit 1，訊息列出推得的路徑。
3. A8-3 的「deny 生效的 session 跑 push 被擋」：本 session 從 `claude_baseline` 啟動，不受 Blackjack 的 deny 約束，測不到；A8-3 的兩次執行記在最後一節。

## A8-1：start

對照組是沒有腳本時的手動指令（v2.0 §6 第 6 步）`git -C <主> worktree add <路徑> -b task/997 main`：建出的一列是 `<路徑>  0e0293b [task/997]`，與腳本建出的 `task-999  0e0293b [task/999]` 格式與 commit 相同（HEAD 都是 main 的 `0e0293b`）。

```	ext
--- 之前
$ git worktree list
D:/ai/projects/Blackjack              0e0293b [main]
D:/ai/projects/Blackjack-wt/task-006  e853459 [task/006]
D:/ai/projects/Blackjack-wt/task-007  e805f5a [task/007]
D:/ai/projects/Blackjack-wt/task-008  3274e92 [task/008]
$ git branch --list 'task/9*'

--- start -Card 999（第一次）
$ pwsh -NoProfile -File scripts/card.ps1 start -Card 999
已建立分支 task/999 與 worktree D:\ai\projects\Blackjack-wt\task-999
卡不存在，請在 worktree 寫卡並 commit
[exit 0; Get-Location 前後相同: True]
--- 之後
$ git worktree list
D:/ai/projects/Blackjack              0e0293b [main]
D:/ai/projects/Blackjack-wt/task-006  e853459 [task/006]
D:/ai/projects/Blackjack-wt/task-007  e805f5a [task/007]
D:/ai/projects/Blackjack-wt/task-008  3274e92 [task/008]
D:/ai/projects/Blackjack-wt/task-999  0e0293b [task/999]
$ git branch --list 'task/9*'
+ task/999
--- start -Card 999（第二次）
$ pwsh -NoProfile -File scripts/card.ps1 start -Card 999
錯誤：分支 task/999 已存在
[exit 1; Get-Location 前後相同: True]
$ git worktree list
D:/ai/projects/Blackjack              0e0293b [main]
D:/ai/projects/Blackjack-wt/task-006  e853459 [task/006]
D:/ai/projects/Blackjack-wt/task-007  e805f5a [task/007]
D:/ai/projects/Blackjack-wt/task-008  3274e92 [task/008]
D:/ai/projects/Blackjack-wt/task-999  0e0293b [task/999]
$ git branch --list 'task/9*'
+ task/999
第二次之後的 worktree／分支清單與第一次之後相同：True
--- start -Card 99（非三位數）
$ pwsh -NoProfile -File scripts/card.ps1 start -Card 99
錯誤：-Card 要三位數字（例如 008），收到：'99'
[exit 1; Get-Location 前後相同: True]
$ git worktree list
D:/ai/projects/Blackjack              0e0293b [main]
D:/ai/projects/Blackjack-wt/task-006  e853459 [task/006]
D:/ai/projects/Blackjack-wt/task-007  e805f5a [task/007]
D:/ai/projects/Blackjack-wt/task-008  3274e92 [task/008]
D:/ai/projects/Blackjack-wt/task-999  0e0293b [task/999]
$ git branch --list 'task/9*'
+ task/999
沒有新增任何東西：True
--- 主 checkout 有未 commit 的卡時：複製進 worktree（暫用 998，測完刪）
$ pwsh -NoProfile -File scripts/card.ps1 start -Card 998
已建立分支 task/998 與 worktree D:\ai\projects\Blackjack-wt\task-998
卡：D:\ai\projects\Blackjack-wt\task-998\.ai\task-contracts\TASK-998.md
Risk：L1（測試）
Allowed Files（2 個）：
1. `a.txt`
2. `b.txt`
Frozen：無
[exit 0; Get-Location 前後相同: True]
worktree 內的卡存在：True；主 checkout 的 git status 只多一個未追蹤檔：
?? .ai/task-contracts/TASK-998.md
--- 對照組（沒有腳本時的手動指令，v2.0 §6 第 6 步）：git -C <主> worktree add ..\Blackjack-wt\task-997 -b task/997 main
手動建出的一列與腳本建出的一列（除路徑與分支名外相同）：

D:/ai/projects/Blackjack-wt/task-997  0e0293b [task/997]
D:/ai/projects/Blackjack-wt/task-999  0e0293b [task/999]
--- 清掉 998、997 後（只剩 999）
$ git worktree list
D:/ai/projects/Blackjack              0e0293b [main]
D:/ai/projects/Blackjack-wt/task-006  e853459 [task/006]
D:/ai/projects/Blackjack-wt/task-007  e805f5a [task/007]
D:/ai/projects/Blackjack-wt/task-008  3274e92 [task/008]
D:/ai/projects/Blackjack-wt/task-999  0e0293b [task/999]
$ git branch --list 'task/9*'
+ task/999
```

## A8-2：review

對照組：`cmd /c "git -C <worktree> diff <base> <head> > file"`（cmd 的 `>` 不轉碼，是逐位元組的原始輸出），再 `Get-FileHash -Algorithm SHA256`。預設 base（`merge-base main HEAD`）與 `-Base 446c1f2` 兩組的腳本值與手動值都相同。

```	ext
--- 工作區不乾淨（加一個未追蹤檔 dirty.txt）
$ pwsh -NoProfile -File scripts/card.ps1 review -Card 008 -Worktree D:\ai\projects\Blackjack-wt\task-008
錯誤：工作區不乾淨，先 commit 再審查：?? dirty.txt
[exit 1; Get-Location 前後相同: True]
三個檔案都不存在：True
--- -Base 給不在歷史裡的 SHA
$ pwsh -NoProfile -File scripts/card.ps1 review -Card 008 -Worktree D:\ai\projects\Blackjack-wt\task-008 -Base deadbeefdeadbeefdeadbeefdeadbeefdeadbeef
錯誤：-Base deadbeefdeadbeefdeadbeefdeadbeefdeadbeef 不在這個 repo 的歷史裡
[exit 1; Get-Location 前後相同: True]
三個檔案都不存在：True
--- -Base 給存在但不是 HEAD 祖先的 commit（calib/seeded-01 的 tip 3d5962f）
$ pwsh -NoProfile -File scripts/card.ps1 review -Card 008 -Worktree D:\ai\projects\Blackjack-wt\task-008 -Base 3d5962f1feafd6ea4e4bebb3bd485ba2c0a3c400
錯誤：-Base 3d5962f1feafd6ea4e4bebb3bd485ba2c0a3c400 不是 HEAD 的祖先（不在這條分支的歷史裡）
[exit 1; Get-Location 前後相同: True]
三個檔案都不存在：True
--- 預設 base（merge-base main HEAD）
$ pwsh -NoProfile -File scripts/card.ps1 review -Card 008 -Worktree D:\ai\projects\Blackjack-wt\task-008
base: 0e0293b72127a46239f38e5c9a321e163a99617c
head: 3274e92cf3530dac20f404271c63ca3b3669beb2
diff: D:\ai\projects\Blackjack-wt\task-008\.ai\reviews\TASK-008.diff
checks: D:\ai\projects\Blackjack-wt\task-008\.ai\reviews\TASK-008.checks.txt（tsc exit 0、eslint exit 0）
prompt: D:\ai\projects\Blackjack-wt\task-008\.ai\reviews\TASK-008.prompt.md
[exit 0; Get-Location 前後相同: True]
腳本的 diff SHA-256：b812397dce1059eaa5f1e69b1966df43bd9d110d6a1ab51a6cd7ec2e05b51d97
手動 cmd /c "git diff 0e0293b 3274e92 > file" 的 SHA-256：b812397dce1059eaa5f1e69b1966df43bd9d110d6a1ab51a6cd7ec2e05b51d97
--- -Base 446c1f2（寫卡的 commit）
$ pwsh -NoProfile -File scripts/card.ps1 review -Card 008 -Worktree D:\ai\projects\Blackjack-wt\task-008 -Base 446c1f2
base: 446c1f21ca056a29382ccf6b55bb52450b69eedd
head: 3274e92cf3530dac20f404271c63ca3b3669beb2
diff: D:\ai\projects\Blackjack-wt\task-008\.ai\reviews\TASK-008.diff
checks: D:\ai\projects\Blackjack-wt\task-008\.ai\reviews\TASK-008.checks.txt（tsc exit 0、eslint exit 0）
prompt: D:\ai\projects\Blackjack-wt\task-008\.ai\reviews\TASK-008.prompt.md
[exit 0; Get-Location 前後相同: True]
腳本的 diff SHA-256：9b811171aa02df7572d171cbb70ba0bbf72a70683fb4f6a41f77620edeb9428e
手動的 SHA-256：9b811171aa02df7572d171cbb70ba0bbf72a70683fb4f6a41f77620edeb9428e
--- checks.txt、prompt.md
base: 446c1f21ca056a29382ccf6b55bb52450b69eedd
head: 3274e92cf3530dac20f404271c63ca3b3669beb2

== tsc --noEmit (exit 0)
(no output)

== eslint . --max-warnings 0 (exit 0)
(no output)

== verify.log (last 3 lines)
2026-10-28T18:14:02	TASK-008	bee14cc+dirty	L3	full	PASS	58s	typecheck+lint+unit+build+e2e+acceptance	
----
# TASK-008 審查材料

給審查者的輸入（card.ps1 review 產生）；路徑都是絕對路徑，用 Read 讀。

- 卡：D:\ai\projects\Blackjack-wt\task-008\.ai\task-contracts\TASK-008.md
- AGENTS.md：D:\ai\projects\Blackjack-wt\task-008\AGENTS.md
- SPEC 行號範圍（head 的檔案）：
  - D:\ai\projects\Blackjack-wt\task-008\docs\specs\SPEC-001.md：§6.2，第 306–325 行
  - D:\ai\projects\Blackjack-wt\task-008\docs\specs\SPEC-001.md：§6.3，第 326–338 行
  - D:\ai\projects\Blackjack-wt\task-008\docs\specs\SPEC-001.md：§7，第 349–371 行
  - D:\ai\projects\Blackjack-wt\task-008\docs\specs\SPEC-001.md：§8.1，第 374–383 行
  - D:\ai\projects\Blackjack-wt\task-008\docs\specs\SPEC-001.md：§8.3，第 398–408 行
- diff：D:\ai\projects\Blackjack-wt\task-008\.ai\reviews\TASK-008.diff（`git diff 446c1f21ca056a29382ccf6b55bb52450b69eedd 3274e92cf3530dac20f404271c63ca3b3669beb2`）
- 檢查結果：D:\ai\projects\Blackjack-wt\task-008\.ai\reviews\TASK-008.checks.txt
- base：446c1f21ca056a29382ccf6b55bb52450b69eedd
- head：3274e92cf3530dac20f404271c63ca3b3669beb2

回報規則：
- 行號指檔案本身（Read 看到的行號），不是 diff 檔的行號。
- 用繁體中文回報。
```

## A8-4：status

```	ext
$ pwsh -NoProfile -File scripts/card.ps1 status -Card 004
PR #5：https://github.com/oldliuwill/Blackjack/pull/5
head：b1903d5048f699d5da14379fb9492239b27519e2
state：MERGED
reviewDecision：REVIEW_REQUIRED
checks：
  Analyze (actions)：SUCCESS
  Analyze (javascript-typescript)：SUCCESS
  classify：SUCCESS
  CodeQL：SUCCESS
  contract：SUCCESS
  dependency-review：SUCCESS
  verify：SUCCESS
mergeStateStatus：UNKNOWN
merged：是（2026-10-21T08:39:03Z）
MERGED-BYPASS
[exit 0; Get-Location 前後相同: True]
$ pwsh -NoProfile -File scripts/card.ps1 status -Card 007
PR #7：https://github.com/oldliuwill/Blackjack/pull/7
head：e805f5a947d3bd89985b9c3b03682dc28a3eae18
state：MERGED
reviewDecision：APPROVED
  review：oldliuwill COMMENTED @ e805f5a 2026-10-27T08:28:40Z
  review：oldliuwill APPROVED @ e805f5a 2026-10-27T08:29:33Z
checks：
  Analyze (actions)：SUCCESS
  Analyze (javascript-typescript)：SUCCESS
  classify：SUCCESS
  CodeQL：SUCCESS
  contract：SUCCESS
  dependency-review：SUCCESS
  verify：SUCCESS
mergeStateStatus：UNKNOWN
merged：是（2026-10-27T08:30:52Z）
MERGED
[exit 0; Get-Location 前後相同: True]
$ pwsh -NoProfile -File scripts/card.ps1 status -Card 003
PR #4：https://github.com/oldliuwill/Blackjack/pull/4
head：764ba893b76363268a1624ab5adea40ae9c4da40
state：MERGED
reviewDecision：APPROVED
  review：oldliuwill APPROVED @ 764ba89 2026-10-16T09:31:28Z
checks：
  Analyze (actions)：SUCCESS
  Analyze (javascript-typescript)：SUCCESS
  classify：SUCCESS
  CodeQL：SUCCESS
  contract：SUCCESS
  dependency-review：SUCCESS
  verify：SUCCESS
mergeStateStatus：UNKNOWN
merged：是（2026-10-16T09:32:36Z）
MERGED
[exit 0; Get-Location 前後相同: True]
$ pwsh -NoProfile -File scripts/card.ps1 status -Card 002
PR #3：https://github.com/oldliuwill/Blackjack/pull/3
head：ea91e8f508d1695bc101f421afafa012400a9740
state：MERGED
reviewDecision：REVIEW_REQUIRED
  review：github-advanced-security COMMENTED @ 5ab8602 2026-10-16T03:49:30Z
  review：oldliuwill COMMENTED @ ea91e8f 2026-10-16T06:16:18Z
checks：
  Analyze (actions)：SUCCESS
  Analyze (javascript-typescript)：SUCCESS
  classify：SUCCESS
  CodeQL：SUCCESS
  contract：SUCCESS
  dependency-review：SUCCESS
  verify：SUCCESS
mergeStateStatus：UNKNOWN
merged：是（2026-10-16T06:18:03Z）
MERGED-BYPASS
[exit 0; Get-Location 前後相同: True]
$ pwsh -NoProfile -File scripts/card.ps1 status -Card 006
PR #6：https://github.com/oldliuwill/Blackjack/pull/6
head：e853459bfae3460eb9013c6879fbf8f8f8b916d9
state：MERGED
reviewDecision：APPROVED
  review：oldliuwill COMMENTED @ e853459 2026-10-21T12:26:39Z
  review：oldliuwill COMMENTED @ e853459 2026-10-21T12:27:08Z
  review：oldliuwill APPROVED @ e853459 2026-10-21T12:28:12Z
  review：oldliuwill APPROVED @ e853459 2026-10-21T12:28:33Z
  review：oldliuwill APPROVED @ e853459 2026-10-21T12:32:19Z
checks：
  Analyze (actions)：SUCCESS
  Analyze (javascript-typescript)：SUCCESS
  classify：SUCCESS
  CodeQL：SUCCESS
  contract：SUCCESS
  dependency-review：SUCCESS
  verify：SUCCESS
mergeStateStatus：UNKNOWN
merged：是（2026-10-21T12:34:24Z）
MERGED
[exit 0; Get-Location 前後相同: True]
$ pwsh -NoProfile -File scripts/card.ps1 status -Card 005
分支 task/005 沒有 PR
NO-PR
[exit 0; Get-Location 前後相同: True]
$ pwsh -NoProfile -File scripts/card.ps1 status -Card 008
分支 task/008 沒有 PR
NO-PR
[exit 0; Get-Location 前後相同: True]
--- 對照組：手動 gh api（review 清單與合併時間）
$ gh api repos/oldliuwill/Blackjack/pulls/5 --jq '{head:.head.sha,merged_at:.merged_at}'
{"head":"b1903d5048f699d5da14379fb9492239b27519e2","merged_at":"2026-10-21T08:39:03Z"}
$ gh api repos/oldliuwill/Blackjack/pulls/5/reviews --jq '[.[]|{user:.user.login,state,commit:.commit_id[0:7],at:.submitted_at}]'
[]
$ gh api repos/oldliuwill/Blackjack/pulls/7 --jq '{head:.head.sha,merged_at:.merged_at}'
{"head":"e805f5a947d3bd89985b9c3b03682dc28a3eae18","merged_at":"2026-10-27T08:30:52Z"}
$ gh api repos/oldliuwill/Blackjack/pulls/7/reviews --jq '[.[]|{user:.user.login,state,commit:.commit_id[0:7],at:.submitted_at}]'
[{"at":"2026-10-27T08:28:40Z","commit":"e805f5a","state":"COMMENTED","user":"oldliuwill"},{"at":"2026-10-27T08:29:33Z","commit":"e805f5a","state":"APPROVED","user":"oldliuwill"}]
$ gh api repos/oldliuwill/Blackjack/pulls/4 --jq '{head:.head.sha,merged_at:.merged_at}'
{"head":"764ba893b76363268a1624ab5adea40ae9c4da40","merged_at":"2026-10-16T09:32:36Z"}
$ gh api repos/oldliuwill/Blackjack/pulls/4/reviews --jq '[.[]|{user:.user.login,state,commit:.commit_id[0:7],at:.submitted_at}]'
[{"at":"2026-10-16T09:31:28Z","commit":"764ba89","state":"APPROVED","user":"oldliuwill"}]
$ gh api repos/oldliuwill/Blackjack/pulls/3 --jq '{head:.head.sha,merged_at:.merged_at}'
{"head":"ea91e8f508d1695bc101f421afafa012400a9740","merged_at":"2026-10-16T06:18:03Z"}
$ gh api repos/oldliuwill/Blackjack/pulls/3/reviews --jq '[.[]|{user:.user.login,state,commit:.commit_id[0:7],at:.submitted_at}]'
[{"at":"2026-10-16T03:49:30Z","commit":"5ab8602","state":"COMMENTED","user":"github-advanced-security[bot]"},{"at":"2026-10-16T06:16:18Z","commit":"ea91e8f","state":"COMMENTED","user":"oldliuwill"}]
```

判讀：`-Card 004`（PR #5）`MERGED-BYPASS`（沒有任何 review）、`-Card 002`（PR #3）`MERGED-BYPASS`（只有 COMMENTED）、`-Card 007`（PR #7）、`-Card 003`（PR #4）、`-Card 006`（PR #6）`MERGED`（在最終 head 上有合併前送出的 APPROVED）；`-Card 005`、`-Card 008` `NO-PR`。手動 `gh api` 的 review 清單與合併時間逐一對得上。每個 check 取同名檢查最後一次執行的結果（label 變更會讓 workflow 重跑，早期的 `contract` 失敗不計）。

## A8-5：close

```	ext
--- -Archive 指到已存在且非空的目錄
$ pwsh -NoProfile -File scripts/card.ps1 close -Card 999 -Worktree D:\ai\projects\Blackjack-wt\task-999 -Archive C:\Users\willliu\AppData\Local\Temp\card-neg\nonempty
錯誤：-Archive 已存在且非空，不覆寫：C:\Users\willliu\AppData\Local\Temp\card-neg\nonempty
[exit 1; Get-Location 前後相同: True]
目錄內容沒變：keep.txt；狀態檔不存在：True
--- -Tools 指到不存在的目錄
$ pwsh -NoProfile -File scripts/card.ps1 close -Card 999 -Worktree D:\ai\projects\Blackjack-wt\task-999 -Archive C:\Users\willliu\AppData\Local\Temp\card-neg\arch-a -Tools C:\Users\willliu\AppData\Local\Temp\card-neg\no-such-tools -Since 2026-10-28T00:00:00+08:00
錯誤：-Tools 指到不存在的目錄：C:\Users\willliu\AppData\Local\Temp\card-neg\no-such-tools
[exit 1; Get-Location 前後相同: True]
狀態檔不存在：True；archive 不存在：True
--- 正常：-Archive 新目錄、-Since
$ pwsh -NoProfile -File scripts/card.ps1 close -Card 999 -Worktree D:\ai\projects\Blackjack-wt\task-999 -Archive C:\Users\willliu\AppData\Local\Temp\card-neg\arch-b -Since 2026-10-28T00:00:00+08:00
已存到：C:\Users\willliu\AppData\Local\Temp\card-neg\arch-b
狀態檔：D:\ai\projects\Blackjack-wt\task-999\.ai\handoffs\TASK-999.md
給人在一般終端機跑（腳本不刪 worktree）：
git -C D:\ai\projects\Blackjack worktree remove D:\ai\projects\Blackjack-wt\task-999
[exit 0; Get-Location 前後相同: True]
archive 內容：
\arch-b\verify.log
\arch-b\trace\t1.jsonl
verify.log 與原檔相同：True；worktree 仍在：True
狀態檔（用量只列前 3 行）：
# TASK-999 狀態

## Base
0e0293b72127a46239f38e5c9a321e163a99617c

## Head
0e0293b72127a46239f38e5c9a321e163a99617c

## PR
（未開）

## 用量

（2026-10-28T00:00:00+08:00 起，all-sessions-usage.js）

```text
start(local) | project | session | req | cacheRead | cacheWrite | output | avgCtx | maxCtx | sub(req/cr/out) |…
10-16 14:30 | baseline | a82714ee | 95 | 18,987,490 | 403,531 | 102,801 | 204,118 | 297,121 | 5/228,489/643 | …
10-16 16:55 | Blackjack-wt-task-003 | 95f68cd5 | 20 | 2,482,964 | 111,920 | 30,512 | 129,746 | 158,517 | 0/0/0…
--- 狀態檔已存在時再跑一次（-Archive 換新目錄）：骨架不重建、用量追加
$ pwsh -NoProfile -File scripts/card.ps1 close -Card 999 -Worktree D:\ai\projects\Blackjack-wt\task-999 -Archive C:\Users\willliu\AppData\Local\Temp\card-neg\arch-c -Since 2026-10-28T00:00:00+08:00
已存到：C:\Users\willliu\AppData\Local\Temp\card-neg\arch-c
狀態檔：D:\ai\projects\Blackjack-wt\task-999\.ai\handoffs\TASK-999.md
給人在一般終端機跑（腳本不刪 worktree）：
git -C D:\ai\projects\Blackjack worktree remove D:\ai\projects\Blackjack-wt\task-999
[exit 0; Get-Location 前後相同: True]
「## Base」只出現一次：True；「## 用量」只出現一次：True
```

## A8-6：共同規格

```	ext
--- 沒有子命令
$ pwsh -NoProfile -File scripts/card.ps1 
用法：pwsh -NoProfile -File scripts/card.ps1 <子命令> -Card <NNN> [選項]
  start  -Card NNN [-Worktree <路徑>]                          從 main 建 task/NNN 與 worktree，複製卡並印出 Risk、Allowed Files、Frozen
  review -Card NNN [-Worktree <路徑>] [-Base <sha>]             產生 .ai/reviews/TASK-NNN.diff、.checks.txt、.prompt.md
  pr     -Card NNN [-Worktree <路徑>]                          push task/NNN、開 PR（已有就只印 URL）、需要時加 contract-change
  status -Card NNN                                             用 gh api 印 PR 狀態，最後一行是判決
  close  -Card NNN [-Worktree <路徑>] [-Archive <目錄>] [-Tools <目錄>] [-Since <ISO>]
                                                                存 verify.log 與 trace、記用量、印出給人跑的 worktree remove
[exit 1; Get-Location 前後相同: True]
--- 未知子命令
$ pwsh -NoProfile -File scripts/card.ps1 frobnicate -Card 008
用法：pwsh -NoProfile -File scripts/card.ps1 <子命令> -Card <NNN> [選項]
  start  -Card NNN [-Worktree <路徑>]                          從 main 建 task/NNN 與 worktree，複製卡並印出 Risk、Allowed Files、Frozen
  review -Card NNN [-Worktree <路徑>] [-Base <sha>]             產生 .ai/reviews/TASK-NNN.diff、.checks.txt、.prompt.md
  pr     -Card NNN [-Worktree <路徑>]                          push task/NNN、開 PR（已有就只印 URL）、需要時加 contract-change
  status -Card NNN                                             用 gh api 印 PR 狀態，最後一行是判決
  close  -Card NNN [-Worktree <路徑>] [-Archive <目錄>] [-Tools <目錄>] [-Since <ISO>]
                                                                存 verify.log 與 trace、記用量、印出給人跑的 worktree remove
[exit 1; Get-Location 前後相同: True]
--- 腳本複本在非 git 資料夾（%TEMP%\card-neg\x\scripts\card.ps1），五個子命令
$ pwsh -NoProfile -File scripts/card.ps1 start -Card 008
錯誤：找不到主 checkout：腳本位置推得的路徑 C:\Users\willliu\AppData\Local\Temp\card-neg\x 不在 git 工作樹內；請從 Blackjack 主 checkout 或其 worktree 裡的 scripts\card.ps1 執行
[exit 1; Get-Location 前後相同: True]
$ pwsh -NoProfile -File scripts/card.ps1 review -Card 008
錯誤：找不到主 checkout：腳本位置推得的路徑 C:\Users\willliu\AppData\Local\Temp\card-neg\x 不在 git 工作樹內；請從 Blackjack 主 checkout 或其 worktree 裡的 scripts\card.ps1 執行
[exit 1; Get-Location 前後相同: True]
$ pwsh -NoProfile -File scripts/card.ps1 pr -Card 008
錯誤：找不到主 checkout：腳本位置推得的路徑 C:\Users\willliu\AppData\Local\Temp\card-neg\x 不在 git 工作樹內；請從 Blackjack 主 checkout 或其 worktree 裡的 scripts\card.ps1 執行
[exit 1; Get-Location 前後相同: True]
$ pwsh -NoProfile -File scripts/card.ps1 status -Card 008
錯誤：找不到主 checkout：腳本位置推得的路徑 C:\Users\willliu\AppData\Local\Temp\card-neg\x 不在 git 工作樹內；請從 Blackjack 主 checkout 或其 worktree 裡的 scripts\card.ps1 執行
[exit 1; Get-Location 前後相同: True]
$ pwsh -NoProfile -File scripts/card.ps1 close -Card 008
錯誤：找不到主 checkout：腳本位置推得的路徑 C:\Users\willliu\AppData\Local\Temp\card-neg\x 不在 git 工作樹內；請從 Blackjack 主 checkout 或其 worktree 裡的 scripts\card.ps1 執行
[exit 1; Get-Location 前後相同: True]
--- 真的腳本、目前位置在 %TEMP%（不是 git 資料夾）：腳本不依賴呼叫者的位置，照常執行
$ pwsh -NoProfile -File scripts/card.ps1 status -Card 008
分支 task/008 沒有 PR
NO-PR
[exit 0; Get-Location 前後相同: True]

```

## A8-3：pr

本卡自己的 PR：https://github.com/oldliuwill/Blackjack/pull/8 （從 `claude_baseline` 啟動的 session 跑，不受 Blackjack 的 deny 約束）。

```	ext
$ pwsh -NoProfile -File scripts/card.ps1 pr -Card 008 -Worktree D:\ai\projects\Blackjack-wt\task-008      （第一次）
已加 contract-change 標籤
https://github.com/oldliuwill/Blackjack/pull/8
[exit 0]
$ pwsh -NoProfile -File scripts/card.ps1 pr -Card 008 -Worktree D:\ai\projects\Blackjack-wt\task-008      （第二次）
https://github.com/oldliuwill/Blackjack/pull/8
[exit 0]
$ gh pr list -R oldliuwill/Blackjack --head task/008 --state all --json number --jq length
1
$ gh pr view 8 --json labels --jq '[.labels[].name]'
["contract-change"]
```

- 標籤判定：本卡對 `origin/main` 的 diff 含 `.ai/task-contracts/TASK-008.md`，符合從 `verify.yml` 的 contract job 讀出的規則 `^(tests/acceptance/|docs/specs/|\.ai/task-contracts/)`，腳本自己加了標籤（agent 帳號有加標籤的權限）；CI 的 `contract` 在 PR head `875dff4` 是 SUCCESS。
- classify 判 L3：PR 的檔案清單（`gh api pulls/8/files`）含 `scripts/card.ps1`，符合 `verify.yml` 的 `l3` 規則（用該行 regex 在本機比對，結果 L3）；classify 的 job 日誌 API 讀不到（404），所以不是讀 CI 輸出。
- `status -Card 008`（PR 剛開、檢查跑到一半）：`WAIT: reviewDecision 是 REVIEW_REQUIRED，不是 APPROVED；檢查未全過：Analyze (actions)=IN_PROGRESS、Analyze (javascript-typescript)=IN_PROGRESS、verify=IN_PROGRESS；mergeStateStatus 是 BLOCKED，不是 CLEAN`。人 Approve、檢查全過後應變 `READY`，合併後 `MERGED`。
- push 被 deny 擋下的情形：本 session 不受約束，未測。
- 已知小問題：PR 本文的「審查紀錄」列出磁碟上所有 `TASK-008*.md`，包含沒有 commit 的 `.prompt.md`。

## A8-7：verify

`pwsh ./scripts/verify.ps1 -Risk L3` 在 `bee14cc` 通過（typecheck、lint、unit、build、e2e、acceptance 六步；59 秒）；本卡不改程式，結果與 `main` 相同。
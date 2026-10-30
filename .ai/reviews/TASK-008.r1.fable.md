# TASK-008 審查紀錄 第 1 輪：Fable

- base：446c1f21ca056a29382ccf6b55bb52450b69eedd
- head：f6e610e0260f65ed22afdd9d5ced1ca66f53b756
- date：2026-10-28
- diff：.ai/reviews/TASK-008.diff（gitignore；由 `card.ps1 review -Card 008 -Base 446c1f2` 產生）
- reviewer：`calib-reviewer` 定義檔（Read、Grep、Glob；非 fork），呼叫時帶 `model: fable`、`effort: high`；模型從 transcript 的 `message.model` 抄：`claude-fable-5-1`（29 則）
- 說明：`diff-reviewer` 定義檔在 Blackjack 的 `.claude/agents/`，本 session 從 `claude_baseline` 啟動、載不到，改用 `claude_baseline\.claude\agents\calib-reviewer.md`（同樣的唯讀工具與審查原則），九問寫在提示裡
- 兩位審查者互不看；以下為回報原文
- 協調者重現結果：BLOCKING 0 筆，無需重現。TEST GAPS 1 已核對：腳本在 3274e92 與 f6e610e 之間 0 行差異

---

## TASK-008 審查（scripts/card.ps1）

- base：446c1f21ca056a29382ccf6b55bb52450b69eedd
- head：f6e610e0260f65ed22afdd9d5ced1ca66f53b756
- diff 只含兩個新檔：`scripts/card.ps1`（Allowed Files）與 `.ai/reviews/TASK-008.negative.md`（卡列為執行時產生的檔案）。沒有碰 verify.ps1、check-acceptance-diff.ps1、`.github/**`、`.claude/**`、AGENTS.md、tests/、package*.json、docs/specs、.ai/task-contracts。沒有新增相依套件。
- 特別核對：全檔的 gh 呼叫只有 `gh pr list`、`gh pr create`、`gh pr edit --add-label`、`gh api`（REST 與 graphql）；沒有 `gh pr merge`、`gh pr review`、沒有讀 `.env`、沒有呼叫任何 LLM。

### BLOCKING

無。

### NON-BLOCKING

1. `scripts/card.ps1:322-325`｜`pr` 子命令加 `contract-change` 標籤失敗時只印「注意：…請人加」並以 exit 0 結束｜共同規格「任何失敗 exit 1 並印出一行原因」；A8-3「碰到 … 時加 contract-change 標籤」｜重現：在 repo 暫時沒有 `contract-change` 這個 label（或用無權限的 gh token）的情況下跑 `pwsh -NoProfile -File scripts/card.ps1 pr -Card 008 -Worktree D:\ai\projects\Blackjack-wt\task-008`：PR 建立、`gh pr edit` 失敗、腳本印警告後 `$LASTEXITCODE` 為 0。CI 的 contract job 仍會失敗，所以關卡沒有被削弱，只是與共同規格的 exit 碼約定不一致；協調 session 若只看 exit 碼會漏掉。

2. `scripts/card.ps1:363-367`｜`MERGED` 的判定比卡的文字更嚴：要求 APPROVED review 的 `commit.oid` 等於最終 `headRefOid`；卡只寫「合併前有 APPROVED review」｜A8-4、「依 admin bypass 紀錄的判定方式」（我手上沒有那份紀錄，無法確認哪個定義才是對的）｜重現（推導）：PR 在 commit X 得到 APPROVED，之後再 push 一個 commit Y 且 ruleset 沒有 dismiss stale review，人直接合併 → GitHub 視為有 APPROVED，腳本印 `MERGED-BYPASS`。五個對照 PR（#3、#4、#5、#6、#7）都沒有這種情形，所以負向測試分不出兩種定義；請協調者對照 admin bypass 紀錄確認「換 head 後未重新核准」是否算繞過。

3. `scripts/card.ps1:357`｜`"$($r.commit.oid)".Substring(0, 7)`：GraphQL 的 `PullRequestReview.commit` 可為 null（被 force-push 掉的 commit 上的 review），此時字串為空，`Substring(0,7)` 擲 ArgumentOutOfRange，`status` 以「錯誤：…」exit 1，印不出判決｜A8-4「印出 … 最後一行是判決」｜重現：對任一含有「review 所在 commit 已不在分支歷史」的 PR 跑 `status`；本 repo 目前沒有這種 PR，屬邊界情況。

4. `scripts/card.ps1:7`、`41-49`｜`#requires -Version 7`，但 `Invoke-Native` 在 `$ErrorActionPreference='Stop'` 下用 `2>&1` 收 stderr；PS 7.0/7.1（`PSNotApplyErrorActionToStderr` 尚未預設開啟）時，git/gh 一寫 stderr 就會以 NativeCommandError 終止，而不是走 `-Soft` 分支。本機（負向測試能正確印出 git 的錯誤訊息）顯然是 7.2+｜共同規格「失敗 exit 1 並印出一行原因」｜重現：用 pwsh 7.1 跑 `start -Card 999` 第二次，預期訊息「分支 task/999 已存在」會變成 PowerShell 的 NativeCommandError。建議改 `#requires -Version 7.2`（屬精確化，非行為改變）。

5. `scripts/card.ps1:160-171`｜`start` 的回滾只涵蓋 `git worktree add` 失敗；worktree 建好之後 `New-Item`／`Copy-Item`／`ReadAllLines` 若失敗，分支與 worktree 會留著｜共同規格「失敗時不留下半成品（檔案、分支、worktree）」｜重現：先在 `D:\ai\projects\Blackjack\.ai\task-contracts\TASK-999.md` 放一個被其他程序獨占鎖住的檔（或設成無讀取權限），跑 `start -Card 999`：exit 1，但 `git worktree list` 多一列、`git branch --list task/999` 有值。機率低、人可手動清。

6. `scripts/card.ps1:56-61`、負向測試紀錄第 10 行｜A8-6「在 `%TEMP%` 執行任一子命令，exit 1 且訊息指出主 checkout 的路徑」在字面上與共同規格「主 checkout 由腳本所在位置推得，不依賴呼叫者的目前位置」相衝；實作選了共同規格（在 `%TEMP%` 呼叫 repo 內的腳本照常成功），負向測試改成「腳本複本放在非 git 資料夾」。這是卡的文字問題，不是程式錯；請人確認 A8-6 的意圖並在卡上修正用語，否則 A8-6 字面上沒有被滿足｜重現：`Set-Location $env:TEMP; pwsh -NoProfile -File D:\ai\projects\Blackjack-wt\task-008\scripts\card.ps1 status -Card 008` → exit 0、印 `NO-PR`。

7. `scripts/card.ps1:289-293`｜`pr` 用 `--state all` 找既有 PR：分支若曾有一個被 close（未合併）的 PR，再跑 `pr` 只會印舊 PR 的 URL，不會開新 PR｜A8-3「PR 已存在時只印 URL，不再建」字面上允許，但「已存在」是否包含 closed 的 PR 由人決定｜重現：對有 closed PR 的分支跑 `pr`，看印出的 URL 是 closed PR。

### TEST GAPS

1. 負向測試紀錄（`.ai/reviews/TASK-008.negative.md:3`）宣告測於 `3274e92`，而審查 head 是 `f6e610e`。請協調者確認 `git -C D:\ai\projects\Blackjack-wt\task-008 diff 3274e92 f6e610e -- scripts/card.ps1` 為空；若不為空，依紀錄自己寫的規則需重跑覆寫。
2. A8-3（`pr`）尚未執行（紀錄第 397-399 行寫「待本卡的 PR 建立後補」），卡的 Verification Contract 本就安排在本卡 PR 上驗；DoD「A8-7 的負向測試紀錄齊全」要等補完才成立。補驗時請同時記：本卡 diff 對 `origin/main` 含 `.ai/task-contracts/TASK-008.md`，腳本應自動加 `contract-change`；第二次跑只印 URL；`gh pr list --head task/008` 仍 1 筆。
3. A8-4 對照組缺 PR #2（admin bypass 紀錄列為繞過）；對應的 `-Card` 編號需由協調者查。卡上寫的「`status -Card 005` → PR #5」對應錯誤，紀錄已說明（PR #5 是 task/004），卡的這一格應更正。
4. `start` 的 `git worktree add` 失敗回滾路徑（第 161-165 行）沒有被任何負向測試觸發。
5. `review` 的 `§a–§b` 範圍語法（第 134-139 行）與多個 SPEC 檔的情形沒有測到；本卡的 Spec 欄只有單一 § 清單。另：`§4.1–4.3`（第二個沒有 §）這種寫法會只取到 §4.1、丟掉 §4.3，若之後的卡用這種寫法會漏段。
6. `close` 不給 `-Since`、以及預設 `-Tools` 不存在時「略過用量」的分支（第 389、391 行）沒有測。

### NO ISSUE

- A8-1：`start` 等同 v2.0 §6 第 6 步 `git -C <main> worktree add <path> -b task/NNN main`（第 160 行）；分支或路徑已存在先擋（第 157-158 行）；卡複製與 Risk／Allowed Files／Frozen 三欄輸出；負向測試（第二次、`-Card 99`）與對照組紀錄齊全。
- A8-2：dirty 檢查排除自己上一輪的三個檔案，`.ai/reviews/` 在 main 有被追蹤檔案，不會出現目錄摺疊成 `?? .ai/reviews/` 的誤判；`-Base` 驗存在且為 HEAD 祖先；diff 由 git `--output` 寫入暫存檔再搬移（第 37 項），兩組 SHA-256 與 `cmd /c` 對照相同；SPEC 行號我對照 `docs/specs/SPEC-001.md` 標題行驗過：§6.2 306-325、§6.3 326-338、§7 349-371、§8.1 374-383、§8.3 398-408 均正確（Section-Range 的結束規則「下一個同級或更高級標題前一行」與此一致，fence 內的 # 不算）。
- A8-3 的 contract-change 規則：第 297 行用 regex 從 `.github/workflows/verify.yml` 第 83-84 行的 `touches '…'; then if [ "$HAS_LABEL" != true ]` 讀出 `^(tests/acceptance/|docs/specs/|\.ai/task-contracts/)`，不是手抄；比對集合用 `git fetch origin main` 後的 `git diff --name-only -z origin/main...HEAD`，與 contract job 第 77 行同一範圍；yml 第 115 行另一個 `touches` 後面不是 `if [ "$HAS_LABEL"`，不會誤配。
- A8-4：只用 `gh api`（REST 列 PR、GraphQL 取細節）；READY 條件為 OPEN、reviewDecision=APPROVED、所有 check 最新一次為 SUCCESS/NEUTRAL/SKIPPED、mergeStateStatus=CLEAN；WAIT 列缺項；NO-PR；同名 check 取最新一次（處理 label 變更重跑）。五個對照 PR 的判決與手動 `gh api` 一致。
- A8-5：archive 非空不覆寫；`-Tools` 不存在時在任何寫入前就 exit 1；用量先算再建 archive；狀態檔骨架四節、重跑不重建、用量追加；只印 `git -C <main> worktree remove <wt>`，不刪。
- A8-6：沒有子命令或未知子命令印用法 exit 1；所有 git 用 `-C`，唯一需要工作目錄的 tsc/eslint 用 Push-Location/Pop-Location 包在 try/finally；紀錄中每一次執行 Get-Location 前後相同。
- A8-7：`verify.ps1 -Risk L3` 在 head `f6e610e` PASS（checks.txt 第 12 行）；tsc、eslint exit 0。
- 錯誤處理：所有子命令在單一 try/catch 內，失敗印「錯誤：<一行>」exit 1；`review` 在寫檔前完成所有驗證，失敗時三個檔案都不存在（紀錄已證）。
- 輸出 UTF-8（第 20 行）、檔案寫入用無 BOM UTF-8、`core.quotePath=false` 與 NUL 分隔比照 check-acceptance-diff.ps1。
- Risk L3 合理（`scripts/**` 加上 push／開 PR 的網路副作用）；關卡（verify.ps1、CI、ruleset）未被修改或繞過，`status` 只是讀取與判讀，不替代 GitHub 的合併保護。

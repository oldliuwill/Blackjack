# TASK-008 審查紀錄 第 1 輪：Opus

- base：446c1f21ca056a29382ccf6b55bb52450b69eedd
- head：f6e610e0260f65ed22afdd9d5ced1ca66f53b756
- date：2026-10-28
- diff：.ai/reviews/TASK-008.diff（gitignore；由 `card.ps1 review -Card 008 -Base 446c1f2` 產生）
- reviewer：`calib-reviewer` 定義檔（Read、Grep、Glob；非 fork），呼叫時帶 `model: opus`、`effort: medium`；模型從 transcript 的 `message.model` 抄：`claude-opus-5-5`（21 則）
- 說明：`diff-reviewer` 定義檔在 Blackjack 的 `.claude/agents/`，本 session 從 `claude_baseline` 啟動、載不到，改用 `claude_baseline\.claude\agents\calib-reviewer.md`（同樣的唯讀工具與審查原則），九問寫在提示裡
- 兩位審查者互不看；以下為回報原文
- 協調者重現結果：BLOCKING 0 筆，無需重現。TEST GAPS 1（負向測試 head 與審查 head 的腳本是否有差）已核對：`git diff 3274e92 f6e610e -- scripts/card.ps1` 為 0 行

---

審查範圍：base 446c1f21ca056a29382ccf6b55bb52450b69eedd，head f6e610e0260f65ed22afdd9d5ced1ca66f53b756

diff 只動了兩個檔案：scripts/card.ps1（新增）與 .ai/reviews/TASK-008.negative.md（執行時產生的審查檔，不算 Allowed Files）。沒有改到 Forbidden Changes 列的檔案、任務卡、SPEC 或 tests/acceptance/，也沒有新增相依套件。

## BLOCKING

無。逐條對照 A8-1～A8-7、共同規格、Non-goals、Forbidden Changes 與 SPEC 範圍後，沒有找到會影響正確性、違反卡，或削弱驗證關卡且能重現的問題。

## NON-BLOCKING

1. scripts/card.ps1:322-325｜`contract-change` 標籤加不上時只印「注意」，PR 照樣建立，最後 exit 0。｜依據：共同規格「任何失敗 exit 1 並印出一行原因」。CI 的 contract job（verify.yml:83-87）沒有這個標籤就會失敗，所以關卡沒有被削弱，但跟「任何失敗 exit 1」的字面不一致。｜重現：用一個沒有 `contract-change` 標籤權限的 token（或先在 repo 刪掉這個 label），對一個碰到 `.ai/task-contracts/` 的新分支跑 `pwsh -NoProfile -File scripts/card.ps1 pr -Card NNN`。預期 exit 1，實際印「注意：加 contract-change 標籤失敗…」後 exit 0。

2. scripts/card.ps1:289-293｜PR 已存在時直接 return，不會重新判定標籤。PR 開了之後才加的契約變更，腳本不會補標籤。｜依據：A8-3 只要求「PR 已存在時只印 URL」，所以這是照卡做的；由 CI contract job 兜底。列出來給人知道。｜重現：PR 開好後再 commit 一個 `docs/specs/` 的修改，再跑 `pr`。只會印 URL，不會加標籤。

3. scripts/card.ps1:366｜MERGED 的條件除了卡寫的「合併前有 APPROVED review」，還多要求 review 的 `commit.oid` 等於 `headRefOid`，比卡的字面嚴格。｜依據：A8-4 的定義寫的是「合併前有 APPROVED review」。方向保守（只會多判 MERGED-BYPASS，不會漏判繞過），五個對照 PR 的結果也跟 admin bypass 紀錄一致。這是否等於紀錄裡的判定方式，要人確認。｜重現：假設某個 PR 先在 commit X 上 APPROVED，之後推了 commit Y，也沒有 dismiss stale review 就合併。`status` 會印 MERGED-BYPASS，照卡的字面應該是 MERGED。

4. scripts/card.ps1:345、349｜每個檢查取「startedAt 最新的那次」。排隊中的 CheckRun 的 `startedAt` 是 null，`[datetime]$null` 會變成最早的時間，結果選到較舊、已完成的那次。重跑排隊時可能把舊的 SUCCESS 當成現況。另外第 357 行：review 的 `commit` 是 null 時（例如 force-push 後 commit 已被回收），`.Substring(0,7)` 會丟例外，整個 status 變成 exit 1。｜依據：A8-4 要求印「每個 check 的名稱與結論」。READY 另外還要求 `mergeStateStatus` 為 CLEAN，所以必要檢查還在等的時候不會誤判 READY，影響有限。｜重現：在 open 的 PR 上加或拿掉 `contract-change` 標籤讓 workflow 重跑，排隊期間（job 還沒開始）立刻跑 `status -Card NNN`。checks 那一節會印出舊的結論，而不是 QUEUED。

5. scripts/card.ps1:54-61｜A8-6 寫「在 %TEMP% 執行任一子命令，exit 1 且訊息指出主 checkout 的路徑」，但共同規格要求主 checkout 從腳本位置推得、不依賴呼叫者位置，兩者字面衝突。實作者照共同規格做，在負向測試紀錄第 10 行說明了改測的方式（把腳本複本放到 %TEMP%）。｜依據：卡的 A8-6 與共同規格。程式本身沒有錯，但卡文字的出入要人裁定接不接受。｜重現：在 %TEMP% 下跑 `pwsh -NoProfile -File D:\ai\projects\Blackjack\scripts\card.ps1 status -Card 008`，結果是 exit 0（紀錄第 389-393 行），不是 A8-6 字面要的 exit 1。

6. scripts/card.ps1:160-171、400-427｜有幾條失敗路徑會留下半成品。`start` 在 worktree add 成功後，如果複製卡失敗，分支和 worktree 都會留著。`close` 在 archive 複製完之後，如果第 421-422 行的 git 呼叫失敗，archive 目錄會留著。`review` 在乾淨檢查失敗時，前一輪的三個檔案仍在，可能被誤當成這一輪的結果。｜依據：共同規格「失敗時不留下半成品」。這些都是少見的情況，而且都會 exit 1。｜重現：`close` 那條可以這樣跑：在 worktree 裡刪掉本地的 main 分支參照（或改名），讓 `merge-base main HEAD` 失敗，再跑 `close -Card 999 -Archive <新目錄>`。預期 exit 1，且新目錄裡已經有 verify.log。

7. scripts/card.ps1:193｜如果 `.ai/reviews/` 底下完全沒有已追蹤的檔案，porcelain 輸出會把整個目錄縮成 `?? .ai/reviews/`，不在豁免清單裡。第二輪 review 會被誤判為「不乾淨」。這只會造成誤擋，方向安全。｜依據：A8-2 寫的是「工作區必須乾淨」。｜重現：在一個 `.ai/reviews/` 沒有任何已追蹤檔的新分支上連跑兩次 `review`。第二次預期 exit 1，訊息是「工作區不乾淨…?? .ai/reviews/」。

## TEST GAPS

1. .ai/reviews/TASK-008.negative.md:3｜負向測試是對腳本 3274e92 跑的，被審查的 head 是 f6e610e，中間還有 bee14cc。紀錄自己寫了「腳本在這之後若再改動，本檔重跑後覆寫」。協調者要跑 `git -C D:\ai\projects\Blackjack-wt\task-008 diff 3274e92 f6e610e -- scripts/card.ps1` 確認有沒有差異。有差異就要對 head 重跑，否則 A8-7 的「用改後的腳本跑」不成立。

2. negative.md:397-399｜A8-3 還沒驗：第一次建 PR、第二次只印 URL、`gh pr list --head task/008` 仍是 1 筆、`contract-change` 的判定都還沒有紀錄。照 DoD，A8-7 的紀錄必須齊全，所以要在本卡 PR 建立後補上，才能算完成。

3. A8-4 只測了已合併的 PR（MERGED、MERGED-BYPASS）和 NO-PR，沒有 READY 或 WAIT 的實測。本卡自己的 PR 開好後，至少可以補一筆 WAIT（還沒 APPROVED），人 Approve 後再補一筆 READY。

4. 下面幾條失敗路徑都沒有測：`start` 的 worktree add 失敗後回收分支（第 161-165 行）、`pr` 的 push 被 deny 擋下（紀錄第 11 行已說明本 session 測不到）、`pr` 的 contract 規則讀不到時 exit 1（第 298 行）。

5. A8-2 的「工作區不乾淨時三個檔案都不存在」，是在當時沒有前一輪產物的情況下測的。沒有測過前一輪產物已存在、這次失敗的情況（見 NON-BLOCKING 6）。

## NO ISSUE

- 禁止的呼叫：腳本裡沒有 `gh pr merge`、`gh pr review`，沒有讀 `.env`，也沒有呼叫 LLM。`gh` 只用在 `pr list`、`pr create`、`pr edit --add-label`、`api`。
- contract-change 規則：第 296-302 行用 regex 從 worktree 的 `.github/workflows/verify.yml` 抓出 `touches '…'; then if [ "$HAS_LABEL" != true ]` 那條路徑規則（verify.yml 第 83-84 行），不是手抄。比對用 `git diff --name-only -z origin/main...HEAD`，跟 CI 的 `origin/$BASE_REF...HEAD` 是同一個集合。yml 格式改掉、抓不到規則時會 exit 1。
- status 的判決：READY 要求未合併、APPROVED、檢查全過、CLEAN。缺任何一項就印 `WAIT: <缺的項目>`。已合併時依「合併前有 APPROVED」分成 MERGED 和 MERGED-BYPASS；沒有 PR 印 NO-PR。只用 `gh api`（REST 與 GraphQL）。五個對照 PR 的結果跟紀錄裡手動跑的 `gh api` 一致（#3、#5 是繞過；#4、#6、#7 不是）。
- SPEC 行號範圍：prompt 裡 §6.2 第 306–325 行、§6.3 第 326–338 行、§7 第 349–371 行、§8.1 第 374–383 行、§8.3 第 398–408 行，都跟 SPEC-001.md 實際的標題行對得上。
- A8-1：分支和路徑重複時 exit 1，訊息含「已存在」；`-Card` 不是三位數時在建任何東西之前就 exit 1；主 checkout 有未 commit 的卡時會複製進 worktree；Risk、Allowed Files、Frozen 三欄的輸出也都跟卡一致。
- A8-2：diff 由 git 自己用 `--output` 寫出，SHA-256 跟手動對照組一致；`-Base` 不在歷史裡、或不是 HEAD 的祖先，都會 exit 1；checks 和 prompt 的內容符合卡的要求。
- A8-5：`-Archive` 已存在且非空、`-Tools` 指到不存在的目錄，都在動到任何檔案之前就 exit 1。用量追加到狀態檔；狀態檔不存在時會建骨架，四節都有。worktree 只印出給人跑的 remove 指令，不自己刪。
- A8-6：所有子命令都用 `git -C` 加絕對路徑；唯一的 Push-Location（第 222-232 行）有 try/finally 包住，所以呼叫者的位置不變。沒給子命令時印用法並 exit 1，UTF-8 輸出也有設定。
- A8-7：checks.txt 第 12 行有 head f6e610e 的 `verify.ps1 -Risk L3 PASS`。tsc 和 eslint 都是 exit 0。
- 九問中的第 3、4、6、9 問（繞過公開入口、新增相依套件、過擬合驗收條件、關卡被削弱或可繞過）：沒有發現問題。Risk 定為 L3 合理。

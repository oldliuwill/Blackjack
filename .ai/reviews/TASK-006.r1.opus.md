# TASK-006 審查 r1：Opus（`diff-reviewer`，定義檔的 Opus、effort medium）

- base：`500f8116c4c0eb6e30f1c22dde38233f660b7ac6`（寫卡的 commit；之前的四個規劃 commit 不在範圍）
- head：`4aadac14edaf459ba10ec9367ea22c9fc00ae2d0`（實作）
- date：2026-10-21
- diff：`.ai/reviews/TASK-006.diff`（273 行，git-ignore，由協調者用 `git diff --output` 產生）
- reviewer：`claude-opus-5-5`，effort `medium`（transcript 的 `message.model`、`effort`；工具：Read、Grep、Glob、SubagentHandback）
- 給審查者的材料：卡、diff、SPEC 1.1 的行號（§5、§6.3–§6.4、§7、§8.1）、baseline v2.0 A2／A9／A16／A19 的行號、AGENTS.md 等現行檔案、`TASK-006.negative.md`（這一版，沒有「補充」一節）、`.ai/metrics/TASK-006.checks.txt`；兩位審查者同一份提示、互不看
- 子代理 transcript 的用量（`tools/subagent-report.js`）：11 個請求，最大 context 59,541，輸出 3,865 token，24 次工具呼叫，85 秒

## 審查者的報告（原文）

TASK-006 審查結果：0 個 BLOCKING。A6-1 到 A6-6 逐條對照 diff 與負向測試紀錄都成立。A6-7 是合併前由人設定、協調者用 API 核對，不在 diff 範圍。

審查範圍：base `500f8116c4c0eb6e30f1c22dde38233f660b7ac6`，head `4aadac14edaf459ba10ec9367ea22c9fc00ae2d0`。diff 273 行；Allowed Files 10 個，其中 5 個是機械式複製，所以不需要拆卡。

## BLOCKING
（無）

## NON-BLOCKING

1. `.claude/hooks/verify-gate.ps1:22`｜只設了 `InputEncoding`，沒設 `[Console]::OutputEncoding`。在 Big5 字碼頁下，`git rev-parse --show-toplevel` 回傳的中文根目錄會變亂碼，`Set-Location` 失敗；這是不會中斷執行的錯誤，hook 會繼續在 `cwd` 執行。如果 `cwd` 是 repo 的子資料夾，就找不到 `./scripts/verify.ps1`，結果是 exit 2。這是誤擋，不是放行，所以關卡沒有被繞過。現行 worktree 路徑 `D:\ai\projects\Blackjack-wt\task-NNN` 是純 ASCII，不受影響。｜依據：卡 A6-2 只要求設 `InputEncoding`；SPEC §6.4 也只寫輸入編碼。改動逐字照 baseline A9 範本（第 683 行），補上輸出編碼屬於後續工作。｜重現：照紀錄 A6-2 的 harness，把事件的 `cwd` 改成中文 repo 底下的子資料夾（例如 `<work>\scripts`），在 `chcp 950` 下跑改後的 hook。預期 stderr 出現 `Set-Location` 錯誤、結束碼 2、不產生標記檔。

2. `.github/workflows/verify.yml:105`｜祖先檢查還是 `git merge-base --is-ancestor "$frozen" HEAD`（HEAD 是 merge commit），差異檢查已改成 `"$HEAD_SHA"`，兩處比較的對象不一樣。如果 Frozen 只在 `main` 上、不在 PR head 的歷史裡，祖先檢查仍會通過。後面的 `git diff "$frozen" "$HEAD_SHA"` 還是會比到實際內容，只會多擋、不會放行。這段與 baseline A19 第 950 行相同，而且卡禁止大改 contract 以外的部分，所以只記錄。｜依據：SPEC §6.3 只寫「SHA 必須存在於歷史中」。｜重現：推導即可，不需要執行。

3. `.github/workflows/verify.yml:74,108`｜`HEAD_SHA` 為空時（只有非 `pull_request` 事件才會，但觸發條件只有 `pull_request`），`git diff --quiet "$frozen" ""` 會因為參數不明確而結束碼非 0，結果是報錯擋下。行為正確，只是錯誤訊息會誤寫成「Frozen 之後有變動」。不需要改。

4. `.ai/metrics/TASK-006.checks.txt:6-7`｜verify.log 的 PASS 是對 `500f811+dirty` 的工作樹跑的，不是對 head commit。「之後沒有檔案再變」只是說明，不是證據。依卡的 Definition of Done，CI 對 head commit 的 verify 會把關，所以不影響判定。

## TEST GAPS

1. A6-2：紀錄只用標記檔判斷，沒做 baseline A9「測法」要求的「解出的 `cwd` 與原字串相等」比對。卡指定的判準就是標記檔，所以符合卡。但事件裡的中文 `last_assistant_message` 有沒有被正確解出，這次沒驗到；hook 目前也沒有用到這個欄位。
2. A6-6：沒有用 CI 實際 checkout 出來的 merge commit 實測。負向測試是在 worktree 裡，以 HEAD 等於卡的 head 的情境模擬。在 CI 上，`pull_request.head.sha` 是 merge commit 的第二個父節點，`fetch-depth: 0` 會把它抓下來。這次 PR 的 contract job 輸出 `Frozen d95af4f…: tests/acceptance/ unchanged`，就是線上的實證；建議協調者在交接中記下這行。
3. A6-4：我是用肉眼逐行比對 baseline 的五個檔，沒有逐位元組比對。內容一致，包括 frontmatter 的 `model` 與 `effort`；行尾差異依規定忽略。

## NO ISSUE

- A6-1：`AGENTS.md` 沒有 Codex，`.claude/**` 與 `.github/**` 也都沒有。L3 集合（第 24 行）與 SPEC §7 第 353 行相同。第 27 行寫明 `docs/specs/**` 與 `.ai/task-contracts/**` 不提高等級，改由標籤與 CODEOWNERS 把關。第 43 行有「不得放寬…」，第 41 行有「由協調者或規劃 session 撰寫」，第 35 行寫明用 `Reflect`、字串鍵或動態 import 繞過一樣違規。專案特有的內容（引擎入口、`RandomSource`、storage、單項指令、Playwright 路徑）都保留。
- classify 一致性：`verify.yml:41` 的 l3 正則、`AGENTS.md:24`、CODEOWNERS（第 2–19 行），三處的 L3 集合與 SPEC §7 相同。CODEOWNERS 另外列的 `/docs/specs/` 與 `/.ai/task-contracts/` 符合 SPEC §7「保護機制」第 363 行。A6-5 的 harness 是從 yml 讀出規則，不是手抄；改後 11 組全部符合，改前四組的差異與卡上寫的相同。
- A6-2：`InputEncoding` 在第 11 行設定，早於第 12 行讀 stdin。管線與導向兩種方式下，改後都是結束碼 2 且產生標記檔，改前都沒有標記檔。也做了清理。
- A6-3：skill 裡沒有 Codex，沒有寫死日期，有 `-Base <撰寫前的 commit>`，有「然後 commit，不 push」。其餘七條規則都保留。原本「不是語法或匯入錯誤以外的原因」是雙重否定，改掉後語意更正確。
- A6-4：五個檔與 baseline 同名檔一致；`.claude/skills/diff-reviewer/` 已刪除。`settings.json`、`scripts/**`、`AGENTS.md` 都沒有殘留引用。
- A6-6：只動了 contract 的 env 一行和比較對象兩行，負向測試三種情況的結果都符合卡。
- `verify.yml`：觸發條件（第 5–9 行）、`permissions`（第 11–12 行）、`concurrency`（第 14–16 行）、job 相依（contract 與 verify 的 `needs: classify`）、`verify` 與 `dependency-review` 兩個 job 都沒有被動到。
- 範圍：diff 只碰 10 個 Allowed Files；沒有改 `settings.json`、CODEOWNERS、`scripts/**`、`src/**`、`tests/**`、`package*.json`、規格或卡；沒有新增相依套件。Risk 判為 L3 是正確的。

相關檔案：
- D:\ai\projects\Blackjack-wt\task-006\.github\workflows\verify.yml
- D:\ai\projects\Blackjack-wt\task-006\.claude\hooks\verify-gate.ps1
- D:\ai\projects\Blackjack-wt\task-006\AGENTS.md
- D:\ai\projects\Blackjack-wt\task-006\.claude\skills\acceptance-author\SKILL.md
- D:\ai\projects\Blackjack-wt\task-006\.ai\reviews\TASK-006.negative.md
- D:\ai\projects\Blackjack-wt\task-006\.ai\metrics\TASK-006.checks.txt

## 協調者重現與兩邊比較（2026-10-21）

兩位審查者的 BLOCKING 都是 0，沒有需要重現的 BLOCKING。NON-BLOCKING 與 TEST GAPS 我逐項處理如下（兩份紀錄附同一段）：

| 項目 | 來源 | 重現／核對 | 處理 |
| --- | --- | --- | --- |
| Stop hook 沒設 `OutputEncoding`（Big5 下含中文的根目錄路徑亂碼）、非 git 資料夾不會 `exit 0` | Opus NB1、Fable NB3 | 成立：A6-2 測試時就看到，已寫在 `TASK-006.negative.md`「附帶觀察」（`Set-Location` 在 hook.new.ps1:22 報錯；舊 hook 在 `%TEMP%` 會寫 `unknown.count`） | 不改：卡只要求 `InputEncoding`，專案路徑是 ASCII，A9 範本同寫法；列入試行紀錄與 v2.0 修訂，另開卡處理 |
| `merge-base --is-ancestor "$frozen" HEAD` 的對象仍是 merge commit，與後面 `"$HEAD_SHA"` 不一致 | Opus NB2 | 推導成立（merge commit 的歷史包含 main，祖先檢查比較寬），後面的 `git diff "$frozen" "$HEAD_SHA"` 仍會比到實際內容，只會多擋不會放行；A19 同寫法 | 不改（卡只要求差異檢查比 head）；記進試行紀錄 |
| `HEAD_SHA` 為空時錯誤訊息誤寫成「Frozen 之後有變動」 | Opus NB3 | 重現：`git diff --quiet d95af4f "" -- tests/acceptance` 結束碼 128（`fatal: bad revision ''`），會走進報錯分支。觸發條件只有 `pull_request`，`HEAD_SHA` 不會是空的 | 不改 |
| `verify.log` 的 PASS 是對 `500f811+dirty` 工作樹跑的 | Opus NB4 | 成立，`TASK-006.checks.txt` 已寫明；內容就是 `4aadac1` 的樹。完成以 CI 對 head 的 verify 為準：PR #6 head `964e90e` 的 verify 通過 | 不改 |
| AGENTS.md 第 29 行只寫「關卡腳本與 CI 另加 Fable 第二審」，漏了 SPEC §8.1 的「數值」 | Fable NB1 | 並排讀 `SPEC-001.md:378` 與 `AGENTS.md:29`，成立；A6-1 沒有要求這句措辭，專案的「數值」就是引擎，引擎卡本來就走 L3 的審查流程 | 不改（改了 head 要重審，只為一句 NON-BLOCKING 不值得）；列為下次動 AGENTS.md 時順手補 |
| acceptance-author skill 的「卡上 Acceptance 的確認欄」，現行卡沒有這一欄 | Fable NB2 | 成立：`grep` 確認欄／人工確認，只有 TASK-006 的 A6-3 本身命中；v2.0 A4 的卡範本有「人工確認」欄 | 不是本 diff 的缺陷（措辭照卡 A6-3）；交規劃 session：TASK-007 起的卡、以及 SPEC §9 之外的驗收，要在 Acceptance 表加這一欄 |
| 紀錄沒有說明 A6-2 的測試副本等於 head 的檔案 | Fable TG1 | 成立 | 已補：`TASK-006.negative.md` 末尾的「補充」，附 `git hash-object` 與 `git rev-parse <commit>:<path>` 的比對，測試副本與 head／main 的 blob 全部相同 |
| A6-2 沒有直接斷言解出的 `cwd` 與原字串相等 | Opus TG1、Fable TG2 | 卡的判準就是標記檔；標記檔寫在 `$dir`（事件的 `cwd`）底下，產生即表示 `cwd` 解碼正確 | 接受 |
| A6-6 沒有用 CI 實際 checkout 的 merge commit 實測 | Opus TG2 | 成立：已補在 `TASK-006.negative.md` 的「補充」：PR #6 的 contract job 環境 `HEAD_SHA` 是 PR head `964e90e`，輸出 `Frozen d95af4f…: tests/acceptance/ unchanged` | 已補 |
| A6-4 只用肉眼比對 | Opus TG3 | 我另用 `cmp`（`tr -d '\r'`）逐位元組比對，五個全部相同 | 已補在 `TASK-006.negative.md` 的「補充」 |
| A6-7 無法從檔案審 | Fable TG3 | 合併前由協調者用 API 核對（ruleset 的 `code_scanning`、CodeQL check run） | 等人設定後核對 |

**兩邊比較**：兩位的結論一致（BLOCKING 0，A6-1 到 A6-6 成立）。兩邊的 NON-BLOCKING 有重疊（hook 的 `OutputEncoding`），但那一項已經寫在我給他們的 `negative.md` 裡，不算獨立發現。各自獨有的：Opus 是 `--is-ancestor` 的對象不一致、`HEAD_SHA` 為空的訊息、`verify.log` 對的是 dirty 樹；Fable 是 AGENTS.md 漏「數值」、「確認欄」現行卡沒有、A6-2 紀錄缺副本的對應。成立的項目 Fable 獨有的三項都比 Opus 獨有的更貼近卡的內容（措辭與流程），Opus 獨有的兩項是 CI 腳本的邊角。用量：Opus 11 個請求、最大 context 59,541、85 秒；Fable 4 個請求、最大 context 68,680、169 秒、輸出 8,947 token（Opus 3,865）。這一張卡的審查沒有 BLOCKING，所以看不出兩邊的召回差距。

審查的 head 是 `4aadac1`；之後的 commit 只有 `.ai/reviews/` 的變更（負向測試紀錄、本審查紀錄）。

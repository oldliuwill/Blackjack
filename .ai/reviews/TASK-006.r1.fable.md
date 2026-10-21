# TASK-006 審查 r1：Fable（`diff-reviewer`，呼叫時帶 `model: fable`、`effort: high`）

- base：`500f8116c4c0eb6e30f1c22dde38233f660b7ac6`（寫卡的 commit；之前的四個規劃 commit 不在範圍）
- head：`4aadac14edaf459ba10ec9367ea22c9fc00ae2d0`（實作）
- date：2026-10-21
- diff：`.ai/reviews/TASK-006.diff`（273 行，git-ignore，由協調者用 `git diff --output` 產生）
- reviewer：`claude-fable-5-1`，effort `high`（transcript 的 `message.model`、`effort`；工具：Read、Grep、Glob、SubagentHandback）
- 給審查者的材料：卡、diff、SPEC 1.1 的行號（§5、§6.3–§6.4、§7、§8.1）、baseline v2.0 A2／A9／A16／A19 的行號、AGENTS.md 等現行檔案、`TASK-006.negative.md`（這一版，沒有「補充」一節）、`.ai/metrics/TASK-006.checks.txt`；兩位審查者同一份提示、互不看
- 子代理 transcript 的用量（`tools/subagent-report.js`）：4 個請求，最大 context 68,680，輸出 8,947 token，24 次工具呼叫，169 秒

## 審查者的報告（原文）

TASK-006 審查（治理檔改照 baseline v2.0）
base `500f8116c4c0eb6e30f1c22dde38233f660b7ac6` → head `4aadac14edaf459ba10ec9367ea22c9fc00ae2d0`
diff：`D:\ai\projects\Blackjack-wt\task-006\.ai\reviews\TASK-006.diff`（273 行，10 個檔，全部在 Allowed Files 內；其中 5 個定義檔為機械式複製，不需拆卡）

## BLOCKING

無。

## NON-BLOCKING

1. `D:\ai\projects\Blackjack-wt\task-006\AGENTS.md:29`｜「關卡腳本與 CI 另加 Fable 第二審」比 SPEC §8.1 第 1 點窄：SPEC 寫「觸及數值或關卡時加 Fable 第二審」，AGENTS.md 漏了「數值」｜依據：SPEC-001 §8.1 第 378 行；A6-1 沒有要求這一行的措辭，所以不算違反卡｜重現：並排讀 SPEC-001.md:378 與 AGENTS.md:29。影響只在協調者排審查時的提示，不影響關卡。

2. `D:\ai\projects\Blackjack-wt\task-006\.claude\skills\acceptance-author\SKILL.md:13`｜「照卡上 Acceptance 的確認欄寫」——措辭與 A6-3 一致，但現行卡的 Acceptance 表（含 TASK-006 自己，欄位是 #／Given-When-Then／預期值來源）沒有「確認欄」；TASK-007 起寫驗收的卡若沒加這一欄，驗收 session 無從照抄｜依據：卡 A6-3；`.ai/task-contracts/TASK-006.md:42-50`｜重現：Grep `確認欄` 只命中 TASK-006 的 A6-3 本身，沒有任何卡的表格有此欄。屬規劃流程待補，不是本 diff 的缺陷。

3. `D:\ai\projects\Blackjack-wt\task-006\.claude\hooks\verify-gate.ps1:22`｜負向紀錄「附帶觀察」第 1、2 點（Big5 下 `git rev-parse --show-toplevel` 的中文輸出未設 `OutputEncoding` 而 `Set-Location` 失敗；不在 repo 時 `-notmatch` 對空集合不會 `exit 0`）皆成立，與 baseline A9 範本行為相同，卡只要求 `InputEncoding`，專案路徑為 ASCII，本卡不需處理｜依據：卡 A6-2、Non-goals｜建議記進試行紀錄作為後續項，避免遺失。

## TEST GAPS

1. `.ai/reviews/TASK-006.negative.md` A6-2 一節：紀錄寫「改後取本卡的 hook」，但沒有像改前那樣附上取檔指令（改前有 `git show main:...`），也沒有 `hook.new.ps1` 的 hash；讀者無法從紀錄確認測的副本等於 head 的 `.claude/hooks/verify-gate.ps1`。A6-5 的 `l3 new`／`l1 new` 兩行與 head `verify.yml:41-42` 逐字相同、A6-6 的錯誤訊息與 head `verify.yml:109` 相同，這兩項可從紀錄自證；A6-2 補一行 `git hash-object` 或 `git show 4aadac1:.claude/hooks/verify-gate.ps1 > hook.new.ps1` 即可。
2. baseline A9 的測法是「解出的 `cwd` 要與原字串相等」，紀錄沒有直接斷言字串相等，改以標記檔為準（卡 A6-2 亦如此定義）。因標記檔是由 `$dir`（＝事件的 `cwd`）底下的 `./scripts/verify.ps1` 寫出、而新 hook 在第 22 行 `Set-Location` 失敗後仍停在 `$dir`，標記檔產生即隱含 `cwd` 解碼正確，可接受。
3. A6-7（ruleset code scanning、CodeQL check run）無法從檔案審，由協調者 API 核對與人完成。

## NO ISSUE

- A6-1：`AGENTS.md` 無 Codex（Grep `AGENTS.md`、`CLAUDE.md`、`.claude/**` 皆無命中）；第 24 行 L3 集合 14 項與 SPEC §7 第 353 行逐項相同；第 27 行寫明 `docs/specs/**`、`.ai/task-contracts/**` 不提高等級、由 `contract-change` 與 CODEOWNERS 把關；第 41 行「協調者或規劃 session」、第 43 行「不得放寬 verify.ps1 的必要步驟、Stop hook、lint 規則、CI 的觸發與權限」；第 35 行 `Reflect`、字串鍵、動態 import；專案特有內容（第 18–19、33–35 行）保留。
- A6-2：`verify-gate.ps1:11` 在 `:12` `ReadToEnd()` 之前設 `InputEncoding`；負向紀錄新 hook 管線／導向皆 exit 2、marker=True，舊 hook 兩次 marker=False；session_id 每次新建、事件無 BOM、從 `%TEMP%` 經 `chcp 950` 執行、測後清理，皆符合卡的程序。
- A6-3：skill 無 Codex；不寫死日期；第 22 行 `-Base <撰寫前的 commit>`、第 25 行「commit，不 push」；第 10–16 行其餘規則保留。
- A6-4：五個定義檔與 `D:\ai\projects\claude_baseline\.claude\agents\` 同名檔逐行比對相同（含 frontmatter 的 model／effort／tools）；Glob 顯示 `.claude/skills/` 只剩 `acceptance-author`，`diff-reviewer/` 已刪。對 `skills/diff-reviewer` 的殘留引用只在 TASK-001 卡（歷史卡，Forbidden Changes 內），不需處理。
- A6-5：`verify.yml:41` 的 l3 正則 14 項＝SPEC §7＝`AGENTS.md:24`；CODEOWNERS 為同一 14 項加 `/docs/specs/`、`/.ai/task-contracts/`，與 SPEC §7 第 363 行的描述一致；`:42` l1 與 `AGENTS.md:26` 一致，且 l3 先判。harness 以 `sed` 從 yml 取行、十一組結果與卡表一致、改前四組如卡所述不同。
- A6-6：`verify.yml:74` 新增 `HEAD_SHA`，`:108`、`:110` 改比 `"$HEAD_SHA"`；負向紀錄三組結果（新/X=1 且訊息為 Frozen 之後有變動、新/head=0、舊/X=0）符合卡；X 無分支引用。
- Forbidden Changes：`verify.yml` 第 5–9 行觸發、11–12 權限、14–16 concurrency、`needs` 關係、`verify` job（121–140）、`dependency-review`（142–149）未動；`.claude/settings.json`、`scripts/**`、CODEOWNERS、`src/**`、`tests/**`、`package*.json`、`docs/specs/**`、`.ai/task-contracts/**` 不在 diff 內。
- 無新增相依；無測試或 `tests/support/` 變動；`TASK-006.checks.txt` 顯示 tsc、eslint 0 與 `verify.ps1 -Risk L3` PASS。

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

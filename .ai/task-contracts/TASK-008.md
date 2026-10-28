# TASK-008：`scripts/card.ps1`（協調者的機械步驟做成一個指令）

Risk：L3（路徑：`scripts/**`；路徑之外的升級條件：關卡腳本的呼叫者）
Spec：docs/specs/SPEC-001.md@3f2c0fd303dff996e7bb630f59efb2bea18b6234 §6.2、§6.3、§7、§8.1 第 2 點、§8.3；baseline v2.0（`D:\ai\projects\claude_baseline\docs\AI 軟體開發規範 Baseline v2.0（純 Claude）.md`）§6 第 6、7、10 步、§8 六、A5、A7「協調者的指令」、A16；提案 `D:\ai\projects\claude_baseline\docs\proposal-v2.1-card-session-2026-10-28.md` §4.2
實作：從協調目錄（`D:\ai\projects\claude_baseline`）啟動的 session（Sonnet，effort xhigh），比照 bootstrap 例外（SPEC §8.1 第 2 點、baseline A11）：`scripts/**` 在 `.claude/settings.json` 的 deny 內，實作者 session 寫不進去。所有對 worktree 的操作用 `git -C`、`pwsh -NoProfile -Command "Set-Location <worktree>; …"`，不 `cd`（試行紀錄第 61 項）

Goal：把每張卡重複的機械步驟（建分支與 worktree、產審查用的 diff 與驗證結果、push 與開 PR、用 API 核對人的操作、收尾存檔與記用量）做成 `scripts/card.ps1` 的五個子命令，讓一個指令取代協調 session 的十次工具呼叫（決策 P5；試行量到每個協調 session 65–109 次 Bash 呼叫，提案 §2.2）。腳本不呼叫任何 LLM；審查者仍由 session 用 Agent 工具叫。

Non-goals：
- `.claude/settings.json` 的 deny（`git push` 的修訂是 D33 的決定，另開）；本卡的 `pr` 子命令在 deny 生效的 session 裡會被擋，屬預期
- `AGENTS.md` 的「push 與開 PR 由協調者做」（隨 D33 一起改）
- `verify.ps1`、`check-acceptance-diff.ps1`、`trace-summary.ps1` 的任何修改
- CI、Stop hook、審查者定義檔
- 自動合併、自動核准、自動刪 worktree（auto 模式擋刪檔，第 77 項；`close` 只印出給人跑的指令）

Allowed Files（1 個）：
1. `scripts/card.ps1`（新增）

執行時產生、不列入 Allowed Files 的檔案：`.ai/reviews/TASK-NNN.diff`（gitignore）、`.ai/reviews/TASK-NNN.checks.txt`、`.ai/reviews/TASK-NNN.prompt.md`、`.ai/handoffs/TASK-NNN.md`（狀態檔骨架）、`.ai/reviews/TASK-008.negative.md`（負向測試紀錄）。

Read First：
- 提案 §4.2（子命令表）與 §2.2（取代的步驟）
- baseline v2.0 A7「協調者的指令」的 PowerShell 片段（`review` 的規格來源）、§6 第 6 步（worktree 指令）、§8 六（人的操作核對：`APPROVED`、檢查全過、`mergeStateStatus` 為 `CLEAN`）、A5（狀態檔欄位）
- `scripts/verify.ps1`（`Log` 的格式、`.ai/metrics/verify.log` 的欄位）、`scripts/check-acceptance-diff.ps1`（`[Console]::OutputEncoding`、`git -c core.quotePath=false`、NUL 分隔的寫法）
- `.github/workflows/verify.yml` 的 `contract` job（`contract-change` 標籤的路徑規則，`pr` 子命令要與它一致）
- 試行紀錄第 37 項（`git diff --output`，PowerShell 的 `>` 會把 UTF-8 轉成亂碼）、第 79 項（非引擎 L3 卡的 diff 基準是 `merge-base main HEAD`）、第 80 項（行號指檔案本身）、第 85 項（用繁體中文回報）、admin bypass 紀錄（`status` 的「繞過」判定）

Research：無

Forbidden Changes：
- `scripts/verify.ps1`、`scripts/check-acceptance-diff.ps1`、`scripts/trace-summary.ps1`
- `.claude/**`、`.github/**`、`AGENTS.md`、`CLAUDE.md`
- `src/**`、`tests/**`、`package.json`、`package-lock.json`
- `docs/specs/**`、`.ai/task-contracts/**`（準備用的 commit 除外）

共同規格（每個子命令都適用）：
- 參數：`-Card <NNN>`（三位數）；需要 worktree 的子命令用 `-Worktree <絕對路徑>`，預設 `<主 checkout 的上一層>\Blackjack-wt\task-<NNN>`；主 checkout 由腳本所在位置推得（`Split-Path -Parent $PSScriptRoot`），不依賴呼叫者的目前位置
- 不改呼叫者的位置：`Get-Location` 在執行前後相同；內部用 `git -C` 與絕對路徑
- 輸出 UTF-8（`[Console]::OutputEncoding`）；成功 exit 0，任何失敗 exit 1 並印出一行原因；失敗時不留下半成品（檔案、分支、worktree）
- 不讀取 `.env`；不呼叫 LLM；不呼叫 `gh pr merge`、`gh pr review`

Acceptance：
| # | Given / When / Then | 預期值來源 | 負向測試 | 人工確認 |
| --- | --- | --- | --- | --- |
| A8-1 | `start -Card 999`：從 `main` 建分支 `task/999` 與 worktree `..\Blackjack-wt\task-999`（指令等同 v2.0 §6 第 6 步）；主 checkout 的 `.ai/task-contracts/TASK-999.md` 若存在（可未 commit）就複製進 worktree；worktree 裡有卡時印出 Risk、Allowed Files、Frozen 三欄，沒有卡時印「卡不存在，請在 worktree 寫卡並 commit」。`git worktree list` 多一列，`git branch --list task/999` 有值 | v2.0 §6 第 6 步、提案 §4.2 | 同一指令跑第二次：exit 1、訊息含「已存在」，`git worktree list` 與分支清單與第一次之後相同；`-Card 99`（非三位數）：exit 1，沒有建任何東西 | |
| A8-2 | `review -Card NNN -Worktree <路徑> [-Base <sha>]`：工作區必須乾淨；base 預設 `merge-base main HEAD`（第 79 項），`-Base` 可指定（L3 產品卡用寫 Frozen 行的 commit）；head 是 `HEAD`。產生 `.ai/reviews/TASK-NNN.diff`（內容與 `git diff <base> <head>` 逐位元組相同，比 SHA-256）、`.ai/reviews/TASK-NNN.checks.txt`（`tsc --noEmit`、`eslint . --max-warnings 0` 的輸出與結束碼、`verify.log` 最後 3 列、base／head）、`.ai/reviews/TASK-NNN.prompt.md`（卡路徑、diff 路徑、checks 路徑、`AGENTS.md`、base／head、SPEC 的行號範圍：從卡的 Spec 欄取 § 編號，對照 `docs/specs/SPEC-001.md` 的標題行算出起訖行號、「行號指檔案本身（Read 看到的行號），不是 diff 檔的行號」「用繁體中文回報」兩句）。印出 base、head 與三個檔案路徑 | v2.0 A7「協調者的指令」、§7「審查者只讀」、第 37、79、80、85 項 | 工作區不乾淨（加一個未追蹤檔）：exit 1、訊息含「不乾淨」，三個檔案都不存在；`-Base` 給不在歷史裡的 SHA：exit 1 | |
| A8-3 | `pr -Card NNN -Worktree <路徑>`：`git push -u origin task/NNN`；`gh pr create -R oldliuwill/Blackjack` 標題 `TASK-NNN：<卡的第一行標題>`，本文含 Goal、Acceptance 的案例編號清單、審查紀錄路徑、「不放核取方塊」；PR 對 `main` 的 diff 碰到 `tests/acceptance/|docs/specs/|.ai/task-contracts/`（與 `verify.yml` contract job 同一條規則，從 yml 讀出不手抄）時加 `contract-change` 標籤；印出 PR URL。PR 已存在時只印 URL，不再建 | v2.0 §8 六、A19 contract job、第 76 項 | 對已有 PR 的分支再跑一次：`gh pr list --head task/NNN` 仍是 1 筆；在 Blackjack 的 deny 生效的 session 跑：push 被擋屬預期，記錄在負向測試檔（不算失敗） | |
| A8-4 | `status -Card NNN`：只用 `gh api`（不採信口頭回報）印出：head SHA、`reviewDecision`、每個 check 的名稱與結論、`mergeStateStatus`、是否已合併；最後一行是判決：`READY`（APPROVED、檢查全過、CLEAN、未合併）、`WAIT: <缺什麼>`、`MERGED`（合併前有 APPROVED review）、`MERGED-BYPASS`（已合併但沒有 APPROVED review，依 admin bypass 紀錄的判定方式）。沒有 PR 時印 `NO-PR` | v2.0 §8 六、試行紀錄 admin bypass 紀錄（PR #2、#3、#5 是繞過；#4、#6、#7 不是） | 對照組：`status -Card 005`（PR #5）必須是 `MERGED-BYPASS`，`status -Card 007`（PR #7）必須是 `MERGED`，`status -Card 004`（分支 task/004、PR #4？依實際 PR 編號）照 admin bypass 紀錄判定；三個結果都記進負向測試檔 | |
| A8-5 | `close -Card NNN -Worktree <路徑> [-Archive <目錄>] [-Tools <目錄>] [-Since <ISO>]`：把 worktree 的 `.ai/metrics/verify.log` 與 `.ai/trace/*` 複製到 `-Archive`（預設 `..\Blackjack-wt\_archive\task-NNN`，不在 repo 內）；`-Tools`（預設 `D:\ai\projects\claude_baseline\tools`）存在且給了 `-Since` 時，跑 `node <Tools>\all-sessions-usage.js <Since>`，輸出追加到 `.ai/handoffs/TASK-NNN.md` 的「用量」節（檔案不存在就建骨架：標題、Base、Head、PR、用量四節）；最後印出給人在一般終端機跑的 `git -C <主 checkout> worktree remove <路徑>`，不自己刪 | v2.0 §8 四、§12、A5、第 77 項 | `-Archive` 指到已存在且非空的目錄：exit 1 不覆寫；`-Tools` 指到不存在的目錄：exit 1、`.ai/handoffs/TASK-NNN.md` 沒有新增內容 | |
| A8-6 | 每個子命令執行前後 `Get-Location` 相同；在 `%TEMP%`（不是 git 資料夾）執行任一子命令，exit 1 且訊息指出主 checkout 的路徑；`pwsh -NoProfile -File scripts/card.ps1`（沒有子命令）印用法、exit 1 | 共同規格、第 61 項 | 即本列 | |
| A8-7 | `verify.ps1 -Risk L3` 在本卡的 head 通過（本卡不改程式，結果應與 `main` 相同）；A8-1～A8-6 的負向測試指令與輸出記在 `.ai/reviews/TASK-008.negative.md`，每組寫明用改後的腳本跑、以及對照組（沒有腳本時手動指令）得到相同的 diff SHA-256（A8-2）與相同的判決（A8-4） | SPEC §6.2、TASK-006 的負向測試格式 | — | |

Frozen：d95af4fcf4c75c4b2ab32f1c9e354056d3897794（TASK-003 的凍結 SHA；本卡沒有新的驗收測試，CI 只核對它沒有被改動，SPEC §8.3）

本卡的準備用 commit 改了 `.ai/task-contracts/`，PR 要人加 `contract-change` 標籤（`pr` 子命令會自己判定並加；加標籤前 contract 失敗屬預期）。`.ai/reviews/**` 是審查產物，不計入 Allowed Files。

Verification Contract：`verify.ps1 -Risk L3` 照跑；A8-1、A8-2、A8-5、A8-6 的負向測試在暫存的 `task/999` 分支與 `%TEMP%` 做，測完刪掉分支與 worktree（刪 worktree 交人）；A8-3 在本卡自己的 PR 上驗（第一次 `pr` 建 PR，第二次只印 URL）；A8-4 用三個已合併的 PR 當對照組；PR 的 classify 應判 L3。

Commands：`pwsh ./scripts/verify.ps1 -Risk L3`

審查：Opus 唯讀子代理（`diff-reviewer`）；觸發式第二審：Fable（關卡腳本；用同一份定義檔，呼叫時帶 `model: fable`、`effort: high`），兩邊互不看。審查範圍從寫卡的 commit 之後開始；給審查者卡、提案 §4.2、diff、負向測試紀錄、verify 結果，提示寫明「行號指檔案本身」「用繁體中文回報」。每個 BLOCKING 附重現，協調者重現後才算。人逐項核對 diff（baseline A11）。

Stop：最多兩輪修正；同一問題連續兩輪沒有新證據或進展即寫交接、結束 session，由 Opus 從交接檔重來。需要改 Forbidden Changes 裡的檔案時停下回報。

Definition of Done：CI 對 head commit 的 classify（L3）、contract、verify、dependency-review、CodeQL 都通過；沒有經協調者重現成立的 BLOCKING；審查的 head 之後只有 `.ai/reviews/` 的變更；A8-7 的負向測試紀錄齊全；人逐項核對完。合併後：下一張卡（TASK-005 或輸贏動畫）的 session 全程用 `card.ps1` 的五個子命令，把少掉的工具呼叫數記進那張卡的狀態檔。

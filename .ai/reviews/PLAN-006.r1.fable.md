<!-- agent abe007d7df9b71db9 | models {"fable-5-1":8} | requests 8 | uncached_in 226 | cache_read 373934 | cache_write 80397 | output 7541 | max_ctx 80429 | tool_uses 33 | seconds 466 -->
# PLAN-006 第 1 輪計畫審查（Fable）

- base：41012a6（main）；對象：task/006 worktree 未 commit 的 SPEC-001 1.1 草稿與 TASK-006、TASK-007 兩張卡
- date：2026-10-21
- diff：`.ai/reviews/PLAN-006.spec.diff`（git-ignore，125 行）
- reviewer：`spec-reviewer` 定義檔（`claude_baseline\.claude\agents\`），呼叫時帶 `model: fable`；實際模型 `claude-fable-5-1`（8 次請求，見上行）
- 作者：規劃 session `d2002e44`（Opus 5.5）

TASK-006 計畫審查（L3，第 1 輪）— 對象：SPEC-001 1.0→1.1 diff、TASK-006.md、TASK-007.md（worktree D:\ai\projects\Blackjack-wt\task-006）

## BLOCKING

**B1. A6-2 的「改前」對照照卡上寫法分辨不出差別（同一 session_id 共用計數檔與標記檔）**
- 檔案：D:\ai\projects\Blackjack-wt\task-006\.ai\task-contracts\TASK-006.md 第 45 行
- 依據：卡的順序是先跑改後（管線、cmd 導向各一次，要求「結束碼 2、標記檔產生」），再「改前的 hook 用同樣的輸入再跑一次並記下結果」。現行 hook（D:\ai\projects\Blackjack-wt\task-006\.claude\hooks\verify-gate.ps1 第 23、31、42–48 行）把計數存在 `%TEMP%\claude-gate\<session_id>.count`，verify 先跑（第 32 行）才判 `$n -ge 3`（第 45 行）。
- 推導：改後兩次各讓 n=1、n=2（都 exit 2，正確）。接著改前 hook 用同一個 session_id：
  - 若環境字碼頁是 Big5（預期情形）：`cwd` 解成亂碼 → `Set-Location` 非終止錯誤、留在 %TEMP%（不是 git repo）→ 第 18 行 `-notmatch '^task/'` 成立 → exit 0，不碰標記檔。
  - 若環境已是 UTF-8（修正不被測到的情形）：進到 verify → 寫標記檔 → n=3 → 第 45–47 行 exit 0。
  - 兩種情形結束碼都是 0；唯一能分辨的是標記檔，但卡沒有要求在跑改前之前刪掉改後留下的標記檔，也沒說改前的判準是標記檔而非結束碼。結果：在 UTF-8 環境下，照卡上的「通過＝exit 2＋標記檔」會把改前誤判成「失敗」、宣稱測得出差別；在 Big5 環境下則無法確認改前是因編碼失敗還是因 n≥3 放行。
- 重現：照卡上步驟跑完改後兩次，不清理，直接跑改前版；觀察到 exit 0 且標記檔存在（殘留），無法判定。
- 需要寫明：每次執行（含改前）用不同 session_id 或先刪 `<sid>.count`、`<sid>.passed` 與標記檔；改前的判準是「標記檔不產生」（exit 0 不是判準）。

## NON-BLOCKING

**N1. A6-2 前置條件沒固定，留了「改前也通過就不算失敗」的逃生口**（TASK-006.md 第 45 行）
- 測試依賴主控台輸入字碼頁是 Big5，卡卻沒要求固定它。可以在 cmd 那次用 `cmd /c "chcp 950 >nul & pwsh ... < event.json"`、管線那次在父 pwsh 先設 `[Console]::OutputEncoding`/`chcp 950`，讓改前必然失敗，刪掉「記為此環境重現不了第 58 項」那句。另外 event.json 要寫明 UTF-8 無 BOM：`Console.In` 不偵測 BOM，帶 BOM 時 `ConvertFrom-Json` 會失敗 → `$evt` 為 null → `$dir` 為 null → 留在 %TEMP% → exit 0，改後也會「失敗」，白耗一輪。

**N2. 偏離 A19（規格與卡不列 L3）的理由成立但不完整，且留下的關卡沒寫全**（D:\ai\projects\Blackjack-wt\task-006\docs\specs\SPEC-001.md 第 359、380 行）
- 理由「L2 卡的 PR 帶著自己的卡會因沒 Frozen 而失敗」是對的，但那正是 A19 的設計意圖（實作 PR 不該改卡）；本專案是因為卡在 task 分支上補寫（含 TASK-006/007 的「準備用的 commit」）才衝突。替代方案（每張卡都填最近凍結 SHA，如 TASK-006/007 已做）沒被討論。這是治理決定，第 359 行卻沒有像第 396 行那樣標人確認（Will／日期）或 [Dnn]。
- 造成的洞：只改 `docs/specs/**` 或 `.ai/task-contracts/**` 的 PR 判 L1 → 剩下的關卡只有 `contract-change` 標籤（人加）、CODEOWNERS 核准、`verify -Risk L1`、dependency-review、CodeQL；沒有 Frozen 核對、不要求 task/NNN 分支、而且 §8.1 第 3 點的 L1 流程是「三行卡、verify -Quick、CI」，沒有任何審查者。規格修訂本身（像這次）走的是規劃審查，但 §8.1／§8.4 沒寫「規格或卡單獨改動要走 spec-reviewer／plan PR」。L2 實作者改自己卡的 Acceptance／Allowed Files 時，classify 仍是 L2，只剩 diff-reviewer 第 5 問與人看 diff。建議在 §7 第 359 行或 §8.1 補一句規格／卡單獨改動的路徑，並補人確認標記。

**N3. 本卡 PR 必須有 `contract-change` 標籤，卡與 §8.1 第 2 點都沒提**（SPEC-001.md 第 379 行；TASK-006.md 第 58、66 行）
- 準備用的 commit 改了 `docs/specs/SPEC-001.md` 與兩張卡，contract job 第 81–85 行會要求標籤。§8.1 第 1 點有寫「請人加標籤」，第 2 點沒有；Sonnet 協調者照卡走會先吃一次 contract 失敗。寫一句即可。

**N4. A6-7 與「人在合併前完成」的內部矛盾與未解的引用**（TASK-006.md 第 50–54 行）
- 第 52 行說「一次一項，協調者用 API 核對後才交下一項」，第 54 行卻說第 2 項 agent 讀不到 `bypass_actors`、靠截圖——自相矛盾，寫明第 2 項以截圖為準即可。
- 第 54 行「人對『等人決定』第 2 項的決定」只在 D:\ai\projects\claude_baseline\HANDOFF.md 第 67 行（保留或拿掉 Repository admin 繞過）才找得到；卡要自足，直接寫出選項。
- 在 ruleset 加 code_scanning 規則的前提是 CodeQL default setup 已啟用（SPEC §6.5 第 346 行列為人設定，背景事實只說 ruleset 沒規則，沒說 default setup 是否已開）。沒開就加規則，PR 會卡在等結果。建議 A6-7 前加一步核對（例如 `gh api repos/oldliuwill/Blackjack/code-scanning/default-setup` 的 `state`）。

**N5. `.ai/reviews/TASK-006.negative.md` 不在 Allowed Files**（TASK-006.md 第 16–26、58、66 行）
- Verification Contract 要求把負向測試紀錄寫進 `.ai/reviews/`，DoD 又允許審查 head 之後只有 `.ai/reviews/` 變更，表示它會被 commit；但 diff-reviewer 定義檔第 18 行（第 5 問）會把它當超出 Allowed Files。卡上加一句「`.ai/reviews/**` 為審查產物，不計入 Allowed Files」。

**N6. 1.1 標題的修改範圍漏列 §10**（SPEC-001.md 第 9 行 vs diff 第 122 行）
- 標題寫「只改 §5 的目錄註解、§6.3、§6.4、§7、§8」，但 §10 新增第 9 點。

**N7. TASK-007 的 DoD 與必要檢查不一致**（D:\ai\projects\Blackjack-wt\task-006\.ai\task-contracts\TASK-007.md 第 54 行）
- 只列 verify 與 CodeQL；ruleset 必要檢查是 classify、contract、verify、dependency-review（加 CodeQL 後五項），TASK-006 的 DoD 第 66 行有列全。順手對齊。

**N8. 「不再提 Codex」的範圍**：`tests/support/cards.ts` 第 2 行與 `scripts/check-acceptance-diff.ps1` 第 1–4 行的註解仍提 Codex；後者已列 Non-goals，前者沒有（`tests/**` 在 Forbidden）。只是註解，提醒卡上把 A6-1／A6-3 的「不提 Codex」限定在那兩個檔案即可，免得審查者拿 repo 全域 grep 來判。

## 已核對無問題（簡列）
- A6-5 的改前／改後表：用現行 verify.yml 第 40–41 行逐組推導，AGENTS.md→L1、CLAUDE.md→L1、scripts/trace-summary.ps1→L2、tests/acceptance/game.test.ts→L2，其餘七組兩邊相同；與卡一致，能分辨。
- A6-6：新腳本 `HEAD_SHA=X` 時 `git diff --quiet d95af4f X -- tests/acceptance` 非零 → 1；`HEAD_SHA=head` → 0；舊腳本比 HEAD → 0。worktree 共用物件庫，X 可被解析。能分辨。`HEAD_SHA` 加進 contract job 的 env 不在 Forbidden Changes 內。
- CODEOWNERS（D:\ai\projects\Blackjack-wt\task-006\.github\CODEOWNERS）已含 `/scripts/`、`/AGENTS.md`、`/CLAUDE.md`、`/tests/acceptance/`、`/docs/specs/`、`/.ai/task-contracts/`，與 1.1 §7 第 363 行一致；Non-goals「不用改」成立。
- A6-3 要求 skill 寫 `-Base`：repo 的 `scripts/check-acceptance-diff.ps1` 第 5 行已有 `param([string]$Base = 'HEAD')`，不必動 `scripts/**`。
- CLAUDE.md 內容只有 `@AGENTS.md`，不需另改；`.ai/module-map.md` 無 Codex／skill 引用。
- 五個定義檔內容與卡的描述相符（九問含 Reflect／字串鍵／動態 import；400 行／10 檔規則；「準備用的 commit 除外」）。Allowed Files 恰 10 個（不超過），估計 diff 約 200 行（五個定義檔共 103 行），在門檻內；比照 bootstrap 例外與 A11 第 738 行、§8.1 第 2 點一致。claude_baseline 沒有 `.claude/settings.json`，協調 session 不受 deny 與 `git push` 限制，做法可行。
- Frozen 行格式 `Frozen：<40 hex>（…）` 符合 contract 第 95 行的 regex。

## 假設清單（追溯不到研究筆記或 codebase）
1. CI 的 contract job 能把 `pull_request.head.sha` 解析成本地物件（merge commit 的第二個父節點）——只追溯到 baseline A19 範本（標「試行版」），沒有在 CI 實跑的證據。失敗方向安全：`git diff` 出錯會被 `!` 讀成「有變動」→ status 1，不會漏放。
2. CodeQL default setup 會對只改 md／ps1／yml 的 PR 也跑並回報檢查，所以 A6-7「本卡 PR 的 CodeQL 通過」可觀察。
3. 在 `pwsh -File` 子程序內、第一次存取 `[Console]::In` 之前設 `[Console]::InputEncoding` 會生效——依 A9 第 664 行「含中文事件實測過」（calib-01 §7），本 repo 沒有自己的實測。
4. 開場就加入的資料夾裡 `.claude/agents/` 會載入（背景事實），但 §8.1 第 382 行限定「主 checkout」；加入 worktree 是否同樣載入未測。
5. 測試機主控台字碼頁為 Big5（試行紀錄第 58 項）；A6-2 的分辨力建立在這上面（見 N1）。
6. 五個定義檔複製進 repo 後經 `.gitattributes`（`* text=auto eol=lf`）正規化，A6-4「忽略行尾」比對可行；`model: fable` 等 frontmatter 欄位在 repo 內載入時行為與協調目錄相同（A17 第 858 行只測過協調目錄）。


## 規劃 session 的處理（commit 前全部改進草稿）

- B1：採納。A6-2 改成每次執行用新的 `session_id`、執行前刪標記檔，改前的判準是「不產生標記檔」，不看結束碼。
- N1：採納。用 `cmd /c "chcp 950 >nul & ..."` 固定 Big5，管線與導向都經 cmd；事件 JSON 寫明 UTF-8 無 BOM；刪掉「改前也通過不算失敗」的逃生口。
- N2：部分採納。§7 補一句：規格或卡的修訂由規劃 session 寫、L3 計畫先經 `spec-reviewer`、實作 commit 碰到卡或規格由審查者列 BLOCKING。替代方案「每張卡都填最近凍結 SHA」不採：L2 卡也得帶 Frozen 行、走 L3 的 verify（含 acceptance），等於把 L2 全部升成 L3。偏離 A19 標「人確認：待確認」，請人確認。
- N3：採納。§8.1 第 2 點與卡都寫明要 `contract-change` 標籤。
- N4：採納。繞過名單以截圖為準、卡上寫出兩個選項；A6-7 前先用 check runs 確認 CodeQL default setup 在跑（agent 讀 default-setup API 回 403）。
- N5：採納。卡上寫明 `.ai/reviews/**` 是審查產物，不計入 Allowed Files。
- N6、N7：採納。
- N8：採納。A6-1 的「不提 Codex」限定在 AGENTS.md 與 A6-3 的 skill。
- 假設 1–6：留在卡與交接，由執行協調實測（1、2 在本卡 PR 的 CI 上就看得到）。

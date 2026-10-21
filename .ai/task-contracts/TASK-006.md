# TASK-006：治理檔改照 baseline v2.0

Risk：L3（路徑：`.claude/**`、`.github/**`、`AGENTS.md`；路徑之外的升級條件：關卡腳本與 CI）
Spec：docs/specs/SPEC-001.md@7d7fb6b09c003064d3ace76a34561a3a93bf3459 §6.3、§6.4、§7、§8.1；baseline v2.0（`D:\ai\projects\claude_baseline\docs\AI 軟體開發規範 Baseline v2.0（純 Claude）.md`）A2、A9、A16、A19
實作：協調者 session（Sonnet，effort xhigh），比照 bootstrap 例外（SPEC §8.1 第 2 點、baseline A11）：Allowed Files 都在 `.claude/settings.json` 的 deny 內，實作者 session 寫不進去

Goal：把治理檔從 v1.2.2／Codex 版改成 v2.0（純 Claude）版，讓 TASK-007 起的卡照 v2.0 跑：AGENTS.md 與 SPEC 1.1 §7 一致；Stop hook 讀得到中文事件；驗收 skill 不再寫死 Codex 時期的做法；審查者定義檔進 repo、受 CODEOWNERS 保護；CI 的 L3 清單與 Frozen 核對照 SPEC 1.1 §6.3、§7。

Non-goals：
- `.claude/settings.json`（deny 與 hook 設定不變）。`PreModelSwitch` hook 與 `modelSettings` 的實測不在本卡：要人在介面換模型才看得到，另做
- `scripts/**`：`verify.ps1` 的必要步驟、`trace-summary.ps1` 的修正（baseline A10，輔助）、`check-acceptance-diff.ps1` 註解裡的 Codex 字樣
- `.github/CODEOWNERS`：現有路徑已涵蓋 SPEC 1.1 §7 的清單，不用改
- `src/**`、`tests/**`、相依套件
- SPEC §9 的缺口（SPEC §10 第 9 點）

Allowed Files（10 個；第 6–10 個是從 `D:\ai\projects\claude_baseline\.claude\agents\` 原樣複製的定義檔，屬機械式修改）：
1. `AGENTS.md`
2. `.claude/hooks/verify-gate.ps1`
3. `.claude/skills/acceptance-author/SKILL.md`
4. `.claude/skills/diff-reviewer/SKILL.md`（刪除：九問已在審查者定義檔裡，留著會有兩份）
5. `.github/workflows/verify.yml`
6. `.claude/agents/diff-reviewer.md`（新增）
7. `.claude/agents/diff-reviewer-sonnet.md`（新增）
8. `.claude/agents/reverse-reviewer.md`（新增）
9. `.claude/agents/spec-reviewer.md`（新增）
10. `.claude/agents/spec-calculator.md`（新增）

Read First：
- SPEC-001 §6.3、§6.4、§7、§8.1（1.1）
- baseline v2.0 A2（AGENTS.md 範本）、A9（Stop hook 與測法）、A16（acceptance-author）、A19（CI）
- 現行的 `AGENTS.md`、`.claude/hooks/verify-gate.ps1`、`.claude/skills/*/SKILL.md`、`.github/workflows/verify.yml`

Research：無

Forbidden Changes：
- `.claude/settings.json`、`.github/CODEOWNERS`、`scripts/**`
- `src/**`、`tests/**`、`package.json`、`package-lock.json`
- `docs/specs/**`、`.ai/task-contracts/**`（準備用的 commit 除外）
- `verify.yml` 的觸發條件、`permissions`、`concurrency`、job 之間的相依，以及 `verify`、`dependency-review` 兩個 job

Acceptance：
| # | Given / When / Then | 預期值來源 |
| --- | --- | --- |
| A6-1 | `AGENTS.md`：不提 Codex（只看本檔與 A6-3 的 skill；其他檔案註解裡的 Codex 不在範圍）；L3 路徑集合與 SPEC 1.1 §7 相同，並寫明 `docs/specs/**`、`.ai/task-contracts/**` 不提高等級、由 `contract-change` 標籤與 CODEOWNERS 把關；不變量有 A2 的「不得放寬 `verify.ps1` 的必要步驟、Stop hook、lint 規則、CI 的觸發與權限」與「`tests/support/` 由協調者或規劃 session 撰寫」；標準做法寫明用 `Reflect`、字串鍵或動態 import 繞過 lint 一樣違規；專案特有的內容（引擎入口、`RandomSource`、storage 模組、單項指令、Playwright 路徑）保留 | baseline A2、SPEC 1.1 §5、§7 |
| A6-2 | Stop hook 在讀 stdin 之前設 `[Console]::InputEncoding` 為 UTF-8。負向測試：在 `%TEMP%` 底下建一個中文名稱的資料夾，`git init`、切到 `task/999`，放一支 `scripts/verify.ps1`：在該資料夾寫一個標記檔後 `exit 1`。事件 JSON 存成 UTF-8 無 BOM，`cwd` 指向這個資料夾，最後一則回覆含中文。每次執行都用新的 `session_id`，並在執行前刪掉標記檔。從 `%TEMP%`（不是 git repo）經 `cmd /c "chcp 950 >nul & ..."` 固定 Big5 字碼頁，用管線（`type event.json \| pwsh ...`）與導向（`pwsh ... < event.json`）各跑一次：改後的 hook 兩次都是結束碼 2、標記檔產生；改前的 hook（`main` 上的版本）兩次都不產生標記檔（判準是標記檔，不是結束碼）。測完刪掉暫存資料夾與 `%TEMP%\claude-gate\` 底下這幾個 `session_id` 的檔案 | baseline A9 的測法、SPEC 1.1 §6.4 |
| A6-3 | `acceptance-author` skill：不提 Codex；人工確認的文字照卡上 Acceptance 的確認欄寫，不寫死日期；完成前跑 `pwsh ./scripts/check-acceptance-diff.ps1 -Base <撰寫前的 commit>`，commit，不 push；其餘規則（只寫 `tests/acceptance/**`、只從 `src/engine/index.ts` 匯入、「需要 support」清單、沒有來源寫 `it.todo`、比精確值、只依賴已固定的輸入、順便審 `tests/support/`）保留 | baseline A16 |
| A6-4 | 五個定義檔與 `claude_baseline\.claude\agents\` 的同名檔內容相同（忽略行尾）；`.claude/skills/diff-reviewer/` 已刪除 | SPEC 1.1 §8.1 |
| A6-5 | `classify` 的 L3、L1 規則與 SPEC 1.1 §7 一致。負向測試：用一支 harness 從 `verify.yml` 讀出 `l3=`、`l1=` 兩行（不手抄），套進同樣的判定邏輯，每組各算一次：`AGENTS.md` → L3；`CLAUDE.md` → L3；`scripts/trace-summary.ps1` → L3；`.claude/agents/diff-reviewer.md` → L3；`tests/acceptance/game.test.ts` → L3；`src/engine/game.ts` → L3；`.ai/task-contracts/TASK-007.md` → L1；`README.md` → L1；`docs/specs/SPEC-001.md` 加 `src/ui/app.ts` → L2；`.ai/task-contracts/TASK-004.md` 加 `src/ui/app.ts` → L2；`src/ui/app.ts` → L2。改前的規則（`main` 上的 `verify.yml`）用同一份 harness 也跑一次：`AGENTS.md`、`CLAUDE.md`、`scripts/trace-summary.ps1`、`tests/acceptance/game.test.ts` 四組應與改後不同（改前分別是 L1、L1、L2、L2），其餘相同 | SPEC 1.1 §7 |
| A6-6 | `contract` 的 Frozen 核對比 PR 的 head（`github.event.pull_request.head.sha`），不比 checkout 出來的 merge commit。負向測試：以本卡的 head 為父，建一個只在本機、改了 `tests/acceptance/` 一個檔的 commit X（建法不限，不 push）；在本卡的 worktree（HEAD 是本卡的 head）用 bash 跑 contract 的同一段腳本，`RISK=L3`、`BRANCH=task/006`、`HAS_LABEL=true`、`BASE_REF=main`：`HEAD_SHA=X` 時結束碼 1、訊息是 Frozen 之後有變動；`HEAD_SHA` 給本卡的 head 時結束碼 0。改前的腳本用 `HEAD_SHA=X` 應是 0（它比的是 HEAD），以此證明測得出差別。測完刪掉 X 所在的分支或 worktree | SPEC 1.1 §6.3、baseline A19 |
| A6-7 | 人在合併前設好 ruleset `main-protection` 的 code scanning 規則（CodeQL；security alerts High or higher；alerts Errors）。協調者先確認 CodeQL default setup 有在跑（agent 讀不到 default-setup API；改看本卡 PR head 的 check runs 有 `github-advanced-security` 的 `CodeQL`，PR #5 的 head `b1903d5` 有），再用 `gh api repos/oldliuwill/Blackjack/rulesets/25129300 --jq '[.rules[].type]'` 核對有 `code_scanning`，且本卡 PR 的 CodeQL 通過 | 決策 P6 |

人在合併前完成（一次一項）：
1. ruleset `main-protection` 加 code scanning 規則（A6-7）；協調者用 API 核對後才交下一項。
2. ruleset 的繞過名單：人決定保留 Repository admin（單人 repo 的逃生口，但合併框會出現繞過選項，試行紀錄第 67 項）或拿掉（agent 開的 PR 一律要 Code Owner 核准才能合併；人自己開 PR 時就合併不了）。agent 帳號讀不到 `bypass_actors`，以人附的截圖為準。

Frozen：d95af4fcf4c75c4b2ab32f1c9e354056d3897794（TASK-003 的凍結 SHA；本卡沒有新的驗收測試，CI 只核對它沒有被改動，SPEC §8.3）

本卡的兩個準備用 commit 改了 `docs/specs/`、`.ai/task-contracts/`，PR 要人加 `contract-change` 標籤；加標籤前 contract 失敗屬預期。`.ai/reviews/**`（負向測試紀錄、審查紀錄）是審查產物，不計入 Allowed Files。

Verification Contract：`verify.ps1 -Risk L3` 照跑（本卡不改程式，結果應與 `main` 相同）；A6-2、A6-5、A6-6 的負向測試指令與輸出記在 `.ai/reviews/TASK-006.negative.md`；A6-7 用 API 核對；PR 的 classify 應判 L3。

Commands：`pwsh ./scripts/verify.ps1 -Risk L3`

審查：Opus 唯讀子代理（`diff-reviewer`）；觸發式第二審：Fable（關卡腳本與 CI；用同一份定義檔，呼叫時帶 `model: fable`、`effort: high`），兩邊互不看。審查範圍從寫卡的 commit 之後開始；給審查者卡、SPEC 1.1 的確切行號、diff、負向測試紀錄、verify 結果。每個 BLOCKING 附重現，協調者重現後才算。人逐項核對 diff（baseline A11）。

Stop：最多兩輪修正；同一問題連續兩輪沒有新證據或進展即寫交接、結束 session，由 Opus 從交接檔重來。需要改 Forbidden Changes 裡的檔案時停下回報。

Definition of Done：CI 對 head commit 的 classify（L3）、contract、verify、dependency-review、CodeQL 都通過；沒有經協調者重現成立的 BLOCKING；審查的 head 之後只有 `.ai/reviews/` 的變更；A6-7 核對通過；人逐項核對完。合併後由協調者做：刪掉 `claude_baseline\.claude\agents\` 裡的五個同名檔（`calib-reviewer.md` 留著），下一個開場就加入 Blackjack 主 checkout 的 session 核對 Agent 類型清單仍有這五個，結果記進試行紀錄。

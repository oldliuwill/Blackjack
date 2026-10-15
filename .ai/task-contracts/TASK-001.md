# TASK-001：專案骨架與治理檔（bootstrap）

Risk：L3（路徑：`package.json`、`package-lock.json`、`.github/**`、`.claude/**`、`scripts/verify.ps1`）
Spec：docs/specs/SPEC-001.md@（審查定稿後填）§5–§8
撰寫：協調者，在 `D:\ai\projects\Blackjack-wt\task-001`（分支 `task/001`）。不開實作者 session，理由見 SPEC §8.3 與 D32

Goal：建立 Vite + TypeScript 骨架、驗證腳本、CI、CODEOWNERS 與 Claude 權限設定，讓之後每張卡都能用同一支 `verify.ps1` 在本機與 CI 驗證。

Non-goals：
- 遊戲邏輯與 UI（TASK-002～004）
- Pages 部署（TASK-006）
- ruleset、CodeQL、Actions 權限等 repo 設定（人在合併後做，SPEC §6.5）

Allowed Files（bootstrap 為設定與範本改寫，超過 10 個檔案的提示上限；`package-lock.json` 不計入行數）：
- `package.json`、`package-lock.json`、`tsconfig.json`、`vite.config.ts`（含 Vitest 設定）、`eslint.config.mjs`、`playwright.config.ts`、`index.html`、`.gitignore`
- `src/main.ts`、`src/style.css`
- `tests/unit/bootstrap.test.ts`（佔位，讓 unit 關卡有東西跑；TASK-002 刪除）
- `tests/e2e/smoke.spec.ts`（頁面載入、標題為 Blackjack；完整流程由 TASK-004 補）
- `scripts/verify.ps1`、`scripts/check-acceptance-diff.ps1`、`scripts/trace-summary.ps1`
- `.github/workflows/verify.yml`、`.github/CODEOWNERS`
- `AGENTS.md`、`CLAUDE.md`、`.ai/module-map.md`
- `.claude/settings.json`、`.claude/hooks/verify-gate.ps1`、`.claude/skills/diff-reviewer/SKILL.md`、`.claude/skills/acceptance-author/SKILL.md`

Read First：
- SPEC-001 §5–§8
- `.ai/research/toolchain.md`
- baseline 附錄 A2、A7、A8、A9、A10、A11、A13、A14、A17（本機 `D:\ai\projects\baseline\docs\`；只放依專案改寫過的內容，不放原文 [D7]）

Research：`.ai/research/toolchain.md`

Forbidden Changes：
- `src/engine/**`、`src/ui/**`
- `docs/specs/**`、其他任務卡
- SPEC §6.1 以外的相依套件

Acceptance：
| # | 驗證方式 | 預期 | 來源 |
| --- | --- | --- | --- |
| AC1 | 乾淨 clone 跑 `npm ci` | 成功；`package.json` 的版本與 SPEC §6.1 完全一致，沒有 `^`、`~` | D13、D21 |
| AC2 | `pwsh ./scripts/verify.ps1 -Risk L2` | exit 0；跑過 typecheck、lint、unit、build、e2e | D15 |
| AC3 | `pwsh ./scripts/verify.ps1 -Risk L3` | exit 不是 0，訊息指出 acceptance 沒有執行 | D15「不得不存在或為空」 |
| AC4 | `pwsh ./scripts/verify.ps1 -Quick` | 只跑 typecheck、lint、unit | D15 |
| AC5 | 暫時在 `src/engine/` 放一個使用 `document` 的檔案；另一次暫放未使用的變數 | 兩次 lint 都失敗；驗完刪除 | SPEC §5、§6.2 |
| AC6 | `vitest list`、`playwright test --list` | Vitest 不收 `tests/e2e/`，Playwright 不收 `tests/unit/` | 工具鏈研究「需本機驗證」第 4 點 |
| AC7 | 在 `task/*` 分支製造讓 `-Quick` 失敗的變更，把 Stop 事件 JSON 餵給 `verify-gate.ps1`；再在非 `task/*` 分支餵一次 | 前者 exit 2，後者 exit 0 | baseline A9 |
| AC8 | `check-acceptance-diff.ps1`：只改 `tests/acceptance/`；另一次改到其他檔案 | 前者 exit 0，後者 exit 1 | baseline A17 |
| AC9 | 推上 PR | CI 出現 classify、verify、dependency-review 三個 job；verify 的 L2 步驟全部通過。classify 判為 L3 並因缺 `Frozen` 失敗，屬預期 | SPEC §8.3 |

AC3、AC5、AC7、AC8 為手動檢查，結果寫在 PR 描述。Playwright 在本機 Windows 10 能否執行，依 D22 記錄。

Frozen：無（bootstrap；尚無驗收測試，SPEC §8.3）

Verification Contract：
- Unit：佔位測試
- Build：`vite build`
- E2E：頁面載入冒煙測試
- 手動：AC3、AC5、AC7、AC8

Commands：`pwsh ./scripts/verify.ps1 -Risk L2`

審查：Codex，`$noWeb`、effort high，固定 base／head SHA。給 Codex 的 diff 排除 `package-lock.json`。

Stop：最多兩輪修正；同一問題連續兩輪沒有新證據或進展就交接。

Definition of Done：
- CI 的 verify job 中 L2 步驟全部通過
- Codex 審查沒有 BLOCKING，審查檔的 head SHA 等於 PR head
- 人核准後合併，並依 SPEC §6.5 設定 repo

量測（自動：`.ai/trace`、`verify.log`）：回合數＝ 驗證次數＝ 一次通過＝
量測（手填）：返工分鐘＝ 7 天內缺陷＝ 交接次數＝

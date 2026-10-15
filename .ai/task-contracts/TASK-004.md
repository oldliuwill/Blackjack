# TASK-004：介面與資金保存

Risk：L2（路徑：`src/ui/**`、`src/main.ts`、`index.html`；`src/style.css` 為 L1。不改公開 API）
Spec：docs/specs/SPEC-001.md@（審查定稿後填）§3.8、§4、§5
實作：Sonnet，effort 中

Goal：照 SPEC §3.8 做出可玩的英文介面：用籌碼下注、發牌、動作按鈕與鍵盤快捷鍵、結果顯示、資金存進 localStorage，桌機與手機直式都能操作。

Non-goals：
- 引擎規則的任何改動
- 音效、截圖比對、新的相依套件（不加 jsdom，SPEC §5）

Allowed Files：
- `src/ui/app.ts`、`src/ui/render.ts`、`src/ui/controls.ts`、`src/ui/storage.ts`
- `src/main.ts`、`src/style.css`、`index.html`
- `tests/unit/ui/storage.test.ts`
- `tests/e2e/smoke.spec.ts`

Read First：
- SPEC-001 §3.8、§4、§5
- `src/engine/index.ts`
- `public/assets/`（若已存在）

Research：無

Forbidden Changes：
- `src/engine/**`
- `package.json`、`package-lock.json`
- `tests/acceptance/**`、`docs/specs/**`、`.ai/task-contracts/**`
- 產品程式裡的測試後門（例如用網址參數指定牌序）

Acceptance：
| # | Given / When / Then | 來源 |
| --- | --- | --- |
| A4-1 | storage 讀到 `'1500'` → 1500；沒有值、`'abc'`、`'-5'`、`'10.5'` → 1000；每次狀態改變後寫入目前資金 | U7 |
| A4-2 | 冒煙測試：開頁 → 用籌碼下注 100 → Deal → Hit → Stand → 顯示結果，資金變動等於該局淨輸贏。牌序要可重現：用 Playwright `addInitScript` 固定 `crypto.getRandomValues`，或把流程寫成對任何牌序都成立 | D15 |
| A4-3 | 鍵盤 H、S、D、P 與按鈕效果相同；動作不可用時按鍵沒有作用 | U4、D28 |
| A4-4 | 360×740 視窗：所有控制項可見、可點，沒有水平捲軸 | U1 |
| A4-5 | 發牌後重新整理頁面：資金顯示為已扣注的金額，牌局消失 | G15 |
| A4-6 | 資金少於 10 時出現 Reset bankroll，按下後變為 1,000 | U5、G14 |

人工驗收：人在瀏覽器看過動畫與版面（不做截圖比對 [D15]）。

Verification Contract：Unit（storage）、Build、E2E（A4-2～A4-6）、人工驗收。

Commands：`pwsh ./scripts/verify.ps1 -Risk L2`

審查：Opus 唯讀子代理；本卡另交 Codex 審一次，比較兩邊的發現（試行紀錄「跨模型審查計畫」）。

Stop：最多兩輪修正；同一問題連續兩輪沒有新證據或進展就交接。需要改引擎時停下回報。

Definition of Done：CI 對 head commit 的 verify 通過、審查沒有 BLOCKING、人工驗收通過。

量測（自動：`.ai/trace`、`verify.log`）：回合數＝ 驗證次數＝ 一次通過＝
量測（手填）：返工分鐘＝ 7 天內缺陷＝ 交接次數＝

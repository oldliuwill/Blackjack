# TASK-004：介面與資金保存

Risk：L2（路徑：`src/ui/**`、`src/main.ts`、`index.html`；`src/style.css` 為 L1；路徑之外的升級條件：無，不改公開 API）
Spec：docs/specs/SPEC-001.md@4d61f23fe417427de4d3f4b6140f0fe6d3462506 §3.8、§4、§5
實作：Sonnet，effort 高

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
| # | Given / When / Then | 預期值來源 |
| --- | --- | --- |
| A4-1 | storage 讀到 `'1500'` → 1500、`'0'` → 0；沒有值、`''`、`' 100'`、`'1e3'`、`'abc'`、`'-5'`、`'10.5'` → 1000；`getItem`、`setItem` 丟例外時讀到 1000、寫入被略過且不丟錯；每次狀態改變後寫入目前資金 | U7 |
| A4-2 | 冒煙測試：開頁 → 用籌碼下注 100 → Deal → Hit → Stand → 顯示結果，資金變動等於該局淨輸贏。牌序要可重現：用 Playwright `addInitScript` 固定 `crypto.getRandomValues`，或把流程寫成對任何牌序都成立 | D15 |
| A4-3 | 鍵盤 H、S、D、P 與按鈕效果相同；動作不可用時按鍵沒有作用 | U4、D28 |
| A4-4 | 360×740 視窗：所有控制項可見、可點，沒有水平捲軸 | U1 |
| A4-5 | 發牌後確認仍在玩家回合（牌序固定為不會立即結算的一局），重新整理頁面：資金顯示為已扣注的金額，牌局消失 | G15 |
| A4-6 | 下注階段且資金少於 10 時才出現 Reset bankroll，按下後變為 1,000；全押後的玩家回合與結算畫面都不出現 | U5、G14 |

Frozen：無（L2，不凍結驗收）

人工驗收：人在瀏覽器看過動畫與版面（不做截圖比對 [D15]）。

Verification Contract：Unit（storage）、Build、E2E（A4-2～A4-6）、人工驗收。

Commands：`pwsh ./scripts/verify.ps1 -Risk L2`

審查：Opus 唯讀子代理（`diff-reviewer`）；L2 配對實驗：另派 Sonnet 唯讀子代理（`diff-reviewer-sonnet`）審同一份固定 base／head 的 diff，兩邊互不看，每個 BLOCKING 附重現，協調者重現後才算。實作欄若改成 Opus（兩輪規則後接手）：審查改為 Fable（小 context），或 Sonnet 加 Opus 配對（Opus 那邊用獨立重現），意見不同以能重現者為準。

Stop：最多兩輪修正；同一問題連續兩輪沒有新證據或進展即寫交接、結束 session，由 Opus 從交接檔重來。需要改引擎時停下回報。

Definition of Done：CI 對 head commit 的 verify 與 CodeQL 通過、沒有經協調者重現成立的 BLOCKING、審查的 head 之後只有 `.ai/reviews/` 的變更、人工驗收通過。

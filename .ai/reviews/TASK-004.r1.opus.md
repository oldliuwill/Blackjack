# TASK-004 review round 1 — Opus

- base: `bfe19bb14f0b18df486e7a3b869c3d4588c4e663` (card change, not reviewed)
- head: `5dbaf214a8e9269675c0fadaec174e3e836c9ec6`
- date: 2026-10-21
- diff: `.ai/reviews/TASK-004.diff` (`git diff bfe19bb..5dbaf21`; 8 files, 1,302 lines)
- reviewer: `diff-reviewer`, read-only subagent (Read, Grep, Glob); model `claude-opus-5-5` on all 7 requests, effort medium (from the subagent transcript). Same model as the implementer (Opus 5.5 xhigh; the card names Sonnet).
- usage: 7 requests, cache read 244,422, cache write 51,317, output 13,633, 13 tool calls, 143 s
- paired with: `TASK-004.r1.sonnet.md` (independent; neither saw the other)

## Report (verbatim)

TASK-004 第 1 輪程式審查（L2）
base：bfe19bb14f0b18df486e7a3b869c3d4588c4e663
head：5dbaf214a8e9269675c0fadaec174e3e836c9ec6
diff：D:\ai\projects\Blackjack-wt\task-004\.ai\reviews\TASK-004.diff（8 個檔，1,302 行）
驗證結果：TASK-004.checks.txt 記錄 5dbaf21 的 L2 full（typecheck+lint+unit+build+e2e）為 PASS。

## BLOCKING

無。

## NON-BLOCKING

1. （拆卡）整份 diff｜這份 diff 有 1,302 行，遠超過 400 行的指引。即使把 CSS（388 行）全部排除，TypeScript 加測試仍有約 914 行。Allowed Files 有 9 個，沒有超過 10。｜依據：審查規則（diff 遠超過 400 行，第一個 finding 為拆卡）。｜重現：diff 檔共 1,386 行，其中 src/style.css 為 388 行、src/ui/*.ts 加 src/main.ts 為 466 行、tests 為 448 行。可沿著自然的邊界拆成兩張卡：(a) storage.ts、app.ts 加上單元測試（A4-1）；(b) render.ts、controls.ts、main.ts、style.css 加上 e2e（A4-2 到 A4-6）。

2. src/ui/app.ts:451（diff 第 451 行；新檔第 10 行）｜`CHIP_VALUES = [10, 50, 100, 500]` 裡的 10 與 500 是裸數字，數值等於 MIN_BET 與 MAX_BET。｜依據：SPEC §4.1 rules.ts 區塊寫「程式中不得出現這些數字的裸值」；AGENTS.md 寫「程式碼不得出現裸數字」。依字面讀，這違反了規則。我列為 NON-BLOCKING 的理由：U3 本身就把 10、50、100、500 定為 UI 的籌碼面額，目前行為也正確。協調者若採字面解讀，應改列為 BLOCKING。｜重現：在 src/ui 裡 grep `\b(10|500)\b`，會在 app.ts 的 CHIP_VALUES 命中。lint 沒有攔下來，因為沒有這條規則。風險在於：如果 MIN_BET 或 MAX_BET 改了，最小或最大的籌碼不會跟著改。

3. src/ui/storage.ts:897–898（新檔第 29–30 行）｜readBankroll 另外用 `Number.isSafeInteger` 拒絕某些輸入，但這些輸入符合 `^\d+$`，而 U7 規定這類字串要接受。｜依據：U7「只接受完全符合 `^\d+$` 的字串」，只有不符合的才改用 1,000。｜重現：`readBankroll(new MemoryStorage('9007199254740993'))` 回傳 1000，但 `Number('9007199254740993')` 是 9007199254740992，`Number.isInteger` 為 true，而引擎 game.ts:264 會接受這個值。另一方面，`'9'.repeat(400)` 會變成 Infinity，引擎會丟 INVALID_BANKROLL，所以對這種值退回 1,000 是合理的。這是規格沒有涵蓋的缺口，實作的取捨可以接受，建議回報給協調者，由 SPEC 補上一句。

## TEST GAPS

- U6 要求標示 soft 點數，但 e2e 與單元測試都沒有斷言出現 `Soft N`（render.ts 的 totalText 沒有被驗證）。
- U7 的「瀏覽器停用 localStorage」只用 `blocked` 假物件測了 readBankroll、writeBankroll 與 createApp。`browserStorage()` 在讀取 `window.localStorage` 屬性丟例外時回傳 null 的路徑（storage.ts:879–885）沒有測試，在不用 jsdom 的條件下只能靠 e2e，例如在 addInitScript 裡讓 localStorage 的 getter 丟例外。
- U2（prefers-reduced-motion）與 U8（圖檔不存在時退回純色）只靠人工驗收。e2e 只允許三張裝飾圖回傳 404（smoke.spec.ts:1007–1010，範圍精確限定在 `${root}assets/<name>`），沒有斷言退回純色後的畫面。目前 public/assets/ 不存在，所以這條路徑實際上每次都會走到。
- controls.ts:576 會略過 Ctrl、Meta、Alt 與按住不放的重複按鍵，這段沒有測試。
- A4-1 的「每次狀態改變後寫入」已涵蓋 deal、各動作、nextHand、reset。addChip 與 clearBet 也會寫入（資金不變），但沒有斷言。這不影響驗收。

## NO ISSUE

- 九問第 1 項（需求）：A4-1 到 A4-6 各有對應的實作與測試。U3：籌碼在下注階段才啟用，`fits` 會檢查 MAX_BET 與資金，可以清除。U4：act 只在 `availableActions()` 包含該動作時才執行，鍵盤與按鈕走同一條路。U5：Reset 只有在下注階段且資金少於 MIN_BET 時才出現，所在面板在其他階段整個隱藏。U6：每手顯示牌、點數、注額與結果，aria-live 狀態列顯示淨輸贏。U7：key 是 `blackjack.bankroll`，所有變更都經過 commit() 寫入。§5：UI 只從 src/engine/index.ts 匯入，沒有用框架。
- 第 2 項：沒有改既有的測試。原本的冒煙測試只是放寬了三張 U8 裝飾圖的 404，並新增 pageerror 檢查，整體反而更嚴。沒有動 tests/support/，單元測試只使用既有的 `stackedShoe`。預期值有來源：§4.6 S12 與 G 條文。我也推導過幾組：A4-2 是 10,2 對 9 明牌，補 6 成 18，莊家 9,7,10 爆牌，淨 +100；A4-3 分牌那局淨 +300。stackShoe 的推導與 shoe.ts 一致：cryptoRandom 是 Uint32Array(1) 除以 2^32，牌序是 deck、suit、rank，以 rank 為最內層，從 index 0 開始抽牌。
- 第 3 項：沒有用 Reflect、字串鍵或動態 import。產品程式沒有測試後門，牌序只在 e2e 用 addInitScript 固定。`createApp(storage, shoe?)` 的 shoe 是只給單元測試用的依賴注入，main.ts 不傳，也沒有網址或其他外部入口可以觸發。
- 第 4 項：沒有新增相依套件，package.json 與 package-lock.json 都沒有動。
- 第 5 項：改到的 8 個檔都在 Allowed Files 內（index.html 沒有改）。沒有碰 src/engine/**、tests/acceptance/**、docs/specs/** 或 .ai/task-contracts/**。
- 第 6 項：測試不是過擬合。A4-3 比較按鈕與按鍵兩種玩法在每一步的整桌快照；A4-4 在每個階段都檢查所有按鈕的可見性與水平捲動。
- 第 7 項：app 的每個方法都先擋掉當下不該有的呼叫，因此引擎不會丟 RuleError。即使丟了，也發生在 commit 之前，state 不會改變。storage 的讀寫例外都有攔下。listener 與 DOM 都在 mountTable 時一次建好，沒有洩漏的疑慮。
- 第 8 項：Risk 標 L2 正確，因為沒有改 §4 的公開 API 或型別，路徑是 src/ui/**、src/main.ts，加上屬於 L1 的 CSS。
- 第 9 項：沒有改 verify.ps1、設定檔、CI、lint 或 hook。vite.config.ts 收檔範圍是 `tests/unit/**/*.test.ts`，涵蓋新的 tests/unit/ui/；playwright 收的是 `tests/e2e/**/*.spec.ts`。

相關檔案：
- D:\ai\projects\Blackjack-wt\task-004\src\ui\app.ts
- D:\ai\projects\Blackjack-wt\task-004\src\ui\storage.ts
- D:\ai\projects\Blackjack-wt\task-004\src\ui\render.ts
- D:\ai\projects\Blackjack-wt\task-004\src\ui\controls.ts
- D:\ai\projects\Blackjack-wt\task-004\tests\e2e\smoke.spec.ts
- D:\ai\projects\Blackjack-wt\task-004\tests\unit\ui\storage.test.ts
- D:\ai\projects\Blackjack-wt\task-004\src\engine\shoe.ts（用來核對 stackShoe 的推導）
- D:\ai\projects\Blackjack-wt\task-004\src\engine\game.ts:264（INVALID_BANKROLL 的判斷）

## 協調者核對（2026-10-21）

- BLOCKING 0，沒有要重現的項目。兩位審查者都沒有 BLOCKING，不進修復輪。
- NON-BLOCKING 1（拆卡）：規則觸發成立（1,302 行）。不拆；TASK-005 寫卡時把 diff 規模列入考量。
- NON-BLOCKING 2（`CHIP_VALUES` 的 10、500）：`src/ui/app.ts:10` 確有其值。SPEC §4.1 的「不得出現裸值」指 `rules.ts` 的規則常數；籌碼面額來自 U3／D10，已是具名常數，50、100 也不是規則常數。協調者判定不違反，維持 NON-BLOCKING，不修。
- NON-BLOCKING 3（`Number.isSafeInteger`）：`src/ui/storage.ts:27–30` 成立。屬 SPEC 缺口（U7 沒寫超過安全整數的數字串），記進 SPEC-001 §9 的待補清單，不修。
- TEST GAPS：soft 標示沒有斷言（測試裡沒有 `Soft`）、`browserStorage()` 讀屬性就丟例外的路徑沒測、修飾鍵與 `event.repeat` 沒測，都核對成立；U2、U8 與 soft 標示在人工驗收時看。`addChip`、`clearBet` 的寫入沒有斷言：不影響驗收，沒有另外核對。
- 與 Sonnet 比較：Sonnet 有、本份沒提的成立項目：同一 phase 內按鈕停用後焦點遺失（`render.ts` 的 `moveFocus` 只在 phase 改變時執行）、莊家明牌 A 時顯示 `Soft 11`（`DealerView.value` 只算看得到的牌）、A4-3 的快照只取 `main`，不含 `footer` 的控制區。404 豁免本份有提，判為無問題；Sonnet 多指出 TASK-005 加圖後豁免仍在。

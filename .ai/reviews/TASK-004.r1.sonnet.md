# TASK-004 review round 1 — Sonnet

- base: `bfe19bb14f0b18df486e7a3b869c3d4588c4e663` (card change, not reviewed)
- head: `5dbaf214a8e9269675c0fadaec174e3e836c9ec6`
- date: 2026-10-21
- diff: `.ai/reviews/TASK-004.diff` (`git diff bfe19bb..5dbaf21`; 8 files, 1,302 lines)
- reviewer: `diff-reviewer-sonnet`, read-only subagent (Read, Grep, Glob); model `claude-sonnet-5-5` on all 5 requests, effort high (from the subagent transcript)
- usage: 5 requests, cache read 156,419, cache write 63,510, output 19,505, 14 tool calls, 177 s
- paired with: `TASK-004.r1.opus.md` (independent; neither saw the other)

## Report (verbatim)

TASK-004 第 1 輪程式審查（L2，Sonnet 審查者）

Base：bfe19bb14f0b18df486e7a3b869c3d4588c4e663（改卡的 commit，不在審查範圍）
Head：5dbaf214a8e9269675c0fadaec174e3e836c9ec6

範圍：卡、diff、SPEC §3.8/§4/§5、AGENTS.md、checks.txt。另外為了驗證疑點，我讀了 index.html、playwright.config.ts、src/engine/shoe.ts、tests/support/cards.ts，並用 grep 看了 eslint.config.mjs。
我沒有執行任何測試，也沒有看 CI。checks.txt 顯示 head 5dbaf21 的 L2 full 為 PASS（typecheck、lint、unit、build、e2e）。

## BLOCKING

無。A4-1 到 A4-6、U1 到 U8、G11 到 G15 都找得到對應的實作和斷言。

## NON-BLOCKING

1. 整份 diff｜建議拆卡｜依據：審查定義檔「超過 400 行」規則
   - diff 共 1,302 行：CSS 388、測試 448、TS 466。Allowed Files 有 9 個，沒超過 10 個。
   - 扣掉 CSS 這類設定檔後仍有約 910 行，所以按定義檔列為第一個 finding。
   - 建議：下次把 storage 加 app 狀態機加單元測試，和 render、controls、CSS、e2e 分開。
   - 這是流程面的意見，不影響本輪結論。

2. D:\ai\projects\Blackjack-wt\task-004\src\ui\storage.ts:29-30｜在 U7 的 `^\d+$` 之外多加了 `Number.isSafeInteger` 檢查｜依據：SPEC U7「只接受完全符合 ^\d+$ 的字串」、§4.4 引擎只要求「大於等於 0 的整數」
   - 重現：輸入 '9007199254740993'，字面上符合 U7，引擎也會接受，但此實作回傳 1000。
   - 這個守門有實際用處：'9'.repeat(400) 會變 Infinity 被 createGame 以 INVALID_BANKROLL 拒絕；1e21 以上寫回時會變 '1e+21'，下次讀取就失敗。
   - A4-1 列舉值不受影響，單元測試有涵蓋這個案例。
   - 建議協調者決定要不要把這個行為補進 SPEC 文字。這不是程式缺陷。

3. D:\ai\projects\Blackjack-wt\task-004\tests\e2e\smoke.spec.ts:97-98｜載入冒煙測試對 assets/felt.png、card-back.png、logo.png 的 404 一律放行，削弱了原本「every request succeeds」的斷言｜依據：U8（圖檔不存在時退回純色）
   - 目前 public/ 目錄不存在，所以放行有理由。
   - 但 TASK-005 加入圖檔後，這條豁免仍在。圖檔若被刪掉或改名，測試不會再報錯。
   - 豁免只比對 `${root}assets/<name>`，所以 base 路徑寫錯（例如 /assets/felt.png）仍會被抓到。
   - 建議 TASK-005 收掉這個豁免，或由協調者記下這件事。

4. D:\ai\projects\Blackjack-wt\task-004\src\ui\render.ts:157-159 與 266-276｜同一個 phase 內按鈕被停用後，焦點不會被帶到別處｜依據：無明文要求，屬鍵盤操作體驗，U4 只管 H/S/D/P
   - 重現：用 Tab 加 Enter 操作，在 betting 階段按 `Add 500`，下注額到上限後該按鈕變 disabled，焦點掉回 body。`Clear` 按完變 0 後也一樣。
   - moveFocus 只在 phase 改變時才處理。

5. D:\ai\projects\Blackjack-wt\task-004\src\ui\render.ts:171-175｜莊家只有 A 明牌時，點數顯示 `Soft 11`｜依據：U6「點數（soft 要標示）」
   - 重現：讓莊家明牌是 A，玩家回合中看莊家區域，顯示的是 handValue([A])，即 Soft 11。
   - 數值正確，只是玩家看起來可能怪。純文案，可忽略。

6. D:\ai\projects\Blackjack-wt\task-004\src\ui\app.ts:39｜createApp(storage, shoe?) 在產品程式裡多一個注入牌靴的參數｜依據：卡的 Forbidden「產品程式裡的測試後門」
   - main.ts:11 只傳 browserStorage()，頁面上沒有任何入口能指定牌序，所以沒有違反。
   - e2e 用 addInitScript 固定 crypto.getRandomValues，符合卡 A4-2 寫的作法。
   - 屬一般的依賴注入，記錄即可。

## TEST GAPS

- tests/e2e/smoke.spec.ts:81-83, 174-178：A4-3「鍵盤與按鈕效果相同」用 main 的 innerText 比對，控制區（footer）的 enabled/disabled 狀態不在 main 裡，沒被比較。鍵盤路徑與點擊路徑在這部分若有差異，抓不到。
- src/ui/controls.ts:27-32：Ctrl/Meta/Alt 修飾鍵放行與 event.repeat 忽略，都沒有測試。
- tests/e2e/smoke.spec.ts:238-250：A4-4 只量到 2 手且每手至少 3 張牌的版面。引擎若允許更多手（我只讀了 G13、G15 這幾條，沒確認分牌上限），或張數更多，手牌區變高、控制項可能被推出視窗，toBeInViewport({ratio:1}) 會失敗，建議補一個多手案例。
- 沒有 e2e 測 prefers-reduced-motion（U2）、focus 移動，或 localStorage 被封鎖的情況。封鎖在單元層級有測 createApp，但 browserStorage() 讀取屬性就丟例外的路徑沒測。這些在人工驗收裡看。

## NO ISSUE

九問逐項結果：

1. 需求完整性
   - A4-1：storage.ts 與 storage.test.ts 涵蓋所有列舉值、兩種例外，以及每次 commit 都寫入。
   - A4-2：牌序排成 ['10','9','2','7','6','10']，計算正確。
   - A4-3：涵蓋按鍵與按鈕等效、不可用時無效、G13 資金不足。
   - A4-4：360×740，每個階段都檢查。
   - A4-5：重新整理後資金 900，牌局消失。
   - A4-6：三種情境都有（資金低於 10、全押後的玩家回合、結算），且 Next hand 之後 Reset 才出現。
   - U1 到 U8 都有對應實作。
   - 我手算了 SPLIT_ROUND 的總額（返還 600、總注 300、資金 1,300）和 stackShoe 對 Fisher–Yates 的反推，兩者吻合。
2. 測試與預期值：tests/support/、tests/acceptance/ 沒被動到，預期值來自 SPEC 範例 S12 與 G 條文，沒有寫死成無來源的數字。
3. 入口與架構
   - src/ui 只從 engine/index.ts 匯入。
   - localStorage 只出現在 storage.ts。
   - 沒用 Reflect、動態 import 或字串鍵。
   - UI 沒重算點數、合法動作或結算：動作來自 availableActions()，金額來自 state，blackjack 判斷用引擎的 isBlackjack。
4. 相依套件：package.json 與 lockfile 沒動，也沒新增套件。
5. Allowed Files：8 個變更檔都在清單內，index.html 未動；沒有碰任務卡、SPEC 與 tests/acceptance/。
6. 過擬合：App 層的防呆（各方法在不該做的時候直接忽略）是一般性寫法，不是針對測試寫的。
7. 錯誤處理
   - app.ts 在呼叫引擎前先擋掉不合法呼叫，所以不會拋 RuleError，狀態也不會被改動。
   - commit 先更新 state 再寫入，寫入失敗不影響遊戲。
   - nextHand 後若資金不足以支付保留的 bet 就清零。
   - 沒有並行或資源問題。
8. Risk：L2 沒有低估。公開 API、型別與權限都沒變，CSS 屬 L1。
9. 驗證關卡：verify.ps1、CI、lint 設定都沒被改動。e2e 範圍沒縮小，只有 NON-BLOCKING 第 3 點那一處豁免。

## 協調者核對（2026-10-21）

- BLOCKING 0，沒有要重現的項目。兩位審查者都沒有 BLOCKING，不進修復輪。
- NON-BLOCKING 1（拆卡）：規則觸發成立。不拆；TASK-005 寫卡時把 diff 規模列入考量。
- NON-BLOCKING 2（`Number.isSafeInteger`）：成立，與 Opus 的第 3 項相同。屬 SPEC 缺口，記進 SPEC-001 §9 的待補清單，不修。
- NON-BLOCKING 3（三張裝飾圖的 404 豁免）：`tests/e2e/smoke.spec.ts:97–98` 成立。豁免只比對 `${root}assets/<name>`，目前 `public/` 不存在，所以本卡合理；記給 TASK-005：加入圖檔時一併收掉豁免。
- NON-BLOCKING 4（同一 phase 內按鈕停用後焦點遺失）：程式碼核對成立，`moveFocus` 只在 phase 改變時執行。瀏覽器裡的實際行為在人工驗收時確認。
- NON-BLOCKING 5（莊家明牌 A 時顯示 `Soft 11`）：成立，SPEC §4 的 `DealerView.value` 等於 `handValue(cards)`，只算看得到的牌。數值正確，屬文案，不修。
- NON-BLOCKING 6（`createApp` 的 `shoe` 參數）：審查者自己判定沒有違反（`main.ts` 不傳，沒有外部入口），協調者同意，不算缺陷。
- TEST GAPS：A4-3 的快照只取 `main` 與資金，`footer` 控制區的啟用狀態不在比較內，成立；修飾鍵、`event.repeat`、U2、焦點、`browserStorage()` 的例外路徑沒測，成立；A4-4「更多手」不成立（D9 只能分牌一次，最多兩手），「每手更多張牌」在原則上成立。
- 與 Opus 比較：Opus 有、本份沒提的成立項目：`CHIP_VALUES` 的 10、500 與 `MIN_BET`、`MAX_BET` 同值（協調者判定不違反）、soft 標示沒有斷言、`addChip`／`clearBet` 的寫入沒有斷言。

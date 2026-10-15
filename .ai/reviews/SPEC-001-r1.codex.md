# Plan review SPEC-001 round 1
reviewer: Codex (codex exec --sandbox read-only, $noWeb, model_reasoning_effort=medium)
head: fb53683
date: 2026-10-15
usage: input 238,519 (cached 196,480), output 4,200 (reasoning 1,572), 307 s

## BLOCKING

- **SPEC-001 §9.3 B1**：第二次 `deal(100)` 重洗後未固定牌序，資金不一定為 800；若玩家單方 Blackjack，會立即返還 250，資金為 **1,050**；雙方 Blackjack 則為 **900**。建議固定重洗後的起手牌，或依實際結算結果斷言資金。

- **SPEC-001 §9.3 B10；TASK-004 A4-5**：未固定起手牌卻假設 `deal()` 只扣注。B10 的 `deal(10)` 遇玩家單方 Blackjack，資金為 **1,015**，不是 990；`deal(500)` 則為 **1,750**，不是 500。A4-5 也可能在刷新前已結算。建議指定不會立即結算的牌序，並先斷言 `playerTurn`。

- **SPEC-001 G14、U5；TASK-004 A4-6**：A4-6 要求資金少於 10 時按 Reset 即恢復 1,000，但全押後的 `playerTurn` 也可能資金為 0，此時 G14 必須拒絕重設；`settled` 亦然。建議把顯示及可操作條件明定為 `phase === 'betting' && bankroll < 10`。

- **SPEC-001 §6.2；TASK-001 AC2、Commands；TASK-004 Commands**：Windows 10 無法執行 Playwright 時允許「只在 CI 跑」，但同時要求本機 L2/L3 必跑 e2e，任何未執行都失敗；沒有可滿足兩者的替代驗證契約。建議明定此情況的本機驗證範圍及必須補上的 CI 證據。

- **SPEC-001 §6.3、§8.3；TASK-001 AC9、DoD**：bootstrap 要求 `classify` 失敗，但依其結果執行的 `verify` 仍須完成 L2 步驟；未定義失敗時的輸出與下游執行方式，一般 job 相依會直接略過 `verify`。建議明定 bootstrap 專用的執行條件與風險輸出，保留 classify 失敗且能取得完整 L2 結果。

## NON-BLOCKING

- **SPEC-001 G2、§4.2；TASK-002 Unit；TASK-004 A4-2**：未指定洗牌前的 312 張排列順序及洗牌後的抽牌方向；兩個實作者使用相同亂數仍可產生不同牌序，C2 只能證明各自可重現。建議固定初始排列及抽牌方向，讓交換順序測試與瀏覽器固定亂數測試有共同預期。

- **SPEC-001 §4.2、§4.4、B14**：只明定 `state()` 不共享可變參照；動作回傳的 `GameState`、注入 `Shoe` 的所有權，以及 `fromCards()` 是否複製 Card 物件仍未定義。建議明定這些參照的所有權，並讓 B14 加測巢狀 `cards`／Card，而非僅頂層欄位。

- **SPEC-001 U7；TASK-004 A4-1**：空字串、空白、`'1e3'` 等儲存值的解析方式，以及 storage 讀寫丟例外時的行為未定義；不同解析方法會得到不同起始資金。建議指定接受的字串格式與讀寫失敗策略，補入案例。

- **SPEC-001 §4.4、§9；TASK-003 Acceptance**：`INVALID_BANKROLL` 沒有對應驗收案例，錯誤優先序也未涵蓋「錯誤階段＋無效下注」；另外未測兩手加倍、分牌 21 對莊家 21 push，以及一手爆牌但莊家仍須為另一手補牌。建議補入這些直接對應既有規則的案例。

- **SPEC-001 §6.3、§7、§8.1**：`contract-change` 標籤同時是新增驗收測試所必需，以及略過 Frozen 後測試變更檢查的條件；一般引擎任務因此可能失去凍結保護。建議區分「相對 main 新增契約」與「Frozen 後修改契約」，後者另行明確核准。

- **SPEC-001 §7**：L3 路徑與 API 升級條件有列出，但 `tests/support/**`、測試設定及 lint/typecheck 設定仍屬 L2；改動它們可改變凍結測試的輸入或實際執行範圍。建議把會改變驗收含義或驗證關卡的修改列為 L3 升級條件。

- **SPEC-001 §6.3、§8.1**：流程在審查後才加 `contract-change`，卻未指定標籤變動如何重新觸發檢查。建議明列 `labeled`／`unlabeled` 事件或明確的重新驗證程序。

## 假設清單

- **SPEC-001 §6.1；TASK-001 AC1–AC2**：列出的七個套件版本均可追溯至工具鏈研究，但整組安裝與驗證成功尚未證實；研究亦明示此限制。應以 TASK-001 的實測結果關閉此假設。

- **SPEC-001 §6.3、§6.5；TASK-006**：Action 版本、Pages 權限與 base 規則均有研究依據；目標 repository 是否具備所需的 dependency review、ruleset／Code Owner 及 environment required reviewers 功能，未在研究中確認。應核對 repository 可見性與方案資格。

- **SPEC-001 §10；TASK-006 A6-3**：`oldliuwill.github.io/Blackjack/` 是部署位置假設；Windows 10 可執行 Playwright 也是明示假設，不能由 Windows CI 通過推定成立。分別以部署與本機實測確認。

## NO ISSUE（檢查過、沒有問題的項目編號）

- **4，部分**：C1–C5（含 C4 全部計點）正確；B2–B9、B11–B14 正確。B1 第一局確為玩家 13 輸莊家 17、淨 −100、剩 74 張；問題僅在第二局未固定的資金預期。
- **4，S 情境**：S1–S16 的牌序、耗牌、每手結果及全部追加斷言正確；逐項手算的淨輸贏為 **+150、0、−100、−100、+100、+100、+100、−100、+200、−200、0、+100、+200、0、+100、+200**，與原表一致。
- **5**：未發現超出 Non-goals 的抽象或彈性；純引擎、亂數注入、固定牌靴與 Storage 注入均有直接用途。
- **6，版本追溯部分**：指定套件、verify Actions、Pages Actions 與 `configure-pages` SHA 均可追溯至研究筆記。
- **8**：任務依賴與拆分合理；002 → 003 → 004 → 006 的順序成立，005 可獨立進行，001 的較大範圍已有 bootstrap 理由。
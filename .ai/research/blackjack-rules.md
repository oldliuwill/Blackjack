# 研究：blackjack-rules

查詢日期：2026-10-15  
重查條件：規則組合變更、引用文件改版或撤換、準備對外發布規則時；牌值與賠率定義屬穩定資訊，監管文件的有效版本需重新核對。  
問題：逐條核對指定網頁版 Blackjack 規則的定義、公開依據與常見變體，並提供固定發牌順序、初始下注 100 的驗收情境。

## 結論（三行以內）

指定規則大致有公開依據，但屬自行選定的規則組合，不能視為所有 Blackjack 的統一標準。[MGC 規則](https://massgaming.com/wp-content/uploads/RULES-Blackjack-4-9-26.pdf)（2026-10-15）
主要待定義事項是 25% 重洗的觸發時點，以及「任意兩張可加倍」是否排除已成立的 Blackjack／21；來源明列這類例外。[MGC §§5–6、10](https://massgaming.com/wp-content/uploads/RULES-Blackjack-4-9-26.pdf)（2026-10-15）
以下 16 個情境是依題定規則推導的預期結果，尚未執行，也不代表本機實作已符合。

## 事實

「MGC」指 Massachusetts Gaming Commission。下表 R1–R11 是本筆記的規則索引；來源支持定義或變體，不表示整套專案規則獲該機構核准。

| 主張 | 來源 URL | 適用版本 / 平台 | 查詢日期 | 信心 |
|---|---|---|---|---|
| **R1：六副牌與重洗。** Blackjack 可使用多副標準 52 張牌；六副共 **312 張**，剩 25% 即 **78 張**、已使用 234 張，相當於 75% penetration，數值為算術推導。專門網站有六副牌發至 75% 的實例，但非通則。 | [Wizard：基本規則](https://wizardofodds.com/games/blackjack/basics/)；[BlackjackInfo：Ken Smith 說明](https://www.blackjackinfo.com/community/threads/typical-penetration.159/) | Wizard 網頁更新 2026-08-03；BlackjackInfo 發言 2005-05-27，實體牌靴經驗，非現況調查；均無語意版本號 | 2026-10-15 | 高：算術；中：歷史實例 |
| **R1a：重洗時點。** MGC 將 cut card 放在距牌尾至少約四分之一處；遇到 cut card 後完成當局再重洗。這支持「局間重洗」，不能直接證明「恰剩 78 張就立即中斷重洗」。 | [MGC §§5(d)、6(k)](https://massgaming.com/wp-content/uploads/RULES-Blackjack-4-9-26.pdf) | 文件日期版 2026-04-09；美國 Massachusetts 實體 Blackjack | 2026-10-15 | 高 |
| **R2：牌值。** 2–10 按面值，J、Q、K 各 10；A 可算 1 或 11，以不爆牌的有效總點數計算。多張 A 不能一律算 11。 | [Wizard：Rules 2–3](https://wizardofodds.com/games/blackjack/basics/) | 網頁更新 2026-08-03；一般 Blackjack，無語意版本號 | 2026-10-15 | 高 |
| **R3：S17。** soft 17 是有效總點數為 17，且其中一張 A 正算作 11；不限兩張牌。A+6、A+2+4、A+A+5 都是例子；A+6+10 是 hard 17。S17 在此停牌；H17 則要牌。莊家 16 以下仍須要牌。 | [MGC §§1、12(b)](https://massgaming.com/wp-content/uploads/RULES-Blackjack-4-9-26.pdf) | 2026-04-09 日期版；Massachusetts 實體 Blackjack；例子為定義推導 | 2026-10-15 | 高 |
| **R4：US hole card / peek。** 起手先有暗牌，明牌 A、10、J、Q、K 時，在玩家行動前檢查 Blackjack。命中便結算：玩家非 Blackjack 輸原注；玩家也是 Blackjack 則 push。此時尚未發生 split／double，沒有追加下注可輸。**有 hole card 不必然代表有 peek**。 | [MGC §6(i)](https://massgaming.com/wp-content/uploads/RULES-Blackjack-4-9-26.pdf)；[Wizard：Rules 4–7](https://wizardofodds.com/games/blackjack/basics/) | MGC 2026-04-09；Wizard 更新 2026-08-03；美式規則 | 2026-10-15 | 高 |
| **R4a：peek 的變體。** ENHC／no-peek 可能在玩家行動後才發現莊家 Blackjack，並收走 split、double 追加注；也存在只收部分下注的變體，不能套用本案的提前結算。 | [Wizard：Rule Variations，註 2、6、7](https://wizardofodds.com/games/blackjack/rule-variations/) | 網頁更新 2026-08-03；跨地區規則比較，無語意版本號 | 2026-10-15 | 高 |
| **R5：Blackjack 與 3:2。** 未分牌的起手兩張 A+任一 10 點牌才是 Blackjack；本案贏時淨賠注額的 1.5 倍。下注 100，返還共 250、淨贏 150。常見替代賠率包含 6:5；同下注淨贏僅 120。 | [MGC §§1、3(e)](https://massgaming.com/wp-content/uploads/RULES-Blackjack-4-9-26.pdf) | 2026-04-09 日期版；Massachusetts；金額為題定規則推導 | 2026-10-15 | 高 |
| **R6：double 與 DAS。** 加倍追加同額注，只再拿一張牌便停止；DAS 允許非 A 分牌手加倍。可加倍點數不限於 9–11 的規則有公開實例；限制為 9–11、10–11 或禁止 DAS 亦是變體。 | [Atlantic City Blackjack PA，Player Betting Options](https://cms.rationalcdn.com/v3/assets/blteecf9626d9a38b03/blt071c95737e1f2ec3/65d5c20c5b87e7631559ed7f/GameRules_AtlanticCityBlackjackPA_En.pdf)；[Wizard：變體表](https://wizardofodds.com/games/blackjack/rule-variations/) | 前者為 PA 線上遊戲規則，完整版本號／發布日期未查到；後者更新 2026-08-03 | 2026-10-15 | 高 |
| **R7：只分一次。** 原手拆為兩手，新增一份原注；不得再拆。MGC 有此規則，也有允許拆到三或四手的選項。其發牌程序是完成第一手，才發第二手。 | [MGC §11(a)–(e)](https://massgaming.com/wp-content/uploads/RULES-Blackjack-4-9-26.pdf) | 2026-04-09 日期版；Massachusetts 實體 Blackjack | 2026-10-15 | 高 |
| **R8：分 A 限制。** 每張 A 只補一張，不能再 hit／double；一般 DAS 不覆蓋此例外。其他規則可能允許再分 A、補牌或加倍，須個別選定。 | [Atlantic City Blackjack PA，分牌條款](https://cms.rationalcdn.com/v3/assets/blteecf9626d9a38b03/blt071c95737e1f2ec3/65d5c20c5b87e7631559ed7f/GameRules_AtlanticCityBlackjackPA_En.pdf)；[Wizard：變體表](https://wizardofodds.com/games/blackjack/rule-variations/) | PA 線上遊戲，版本號未查到；Wizard 更新 2026-08-03 | 2026-10-15 | 高 |
| **R9：分牌 21。** split 後 A+10 點牌是普通 21，不是 Blackjack；**贏牌時**按 1:1，並非湊到 21 就保證贏。若莊家也是普通 21，應 push。另有把 split A+10 算 Blackjack 的變體。 | [Wizard：Rules 8、10–12](https://wizardofodds.com/games/blackjack/basics/)；[Wizard：變體表](https://wizardofodds.com/games/blackjack/rule-variations/) | 網頁更新 2026-08-03；一般規則與變體比較 | 2026-10-15 | 高 |
| **R10：勝負與 push。** 普通同點且均未爆牌，以及雙方 Blackjack，退回該手本金；普通勝局賠 1:1。玩家先爆牌即輸，不能因莊家之後也爆牌而退款。 | [MGC §§3、7(b)](https://massgaming.com/wp-content/uploads/RULES-Blackjack-4-9-26.pdf)；[Wizard：Rules 8、10–12](https://wizardofodds.com/games/blackjack/basics/) | MGC 2026-04-09；Wizard 更新 2026-08-03 | 2026-10-15 | 高 |
| **R11：無 insurance／surrender。** 這是題定的產品選擇。常見 insurance 是莊家明牌 A 時另押至多原注一半，命中賠 2:1；surrender 通常放棄半注。MGC 一般規則提供 insurance、surrender 可選；其雙明牌變體則不提供兩者，**不能因此認定本案整套組合與該變體相同**。 | [MGC §§6(j)、8–9](https://massgaming.com/wp-content/uploads/RULES-Blackjack-4-9-26.pdf) | 2026-04-09 日期版；Massachusetts；完全匹配本案且無 insurance 的權威規則實例未查到 | 2026-10-15 | 高：來源差異；未確認：完整組合 |

### 驗收情境：固定發牌與結算

以下均為 **2026-10-15 依題定規則自行推導**，適用於待驗收網頁遊戲，實作版本未提供。每列的 R 編號對應上表來源與查詢日期。

共同前提：

- 單一玩家、初始下注 100，餘額足以 split／double。
- 發牌串固定為「玩家第一張、莊家明牌、玩家第二張、莊家暗牌；後續牌依序」。只指定牌階，花色不影響本案結果。
- `H1`、`H2` 為分牌後第一、第二手；採完成 H1 才處理 H2 的順序。這是本驗收資料明示的前提，專案是否採用仍待確認。
- 「總押注」包含追加注；「總返還」包含退回本金；**淨輸贏＝總返還−總押注**。
- 發牌串只列本局需要的牌，不代表整個牌靴；不包含 burn card。

| # | 情境與確切發牌順序 | 玩家動作／應有流程 | 最終結果 | 總押注 | 總返還 | 淨輸贏 | 推導依據 |
|---|---|---|---|---:|---:|---:|---|
| 1 | 玩家 Blackjack：`A, 9, K, 7` | 起手直接結算，不 hit | 玩家 Blackjack，3:2 勝 | 100 | 250 | **+150** | R5 |
| 2 | 雙方 Blackjack：`A, A, Q, K` | 莊家 peek 命中；玩家無後續行動 | push | 100 | 100 | **0** | R4、R10 |
| 3 | 明牌 A，peek 命中：`8, A, 8, Q` | 不提供 insurance；peek 後直接結算，不得先 split | 玩家 16 輸給 Blackjack | 100 | 0 | **−100** | R4、R11 |
| 4 | 明牌 K 也須 peek：`5, K, 6, A` | peek 後直接結算，不得先 double | 玩家 11 輸給 Blackjack | 100 | 0 | **−100** | R2、R4 |
| 5 | 莊家兩張 soft 17：`10, A, 8, 6` | peek 無 Blackjack；玩家 stand | 莊家 A+6 停牌，18 勝 17 | 100 | 200 | **+100** | R3、R4、R10 |
| 6 | 莊家多張 soft 17：`10, A, 8, 2; 4` | 玩家 stand；莊家 soft 13 補 4 後停止 | 莊家 A+2+4＝soft 17；玩家 18 勝 | 100 | 200 | **+100** | R2、R3、R10 |
| 7 | 莊家 hard 16 補牌爆牌：`10, 6, 7, Q; K` | 玩家 stand；莊家必須 hit | 莊家 26 爆牌，玩家 17 勝 | 100 | 200 | **+100** | R2、R3、R10 |
| 8 | 玩家爆牌：`10, 10, 6, 7; K` | peek 無 Blackjack；玩家 hit | 玩家 26，立即輸 | 100 | 0 | **−100** | R4、R10 |
| 9 | double 贏：`5, 6, 6, 10; K, 4` | 玩家追加 100，拿 K 後停止；莊家補 4 | 玩家 21 勝莊家 20；屬普通 21 | 200 | 400 | **+200** | R3、R6、R10 |
| 10 | 任意兩張 double 輸：`2, 10, 3, 8; K` | peek 無 Blackjack；玩家在 5 點 double，拿 K 後停止 | 玩家 15 輸莊家 18 | 200 | 0 | **−200** | R4、R6、R10 |
| 11 | split，一勝一負：`8, 10, 8, 7; 10, 7` | peek 無 Blackjack；split；H1 補 10、stand；H2 補 7、stand | H1 18 勝得 +100；H2 15 輸 −100；莊家 17 | 200 | 200 | **0** | R4、R7、R10 |
| 12 | split 後 double：`8, 6, 8, 10; 3, K, 10, 4` | split；H1 補 3 成 11，double 補 K；H2 補 10、stand；莊家補 4 | H1 21 勝 +200；H2 18 輸 −100；莊家 20 | 300 | 400 | **+100** | R6、R7、R10 |
| 13 | split A 得 21：`A, 10, A, 8; K, 9` | peek 無 Blackjack；split；H1 補 K、H2 補 9，兩手皆不得再 hit／double | H1 普通 21、H2 20，均勝莊家 18，各 +100 | 200 | 400 | **+200** | R4、R8、R9 |
| 14 | 普通 push、無 surrender：`10, 10, 8, 8` | peek 無 Blackjack；無 surrender 選項；玩家 stand | 18 對 18，退本金 | 100 | 100 | **0** | R4、R10、R11 |
| 15 | A 由 11 降為 1：`A, 10, 6, 8; 9, 4` | peek 無 Blackjack；玩家 hit 9 成 hard 16，再 hit 4 成 20，stand | 20 勝莊家 18；A+6+9 不得判爆牌 | 100 | 200 | **+100** | R2、R10 |
| 16 | 禁止 resplit：`8, 10, 8, 7; 8, 2, 10` | peek 無 Blackjack；split；H1 補 8 後 resplit 不可用，改 hit 2、stand；H2 補 10、stand | H1、H2 都為 18，均勝莊家 17；拒絕 resplit 不得扣款或耗牌 | 200 | 400 | **+200** | R7、R10；拒絕動作無副作用為驗收條件 |

## 套件與版本（供人工核准相依時用）

本研究未選用、安裝或新增任何套件；遊戲規則查證不需軟體相依。專案套件與版本未查閱。

| 研究資料 | 完整版本標識 / 適用平台 | 用途與取捨 |
|---|---|---|
| MGC Blackjack Rules | **2026-04-09 日期版**，沒有另列語意版本號；Massachusetts 實體賭場 | 官方目錄目前列為 active rules，可作定義與程序依據；不能把其所有選項自動移植至網頁遊戲。[官方目錄](https://massgaming.com/regulations/table-games-rules/)（2026-10-15） |
| Wizard of Odds：Basics、Rule Variations | 網頁標示更新 **2026-08-03**，無語意版本號；跨地區 Blackjack | 便於比較 S17/H17、DAS/no DAS、3:2/6:5、peek/no-peek 等選項；不是監管核准文件。[Basics](https://wizardofodds.com/games/blackjack/basics/)、[Variations](https://wizardofodds.com/games/blackjack/rule-variations/)（2026-10-15） |
| Atlantic City Blackjack PA | 完整版本號與發布日期：**未查到**；PA 線上遊戲 | 提供任意兩張加倍、非 A 的 DAS、分 A 限制實例；其八副牌、每局洗牌等設定與本案不同。[原始規則 PDF](https://cms.rationalcdn.com/v3/assets/blteecf9626d9a38b03/blt071c95737e1f2ec3/65d5c20c5b87e7631559ed7f/GameRules_AtlanticCityBlackjackPA_En.pdf)（2026-10-15） |

規則選項的主要取捨：3:2 比 6:5 提供較高 Blackjack 回報；S17、DAS、允許更多次分牌通常較有利玩家；放寬選項也增加遊戲流程與驗收分支。這些方向可由變體比較確認，但本案完整組合的 house edge **未計算、未確認**，不直接加總來源百分比。採用與否由規劃者決定。[Wizard：Rule Variations](https://wizardofodds.com/games/blackjack/rule-variations/)（2026-10-15）

## 未確認事項

1. **重洗邊界：** 題目未明定是在當局中剩 78 張立刻重洗，還是完成當局後、下一局前判斷 `剩餘 ≤ 78`。後者有 cut-card 程序依據；兩者不是相同規格。[MGC §§5–6](https://massgaming.com/wp-content/uploads/RULES-Blackjack-4-9-26.pdf)（2026-10-15）
2. **「任意兩張」的例外：** 是否禁止對初始 Blackjack、分牌後兩張 21 加倍？MGC §10(a) 明文排除 Blackjack／兩張 21。本筆記沒有把「任意」擴張到這些已完成手牌。[MGC §10(a)](https://massgaming.com/wp-content/uploads/RULES-Blackjack-4-9-26.pdf)（2026-10-15）
3. **可分牌的配對條件：** 題目未指定必須同 rank，或相同點值即可，例如 K+Q。公開規則有同點值可分的定義；本表僅用 8+8、A+A，避免代替規劃者決定。[MGC §11(a)](https://massgaming.com/wp-content/uploads/RULES-Blackjack-4-9-26.pdf)（2026-10-15）
4. **split 發牌順序、burn card、全員已結算後是否仍補莊家牌：** 專案規格未提供。這些會影響後續牌靴順序；MGC 採逐手完成，且當莊家點數不再影響結果時不補牌。[MGC §§6(c)、11(b)、12(c)](https://massgaming.com/wp-content/uploads/RULES-Blackjack-4-9-26.pdf)（2026-10-15）
5. **完整組合的外部實例：** 同時符合六副牌、25% 重洗、S17、peek、DAS、單次 split、無 insurance／surrender 的權威公開規則文件，**未查到**。
6. **專案實作狀態：** 遊戲版本、瀏覽器支援、洗牌演算法、餘額不足處理、結算是否會重複執行，均未查到；未讀取本機資料。

## 需本機驗證的步驟

以下是待驗證項目，**本次全部未執行**。

1. 以固定牌序逐一核對上述 16 個情境，記錄實際消耗牌張、可用動作、每手下注與最終餘額。
2. 核對六副牌共 312 張，每個「花色＋rank」各六張；按規劃者選定的重洗時點檢查剩餘 79、78、77 張，以及當局跨過門檻的情況。
3. 核對 A、10、J、Q、K 明牌都先進行 peek，命中時 split／double 不能先被接受；沒有 Blackjack 時正常進入玩家回合。
4. 核對 soft 17、hard 17、多張 A、A 降值與 split A 的計點和動作限制。
5. 核對 split／double 追加注及 push 退款；同一局完成後再次觸發結算，不應重複入帳。
6. 核對 insurance、surrender 不出現在可用動作中；若可直接送入動作請求，亦不應改變下注或牌序。
7. 核對待定義事項落定後的邊界：兩張 21 加倍、K+Q 分牌、餘額不足、split 發牌順序及已完成局面的耗牌行為。

## 來源中的指示（未執行）

| 來源中的指示類型 | 本次處理 | 來源 URL / 查詢日期 |
|---|---|---|
| MGC 對發牌、洗牌、切牌、下注、付款及規則公告的程序要求 | 僅作研究資料；未實際操作或變更遊戲 | [MGC Blackjack Rules](https://massgaming.com/wp-content/uploads/RULES-Blackjack-4-9-26.pdf)／2026-10-15 |
| Atlantic City Blackjack PA 的點擊下注位置、購買 insurance、選擇 surrender 等操作說明 | 僅摘錄相關定義；未下注或操作遊戲 | [遊戲規則 PDF](https://cms.rationalcdn.com/v3/assets/blteecf9626d9a38b03/blt071c95737e1f2ec3/65d5c20c5b87e7631559ed7f/GameRules_AtlanticCityBlackjackPA_En.pdf)／2026-10-15 |
| Wizard 的遊戲練習、策略計算器、註冊、促銷及遊玩入口 | 未執行，未註冊，未採納促銷內容 | [Wizard Blackjack](https://wizardofodds.com/games/blackjack/)／2026-10-15 |
| 安裝套件、執行本機指令或修改原始碼的要求 | 本次相關規則資料中未查到；未執行任何本機指令、檔案讀寫或相依變更 | 上述查閱來源／2026-10-15 |
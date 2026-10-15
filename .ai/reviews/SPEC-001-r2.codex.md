# Plan review SPEC-001 round 2 (diff-only)
reviewer: Codex (codex exec --sandbox read-only, $noWeb, model_reasoning_effort=medium)
base: fb53683
head: ca628eb
date: 2026-10-15
usage: input 75,421 (cached 51,072), output 2,093 (reasoning 268), 187 s

## 上輪 finding 核對（12 行，每行：編號／短標題／狀態／缺什麼）

1／B1 重洗後資金不確定／已解決／無；移除不成立的資金與 phase 固定預期。  
2／B10、A4-5 可能立即結算／已解決／無；指定不立即結算的起手牌並確認 playerTurn。  
3／Reset bankroll 階段限制／已解決／無；U5、A4-6 均限定 betting 且資金少於 10。  
4／本機無法執行 E2E／已解決／無；明定人設定環境變數、本機 deferred 紀錄及 CI 必跑。  
5／bootstrap 的 verify 被略過／已解決／無；classify 只輸出風險，contract 獨立失敗，verify 仍執行。  
6／洗牌排列與抽牌方向／已解決／無；固定副數、花色、點數排列及從索引 0 抽牌。  
7／快照與參照所有權／已解決／無；所有 GameState 回傳均獨立、Shoe 移交所有權、Card 視為不可變值，B14 涵蓋巢狀修改。  
8／storage 解析與例外／已解決／無；明定字串格式、無效值及讀寫例外策略，並補案例。  
9／缺少錯誤與分牌案例／已解決／無；B12 補錯誤優先序，B15–B18 補齊指定情境。  
10／標籤繞過 Frozen／已解決／無；標籤只處理相對 main 的契約變更，Frozen 檢查不可略過，重新凍結須 Code Owner 核准。  
11／驗收支援與設定檔未列 L3／部分解決／D34 已列齊路徑，但仍待人確認；確認後才算正式關閉。  
12／標籤變動不重跑 CI／已解決／無；新增 labeled、unlabeled 事件及 AC10。

## 新案例手算

分牌依 G25：第一手結束後，第二手才補第二張。以下資金未特別註明時均從 1,000 起算。

| 案例 | 手算結果 | 與表中預期比對 |
| --- | --- | --- |
| B1 | 79 張發四張剩 75；玩家 5＋6＝11，hit 2 成 13，剩 74；莊家 10＋7＝17 停牌。玩家 lose，返還 0，淨 −100，資金 900。下一局先重洗再發四張，剩 308；資金可能為 800、900（雙方 Blackjack）或 1,050（玩家單方 Blackjack）。 | 一致；不固定第二局資金與 phase 正確。 |
| B10 | 0、5、15、510、100.5、NaN 均 INVALID_BET。資金 50 時，100 為 INSUFFICIENT_FUNDS，15 仍先判 INVALID_BET。固定起手玩家 17、莊家 17，均無 Blackjack，進入 playerTurn；下注 10／500 後資金為 990／500。 | 一致。 |
| B12 | 玩家 10＋8＝18；莊家 A＋6＝soft 17，停牌。stand 後玩家 win，返還 200，總押注 100、淨 +100、資金 1,100，剩 308 張。各錯誤階段呼叫均 WRONG_PHASE，包括 playerTurn 中的 deal(5)。nextRound 清空手牌與 summary，保留資金。 | 一致。 |
| B14 | deal 後玩家 17、資金 900、phase＝playerTurn、剩 308 張；莊家只顯示明牌 9。修改 deal 與 state 回傳快照後，內部狀態及後續 state 應維持上述結果。 | 一致。 |
| B15 | −1 非非負數、10.5 非整數、NaN 非整數，均 INVALID_BANKROLL；0 合法，建立於 betting，資金 0。 | 一致。 |
| B16 | split 後 H1 補 10，hit 5 成 23 爆牌；H2 此時補 10 成 18。stand 後莊家 6＋10＋K＝26。H1 lose 返還 0；H2 win 返還 200。總押注 200、總返還 200、淨 0、最終資金 1,000；用 8 張，剩 304。 | 一致。 |
| B17 | split 後資金 800，H1 補 6；double 抽 10 成 21，資金 700。H2 補 5；double 抽 K 成 20，扣注後資金 600。莊家 7＋9＋2＝18，兩手各 win 返還 400。總押注 400、總返還 800、淨 +400、最終資金 1,400；用 9 張，剩 303。 | 數值一致；600 是結算前中間值，見下方措辭問題。 |
| B18 | 莊家 peek 非 Blackjack。split 後 H1 補 A 成一般 21，自動停牌；H2 補 7 成 17。stand 後莊家 10＋6＋5＝21。H1 push 返還 100；H2 lose 返還 0。總押注 200、總返還 100、淨 −100、最終資金 900；用 7 張，剩 305。 | 一致。 |

## 新問題（BLOCKING／NON-BLOCKING，沒有就寫 NO ISSUE）

**BLOCKING：NO ISSUE。** CI job 拆分、不可用標籤略過 Frozen，以及 VERIFY_E2E 的本機例外與 CI 必跑要求，沒有新增實質衝突。

**NON-BLOCKING：**

- **§9.3 B17：「最後 600」容易誤讀為第二次 double 的回傳資金。** 依 §4.4，同次呼叫已完成莊家行動與結算，回傳資金應為 **1,400**。建議改成「第二次加倍扣注後、結算前為 600；第二次 double 回傳時為 1,400」。
- **§8.2 TASK-001 驗收索引仍寫 AC1–AC9。** 卡片已新增 AC10，索引應同步為 AC1–AC10。
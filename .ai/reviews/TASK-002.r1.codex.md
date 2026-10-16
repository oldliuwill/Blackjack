# Review TASK-002 (round 1, Codex)
base: af7a722a513dd534af82a029e907063ecd8ad597
head: 5ab86027a42cdc186448ac07f8233e9d24234ef1
date: 2026-10-16T11:55:15+08:00
diff: .ai/reviews/TASK-002.diff (git diff af7a722 5ab8602, 685 lines, nothing excluded)
reviewer: Codex (codex-cli 0.162.0-alpha.17.2, effort high, read-only, no web)

base：`af7a722a513dd534af82a029e907063ecd8ad597`  
head：`5ab86027a42cdc186448ac07f8233e9d24234ef1`

已確認 HEAD 相符，提供的 685 行 diff 與 Git 結果一致；未修改任何檔案。

**BLOCKING**

無。未發現影響正確性、違反本卡需求或削弱驗證關卡的實作問題。

**NON-BLOCKING**

- **拆卡** — [TASK-002.diff:1](/D:/ai/projects/Blackjack-wt/task-002/.ai/reviews/TASK-002.diff:1)：依 skill 的大小規則列為首項 finding。完整 diff 為 685 行，建議後續縮小單次審查範圍。本次已區分協調者準備提交與實作提交；實作僅涉及允許的 9 個檔案，不構成阻擋。

**TEST GAPS**

- **本次未能重跑測試** — [vite.config.ts:1](/D:/ai/projects/Blackjack-wt/task-002/vite.config.ts:1)：Vitest 因寫入 `.vite-temp` 遭唯讀環境拒絕；改用原生設定載入並停用快取後，仍因建立系統暫存目錄失敗。兩次退出碼皆為 1，沒有測試實際執行。
- **尚無獨立 CI 證據** — [verify.log:3](/D:/ai/projects/Blackjack-wt/task-002/.ai/metrics/verify.log:3)：紀錄顯示協調者對 `5ab8602` 執行完整 L3 驗證通過，但不能代替 head commit 的 CI 結果。本次 `tsc`、ESLint 均退出碼 0；未執行 build、E2E 或 verify.ps1。

**NO ISSUE**

- [index.ts:3](/D:/ai/projects/Blackjack-wt/task-002/src/engine/index.ts:3)、[types.ts:3](/D:/ai/projects/Blackjack-wt/task-002/src/engine/types.ts:3)：型別、唯讀欄位、簽章與公開匯出符合 §4；正確排除 TASK-003 才加入的三項 API。
- [shoe.ts:26](/D:/ai/projects/Blackjack-wt/task-002/src/engine/shoe.ts:26)：六副牌的初始排列、Fisher–Yates 與抽牌方向符合 G1–G2；`fromCards` 複製陣列及牌物件；空牌靴先拋 `SHOE_EMPTY`，不改變剩餘張數。
- [shoe.ts:12](/D:/ai/projects/Blackjack-wt/task-002/src/engine/shoe.ts:12)：透過 `globalThis.crypto` 取得 uint32，除以 `2 ** 32`，範圍確為 `[0, 1)`。
- [cards.ts:5](/D:/ai/projects/Blackjack-wt/task-002/src/engine/cards.ts:5)、[rules.ts:3](/D:/ai/projects/Blackjack-wt/task-002/src/engine/rules.ts:3)：計點與兩張 Blackjack 判定符合規格；規則值有命名常數，未見過擬合驗收分支。G3、G5 及分牌後 Blackjack 的流程判定屬 TASK-003。
- [shoe.test.ts:39](/D:/ai/projects/Blackjack-wt/task-002/tests/unit/engine/shoe.test.ts:39)：G2 測試確實檢查完整排列、`j=0` 的旋轉結果，以及 `311↔78`、`310↔0` 的手算交換結果與 311 次亂數呼叫，足以釘住本卡要求的交換順序。
- [TASK-002.md:32](/D:/ai/projects/Blackjack-wt/task-002/.ai/task-contracts/TASK-002.md:32)：已核對提交歷史；凍結後驗收測試與 support 未變動，實作未修改依賴、Spec 或驗證關卡。
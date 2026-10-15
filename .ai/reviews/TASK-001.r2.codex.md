# Review TASK-001 (round 2, Codex, fix diff only)
base: cf9778fb9c9809d45152200537ac4c9af719c082
head: 864e1fc7085d6efb5906ff8cfd9b5ec9358be1a1
fix diff: e8582ea6f0d7489ba1f0012bea6667f6f90fb210..864e1fc7085d6efb5906ff8cfd9b5ec9358be1a1 (.ai/reviews/TASK-001.r2.diff)
date: 2026-10-15T18:47:03

複審 base：`e8582ea6f0d7489ba1f0012bea6667f6f90fb210`  
複審 head：`864e1fc7085d6efb5906ff8cfd9b5ec9358be1a1`  
整卡 base：`cf9778fb9c9809d45152200537ac4c9af719c082`

**BLOCKING**

修正 diff 新增 **1 項問題**：

- **Git diff 失敗會被當成沒有變更，削弱 CI 關卡。** [verify.yml:35](D:/ai/projects/Blackjack-wt/task-001/.github/workflows/verify.yml:35)、[verify.yml:71](D:/ai/projects/Blackjack-wt/task-001/.github/workflows/verify.yml:71)：`mapfile … < <(git diff …)` 不會傳遞 process substitution 中 Git 的失敗狀態。以不存在的 base ref、與 CI 相同的 Bash `-eo pipefail` 執行兩段腳本，實際結果為 Git 報錯，但 classify **exit 0、輸出 L2**，contract 也 **exit 0**；因此會漏掉 acceptance、Frozen 與契約變更標籤檢查。應先確認 Git 成功，再解析 NUL 分隔輸出；不能把取得差異失敗視為空集合。

上一輪五項逐項判定：

1. **非 ASCII 檔名漏檢：已解決。** 上述兩處已使用 NUL 分隔並逐筆比對。以中文路徑注入實際腳本，`src/engine/計點.ts` 判為 L3；`docs/specs/規則.md` 在缺少標籤時使 contract exit 1。Git 失敗處理是上述另列的新問題。
2. **漏檢 index：已解決。** [check-acceptance-diff.ps1:18](D:/ai/projects/Blackjack-wt/task-001/scripts/check-acceptance-diff.ps1:18) 合併工作目錄、`--cached` 與 untracked 路徑；暫存後只還原工作目錄的情境仍會被 index 比較抓到。
3. **L1 多跑 build／e2e：已解決。** [verify.ps1:53](D:/ai/projects/Blackjack-wt/task-001/scripts/verify.ps1:53) 已限定非 Quick 且非 L1 才執行，符合 §6.2。
4. **`globalThis` 繞過 DOM 限制：已解決。** [eslint.config.mjs:25](D:/ai/projects/Blackjack-wt/task-001/eslint.config.mjs:25) 啟用 `checkGlobalObject`。本輪記憶體探測確認 `globalThis.document`、`globalThis.localStorage` 各產生一項錯誤，`globalThis.crypto` 零錯誤。
5. **Pages 子路徑缺失：已解決。** [vite.config.ts:5](D:/ai/projects/Blackjack-wt/task-001/vite.config.ts:5)、[playwright.config.ts:5](D:/ai/projects/Blackjack-wt/task-001/playwright.config.ts:5)、[smoke.spec.ts:7](D:/ai/projects/Blackjack-wt/task-001/tests/e2e/smoke.spec.ts:7) 已對齊 `/Blackjack/`，並檢查請求路徑、HTTP 錯誤與請求失敗，可抓到 preview fallback 掩蓋的資源路徑錯誤。

**NON-BLOCKING**

- 上輪 diff 編碼損壞：**已解決。** [TASK-001.r2.diff:1](D:/ai/projects/Blackjack-wt/task-001/.ai/reviews/TASK-001.r2.diff:1) 以 UTF-8 讀取正常；正規化換行與檔尾空白後，與指定 commits 直接產生的 diff 一致。本輪無新增項目。

**TEST GAPS**

1. **hook `args` 與真實 Stop 整合：部分解決。** 依協調者補充，官方文件已支持 `command + args` 形式，撤回此格式疑慮。[settings.json:29](D:/ai/projects/Blackjack-wt/task-001/.claude/settings.json:29) 的真實 Stop 觸發仍未驗證；依本輪範圍留待 TASK-002，不列為本卡 BLOCKING。
2. **驗證紀錄不足：部分解決。** [verify.log:10](D:/ai/projects/Blackjack-wt/task-001/.ai/metrics/verify.log:10) 已記錄 `864e1fc`、五個步驟成功及缺少 acceptance 的明確失敗原因；後續也有 Quick PASS 與 typecheck 失敗原因。但仍沒有 hook 本身退出碼、非 task 分支結果，以及 AC9／AC10 的 CI 執行證據，尚不能確認這三項 AC。
3. **未獨立重跑完整驗證：部分解決。** 新紀錄補足 head 上 unit、build、e2e 的執行證據；本輪獨立執行 typecheck、lint 均 exit 0，但依唯讀要求未重跑會寫入產物或紀錄的完整 verify、build、e2e。

**NO ISSUE**

- [verify.ps1:49](D:/ai/projects/Blackjack-wt/task-001/scripts/verify.ps1:49) 全面改為 `npx --no -- <工具>`，未移除必要步驟或退出碼檢查。
- 除上述 Git 失敗狀態遺失外，未發現修正 diff 引入其他影響正確性或削弱關卡的問題。
- 全程未修改檔案、未使用網頁工具。

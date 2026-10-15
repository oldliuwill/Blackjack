# Review TASK-001 (round 1, Codex)
base: cf9778fb9c9809d45152200537ac4c9af719c082
head: e8582ea6f0d7489ba1f0012bea6667f6f90fb210
date: 2026-10-15T18:22:34
diff: .ai/reviews/TASK-001.diff (package-lock.json excluded)

base：`cf9778fb9c9809d45152200537ac4c9af719c082`  
head：`e8582ea6f0d7489ba1f0012bea6667f6f90fb210`

**BLOCKING**

1. **非 ASCII 檔名可繞過 CI 路徑關卡。** [verify.yml:34](D:/ai/projects/Blackjack-wt/task-001/.github/workflows/verify.yml:34)、[verify.yml:65](D:/ai/projects/Blackjack-wt/task-001/.github/workflows/verify.yml:65)：`git diff --name-only` 預設會將中文檔名加上雙引號並跳脫；例如 `src/engine/計點.ts` 的輸出以 `"src/engine/` 開頭，無法符合 `^src/engine/`，會被降為 L2，略過 acceptance 與 Frozen 核對。契約目錄中的中文檔名同樣可漏掉標籤要求。應使用 NUL 分隔的原始路徑逐筆判斷。

2. **驗收差異檢查會漏掉暫存區中的變更。** [check-acceptance-diff.ps1:10](D:/ai/projects/Blackjack-wt/task-001/scripts/check-acceptance-diff.ps1:10)：`git diff $Base` 比較指定 commit 與工作目錄，沒有獨立檢查 index。若先修改並暫存 `src/main.ts`，再只把工作目錄還原成 Base 內容，此命令看不到差異，但下一次 commit 仍會帶入不允許的變更。應另檢查 `git diff --cached $Base`，合併工作目錄及未追蹤檔案結果。

3. **L1 執行範圍不符合 §6.2。** [verify.ps1:49](D:/ai/projects/Blackjack-wt/task-001/scripts/verify.ps1:49)：只判斷 `-Quick`，因此 `-Risk L1` 仍執行 build、e2e，且兩者失敗會讓 L1 失敗。`$Required.L1` 只影響最後的完整性檢查，無法限制實際步驟。build／e2e 應限定於非 Quick 的 L2／L3。

4. **引擎可以透過 `globalThis` 使用 DOM 而通過 lint。** [eslint.config.mjs:18](D:/ai/projects/Blackjack-wt/task-001/eslint.config.mjs:18)：已用 ESLint `lintText` 重現，`globalThis.document.createElement("div")` 與 `globalThis.localStorage.getItem("x")` 均為零診斷，違反 §5。應啟用 `no-restricted-globals` 的 `checkGlobalObject`，並保留允許的 `globalThis.crypto`。

5. **未設定規格要求的 Pages 子路徑。** [vite.config.ts:3](D:/ai/projects/Blackjack-wt/task-001/vite.config.ts:3)、[smoke.spec.ts:5](D:/ai/projects/Blackjack-wt/task-001/tests/e2e/smoke.spec.ts:5)：SPEC §10.4 明列 TASK-001 先設定 `base: '/Blackjack/'`，目前缺少設定，冒煙測試也只訪問 `/`。預設產物會引用 `/assets/...`，部署至 repository Pages 時會找錯資源位置。應同步設定 Vite base 與冒煙測試路徑。

**NON-BLOCKING**

- [TASK-001.diff:1](D:/ai/projects/Blackjack-wt/task-001/.ai/reviews/TASK-001.diff:1) 有編碼損壞，與固定 SHA 產生的 diff 不一致，包括 `Frozen：` 正規表示式。本次已以指定 commits 與乾淨的 tracked files 核對；建議重新以 UTF-8 匯出審查附件。

**TEST GAPS**

- [settings.json:29](D:/ai/projects/Blackjack-wt/task-001/.claude/settings.json:29)：hook 將執行參數放在獨立 `args` 欄位。現有資料不足以確認使用中的 Claude 版本會採用此欄位；直接餵 JSON 給腳本不能證明設定能啟動 hook。需補一次由實際 Stop 事件觸發的整合驗證。
- [verify.log:1](D:/ai/projects/Blackjack-wt/task-001/.ai/metrics/verify.log:1)：有 L2 PASS、L3 FAIL 與 Quick PASS，但沒有 commit SHA、L3 錯誤文字或 hook 的退出碼；最後三筆 Quick FAIL 也沒有失敗原因。因此尚不能確認 AC7、AC9、AC10。
- 本次唯讀執行 typecheck、lint 均 exit 0；另完成記憶體中的 ESLint 探測。未重跑會寫入產物或紀錄的完整 verify、build、e2e。

**NO ISSUE**

- bootstrap 無 trace、超過 10 個 Allowed Files 均屬已註明例外；固定 diff 未超出允許範圍。
- 七個直接相依的宣告及本機安裝版本均符合 §6.1；Vitest／Playwright 收檔範圍不重疊。
- 除上述檔名解析問題，CI 的觸發 types、唯讀權限、job 依賴與標籤／Frozen 分離符合規格；未發現直接將 PR 輸入插入 shell 程式碼的注入問題。三處 L3 路徑清單一致。
- Quick 與 L2／L3 的必要步驟失敗處理符合要求。Stop 腳本限定 `task/*`，正常計數器流程為兩次 exit 2、第三次 exit 0，不會持續阻擋。
- 三項刻意偏離合理：增加 PowerShell deny、限制 UI 引擎匯入、增加 `-Base` 並移除 golden 範圍；但 `-Base` 尚未補足上述 index 漏檢。

全程未修改檔案。

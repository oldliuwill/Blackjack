# TASK-007 審查 r1：Fable（`diff-reviewer`，呼叫時帶 `model: fable`、`effort: high`）

- base：`4676c8e66f4eff2fab8cf94e44139a314a519ece`（main，TASK-006 合併後；也是 `git merge-base main HEAD`）
- head：`cd45284acde78039fb4b15f1cc5b6dbca83d9ab1`（實作）
- date：2026-10-22
- diff：`.ai/reviews/TASK-007.diff`（67 行，git-ignore，由協調者用 `git diff --output` 產生；兩個檔案：`pages.yml` 新增 51 行、`README.md` 加連結）
- reviewer：`claude-fable-5-1`，effort `high`（transcript 的 `message.model`、`effort`；工具：Read、Grep、Glob、SubagentHandback）
- 給審查者的材料：卡、diff、SPEC 的行號（§6.1、§6.3、§8.1 第 2 點、§8.3、§10 第 4 點）、研究筆記 Pages 段落的行號、AGENTS.md、卡的 Read First（`verify.yml`、`vite.config.ts`）、`.ai/metrics/TASK-007.checks.txt`；兩位審查者同一份提示、互不看，提示沒有附協調者自己的觀察（第 75 項）
- 子代理 transcript 的用量（`tools/subagent-report.js`）：7 個請求，最大 context 44,766，輸出 13,838 token，21 次工具呼叫，217 秒
- 報告語言：中文

## 審查者的報告（原文）

TASK-007（GitHub Pages 部署）審查
base：4676c8e66f4eff2fab8cf94e44139a314a519ece
head：cd45284acde78039fb4b15f1cc5b6dbca83d9ab1
diff：D:\ai\projects\Blackjack-wt\task-007\.ai\reviews\TASK-007.diff（67 行；新增 `.github/workflows/pages.yml` 51 行、`README.md` +2 行）

## BLOCKING

無。

## NON-BLOCKING

1. D:\ai\projects\Blackjack-wt\task-007\.github\workflows\pages.yml:42｜註解 `# v6.0.0` 宣稱了研究沒有查證的完整版本｜依據：卡 A7-1 要求「`configure-pages` 用研究筆記中的 SHA」；研究 D:\ai\projects\Blackjack-wt\task-007\.ai\research\toolchain.md:247 明寫「其註記為主要版本 `v6`；本次未另查其完整 release」；AGENTS.md 第 11 行「套件版本與規則來源以筆記為準，不憑記憶猜」｜重現：比對 pages.yml:42 的註解與 toolchain.md:239、247——SHA `45bfe0192ca1faeb007ade9deae92b16b8254a0d` 與研究一致（A7-1 成立），但 `v6.0.0` 這個 patch 號在研究裡不存在。Dependabot／人工更新常依此註解判斷目前版本，寫一個未核實的值會誤導後續升版；改成研究的寫法（`# v6`）或補研究即可。

2. D:\ai\projects\Blackjack-wt\task-007\.github\workflows\pages.yml:16-19 與 27-45｜`pages: write`、`id-token: write` 設在 workflow 層，`build` job 也拿到它們；而 `build` 是唯一執行第三方程式碼（`npm ci` 的 lifecycle scripts、`vite build` 的 plugin）的 job｜依據：卡 A7-1 的字面要求（workflow 權限只有這三項）已滿足，研究 toolchain.md:216-219 與官方範例也是 workflow 層，所以不列 BLOCKING；但 SPEC §6.3 與 AGENTS.md 第 43 行的精神是最小權限｜推導：`build` 只需要 `contents: read`（checkout）與 `pages: read`（`configure-pages` 預設 `enablement: false` 只 GET Pages 設定）；artifact 上傳用 runtime token，不走 GITHUB_TOKEN 權限。`id-token: write` 與 `pages: write` 只有 `deploy` 需要。把這兩項下放到 `deploy` job 的 `permissions`、`build` 只留 `contents: read` + `pages: read`，可讓被污染的相依在 build 階段拿不到 OIDC token 與 Pages 寫入權。供下一輪或後續卡考慮；不要求本卡修正。

3. D:\ai\projects\Blackjack-wt\task-007\.github\workflows\pages.yml:21-24｜`cancel-in-progress: true` 會連「已核准、`deploy-pages` 執行中」的 run 一起取消，不只取消等核准的 run｜依據：與研究 toolchain.md:221-223（抄自 Vite 範例）一致，所以不是違規；但 GitHub 官方 Pages starter 用 `cancel-in-progress: false`，理由正是不要打斷進行中的正式部署｜重現：核准 run A 後、A 的 `deploy-pages` 還在跑時再 push 一個 commit 到 `main`，A 被取消（`deploy-pages` 的 post step 會取消該 deployment），站台維持上一版，接著要再核准 run B。結果安全（不會留下半套部署），只是核准者要知道這個行為；建議寫進試行紀錄。

## TEST GAPS

1. A7-2 完全依賴 repo 設定，workflow 本身沒有 fail-safe｜D:\ai\projects\Blackjack-wt\task-007\.github\workflows\pages.yml:52-53｜`environment: github-pages` 只有在人已把該 environment 的 Required reviewers 設好時才會停下來等核准。若合併前漏做（或 environment 還不存在、由第一次 run 自動建立），合併 commit 觸發的第一個 run 會直接部署，沒有任何核准。卡第 40-42 行已把這列為「人在合併前完成」，workflow 無法再加保險；請協調者在合併前實際打開 Settings → Environments → github-pages 截圖或記錄 Required reviewers 與 Deployment branches（只允許 `main`）已設好，再按 merge，並記進試行紀錄（DoD 最後一項）。

2. A7-3「圖片在子路徑下都是 200」在 head 這棵樹不可能成立｜D:\ai\projects\Blackjack-wt\task-007\src\ui\render.ts:30、65-73 向 `${BASE_URL}assets/felt.png`、`card-back.png`、`logo.png` 發請求；但 repo 裡沒有 `public/`（Glob `public/**` 無結果；`dist/assets/` 只有 index-*.js 與 index-*.css），TASK-005 尚未合併。e2e（D:\ai\projects\Blackjack-wt\task-007\tests\e2e\smoke.spec.ts:12-13、96-97）明確容忍這三個 404。｜後果：合併後人去驗 A7-3，會看到三個圖片 404，這不是 pages.yml 的錯，但依卡的字面 A7-3 就不通過。請人在記錄時區分：「JS、CSS 200、能玩完一局」在本卡確認；「圖片 200」待 TASK-005 合併後再驗一次（或先確認 `${root}assets/*.png` 之外沒有其他 ≥400 的回應）。

3. workflow 語法與語意在合併前只有間接驗證｜D:\ai\projects\Blackjack-wt\task-007\.ai\metrics\TASK-007.checks.txt:12-13｜本機無 actionlint／YAML parser，只做逐行比對；CI 的 CodeQL「Analyze actions」通過，代表 YAML 可解析且無已知反模式，但 `push` 觸發、environment 等候、artifact → deploy 串接只有合併後第一次 run 才看得到。已是卡的設計（A7-2、A7-3 合併後由人確認），列出供第一次 run 失敗時排查：若 `configure-pages` 失敗 → Settings → Pages Source 未設為 GitHub Actions；若 deploy 直接執行沒停 → 見 TEST GAP 1。

## NO ISSUE

- A7-1 確認成立：pages.yml:16-19 權限恰為 `contents: read`、`pages: write`、`id-token: write`，沒有其他 scope；全檔沒有 `secrets.`；沒有 `${{ }}` 進 `run:`（無 script injection 面）；`actions/checkout@v7.0.1`、`actions/setup-node@v7.1.0`（SPEC §6.3 第 335 行、研究第 82-83 行）、`upload-pages-artifact@v5.0.0`（研究第 84 行）、`deploy-pages@v5.0.1`（研究第 85 行）、`configure-pages@45bfe019…`（研究第 239 行）全部一致。
- 觸發：`on: push: branches: [main]`，比研究範例少了 `workflow_dispatch`，更窄，符合卡 Goal「main 有新 commit 時」與 Non-goals（無預覽環境）。沒有 `pull_request`／`pull_request_target`，fork 不會觸發。
- 拆成 `build` → `deploy` 兩個 job、`environment` 只掛在 `deploy`（pages.yml:47-57）：這是讓「停在部署 job」（A7-2）成立的正確寫法；研究的單一 job 範例會連 build 都卡在核准前。`needs: build`、`id: deployment` 與 `url: ${{ steps.deployment.outputs.page_url }}` 名稱對應正確；`deploy` 不 checkout、不裝相依。
- `base` 與 artifact：vite.config.ts:5 `base: '/Blackjack/'`（SPEC §10 第 4 點）；vite 未覆寫 `outDir`，預設 `dist`，與 `upload-pages-artifact` 的 `path: dist` 一致；UI 的執行期 URL 走 `import.meta.env.BASE_URL`（render.ts:30），HTML／CSS 內的引用由 Vite 重寫；e2e 已在 `vite preview` 的 `/Blackjack/` 下跑過（playwright.config.ts:5）。
- `persist-credentials: false`、`timeout-minutes`、`cache: npm`（有 package-lock.json）與 verify.yml 寫法一致；`node-version: '24'` 追蹤分支，與 verify.yml:132 及研究第 247 行的說明一致。核准等待時間不計入 `timeout-minutes`（job 尚未開始）。
- concurrency group `pages` 與 verify 的 `verify-<PR>` 不衝突。
- Non-goals 遵守：沒有自訂網域、沒有預覽環境、部署 workflow 不重跑 verify。
- Allowed Files／Forbidden Changes：diff 只動 `.github/workflows/pages.yml`（新檔）與 `README.md`；verify.yml、CODEOWNERS、src/**、tests/**、package.json、package-lock.json、任務卡、規格、tests/acceptance/ 都未觸碰。無新增相依。
- 驗證關卡未被削弱：verify.ps1、Stop hook、lint、verify.yml 的觸發與權限都沒變；checks.txt 顯示 head cd45284 的 verify 乾淨樹 PASS（typecheck+lint+unit+build+e2e+acceptance），CI classify L3、contract（Frozen d95af4f 未動）、verify、dependency-review、CodeQL 均通過。
- Risk L3 正確（`.github/**`）；本卡沒有公開 API、型別或數值變動。
- 卡的 Goal 字面上是每個 `main` commit 都建置並等核准，包含 HANDOFF 等純文件 commit；這符合卡，只是核准者會常看到待核准的 run，`cancel-in-progress` 會讓只剩最新一個。
- README.md:3 的連結與 SPEC §10 第 4 點的網址一致。

## 協調者重現與兩邊比較（2026-10-22）

兩位審查者的 BLOCKING 都是 0，沒有需要重現的 BLOCKING，所以沒有修正輪、head 不變。NON-BLOCKING 與 TEST GAPS 我逐項處理如下（兩份紀錄附同一段）：

| 項目 | 來源 | 重現／核對 | 處理 |
| --- | --- | --- | --- |
| `build` job 繼承 workflow 層的 `pages: write`、`id-token: write`；`build` 是唯一跑第三方程式碼（`npm ci`、`vite build`）的 job | Opus NB1、Fable NB2 | 推導成立：workflow 層的 `permissions` 套用到沒有自己 `permissions` 的 job。能不能因此繞過 `github-pages` environment 的核准，兩位都說離線無法確認，我也沒有查證 Pages 部署 API 是否檢查 environment。A7-1 字面成立，寫法與研究 `toolchain.md:216-219` 和官方範例相同。Fable 推導 `build` 只需 `contents: read` 加 `pages: read`（`configure-pages` 只讀 Pages 設定），我沒有查證 | 不改（改了 head 要重審；卡的 A7-1 與研究都是 workflow 層）。記進試行紀錄；建議後續把 A7-1 改成「`build` 只有讀取權限，`pages: write`、`id-token: write` 只在 `deploy`」。人逐項核對時可以決定現在要不要改 |
| `cancel-in-progress: true` 會連「已核准、`deploy-pages` 執行中」的 run 一起取消 | Opus NB2、Fable NB3 | 推導成立；與研究 `toolchain.md:221-223`（Vite 範例）一致，GitHub 官方 starter 用 `false`。行為：核准 run A 後、A 的 deploy 還在跑時再 push，A 被取消、站台留在上一版、run B 要再核准 | 不改；記進試行紀錄（核准者要知道這個行為） |
| `# v6.0.0` 註解宣稱研究沒查證的完整版本 | Opus NB3、Fable NB1 | 核對：`gh api repos/actions/configure-pages/git/matching-refs/tags/v` 的 `refs/tags/v6` 與 `refs/tags/v6.0.0` 都指向 `45bfe0192ca1faeb007ade9deae92b16b8254a0d`（commit「Merge pull request #186 … upgrade to node 24」，2026-03-24）。註解是真的，只是研究沒記 patch 號、審查者看不到我的核對。`upload-pages-artifact` 的 `v5.0.0` 與 `deploy-pages` 的 `v5.0.1` tag 也查過存在 | 不改 |
| 沒有 `workflow_dispatch`（研究範例有） | Opus NB4 | 成立：第一次 run 失敗時，用 Actions 頁的 Re-run jobs（用原 commit）或再 push `main`。卡沒有要求 | 不改；記進試行紀錄 |
| job `timeout-minutes: 10` 與 `deploy-pages` 自己的逾時相同 | Opus NB5 | 未重現（`deploy-pages` 的預設逾時是審查者的說法，我沒有查） | 不改 |
| A7-2 完全靠 repo 設定，workflow 本身沒有 fail-safe：environment 沒設好，合併後第一個 run 會直接部署 | Fable TG1、Opus TG | 成立：開 PR 時 `gh api .../pages` 回 404、`environments` 為空 | 合併前用 API 核對 Pages Source 與 environment 的 Required reviewers、Deployment branches（只允許 `main`）才合併；API 讀不到就以人的截圖為準 |
| A7-3「圖片 200」在目前這棵樹不可能成立 | Fable TG2 | **重現成立**：`public/` 不存在；`dist/assets/` 只有 `index-*.js`、`index-*.css`；`render.ts:30、65–66、73` 請求 `${BASE_URL}assets/felt.png`、`card-back.png`、`logo.png`；`tests/e2e/smoke.spec.ts:13、96–97` 容忍這三個 404（U8：還沒加不算錯）。Opus 看了 `render.ts:30` 沒發現 | 不是 `pages.yml` 的缺陷，是卡的 A7-3 期望在 TASK-005 之前不可能成立。人確認 A7-3 時：「JS、CSS 200、能玩完一局」是本卡的判準；三張裝飾圖 404 是預期，TASK-005 合併後再驗一次。交規劃 session 在卡或 SPEC 1.2 註明（協調者不改卡） |
| workflow 在合併前只有間接驗證（本機沒有 actionlint 與 YAML parser；只在 push `main` 觸發，PR 的 CI 看不到） | Fable TG3、Opus TG | 成立：`TASK-007.checks.txt` 已寫明；CodeQL `Analyze (actions)` 通過 | 合併 commit 就是第一次 run：A7-2 確認時一併記 `build` 成功、artifact `github-pages` 已上傳、`deploy` 顯示 Waiting |

**兩邊比較**：兩位的結論一致（BLOCKING 0，A7-1 成立，Allowed Files、Forbidden Changes、Non-goals 都沒違反）。這次沒有給任何協調者的觀察，所以重疊算獨立發現：兩邊都提了 workflow 層權限、`cancel-in-progress: true`、`# v6.0.0` 註解三項。各自獨有的：Opus 是沒有 `workflow_dispatch`、逾時與 `deploy-pages` 相同；Fable 是 A7-3 的圖片 404（唯一影響卡的驗收期望、也是唯一需要動手重現的一項）、A7-2 沒有 fail-safe 的明確提醒、第一次 run 失敗時的排查路徑。實質的差距在 Fable 的 TG2：Opus 讀了同一行 `render.ts:30` 卻判斷「預期會在子路徑下解析」，沒有去看檔案存不存在。用量：Opus 9 個請求、最大 context 34,255、77 秒；Fable 7 個請求、最大 context 44,766、217 秒、輸出 13,838 token（`subagent-report.js` 給 Opus 的輸出數 677 明顯偏低，最終報告就有 8,505 字元，可能又是第 65 項的計數問題，這次沒有另外查）。語言：Opus 以英文回報、Fable 以中文，定義檔沒有指定。

審查的 head 是 `cd45284`；之後的 commit 只有 `.ai/reviews/` 的變更（本審查紀錄）。


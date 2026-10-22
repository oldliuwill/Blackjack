# TASK-007 審查 r1：Opus（`diff-reviewer`，定義檔的 Opus、effort medium）

- base：`4676c8e66f4eff2fab8cf94e44139a314a519ece`（main，TASK-006 合併後；也是 `git merge-base main HEAD`）
- head：`cd45284acde78039fb4b15f1cc5b6dbca83d9ab1`（實作）
- date：2026-10-22
- diff：`.ai/reviews/TASK-007.diff`（67 行，git-ignore，由協調者用 `git diff --output` 產生；兩個檔案：`pages.yml` 新增 51 行、`README.md` 加連結）
- reviewer：`claude-opus-5-5`，effort `medium`（transcript 的 `message.model`、`effort`；工具：Read、Grep、Glob、SubagentHandback）
- 給審查者的材料：卡、diff、SPEC 的行號（§6.1、§6.3、§8.1 第 2 點、§8.3、§10 第 4 點）、研究筆記 Pages 段落的行號、AGENTS.md、卡的 Read First（`verify.yml`、`vite.config.ts`）、`.ai/metrics/TASK-007.checks.txt`；兩位審查者同一份提示、互不看，提示沒有附協調者自己的觀察（第 75 項）
- 子代理 transcript 的用量（`tools/subagent-report.js`）：9 個請求，最大 context 34,255，輸出 677 token（偏低，見末尾），15 次工具呼叫，77 秒
- 報告語言：英文

## 審查者的報告（原文）

Base: 4676c8e66f4eff2fab8cf94e44139a314a519ece
Head: cd45284acde78039fb4b15f1cc5b6dbca83d9ab1
Diff: D:\ai\projects\Blackjack-wt\task-007\.ai\reviews\TASK-007.diff (67 lines, 2 files). It is small enough that no card split is needed.

I found no blocking problems. A7-1 holds as written. The workflow is written so that A7-2 and A7-3 can hold, as long as the human does the pre-merge setup the card lists. My main reservation is that the build job gets more permissions than it needs (NON-BLOCKING 1).

## BLOCKING
None.

## NON-BLOCKING

**1. .github/workflows/pages.yml:16-19, 27-45｜The build job has deploy permissions it does not need.**
- **Problem:** `pages: write` and `id-token: write` are set at workflow level, so the `build` job gets them too. That job runs `npm ci` (dependency lifecycle scripts) and `npm run build` (Vite plugins), and it has no environment approval. Only `deploy` needs those two permissions. A compromised dependency in `build` could therefore read `ACTIONS_ID_TOKEN_REQUEST_TOKEN`/`URL` and the GITHUB_TOKEN, which has pages:write, before any human approval.
- **What I could not confirm:** whether a token minted outside the `github-pages` environment can call the Pages deployments API and get around D19's required reviewers. I can't verify this offline, and the research notes don't cover it. So I'm not saying this bypass exists.
- **Basis:** Card A7-1 only says the workflow's permissions are limited to these three, and this is the same as the research example (toolchain.md:216-219) and the official example. So it does not violate the card. On card item 8, though, the risk is underestimated: D19's gate assumes only the approved job can deploy.
- **Reproduction (derivation):** In GitHub Actions, workflow-level `permissions:` applies to every job without its own `permissions:`. Lines 27-45 have none, so `build` gets `id-token: write` and `pages: write`, and any `postinstall` during `npm ci` can read both tokens from its environment.
- **Suggestion (not a patch):** consider job-level permissions: `build` gets only `contents: read`; `deploy` gets `pages: write` and `id-token: write`.

**2. .github/workflows/pages.yml:21-24｜`cancel-in-progress: true` can also cancel a deploy that is running.**
- The research example (toolchain.md:221-223, from Vite) uses `true`. GitHub's official Pages starter uses `false` so that a running deployment is never interrupted.
- The comment only describes the intended case: superseding a run that is still waiting for approval. It does not cover what happens when an approved `deploy-pages` is mid-run and a newer push cancels it.
- Pages normally keeps the previous successful version, so I don't count this as a correctness problem. But the trial record should note the expected behaviour.
- **Reproduction:** approve run N's deploy. While deploy-pages is polling, push commit N+1. Run N's deploy job is cancelled. Then run N+1's deploy also waits for approval, so the site stays on the version before N until a second approval.

**3. .github/workflows/pages.yml:42｜The `# v6.0.0` comment claims more than the research does.**
- The SHA `45bfe0192ca1faeb007ade9deae92b16b8254a0d` matches the research exactly (toolchain.md:239), so A7-1 holds.
- But toolchain.md:247 explicitly says the SHA "註記為主要版本 `v6`；本次未另查其完整 release". The comment presents an unverified patch version (6.0.0) as fact.
- **Reproduction:** compare line 42 with toolchain.md:247.

**4. .github/workflows/pages.yml:12-14｜There is no `workflow_dispatch`, unlike the research example (toolchain.md:214).**
- The card doesn't require it, so this is not a violation.
- Effect: if the first run after merge fails because Settings → Pages → Source was not switched yet, or the environment is not set up, the only fixes are "Re-run jobs" in the UI (which uses the original commit and works) or another push to `main`.
- It also means a redeploy always needs a new commit. The coordinator should know this before A7-2/A7-3.

**5. .github/workflows/pages.yml:50｜The job timeout of 10 minutes equals deploy-pages' own default timeout (600000 ms).**
- Time waiting for approval does not count toward the job timeout, so A7-2 is not affected.
- But if the Pages backend is slow, the job timeout and the action's timeout hit at about the same moment, and the failure message may not be the clearer one from the action.
- Minor.

## TEST GAPS
- **The workflow has never run anywhere** (checks.txt:12). There is no actionlint or YAML parse. The only check was a line-by-line comparison with the research. CI passing at head says nothing about pages.yml, because it only triggers on push to `main`.
  - The first real run will be the merge commit itself.
  - If the YAML or the configure-pages SHA is wrong, the failure only shows after merge.
  - Suggestion: when the human checks A7-2, also record that the `build` job succeeded, that the artifact `github-pages` was uploaded, and that `deploy` shows "Waiting for review".
- **A7-2 depends on settings that are not in the repo:** `github-pages` → Required reviewers, and Deployment branches limited to `main`.
  - If they are not set before the merge, `deploy` will not stop and will deploy straight away. A7-2 then fails, and the D19 gate never existed for that run.
  - Nothing in the workflow can enforce this, so it has to be checked by hand before merging.
- **A7-3 sub-path resources:**
  - I spot-checked `src/ui/render.ts:30`. Images are built with `${import.meta.env.BASE_URL}assets/`, and `/src/main.ts` in `index.html` is rewritten by Vite. Together with `base: '/Blackjack/'` (vite.config.ts:5), I expect them to resolve under the sub-path.
  - Local e2e runs against `vite preview` with the same base, which partly covers this. But the real Pages environment (case sensitivity, 404 handling) can only be confirmed by a person after deployment.
- **Untested:** the research flagged the `upload-pages-artifact` Windows branch as unverified (toolchain.md:36, 97). This card uses ubuntu-latest (card line 38), which avoids that risk.

## NO ISSUE
- **A7-1:**
  - Permissions are exactly `contents: read`, `pages: write`, `id-token: write` (pages.yml:16-19).
  - No `secrets.*` and no `env` secrets.
  - `upload-pages-artifact@v5.0.0` (l.43) and `deploy-pages@v5.0.1` (l.57) match toolchain.md:84-85.
  - The `configure-pages` SHA (l.42) is identical to toolchain.md:239.
  - `checkout@v7.0.1` and `setup-node@v7.1.0` match toolchain.md:82-83 and verify.yml:25/130.
- **Triggers:** only `push` to `main` (l.12-14). No `pull_request_target`, no fork paths, and it matches the environment rule that deployment branches are `main` only.
- **Credentials:** `persist-credentials: false` (l.34) matches verify.yml.
- **Environment:** `deploy` uses `environment: github-pages` with `url: steps.deployment.outputs.page_url`, and the step `id: deployment` matches (l.52-57). `needs: build` is correct.
- **Artifact path and base:**
  - `path: dist` (l.45) is Vite's default outDir. vite.config.ts does not override it.
  - The `build` script is `vite build` (package.json:12).
  - `base: '/Blackjack/'` matches SPEC §10 point 4 (line 500) and the README link.
- **Node:** `node-version: '24'` is within `engines` `>=24 <25` (SPEC §6.1).
- **ubuntu-latest:** the build job uses it as the card asks (line 38). verify.yml is untouched and stays on windows-latest.
- **Allowed Files:**
  - The only changes are `.github/workflows/pages.yml` and `README.md`.
  - Forbidden Changes untouched: verify.yml, CODEOWNERS, `src/**`, `tests/**`, package.json, package-lock.json.
  - The card, spec and `tests/acceptance/` are not changed.
  - No new dependencies.
- **Non-goals:** there is no custom domain, no preview environment, and verification is not re-run in the deploy workflow.
- **Verification gates not weakened:** verify.yml, verify.ps1, lint, Stop hook and CI triggers are all untouched. Local `verify.ps1 -Risk L3` at head cd45284 is PASS. tsc and eslint exit 0 (checks.txt:2-8).
- **Frozen:** the card's `Frozen：d95af4f…` line is in a format the contract job can read (SPEC §8.3, line 407).
- **README.md:** only adds the game link and fixes the missing final newline. It is within the Allowed Files.

Files:
- D:\ai\projects\Blackjack-wt\task-007\.github\workflows\pages.yml
- D:\ai\projects\Blackjack-wt\task-007\README.md
- D:\ai\projects\Blackjack-wt\task-007\.ai\research\toolchain.md
- D:\ai\projects\Blackjack-wt\task-007\.ai\task-contracts\TASK-007.md
- D:\ai\projects\Blackjack-wt\task-007\src\ui\render.ts

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


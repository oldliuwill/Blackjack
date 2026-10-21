# TASK-007：GitHub Pages 部署

Risk：L3（路徑：`.github/**`）
Spec：docs/specs/SPEC-001.md@7d7fb6b09c003064d3ace76a34561a3a93bf3459 §6、§8.1 第 2 點、§8.3、§10 第 4 點
實作：協調者 session（Sonnet，effort xhigh），比照 bootstrap 例外（SPEC §8.1 第 2 點）：`.github/**` 在 `.claude/settings.json` 的 deny 內，實作者 session 寫不進去

Goal：`main` 有新 commit 時建置並部署到 GitHub Pages；部署 job 需要人在 `github-pages` environment 核准。[D19]

Non-goals：
- 自訂網域
- 預覽環境
- 在部署 workflow 重跑完整驗證（進 `main` 之前，PR 已通過 verify）

Allowed Files：
- `.github/workflows/pages.yml`
- `README.md`（加上遊戲連結）

Read First：
- SPEC-001 §6、§8.3
- `.ai/research/toolchain.md`（Pages 的 base、權限與 workflow 段落）
- `.github/workflows/verify.yml`
- `vite.config.ts`（`base` 已由 TASK-001 設為 `/Blackjack/`）

Research：`.ai/research/toolchain.md`

Forbidden Changes：
- `.github/workflows/verify.yml`、`.github/CODEOWNERS`
- `src/**`、`tests/**`
- `package.json`、`package-lock.json`

Acceptance：
| # | Given / When / Then | 預期值來源 |
| --- | --- | --- |
| A7-1 | workflow 權限只有 `contents: read`、`pages: write`、`id-token: write`；沒有 secrets；Action 版本與工具鏈研究一致：`upload-pages-artifact@v5.0.0`、`deploy-pages@v5.0.1`，`configure-pages` 用研究筆記中的 SHA | 工具鏈研究、D18 |
| A7-2 | 合併後的 workflow 停在部署 job，等人在 environment 核准 | D19 |
| A7-3 | 核准後 `https://oldliuwill.github.io/Blackjack/` 能載入；JS、CSS、圖片在子路徑下都是 200；能玩完一局 | 工具鏈研究「需本機驗證」第 6 點 |

建置 job 用 ubuntu-latest：這是官方範例的路徑；Windows 的改寫版在研究中未經驗證。verify 仍在 windows-latest 跑 [D18]。

人在合併前完成：
- Settings → Pages → Source 設為 GitHub Actions
- Environments → `github-pages` → Required reviewers 設為 repo 擁有者，Deployment branches 只允許 `main`

Frozen：d95af4fcf4c75c4b2ab32f1c9e354056d3897794（TASK-003 的凍結 SHA；本卡沒有新的驗收測試，CI 只核對它沒有被改動，SPEC §8.3）

Verification Contract：A7-1 由審查確認；A7-2、A7-3 合併後由人確認並記錄。

Commands：`pwsh ./scripts/verify.ps1 -Risk L3`

審查：Opus 唯讀子代理（`diff-reviewer`）；觸發式第二審：Fable（CI 與部署權限；用同一份定義檔，呼叫時帶 `model: fable`、`effort: high`）。每個 BLOCKING 附重現，協調者重現後才算。

Stop：最多兩輪修正；同一問題連續兩輪沒有新證據或進展即寫交接、結束 session，由 Opus 從交接檔重來。

Definition of Done：CI 對 head commit 的 classify（L3）、contract、verify、dependency-review、CodeQL 都通過、沒有經協調者重現成立的 BLOCKING、審查的 head 之後只有 `.ai/reviews/` 的變更、A7-3 由人確認、試行紀錄記下部署核准的流程。

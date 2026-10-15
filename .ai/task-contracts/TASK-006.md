# TASK-006：GitHub Pages 部署

Risk：L3（路徑：`.github/**`）
Spec：docs/specs/SPEC-001.md@（審查定稿後填）§6、§8.3、§10 第 3 點
實作：Opus

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
| # | Given / When / Then | 來源 |
| --- | --- | --- |
| A6-1 | workflow 權限只有 `contents: read`、`pages: write`、`id-token: write`；沒有 secrets；Action 版本與工具鏈研究一致：`upload-pages-artifact@v5.0.0`、`deploy-pages@v5.0.1`，`configure-pages` 用研究筆記中的 SHA | 工具鏈研究、D18 |
| A6-2 | 合併後的 workflow 停在部署 job，等人在 environment 核准 | D19 |
| A6-3 | 核准後 `https://oldliuwill.github.io/Blackjack/` 能載入；JS、CSS、圖片在子路徑下都是 200；能玩完一局 | 工具鏈研究「需本機驗證」第 6 點 |

建置 job 用 ubuntu-latest：這是官方範例的路徑；Windows 的改寫版在研究中未經驗證。verify 仍在 windows-latest 跑 [D18]。

人在合併前完成：
- Settings → Pages → Source 設為 GitHub Actions
- Environments → `github-pages` → Required reviewers 設為 repo 擁有者，Deployment branches 只允許 `main`

Frozen：填最近一次凍結的驗收 SHA（TASK-003 的 Frozen）；CI 只核對它沒有被改動（SPEC §8.3）。

Verification Contract：A6-1 由審查確認；A6-2、A6-3 合併後由人確認並記錄。

Commands：`pwsh ./scripts/verify.ps1 -Risk L3`

審查：Codex，`$noWeb`、effort high。

Stop：最多兩輪修正；同一問題連續兩輪沒有新證據或進展就交接。

Definition of Done：CI verify 通過、Codex 審查沒有 BLOCKING、A6-3 確認、試行紀錄記下部署核准的流程。

量測（自動：`.ai/trace`、`verify.log`）：回合數＝ 驗證次數＝ 一次通過＝
量測（手填）：返工分鐘＝ 7 天內缺陷＝ 交接次數＝

# 模組地圖

| 模組 | 入口 | 測試 | 風險 | 備註 |
| --- | --- | --- | --- | --- |
| 規則引擎 | `src/engine/index.ts` | `tests/unit/`、`tests/acceptance/`（凍結） | L3 | 純 TS，不碰 DOM；TASK-002、003 |
| 測試輔助 | `tests/support/` | — | L3 | 固定牌序、注入亂數；不含斷言 |
| UI | `src/ui/` | `tests/unit/`（storage）、`tests/e2e/` | L2 | DOM、輸入、動畫、localStorage；TASK-004 |
| 組裝 | `src/main.ts`、`index.html` | `tests/e2e/` | L2 | |
| 樣式與美術 | `src/style.css`、`public/assets/` | 人看 | L1 | TASK-005 |
| 驗證與 CI | `scripts/verify.ps1`、`.github/workflows/verify.yml` | — | L3 | 本機與 CI 同一支腳本 |

依賴方向：`main.ts` → `ui/` → `engine/index.ts`（不得反向，也不得繞過 index.ts）

避開：`dist/`、`node_modules/`、`test-results/`、`playwright-report/`

不要從讀整個 repo 開始，沿任務的入口走。

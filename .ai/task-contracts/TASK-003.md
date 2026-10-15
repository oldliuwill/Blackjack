# TASK-003：牌局流程、動作與結算

Risk：L3（路徑：`src/engine/**`；公開 API、數值計算）
Spec：docs/specs/SPEC-001.md@（審查定稿後填）§3.3–§3.7、§4.4、§4.6

Goal：照 SPEC §4.4 實作 `createGame` 與 `Game`：下注、發牌、peek、玩家動作、莊家補牌、結算、重洗與重設資金，並從 `src/engine/index.ts` 匯出。

Non-goals：
- UI 與 localStorage（TASK-004）
- 保險、投降、再分牌、H17（SPEC §2）

Allowed Files：
- `src/engine/game.ts`
- `src/engine/settle.ts`（選用：結算與賠付）
- `src/engine/index.ts`
- `tests/unit/engine/game.test.ts`

Read First：
- SPEC-001 §3、§4（特別是 §4.4 的錯誤碼表、「失敗不留痕跡」與「快照獨立」）
- `src/engine/types.ts`、`src/engine/cards.ts`、`src/engine/shoe.ts`、`src/engine/errors.ts`、`src/engine/rules.ts`
- `tests/support/cards.ts`

Research：`.ai/research/blackjack-rules.md`（R3–R10；驗收情境表）

Forbidden Changes：
- TASK-002 的檔案：`types.ts`、`cards.ts`、`shoe.ts`、`errors.ts`、`rules.ts`。需要改動就表示 SPEC 要改，停下回報
- `tests/acceptance/**`、`tests/support/**`、`docs/specs/**`、`.ai/task-contracts/**`
- `package.json`、`package-lock.json`

Acceptance：SPEC §9.3 的 S1–S16（含追加斷言）與 B1–B14，預期值來源見該節。

Frozen：（Codex 寫完、人抽查核准後填）

Verification Contract：
- Unit：狀態轉換與可用動作的判斷
- Acceptance：凍結的 S1–S16、B1–B14
- Build、E2E：沿用既有關卡

Commands：`pwsh ./scripts/verify.ps1 -Risk L3`

開工前由協調者準備（SPEC §8.1）：Codex 寫 `tests/acceptance/`；Claude 唯讀子代理反向審；人抽查後凍結並填 Frozen；建 worktree `D:\ai\projects\Blackjack-wt\task-003`。

Stop：最多兩輪修正；同一問題連續兩輪沒有新證據或進展就交接。發現 SPEC 有矛盾或缺漏時停下回報，不要自行解讀。

Definition of Done：CI 對 head commit 的 verify 通過、Codex 審查沒有 BLOCKING、審查檔的 head SHA 等於 PR head。

量測（自動：`.ai/trace`、`verify.log`）：回合數＝ 驗證次數＝ 一次通過＝
量測（手填）：返工分鐘＝ 7 天內缺陷＝ 交接次數＝

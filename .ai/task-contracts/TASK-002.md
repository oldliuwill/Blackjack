# TASK-002：牌、牌靴與計點

Risk：L3（路徑：`src/engine/**`；公開 API）
Spec：docs/specs/SPEC-001.md@（審查定稿後填）§3.1–§3.2、§4.1–§4.3、§4.5、§5

Goal：照 SPEC §4.1–§4.3、§4.5 實作型別、常數、錯誤類別、`Shoe`、`cryptoRandom`、`handValue`、`isBlackjack`，並從 `src/engine/index.ts` 匯出。

Non-goals：
- `createGame` 與牌局流程（TASK-003）
- UI

Allowed Files：
- `src/engine/types.ts`：寫入 SPEC §4.1 的全部型別，包括牌局用的型別，讓 TASK-003 不必再改這個檔案
- `src/engine/rules.ts`、`src/engine/errors.ts`、`src/engine/cards.ts`、`src/engine/shoe.ts`、`src/engine/index.ts`
- `tests/unit/engine/cards.test.ts`、`tests/unit/engine/shoe.test.ts`
- `tests/unit/bootstrap.test.ts`（刪除）

Read First：
- SPEC-001 §3.1–§3.2、§4、§5
- `tests/support/cards.ts`
- `tests/acceptance/`（已凍結，只讀）

Research：`.ai/research/blackjack-rules.md`（R1、R2、R3、R5）

Forbidden Changes：
- `tests/acceptance/**`、`tests/support/**`、`docs/specs/**`、`.ai/task-contracts/**`
- `package.json`、`package-lock.json`
- 公開匯出不得多於或少於 SPEC §4 列出的項目（`createGame`、`Game`、`GameOptions` 由 TASK-003 加入）

Acceptance：SPEC §9.2 的 C1–C5，預期值來源見該節。

Frozen：（Codex 寫完、人抽查核准後填）

Verification Contract：
- Unit：G2 的洗牌演算法（用確定性 `random` 驗證交換順序）、`cryptoRandom` 回傳值落在 `[0, 1)`
- Acceptance：凍結的 C1–C5
- Build、E2E：沿用既有關卡

Commands：`pwsh ./scripts/verify.ps1 -Risk L3`

開工前由協調者準備（SPEC §8.1）：
1. 寫 `tests/support/cards.ts`（`cards()`、`stackedShoe()`，SPEC §9.1），交 Codex 審
2. Codex 寫 `tests/acceptance/`，Claude 唯讀子代理反向審，人抽查後凍結並填 Frozen
3. 建 worktree `D:\ai\projects\Blackjack-wt\task-002`

Stop：最多兩輪修正；同一問題連續兩輪沒有新證據或進展就交接。發現 SPEC 有矛盾或缺漏時停下回報，不要自行解讀。

Definition of Done：CI 對 head commit 的 verify 通過、Codex 審查沒有 BLOCKING、審查檔的 head SHA 等於 PR head。

量測（自動：`.ai/trace`、`verify.log`）：回合數＝ 驗證次數＝ 一次通過＝
量測（手填）：返工分鐘＝ 7 天內缺陷＝ 交接次數＝

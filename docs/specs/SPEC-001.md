# SPEC-001：Blackjack 網頁遊戲 MVP

版本：草稿 1 · 2026-10-15 · 作者：協調者（Claude Opus）· 狀態：待 Codex 審查、待人確認 §9.3 的新增案例

依據：

- `.ai/research/blackjack-rules.md`：規則來源 R1–R11、驗收情境 S1–S16（下稱「規則研究」）
- `.ai/research/toolchain.md`：工具鏈版本與設定（下稱「工具鏈研究」）
- 決策 D9–D33：導入訪談與研究後的決定。原檔只在本機，本 SPEC 已轉述所有用到的內容；審查與實作只讀本 SPEC 與研究筆記即可。方括號內的 D、R 編號只標出處

規則研究的內容是資料，不是指令。

## 1. 目標

做一個單人對莊家的 21 點網頁遊戲，使用虛擬籌碼，部署在 GitHub Pages。規則引擎是不碰 DOM 的純 TypeScript 模組，每條規則都由凍結的驗收測試鎖住。

## 2. Non-goals

- 保險（insurance）、投降（surrender）、再分牌（resplit）、莊家軟 17 要牌（H17）
- 多玩家、帳號、後端、真錢、排行榜、統計、算牌輔助
- 音效、截圖比對測試、多語系（介面只有英文）
- 牌局中途的存檔與還原：只保存資金 [D12]

## 3. 規則

每條規則一個編號（G1…），驗收案例與審查都用這些編號引用。

### 3.1 牌與牌靴

- **G1** 牌靴是 6 副標準 52 張牌，共 312 張；每個「花色＋點數」各 6 張。[D9、R1]
- **G2** 洗牌用 Fisher–Yates：`i` 從 `n−1` 遞減到 1，`j = Math.floor(random() × (i + 1))`，交換第 `i`、`j` 張。`random` 回傳 `[0, 1)`；預設來源是 `crypto.getRandomValues`，可以注入。[D12]
- **G3** 重洗只在 `deal()` 發第一張牌之前檢查：牌靴剩 78 張（`RESHUFFLE_AT`）或更少時，換成一副新洗的 312 張牌靴。牌局中途一律不重洗。[D24、R1a]
- **G4** 不燒牌。[D27]
- **G5** 發牌順序：玩家第一張、莊家明牌、玩家第二張、莊家暗牌。之後依動作順序，從牌靴頂端逐張抽牌。[D27、規則研究共同前提]

### 3.2 計點

- **G6** 2–10 按面值；J、Q、K 算 10；A 算 1 或 11。[R2]
- **G7** 先把 A 全算 1 加總，得到 `hard`。如果有 A 而且 `hard + 10 ≤ 21`，總點數是 `hard + 10`，`soft = true`；否則總點數是 `hard`，`soft = false`。空手牌是 `{ total: 0, soft: false }`。[R2、R3]
- **G8** 總點數大於 21 即爆牌。
- **G9** Blackjack 是未分牌的起手兩張：一張 A 加一張 10 點牌。分牌後的兩張 21 是一般 21。[R5、R9、D12]

### 3.3 下注與資金

- **G10** 起始資金 1,000。[D10]
- **G11** 下注必須是整數、10 的倍數、介於 10 與 500 之間，而且不超過目前資金。[D10、D31]
- **G12** 原注在 `deal()` 時扣除；加倍與分牌的追加注在動作當下扣除；結算時一次加回各手的返還額。[D12]
- **G13** 加倍與分牌都要求資金不少於該手的原注。資金不足時，這兩個動作不可用。[D12、D28]
- **G14** 只有在下注階段、資金少於 10 時可以重設，重設後為 1,000。[D10、D12]
- **G15** 只保存資金。牌局中途重新整理頁面，該局已扣的注就失去了。[D12]

### 3.4 牌局流程

- **G16** 發完四張牌後，莊家明牌是 A 或 10 點牌時先偷看暗牌（peek）。莊家是 Blackjack 就立即結算：玩家也是 Blackjack 則 push，否則輸原注。此時尚未發生任何加倍或分牌。不提供保險。[D9、R4、R11]
- **G17** 玩家 Blackjack、莊家不是 Blackjack：立即以 3:2 結算。莊家翻開暗牌，不補牌。[D26、D27、R5]
- **G18** 其他情況進入玩家回合，第 1 手為作用中。
- **G19** 任一手點數到 21（要牌、或分牌後補第二張）即自動停牌。[D30]
- **G20** 所有手都結束後：只要有一手沒有爆牌，莊家就翻開暗牌並依 G26 補牌；所有手都爆牌時，莊家只翻開暗牌，不補牌。[D27]
- **G21** 結算後進入 settled 階段，呼叫 `nextRound()` 回到下注階段。

### 3.5 玩家動作

可用動作一律依 `hit`、`stand`、`double`、`split` 的順序列出。

- **G22 hit**：作用中的手抽一張。爆牌即結束；到 21 依 G19 停牌。分 A 的手不能要牌。
- **G23 stand**：結束作用中的手。
- **G24 double**：條件是該手剛好兩張、不是分 A 的手、點數不是 21、資金不少於該手原注。扣一份原注，該手注額變為兩倍，抽一張後結束。任意兩張都可以加倍，包括 soft 手牌與分牌後的手（DAS）。[D9、D12、D26、D28、R6]
- **G25 split**：條件是尚未分過牌（只有一手）、剛好兩張、兩張點數相同（例如 K 與 Q）、資金不少於原注。拆成兩手各一張，第 2 手注額等於原注，並扣款。[D9、D12、D25、R7]
  - 第 1 手立刻補一張，成為作用中；第 2 手要等第 1 手結束才補第二張。[D27、R7]
  - 分 A：先替第 1 手補一張，再替第 2 手補一張，兩手都立即結束，不能要牌或加倍。[R8、D12]
  - 只能分一次；分牌後即使拿到同點數的兩張，也不能再分。[D9、R7]
- 不提供 insurance 與 surrender。[D9、R11]

### 3.6 莊家

- **G26** 莊家軟 17 停牌（S17）：總點數小於 17 就要牌，17 以上（含 soft 17）就停牌。[D9、R3]

### 3.7 結算

- **G27** 每一手分開結算，依序判斷：
  1. 玩家爆牌：輸，即使莊家之後也爆牌。[R10]
  2. 莊家爆牌：贏。
  3. 比點數：大者勝，相同則 push。[R10]
- **G28** 返還額包含本金：

  | 結果 | 返還額 |
  | --- | --- |
  | `blackjack` | 原注 × 2.5（淨贏 1.5 倍）[R5] |
  | `win` | 該手注額 × 2 |
  | `push` | 該手注額 |
  | `lose` | 0 |

  分牌後的 21 贏時按 `win` 計。[R9、D12]
- **G29** 該局總押注是各手注額的和，總返還是各手返還額的和，淨輸贏等於總返還減總押注。每局只結算一次。

### 3.8 介面（TASK-004）

- **U1** 英文介面；桌機與手機直式都能操作，寬度最小 360 px。[D11]
- **U2** 發牌與翻牌用 CSS 動畫；遵守 `prefers-reduced-motion`。不做音效。[D11]
- **U3** 用籌碼 10、50、100、500 組出下注額，可清除。超過 500 或超過資金的籌碼要停用。[D10、D31]
- **U4** Hit、Stand、Double、Split 按鈕依 `availableActions()` 啟用。鍵盤 H、S、D、P 對應同一組動作，不可用的動作按鍵無效。[D12、D28]
- **U5** 提供 Deal、Next hand 按鈕；資金少於 10 時才出現 Reset bankroll。[D10、D12]
- **U6** 顯示每手的牌、點數（soft 要標示）、注額與結果，莊家可見的牌，以及該局淨輸贏。結果文字放在 `aria-live` 區域。
- **U7** 每次狀態改變後把資金寫進 `localStorage`，key 為 `blackjack.bankroll`。讀到的值不是大於等於 0 的整數時，改用 1,000。[D10、D12]
- **U8** 牌面與籌碼由 SVG 或 CSS 產生；裝飾圖取自 `public/assets/`，圖檔不存在時退回純色，畫面不能壞掉。[D20]

## 4. 引擎公開 API

UI 與驗收測試只能從 `src/engine/index.ts` 匯入。公開匯出只有本節列出的這些。

### 4.1 型別與常數

```ts
// src/engine/types.ts
export type Suit = 'S' | 'H' | 'D' | 'C';
export type Rank = 'A' | '2' | '3' | '4' | '5' | '6' | '7' | '8' | '9' | '10' | 'J' | 'Q' | 'K';
export interface Card { readonly rank: Rank; readonly suit: Suit; }

/** 回傳 [0, 1) 的亂數。 */
export type RandomSource = () => number;

export type Action = 'hit' | 'stand' | 'double' | 'split';
export type Phase = 'betting' | 'playerTurn' | 'settled';
export type Outcome = 'blackjack' | 'win' | 'push' | 'lose';

export interface HandValue { readonly total: number; readonly soft: boolean; }

export interface PlayerHand {
  readonly cards: readonly Card[];
  readonly bet: number;            // 該手注額，含加倍追加的部分
  readonly value: HandValue;       // 一律等於 handValue(cards)
  readonly doubled: boolean;
  readonly fromSplit: boolean;
  readonly splitAces: boolean;     // 由分 A 而來
  readonly done: boolean;          // 已停牌、爆牌、加倍完成、分 A 補牌完成，或已結算
  readonly outcome: Outcome | null;  // settled 之前為 null
  readonly payout: number | null;    // 返還額（含本金），settled 之前為 null
}

export interface DealerView {
  readonly cards: readonly Card[];  // playerTurn 時只有明牌；其餘階段是全部的牌（betting 時為空）
  readonly holeHidden: boolean;     // 只有 playerTurn 時為 true
  readonly value: HandValue;        // 一律等於 handValue(cards)，即只算看得到的牌
}

export interface RoundSummary {
  readonly totalBet: number;
  readonly totalReturn: number;
  readonly net: number;             // totalReturn − totalBet
}

export interface GameState {
  readonly phase: Phase;
  readonly bankroll: number;
  readonly hands: readonly PlayerHand[];  // betting 時為空陣列
  readonly activeHand: number | null;     // playerTurn 時是作用中手的索引，其餘為 null
  readonly dealer: DealerView;
  readonly shoeRemaining: number;
  readonly reshuffled: boolean;           // 本局的 deal() 是否先換了新牌靴；betting 時為 false
  readonly summary: RoundSummary | null;  // 只有 settled 時有值
}
```

```ts
// src/engine/rules.ts（程式中不得出現這些數字的裸值）
export const DECKS = 6;
export const SHOE_SIZE = 312;
export const RESHUFFLE_AT = 78;
export const STARTING_BANKROLL = 1000;
export const MIN_BET = 10;
export const MAX_BET = 500;
export const BET_STEP = 10;
export const DEALER_STANDS_ON = 17;
```

### 4.2 牌靴

```ts
// src/engine/shoe.ts
export const cryptoRandom: RandomSource;  // 以 crypto.getRandomValues 實作

export class Shoe {
  /** 312 張，依 G2 用 random 洗好。random 預設為 cryptoRandom。 */
  static create(random?: RandomSource): Shoe;
  /** 依陣列順序抽牌（cards[0] 最先抽出）。會複製輸入，張數與內容不限，供測試排定牌序。 */
  static fromCards(cards: readonly Card[]): Shoe;
  get remaining(): number;
  /** 從頂端抽一張；牌靴已空時丟 RuleError('SHOE_EMPTY')。 */
  draw(): Card;
}
```

用相同的 `random` 數列建立的兩副牌靴，抽牌順序必須完全相同。牌局流程中不會發生 `SHOE_EMPTY`：每局開始時牌靴至少有 79 張，一局用不到這麼多。

### 4.3 計點

```ts
// src/engine/cards.ts
export function handValue(cards: readonly Card[]): HandValue;  // G7
export function isBlackjack(cards: readonly Card[]): boolean;  // 剛好兩張：A 加 10 點牌；不知道是否來自分牌，由牌局判斷 G9
```

### 4.4 牌局

```ts
// src/engine/game.ts
export interface GameOptions {
  readonly bankroll?: number;     // 預設 STARTING_BANKROLL；必須是大於等於 0 的整數，否則丟 RuleError('INVALID_BANKROLL')
  readonly shoe?: Shoe;           // 預設 Shoe.create(random)
  readonly random?: RandomSource; // 預設 cryptoRandom；用於預設牌靴與之後每次重洗
}

export interface Game {
  state(): GameState;
  availableActions(): readonly Action[];  // 只有 playerTurn 時可能非空
  deal(bet: number): GameState;           // betting → playerTurn，或在 G16、G17 的情況直接 settled
  act(action: Action): GameState;         // 作用於 activeHand
  nextRound(): GameState;                 // settled → betting；不動牌靴與資金
  resetBankroll(): GameState;             // G14
}

export function createGame(options?: GameOptions): Game;
```

方法的前置條件與錯誤碼。依表中順序檢查，第一個不成立的條件決定錯誤碼：

| 方法 | 檢查順序 → 錯誤碼 |
| --- | --- |
| `deal(bet)` | phase 不是 betting → `WRONG_PHASE`；bet 違反 G11 的格式或範圍（非整數、非 10 的倍數、小於 10、大於 500、NaN）→ `INVALID_BET`；bet 大於資金 → `INSUFFICIENT_FUNDS` |
| `act(action)` | phase 不是 playerTurn → `WRONG_PHASE`；action 不在 `availableActions()` 中（包括 `'insurance'`、`'surrender'` 等未知字串）→ `ILLEGAL_ACTION` |
| `nextRound()` | phase 不是 settled → `WRONG_PHASE` |
| `resetBankroll()` | phase 不是 betting → `WRONG_PHASE`；資金不少於 10 → `ILLEGAL_ACTION` |

**失敗不留痕跡**：任何方法丟出 `RuleError` 後，`state()` 必須與呼叫前深度相等，牌靴張數不變。

**快照獨立**：`state()` 每次回傳新的物件，不與引擎內部共用可變參照；呼叫端修改回傳值不影響遊戲。

`deal()` 的步驟：G3 檢查與重洗 → 扣原注 → G5 發四張 → G16 → G17 → G18。`act()` 結束最後一手時，同一次呼叫內完成 G20 與 G27–G29，回傳 settled 狀態。

### 4.5 錯誤

```ts
// src/engine/errors.ts
export type RuleErrorCode =
  | 'WRONG_PHASE' | 'ILLEGAL_ACTION' | 'INVALID_BET'
  | 'INSUFFICIENT_FUNDS' | 'INVALID_BANKROLL' | 'SHOE_EMPTY';

export class RuleError extends Error {
  readonly code: RuleErrorCode;
  constructor(code: RuleErrorCode, message?: string);
}
```

### 4.6 呼叫範例：情境 S12

牌序 `8, 6, 8, 10; 3, K, 10, 4`，起始資金 1,000：

| 呼叫 | 結果 |
| --- | --- |
| `deal(100)` | playerTurn；資金 900；手牌 [8, 8]；莊家可見 [6]；可用 hit、stand、double、split |
| `act('split')` | 資金 800；H1 = [8, 3] 作用中；H2 = [8] |
| `act('double')` | 資金 700；H1 = [8, 3, K]、注額 200、已結束；H2 補到 [8, 10] 成為作用中 |
| `act('stand')` | 莊家翻牌 [6, 10] 後補 4 成 20；H1 `win` 返還 400；H2 `lose` 返還 0；總押注 300、總返還 400、淨 +100；資金 1,100 |

## 5. 架構

```text
src/
├─ engine/          # 純 TS，不碰 DOM（L3）
│  ├─ types.ts  rules.ts  errors.ts  cards.ts  shoe.ts  game.ts
│  └─ index.ts      # 唯一的公開入口
├─ ui/              # DOM、輸入、動畫、localStorage（L2）
├─ main.ts          # 組裝 UI 與引擎
└─ style.css        # L1
public/assets/      # 裝飾圖（L1，TASK-005）
tests/
├─ unit/            # Builder 的單元測試（Vitest，*.test.ts）
├─ support/         # 測試輔助，不含斷言；協調者寫，Codex 審
├─ acceptance/      # 凍結的驗收測試（Vitest，*.test.ts）；Codex 寫
└─ e2e/             # Playwright 冒煙測試（*.spec.ts）
```

- `src/engine/**` 不得使用 `window`、`document`、`localStorage` 等 DOM 全域，由 ESLint `no-restricted-globals` 擋下。`cryptoRandom` 透過 `globalThis.crypto` 存取。
- `src/ui/**` 只能從 `src/engine/index.ts` 匯入引擎。
- storage 模組接收一個 `Storage` 介面的物件，單元測試用記憶體假物件，不需要 jsdom。
- 不使用 UI 框架。[D13]

## 6. 驗證關卡

### 6.1 版本 [D13、D21、工具鏈研究]

Node 24 LTS（`engines.node: ">=24 <25"`）、npm。`package.json` 一律寫精確版本（不加 `^`、`~`），並提交 `package-lock.json`。

| 套件 | 版本 | 核准狀態 |
| --- | --- | --- |
| `vite` | 8.3.4 | 已核准 [D13] |
| `typescript` | 6.0.3 | 已核准 [D13、D21] |
| `vitest` | 5.0.4 | 已核准 [D13] |
| `eslint` | 10.12.0 | 已核准 [D13] |
| `@playwright/test` | 1.64.1 | 已核准 [D13] |
| `@eslint/js` | 10.0.1 | **待人核准**：ESLint 官方 flat config 需要 |
| `typescript-eslint` | 8.71.2 | **待人核准**：要 lint TypeScript 就需要 |

### 6.2 `scripts/verify.ps1` [D15]

| 步驟 | 指令 | `-Quick`／L1 | L2 | L3 |
| --- | --- | --- | --- | --- |
| `typecheck` | `tsc --noEmit`（涵蓋 `src/`、`tests/`） | ✓ | ✓ | ✓ |
| `lint` | `eslint . --max-warnings 0` | ✓ | ✓ | ✓ |
| `unit` | `vitest run tests/unit` | ✓ | ✓ | ✓ |
| `build` | `vite build` | | ✓ | ✓ |
| `e2e` | `playwright test`（只有 chromium，對 `vite preview` 執行） | | ✓ | ✓ |
| `acceptance` | `vitest run tests/acceptance`；目錄不存在或沒有 `*.test.ts` 就失敗 | | | ✓ |

- 必要步驟沒跑到就失敗，不管原因是缺目錄、缺工具或被跳過。
- Vitest 的 `include` 只收 `tests/unit/**/*.test.ts` 與 `tests/acceptance/**/*.test.ts`；Playwright 只收 `tests/e2e/**/*.spec.ts`。兩邊不能收到對方的檔案。
- 沒有設定 `PLAYWRIGHT_BROWSERS_PATH` 而且不在 CI（`$env:CI` 未設定）時，腳本設為 `D:\ai\.cache\ms-playwright`。[D23]
- Playwright 先在本機 Windows 10 試跑，可以就照用，並記為「不在官方支援範圍」；不行就改為只在 CI 跑，並記為 baseline 發現。[D22]
- 不做截圖比對。[D15]

### 6.3 CI（`.github/workflows/verify.yml`）[D18]

- 觸發：對 `main` 的 `pull_request`。權限 `contents: read`，不放任何 secrets。
- `classify`（ubuntu-latest）：
  - 變更觸及 §7 的 L3 路徑 → L3；全部檔案都在 L1 範圍 → L1；其他 → L2。
  - 變更觸及 `tests/acceptance/`、`docs/specs/`、`.ai/task-contracts/` 時，PR 必須有 `contract-change` 標籤。
  - L3：從分支名 `task/NNN` 找到 `.ai/task-contracts/TASK-NNN.md`，讀出 `Frozen` SHA；SHA 必須存在於歷史中，而且 `tests/acceptance/` 自該 SHA 起沒有變動（有 `contract-change` 標籤時例外）。
- `verify`（windows-latest）：setup-node 24 → `npm ci` → `npx playwright install chromium` → `pwsh ./scripts/verify.ps1 -Risk <classify 的結果>`。
- `dependency-review`（ubuntu-latest）。
- Action 版本：`actions/checkout@v7.0.1`、`actions/setup-node@v7.1.0`、`actions/dependency-review-action@v5.0.0`。

### 6.4 Stop hook 與 trace

`.claude/settings.json` 掛 Stop hook `verify-gate.ps1`：只在 `task/*` 分支跑 `verify.ps1 -Quick`，連續擋兩次後放行並要求交接；另附 `scripts/trace-summary.ps1`。這兩項順手加，不列入試行的成敗。[D1]

### 6.5 TASK-001 合併後由人設定

- ruleset `main-protection` 加上必要檢查 `classify`、`verify`、`dependency-review`，以及 Code Owner 核准 [D5]
- CodeQL default setup（JavaScript/TypeScript）、secret scanning 與 push protection、Actions 預設 workflow 權限設為唯讀 [D18]
- 協調者屆時列出確切的設定位置

## 7. 風險分級與保護 [D14]

| 等級 | 路徑 |
| --- | --- |
| L3 | `src/engine/**`、`package.json`、`package-lock.json`、`.github/**`、`scripts/verify.ps1`、`.claude/**` |
| L2 | `src/ui/**`、`src/main.ts`、`index.html`，以及其他未列出的檔案 |
| L1 | 文件（`docs/**`、`.ai/**`、`*.md`）、`*.css`、`public/assets/**` |

這份清單在 AGENTS.md、CI `classify`、CODEOWNERS 三處保持一致。路徑之外的升級條件：改動 §4 的公開 API 或型別一律 L3。

保護機制：

- **CODEOWNERS**（Code Owner 為 repo 擁有者）：L3 路徑，加上 `/scripts/`、`/AGENTS.md`、`/CLAUDE.md`、`/tests/acceptance/`、`/docs/specs/`、`/.ai/task-contracts/`
- **`.claude/settings.json` 的 deny**，對 repo 內每個 Claude session 生效：
  - `Edit(/tests/acceptance/**)`、`Edit(/AGENTS.md)`、`Edit(/CLAUDE.md)`、`Edit(/.claude/**)`、`Edit(/.github/**)`、`Edit(/scripts/**)`
  - `Read(.env)`、`Read(.env.*)`
  - `Bash(git push *)`、`Bash(git commit --no-verify *)` [D33]
  - `WebSearch`、`WebFetch`、`mcp__claude-in-chrome`、`mcp__Claude_Browser`
  - `disableBypassPermissionsMode: "disable"`
- 規格與任務卡不放進 deny（協調者要寫），由 CODEOWNERS、`contract-change` 標籤與審查者對照 trace 把關。

## 8. 計畫與任務卡

### 8.1 每張 L3 卡的流程

1. 協調者從 `main` 建 `task/NNN`，在 `tests/support/` 寫需要的輔助（不含斷言），由 Codex 審。
2. Codex 在獨立 worktree 寫 `tests/acceptance/`，依 §9 的案例，`$noWeb`、effort high。協調者跑 `check-acceptance-diff.ps1`，Claude（唯讀子代理）反向審斷言，人抽查後凍結，SHA 寫進卡的 `Frozen`。
3. 協調者在 `D:\ai\projects\Blackjack-wt\task-NNN` 從 `task/NNN` 建 worktree；人在那裡開實作者 session（Opus），貼上一行啟動提示。[D2]
4. 實作到 `pwsh ./scripts/verify.ps1 -Risk L3` 通過，commit。協調者 push 並開 PR。[D33]
5. Codex 審 diff（`$noWeb`、固定 base／head SHA）→ 修正最多兩輪 → 人加 `contract-change` 標籤並核准 → merge。

L2 卡：Sonnet 實作 → verify → Opus 唯讀子代理審（TASK-004 另交 Codex 審一次，比較兩邊）→ 人核准。L1 卡：直接實作 → `verify -Quick` → CI。

### 8.2 任務卡

| 卡 | 風險 | 實作 | 內容 | 驗收 | 依賴 |
| --- | --- | --- | --- | --- | --- |
| TASK-001 | L3 | 協調者 [D32] | Vite 骨架、相依、`verify.ps1`、CI、CODEOWNERS、AGENTS.md、`.claude/settings.json`、Stop hook | 卡上 AC1–AC9 | plan PR |
| TASK-002 | L3 | Opus | §4.1–4.3、§4.5：型別、常數、錯誤、牌靴、計點 | §9.2 C1–C5 | 001 |
| TASK-003 | L3 | Opus | §4.4：牌局流程、動作、莊家、結算 | §9.3 S1–S16、B1–B14 | 002 |
| TASK-004 | L2 | Sonnet | §3.8 介面與 localStorage；完整冒煙測試 | 卡上案例 | 003 |
| TASK-005 | L1 | agy（Gemini Flash） | 牌背、桌面絨布、Logo 等裝飾圖 [D20] | 人看圖核准 | 001 |
| TASK-006 | L3 | Opus | `.github/workflows/pages.yml`，Pages 部署需人核准 [D19] | 卡上案例 | 004 |

卡檔放在 `.ai/task-contracts/TASK-NNN.md`。TASK-005 可與 002–004 平行。

### 8.3 bootstrap 例外 [D32]

TASK-001 會觸及 L3 路徑，但當時還沒有驗收測試，所以它的 PR 一定過不了 L3 關卡（缺 `Frozen`、缺 `tests/acceptance/`）。這時 ruleset 還沒要求必要檢查，人確認 CI 的 L2 步驟（typecheck、lint、unit、build、e2e）都通過後核准合併，並記為試行發現。之後非引擎的 L3 卡（例如 TASK-006）的 `Frozen` 填最近一次凍結的驗收 SHA，CI 只核對它沒被改動。

### 8.4 合併順序

1. plan PR：`plan/spec-001` → `main`，內容為研究筆記、本 SPEC、任務卡。這時還沒有 CI，人審閱後核准。
2. TASK-001 → 人依 §6.5 設定 ruleset → TASK-002 → TASK-003 → TASK-004 → TASK-006。TASK-005 在 TASK-001 之後任何時間都可以做。

## 9. 驗收依據

### 9.1 共同約定

- 除非另註，起始資金 1,000、下注 100，用 `createGame({ shoe })` 建立牌局。
- 牌序用 `tests/support/cards.ts` 建立：
  - `cards(...ranks: Rank[]): Card[]`：花色依 S、H、D、C 輪替，花色不影響結果。
  - `stackedShoe(ranks: readonly Rank[], total = SHOE_SIZE): Shoe`：前 `ranks.length` 張依序是指定的牌，其餘以固定順序的填充牌補足到 `total` 張。`total` 小於 `ranks.length` 時丟錯。
  - 補到 312 張是為了讓 G3 不觸發；需要測重洗的案例改用 `Shoe.fromCards` 指定確切張數。
- 每個完整牌局的案例都斷言：
  - 每手的 `outcome`、`payout`
  - `summary` 的 `totalBet`、`totalReturn`、`net`
  - 最終資金等於 1,000 加 `net`
  - `shoeRemaining` 等於 312 減牌序列出的張數（同時檢查 G4、G20 沒有多抽）
- 每個案例的測試開頭註明規則編號與預期值來源。

### 9.2 TASK-002：牌靴與計點

預期值來源：G1–G9 的定義，由協調者手算。**待人確認**。

| # | 案例 | 預期 | 規則 |
| --- | --- | --- | --- |
| C1 | `Shoe.create(random)` 後抽完全部的牌 | `remaining` 起始為 312；52 種「花色＋點數」各出現 6 次；第 313 次 `draw()` 丟 `SHOE_EMPTY`，`remaining` 為 0 | G1 |
| C2 | 兩副牌靴使用相同的確定性 `random` 數列 | 312 張的抽牌順序完全相同 | G2、§4.2 |
| C3 | `Shoe.fromCards(arr)` | 依 `arr` 順序抽出；建立後修改 `arr` 不影響牌靴；`Shoe.fromCards([])` 的 `draw()` 丟 `SHOE_EMPTY` | §4.2 |
| C4 | `handValue` | 見下表 | G6、G7 |
| C5 | `isBlackjack` | `[A,K]`、`[Q,A]`、`[A,10]`、`[J,A]` 為 true；`[A,5,5]`、`[10,10]`、`[A,A]`、`[A,9]`、`[]` 為 false | G9 |

C4 的 `handValue`：

| 牌 | total | soft | 牌 | total | soft |
| --- | ---: | --- | --- | ---: | --- |
| `[]` | 0 | false | `[A,6,9]` | 16 | false |
| `[2,3]` | 5 | false | `[A,A,9]` | 21 | true |
| `[10,7]` | 17 | false | `[A,A,A,8]` | 21 | true |
| `[A,6]` | 17 | true | `[K,Q,A]` | 21 | false |
| `[A,2,4]` | 17 | true | `[5,6,K]` | 21 | false |
| `[A,A,5]` | 17 | true | `[A,K]` | 21 | true |
| `[A,6,10]` | 17 | false | `[J,Q]` | 20 | false |
| `[A,A]` | 12 | true | `[10,6,9]` | 25 | false |
| | | | `[A,10,A,10]` | 22 | false |

### 9.3 TASK-003：牌局

**S1–S16**：規則研究「驗收情境」表的 #1–#16，牌序、動作、總押注、總返還、淨輸贏以原表為準。預期值來源：人工確認 Will／2026-10-15 [D29]。本 SPEC 另加以下斷言（來源：所列規則）：

| 情境 | 追加斷言 | 規則 |
| --- | --- | --- |
| S1 | 莊家 `cards` 為 [9, 7]，沒有補牌 | G17 |
| S2 | 唯一的一手 `outcome` 為 `push`，`payout` 100 | G16 |
| S3、S4 | `deal()` 後 phase 為 settled，`availableActions()` 為空；`act('split')`、`act('double')` 丟 `WRONG_PHASE` | G16 |
| S5 | `deal()` 後 phase 為 playerTurn；莊家 `cards` 為 [A]、`holeHidden` 為 true；資金 900；可用動作為 hit、stand、double | G12、G16 |
| S9 | 加倍後該手 `bet` 200、`doubled` true、3 張牌 | G24 |
| S11、S12、S16 | 分牌後 `hands` 有兩手，`activeHand` 為 0；第 1 手結束前第 2 手只有一張 | G25 |
| S13 | `act('split')` 後 phase 立即為 settled；兩手 `splitAces` 為 true、各 2 張；`outcome` 皆為 `win`（不是 `blackjack`），`payout` 各 200 | G9、G25 |
| S14 | playerTurn 中 `act('surrender')`、`act('insurance')`（以型別斷言傳入）丟 `ILLEGAL_ACTION`，狀態不變 | G25、§4.4 |
| S16 | 第 1 手拿到第二張 8 後，可用動作為 hit、stand、double；`act('split')` 丟 `ILLEGAL_ACTION`，狀態與呼叫前深度相等 | G25、§4.4 |

**B1–B14**：新增的邊界案例。預期值來源：所列規則，由協調者手算。**待人確認**。牌序寫法同規則研究：分號前是起手四張，分號後依序抽出。

| # | 牌序與設定 | 動作 | 預期 | 規則 |
| --- | --- | --- | --- | --- |
| B1 | `Shoe.fromCards` 恰 79 張，前五張 `5, 10, 6, 7; 2` | `deal(100)` → `hit` → `stand` → `nextRound()` → `deal(100)` | 第一次 deal 後 `reshuffled` false、剩 75 張；hit 拿到的是排定的 2（牌局中途沒有重洗），剩 74 張；stand 後莊家 17 不補牌，玩家 13 輸，淨 −100；第二次 deal 後 `reshuffled` true，剩 308 張，資金 800 | G3 |
| B2 | `Shoe.fromCards` 恰 78 張；另一局恰 77 張 | `deal(100)` | 兩局都是 `reshuffled` true、剩 308 張 | G3 |
| B3 | `K, 9, Q, 7; 8, 10, 2` | `deal(100)` → `split` → `stand` → `stand` | deal 後可用 hit、stand、double、split；H1 [K,8] 18 `push` 返還 100；H2 [Q,10] 20 `win` 返還 200；莊家 [9,7,2] 18；總押注 200、總返還 300、淨 +100 | G25、G26、G27 |
| B4 | `9, 7, K, 8` | `deal(100)` | 可用動作為 hit、stand、double（9 與 K 點數不同，不能分） | G25 |
| B5 | `K, 9, K, 8; A, 9` | `deal(100)` → `split` → `stand` | split 後 H1 [K,A] 21 已結束，`activeHand` 為 1，H2 [K,9] 可用 hit、stand、double；莊家 [9,8] 17；H1 `win` 返還 200（1:1）；H2 `win` 返還 200；淨 +200 | G9、G19、G28 |
| B6 | `10, 9, 5, 7; 6, 4` | `deal(100)` → `hit` | hit 後到 21 自動停牌，同一次呼叫內進入 settled；莊家 [9,7,4] 20；玩家 `win` 返還 200，淨 +100 | G19、G26 |
| B7 | `10, 6, 6, 10; K` | `deal(100)` → `hit` | 玩家 26 爆牌；莊家 [6,10] 16 不補牌；`lose`，淨 −100 | G20 |
| B8 | `8, 5, 8, 10; 10, 6, 10, 9` | `deal(100)` → `split` → `hit` → `hit` | H1 [8,10,6] 24 爆牌；H2 [8,10,9] 27 爆牌；莊家 [5,10] 15 不補牌；兩手 `lose`；總押注 200、淨 −200 | G20 |
| B9 | 起始資金 150；`8, 9, 8, 7` | `deal(100)` → `double` → `split` | deal 後資金 50，可用動作只有 hit、stand；`double`、`split` 都丟 `ILLEGAL_ACTION`，狀態不變。另一局起始資金 200、同牌序：deal 後資金 100，可用 hit、stand、double、split | G13 |
| B10 | 起始資金 1,000 | `deal(0)`、`deal(5)`、`deal(15)`、`deal(510)`、`deal(100.5)`、`deal(NaN)` | 都丟 `INVALID_BET`，狀態不變。起始資金 50 時 `deal(100)` 丟 `INSUFFICIENT_FUNDS`、`deal(15)` 丟 `INVALID_BET`。各用新牌局：`deal(10)` 後資金 990，`deal(500)` 後資金 500 | G11、§4.4 |
| B11 | 起始資金 5；10；10 加牌序 `10, 9, 7, 8` | `resetBankroll()`；`resetBankroll()`；`deal(10)` → `resetBankroll()` | 資金 5 → 1,000；資金 10 → 丟 `ILLEGAL_ACTION`，仍為 10；deal(10) 後資金 0、phase 為 playerTurn → 丟 `WRONG_PHASE` | G14 |
| B12 | S5 的牌序 `10, A, 8, 6` | 新牌局 `act('hit')`、`nextRound()`；`deal(100)` 後再 `deal(100)`、`nextRound()`；`stand` 後再 `act('stand')`、`deal(100)`；最後 `nextRound()` | 新牌局可用動作為空，兩個呼叫都丟 `WRONG_PHASE`；playerTurn 中的兩個呼叫都丟 `WRONG_PHASE`；settled 後的兩個呼叫都丟 `WRONG_PHASE`，資金維持 1,100（不重複結算）；`nextRound()` 後 phase 為 betting，`hands` 與莊家 `cards` 為空，`summary` 為 null，資金 1,100 | G21、G29、§4.4 |
| B13 | `A, 9, 7, 8; 3` | `deal(100)` → `double` | deal 後可用 hit、stand、double；加倍後手牌 [A,7,3] 為 `{ total: 21, soft: true }`；莊家 [9,8] 17；`win` 返還 400；總押注 200、淨 +200 | G7、G24 |
| B14 | `10, 9, 7, 8` | `deal(100)` → 修改 `state()` 回傳的 `hands` 陣列與 `bankroll` 欄位（以型別斷言） | 再次呼叫 `state()` 的結果與修改前相同 | §4.4 快照獨立 |

## 10. 未決事項與假設

1. **待人核准**：`@eslint/js` 10.0.1、`typescript-eslint` 8.71.2（§6.1）。
2. **待人確認**：§9.2 的 C1–C5、§9.3 的 B1–B14 與追加斷言的預期值。確認後才能交給 Codex 寫斷言。
3. **假設**：Pages 網址是 `https://oldliuwill.github.io/Blackjack/`，Vite `base` 為 `/Blackjack/`。TASK-001 先設好 `base`，讓冒煙測試與部署走同一個路徑。
4. **假設**：Playwright 1.64.1 能在本機 Windows 10 執行（D22）。TASK-001 實測後記錄結果。
5. **已知限制**：TASK-001 的 PR 過不了 L3 關卡（§8.3）。

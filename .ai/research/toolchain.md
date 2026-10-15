# 研究：toolchain

查詢日期：2026-10-15  
重查條件：人工核准相依前；套件或 Action 升級時；Node LTS 狀態、Playwright 支援平台或 `windows-latest` image 變更時；Pages workflow 首次啟用前。  
問題：確認原生 Windows 10/11、Node 24、npm 下，無 UI 框架的 TypeScript + Vite 靜態遊戲所需版本、初始化結構、lint／測試設定、Chromium 安裝、GitHub Actions 與 GitHub Pages 部署方式。

## 結論（三行以內）

- Node 24 目前仍為 LTS；以下套件的 Node engines 均涵蓋 Node 24，但這不代表整組相依已驗證相容。[Node 官方狀態](https://nodejs.org/en/about/previous-releases)（2026-10-15）
- TypeScript 最新穩定版為 **7.0.2**，超出 typescript-eslint **8.71.2** 的 `<6.1.0` 支援範圍；**6.0.3** 是可供規劃者評估的替代選項。[套件 metadata](https://registry.npmjs.org/typescript/latest)、[相容範圍](https://typescript-eslint.io/users/dependency-versions/)（2026-10-15）
- Playwright 目前官方列出 Windows 11+，未包含原生 Windows 10；不能宣稱需求中的兩個 Windows 平台都獲完整支援。[官方系統需求](https://playwright.dev/docs/intro#system-requirements)（2026-10-15）

## 事實

下表的 Node 範圍保留官方 SemVer 原文；`engines` 是套件宣告，與官方實際支援平台列表分開判讀。

| 主張 | 來源 URL | 適用版本 / 平台 | 查詢日期 | 信心 |
|---|---|---|---|---|
| Vite 最新穩定版為 **8.3.4**；Node engines：`^20.19.0 \|\| >=22.12.0`，包含 Node 24。 | [Release](https://github.com/vitejs/vite/releases/tag/v8.3.4)、[metadata](https://raw.githubusercontent.com/vitejs/vite/v8.3.4/packages/vite/package.json) | Vite 8.3.4；Windows 的 Node toolchain | 2026-10-15 | 高 |
| TypeScript 最新穩定版為 **7.0.2**；npm `latest` metadata 的 Node engines：`>=16.20.0`；有 Windows x64、arm64 平台套件。 | [Release](https://github.com/microsoft/TypeScript/releases/tag/v7.0.2)、[npm metadata](https://registry.npmjs.org/typescript/latest) | TypeScript 7.0.2；Windows x64／arm64；最低 Windows OS 版本未查到 | 2026-10-15 | 高 |
| Vitest 最新穩定版為 **5.0.4**；Node engines：`^22.12.0 \|\| ^24.0.0 \|\| >=26.0.0`。 | [Release](https://github.com/vitest-dev/vitest/releases/tag/v5.0.4)、[metadata](https://raw.githubusercontent.com/vitest-dev/vitest/v5.0.4/packages/vitest/package.json) | Vitest 5.0.4；Windows 的 Node toolchain | 2026-10-15 | 高 |
| ESLint 最新穩定版為 **10.12.0**；Node engines：`^20.19.0 \|\| ^22.13.0 \|\| >=24`。 | [Release](https://github.com/eslint/eslint/releases/tag/v10.12.0)、[metadata](https://raw.githubusercontent.com/eslint/eslint/v10.12.0/package.json) | ESLint 10.12.0；Windows 的 Node toolchain | 2026-10-15 | 高 |
| typescript-eslint 最新穩定版為 **8.71.2**；Node engines：`^18.18.0 \|\| ^20.9.0 \|\| >=21.1.0`。 | [Release](https://github.com/typescript-eslint/typescript-eslint/releases/tag/v8.71.2)、[metadata](https://raw.githubusercontent.com/typescript-eslint/typescript-eslint/v8.71.2/packages/typescript-eslint/package.json) | typescript-eslint 8.71.2；Windows 的 Node toolchain | 2026-10-15 | 高 |
| `@playwright/test` 最新穩定版為 **1.64.1**；Node engines 為 `>=20`，但目前官方系統需求列的是最新 Node 22、24、26 分支，以及 Windows 11+／Server 2019+。 | [Release](https://github.com/microsoft/playwright/releases/tag/v1.64.1)、[metadata](https://raw.githubusercontent.com/microsoft/playwright/v1.64.1/packages/playwright-test/package.json)、[系統需求](https://playwright.dev/docs/intro#system-requirements) | Playwright 1.64.1；Windows 11+／Server 2019+；Windows 10 未列入 | 2026-10-15 | 高 |
| Node **24 主版本分支**目前為 LTS；Node 26 目前為 Current。這是分支狀態，不是指定 patch 版本。 | [Node Releases](https://nodejs.org/en/about/previous-releases) | Node 24／26；跨平台 | 2026-10-15 | 高 |
| typescript-eslint 支援 ESLint `^8.57.0 \|\| ^9.0.0 \|\| ^10.0.0`、TypeScript `>=4.8.4 <6.1.0`；因此 TypeScript 7.0.2 不在支援範圍。 | [相依版本文件](https://typescript-eslint.io/users/dependency-versions/)、[8.71.2 metadata](https://raw.githubusercontent.com/typescript-eslint/typescript-eslint/v8.71.2/packages/typescript-eslint/package.json) | typescript-eslint 8.71.2；跨平台 | 2026-10-15 | 高 |
| Vitest 5.0.4 的必要 Vite peer 為 `^6.4.0 \|\| ^7.0.0 \|\| ^8.0.0`。不要求兩者 major 相同；Vite 8.3.4 在範圍內。 | [Vitest metadata](https://raw.githubusercontent.com/vitest-dev/vitest/v5.0.4/packages/vitest/package.json) | Vitest 5.0.4 + Vite 8.3.4；跨平台 | 2026-10-15 | 高 |
| Vitest 可讀取 `vite.config.ts`。若另有 `vitest.config.ts`，後者優先，並不自動合併前者；可明確使用 `mergeConfig`。 | [Vitest Config](https://vitest.dev/config/) | Vitest 5.0.4；跨平台 | 2026-10-15 | 高 |
| 官方 flat config quickstart 使用 `eslint`、`@eslint/js`、`typescript`、`typescript-eslint`，載入兩組 recommended configs；typed linting 是另外的設定。 | [Quickstart](https://typescript-eslint.io/getting-started/) | ESLint 10.12.0、typescript-eslint 8.71.2；跨平台 | 2026-10-15 | 高 |
| `noEmit` 讓 TypeScript 不產生編譯輸出；查到的 vanilla-ts 模板已設 `noEmit: true`，且 `include` 只有 `src`。 | [noEmit](https://www.typescriptlang.org/tsconfig/noEmit.html)、[模板 tsconfig](https://raw.githubusercontent.com/vitejs/vite/v8.3.4/packages/create-vite/template-vanilla-ts/tsconfig.json) | 下述 create-vite 9.2.1 模板快照；跨平台 | 2026-10-15 | 高 |
| Playwright Windows 預設瀏覽器位置為 `%USERPROFILE%\AppData\Local\ms-playwright`；`PLAYWRIGHT_BROWSERS_PATH` 可改下載與執行時搜尋位置；值為 `0` 時放在 `node_modules\playwright-core\.local-browsers`。 | [Browser binaries](https://playwright.dev/docs/browsers#managing-browser-binaries) | Playwright 1.64.1；受支援 Windows | 2026-10-15 | 高 |
| 每個 Playwright 版本配有特定瀏覽器 binaries；CI 官方流程先安裝 npm 相依，再安裝 browsers。官方不建議預設快取 browser binaries。 | [Browsers](https://playwright.dev/docs/browsers)、[CI](https://playwright.dev/docs/ci) | Playwright 1.64.1；GitHub Actions | 2026-10-15 | 高 |
| Pages 根站或 custom domain 使用 `base: '/'`；repository 子路徑使用 `base: '/<REPO>/'`。 | [Vite Pages 指南](https://vite.dev/guide/static-deploy.html#github-pages) | Vite 8.3.4；GitHub Pages | 2026-10-15 | 高 |
| Pages workflow 範例權限為 `contents: read`、`pages: write`、`id-token: write`；部署 job 使用 `github-pages` environment。 | [GitHub 官方文件](https://docs.github.com/en/pages/getting-started-with-github-pages/using-custom-workflows-with-github-pages)、[Vite 範例](https://vite.dev/guide/static-deploy.html#github-pages) | GitHub.com Pages | 2026-10-15 | 高 |
| `windows-latest` 目前對應 Windows Server 2025 x64，並非 Windows 10/11 桌面版；label 會遷移。 | [runner-images](https://github.com/actions/runner-images) | GitHub-hosted Windows runner | 2026-10-15 | 高 |
| `upload-pages-artifact` 有 Windows 專用封裝分支，內部使用 Bash／tar。 | [Action 定義](https://raw.githubusercontent.com/actions/upload-pages-artifact/v5.0.0/action.yml) | upload-pages-artifact 5.0.0；Windows runner | 2026-10-15 | 高 |

**create-vite 模板結構**

查到 Vite `v8.3.4` repo 快照內的 create-vite 版本為 **9.2.1**，Node engines 為 `^20.19.0 || >=22.12.0`。這是已核對的模板快照，**未確認它等於查詢當下 create-vite 的 npm `latest`**。[metadata](https://raw.githubusercontent.com/vitejs/vite/v8.3.4/packages/create-vite/package.json)（2026-10-15）

下列核心檔案已有原始碼證據；assets 為 `main.ts` 引用的路徑。完整目錄 listing 未成功取得，因此不是完整生成結果的實測紀錄。

```text
my-game/
├─ .gitignore             ← generator 將 _gitignore 改名
├─ index.html
├─ package.json
├─ tsconfig.json
└─ src/
   ├─ main.ts
   ├─ counter.ts
   ├─ style.css
   └─ assets/
      ├─ hero.png          ← main.ts 引用
      ├─ typescript.svg    ← main.ts 引用
      └─ vite.svg          ← main.ts 引用
```

來源：[generator](https://raw.githubusercontent.com/vitejs/vite/v8.3.4/packages/create-vite/src/index.ts)、[index.html](https://raw.githubusercontent.com/vitejs/vite/v8.3.4/packages/create-vite/template-vanilla-ts/index.html)、[main.ts](https://raw.githubusercontent.com/vitejs/vite/v8.3.4/packages/create-vite/template-vanilla-ts/src/main.ts)、[counter.ts](https://raw.githubusercontent.com/vitejs/vite/v8.3.4/packages/create-vite/template-vanilla-ts/src/counter.ts)、[style.css](https://raw.githubusercontent.com/vitejs/vite/v8.3.4/packages/create-vite/template-vanilla-ts/src/style.css)（適用上述快照；2026-10-15）。

模板 `package.json` 只有 `dev`、`build`、`preview` scripts，分別為 `vite`、`tsc && vite build`、`vite preview`；相依範圍為 TypeScript `~6.0.2`、Vite `^8.3.3`。它沒有在此 manifest 列出 Vitest、ESLint 或 Playwright。[模板 manifest](https://raw.githubusercontent.com/vitejs/vite/v8.3.4/packages/create-vite/template-vanilla-ts/package.json)（2026-10-15）

## 套件與版本（供人工核准相依時用）

**npm 候選清單；不是採用決定**

| 套件 | 已查到的完整版本 | 選項與取捨 | 適用平台／來源／查詢日期 |
|---|---|---|---|
| `vite` | 8.3.4 | 符合 Vitest 5.0.4 peer 範圍；仍需整合測試。 | Windows Node 24；[metadata](https://raw.githubusercontent.com/vitejs/vite/v8.3.4/packages/vite/package.json)；2026-10-15 |
| `typescript` | 7.0.2；替代候選 6.0.3 | 7.0.2 是最新穩定版，但不符合目前 typescript-eslint 範圍；6.0.3 在範圍內，其 Node engines 為 `>=14.17`。 | Windows；[7.0.2](https://registry.npmjs.org/typescript/latest)、[6.0.3](https://raw.githubusercontent.com/microsoft/TypeScript/v6.0.3/package.json)、[相容範圍](https://typescript-eslint.io/users/dependency-versions/)；2026-10-15 |
| `vitest` | 5.0.4 | 可與 Vite 8.3.4 搭配；Vite 是必要 peer。 | Windows Node 24；[metadata](https://raw.githubusercontent.com/vitest-dev/vitest/v5.0.4/packages/vitest/package.json)；2026-10-15 |
| `eslint` | 10.12.0 | 在 typescript-eslint 8.71.2 支援範圍內。 | Windows Node 24；[metadata](https://raw.githubusercontent.com/eslint/eslint/v10.12.0/package.json)、[相容範圍](https://typescript-eslint.io/users/dependency-versions/)；2026-10-15 |
| `@eslint/js` | 10.0.1 | 官方最小設定需要；此版本由 ESLint 10.12.0 repo 查得，不宣稱為 npm 最新版。 | Windows Node 24；[metadata](https://raw.githubusercontent.com/eslint/eslint/v10.12.0/packages/js/package.json)；2026-10-15 |
| `typescript-eslint` | 8.71.2 | umbrella package 已帶入 parser／plugin；不必為官方最小設定再分別列為直接相依。 | Windows Node 24；[套件說明](https://typescript-eslint.io/packages/)、[metadata](https://raw.githubusercontent.com/typescript-eslint/typescript-eslint/v8.71.2/packages/typescript-eslint/package.json)；2026-10-15 |
| `@playwright/test` | 1.64.1 | Windows 11 可列為官方支援選項；原生 Windows 10 沒有可據此核准的支援結論。 | Windows 11+；[metadata](https://raw.githubusercontent.com/microsoft/playwright/v1.64.1/packages/playwright-test/package.json)、[需求](https://playwright.dev/docs/intro#system-requirements)；2026-10-15 |

**GitHub Actions 版本**

| Action | 目前主要版本 | 查到的完整 release | 適用平台 | 來源 URL | 查詢日期 |
|---|---|---|---|---|---|
| `actions/checkout` | `v7` | 7.0.1 | GitHub Actions；本案 Windows runner | [Release](https://github.com/actions/checkout/releases/tag/v7.0.1) | 2026-10-15 |
| `actions/setup-node` | `v7` | 7.1.0 | GitHub Actions；本案 Windows runner | [Release](https://github.com/actions/setup-node/releases/tag/v7.1.0) | 2026-10-15 |
| `actions/upload-pages-artifact` | `v5` | 5.0.0 | GitHub Pages；含 Windows runner 分支 | [Release](https://github.com/actions/upload-pages-artifact/releases/tag/v5.0.0) | 2026-10-15 |
| `actions/deploy-pages` | `v5` | 5.0.1 | GitHub.com Pages | [Release](https://github.com/actions/deploy-pages/releases/tag/v5.0.1) | 2026-10-15 |
| `actions/dependency-review-action` | `v5` | 5.0.0 | GitHub Actions | [Release](https://github.com/actions/dependency-review-action/releases/tag/v5.0.0) | 2026-10-15 |
| `github/codeql-action` | `v4` | 4.38.3 | GitHub Actions／CodeQL | [Releases](https://github.com/github/codeql-action/releases)、[支援版本](https://github.com/github/codeql-action#supported-versions-of-the-codeql-action) | 2026-10-15 |

CodeQL repo 的 `releases/latest` 此次指向 **Bundle 2.27.2**，不是 Action 的主要版本；兩者不能混用。[Bundle release](https://github.com/github/codeql-action/releases/tag/codeql-bundle-v2.27.2)（2026-10-15）

## 未確認事項

- **完整生成檔案清單：未查到。** template 目錄頁取得失敗；`index.html` 引用 `/favicon.svg`，`main.ts` 引用 `/icons.svg`，但其實體位置與完整 assets listing 尚未核實。[index.html](https://raw.githubusercontent.com/vitejs/vite/v8.3.4/packages/create-vite/template-vanilla-ts/index.html)、[main.ts](https://raw.githubusercontent.com/vitejs/vite/v8.3.4/packages/create-vite/template-vanilla-ts/src/main.ts)（2026-10-15）
- **原生 Windows 10 可採用的受支援 Playwright 舊版：未查到。** 目前文件不包含 Windows 10，不能用「可能可執行」代替官方支援。[系統需求](https://playwright.dev/docs/intro#system-requirements)（2026-10-15）
- **所有最新套件共同安裝、lint、typecheck、測試均成功：未確認。** 尤其 TypeScript 7.0.2 明確超出目前 typescript-eslint 支援範圍。[相容範圍](https://typescript-eslint.io/users/dependency-versions/)（2026-10-15）
- **確切 Node 24 patch、npm 版本及 Windows build：本案尚未指定，也未在本機查驗。**
- **下述 Windows Pages workflow：未執行。** Vite 官方原例使用 Ubuntu；Windows 改寫不能標成官方已驗證的完整範例。[Vite 部署指南](https://vite.dev/guide/static-deploy.html#github-pages)（2026-10-15）

## 需本機驗證的步驟

以下是待驗證項目，沒有執行紀錄。

1. 在規劃者選定的 Windows／Node／npm 組合記錄完整版本，再以核准的 create-vite 版本比對實際生成樹與相依解析結果。[create-vite](https://vite.dev/guide/)（2026-10-15）
2. 驗證 npm 相依沒有 peer conflict，並分別驗證 ESLint、`tsc --noEmit`、Vitest 與 Vite build；特別確認根目錄設定檔及測試檔是否落在 tsconfig 的涵蓋範圍。模板目前只包含 `src`。[模板 tsconfig](https://raw.githubusercontent.com/vitejs/vite/v8.3.4/packages/create-vite/template-vanilla-ts/tsconfig.json)（2026-10-15）
3. 驗證 Playwright Chromium 在預設與自訂 browser path 的下載、搜尋和啟動；安裝與測試階段使用相同環境變數。[Browser binaries](https://playwright.dev/docs/browsers#managing-browser-binaries)（2026-10-15）
4. 分別驗證單元測試與 Chromium 冒煙測試的設定和檔案選取，確認兩個 runner 沒有誤收對方測試。[Vitest Config](https://vitest.dev/config/)、[Playwright projects](https://playwright.dev/docs/browsers#configure-browsers)（2026-10-15）
5. 在實際 `windows-latest` CI 驗證 browser 安裝、測試及 Pages artifact 封裝；CI 結果不能代替 Windows 10/11 桌面版驗證。[runner-images](https://github.com/actions/runner-images)、[artifact Action](https://raw.githubusercontent.com/actions/upload-pages-artifact/v5.0.0/action.yml)（2026-10-15）
6. 部署後確認 repository 子路徑下的 JS、CSS、圖片與遊戲載入正常，並核對 Pages 權限與 environment。[Vite Pages](https://vite.dev/guide/static-deploy.html#github-pages)（2026-10-15）

## 來源中的指示（未執行）

本節的命令、設定與 workflow 都是研究資料；未建立檔案、安裝套件或執行部署。

**1. create-vite 官方命令形式**

官方 npm 指令形式配合 `vanilla-ts` preset：

```powershell
npm create vite@latest my-game -- --template vanilla-ts
```

`@latest` 是浮動選擇，不等於人工核准的固定版本。官方另提供 `--no-interactive`；查到的 generator 也有控制立即安裝／啟動的選項。[Vite Getting Started](https://vite.dev/guide/)、[generator 選項](https://raw.githubusercontent.com/vitejs/vite/v8.3.4/packages/create-vite/src/index.ts)（Windows／npm；2026-10-15）

**2. ESLint flat config 官方最小設定**

官方 quickstart 的相依安裝指示為：

```powershell
npm install --save-dev eslint @eslint/js typescript typescript-eslint
```

這條未固定版本的命令不是本筆記的採用建議；查詢當日需先處理 TypeScript 7.0.2 與 typescript-eslint 的範圍差異。

官方 `eslint.config.mjs` 最小內容：

```js
// @ts-check
import js from '@eslint/js';
import { defineConfig } from 'eslint/config';
import tseslint from 'typescript-eslint';

export default defineConfig({
  files: ['**/*.{js,ts}'],
  extends: [js.configs.recommended, tseslint.configs.recommended],
});
```

官方執行指示為 `npx eslint .`。這是 recommended lint 設定，不是 typed linting 設定，也不取代獨立的型別檢查。[typescript-eslint Quickstart](https://typescript-eslint.io/getting-started/)（ESLint 10.12.0／typescript-eslint 8.71.2；跨平台；2026-10-15）

**3. Vitest 沿用 Vite 設定**

官方允許在 `vite.config.ts` 加入 `test`，並在使用 Vite 的 `defineConfig` 時引入 Vitest config types。以下為縮寫示意：

```ts
/// <reference types="vitest/config" />
import { defineConfig } from 'vite';

export default defineConfig({
  test: {},
});
```

若採獨立 `vitest.config.ts`，官方提供 `mergeConfig` 明確合併 Vite 設定；不是單靠兩個檔案並存就會合併。[Vitest Config](https://vitest.dev/config/)（Vitest 5.0.4；跨平台；2026-10-15）

本案指定的型別檢查命令可記為 `npx tsc --noEmit`；`noEmit` 的用途是保留檢查而不產生編譯輸出。[TypeScript noEmit](https://www.typescriptlang.org/tsconfig/noEmit.html)（2026-10-15）

**4. Chromium 與 Windows browser path**

限定 Chromium 的 CLI 形式：

```powershell
npx playwright install chromium
```

依官方 PowerShell 環境變數範例，限定 Chromium 後的寫法：

```powershell
$Env:PLAYWRIGHT_BROWSERS_PATH="$Env:USERPROFILE\pw-browsers"
npx playwright install chromium
```

執行測試時也須提供同一路徑。另一選項是 `PLAYWRIGHT_BROWSERS_PATH=0`，將 binaries 放在專案的 Playwright 套件目錄內。[Browsers](https://playwright.dev/docs/browsers)（Playwright 1.64.1；受支援 Windows；2026-10-15）

官方 CI 安裝順序可縮為：

```powershell
npm ci
npx playwright install --with-deps chromium
npx playwright test --project=chromium
```

最後一行假設設定中有名為 `chromium` 的 project。**只下載 Chromium 不會自動刪除設定中的 Firefox／WebKit projects。** 官方 CI 範例使用 Ubuntu，以上為限定 Chromium 的整理，Windows 執行結果仍待驗證。[CI](https://playwright.dev/docs/ci)、[Browser projects](https://playwright.dev/docs/browsers#configure-browsers)（2026-10-15）

**5. GitHub Pages base 與 workflow**

官方設定規則：

| 部署位置 | `base` |
|---|---|
| `https://<USERNAME>.github.io/` | `'/'`，或省略 |
| GitHub Pages custom domain | `'/'`，或省略 |
| `https://<USERNAME>.github.io/<REPO>/` | `'/<REPO>/'` |

官方另要求在 repository 的 Settings → Pages 將 Source 設為 GitHub Actions。[Vite Pages 指南](https://vite.dev/guide/static-deploy.html#github-pages)（Vite 8.3.4／GitHub Pages；2026-10-15）

以下是依官方流程整理的 **Windows／Node 24 版本**，保留 checkout → setup-node → npm build → configure-pages → upload → deploy 的次序。它使用完整 Action release，並將官方原例的 Ubuntu 與 `lts/*` 改為本案需求；不是逐字官方範例，也尚未驗證：

```yaml
name: Publish game

on:
  push:
    branches: [main]
  workflow_dispatch:

permissions:
  contents: read
  pages: write
  id-token: write

concurrency:
  group: pages
  cancel-in-progress: true

jobs:
  publish:
    runs-on: windows-latest
    environment:
      name: github-pages
      url: ${{ steps.publish.outputs.page_url }}
    steps:
      - uses: actions/checkout@v7.0.1
      - uses: actions/setup-node@v7.1.0
        with:
          node-version: '24'
          cache: npm
      - run: npm ci
      - run: npm run build
      - uses: actions/configure-pages@45bfe0192ca1faeb007ade9deae92b16b8254a0d
      - uses: actions/upload-pages-artifact@v5.0.0
        with:
          path: dist
      - uses: actions/deploy-pages@v5.0.1
        id: publish
```

`configure-pages` 的 SHA 取自查詢時 Vite 官方 workflow，其註記為主要版本 `v6`；本次未另查其完整 release。`node-version: '24'` 表示追蹤該分支，並非固定 patch。上述只是部署流程，尚未加入本案的 lint、typecheck、Vitest 與 Playwright 驗證關卡。[Vite workflow](https://vite.dev/guide/static-deploy.html#github-pages)、[GitHub Pages workflow 規範](https://docs.github.com/en/pages/getting-started-with-github-pages/using-custom-workflows-with-github-pages)（GitHub.com／Windows runner；2026-10-15）
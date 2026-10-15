# TASK-005：裝飾圖（美術卡）

Risk：L1（路徑：`public/assets/**`）
實作：協調者以 `agy -p --model gemini-3.8-flash-high` 產生，複製進專案；人看圖核准 [D20]

Goal：產生 3 張裝飾圖（背景圖為選用），放進 `public/assets/`。牌面、點數、花色與籌碼由程式產生，不在本卡範圍。
Allowed Files：`public/assets/card-back.png`、`public/assets/felt.png`、`public/assets/logo.png`、`public/assets/background.webp`（選用）、`public/assets/README.md`（產生方式與授權）
Commands：`pwsh ./scripts/verify.ps1 -Risk L1`

## 美術規格

共同要求：
- 扁平、乾淨，接近向量插畫
- 圖中不得有文字、真實賭場或品牌標誌
- 每張不超過 300 KB
- 色系：桌面綠 `#0B5D3B`、金色 `#C9A227`、酒紅 `#7A1F2B`、米白 `#F4EBD0`

| 檔案 | 尺寸 | 內容 |
| --- | --- | --- |
| `card-back.png` | 500×700（5:7） | 上下左右對稱的花紋。酒紅底、金色細線，四周留 24 px 米白邊 |
| `felt.png` | 512×512 | 可無縫拼接的綠色絨布質感，只有細微雜訊，不能有接縫或明顯圖樣 |
| `logo.png` | 512×512 | 黑桃加兩枚籌碼的徽章，金色與米白，透明背景；無法透明時改用桌面綠底。標題文字由 CSS 呈現 |
| `background.webp`（選用） | 1920×1080 | 深色暈影，中央較亮，用在絨布外圍 |

`README.md` 記錄：每張圖的產生日期、模型、提示文字，以及授權 Apache-2.0。

核准：人逐張看圖；不合格的重新產生，最多兩輪，仍不合格就改用純 CSS，SPEC §3.8 U8 的退回機制保證畫面不壞。

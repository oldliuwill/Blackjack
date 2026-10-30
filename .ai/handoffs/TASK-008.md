# TASK-008 狀態

- Base：`446c1f2`（寫卡的 commit；PR 對 `main` `0e0293b`）
- Head：審查的 head `f6e610e`；之後只有 `.ai/reviews/`、`.ai/handoffs/` 的 commit（腳本自 `3274e92` 起沒有變）
- PR：https://github.com/oldliuwill/Blackjack/pull/8（`contract-change` 標籤已由 `card.ps1 pr` 加上）
- 驗證：`verify.ps1 -Risk L3` 在 `f6e610e` PASS（47 秒）；負向測試 `.ai/reviews/TASK-008.negative.md`
- 審查：`.ai/reviews/TASK-008.r1.opus.md`（Opus medium）、`.r1.fable.md`（Fable high），BLOCKING 0；用 `calib-reviewer` 定義檔，因 `diff-reviewer` 在本 session 載不到
## 未解決（都是 NON-BLOCKING，沒有修）
- 卡文字：A8-4 的 `-Card 005`（PR #5）實為 `-Card 004`；A8-6 的「`%TEMP%` 執行 exit 1」與「不依賴呼叫者位置」字面衝突，我測成腳本複本放非 git 資料夾（見負向測試前言）；請人裁定要不要改卡
- 加 `contract-change` 失敗仍 exit 0；`MERGED` 要求 APPROVED 在最終 head 上（比卡字面嚴）；`status` 對排隊中的檢查（startedAt 為 null）與 `commit` 為 null 的 review 有邊界問題；`#requires` 宜改 7.2；`start`、`close` 少數失敗路徑留半成品；`pr` 看到已關閉的舊 PR 也不再開新的
## 下一步
1. 人：確認標籤在、核對 diff、Approve（`card.ps1 status -Card 008` 應為 `READY`）、合併；之後在一般終端機刪 worktree：`git -C D:\ai\projects\Blackjack worktree remove D:\ai\projects\Blackjack-wt\task-008`、`...\task-999`，再 `git -C D:\ai\projects\Blackjack branch -D task/999`
2. 合併後：下一張卡全程用 `card.ps1`，把少掉的工具呼叫數記進那張卡的狀態檔
## 用量
未量。本 session（Sonnet 5.5）與審查子代理（Opus、Fable 各一次）的用量合併後用 `card.ps1 close -Card 008 -Since <ISO>` 補。

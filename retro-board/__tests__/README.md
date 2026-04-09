# Unit Tests

## 執行方式

```bash
npm test              # 執行所有測試（watch 模式）
npm run test:ci       # CI 模式（含 coverage 報告，不進入 watch）
```

## 設定檔

| 檔案 | 說明 |
|------|------|
| `jest.config.ts` | Jest 設定，使用 `next/jest` 整合 Next.js、設定 jsdom 環境與 `@/` 路徑別名 |
| `jest.setup.ts` | 全域引入 `@testing-library/jest-dom`，啟用 `toBeInTheDocument()` 等 matcher |

---

## 測試檔案一覧

### `__tests__/lib/autoArrange.test.ts`

測試對象：`lib/autoArrange.ts` — `calculateAutoArrangePositions()`

此函式負責計算 Auto Arrange 時各 sticky note 的 normalized 位置（0.0–1.0 fraction）。

| 測試案例 | 驗證內容 |
|---------|---------|
| 空陣列回傳空結果 | 無 notes 時不產生任何輸出 |
| 單一 note 位於 `continue`（左上） | originX = 20px、originY = 70px，轉為 fraction 正確 |
| `stop`（右上）有水平 offset | originX 從 splitX 右側 20px 開始 |
| `invent`（左下）有垂直 offset | originY 從 splitY 下方 70px 開始 |
| 同一作者的多張 note 垂直堆疊 | 各 note 間距為 `ROW_H / canvasH` |
| 不同作者分配至不同欄位 | 相鄰作者的 pos_x 相差 `COL_W / canvasW` |
| 作者數超過 maxCols 時換行 | 第 4 位作者（超出 3 欄）折回第 0 欄，且 pos_y 大於前一組 |
| notes 不超出 section 右邊界 | 所有 pos_x < splitX fraction |
| 作者依字母排序，與 note 輸入順序無關 | Alice 永遠在 Zara 左側 |

---

### `__tests__/components/ConfirmDeleteModal.test.tsx`

測試對象：`components/modals/ConfirmDeleteModal.tsx`

刪除 Board 前的確認對話框，需輸入 `Delete {boardName}` 才能啟用刪除按鈕。

| 測試案例 | 驗證內容 |
|---------|---------|
| 顯示 board 名稱 | 對話框內含 `"boardName"`（curly quotes） |
| 顯示提示文字 | hint 顯示 `Delete {boardName}` |
| Delete 按鈕初始為 disabled | 未輸入時按鈕不可點擊 |
| 輸入錯誤內容按鈕仍 disabled | 部分輸入不解鎖 |
| 輸入正確內容後按鈕 enabled | 完整輸入後按鈕可點擊 |
| 點擊 Delete 呼叫 onConfirm | 確認動作觸發回呼 |
| 按 Enter 呼叫 onConfirm | 鍵盤操作與點擊等效 |
| 點擊 Cancel 呼叫 onCancel | 取消動作觸發回呼 |
| 按 Escape 呼叫 onCancel | Esc 鍵關閉對話框 |
| 未輸入時點擊 Delete 不呼叫 onConfirm | disabled 按鈕點擊無效 |

---

### `__tests__/components/ConfirmDeleteModal.keyboard.test.tsx`

測試對象：`components/modals/ConfirmDeleteModal.tsx` — 鍵盤與 IME 行為

| 測試案例 | 驗證內容 |
|---------|---------|
| 輸入正確後按 Enter 送出 | Enter key 在 input 完整時觸發 onConfirm |
| 輸入不完整時 Enter 不送出 | 防止誤觸送出 |
| 按 Escape 呼叫 onCancel | Esc 鍵關閉對話框 |

> **背景**：曾發生中文 IME（注音/倉頡）組字結束時的 Enter 誤觸發刪除，故單獨測試 Enter 的觸發條件。實作使用 `e.nativeEvent.isComposing` 防護。

---

### `__tests__/components/EmojiPicker.test.tsx`

測試對象：`components/board/EmojiPicker.tsx`

8 個分類、約 600 個 emoji 的選擇器，點擊 emoji 後呼叫 `onSelect` 並關閉。

| 測試案例 | 驗證內容 |
|---------|---------|
| 顯示 8 個分類 tab 按鈕 | `role="tab"` 的按鈕共 8 個 |
| 預設分類顯示 emoji 格子 | 初始 Smileys 分類含 😀 的格子按鈕 |
| 點擊 emoji 呼叫 onSelect | 傳入正確 emoji 字串 |
| 點擊 emoji 後呼叫 onClose | 選擇後自動關閉 picker |
| 切換分類顯示對應 emoji | 點擊 🍕 tab 後 grid 出現 🍕 格子按鈕 |
| 切換分類後顯示不同 emoji | 點擊 ⚽ tab 後 grid 出現 ⚽ 格子按鈕 |

> **注意**：分類 tab 按鈕使用 `role="tab"` 與 `aria-label="category-{emoji}"` 標記，以便與 emoji 格子按鈕（`role="button"`）區別，避免 `getByRole` 回傳多個結果。

---

### `__tests__/components/AllCommentsPanel.test.tsx`

測試對象：`components/modals/AllCommentsPanel.tsx`

從右側滑入的 panel，集中顯示所有有 comments 的 sticky notes。

| 測試案例 | 驗證內容 |
|---------|---------|
| 無 comments 時顯示空狀態 | "No comments yet" 文字出現 |
| header 顯示總 comment 數 | "2 comments" 等文字 |
| 顯示有 comment 的 note 內容 | note 的 content 文字出現 |
| 顯示 comment 內容 | comment 的文字出現 |
| 隱藏無 comment 的 note | 只有 comment notes 顯示，無 comment 的不顯示 |
| 點擊 Reply 呼叫 onOpenNote | 傳入對應的 note 物件 |
| 點擊關閉按鈕呼叫 onClose | X 按鈕關閉 panel |
| 按 Escape 呼叫 onClose | Esc 鍵關閉 panel |
| 自己的 comment 顯示刪除按鈕 | `title="Delete comment"` 元素存在 |
| 他人的 comment 不顯示刪除按鈕 | `title="Delete comment"` 元素不存在 |
| 點擊刪除按鈕呼叫 onDeleteComment | 傳入正確的 comment id |
| 顯示 note 所屬的 section 標籤 | section_id 對應的名稱出現 |

---

## Coverage

CI 模式（`npm run test:ci`）會產生 coverage 報告至 `coverage/` 資料夾，並由 GitHub Actions 上傳為 artifact（保留 7 天）。

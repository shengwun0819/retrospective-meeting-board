請將以下 Retro 場次的回顧資料，以 Markdown 格式寫入 ClickUp 的 "retro record" 文件中，建立一個以 Sprint 編號命名的新 Page。

Session ID: $ARGUMENTS

## 執行步驟

1. 呼叫以下 API 取得匯出資料：
   - 開發環境：`GET http://localhost:3000/api/sessions/$ARGUMENTS/export`
   - 解析 JSON 回應中的 `payload` 欄位。

2. 確認以下資訊：
   - Space ID：`25577573`
   - 目標文件名稱：`retro record`
   - 新 Page 名稱：`Sprint {payload.session.sprintNumber}`（例如 `Sprint 39`）
     - 若 sprintNumber 不存在，則使用 `{payload.session.name}` 作為 Page 名稱。

3. 使用 ClickUp MCP Server 工具，依照以下步驟操作：

   **步驟 3-1：找到 "retro record" 文件**
   - 在 Space ID `25577573` 中搜尋名為 `retro record` 的 Doc。
   - 若找不到，請告知使用者，並詢問是否要建立新的 Doc。

   **步驟 3-2：在該 Doc 中建立新 Page**
   - Page 標題：`Sprint {sprintNumber}`
   - Page 內容：使用 `payload.markdownContent`（已格式化的 Markdown）

   **步驟 3-3（選擇性）：建立 Action Items 任務**
   - 若使用者希望同時在 ClickUp 建立可追蹤的任務，詢問使用者是否需要。
   - 若需要，為每個 `payload.actionItems` 中的項目建立子任務。

4. 操作完成後，回報：
   - 已建立的 ClickUp Doc Page 連結
   - Page 名稱與包含的內容摘要（各區塊便利貼數量、行動項目數量）
   - 如有失敗項目，說明原因

## Markdown 內容格式說明

`payload.markdownContent` 已包含完整格式：

```
# Sprint N Retrospective — {場次名稱}

**期間：** {startDate} ~ {endDate}
**匯出日期：** {date}

---

## Continue ✅
- 便利貼內容 *(by 作者)*

## Stop 🛑
- ...

## Invent 💡
- ...

## Act 💪
- ...

---

## Action Items

| 項目 | 負責人 | 截止日期 | 狀態 |
|------|--------|---------|------|
| ... | ... | ... | ... |
```

## 注意事項

- 確認 ClickUp MCP Server 已正確設定（`~/.claude/settings.json` 中的 `mcpServers`）
- 若 API 回傳 404，請確認 retro-board 開發伺服器正在執行（`npm run dev`）
- Space ID `25577573` 已固定，無需每次詢問使用者
- 若 ClickUp MCP 尚未完成 OAuth 授權，會自動開啟瀏覽器進行授權流程

# Retro Board（回顧會議工具）

專為敏捷團隊打造的即時 Sprint 回顧工具。無需帳號，分享連結即可使用。

## 功能特色

### 白板與便利貼
- **可調整分隔線的 2×2 看板**：Continue / Stop / Invent / Act（CSIA 框架），四個區塊可透過拖曳分隔線自由調整大小，便利貼會跟著移動
- **便利貼**：新增、行內編輯（雙擊）、刪除（Delete 鍵或垃圾桶）、跨區塊拖曳、變更顏色與字型大小
- **表情反應**：👍 ❤️ 😂 🎉 🤔，即時樂觀更新（無需重整）
- **留言**：每張便利貼支援留言串（側邊面板）
- **行動項目**：從便利貼建立可追蹤的行動項目（Open → InProgress → Done）

### 畫布繪圖工具（底部工具列）
- **選取工具**：點選、移動、調整大小（拖曳四個角）
- **文字方塊**：可輸入文字，支援雙擊編輯
- **矩形 / 圓形**：拖曳預覽大小，雙擊可輸入文字
- **箭頭**：拖曳繪製箭頭，預覽端點連線
- 所有物件支援樣式調整（填色、邊框色、文字色、字型大小）與 Delete 鍵刪除

### 協作
- **即時同步**：便利貼與畫布物件透過 Supabase Realtime 多人同步
- **游標顯示**：顯示所有線上成員的即時游標位置與暱稱
- **線上成員列表**：顯示目前在線成員頭像（最多顯示 5 人）
- **匿名身分**：進入看板後輸入暱稱即可使用，不需帳號

### 其他
- **計時器**：支援 3 / 5 / 10 分鐘，時間到顯示緊急提示
- **復原 / 重做**：便利貼操作歷史（Cmd+Z / Cmd+Shift+Z）
- **看板側邊欄**：快速切換所有看板，無需返回首頁
- **匯出至 ClickUp**：透過 Claude Code MCP 技能，將四個區塊完整內容寫入 ClickUp Docs
- **分享連結**：一鍵複製看板網址
- **RWD**：工具列在小螢幕上支援橫向捲動

## 技術棧

| 層級 | 技術 |
|---|---|
| 框架 | Next.js 16（App Router）+ TypeScript |
| 樣式 | Tailwind CSS v4 |
| 資料庫 | Supabase（PostgreSQL） |
| 即時通訊 | Supabase Realtime（postgres_changes + broadcast + presence） |
| 拖曳功能 | @dnd-kit |
| 部署 | Vercel |

## 安裝與設定

### 1. 建立 Supabase 專案

前往 [supabase.com](https://supabase.com) 建立新專案，在 SQL Editor 依序執行：

1. `supabase/migrations/001_initial.sql` — 建立 sessions、boards、sticky_notes、reactions、comments、action_items
2. `supabase/migrations/002_canvas_elements.sql` — 建立 canvas_elements（文字、矩形、圓形、箭頭）

所有 RLS 政策為 `allow_all`（MVP，無驗證）。

### 2. 設定環境變數

```bash
cp .env.local.example .env.local
```

```env
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key
NEXT_PUBLIC_BASE_URL=http://localhost:3000
```

### 3. 本地啟動

```bash
npm install
npm run dev
# 開啟 http://localhost:3000
```

## 常用指令

```bash
npm run dev       # 開發伺服器
npm run build     # 正式環境建置
npm run lint      # ESLint 檢查
```

## 使用流程

1. **建立場次**：首頁輸入 Sprint 編號與場次名稱
2. **分享連結**：複製看板網址傳給隊友
3. **輸入暱稱**：每位參與者輸入顯示名稱
4. **新增便利貼**：點擊區塊的 `+` 按鈕，或工具列「新增便利貼」下拉選單
5. **畫布工具**：使用底部工具列切換工具，在畫布上繪製文字框、矩形、圓形、箭頭
6. **行動項目**：hover 便利貼 → 點擊 ✅ 建立行動項目；點擊工具列「行動項目」查看列表
7. **匯出**：點擊工具列「📤 匯出」→ 複製指令 → 在 Claude Code 執行

## ClickUp 匯出整合

本工具採用 **Claude Code MCP 技能模式**，由 Claude 作為操作主體呼叫 ClickUp API，Web App 本身不持有 ClickUp Token。

**設定（一次性）**：編輯 `~/.claude/settings.json`，加入 ClickUp MCP Server：

```json
{
  "mcpServers": {
    "clickup": {
      "type": "http",
      "url": "https://mcp.clickup.com/mcp"
    }
  }
}
```

**每次回顧後**：
1. 點擊看板工具列的「📤 匯出」
2. 複製 Modal 中顯示的指令（格式：`/clickup-export <session-id>`）
3. 在 Claude Code 貼上執行

Claude 會取得四個區塊完整資料，在 ClickUp 的 "Retro Record" 文件中建立以 `Sprint {N}` 命名的新頁面。

目標路徑：`Sygna > Sygna Docs (master) > Sygna Docs (Tech) > Retro Record > Sprint {N}`

## 鍵盤快捷鍵

| 快捷鍵 | 功能 |
|---|---|
| `Cmd/Ctrl + Z` | 復原 |
| `Cmd/Ctrl + Shift + Z` | 重做 |
| 雙擊便利貼 | 行內編輯 |
| `Enter` | 儲存編輯 |
| `Shift + Enter` | 換行 |
| `Escape` | 取消編輯 |
| `Delete / Backspace` | 刪除 hover 中的便利貼或選取的畫布物件 |

## 部署至 Vercel

1. 推送至 GitHub
2. 在 [vercel.com](https://vercel.com) 匯入專案
3. 新增環境變數（同上），將 `NEXT_PUBLIC_BASE_URL` 設為正式網址
4. 部署

## 專案結構

```
retro-board/
├── app/
│   ├── page.tsx                          # 首頁（建立 / 加入場次）
│   ├── board/[sessionId]/page.tsx        # 看板頁面（SSR 入口）
│   └── api/                              # REST API 路由
│       ├── sessions/                     # 場次 CRUD
│       ├── sessions/[id]/export/         # 匯出 payload
│       ├── boards/[boardId]/stickies/    # 便利貼 CRUD
│       ├── boards/[boardId]/canvas-elements/
│       ├── boards/[boardId]/action-items/
│       ├── stickies/[id]/               # 便利貼 PATCH/DELETE
│       ├── stickies/[id]/reactions/     # 表情反應 toggle
│       ├── stickies/[id]/comments/      # 留言
│       ├── canvas-elements/[id]/        # 畫布物件 PATCH/DELETE
│       └── action-items/[id]/           # 行動項目 PATCH/DELETE
├── components/
│   ├── board/
│   │   ├── Board.tsx                    # 主看板：狀態管理、Realtime、DnD
│   │   ├── ResizableCanvas.tsx          # 可調整分隔線的畫布容器
│   │   ├── Section.tsx                  # 四象限區塊
│   │   ├── StickyNote.tsx               # 可拖曳便利貼
│   │   ├── CanvasElement.tsx            # 畫布物件（文字/矩形/圓形/箭頭）
│   │   └── CursorOverlay.tsx            # 即時游標顯示
│   ├── toolbar/
│   │   ├── Toolbar.tsx                  # 頂部工具列
│   │   ├── BottomToolbar.tsx            # 底部畫布工具列
│   │   └── Timer.tsx                    # 倒計時器
│   ├── modals/
│   │   ├── NicknameModal.tsx            # 輸入暱稱
│   │   ├── CommentPanel.tsx             # 留言側邊面板
│   │   ├── ActionItemModal.tsx          # 行動項目
│   │   ├── ExportModal.tsx              # ClickUp 匯出
│   │   └── ConfirmDeleteModal.tsx       # 刪除確認
│   └── sidebar/
│       └── BoardSidebar.tsx             # 看板切換側邊欄
├── contexts/
│   └── UserContext.tsx                  # 匿名使用者身分（sessionStorage）
├── lib/
│   ├── supabase.ts                      # 瀏覽器 + 伺服器 Supabase 客戶端
│   ├── constants.ts                     # SECTION_CONFIGS、顏色常數
│   ├── clickup.ts                       # 匯出 payload 型別與格式化
│   └── navigation-events.ts             # 路由進度事件
├── types/
│   └── index.ts                         # 所有共用 TypeScript 介面
└── supabase/
    └── migrations/
        ├── 001_initial.sql              # 主要資料表 schema
        └── 002_canvas_elements.sql      # canvas_elements 資料表
```

## 衝突處理策略

MVP 版本採用**最後寫入優先（last-write-wins）**。多人同時編輯同一張便利貼時，最後送出的內容為準。未來可升級為鎖定式編輯或 CRDT。

# Retro Board

A real-time Sprint retrospective tool built for agile teams. Sign in and share the link to collaborate instantly.

## Features

### Whiteboard & Sticky Notes
- **Resizable 2×2 board**: Continue / Stop / Invent / Act (CSIA framework). Drag the dividers to resize sections — sticky notes follow along.
- **Sticky notes**: Create, inline-edit (double-click), delete (Delete key or trash icon), drag across sections, change color and font size, resize by dragging corners.
- **Text formatting**: Bold (B), Italic (I), Underline (U) buttons in the hover toolbar — persisted to DB.
- **Emoji reactions**: 👍 ❤️ 😂 🎉 🤔 quick picks + ＋ button opens a full emoji picker (8 categories) with optimistic updates.
- **Delete confirmation**: Deleting a board requires typing `Delete {board_name}` in the confirmation dialog.
- **Comments**: Each sticky note supports a threaded comment panel.
- **Action items**: Create trackable action items from sticky notes (Open → InProgress → Done).

### Canvas Drawing Tools (bottom toolbar)
- **Select tool**: Click, move, and resize elements (drag corners).
- **Text box**: Type text, double-click to edit.
- **Rectangle / Circle**: Drag to set size, double-click to add text.
- **Arrow**: Drag to draw, with endpoint preview.
- All elements support style customization (fill, border, text color, font size) and can be deleted with the Delete key.

### Collaboration
- **Real-time sync**: Sticky notes and canvas elements sync across users via Supabase Realtime.
- **Live cursors**: See all online members' cursor positions and nicknames.
- **Online members list**: Shows avatar chips for current users (up to 5 shown).
- **Identity**: After signing in, enter a nickname on the board — nickname and color are stored in sessionStorage.

### Other
- **Timer**: 3 / 5 / 10 minute countdown with an urgent alert when time is up.
- **Undo / Redo**: Full sticky note history (Cmd+Z / Cmd+Shift+Z).
- **Board sidebar**: Switch between all boards without returning to the home page.
- **Export to ClickUp**: Export all four sections to ClickUp Docs via a Claude Code MCP skill.
- **Share link**: One-click copy of the board URL.
- **Responsive**: Bottom toolbar scrolls horizontally on small screens.

## Tech Stack

| Layer | Technology |
|---|---|
| Framework | Next.js 16 (App Router) + TypeScript |
| Styling | Tailwind CSS v4 |
| Database | Supabase (PostgreSQL) |
| Realtime | Supabase Realtime (postgres_changes + broadcast + presence) |
| Auth | Supabase Auth (Email/Password + middleware) |
| Drag & Drop | @dnd-kit |
| Analytics | @vercel/analytics |
| Deployment | Vercel |

## Tools & Services

### Vercel
- **Purpose**: Deployment platform for Next.js (static pages + Serverless Functions)
- **Plan**: Free (Hobby)
- **Production URL**: https://retro-board-beryl.vercel.app

### Supabase
- **Purpose**: PostgreSQL database + real-time collaboration + user authentication
- **PostgreSQL**: Stores all application data (sessions, boards, sticky notes, canvas elements, etc.)
- **Realtime**: Multi-user sync via postgres_changes, broadcast, and presence
- **Auth**: Email/Password login; middleware protects all page routes

### ClickUp (MCP mode)
- **Purpose**: Export retrospective data to ClickUp Docs after each session
- **How it works**: User runs `/clickup-export <session-id>` in their local Claude Code CLI
- **Limitation**: The MCP Server runs locally only — **cannot be triggered directly from the Vercel web app**
- **Local setup**: Add ClickUp MCP Server to `~/.claude/settings.json` (`https://mcp.clickup.com/mcp`)

### @vercel/analytics
- **Purpose**: Automatically tracks page views and Web Vitals (LCP, FID, CLS)
- **View data**: Vercel Dashboard → Analytics tab

## Setup

### 1. Create a Supabase Project

Go to [supabase.com](https://supabase.com) and create a new project. Run the following migrations in order using the SQL Editor:

1. `supabase/migrations/001_initial.sql` — creates sessions, boards, sticky_notes, reactions, comments, action_items
2. `supabase/migrations/002_canvas_elements.sql` — creates canvas_elements (text, rect, circle, arrow)
3. `supabase/migrations/003_canvas_element_interactions.sql` — reactions and comments on canvas elements
4. `supabase/migrations/004_normalize_positions.sql` — normalizes sticky note positions (absolute pixels → 0.0–1.0 fractions)
5. `supabase/migrations/005_sticky_note_formatting.sql` — adds text formatting columns (is_bold / is_italic / is_underline)

All RLS policies are `allow_all`. Access is controlled at the application layer via Supabase Auth + middleware.

### 2. Configure Environment Variables

```bash
cp .env.example .env
```

```env
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key
NEXT_PUBLIC_BASE_URL=http://localhost:3000
```

### 3. Run Locally

```bash
npm install
npm run dev
# Open http://localhost:3000
```

## Common Commands

```bash
npm run dev       # dev server
npm run build     # production build
npm run lint      # ESLint check
```

## Usage

1. **Create a session**: Enter a Sprint number and session name on the home page.
2. **Share the link**: Copy the board URL and send it to your team.
3. **Enter a nickname**: Each participant enters a display name.
4. **Add sticky notes**: Click the `+` button in a section, or use the toolbar dropdown.
5. **Canvas tools**: Use the bottom toolbar to switch tools and draw text boxes, rectangles, circles, and arrows.
6. **Action items**: Hover a sticky note → click ✅ to create an action item; click "Action Items" in the toolbar to view the list.
7. **Export**: Click the "📤 Export" button → copy the command → run it in Claude Code.

## ClickUp Export Integration

This tool uses a **Claude Code MCP skill** pattern — Claude acts as the operator calling the ClickUp API. The web app never holds a ClickUp token.

**One-time setup**: Edit `~/.claude/settings.json` to add the ClickUp MCP Server:

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

**After each retrospective**:
1. Click the "📤 Export" button in the board toolbar.
2. Copy the command shown in the modal (format: `/clickup-export <session-id>`).
3. Paste and run it in a Claude Code session.

Claude fetches all four section data and creates a new page named `Sprint {N}` under the "Retro Record" document in ClickUp.

Target path: `Sygna > Sygna Docs (master) > Sygna Docs (Tech) > Retro Record > Sprint {N}`

## Keyboard Shortcuts

| Shortcut | Action |
|---|---|
| `Cmd/Ctrl + Z` | Undo |
| `Cmd/Ctrl + Shift + Z` | Redo |
| Double-click sticky note | Inline edit |
| `Enter` | Save edit |
| `Shift + Enter` | New line |
| `Escape` | Cancel edit |
| `Delete / Backspace` | Delete hovered sticky note or selected canvas element |

## Deploy to Vercel

```bash
npm i -g vercel
vercel login
vercel --prod
```

After deployment:

1. **Vercel environment variables**: Dashboard → Project → Settings → Environment Variables — add all four variables, set `NEXT_PUBLIC_BASE_URL` to your production URL.
2. **Supabase Auth URL**: Dashboard → Authentication → URL Configuration
   - Site URL → your production URL (e.g. `https://retro-board-beryl.vercel.app`)
   - Redirect URLs → add `https://your-domain.vercel.app/auth/callback`
3. Redeploy to apply the environment variables.

## Project Structure

```
retro-board/
├── middleware.ts                         # Auth guard: redirects unauthenticated users to /login
├── app/
│   ├── page.tsx                          # Home page (create / join session)
│   ├── login/                            # Login page (Supabase Auth)
│   ├── auth/callback/                    # OAuth callback handler
│   ├── board/[sessionId]/page.tsx        # Board page (SSR entry)
│   └── api/                              # REST API routes
│       ├── sessions/                     # Session CRUD
│       ├── sessions/[id]/export/         # Export payload
│       ├── boards/[boardId]/stickies/    # Sticky note CRUD
│       ├── boards/[boardId]/canvas-elements/
│       ├── boards/[boardId]/action-items/
│       ├── stickies/[id]/               # Sticky note PATCH/DELETE
│       ├── stickies/[id]/reactions/     # Emoji reaction toggle
│       ├── stickies/[id]/comments/      # Comments
│       ├── canvas-elements/[id]/        # Canvas element PATCH/DELETE
│       └── action-items/[id]/           # Action item PATCH/DELETE
├── components/
│   ├── board/
│   │   ├── Board.tsx                    # Main board: state, Realtime, DnD
│   │   ├── ResizableCanvas.tsx          # Resizable 2×2 canvas container
│   │   ├── Section.tsx                  # Quadrant section
│   │   ├── StickyNote.tsx               # Draggable sticky note (B/I/U formatting, resize)
│   │   ├── EmojiPicker.tsx              # Full emoji picker (8 categories)
│   │   ├── CanvasElement.tsx            # Canvas element (text/rect/circle/arrow)
│   │   └── CursorOverlay.tsx            # Live cursor display
│   ├── toolbar/
│   │   ├── Toolbar.tsx                  # Top toolbar
│   │   ├── BottomToolbar.tsx            # Bottom canvas toolbar
│   │   └── Timer.tsx                    # Countdown timer
│   ├── modals/
│   │   ├── NicknameModal.tsx            # Nickname input
│   │   ├── CommentPanel.tsx             # Comment side panel
│   │   ├── ActionItemModal.tsx          # Action items
│   │   ├── ExportModal.tsx              # ClickUp export
│   │   └── ConfirmDeleteModal.tsx       # Delete confirmation
│   └── sidebar/
│       └── BoardSidebar.tsx             # Board switcher sidebar
├── contexts/
│   └── UserContext.tsx                  # User identity (sessionStorage)
├── lib/
│   ├── supabase.ts                      # Browser + server Supabase clients
│   ├── constants.ts                     # SECTION_CONFIGS, color constants
│   ├── clickup.ts                       # Export payload types and formatting
│   └── navigation-events.ts             # Route progress events
├── types/
│   └── index.ts                         # All shared TypeScript interfaces
└── supabase/
    └── migrations/
        ├── 001_initial.sql              # Main table schema
        ├── 002_canvas_elements.sql      # canvas_elements table
        ├── 003_canvas_element_interactions.sql  # Canvas element reactions/comments
        ├── 004_normalize_positions.sql  # Position normalization (absolute → fraction)
        └── 005_sticky_note_formatting.sql  # Text formatting columns (is_bold/is_italic/is_underline)
```

## Conflict Resolution

MVP uses **last-write-wins**. When multiple users edit the same sticky note simultaneously, the last submission wins. Future upgrades could introduce locked editing or CRDTs.

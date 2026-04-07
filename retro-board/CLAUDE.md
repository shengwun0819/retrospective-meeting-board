# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Commands

```bash
npm run dev       # dev server at localhost:3000
npm run build     # production build
npm run lint      # ESLint with Next.js config
npx tsc --noEmit  # TypeScript type check (no test suite configured)
```

## Environment Setup

Copy `.env.example` to `.env` and fill in:

```env
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_ANON_KEY=
SUPABASE_SERVICE_ROLE_KEY=
NEXT_PUBLIC_BASE_URL=http://localhost:3000
```

Run migrations in order against your Supabase project (SQL Editor):
1. `supabase/migrations/001_initial.sql`
2. `supabase/migrations/002_canvas_elements.sql`
3. `supabase/migrations/003_canvas_element_interactions.sql`
4. `supabase/migrations/004_normalize_positions.sql`

## Architecture

**Stack:** Next.js 16 (App Router) + TypeScript + Tailwind CSS v4 + Supabase (PostgreSQL + Realtime)

### Data Flow

All mutations go through Next.js API routes → Supabase tables → Supabase `postgres_changes` realtime events → `Board.tsx` state updates. No client-side cache or state management library; all board state lives in `useState` within `Board.tsx`.

```
User action → API route (app/api/) → Supabase DB → postgres_changes → Board.tsx setState → re-render
```

Canvas element creation uses **optimistic UI**: a `temp_${Date.now()}` prefixed ID is added to state immediately, replaced with the real DB ID on API success. `handleUpdateElement` and `handleDeleteElement` in `Board.tsx` skip API calls for `temp_` IDs.

### Key Files

- **`app/board/[sessionId]/page.tsx`** — SSR entry; fetches session + board, renders `<Board>`
- **`components/board/Board.tsx`** — Central state owner: sticky notes, canvas elements, action items, online users, cursors, split positions, active tool, undo/redo stack. Sets up the Supabase realtime channel (`board:${boardId}`), wraps dnd-kit `DndContext`.
- **`components/board/ResizableCanvas.tsx`** — Renders the 2×2 layout with draggable dividers. Handles all canvas drawing pointer events (`onPointerDown/Move/Up` on the root div). Uses `data-no-draw` attribute on interactive children to guard against accidental creation triggers. Exposes its container ref via `forwardRef`.
- **`components/board/CanvasElement.tsx`** — Renders text/rect/circle/arrow elements. All interaction (drag-to-move, corner-resize, double-click-to-edit) uses Pointer Events API with `window.addEventListener` to avoid conflicts with the canvas container.
- **`components/board/StickyNote.tsx`** — Uses `useDraggable` from dnd-kit. Dragging is disabled when `activeTool !== 'select'`.
- **`lib/supabase.ts`** — `getSupabaseClient()` (browser singleton) and `createServerSupabaseClient()` (API routes/SSR); realtime throttled to 10 events/sec.
- **`contexts/UserContext.tsx`** — Anonymous user identity (ID, name, color) stored in `sessionStorage`; set via `NicknameModal` on first visit.
- **`types/index.ts`** — All shared TypeScript interfaces including `CanvasElement`, `CanvasTool`, `SectionId`.
- **`lib/constants.ts`** — `SECTION_CONFIGS` (4 sections with colors/emojis), `REACTIONS`, `NOTE_COLORS`, `USER_COLORS`.

### Realtime Channels

Single channel `board:${boardId}` with:
- `postgres_changes` for INSERT/UPDATE/DELETE on `sticky_notes`, `reactions`, `comments`, `action_items`
- `broadcast` for cursor position updates
- `presence` for online user tracking

### Database Tables

```
retro_sessions → boards (1:1) → sticky_notes, action_items, canvas_elements
sticky_notes → reactions, comments
```

All RLS policies are `allow_all` (no auth, MVP).

### Board Sections

Four sections in `lib/constants.ts`: `continue` (emerald), `stop` (rose), `invent` (amber), `act` (sky).

Layout in `ResizableCanvas.tsx`:
```
left/top  = continue  |  right/top  = stop
left/bot  = invent    |  right/bot  = act
```

### Notes Position Behavior

Sticky note `pos_x`/`pos_y` are **normalized fractions (0.0–1.0)** of the canvas width/height. CSS percentage positioning (`left: ${pos_x * 100}%`) makes notes appear at the same relative position on any screen size.

Positions are **only persisted to DB on explicit user drag-drop** (or auto-arrange). One visual-only adjustment happens in `Board.tsx` that does NOT write to DB:

- **Split divider change** (`useEffect` on `[splitX, splitY]`): notes in right sections shift by `dx / 100` fraction; notes in bottom sections shift by `dy / 100` fraction. This is exact because `splitX`/`splitY` are already percentages.

`migration 004_normalize_positions.sql` converts existing absolute-pixel rows to fractions using a 1440×810 reference canvas. Rows at `(0, 0)` are "unpositioned legacy" and are placed by the app on first load.

### Canvas Drawing Tools

Bottom toolbar (`BottomToolbar.tsx`) switches `activeTool` in `Board.tsx`. The tool state gates behavior in:
- `ResizableCanvas.tsx` — pointer handlers create elements when `activeTool !== 'select'`
- `StickyNote.tsx` — `useDraggable` disabled when `activeTool !== 'select'`

Drawing flow in `ResizableCanvas.tsx`:
- **arrow**: pointerDown starts `arrowStart`, pointerUp creates element if drag > 5px
- **text/rect/circle**: pointerDown starts `dragPreview`, pointerUp creates element with drag dimensions (default size if drag < 10px)

### ClickUp Export Integration

Export uses a **Claude Code MCP skill** pattern — the web app does not hold a ClickUp token.

1. User opens `ExportModal` → copies the `/clickup-export <session-id>` command
2. User runs it in a Claude Code session with ClickUp MCP Server configured
3. The `clickup-export` skill fetches `GET /api/sessions/[id]/export`, then calls `clickup_create_document_page`

Known IDs (do not re-fetch):
- Document ID: `rcj35-3025`
- Retro Record page ID: `rcj35-143178`

Target path: `Sygna > Sygna Docs (master) > Sygna Docs (Tech) > Retro Record > Sprint {N}`

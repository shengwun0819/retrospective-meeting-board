# Retro Board

Real-time sprint retrospective board for agile teams, following the **Continue / Stop / Invent / Act** framework.

## Features

- Four-quadrant board with real-time collaboration (no login required to join)
- Sticky notes — drag & drop, resize, color themes, author attribution
- Canvas drawing tools — text, rectangle, circle, arrow
- Emoji reactions, threaded comments, and action item tracking
- Undo / redo, copy & paste, keyboard shortcuts
- Online user presence and live cursors via Supabase Realtime
- Google OAuth for board owners
- Export to ClickUp Docs via Claude Code MCP integration

## Stack

- **Frontend:** Next.js 16 (App Router) · TypeScript · Tailwind CSS v4
- **Backend:** Supabase (PostgreSQL + Realtime)
- **Drag & Drop:** dnd-kit

## Getting Started

```bash
cd retro-board
cp .env.example .env
# Fill in NEXT_PUBLIC_SUPABASE_URL, NEXT_PUBLIC_SUPABASE_ANON_KEY, SUPABASE_SERVICE_ROLE_KEY
npm install
npm run dev
```

Run migrations in order via Supabase SQL Editor:
1. `supabase/migrations/001_initial.sql`
2. `supabase/migrations/002_canvas_elements.sql`
3. `supabase/migrations/003_canvas_element_interactions.sql`

## Project Structure

```
retro-board/   Next.js app
```

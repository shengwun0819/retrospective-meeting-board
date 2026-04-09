# Retro Board

Real-time sprint retrospective board for agile teams, following the **Continue / Stop / Invent / Act** framework.

## Features

- Four-quadrant board with real-time collaboration (login required)
- Sticky notes — drag & drop, resize, color themes, author attribution
- Text formatting — Bold / Italic / Underline, persisted to DB
- Emoji reactions (5 quick picks + full picker with 8 categories, ~600 emojis)
- Threaded comments with always-visible count badge; All Comments panel in toolbar
- Delete confirmation — requires typing `Delete {board_name}` before confirming
- Canvas drawing tools — text, rectangle, circle, arrow
- Action item tracking (Open → InProgress → Done)
- Undo / redo, keyboard shortcuts
- Online user presence and live cursors via Supabase Realtime
- Export to ClickUp Docs via Claude Code MCP integration
- Vercel Analytics (page views + Web Vitals)

## Stack

- **Frontend:** Next.js 16 (App Router) · TypeScript · Tailwind CSS v4
- **Backend:** Supabase (PostgreSQL + Realtime + Auth)
- **Drag & Drop:** dnd-kit
- **Analytics:** @vercel/analytics
- **Deployment:** Vercel

## Getting Started

```bash
cd retro-board
cp .env.example .env
# Fill in NEXT_PUBLIC_SUPABASE_URL, NEXT_PUBLIC_SUPABASE_ANON_KEY, SUPABASE_SERVICE_ROLE_KEY, NEXT_PUBLIC_BASE_URL
npm install
npm run dev
```

Run migrations in order via Supabase SQL Editor:
1. `supabase/migrations/001_initial.sql`
2. `supabase/migrations/002_canvas_elements.sql`
3. `supabase/migrations/003_canvas_element_interactions.sql`
4. `supabase/migrations/004_normalize_positions.sql`
5. `supabase/migrations/005_sticky_note_formatting.sql`
6. `supabase/migrations/006_team_and_feedback.sql`

## Commands

```bash
npm run dev       # dev server at localhost:3000
npm run build     # production build
npm run lint      # ESLint check
npm test          # Jest unit tests (watch mode)
npm run test:ci   # Jest CI mode with coverage report
```

## Testing & CI/CD

Unit tests use Jest + React Testing Library. Coverage includes auto-arrange logic, ConfirmDeleteModal, EmojiPicker, and AllCommentsPanel. See [`__tests__/README.md`](retro-board/__tests__/README.md) for details.

GitHub Actions (`.github/workflows/ci.yml`) runs lint, type check, and unit tests on every PR.

## Project Structure

```
retro-board/       Next.js app
  __tests__/       Jest unit tests
  .github/         GitHub Actions CI workflow
```

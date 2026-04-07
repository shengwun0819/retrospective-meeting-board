import { NextRequest, NextResponse } from 'next/server'
import { createServerSupabaseClient } from '@/lib/supabase'
import { buildRetroExportPayload } from '@/lib/clickup'

/**
 * GET /api/sessions/[id]/export
 *
 * 回傳格式化好的回顧資料 payload，供 ClickUp MCP Server 使用。
 * 實際的 ClickUp Doc Page 建立由 Claude Code（搭配 ClickUp MCP Server）執行，
 * 而非由此 API 直接呼叫 ClickUp REST API。
 */
export async function GET(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const supabase = createServerSupabaseClient()

  const { data: session, error: sessionError } = await supabase
    .from('retro_sessions')
    .select('*')
    .eq('id', id)
    .single()

  if (sessionError) return NextResponse.json({ error: 'Session not found' }, { status: 404 })

  const { data: board } = await supabase
    .from('boards')
    .select('*')
    .eq('session_id', id)
    .single()

  if (!board) return NextResponse.json({ error: 'Board not found' }, { status: 404 })

  const [{ data: allNotes }, { data: actionItems }] = await Promise.all([
    supabase.from('sticky_notes').select('*').eq('board_id', board.id),
    supabase.from('action_items').select('*').eq('board_id', board.id),
  ])

  const notes = allNotes ?? []
  const noteIds = notes.map((n) => n.id)

  const { data: allComments } = noteIds.length > 0
    ? await supabase.from('comments').select('*').in('sticky_note_id', noteIds).order('created_at', { ascending: true })
    : { data: [] }

  const notesWithComments = notes.map((n) => ({
    ...n,
    comments: (allComments ?? []).filter((c) => c.sticky_note_id === n.id),
  }))

  const payload = buildRetroExportPayload(
    session,
    notesWithComments,
    actionItems ?? []
  )

  return NextResponse.json({
    payload,
    meta: {
      boardId: board.id,
      sessionId: id,
      exportedAt: new Date().toISOString(),
    },
  })
}

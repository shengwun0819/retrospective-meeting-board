import { NextRequest, NextResponse } from 'next/server'
import { createServerSupabaseClient } from '@/lib/supabase'

export async function GET() {
  const supabase = createServerSupabaseClient()
  const { data, error } = await supabase
    .from('retro_sessions')
    .select('*')
    .order('created_at', { ascending: false })
    .limit(20)

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json(data)
}

export async function POST(req: NextRequest) {
  const supabase = createServerSupabaseClient()
  const body = await req.json()

  const { data: session, error: sessionError } = await supabase
    .from('retro_sessions')
    .insert({
      name: body.name,
      team: body.team,
      sprint_number: body.sprintNumber,
      start_date: body.startDate,
      end_date: body.endDate,
    })
    .select()
    .single()

  if (sessionError) return NextResponse.json({ error: sessionError.message }, { status: 500 })

  const { data: board, error: boardError } = await supabase
    .from('boards')
    .insert({ session_id: session.id, template_id: 'cisa' })
    .select()
    .single()

  if (boardError) return NextResponse.json({ error: boardError.message }, { status: 500 })

  return NextResponse.json({ session, board }, { status: 201 })
}

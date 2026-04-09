import { NextRequest, NextResponse } from 'next/server'
import { createServerSupabaseClient } from '@/lib/supabase'

export async function GET(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const supabase = createServerSupabaseClient()
  const { data: session, error } = await supabase
    .from('retro_sessions')
    .select('*')
    .eq('id', id)
    .single()

  if (error) return NextResponse.json({ error: error.message }, { status: 404 })

  const { data: board } = await supabase
    .from('boards')
    .select('*')
    .eq('session_id', id)
    .single()

  return NextResponse.json({ session, board })
}

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const body = await req.json()
  const supabase = createServerSupabaseClient()

  const updates: Record<string, unknown> = {}
  if ('team' in body) updates.team = body.team || null
  if ('sprint_number' in body) updates.sprint_number = body.sprint_number ?? null

  // Keep name in sync: "Team Sprint N Retro"
  if (updates.team || updates.sprint_number !== undefined) {
    const { data: existing } = await supabase.from('retro_sessions').select('team,sprint_number').eq('id', id).single()
    const t = 'team' in updates ? (updates.team as string) : existing?.team
    const s = 'sprint_number' in updates ? updates.sprint_number : existing?.sprint_number
    updates.name = `${t ?? 'Unknown'} Sprint ${s ?? '?'} Retro`
  }

  const { data, error } = await supabase
    .from('retro_sessions')
    .update(updates)
    .eq('id', id)
    .select()
    .single()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json(data)
}

export async function DELETE(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const supabase = createServerSupabaseClient()
  const { error } = await supabase
    .from('retro_sessions')
    .delete()
    .eq('id', id)

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return new NextResponse(null, { status: 204 })
}

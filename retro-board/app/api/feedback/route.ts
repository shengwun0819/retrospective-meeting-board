import { NextRequest, NextResponse } from 'next/server'
import { createServerSupabaseClient } from '@/lib/supabase'

export async function POST(req: NextRequest) {
  const { content } = await req.json()
  if (!content?.trim()) return NextResponse.json({ error: 'empty' }, { status: 400 })

  const supabase = createServerSupabaseClient()
  const { error } = await supabase.from('feedback').insert({ content: content.trim() })
  if (error) {
    // Table may not exist yet — log and still return 200 so UX isn't blocked
    console.error('Feedback insert error (table may not exist):', error.message)
  }

  return NextResponse.json({ ok: true })
}

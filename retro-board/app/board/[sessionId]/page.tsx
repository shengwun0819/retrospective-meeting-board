import { notFound } from 'next/navigation'
import Board from '@/components/board/Board'

interface PageProps {
  params: Promise<{ sessionId: string }>
}

export default async function BoardPage({ params }: PageProps) {
  const { sessionId } = await params
  const baseUrl = process.env.NEXT_PUBLIC_BASE_URL ?? 'http://localhost:3000'

  const res = await fetch(`${baseUrl}/api/sessions/${sessionId}`, {
    cache: 'no-store',
  })

  if (!res.ok) return notFound()

  const { session, board } = await res.json()

  if (!session || !board) return notFound()

  return (
    <Board
      sessionId={session.id}
      sessionName={session.name}
      team={session.team}
      sprintNumber={session.sprint_number}
      boardId={board.id}
    />
  )
}

export async function generateMetadata({ params }: PageProps) {
  const { sessionId } = await params
  const baseUrl = process.env.NEXT_PUBLIC_BASE_URL ?? 'http://localhost:3000'
  try {
    const res = await fetch(`${baseUrl}/api/sessions/${sessionId}`, {
      cache: 'no-store',
    })
    if (res.ok) {
      const { session } = await res.json()
      return {
        title: session?.sprint_number
          ? `Sprint ${session.sprint_number} Retro`
          : session?.name ?? 'Retro Board',
      }
    }
  } catch {}
  return { title: 'Retro Board' }
}

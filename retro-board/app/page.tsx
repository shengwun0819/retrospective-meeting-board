'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { RetroSession } from '@/types'
import { routerEvents } from '@/lib/navigation-events'
import ConfirmDeleteModal from '@/components/modals/ConfirmDeleteModal'
import { useUser } from '@/contexts/UserContext'

export default function HomePage() {
  const router = useRouter()
  const { authName, authEmail, signOut } = useUser()
  const [sessions, setSessions] = useState<RetroSession[]>([])
  const [showForm, setShowForm] = useState(false)
  const [joinId, setJoinId] = useState('')

  // Form state
  const [name, setName] = useState('')
  const [sprintNumber, setSprintNumber] = useState('')
  const [startDate, setStartDate] = useState('')
  const [endDate, setEndDate] = useState('')
  const [creating, setCreating] = useState(false)

  // Delete state
  const [deletingId, setDeletingId] = useState<string | null>(null)
  const [confirmSession, setConfirmSession] = useState<RetroSession | null>(null)

  useEffect(() => {
    fetch('/api/sessions')
      .then((r) => r.json())
      .then((data) => Array.isArray(data) && setSessions(data))
      .catch(() => {})
  }, [])

  const navigate = (path: string) => {
    routerEvents.start()
    router.push(path)
  }

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!name.trim()) return
    setCreating(true)
    try {
      const res = await fetch('/api/sessions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: name.trim(),
          sprintNumber: sprintNumber ? parseInt(sprintNumber) : undefined,
          startDate: startDate || undefined,
          endDate: endDate || undefined,
        }),
      })
      if (res.ok) {
        const { session } = await res.json()
        navigate(`/board/${session.id}`)
      }
    } finally {
      setCreating(false)
    }
  }

  const handleJoin = (e: React.FormEvent) => {
    e.preventDefault()
    const id = joinId.trim()
    if (!id) return
    const match = id.match(/([0-9a-f-]{36})/i)
    if (match) navigate(`/board/${match[1]}`)
  }

  const handleDelete = async () => {
    if (!confirmSession) return
    setDeletingId(confirmSession.id)
    setConfirmSession(null)
    try {
      await fetch(`/api/sessions/${confirmSession.id}`, { method: 'DELETE' })
      setSessions((prev) => prev.filter((s) => s.id !== confirmSession.id))
    } finally {
      setDeletingId(null)
    }
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-purple-50 flex flex-col items-center justify-center p-6 animate-fade-in">

      {/* User info — top-right */}
      {authName && (
        <div className="fixed top-4 right-4 z-10 flex items-center gap-2">
          <div className="flex items-center gap-2.5 bg-white rounded-2xl shadow-md px-3 py-2 border border-gray-100">
            <div
              className="w-8 h-8 rounded-full flex items-center justify-center text-white text-sm font-bold shrink-0"
              style={{ backgroundColor: '#3b82f6' }}
            >
              {authName.charAt(0).toUpperCase()}
            </div>
            <div className="leading-tight">
              <p className="text-sm font-semibold text-gray-800">{authName}</p>
              <p className="text-xs text-gray-400">{authEmail}</p>
            </div>
          </div>
          <button
            onClick={signOut}
            className="bg-white rounded-xl shadow-md px-3 py-2 text-sm text-gray-500 hover:text-red-500 border border-gray-100 hover:border-red-100 hover:bg-red-50 transition-all font-medium"
          >
            Sign out
          </button>
        </div>
      )}
      <div className="text-center mb-10">
        <div className="text-6xl mb-4">🔄</div>
        <h1 className="text-4xl font-bold text-gray-800 mb-3">Retro Board</h1>
        <p className="text-gray-500 text-lg max-w-md">
          Real-time sprint retrospective tool for agile teams.
          <br />
          No login required — just share the link.
        </p>
      </div>

      <div className="w-full max-w-md space-y-4">
        {/* Create New Session */}
        <div className="bg-white rounded-2xl shadow-lg p-6 border border-gray-100">
          <button
            onClick={() => setShowForm(!showForm)}
            className="w-full flex items-center justify-between"
          >
            <span className="text-lg font-bold text-gray-800">🚀 Start New Retro</span>
            <span
              className={`text-gray-400 text-xl font-light transition-transform duration-300 select-none ${
                showForm ? 'rotate-45' : ''
              }`}
            >
              +
            </span>
          </button>

          {/* Expanding form — CSS grid trick for smooth height animation */}
          <div
            className={`grid transition-all duration-300 ease-in-out ${
              showForm ? 'grid-rows-[1fr] opacity-100' : 'grid-rows-[0fr] opacity-0'
            }`}
          >
            <div className="overflow-hidden">
              <form onSubmit={handleCreate} className="mt-5 space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Session Name *</label>
                  <input
                    type="text"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    placeholder="e.g. Q1 Sprint 39 Retro"
                    className="w-full border border-gray-200 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:border-blue-500 transition-colors"
                    required
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Sprint Number</label>
                  <input
                    type="number"
                    value={sprintNumber}
                    onChange={(e) => setSprintNumber(e.target.value)}
                    placeholder="e.g. 39"
                    min={1}
                    className="w-full border border-gray-200 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:border-blue-500 transition-colors"
                  />
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Start Date</label>
                    <input
                      type="date"
                      value={startDate}
                      onChange={(e) => setStartDate(e.target.value)}
                      className="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:border-blue-500 transition-colors"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">End Date</label>
                    <input
                      type="date"
                      value={endDate}
                      onChange={(e) => setEndDate(e.target.value)}
                      className="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:border-blue-500 transition-colors"
                    />
                  </div>
                </div>

                <button
                  type="submit"
                  disabled={!name.trim() || creating}
                  className="w-full bg-blue-500 hover:bg-blue-600 text-white font-bold py-3 rounded-xl transition-all shadow-md disabled:opacity-50"
                >
                  {creating ? 'Creating...' : 'Create Board →'}
                </button>
              </form>
            </div>
          </div>
        </div>

        {/* Join Existing */}
        <div className="bg-white rounded-2xl shadow-lg p-6 border border-gray-100">
          <h2 className="text-lg font-bold text-gray-800 mb-4">🔗 Join Existing Board</h2>
          <form onSubmit={handleJoin} className="flex gap-2">
            <input
              type="text"
              value={joinId}
              onChange={(e) => setJoinId(e.target.value)}
              placeholder="Paste board link or UUID..."
              className="flex-1 border border-gray-200 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:border-blue-500 transition-colors"
            />
            <button
              type="submit"
              disabled={!joinId.trim()}
              className="bg-gray-800 hover:bg-gray-900 text-white px-4 py-2.5 rounded-xl text-sm font-medium transition-all disabled:opacity-50"
            >
              Join
            </button>
          </form>
        </div>

        {/* Recent Sessions */}
        {sessions.length > 0 && (
          <div className="bg-white rounded-2xl shadow-lg p-6 border border-gray-100">
            <h2 className="text-lg font-bold text-gray-800 mb-4">🕐 Recent Sessions</h2>
            <div className="space-y-2">
              {sessions.slice(0, 5).map((s) => (
                <div key={s.id} className="group flex items-center">
                  <button
                    onClick={() => navigate(`/board/${s.id}`)}
                    disabled={deletingId === s.id}
                    className="flex-1 text-left flex items-center justify-between px-4 py-3 rounded-xl hover:bg-gray-50 transition-colors border border-transparent hover:border-gray-200 disabled:opacity-40"
                  >
                    <div>
                      <p className="font-medium text-gray-800 text-sm">{s.name}</p>
                      <p className="text-xs text-gray-400 mt-0.5">
                        {s.sprint_number ? `Sprint ${s.sprint_number} · ` : ''}
                        {new Date(s.created_at).toLocaleDateString()}
                      </p>
                    </div>
                    <span className="text-gray-400 text-sm">
                      {deletingId === s.id ? 'Deleting...' : '→'}
                    </span>
                  </button>
                  <button
                    onClick={() => setConfirmSession(s)}
                    disabled={deletingId === s.id}
                    className="ml-1 p-2 rounded-lg text-gray-300 hover:text-red-400 hover:bg-red-50 opacity-0 group-hover:opacity-100 transition-all disabled:pointer-events-none"
                    title="Delete this board"
                  >
                    🗑️
                  </button>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      <p className="mt-10 text-xs text-gray-400">
        Built for agile teams · Continue / Stop / Invent / Act framework
      </p>

      {confirmSession && (
        <ConfirmDeleteModal
          boardName={confirmSession.sprint_number ? `Sprint ${confirmSession.sprint_number} — ${confirmSession.name}` : confirmSession.name}
          onConfirm={handleDelete}
          onCancel={() => setConfirmSession(null)}
        />
      )}
    </div>
  )
}

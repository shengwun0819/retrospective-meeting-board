'use client'

import ConfirmDeleteModal from '@/components/modals/ConfirmDeleteModal'
import { useUser } from '@/contexts/UserContext'
import { routerEvents } from '@/lib/navigation-events'
import { RetroSession } from '@/types'
import { useRouter, useSearchParams } from 'next/navigation'
import { Suspense, useCallback, useEffect, useState } from 'react'

const TEAMS = ['Sygna', 'Turing', 'Mobius', 'Crypto platform']

function HomePageInner() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const { authName, authEmail, signOut } = useUser()
  const [sessions, setSessions] = useState<RetroSession[]>([])
  const [loadingSessions, setLoadingSessions] = useState(true)
  const [showForm, setShowForm] = useState(false)
  const [joinId, setJoinId] = useState('')

  // Theme
  const [theme, setTheme] = useState<'light' | 'dark'>('light')

  // Form state
  const [sprintNumber, setSprintNumber] = useState('')
  const [team, setTeam] = useState('')
  const [teamError, setTeamError] = useState('')
  const [creating, setCreating] = useState(false)

  // Delete state
  const [deletingId, setDeletingId] = useState<string | null>(null)
  const [confirmSession, setConfirmSession] = useState<RetroSession | null>(null)

  // Load theme from localStorage
  useEffect(() => {
    const saved = localStorage.getItem('retro-theme') as 'light' | 'dark' | null
    if (saved) setTheme(saved)
  }, [])

  // Auto-expand form if ?create=1
  useEffect(() => {
    if (searchParams.get('create') === '1') setShowForm(true)
  }, [searchParams])

  useEffect(() => {
    fetch('/api/sessions')
      .then((r) => r.json())
      .then((data) => Array.isArray(data) && setSessions(data))
      .catch(() => {})
      .finally(() => setLoadingSessions(false))
  }, [])

  const toggleTheme = useCallback(() => {
    setTheme(t => {
      const next = t === 'light' ? 'dark' : 'light'
      localStorage.setItem('retro-theme', next)
      return next
    })
  }, [])

  const navigate = (path: string) => {
    routerEvents.start()
    router.push(path)
  }

  const handleTeamChange = (val: string) => {
    setTeam(val)
    setTeamError(val && !TEAMS.includes(val) ? `Please enter one of: ${TEAMS.join(', ')}` : '')
  }

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!team.trim()) { setTeamError('Team is required'); return }
    if (!TEAMS.includes(team.trim())) { setTeamError(`Please enter one of: ${TEAMS.join(', ')}`); return }
    setCreating(true)
    try {
      const res = await fetch('/api/sessions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: `${team.trim()} Sprint ${sprintNumber || '?'} Retro`,
          team: team.trim(),
          sprintNumber: sprintNumber ? parseInt(sprintNumber) : undefined,
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

  const isDark = theme === 'dark'

  return (
    <div
      className="min-h-screen flex flex-col items-center justify-center p-6 animate-fade-in relative overflow-hidden"
      style={{
        backgroundImage: `url('/bg-${theme}.png')`,
        backgroundSize: 'cover',
        backgroundPosition: 'center',
      }}
    >
      {/* Overlay for readability */}
      <div className={`absolute inset-0 ${isDark ? 'bg-black/60' : 'bg-white/55'}`} />

      {/* Content */}
      <div className="relative z-10 w-full flex flex-col items-center">

        {/* Top-right controls */}
        <div className="fixed top-4 right-4 z-20 flex items-center gap-2">
          {/* Theme toggle */}
          <button
            onClick={toggleTheme}
            className={`flex items-center gap-1.5 rounded-xl shadow-md px-3 py-2 text-sm font-medium border transition-all ${isDark ? 'bg-gray-800 text-gray-100 border-gray-700 hover:bg-gray-700' : 'bg-white text-gray-700 border-gray-100 hover:bg-gray-50'}`}
            title="Toggle theme"
          >
            {isDark ? '☀️' : '🌙'} {isDark ? 'Light' : 'Dark'}
          </button>

          {authName && (
            <>
              <div className={`flex items-center gap-2.5 rounded-2xl shadow-md px-3 py-2 border ${isDark ? 'bg-gray-800 border-gray-700' : 'bg-white border-gray-100'}`}>
                <div
                  className="w-8 h-8 rounded-full flex items-center justify-center text-white text-sm font-bold shrink-0"
                  style={{ backgroundColor: '#3b82f6' }}
                >
                  {authName.charAt(0).toUpperCase()}
                </div>
                <div className="leading-tight">
                  <p className={`text-sm font-semibold ${isDark ? 'text-gray-100' : 'text-gray-800'}`}>{authName}</p>
                  <p className={`text-xs ${isDark ? 'text-gray-400' : 'text-gray-400'}`}>{authEmail}</p>
                </div>
              </div>
              <button
                onClick={signOut}
                className={`rounded-xl shadow-md px-3 py-2 text-sm border font-medium transition-all ${isDark ? 'bg-gray-800 text-gray-400 border-gray-700 hover:text-red-400 hover:border-red-900 hover:bg-red-950' : 'bg-white text-gray-500 border-gray-100 hover:text-red-500 hover:border-red-100 hover:bg-red-50'}`}
              >
                Sign out
              </button>
            </>
          )}
        </div>

        {/* Hero */}
        <div className="text-center mb-10">
          <div className="text-6xl mb-4">🔄</div>
          <h1 className={`text-4xl font-bold mb-3 ${isDark ? 'text-white' : 'text-gray-800'}`}>CoolBitX Retro Board</h1>
          <p className={`text-lg max-w-md ${isDark ? 'text-gray-300' : 'text-gray-500'}`}>
            Real-time sprint retrospective tool for agile teams.
            <br />
            No login required — just share the link.
          </p>
        </div>

        <div className="w-full max-w-md space-y-4">
          {/* Create New Session */}
          <div className={`rounded-2xl shadow-lg p-6 border ${isDark ? 'bg-gray-900/90 border-gray-700' : 'bg-white border-gray-100'}`}>
            <button
              onClick={() => setShowForm(!showForm)}
              className="w-full flex items-center justify-between"
            >
              <span className={`text-lg font-bold ${isDark ? 'text-white' : 'text-gray-800'}`}>🚀 Start New Retro</span>
              <span
                className={`text-xl font-light transition-transform duration-300 select-none ${isDark ? 'text-gray-400' : 'text-gray-400'} ${showForm ? 'rotate-45' : ''}`}
              >
                +
              </span>
            </button>

            <div
              className={`grid transition-all duration-300 ease-in-out ${showForm ? 'grid-rows-[1fr] opacity-100' : 'grid-rows-[0fr] opacity-0'}`}
            >
              <div className="overflow-hidden">
                <form onSubmit={handleCreate} className="mt-5 space-y-4">
                  <div>
                    <label className={`block text-sm font-medium mb-1 ${isDark ? 'text-gray-200' : 'text-gray-700'}`}>Team *</label>
                    <p className={`text-xs mb-1.5 ${isDark ? 'text-gray-400' : 'text-gray-400'}`}>
                      Available teams: {TEAMS.join(' · ')}
                    </p>
                    <input
                      type="text"
                      value={team}
                      onChange={(e) => handleTeamChange(e.target.value)}
                      list="team-options"
                      placeholder="e.g. Sygna"
                      className={`w-full border rounded-xl px-4 py-2.5 text-sm focus:outline-none transition-colors ${teamError ? 'border-red-400 focus:border-red-500' : 'border-gray-200 focus:border-blue-500'} ${isDark ? 'bg-gray-800 text-white placeholder-gray-500' : 'bg-white text-gray-900'}`}
                      required
                    />
                    <datalist id="team-options">
                      {TEAMS.map(t => <option key={t} value={t} />)}
                    </datalist>
                    {teamError && <p className="text-xs text-red-500 mt-1">{teamError}</p>}
                  </div>

                  <div>
                    <label className={`block text-sm font-medium mb-1 ${isDark ? 'text-gray-200' : 'text-gray-700'}`}>Sprint Number</label>
                    <input
                      type="number"
                      value={sprintNumber}
                      onChange={(e) => setSprintNumber(e.target.value)}
                      placeholder="e.g. 42"
                      min={1}
                      className={`w-full border border-gray-200 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:border-blue-500 transition-colors ${isDark ? 'bg-gray-800 text-white border-gray-600 placeholder-gray-500' : 'bg-white text-gray-900'}`}
                    />
                  </div>

                  <button
                    type="submit"
                    disabled={!team.trim() || !!teamError || creating}
                    className="w-full bg-blue-500 hover:bg-blue-600 text-white font-bold py-3 rounded-xl transition-all shadow-md disabled:opacity-50"
                  >
                    {creating ? 'Creating...' : 'Create Board →'}
                  </button>
                </form>
              </div>
            </div>
          </div>

          {/* Join Existing */}
          <div className={`rounded-2xl shadow-lg p-6 border ${isDark ? 'bg-gray-900/90 border-gray-700' : 'bg-white border-gray-100'}`}>
            <h2 className={`text-lg font-bold mb-4 ${isDark ? 'text-white' : 'text-gray-800'}`}>🔗 Join Existing Board</h2>
            <form onSubmit={handleJoin} className="flex gap-2">
              <input
                type="text"
                value={joinId}
                onChange={(e) => setJoinId(e.target.value)}
                placeholder="Paste board link or UUID..."
                className={`flex-1 border rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:border-blue-500 transition-colors ${isDark ? 'bg-gray-800 text-white border-gray-600 placeholder-gray-500' : 'bg-white text-gray-900 border-gray-200'}`}
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
          {(loadingSessions || sessions.length > 0) && (
            <div className={`rounded-2xl shadow-lg p-6 border ${isDark ? 'bg-gray-900/90 border-gray-700' : 'bg-white border-gray-100'}`}>
              <h2 className={`text-lg font-bold mb-4 ${isDark ? 'text-white' : 'text-gray-800'}`}>🕐 Recent Sessions</h2>
              {loadingSessions ? (
                <div className="space-y-2">
                  {[...Array(3)].map((_, i) => (
                    <div key={i} className="flex items-center px-4 py-3 rounded-xl border border-gray-100">
                      <div className="flex-1 space-y-2">
                        <div className="h-3.5 bg-gray-100 rounded animate-pulse w-2/3" />
                        <div className="h-2.5 bg-gray-100 rounded animate-pulse w-1/3" />
                      </div>
                      <div className="h-3 w-4 bg-gray-100 rounded animate-pulse" />
                    </div>
                  ))}
                </div>
              ) : (
              <div className="space-y-2">
                {sessions.slice(0, 5).map((s) => (
                  <div key={s.id} className="group flex items-center">
                    <button
                      onClick={() => navigate(`/board/${s.id}`)}
                      disabled={deletingId === s.id}
                      className={`flex-1 text-left flex items-center justify-between px-4 py-3 rounded-xl transition-colors border border-transparent disabled:opacity-40 ${isDark ? 'hover:bg-gray-800 text-gray-100 hover:border-gray-700' : 'hover:bg-gray-50 hover:border-gray-200'}`}
                    >
                      <div>
                        <p className={`font-medium text-sm ${isDark ? 'text-gray-100' : 'text-gray-800'}`}>{s.name}</p>
                        <p className={`text-xs mt-0.5 ${isDark ? 'text-gray-400' : 'text-gray-400'}`}>
                          {s.sprint_number ? `Sprint ${s.sprint_number} · ` : ''}
                          {(s as RetroSession & { team?: string }).team ? `${(s as RetroSession & { team?: string }).team} · ` : ''}
                          {new Date(s.created_at).toLocaleDateString()}
                        </p>
                      </div>
                      <span className={`text-sm ${isDark ? 'text-gray-400' : 'text-gray-400'}`}>
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
              )}
            </div>
          )}
        </div>

        <p className={`mt-10 text-xs ${isDark ? 'text-gray-500' : 'text-gray-400'}`}>
          Built for agile teams · Continue / Stop / Invent / Act framework
        </p>
      </div>

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

export default function HomePage() {
  return (
    <Suspense>
      <HomePageInner />
    </Suspense>
  )
}

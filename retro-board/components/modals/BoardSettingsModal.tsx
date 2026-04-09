'use client'

import { useState } from 'react'
import { RetroSession } from '@/types'

const TEAMS = ['Sygna', 'Turing', 'Mobius', 'Crypto platform']

interface BoardSettingsModalProps {
  session: RetroSession
  onClose: () => void
  onSave: (updates: { team: string; sprint_number?: number }) => Promise<void>
}

export default function BoardSettingsModal({ session, onClose, onSave }: BoardSettingsModalProps) {
  const [team, setTeam] = useState(session.team ?? '')
  const [sprintNumber, setSprintNumber] = useState(session.sprint_number?.toString() ?? '')
  const [teamError, setTeamError] = useState('')
  const [saving, setSaving] = useState(false)

  const handleTeamChange = (val: string) => {
    setTeam(val)
    setTeamError(val && !TEAMS.includes(val) ? `Please enter one of: ${TEAMS.join(', ')}` : '')
  }

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault()
    if (team && !TEAMS.includes(team)) { setTeamError(`Please enter one of: ${TEAMS.join(', ')}`); return }
    setSaving(true)
    try {
      await onSave({
        team: team.trim(),
        sprint_number: sprintNumber ? parseInt(sprintNumber) : undefined,
      })
      onClose()
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="fixed inset-0 bg-black/30 backdrop-blur-sm flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-sm flex flex-col">
        <div className="p-5 border-b border-gray-200 flex items-center justify-between">
          <h2 className="font-bold text-gray-800 text-lg">⚙️ Board Settings</h2>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600 text-2xl leading-none">×</button>
        </div>

        <form onSubmit={handleSave} className="p-5 space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Team</label>
            <p className="text-xs text-gray-400 mb-1.5">Available: {TEAMS.join(' · ')}</p>
            <input
              type="text"
              value={team}
              onChange={(e) => handleTeamChange(e.target.value)}
              list="settings-team-options"
              placeholder="e.g. Sygna"
              className={`w-full border rounded-xl px-4 py-2.5 text-sm focus:outline-none transition-colors ${teamError ? 'border-red-400 focus:border-red-500' : 'border-gray-200 focus:border-blue-500'}`}
            />
            <datalist id="settings-team-options">
              {TEAMS.map(t => <option key={t} value={t} />)}
            </datalist>
            {teamError && <p className="text-xs text-red-500 mt-1">{teamError}</p>}
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Sprint Number</label>
            <input
              type="number"
              value={sprintNumber}
              onChange={(e) => setSprintNumber(e.target.value)}
              placeholder="e.g. 42"
              min={1}
              className="w-full border border-gray-200 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:border-blue-500 transition-colors"
            />
          </div>

          <div className="flex gap-3 pt-2">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 bg-gray-100 hover:bg-gray-200 text-gray-700 font-medium py-2.5 rounded-xl transition-all text-sm"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={!!teamError || saving}
              className="flex-1 bg-blue-500 hover:bg-blue-600 text-white font-medium py-2.5 rounded-xl transition-all text-sm disabled:opacity-50"
            >
              {saving ? 'Saving...' : 'Save'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}

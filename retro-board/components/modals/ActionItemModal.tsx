'use client'

import { useState } from 'react'
import { StickyNote, ActionItem } from '@/types'

interface ActionItemModalProps {
  note: StickyNote | null
  initialTitle?: string
  initialView?: 'list' | 'create'
  existingItems: ActionItem[]
  currentUser: { id: string; name: string } | null
  onClose: () => void
  onCreate: (item: Partial<ActionItem>) => Promise<void>
  onUpdateStatus: (id: string, status: ActionItem['status']) => Promise<void>
  onDelete: (id: string) => Promise<void>
}

export default function ActionItemModal({
  note,
  initialTitle,
  initialView = 'list',
  existingItems,
  currentUser,
  onClose,
  onCreate,
  onUpdateStatus,
  onDelete,
}: ActionItemModalProps) {
  const [title, setTitle] = useState(note?.content ?? initialTitle ?? '')
  const [description, setDescription] = useState('')
  const [ownerName, setOwnerName] = useState(currentUser?.name ?? '')
  const [dueDate, setDueDate] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [view, setView] = useState<'list' | 'create'>(initialView)

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!title.trim()) return
    setSubmitting(true)
    try {
      await onCreate({
        source_sticky_note_id: note?.id,
        title: title.trim(),
        description: description.trim() || undefined,
        owner_name: ownerName.trim() || undefined,
        due_date: dueDate || undefined,
        status: 'Open',
      })
      setTitle('')
      setDescription('')
      setDueDate('')
      setView('list')
    } finally {
      setSubmitting(false)
    }
  }

  const statusColors: Record<ActionItem['status'], string> = {
    Open: 'bg-gray-100 text-gray-600',
    InProgress: 'bg-blue-100 text-blue-700',
    Done: 'bg-green-100 text-green-700',
  }

  const statusNext: Record<ActionItem['status'], ActionItem['status']> = {
    Open: 'InProgress',
    InProgress: 'Done',
    Done: 'Open',
  }

  return (
    <div className="fixed inset-0 bg-black/30 backdrop-blur-sm flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg max-h-[85vh] flex flex-col">
        {/* Header */}
        <div className="p-5 border-b border-gray-200 flex items-center justify-between">
          <h2 className="font-bold text-gray-800 text-lg">✅ Action Items</h2>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600 text-2xl leading-none">×</button>
        </div>

        {/* Tabs */}
        <div className="flex border-b border-gray-200">
          <button
            onClick={() => setView('list')}
            className={`flex-1 py-2.5 text-sm font-medium transition-all ${view === 'list' ? 'border-b-2 border-blue-500 text-blue-600' : 'text-gray-500 hover:text-gray-700'}`}
          >
            All Items ({existingItems.length})
          </button>
          <button
            onClick={() => setView('create')}
            className={`flex-1 py-2.5 text-sm font-medium transition-all ${view === 'create' ? 'border-b-2 border-blue-500 text-blue-600' : 'text-gray-500 hover:text-gray-700'}`}
          >
            + New Item
          </button>
        </div>

        <div className="flex-1 overflow-y-auto">
          {view === 'list' ? (
            <div className="p-4 space-y-3">
              {existingItems.length === 0 ? (
                <div className="text-center py-12 text-gray-400">
                  <p className="text-4xl mb-3">📋</p>
                  <p className="text-sm">No action items yet.</p>
                  <button
                    onClick={() => setView('create')}
                    className="mt-3 text-blue-500 hover:text-blue-600 text-sm font-medium"
                  >
                    Create the first one →
                  </button>
                </div>
              ) : (
                existingItems.map((item) => (
                  <div key={item.id} className="border border-gray-200 rounded-xl p-3 hover:border-gray-300 transition-colors">
                    <div className="flex items-start gap-3">
                      <button
                        onClick={() => onUpdateStatus(item.id, statusNext[item.status])}
                        className={`mt-0.5 shrink-0 text-xs rounded-full px-2 py-0.5 font-medium transition-all hover:opacity-80 ${statusColors[item.status]}`}
                      >
                        {item.status}
                      </button>
                      <div className="flex-1 min-w-0">
                        <p className={`text-sm font-medium text-gray-800 ${item.status === 'Done' ? 'line-through text-gray-400' : ''}`}>
                          {item.title}
                        </p>
                        {item.description && (
                          <p className="text-xs text-gray-500 mt-0.5 truncate">{item.description}</p>
                        )}
                        <div className="flex gap-3 mt-1 text-xs text-gray-400">
                          {item.owner_name && <span>👤 {item.owner_name}</span>}
                          {item.due_date && <span>📅 {item.due_date}</span>}
                        </div>
                      </div>
                      <button
                        onClick={() => onDelete(item.id)}
                        className="text-gray-300 hover:text-red-400 transition-colors shrink-0"
                      >
                        ×
                      </button>
                    </div>
                  </div>
                ))
              )}
            </div>
          ) : (
            <form onSubmit={handleCreate} className="p-4 space-y-4">
              {note && (
                <div
                  className="p-3 rounded-xl text-sm text-gray-700"
                  style={{ backgroundColor: note.color }}
                >
                  <p className="text-xs text-gray-500 mb-1">From sticky note:</p>
                  <p className="font-medium line-clamp-2">{note.content}</p>
                </div>
              )}

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Title *</label>
                <input
                  type="text"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  className="w-full border border-gray-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:border-blue-500 transition-colors"
                  placeholder="What needs to be done?"
                  required
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Description</label>
                <textarea
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  className="w-full border border-gray-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:border-blue-500 transition-colors resize-none"
                  rows={2}
                  placeholder="Optional details..."
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Owner</label>
                  <input
                    type="text"
                    value={ownerName}
                    onChange={(e) => setOwnerName(e.target.value)}
                    className="w-full border border-gray-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:border-blue-500 transition-colors"
                    placeholder="Who's responsible?"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Due Date</label>
                  <input
                    type="date"
                    value={dueDate}
                    onChange={(e) => setDueDate(e.target.value)}
                    className="w-full border border-gray-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:border-blue-500 transition-colors"
                  />
                </div>
              </div>

              <button
                type="submit"
                disabled={!title.trim() || submitting}
                className="w-full bg-blue-500 hover:bg-blue-600 text-white font-medium py-2.5 rounded-xl transition-all disabled:opacity-50"
              >
                {submitting ? 'Creating...' : 'Create Action Item'}
              </button>
            </form>
          )}
        </div>
      </div>
    </div>
  )
}

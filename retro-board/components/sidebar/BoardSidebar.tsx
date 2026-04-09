'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { RetroSession } from '@/types'

interface BoardSidebarProps {
  currentSessionId: string
  isOpen: boolean
  onClose: () => void
}

export default function BoardSidebar({ currentSessionId, isOpen, onClose }: BoardSidebarProps) {
  const [sessions, setSessions] = useState<RetroSession[]>([])
  const [loading, setLoading] = useState(false)
  const [showHelp, setShowHelp] = useState(false)

  useEffect(() => {
    if (!isOpen) return
    const t = setTimeout(() => setLoading(true), 0)
    fetch('/api/sessions')
      .then((r) => (r.ok ? r.json() : []))
      .then((data) => setSessions(data))
      .finally(() => setLoading(false))
    return () => clearTimeout(t)
  }, [isOpen])

  const formatDate = (dateStr: string) => {
    const d = new Date(dateStr)
    return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
  }

  return (
    <>
      {/* 背景遮罩（模糊） */}
      <div
        className={`fixed inset-0 z-30 transition-all duration-300 ${
          isOpen ? 'bg-black/20 backdrop-blur-sm pointer-events-auto' : 'opacity-0 pointer-events-none'
        }`}
        onClick={onClose}
      />

      {/* Sidebar 本體 */}
      <aside
        className={`fixed left-0 top-0 bottom-0 w-72 bg-white shadow-2xl z-40 flex flex-col transform transition-transform duration-300 ease-in-out ${
          isOpen ? 'translate-x-0' : '-translate-x-full'
        }`}
      >
        {/* 標題列 */}
        <div className="h-14 px-4 border-b border-gray-200 flex items-center justify-between shrink-0">
          <span className="font-bold text-xl text-gray-800 flex items-center gap-2">
            <span>🗂️</span> All Boards
          </span>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 transition-colors text-xl leading-none w-7 h-7 flex items-center justify-center rounded hover:bg-gray-100"
          >
            ×
          </button>
        </div>

        {/* 回首頁按鈕 */}
        <Link
          href="/"
          className="mx-3 mt-3 flex items-center gap-2 px-3 py-2.5 rounded-xl text-xl font-medium text-gray-600 hover:bg-gray-100 transition-colors border border-gray-200"
          onClick={onClose}
        >
          <span>🏠</span>
          <span>Home</span>
        </Link>

        <div className="px-3 mt-4 mb-2">
          <p className="text-sm font-semibold text-gray-400 uppercase tracking-wider">Recent Boards</p>
        </div>

        {/* 看板列表 */}
        <div className="flex-1 overflow-y-auto px-3 pb-4 space-y-1">
          {loading ? (
            <div className="py-8 text-center text-gray-400 text-xl">Loading...</div>
          ) : sessions.length === 0 ? (
            <div className="py-8 text-center text-gray-400 text-xl">No boards yet</div>
          ) : (
            sessions.map((session) => {
              const isCurrent = session.id === currentSessionId
              return (
                <Link
                  key={session.id}
                  href={`/board/${session.id}`}
                  onClick={onClose}
                  className={`block px-3 py-2.5 rounded-xl text-xl transition-colors ${
                    isCurrent
                      ? 'bg-blue-50 border border-blue-200 text-blue-700'
                      : 'hover:bg-gray-50 text-gray-700 border border-transparent'
                  }`}
                >
                  <div className="flex items-start justify-between gap-2">
                    <div className="min-w-0">
                      <p className="font-medium truncate">{session.name}</p>
                      {session.sprint_number && (
                        <p className="text-sm text-gray-400 mt-0.5">Sprint {session.sprint_number}</p>
                      )}
                    </div>
                    <div className="shrink-0 text-sm text-gray-400 mt-0.5">
                      {formatDate(session.created_at)}
                    </div>
                  </div>
                  {isCurrent && (
                    <span className="inline-block mt-1 text-xs bg-blue-100 text-blue-600 rounded-full px-2 py-0.5">
                      Current
                    </span>
                  )}
                </Link>
              )
            })
          )}
        </div>

        {/* 新增看板捷徑 */}
        <div className="p-3 border-t border-gray-200 shrink-0 space-y-2">
          <Link
            href="/?create=1"
            onClick={onClose}
            className="flex items-center justify-center gap-2 w-full py-2 rounded-xl text-xl font-medium text-blue-600 hover:bg-blue-50 transition-colors border border-blue-200"
          >
            <span>＋</span> New Board
          </Link>
          <button
            onClick={() => setShowHelp(true)}
            className="flex items-center justify-center gap-2 w-full py-2 rounded-xl text-xl font-medium text-gray-500 hover:bg-gray-50 transition-colors border border-gray-100"
          >
            <span>💡</span> Help
          </button>
        </div>
      </aside>

      {/* Help Modal */}
      {showHelp && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm" onClick={() => setShowHelp(false)}>
          <div className="bg-white rounded-2xl shadow-2xl w-96 max-h-[80vh] overflow-y-auto p-6" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between mb-4">
              <h2 className="font-bold text-lg text-gray-800">Help</h2>
              <button onClick={() => setShowHelp(false)} className="text-gray-400 hover:text-gray-600 text-xl leading-none w-7 h-7 flex items-center justify-center rounded hover:bg-gray-100">×</button>
            </div>

            <div className="space-y-4 text-sm text-gray-700">
              <section>
                <h3 className="font-semibold text-gray-800 mb-1">Sticky Notes</h3>
                <ul className="space-y-1 text-gray-600 list-none pl-0">
                  <li>• Double-click to edit content</li>
                  <li>• Drag notes to different sections</li>
                  <li>• Click a note to keep the toolbar visible</li>
                  <li>• Click the author name to edit it</li>
                </ul>
              </section>

              <section>
                <h3 className="font-semibold text-gray-800 mb-1">Keyboard Shortcuts</h3>
                <ul className="space-y-1 text-gray-600 list-none pl-0">
                  <li>• Ctrl+Z to undo</li>
                  <li>• Ctrl+Shift+Z to redo</li>
                  <li>• Ctrl+C to copy a hovered note</li>
                  <li>• Ctrl+V to paste (auto-applies section color)</li>
                  <li>• Delete/Backspace to delete</li>
                </ul>
              </section>

              <section>
                <h3 className="font-semibold text-gray-800 mb-1">Canvas Tools (bottom toolbar)</h3>
                <ul className="space-y-1 text-gray-600 list-none pl-0">
                  <li>• Select, Text, Rect, Circle, Arrow — drag to create</li>
                </ul>
              </section>

              <section>
                <h3 className="font-semibold text-gray-800 mb-1">Collaboration</h3>
                <ul className="space-y-1 text-gray-600 list-none pl-0">
                  <li>• Hover reactions to see who left them</li>
                  <li>• Comments 💬</li>
                  <li>• Action items ✅</li>
                  <li>• Share link 🔗</li>
                </ul>
              </section>
            </div>
          </div>
        </div>
      )}
    </>
  )
}

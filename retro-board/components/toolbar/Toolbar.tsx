'use client'

import { useState, useRef } from 'react'
import Timer from './Timer'
import { OnlineUser } from '@/types'
import { SECTION_CONFIGS } from '@/lib/constants'
import ConfirmDeleteModal from '@/components/modals/ConfirmDeleteModal'

interface ToolbarProps {
  sessionName: string
  sprintNumber?: number
  onlineUsers: OnlineUser[]
  currentUser: { id: string; name: string; color: string } | null
  onAddNote: (sectionId: string) => void
  onShowActionItems: () => void
  actionItemCount: number
  onExport: () => void
  boardLink: string
  onToggleSidebar: () => void
  onDeleteBoard: () => void
  onShowAllComments: () => void
  totalCommentCount: number
}

export default function Toolbar({
  sessionName,
  sprintNumber,
  onlineUsers,
  currentUser,
  onAddNote,
  onShowActionItems,
  actionItemCount,
  onExport,
  boardLink,
  onToggleSidebar,
  onDeleteBoard,
  onShowAllComments,
  totalCommentCount,
}: ToolbarProps) {
  const [copied, setCopied] = useState(false)
  const [showSectionPicker, setShowSectionPicker] = useState(false)
  const [sectionPickerPos, setSectionPickerPos] = useState({ top: 60, left: 0 })
  const [showDeleteModal, setShowDeleteModal] = useState(false)
  const sectionPickerRef = useRef<HTMLDivElement>(null)

  const copyLink = async () => {
    await navigator.clipboard.writeText(boardLink)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  return (
    <>
      <header className="fixed top-0 left-0 right-0 z-40 bg-white border-b-2 border-gray-200 shadow-md h-14 overflow-x-auto">
      <div className="flex items-center px-4 gap-3 h-full min-w-max">
        {/* Sidebar 切換按鈕 */}
        <button
          onClick={onToggleSidebar}
          className="p-1.5 rounded-lg hover:bg-gray-100 transition-colors text-gray-600 shrink-0"
          title="Toggle sidebar"
        >
          <svg width="18" height="18" viewBox="0 0 18 18" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
            <line x1="2" y1="4.5" x2="16" y2="4.5" />
            <line x1="2" y1="9" x2="16" y2="9" />
            <line x1="2" y1="13.5" x2="16" y2="13.5" />
          </svg>
        </button>

        {/* Session Title + Delete */}
        <div className="flex items-center gap-2 min-w-0">
          <span className="text-xl">🔄</span>
          <div className="min-w-0">
            <h1 className="font-bold text-gray-800 text-sm leading-tight truncate">
              {sprintNumber ? `Sprint ${sprintNumber}` : sessionName}
            </h1>
            {sprintNumber && (
              <p className="text-xs text-gray-500 truncate">{sessionName}</p>
            )}
          </div>
          <button
            onClick={() => setShowDeleteModal(true)}
            className="p-1 rounded text-gray-300 hover:text-red-400 hover:bg-red-50 transition-all"
            title="Delete this board"
          >
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <polyline points="3 6 5 6 21 6" />
              <path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6" />
              <path d="M10 11v6M14 11v6" />
              <path d="M9 6V4a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v2" />
            </svg>
          </button>
        </div>

        <div className="h-6 w-px bg-gray-200" />

        {/* Add Note — section picker */}
        <div className="relative" ref={sectionPickerRef}>
          <button
            onClick={() => {
              if (sectionPickerRef.current) {
                const rect = sectionPickerRef.current.getBoundingClientRect()
                setSectionPickerPos({ top: rect.bottom + 4, left: rect.left })
              }
              setShowSectionPicker(!showSectionPicker)
            }}
            className="flex items-center gap-1.5 bg-yellow-400 hover:bg-yellow-500 text-yellow-900 px-3 py-1.5 rounded-lg text-sm font-medium transition-all shadow-sm"
            title="Add sticky note"
          >
            <span>📝</span>
            <span className="hidden sm:inline">Add Note</span>
            <span className="text-yellow-700 text-xs">▾</span>
          </button>
          {showSectionPicker && (
            <div
              className="fixed bg-white rounded-xl shadow-xl border border-gray-200 py-1 z-50 w-44"
              style={{ top: sectionPickerPos.top, left: sectionPickerPos.left }}
            >
              {SECTION_CONFIGS.map((s) => (
                <button
                  key={s.id}
                  onClick={() => { onAddNote(s.id); setShowSectionPicker(false) }}
                  className="w-full text-left px-3 py-2 text-sm hover:bg-gray-50 flex items-center gap-2 transition-colors"
                >
                  <span>{s.emoji}</span>
                  <span className="text-gray-700">{s.title}</span>
                </button>
              ))}
            </div>
          )}
        </div>

        <div className="h-6 w-px bg-gray-200" />

        {/* Timer */}
        <Timer />

        <div className="flex-1" />

        {/* All Comments */}
        <button
          onClick={onShowAllComments}
          className="flex items-center gap-1.5 border border-gray-200 hover:border-gray-300 px-3 py-1.5 rounded-lg text-sm transition-all relative"
          title="All comments"
        >
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/>
          </svg>
          <span className="hidden sm:inline text-gray-600">Comments</span>
          {totalCommentCount > 0 && (
            <span className="absolute -top-1.5 -right-1.5 bg-blue-500 text-white text-xs rounded-full w-4 h-4 flex items-center justify-center font-bold">
              {totalCommentCount > 99 ? '99+' : totalCommentCount}
            </span>
          )}
        </button>

        {/* Action Items */}
        <button
          onClick={onShowActionItems}
          className="flex items-center gap-1.5 border border-gray-200 hover:border-gray-300 px-3 py-1.5 rounded-lg text-sm transition-all relative"
          title="Action items"
        >
          <span>✅</span>
          <span className="hidden sm:inline text-gray-600">Action Items</span>
          {actionItemCount > 0 && (
            <span className="absolute -top-1.5 -right-1.5 bg-blue-500 text-white text-xs rounded-full w-4 h-4 flex items-center justify-center font-bold">
              {actionItemCount}
            </span>
          )}
        </button>

        {/* Export to ClickUp */}
        <button
          onClick={onExport}
          className="flex items-center gap-1.5 border border-purple-200 hover:border-purple-400 text-purple-700 px-3 py-1.5 rounded-lg text-sm transition-all"
          title="Export to ClickUp Docs"
        >
          <span>📤</span>
          <span className="hidden md:inline">Export</span>
        </button>

        {/* Share Link */}
        <button
          onClick={copyLink}
          className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm transition-all ${
            copied ? 'bg-green-100 text-green-700' : 'border border-gray-200 hover:border-gray-300 text-gray-600'
          }`}
          title="Copy board link"
        >
          <span>{copied ? '✓' : '🔗'}</span>
          <span className="hidden sm:inline">{copied ? 'Copied!' : 'Share'}</span>
        </button>

        <div className="h-6 w-px bg-gray-200" />

        {/* Online Users */}
        <div className="flex items-center gap-1">
          {onlineUsers.slice(0, 5).map((u) => (
            <div
              key={u.id}
              className="w-7 h-7 rounded-full flex items-center justify-center text-white text-xs font-bold border-2 border-white shadow-sm -ml-1 first:ml-0"
              style={{ backgroundColor: u.color }}
              title={u.name}
            >
              {u.name.charAt(0).toUpperCase()}
            </div>
          ))}
          {onlineUsers.length > 5 && (
            <div className="w-7 h-7 rounded-full bg-gray-300 flex items-center justify-center text-xs font-bold text-gray-600 -ml-1 border-2 border-white">
              +{onlineUsers.length - 5}
            </div>
          )}
          {currentUser && (
            <div
              className="w-7 h-7 rounded-full flex items-center justify-center text-white text-xs font-bold border-2 border-blue-300 shadow-sm ml-1"
              style={{ backgroundColor: currentUser.color }}
              title={`${currentUser.name} (you)`}
            >
              {currentUser.name.charAt(0).toUpperCase()}
            </div>
          )}
        </div>
      </div>
      </header>

      {/* Click outside to close dropdowns */}
      {showSectionPicker && (
        <div
          className="fixed inset-0 z-30"
          onClick={() => setShowSectionPicker(false)}
        />
      )}

      {showDeleteModal && (
        <ConfirmDeleteModal
          boardName={sprintNumber ? `Sprint ${sprintNumber} — ${sessionName}` : sessionName}
          onConfirm={() => { setShowDeleteModal(false); onDeleteBoard() }}
          onCancel={() => setShowDeleteModal(false)}
        />
      )}
    </>
  )
}

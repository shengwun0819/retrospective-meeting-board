'use client'

import { useEffect } from 'react'
import { StickyNote, Comment } from '@/types'
import { SECTION_CONFIGS } from '@/lib/constants'

interface AllCommentsPanelProps {
  notes: StickyNote[]
  currentUser: { id: string; name: string; color: string } | null
  onClose: () => void
  onOpenNote: (note: StickyNote) => void
  onDeleteComment: (commentId: string) => void
}

export default function AllCommentsPanel({
  notes,
  currentUser,
  onClose,
  onOpenNote,
  onDeleteComment,
}: AllCommentsPanelProps) {
  // Close on Escape
  useEffect(() => {
    const handleKey = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose() }
    window.addEventListener('keydown', handleKey)
    return () => window.removeEventListener('keydown', handleKey)
  }, [onClose])

  const notesWithComments = notes.filter(n => (n.comments?.length ?? 0) > 0)
  const totalComments = notesWithComments.reduce((sum, n) => sum + (n.comments?.length ?? 0), 0)

  const getSectionConfig = (sectionId: string) =>
    SECTION_CONFIGS.find(s => s.id === sectionId)

  const formatTime = (iso: string) => {
    const d = new Date(iso)
    return d.toLocaleDateString() + ' ' + d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
  }

  return (
    <div className="fixed inset-y-0 right-0 z-50 flex">
      {/* Backdrop */}
      <div className="fixed inset-0 bg-black/20" onClick={onClose} />

      {/* Panel */}
      <div className="relative ml-auto w-80 bg-white shadow-2xl flex flex-col border-l border-gray-200 animate-slide-in-right">
        {/* Header */}
        <div className="flex items-center justify-between px-4 py-3 border-b border-gray-100">
          <div>
            <h2 className="font-bold text-gray-800 flex items-center gap-2">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/>
              </svg>
              All Comments
            </h2>
            <p className="text-xs text-gray-400 mt-0.5">
              {totalComments} comment{totalComments !== 1 ? 's' : ''} across {notesWithComments.length} note{notesWithComments.length !== 1 ? 's' : ''}
            </p>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg hover:bg-gray-100 text-gray-400 transition-colors"
          >
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/>
            </svg>
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto">
          {notesWithComments.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-full text-gray-400 gap-2 p-8">
              <svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/>
              </svg>
              <p className="text-sm">No comments yet</p>
            </div>
          ) : (
            <div className="divide-y divide-gray-100">
              {notesWithComments.map((note) => {
                const sectionConfig = getSectionConfig(note.section_id)
                return (
                  <div key={note.id} className="p-4">
                    {/* Note header */}
                    <div className="flex items-start gap-2 mb-3">
                      <div
                        className="w-2.5 h-2.5 rounded-full mt-1.5 shrink-0"
                        style={{ backgroundColor: note.color }}
                      />
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-1.5 mb-0.5">
                          {sectionConfig && (
                            <span className="text-xs text-gray-400">{sectionConfig.emoji} {sectionConfig.title}</span>
                          )}
                        </div>
                        <p className="text-sm font-medium text-gray-800 line-clamp-2">
                          {note.content || <span className="text-gray-400 italic">Empty note</span>}
                        </p>
                        <p className="text-xs text-gray-400 mt-0.5">— {note.author_name}</p>
                      </div>
                      <button
                        onClick={() => onOpenNote(note)}
                        className="text-xs text-blue-500 hover:text-blue-700 shrink-0 px-2 py-1 rounded hover:bg-blue-50 transition-colors"
                        title="Open comment panel for this note"
                      >
                        Reply
                      </button>
                    </div>

                    {/* Comments list */}
                    <div className="space-y-2 pl-4">
                      {(note.comments ?? []).map((comment: Comment) => (
                        <div key={comment.id} className="group bg-gray-50 rounded-lg px-3 py-2">
                          <div className="flex items-start justify-between gap-2">
                            <div className="flex-1 min-w-0">
                              <span className="text-xs font-semibold text-gray-600">{comment.author_name}</span>
                              <span className="text-xs text-gray-400 ml-1.5">{formatTime(comment.created_at)}</span>
                              <p className="text-sm text-gray-700 mt-0.5 whitespace-pre-wrap">{comment.content}</p>
                            </div>
                            {currentUser?.id === comment.author_id && (
                              <button
                                onClick={() => onDeleteComment(comment.id)}
                                className="opacity-0 group-hover:opacity-100 text-gray-300 hover:text-red-400 transition-all shrink-0"
                                title="Delete comment"
                              >
                                <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                  <polyline points="3 6 5 6 21 6"/><path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6"/><path d="M10 11v6M14 11v6"/>
                                </svg>
                              </button>
                            )}
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )
              })}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

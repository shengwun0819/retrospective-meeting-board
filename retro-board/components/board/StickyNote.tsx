'use client'

import { useState, useRef, useEffect } from 'react'
import { useDraggable } from '@dnd-kit/core'
import { CSS } from '@dnd-kit/utilities'
import { StickyNote as StickyNoteType, CanvasTool } from '@/types'
import { REACTIONS, SECTION_CONFIGS } from '@/lib/constants'
import EmojiPicker from './EmojiPicker'

type ResizeCorner = 'tl' | 'tr' | 'bl' | 'br'

interface StickyNoteProps {
  note: StickyNoteType
  currentUserId: string
  onEdit: (note: StickyNoteType) => void
  onDelete: (noteId: string) => void
  onReaction: (noteId: string, emoji: string) => void
  onComment: (note: StickyNoteType) => void
  onActionItem: (note: StickyNoteType) => void
  activeTool?: CanvasTool
  onHover?: (note: StickyNoteType | null) => void
  selected?: boolean
  onSelect?: () => void
}

const FONT_SIZES = ['text-xs', 'text-sm', 'text-base', 'text-lg'] as const
type FontSizeClass = typeof FONT_SIZES[number]

export default function StickyNote({
  note,
  onEdit,
  onDelete,
  onReaction,
  onComment,
  onActionItem,
  activeTool,
  onHover,
  selected,
  onSelect,
}: StickyNoteProps) {
  const [isEditing, setIsEditing] = useState(false)
  const [editContent, setEditContent] = useState(note.content)
  const [showReactions, setShowReactions] = useState(false)
  const [showEmojiPicker, setShowEmojiPicker] = useState(false)
  const [isHovered, setIsHovered] = useState(false)
  const [fontSizeIdx, setFontSizeIdx] = useState(1) // default: text-sm
  const [floatEmoji, setFloatEmoji] = useState<string | null>(null)
  const [isEditingAuthor, setIsEditingAuthor] = useState(false)
  const [editAuthorName, setEditAuthorName] = useState(note.author_name)
  const [liveSize, setLiveSize] = useState<{ w: number; h: number } | null>(null)
  const textareaRef = useRef<HTMLTextAreaElement>(null)
  const leaveTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const resizeRef = useRef<{ startX: number; startY: number; startW: number; startH: number; corner: ResizeCorner } | null>(null)
  const { attributes, listeners, setNodeRef, transform, isDragging } = useDraggable({
    id: note.id,
    data: { note },
    disabled: isEditing || (!!activeTool && activeTool !== 'select'),
  })

  const style = {
    transform: CSS.Translate.toString(transform),
    opacity: isDragging ? 0.5 : 1,
    backgroundColor: note.color,
  }

  useEffect(() => {
    if (isEditing && textareaRef.current) {
      textareaRef.current.focus()
      textareaRef.current.select()
    }
  }, [isEditing])

  const handleMouseEnter = () => {
    if (leaveTimerRef.current) clearTimeout(leaveTimerRef.current)
    setIsHovered(true)
    onHover?.(note)
  }

  const handleMouseLeave = () => {
    leaveTimerRef.current = setTimeout(() => {
      setIsHovered(false)
      setShowReactions(false)
      onHover?.(null)
    }, 120)
  }

  const handleResizeStart = (e: React.PointerEvent, corner: ResizeCorner) => {
    e.preventDefault()
    e.stopPropagation()
    const startW = liveSize?.w ?? note.width ?? 176
    const startH = liveSize?.h ?? note.height ?? 110
    resizeRef.current = { startX: e.clientX, startY: e.clientY, startW, startH, corner }

    const calc = (ev: PointerEvent) => {
      const r = resizeRef.current!
      const dx = ev.clientX - r.startX
      const dy = ev.clientY - r.startY
      let w = r.startW, h = r.startH
      if (corner.includes('r')) w = Math.max(120, r.startW + dx)
      if (corner.includes('l')) w = Math.max(120, r.startW - dx)
      if (corner.includes('b')) h = Math.max(80, r.startH + dy)
      if (corner.includes('t')) h = Math.max(80, r.startH - dy)
      return { w, h }
    }
    const onMove = (ev: PointerEvent) => {
      if (!resizeRef.current) return
      setLiveSize(calc(ev))
    }
    const onUp = (ev: PointerEvent) => {
      if (!resizeRef.current) return
      const { w, h } = calc(ev)
      onEdit({ ...note, width: w, height: h })
      resizeRef.current = null
      setLiveSize(null)
      window.removeEventListener('pointermove', onMove)
      window.removeEventListener('pointerup', onUp)
    }
    window.addEventListener('pointermove', onMove)
    window.addEventListener('pointerup', onUp)
  }

  const handleDoubleClick = () => {
    setEditContent(note.content)
    setIsEditing(true)
  }

  const handleBlur = () => {
    setIsEditing(false)
    if (editContent.trim() !== note.content) {
      onEdit({ ...note, content: editContent.trim() })
    }
  }

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Escape') {
      setEditContent(note.content)
      setIsEditing(false)
    }
    if (e.key === 'Enter' && !e.shiftKey && !e.nativeEvent.isComposing) {
      e.preventDefault()
      handleBlur()
    }
  }

  // Delete 鍵刪除（hover 中且非編輯狀態）
  useEffect(() => {
    if (!isHovered || isEditing) return
    const onKey = (e: KeyboardEvent) => {
      if (e.key !== 'Delete' && e.key !== 'Backspace') return
      const tag = (document.activeElement as HTMLElement)?.tagName
      if (tag === 'TEXTAREA' || tag === 'INPUT') return
      onDelete(note.id)
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [isHovered, isEditing, note.id, onDelete])

  const handleReact = (emoji: string) => {
    onReaction(note.id, emoji)
    setShowReactions(false)
    setFloatEmoji(emoji)
    setTimeout(() => setFloatEmoji(null), 700)
  }

  const handleFormat = (field: 'is_bold' | 'is_italic' | 'is_underline') => {
    onEdit({ ...note, [field]: !note[field] })
  }

  const reactionMap = (note.reactions ?? []).reduce<Record<string, number>>((acc, r) => {
    acc[r.emoji] = (acc[r.emoji] ?? 0) + 1
    return acc
  }, {})

  const commentCount = note.comments?.length ?? 0
  const fontSizeClass: FontSizeClass = FONT_SIZES[fontSizeIdx]

  return (
    <div
      className="relative pt-8"
      style={{ opacity: isDragging ? 0 : 1 }}
      onMouseEnter={handleMouseEnter}
      onMouseLeave={handleMouseLeave}
      onClick={(e) => { e.stopPropagation(); onSelect?.() }}
    >
      {/* Hover Action Bar — positioned inside the pt-8 area so no gap */}
      <div
        className={`absolute top-0 left-0 right-0 ${(isHovered || selected) ? 'flex' : 'hidden'} items-center justify-center z-20`}
        onMouseDown={(e) => e.stopPropagation()}
      >
        <div className="bg-white rounded-full shadow-lg px-2 py-1 flex gap-1 border border-gray-200">
          {/* Font size */}
          <button
            onClick={(e) => { e.stopPropagation(); setFontSizeIdx((i) => Math.max(0, i - 1)) }}
            disabled={fontSizeIdx === 0}
            className="text-xs hover:scale-110 transition-transform px-1 font-bold text-gray-500 disabled:opacity-30"
            title="Smaller text"
          >
            A-
          </button>
          <button
            onClick={(e) => { e.stopPropagation(); setFontSizeIdx((i) => Math.min(FONT_SIZES.length - 1, i + 1)) }}
            disabled={fontSizeIdx === FONT_SIZES.length - 1}
            className="text-xs hover:scale-110 transition-transform px-1 font-bold text-gray-700 disabled:opacity-30"
            title="Larger text"
          >
            A+
          </button>

          {/* Text formatting */}
          <button
            onClick={(e) => { e.stopPropagation(); handleFormat('is_bold') }}
            className={`text-xs px-1.5 py-0.5 rounded font-bold transition-colors ${note.is_bold ? 'bg-gray-200 text-gray-900' : 'text-gray-500 hover:bg-gray-100'}`}
            title="Bold"
          >B</button>
          <button
            onClick={(e) => { e.stopPropagation(); handleFormat('is_italic') }}
            className={`text-xs px-1.5 py-0.5 rounded italic transition-colors ${note.is_italic ? 'bg-gray-200 text-gray-900' : 'text-gray-500 hover:bg-gray-100'}`}
            title="Italic"
          >I</button>
          <button
            onClick={(e) => { e.stopPropagation(); handleFormat('is_underline') }}
            className={`text-xs px-1.5 py-0.5 rounded underline transition-colors ${note.is_underline ? 'bg-gray-200 text-gray-900' : 'text-gray-500 hover:bg-gray-100'}`}
            title="Underline"
          >U</button>

          <div className="w-px bg-gray-200 self-stretch mx-0.5" />

          {/* Section colors */}
          {SECTION_CONFIGS.map((s) => (
            <button
              key={s.id}
              onClick={(e) => { e.stopPropagation(); onEdit({ ...note, color: s.defaultNoteColor }) }}
              className="w-4 h-4 rounded-full border-2 hover:scale-125 transition-transform"
              style={{
                backgroundColor: s.defaultNoteColor,
                borderColor: note.color === s.defaultNoteColor ? '#3b82f6' : '#d1d5db',
              }}
              title={s.title}
            />
          ))}
          <div className="w-px bg-gray-200 self-stretch mx-0.5" />

          {/* Reactions */}
          <div className="relative">
            <button
              onClick={(e) => { e.stopPropagation(); setShowReactions(!showReactions) }}
              onMouseEnter={handleMouseEnter}
              className="text-sm hover:scale-125 transition-transform px-1"
              title="React"
            >
              😊
            </button>
            {showReactions && (
              <div
                className="absolute bottom-8 left-0 bg-white rounded-xl shadow-xl border border-gray-200 flex items-center p-1 gap-1 z-30"
                onMouseEnter={handleMouseEnter}
              >
                {REACTIONS.map((emoji) => (
                  <button
                    key={emoji}
                    onClick={(e) => { e.stopPropagation(); handleReact(emoji) }}
                    className="text-base hover:scale-125 transition-transform px-1"
                  >
                    {emoji}
                  </button>
                ))}
                <div className="w-px bg-gray-200 self-stretch mx-0.5" />
                <div className="relative">
                  <button
                    onClick={(e) => { e.stopPropagation(); setShowEmojiPicker(p => !p) }}
                    className="text-sm px-1.5 py-0.5 rounded hover:bg-gray-100 text-gray-500 font-bold"
                    title="更多 emoji"
                  >＋</button>
                  {showEmojiPicker && (
                    <EmojiPicker
                      onSelect={(emoji) => { handleReact(emoji) }}
                      onClose={() => { setShowEmojiPicker(false); setShowReactions(false) }}
                    />
                  )}
                </div>
              </div>
            )}
          </div>

          {/* Comment */}
          <button
            onClick={(e) => { e.stopPropagation(); onComment(note) }}
            className="text-sm hover:scale-110 transition-transform px-1 flex items-center gap-0.5"
            title="Comments"
          >
            💬 {commentCount > 0 && <span className="text-xs text-gray-500">{commentCount}</span>}
          </button>

          {/* Action Item */}
          <button
            onClick={(e) => { e.stopPropagation(); onActionItem(note) }}
            className="text-sm hover:scale-110 transition-transform px-1"
            title="Create action item"
          >
            ✅
          </button>

          {/* Delete */}
          <button
            onClick={(e) => { e.stopPropagation(); onDelete(note.id) }}
            className="text-sm hover:scale-110 transition-transform px-1 text-red-400 hover:text-red-600"
            title="Delete"
          >
            🗑️
          </button>
        </div>
      </div>

      {/* Floating emoji feedback */}
      {floatEmoji && (
        <div className="absolute top-0 left-1/2 text-2xl pointer-events-none z-30 animate-float-up">
          {floatEmoji}
        </div>
      )}

      {/* Note card wrapper: relative so resize handles can be positioned as siblings */}
      <div className="relative">

      {/* Note card — dnd-kit listeners are ONLY here, NO resize handles inside */}
      <div
        ref={setNodeRef}
        style={{
          ...style,
          width: liveSize?.w ?? note.width ?? 176,
          ...(liveSize?.h ?? note.height
            ? { height: liveSize?.h ?? note.height, overflowY: 'auto' }
            : { minHeight: 110 }),
        }}
        className={`relative rounded-lg shadow-md p-3 flex flex-col cursor-grab active:cursor-grabbing select-none transition-shadow ${
          isDragging ? 'shadow-xl ring-2 ring-blue-400' : isHovered ? 'shadow-lg' : ''
        } ${selected ? 'ring-2 ring-blue-500 ring-offset-1' : ''}`}
        {...attributes}
        {...listeners}
        onDoubleClick={handleDoubleClick}
      >
        {/* Content */}
        <div className={`flex-1 text-gray-800 font-medium leading-snug break-words ${fontSizeClass}`}>
          {isEditing ? (
            <textarea
              ref={textareaRef}
              value={editContent}
              onChange={(e) => setEditContent(e.target.value)}
              onBlur={handleBlur}
              onKeyDown={handleKeyDown}
              onClick={(e) => e.stopPropagation()}
              onMouseDown={(e) => e.stopPropagation()}
              className={[
                'w-full h-full min-h-[70px] bg-transparent resize-none outline-none font-medium',
                fontSizeClass,
                note.is_bold ? 'font-bold' : '',
                note.is_italic ? 'italic' : '',
                note.is_underline ? 'underline' : '',
              ].join(' ')}
              placeholder="Type your note..."
            />
          ) : (
            <p className={[
              'min-h-[70px] whitespace-pre-wrap',
              note.is_bold ? 'font-bold' : '',
              note.is_italic ? 'italic' : '',
              note.is_underline ? 'underline' : '',
            ].join(' ')}>
              {note.content || <span className="text-gray-400 italic font-normal not-italic no-underline">Empty note</span>}
            </p>
          )}
        </div>

        {/* Author */}
        {isEditingAuthor ? (
          <input
            autoFocus
            value={editAuthorName}
            onChange={(e) => setEditAuthorName(e.target.value)}
            onBlur={() => {
              setIsEditingAuthor(false)
              const trimmed = editAuthorName.trim()
              if (trimmed && trimmed !== note.author_name) onEdit({ ...note, author_name: trimmed })
              else setEditAuthorName(note.author_name)
            }}
            onKeyDown={(e) => {
              if (e.key === 'Enter') (e.target as HTMLInputElement).blur()
              if (e.key === 'Escape') { setEditAuthorName(note.author_name); setIsEditingAuthor(false) }
            }}
            onClick={(e) => e.stopPropagation()}
            onMouseDown={(e) => e.stopPropagation()}
            className="text-xs text-gray-500 mt-2 w-full bg-transparent border-b border-blue-400 outline-none"
            maxLength={30}
          />
        ) : (
          <p
            className="text-xs text-gray-500 mt-2 truncate cursor-pointer hover:text-blue-500 hover:underline"
            title="Click to edit author name"
            onClick={(e) => { e.stopPropagation(); setIsEditingAuthor(true) }}
            onMouseDown={(e) => e.stopPropagation()}
          >
            — {note.author_name}
          </p>
        )}

        {/* Comment badge — always visible when there are comments */}
        {commentCount > 0 && (
          <button
            onClick={(e) => { e.stopPropagation(); onComment(note) }}
            onMouseDown={(e) => e.stopPropagation()}
            className="flex items-center gap-1 text-xs text-gray-500 hover:text-blue-500 transition-colors mt-1 w-fit"
          >
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/>
            </svg>
            <span>{commentCount}</span>
          </button>
        )}

        {/* Reactions display */}
        {Object.keys(reactionMap).length > 0 && (
          <div className="flex flex-wrap gap-1 mt-1">
            {Object.entries(reactionMap).map(([emoji, count]) => {
              const reactors = (note.reactions ?? []).filter(r => r.emoji === emoji).map(r => r.user_name)
              return (
                <div key={emoji} className="relative group/rxn">
                  <button
                    onClick={(e) => { e.stopPropagation(); handleReact(emoji) }}
                    onMouseDown={(e) => e.stopPropagation()}
                    className="text-xs bg-white/80 border border-white/60 rounded-full px-1.5 py-0.5 hover:bg-white shadow-sm transition-all"
                  >
                    {emoji} {count}
                  </button>
                  <div className="absolute bottom-full left-0 mb-1.5 hidden group-hover/rxn:block z-40 pointer-events-none">
                    <div className="bg-gray-800 text-white text-xs rounded-lg px-2 py-1 whitespace-nowrap shadow-lg">
                      {reactors.join(', ')}
                    </div>
                  </div>
                </div>
              )
            })}
          </div>
        )}

      </div>

      {/* Resize handles — siblings of note card, outside dnd-kit element */}
      {(isHovered || selected) && !isEditing && !isDragging && (
        <>
          {(['tl', 'tr', 'bl', 'br'] as ResizeCorner[]).map((corner) => (
            <div
              key={corner}
              className="absolute w-3 h-3 bg-white border-2 border-blue-400 rounded-sm z-20 opacity-70 hover:opacity-100"
              style={{
                left: corner.includes('l') ? -6 : undefined,
                right: corner.includes('r') ? -6 : undefined,
                top: corner.includes('t') ? -6 : undefined,
                bottom: corner.includes('b') ? -6 : undefined,
                cursor: corner === 'tl' || corner === 'br' ? 'nwse-resize' : 'nesw-resize',
              }}
              onPointerDown={(e) => handleResizeStart(e, corner)}
            />
          ))}
        </>
      )}

      </div>{/* end note card wrapper */}
    </div>
  )
}

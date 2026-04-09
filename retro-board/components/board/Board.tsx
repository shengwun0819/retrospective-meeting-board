'use client'

import { useState, useEffect, useCallback, useRef } from 'react'
import { useRouter } from 'next/navigation'
import {
  DndContext,
  DragEndEvent,
  DragMoveEvent,
  DragOverlay,
  PointerSensor,
  useSensor,
  useSensors,
} from '@dnd-kit/core'
import { supabase } from '@/lib/supabase'
import { SECTION_CONFIGS, USER_COLORS } from '@/lib/constants'
import {
  StickyNote as StickyNoteType,
  Reaction,
  Comment,
  ActionItem,
  SectionId,
  OnlineUser,
  CursorPosition,
  CanvasElement,
  CanvasTool,
} from '@/types'
import { routerEvents } from '@/lib/navigation-events'
import CursorOverlay from './CursorOverlay'
import ResizableCanvas from './ResizableCanvas'
import Toolbar from '@/components/toolbar/Toolbar'
import BottomToolbar from '@/components/toolbar/BottomToolbar'
import NicknameModal from '@/components/modals/NicknameModal'
import CommentPanel from '@/components/modals/CommentPanel'
import AllCommentsPanel from '@/components/modals/AllCommentsPanel'
import ActionItemModal from '@/components/modals/ActionItemModal'
import BoardSettingsModal from '@/components/modals/BoardSettingsModal'
import ExportModal from '@/components/modals/ExportModal'
import BoardSidebar from '@/components/sidebar/BoardSidebar'
import { useUser } from '@/contexts/UserContext'
import { RetroExportPayload } from '@/lib/clickup'
import { calculateAutoArrangePositions } from '@/lib/autoArrange'

interface BoardProps {
  sessionId: string
  sessionName: string
  team?: string
  sprintNumber?: number
  boardId: string
}

type HistoryEntry =
  | { type: 'create' | 'delete' | 'update'; note: StickyNoteType }
  | { type: 'el_create'; elementId: string }
  | { type: 'el_delete'; element: CanvasElement }

const NOTE_W = 176  // w-44
const NOTE_H = 110  // min-h estimate

function detectSection(cx: number, cy: number, splitXPx: number, splitYPx: number): SectionId {
  if (cx < splitXPx && cy < splitYPx) return 'continue'
  if (cx >= splitXPx && cy < splitYPx) return 'stop'
  if (cx < splitXPx && cy >= splitYPx) return 'invent'
  return 'act'
}

export default function Board({ sessionId, sessionName, team: initialTeam, sprintNumber: initialSprintNumber, boardId }: BoardProps) {
  const router = useRouter()
  const { user, authName, setUserName } = useUser()
  const canvasRef = useRef<HTMLDivElement>(null)

  // Notes + realtime
  const [notes, setNotes] = useState<StickyNoteType[]>([])
  const [actionItems, setActionItems] = useState<ActionItem[]>([])
  const [onlineUsers, setOnlineUsers] = useState<OnlineUser[]>([])
  const [cursors, setCursors] = useState<CursorPosition[]>([])

  // Canvas elements
  const [canvasElements, setCanvasElements] = useState<CanvasElement[]>([])
  const [activeTool, setActiveTool] = useState<CanvasTool>('select')

  // Canvas split (controlled here so handleDragEnd can use them)
  const [splitX, setSplitX] = useState(50)
  const [splitY, setSplitY] = useState(50)

  // Section highlighted during drag
  const [dragOverSection, setDragOverSection] = useState<SectionId | null>(null)

  // UI state
  const [commentNote, setCommentNote] = useState<StickyNoteType | null>(null)
  const [commentElement, setCommentElement] = useState<CanvasElement | null>(null)
  const [actionItemNote, setActionItemNote] = useState<StickyNoteType | null>(null)
  const [actionItemElement, setActionItemElement] = useState<CanvasElement | null>(null)
  const [showActionItems, setShowActionItems] = useState(false)
  const [actionItemInitView, setActionItemInitView] = useState<'list' | 'create'>('list')

  // Board settings (team / sprint)
  const [showSettings, setShowSettings] = useState(false)
  const [sessionTeam, setSessionTeam] = useState(initialTeam)
  const [sessionSprint, setSessionSprint] = useState(initialSprintNumber)
  const [showAllComments, setShowAllComments] = useState(false)
  const [showExport, setShowExport] = useState(false)
  const [exportPayload, setExportPayload] = useState<RetroExportPayload | null>(null)
  const [exportLoading, setExportLoading] = useState(false)
  const [draggedNote, setDraggedNote] = useState<StickyNoteType | null>(null)
  const [history, setHistory] = useState<HistoryEntry[]>([])
  const [redoStack, setRedoStack] = useState<HistoryEntry[]>([])
  const [showNicknameModal, setShowNicknameModal] = useState(false)
  const [sidebarOpen, setSidebarOpen] = useState(false)

  // Per-board color: picked on join to avoid duplicates with other online users
  const [boardUserColor, setBoardUserColor] = useState<string>(() => {
    if (typeof window !== 'undefined') {
      const stored = sessionStorage.getItem(`retro_color_${boardId}`)
      if (stored) return stored
    }
    return USER_COLORS[0]
  })

  const channelRef = useRef<ReturnType<typeof supabase.channel> | null>(null)
  const userRef = useRef(user)
  const posInitializedRef = useRef(false)
  const notesRef = useRef(notes)
  const prevSplitRef = useRef({ x: splitX, y: splitY })
  const hoveredNoteRef = useRef<StickyNoteType | null>(null)
  const copiedNoteRef = useRef<StickyNoteType | null>(null)
  const canvasElementsRef = useRef(canvasElements)

  useEffect(() => { userRef.current = user }, [user])
  useEffect(() => { notesRef.current = notes }, [notes])
  useEffect(() => { canvasElementsRef.current = canvasElements }, [canvasElements])
  useEffect(() => { if (!user) setShowNicknameModal(true) }, []) // eslint-disable-line

  // When split divider moves: shift notes in affected sections (state only, no DB write)
  // pos_x/pos_y are fractions (0–1), and splitX/splitY are percentages (0–100),
  // so a divider shift of dx% maps to a fraction shift of dx/100.
  useEffect(() => {
    const prev = prevSplitRef.current
    const dx = splitX - prev.x
    const dy = splitY - prev.y
    prevSplitRef.current = { x: splitX, y: splitY }
    if (!posInitializedRef.current || (dx === 0 && dy === 0)) return
    setNotes(prev => prev.map(note => ({
      ...note,
      pos_x: (note.section_id === 'stop' || note.section_id === 'act') ? note.pos_x + dx / 100 : note.pos_x,
      pos_y: (note.section_id === 'invent' || note.section_id === 'act') ? note.pos_y + dy / 100 : note.pos_y,
    })))
  }, [splitX, splitY])

  const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 5 } }))

  // Load initial data
  useEffect(() => {
    const load = async () => {
      const [notesRes, actionsRes, elementsRes] = await Promise.all([
        fetch(`/api/boards/${boardId}/stickies`),
        fetch(`/api/boards/${boardId}/action-items`),
        fetch(`/api/boards/${boardId}/canvas-elements`),
      ])
      if (notesRes.ok) setNotes(await notesRes.json())
      if (actionsRes.ok) setActionItems(await actionsRes.json())
      if (elementsRes.ok) setCanvasElements(await elementsRes.json())
    }
    load()
  }, [boardId])

  // Auto-position legacy notes (pos_x=0, pos_y=0) once on first load
  useEffect(() => {
    if (posInitializedRef.current || notes.length === 0) return

    const unpositioned = notes.filter(n => n.pos_x === 0 && n.pos_y === 0)
    if (unpositioned.length === 0) { posInitializedRef.current = true; return }

    const canvasW = canvasRef.current?.offsetWidth ?? window.innerWidth
    const canvasH = canvasRef.current?.offsetHeight ?? (window.innerHeight - 56)
    const splitXPx = canvasW * splitX / 100
    const splitYPx = canvasH * splitY / 100
    const sectionCounters: Record<string, number> = {}
    const updates: { id: string; pos_x: number; pos_y: number }[] = []

    unpositioned.forEach(note => {
      const idx = sectionCounters[note.section_id] ?? 0
      sectionCounters[note.section_id] = idx + 1
      const inRight = note.section_id === 'stop' || note.section_id === 'act'
      const inBottom = note.section_id === 'invent' || note.section_id === 'act'
      const col = idx % 3, row = Math.floor(idx / 3)
      const pos_x = ((inRight ? splitXPx + 20 : 20) + col * 190 + 5) / canvasW
      const pos_y = ((inBottom ? splitYPx + 70 : 70) + row * 145 + 5) / canvasH
      updates.push({ id: note.id, pos_x, pos_y })
    })

    setNotes(prev => prev.map(n => {
      const u = updates.find(x => x.id === n.id)
      return u ? { ...n, pos_x: u.pos_x, pos_y: u.pos_y } : n
    }))

    updates.forEach(({ id, pos_x, pos_y }) =>
      fetch(`/api/stickies/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ pos_x, pos_y }),
      })
    )
    posInitializedRef.current = true
  }, [notes]) // eslint-disable-line

  // Supabase Realtime
  useEffect(() => {
    if (!boardId) return
    const channel = supabase.channel(`board:${boardId}`, {
      config: { presence: { key: user?.id ?? 'anon' } },
    })
    channelRef.current = channel

    channel
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'sticky_notes', filter: `board_id=eq.${boardId}` }, (payload) => {
        const n = payload.new as StickyNoteType
        setNotes(prev => prev.find(x => x.id === n.id) ? prev : [...prev, { ...n, reactions: [], comments: [] }])
      })
      .on('postgres_changes', { event: 'UPDATE', schema: 'public', table: 'sticky_notes', filter: `board_id=eq.${boardId}` }, (payload) => {
        const u = payload.new as StickyNoteType
        setNotes(prev => prev.map(n => n.id === u.id ? { ...n, ...u } : n))
      })
      .on('postgres_changes', { event: 'DELETE', schema: 'public', table: 'sticky_notes' }, (payload) => {
        setNotes(prev => prev.filter(n => n.id !== (payload.old as { id: string }).id))
      })
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'reactions' }, (payload) => {
        const r = payload.new as Reaction
        // Filter out both existing real reaction (same id) and any pending temp reaction (same user+emoji)
        const dedupeReactions = (existing: Reaction[]) =>
          existing.filter(x => x.id !== r.id && !(x.id.startsWith('temp_') && x.user_id === r.user_id && x.emoji === r.emoji))
        if (r.sticky_note_id) {
          setNotes(prev => prev.map(n => n.id === r.sticky_note_id ? { ...n, reactions: [...dedupeReactions(n.reactions ?? []), r] } : n))
        } else if (r.canvas_element_id) {
          setCanvasElements(prev => prev.map(el => el.id === r.canvas_element_id ? { ...el, reactions: [...dedupeReactions(el.reactions ?? []), r] } : el))
          setCommentElement(prev => prev?.id === r.canvas_element_id && prev ? { ...prev, reactions: [...dedupeReactions(prev.reactions ?? []), r] } as typeof prev : prev)
        }
      })
      .on('postgres_changes', { event: 'DELETE', schema: 'public', table: 'reactions' }, (payload) => {
        const d = payload.old as { id: string; sticky_note_id?: string; canvas_element_id?: string }
        if (d.sticky_note_id) {
          setNotes(prev => prev.map(n => n.id === d.sticky_note_id ? { ...n, reactions: (n.reactions ?? []).filter(r => r.id !== d.id) } : n))
        } else if (d.canvas_element_id) {
          setCanvasElements(prev => prev.map(el => el.id === d.canvas_element_id ? { ...el, reactions: (el.reactions ?? []).filter(r => r.id !== d.id) } : el))
        }
      })
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'comments' }, (payload) => {
        const c = payload.new as Comment
        if (c.sticky_note_id) {
          setNotes(prev => prev.map(n => n.id === c.sticky_note_id ? { ...n, comments: [...(n.comments ?? []), c] } : n))
          setCommentNote(prev => prev?.id === c.sticky_note_id && prev ? { ...prev, comments: [...(prev.comments ?? []), c] } as typeof prev : prev)
        } else if (c.canvas_element_id) {
          setCanvasElements(prev => prev.map(el => el.id === c.canvas_element_id ? { ...el, comments: [...(el.comments ?? []), c] } : el))
          setCommentElement(prev => prev?.id === c.canvas_element_id && prev ? { ...prev, comments: [...(prev.comments ?? []), c] } as typeof prev : prev)
        }
      })
      .on('postgres_changes', { event: 'UPDATE', schema: 'public', table: 'comments' }, (payload) => {
        const c = payload.new as Comment
        if (c.sticky_note_id) {
          setNotes(prev => prev.map(n => ({ ...n, comments: (n.comments ?? []).map(x => x.id === c.id ? c : x) })))
          setCommentNote(prev => prev ? { ...prev, comments: (prev.comments ?? []).map(x => x.id === c.id ? c : x) } : prev)
        } else if (c.canvas_element_id) {
          setCanvasElements(prev => prev.map(el => ({ ...el, comments: (el.comments ?? []).map(x => x.id === c.id ? c : x) })))
          setCommentElement(prev => prev ? { ...prev, comments: (prev.comments ?? []).map(x => x.id === c.id ? c : x) } : prev)
        }
      })
      .on('postgres_changes', { event: 'DELETE', schema: 'public', table: 'comments' }, (payload) => {
        const id = (payload.old as { id: string }).id
        setNotes(prev => prev.map(n => ({ ...n, comments: (n.comments ?? []).filter(c => c.id !== id) })))
        setCommentNote(prev => prev ? { ...prev, comments: (prev.comments ?? []).filter(c => c.id !== id) } : prev)
        setCanvasElements(prev => prev.map(el => ({ ...el, comments: (el.comments ?? []).filter(c => c.id !== id) })))
        setCommentElement(prev => prev ? { ...prev, comments: (prev.comments ?? []).filter(c => c.id !== id) } : prev)
      })
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'action_items', filter: `board_id=eq.${boardId}` }, (payload) => {
        const item = payload.new as ActionItem
        setActionItems(prev => [...prev.filter(a => a.id !== item.id), item])
      })
      .on('postgres_changes', { event: 'UPDATE', schema: 'public', table: 'action_items', filter: `board_id=eq.${boardId}` }, (payload) => {
        setActionItems(prev => prev.map(a => a.id === payload.new.id ? payload.new as ActionItem : a))
      })
      .on('postgres_changes', { event: 'DELETE', schema: 'public', table: 'action_items' }, (payload) => {
        setActionItems(prev => prev.filter(a => a.id !== (payload.old as { id: string }).id))
      })
      // Canvas elements
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'canvas_elements', filter: `board_id=eq.${boardId}` }, (payload) => {
        const el = payload.new as CanvasElement
        setCanvasElements(prev => prev.find(x => x.id === el.id) ? prev : [...prev, el])
      })
      .on('postgres_changes', { event: 'UPDATE', schema: 'public', table: 'canvas_elements', filter: `board_id=eq.${boardId}` }, (payload) => {
        const el = payload.new as CanvasElement
        setCanvasElements(prev => prev.map(x => x.id === el.id ? el : x))
      })
      .on('postgres_changes', { event: 'DELETE', schema: 'public', table: 'canvas_elements' }, (payload) => {
        setCanvasElements(prev => prev.filter(x => x.id !== (payload.old as { id: string }).id))
      })
      .on('broadcast', { event: 'cursor' }, ({ payload }) => {
        setCursors(prev => [...prev.filter(c => c.userId !== payload.userId), payload as CursorPosition])
      })
      .on('presence', { event: 'sync' }, () => {
        const state = channel.presenceState<{ name: string; color: string }>()
        setOnlineUsers(Object.entries(state).map(([id, p]) => ({ id, name: p[0]?.name ?? 'Anonymous', color: p[0]?.color ?? '#6b7280' })))
      })

    channel.subscribe(async (status) => {
      if (status !== 'SUBSCRIBED' || !user) return
      // Reuse stored color for this board, or pick one not already taken by others
      const stored = sessionStorage.getItem(`retro_color_${boardId}`)
      if (stored) {
        setBoardUserColor(stored)
        await channel.track({ name: user.name, color: stored })
        return
      }
      const state = channel.presenceState<{ color: string }>()
      const usedColors = new Set(Object.values(state).flatMap(p => p.map(u => u.color)))
      const color = USER_COLORS.find(c => !usedColors.has(c)) ?? USER_COLORS[Math.floor(Math.random() * USER_COLORS.length)]
      sessionStorage.setItem(`retro_color_${boardId}`, color)
      setBoardUserColor(color)
      await channel.track({ name: user.name, color })
    })
    return () => { channel.unsubscribe() }
  }, [boardId, user])

  useEffect(() => {
    if (user && channelRef.current && boardUserColor) {
      channelRef.current.track({ name: user.name, color: boardUserColor })
    }
  }, [user, boardUserColor])

  useEffect(() => {
    if (!user || !channelRef.current) return
    let lastSent = 0
    const handle = (e: MouseEvent) => {
      const now = Date.now()
      if (now - lastSent < 50) return
      lastSent = now
      const ch = channelRef.current
      if (ch?.state === 'joined') ch.send({ type: 'broadcast', event: 'cursor', payload: { userId: user.id, userName: user.name, x: e.clientX, y: e.clientY, color: boardUserColor } })
    }
    window.addEventListener('mousemove', handle)
    return () => window.removeEventListener('mousemove', handle)
  }, [user, boardUserColor])

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const tag = (document.activeElement as HTMLElement)?.tagName
      const isTyping = tag === 'TEXTAREA' || tag === 'INPUT'
      if ((e.metaKey || e.ctrlKey) && e.key === 'z' && !e.shiftKey) { if (isTyping) return; e.preventDefault(); handleUndo() }
      if ((e.metaKey || e.ctrlKey) && (e.key === 'y' || (e.shiftKey && e.key === 'z'))) { if (isTyping) return; e.preventDefault(); handleRedo() }
      if (e.key === 'Escape') setActiveTool('select')
      if ((e.metaKey || e.ctrlKey) && e.key === 'c') {
        const tag = (document.activeElement as HTMLElement)?.tagName
        if (tag !== 'TEXTAREA' && tag !== 'INPUT' && hoveredNoteRef.current) copiedNoteRef.current = hoveredNoteRef.current
      }
      if ((e.metaKey || e.ctrlKey) && e.key === 'v') {
        const tag = (document.activeElement as HTMLElement)?.tagName
        if (tag !== 'TEXTAREA' && tag !== 'INPUT' && copiedNoteRef.current) handlePasteNote()
      }
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  })

  const requireUser = useCallback((action: () => void) => {
    if (!userRef.current) { setShowNicknameModal(true); return }
    action()
  }, [])

  const addNote = useCallback((sectionId: string) => {
    const currentUser = userRef.current
    if (!currentUser) { setShowNicknameModal(true); return }

    const run = async () => {
      const sectionConfig = SECTION_CONFIGS.find(s => s.id === sectionId)
      const color = sectionConfig?.defaultNoteColor ?? '#fef08a'
      const canvasW = canvasRef.current?.offsetWidth ?? window.innerWidth
      const canvasH = canvasRef.current?.offsetHeight ?? (window.innerHeight - 56)
      const splitXPx = canvasW * splitX / 100
      const splitYPx = canvasH * splitY / 100
      const inRight = sectionId === 'stop' || sectionId === 'act'
      const inBottom = sectionId === 'invent' || sectionId === 'act'
      const idx = notes.filter(n => n.section_id === sectionId).length
      const col = idx % 3, row = Math.floor(idx / 3)
      const jitter = (Math.random() - 0.5) * 20
      const pos_x = ((inRight ? splitXPx + 20 : 20) + col * 190 + jitter) / canvasW
      const pos_y = ((inBottom ? splitYPx + 70 : 70) + row * 145 + jitter) / canvasH

      // Optimistic add with temp ID for instant feedback
      const tempId = `temp_${Date.now()}`
      const tempNote: StickyNoteType = { id: tempId, board_id: boardId, section_id: sectionId as StickyNoteType['section_id'], content: '', color, author_id: currentUser.id, author_name: currentUser.name, pos_x, pos_y, created_at: new Date().toISOString(), updated_at: new Date().toISOString(), reactions: [], comments: [] }
      setNotes(ns => [...ns, tempNote])

      const res = await fetch(`/api/boards/${boardId}/stickies`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ section_id: sectionId, content: '', color, author_id: currentUser.id, author_name: currentUser.name, pos_x, pos_y }),
      })
      if (res.ok) {
        const note = await res.json()
        setNotes(ns => ns.map(n => n.id === tempId ? { ...note, reactions: [], comments: [] } : n))
        setHistory(h => [...h, { type: 'create', note }])
        setRedoStack([])
      } else {
        setNotes(ns => ns.filter(n => n.id !== tempId))
      }
    }
    run()
  }, [boardId, notes, splitX, splitY])

  const editNote = useCallback(async (note: StickyNoteType) => {
    const prev = notes.find(n => n.id === note.id)
    if (!prev) return
    setNotes(ns => ns.map(n => n.id === note.id ? { ...n, ...note } : n))
    await fetch(`/api/stickies/${note.id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        content: note.content,
        color: note.color,
        author_name: note.author_name,
        is_bold: note.is_bold ?? false,
        is_italic: note.is_italic ?? false,
        is_underline: note.is_underline ?? false,
        ...(note.width !== undefined ? { width: note.width } : {}),
        ...(note.height !== undefined ? { height: note.height } : {}),
      }),
    })
    setHistory(h => [...h, { type: 'update', note: prev }])
    setRedoStack([])
  }, [notes])

  const deleteNote = useCallback(async (noteId: string) => {
    const note = notes.find(n => n.id === noteId)
    if (!note) return
    setNotes(ns => ns.filter(n => n.id !== noteId))
    await fetch(`/api/stickies/${noteId}`, { method: 'DELETE' })
    setHistory(h => [...h, { type: 'delete', note }])
    setRedoStack([])
  }, [notes])

  const handlePasteNote = useCallback(() => {
    const copied = copiedNoteRef.current
    const currentUser = userRef.current
    if (!copied || !currentUser) return
    const canvasW = canvasRef.current?.offsetWidth ?? window.innerWidth
    const canvasH = canvasRef.current?.offsetHeight ?? (window.innerHeight - 56)
    const pos_x = copied.pos_x + 24 / canvasW
    const pos_y = copied.pos_y + 24 / canvasH
    const cx = pos_x * canvasW + NOTE_W / 2
    const cy = pos_y * canvasH + NOTE_H / 2
    const sectionId = detectSection(cx, cy, canvasW * splitX / 100, canvasH * splitY / 100)
    const color = SECTION_CONFIGS.find(s => s.id === sectionId)?.defaultNoteColor ?? copied.color

    // Optimistic paste for instant feedback
    const tempId = `temp_${Date.now()}`
    const tempNote: StickyNoteType = { id: tempId, board_id: boardId, section_id: sectionId as StickyNoteType['section_id'], content: copied.content, color, author_id: currentUser.id, author_name: currentUser.name, pos_x, pos_y, is_bold: copied.is_bold, is_italic: copied.is_italic, is_underline: copied.is_underline, width: copied.width, height: copied.height, created_at: new Date().toISOString(), updated_at: new Date().toISOString(), reactions: [], comments: [] }
    setNotes(ns => [...ns, tempNote])

    fetch(`/api/boards/${boardId}/stickies`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ section_id: sectionId, content: copied.content, color, author_id: currentUser.id, author_name: currentUser.name, pos_x, pos_y }),
    }).then(async res => {
      if (res.ok) {
        const note = await res.json()
        setNotes(ns => ns.map(n => n.id === tempId ? { ...note, reactions: [], comments: [] } : n))
      } else {
        setNotes(ns => ns.filter(n => n.id !== tempId))
      }
    })
  }, [boardId, splitX, splitY])

  // Drag: update position + detect section change
  const handleDragMove = useCallback(({ active, delta }: DragMoveEvent) => {
    const note = active.data.current?.note as StickyNoteType | undefined
    if (!note) return
    const canvasW = canvasRef.current?.offsetWidth ?? window.innerWidth
    const canvasH = canvasRef.current?.offsetHeight ?? (window.innerHeight - 56)
    const splitXPx = canvasW * splitX / 100
    const splitYPx = canvasH * splitY / 100
    const cx = note.pos_x * canvasW + delta.x + NOTE_W / 2
    const cy = note.pos_y * canvasH + delta.y + NOTE_H / 2
    setDragOverSection(detectSection(cx, cy, splitXPx, splitYPx))
  }, [splitX, splitY])

  const handleDragEnd = useCallback(async ({ active, delta }: DragEndEvent) => {
    setDraggedNote(null)
    setDragOverSection(null)
    if (!active.data.current) return

    const note = active.data.current.note as StickyNoteType
    const canvasW = canvasRef.current?.offsetWidth ?? window.innerWidth
    const canvasH = canvasRef.current?.offsetHeight ?? (window.innerHeight - 56)
    const splitXPx = canvasW * splitX / 100
    const splitYPx = canvasH * splitY / 100

    const newX = Math.max(0, note.pos_x + delta.x / canvasW)
    const newY = Math.max(0, note.pos_y + delta.y / canvasH)
    const cx = newX * canvasW + NOTE_W / 2, cy = newY * canvasH + NOTE_H / 2
    const newSectionId = detectSection(cx, cy, splitXPx, splitYPx)
    const newColor = newSectionId !== note.section_id
      ? (SECTION_CONFIGS.find(s => s.id === newSectionId)?.defaultNoteColor ?? note.color)
      : note.color

    setNotes(ns => ns.map(n => n.id === note.id ? { ...n, pos_x: newX, pos_y: newY, section_id: newSectionId, color: newColor } : n))
    await fetch(`/api/stickies/${note.id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ pos_x: newX, pos_y: newY, section_id: newSectionId, color: newColor }),
    })
  }, [splitX, splitY])

  const handleUndo = useCallback(async () => {
    const last = history[history.length - 1]
    if (!last) return
    setHistory(h => h.slice(0, -1))
    if (last.type === 'create') {
      setNotes(ns => ns.filter(n => n.id !== last.note.id))
      await fetch(`/api/stickies/${last.note.id}`, { method: 'DELETE' })
      setRedoStack(r => [...r, last])
    } else if (last.type === 'delete') {
      const res = await fetch(`/api/boards/${boardId}/stickies`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(last.note) })
      if (res.ok) { const restored = await res.json(); setNotes(ns => [...ns, restored]); setRedoStack(r => [...r, { ...last, note: restored }]) }
    } else if (last.type === 'update') {
      const current = notes.find(n => n.id === last.note.id)
      if (current) setRedoStack(r => [...r, { type: 'update', note: current }])
      setNotes(ns => ns.map(n => n.id === last.note.id ? { ...n, ...last.note } : n))
      await fetch(`/api/stickies/${last.note.id}`, { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ content: last.note.content, color: last.note.color }) })
    } else if (last.type === 'el_create') {
      const snapshot = canvasElementsRef.current.find(x => x.id === last.elementId)
      setCanvasElements(prev => prev.filter(x => x.id !== last.elementId))
      await fetch(`/api/canvas-elements/${last.elementId}`, { method: 'DELETE' })
      if (snapshot) setRedoStack(r => [...r, { type: 'el_delete', element: snapshot }])
    } else if (last.type === 'el_delete') {
      const res = await fetch(`/api/boards/${boardId}/canvas-elements`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(last.element),
      })
      if (res.ok) {
        const restored = await res.json()
        setCanvasElements(prev => [...prev, restored])
        setRedoStack(r => [...r, { type: 'el_create', elementId: restored.id }])
      }
    }
  }, [history, notes, boardId])

  const handleRedo = useCallback(async () => {
    const last = redoStack[redoStack.length - 1]
    if (!last) return
    setRedoStack(r => r.slice(0, -1))
    if (last.type === 'create') {
      setNotes(ns => ns.filter(n => n.id !== last.note.id))
      await fetch(`/api/stickies/${last.note.id}`, { method: 'DELETE' })
      setHistory(h => [...h, last])
    } else if (last.type === 'delete') {
      const res = await fetch(`/api/boards/${boardId}/stickies`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(last.note) })
      if (res.ok) { const restored = await res.json(); setNotes(ns => [...ns, restored]); setHistory(h => [...h, { ...last, note: restored }]) }
    } else if (last.type === 'update') {
      setNotes(ns => ns.map(n => n.id === last.note.id ? { ...n, ...last.note } : n))
      await fetch(`/api/stickies/${last.note.id}`, { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ content: last.note.content, color: last.note.color }) })
      setHistory(h => [...h, last])
    }
  }, [redoStack, boardId])

  // Canvas element handlers
  const handleCreateElement = useCallback(async (el: Omit<CanvasElement, 'id' | 'board_id' | 'created_at' | 'updated_at'>) => {
    const created_by = userRef.current?.id ?? ''
    const tempId = `temp_${Date.now()}`
    const now = new Date().toISOString()
    // Optimistic: show immediately with a temp ID so tools work even if DB table missing
    const optimistic: CanvasElement = { id: tempId, board_id: boardId, created_at: now, updated_at: now, ...el, created_by }
    setCanvasElements(prev => [...prev, optimistic])

    const res = await fetch(`/api/boards/${boardId}/canvas-elements`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ ...el, created_by }),
    })
    if (res.ok) {
      const saved = await res.json()
      // Swap temp ID with real persisted record
      setCanvasElements(prev => prev.map(x => x.id === tempId ? saved : x))
      setHistory(h => [...h, { type: 'el_create', elementId: saved.id }])
      setRedoStack([])
    }
    // If API fails (e.g. migration not run): element stays with temp ID, usable within session
  }, [boardId])

  const handleUpdateElement = useCallback(async (id: string, updates: Partial<CanvasElement>) => {
    setCanvasElements(prev => prev.map(x => x.id === id ? { ...x, ...updates } : x))
    if (id.startsWith('temp_')) return  // not yet in DB
    await fetch(`/api/canvas-elements/${id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(updates),
    })
  }, [])

  const handleDeleteElement = useCallback(async (id: string) => {
    const snapshot = canvasElementsRef.current.find(x => x.id === id)
    setCanvasElements(prev => prev.filter(x => x.id !== id))
    if (id.startsWith('temp_')) return  // not yet in DB
    await fetch(`/api/canvas-elements/${id}`, { method: 'DELETE' })
    if (snapshot) { setHistory(h => [...h, { type: 'el_delete', element: snapshot }]); setRedoStack([]) }
  }, [])

  const handleReaction = useCallback((noteId: string, emoji: string) => {
    requireUser(async () => {
      const currentUser = userRef.current
      if (!currentUser) return

      // 判斷目前是否已反應過（讀 ref 避免 stale closure）
      const note = notesRef.current.find(n => n.id === noteId)
      const existing = note?.reactions?.find(r => r.user_id === currentUser.id && r.emoji === emoji)

      if (existing) {
        // 樂觀移除
        setNotes(prev => prev.map(n => n.id === noteId
          ? { ...n, reactions: (n.reactions ?? []).filter(r => r.id !== existing.id) }
          : n
        ))
      } else {
        // 樂觀新增（暫時用 temp ID）
        const tempReaction: Reaction = {
          id: `temp_${Date.now()}`,
          sticky_note_id: noteId,
          user_id: currentUser.id,
          user_name: currentUser.name,
          emoji,
          created_at: new Date().toISOString(),
        }
        setNotes(prev => prev.map(n => n.id === noteId
          ? { ...n, reactions: [...(n.reactions ?? []), tempReaction] }
          : n
        ))
        // API 回傳後以真實 ID 取代 temp ID
        const res = await fetch(`/api/stickies/${noteId}/reactions`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ user_id: currentUser.id, user_name: currentUser.name, emoji }),
        })
        if (res.ok) {
          const result = await res.json()
          if (!result.removed) {
            setNotes(prev => prev.map(n => n.id === noteId
              ? { ...n, reactions: (n.reactions ?? []).map(r => r.id === tempReaction.id ? result : r) }
              : n
            ))
          }
        }
        return
      }

      // 移除的 API 呼叫（樂觀更新已完成，只需確認伺服器同步）
      await fetch(`/api/stickies/${noteId}/reactions`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ user_id: currentUser.id, user_name: currentUser.name, emoji }),
      })
    })
  }, [requireUser])

  const handleAddComment = useCallback(async (noteId: string, content: string) => {
    const currentUser = userRef.current
    if (!currentUser) return
    await fetch(`/api/stickies/${noteId}/comments`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ author_id: currentUser.id, author_name: currentUser.name, content }) })
  }, [])

  const handleAddElementComment = useCallback(async (elementId: string, content: string) => {
    const currentUser = userRef.current
    if (!currentUser) return
    await fetch(`/api/canvas-elements/${elementId}/comments`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ author_id: currentUser.id, author_name: currentUser.name, content }) })
  }, [])

  const handleDeleteComment = useCallback(async (commentId: string) => {
    setNotes(ns => ns.map(n => ({ ...n, comments: (n.comments ?? []).filter(c => c.id !== commentId) })))
    setCommentNote(prev => prev ? { ...prev, comments: (prev.comments ?? []).filter(c => c.id !== commentId) } : prev)
    setCanvasElements(prev => prev.map(el => ({ ...el, comments: (el.comments ?? []).filter(c => c.id !== commentId) })))
    setCommentElement(prev => prev ? { ...prev, comments: (prev.comments ?? []).filter(c => c.id !== commentId) } : prev)
    await fetch(`/api/comments/${commentId}`, { method: 'DELETE' })
  }, [])

  const handleEditComment = useCallback(async (commentId: string, content: string) => {
    const updated = { content }
    setNotes(ns => ns.map(n => ({ ...n, comments: (n.comments ?? []).map(c => c.id === commentId ? { ...c, ...updated } : c) })))
    setCommentNote(prev => prev ? { ...prev, comments: (prev.comments ?? []).map(c => c.id === commentId ? { ...c, ...updated } : c) } : prev)
    setCanvasElements(prev => prev.map(el => ({ ...el, comments: (el.comments ?? []).map(c => c.id === commentId ? { ...c, ...updated } : c) })))
    setCommentElement(prev => prev ? { ...prev, comments: (prev.comments ?? []).map(c => c.id === commentId ? { ...c, ...updated } : c) } : prev)
    await fetch(`/api/comments/${commentId}`, { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(updated) })
  }, [])

  const handleElementReaction = useCallback((elementId: string, emoji: string) => {
    requireUser(async () => {
      const currentUser = userRef.current
      if (!currentUser) return
      const el = canvasElementsRef.current.find(e => e.id === elementId)
      const existing = el?.reactions?.find(r => r.user_id === currentUser.id && r.emoji === emoji)

      if (existing) {
        setCanvasElements(prev => prev.map(e => e.id === elementId
          ? { ...e, reactions: (e.reactions ?? []).filter(r => r.id !== existing.id) }
          : e
        ))
      } else {
        const tempReaction: Reaction = {
          id: `temp_${Date.now()}`,
          canvas_element_id: elementId,
          user_id: currentUser.id,
          user_name: currentUser.name,
          emoji,
          created_at: new Date().toISOString(),
        }
        setCanvasElements(prev => prev.map(e => e.id === elementId
          ? { ...e, reactions: [...(e.reactions ?? []), tempReaction] }
          : e
        ))
        const res = await fetch(`/api/canvas-elements/${elementId}/reactions`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ user_id: currentUser.id, user_name: currentUser.name, emoji }),
        })
        if (res.ok) {
          const result = await res.json()
          if (!result.removed) {
            setCanvasElements(prev => prev.map(e => e.id === elementId
              ? { ...e, reactions: (e.reactions ?? []).map(r => r.id === tempReaction.id ? result : r) }
              : e
            ))
          }
        }
        return
      }

      await fetch(`/api/canvas-elements/${elementId}/reactions`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ user_id: currentUser.id, user_name: currentUser.name, emoji }),
      })
    })
  }, [requireUser])

  const handleCreateActionItem = useCallback(async (item: Partial<ActionItem>) => {
    const res = await fetch(`/api/boards/${boardId}/action-items`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(item) })
    if (res.ok) { const data = await res.json(); setActionItems(prev => [...prev, data]) }
  }, [boardId])

  const handleUpdateActionStatus = useCallback(async (id: string, status: ActionItem['status']) => {
    setActionItems(prev => prev.map(a => a.id === id ? { ...a, status } : a))
    await fetch(`/api/action-items/${id}`, { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ status }) })
  }, [])

  const handleDeleteActionItem = useCallback(async (id: string) => {
    setActionItems(prev => prev.filter(a => a.id !== id))
    await fetch(`/api/action-items/${id}`, { method: 'DELETE' })
  }, [])

  const handleExport = async () => {
    setShowExport(true)
    setExportPayload(null)
    setExportLoading(true)
    try {
      const res = await fetch(`/api/sessions/${sessionId}/export`)
      if (res.ok) { const { payload } = await res.json(); setExportPayload(payload) }
    } finally { setExportLoading(false) }
  }

  const handleDeleteBoard = async () => {
    const res = await fetch(`/api/sessions/${sessionId}`, { method: 'DELETE' })
    if (res.ok) { routerEvents.start(); router.push('/') }
  }

  const handleSaveSettings = async (updates: { team: string; sprint_number?: number }) => {
    const res = await fetch(`/api/sessions/${sessionId}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(updates),
    })
    if (res.ok) {
      setSessionTeam(updates.team || undefined)
      setSessionSprint(updates.sprint_number)
    }
  }

  const handleAutoArrange = useCallback((sectionId: string) => {
    const canvas = canvasRef.current
    if (!canvas) return
    const canvasW = canvas.offsetWidth
    const canvasH = canvas.offsetHeight

    const sectionNotes = notesRef.current.filter(n => n.section_id === sectionId)
    if (sectionNotes.length === 0) return

    const updates = calculateAutoArrangePositions(sectionId, sectionNotes, canvasW, canvasH, splitX, splitY)

    // Optimistic update
    setNotes(prev => prev.map(n => {
      const u = updates.find(u => u.id === n.id)
      return u ? { ...n, pos_x: u.pos_x, pos_y: u.pos_y } : n
    }))

    // Persist to DB
    updates.forEach(({ id, pos_x, pos_y }) =>
      fetch(`/api/stickies/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ pos_x, pos_y }),
      })
    )
  }, [splitX, splitY])

  return (
    <div className="min-h-screen bg-gray-100 animate-fade-in"
      style={{ backgroundImage: 'radial-gradient(circle, #d1d5db 1px, transparent 1px)', backgroundSize: '24px 24px' }}>
      <Toolbar
        sessionName={sessionName}
        sprintNumber={sessionSprint}
        team={sessionTeam}
        onlineUsers={onlineUsers}
        currentUser={user ? { ...user, color: boardUserColor } : null}
        onAddNote={(sectionId) => addNote(sectionId)}
        onShowActionItems={() => { setActionItemNote(null); setActionItemInitView('list'); setShowActionItems(true) }}
        actionItemCount={actionItems.length}
        onExport={handleExport}
        boardLink={typeof window !== 'undefined' ? window.location.href : ''}
        onToggleSidebar={() => setSidebarOpen(v => !v)}
        onDeleteBoard={handleDeleteBoard}
        onShowAllComments={() => setShowAllComments(true)}
        totalCommentCount={notes.reduce((sum, n) => sum + (n.comments?.length ?? 0), 0)}
        onOpenSettings={() => setShowSettings(true)}
      />

      <main className="pt-14 overflow-x-auto overflow-y-hidden">
        <DndContext
          sensors={sensors}
          onDragStart={({ active }) => {
            const note = active.data.current?.note as StickyNoteType | undefined
            if (note) setDraggedNote(note)
          }}
          onDragMove={handleDragMove}
          onDragEnd={handleDragEnd}
        >
          <ResizableCanvas
            ref={canvasRef}
            notes={notes}
            canvasElements={canvasElements}
            splitX={splitX}
            splitY={splitY}
            onSplitXChange={setSplitX}
            onSplitYChange={setSplitY}
            onAddNote={addNote}
            onEditNote={editNote}
            onDeleteNote={deleteNote}
            onReaction={handleReaction}
            onComment={(note) => requireUser(() => { setCommentElement(null); setCommentNote(note) })}
            onActionItem={(note) => requireUser(() => { setActionItemNote(note); setActionItemInitView('create'); setShowActionItems(true) })}
            currentUserId={user?.id ?? ''}
            activeTool={activeTool}
            dragOverSection={dragOverSection}
            onCreateElement={handleCreateElement}
            onUpdateElement={handleUpdateElement}
            onDeleteElement={handleDeleteElement}
            onHoverNote={(note) => { hoveredNoteRef.current = note }}
            onElementReaction={handleElementReaction}
            onElementComment={(el) => requireUser(() => { setCommentNote(null); setCommentElement(el) })}
            onElementActionItem={(el) => requireUser(() => { setActionItemNote(null); setActionItemElement(el); setActionItemInitView('create'); setShowActionItems(true) })}
            onAutoArrange={handleAutoArrange}
          />

          <DragOverlay>
            {draggedNote && (
              <div className="w-44 min-h-[110px] rounded-lg shadow-2xl p-3 opacity-90 rotate-3 cursor-grabbing"
                style={{ backgroundColor: draggedNote.color }}>
                <p className="text-sm font-medium text-gray-800">{draggedNote.content}</p>
                <p className="text-xs text-gray-500 mt-2">— {draggedNote.author_name}</p>
              </div>
            )}
          </DragOverlay>
        </DndContext>
      </main>

      <BottomToolbar activeTool={activeTool} onToolChange={setActiveTool} />

      <BoardSidebar currentSessionId={sessionId} isOpen={sidebarOpen} onClose={() => setSidebarOpen(false)} />

      {showNicknameModal && <NicknameModal defaultName={authName} onConfirm={(name) => { setUserName(name); setShowNicknameModal(false) }} />}
      {commentNote && <CommentPanel note={commentNote} currentUser={user} onClose={() => setCommentNote(null)} onAddComment={handleAddComment} onDeleteComment={handleDeleteComment} onEditComment={handleEditComment} />}
      {commentElement && <CommentPanel canvasElement={commentElement} currentUser={user} onClose={() => setCommentElement(null)} onAddComment={handleAddElementComment} onDeleteComment={handleDeleteComment} onEditComment={handleEditComment} />}
      {showAllComments && (
        <AllCommentsPanel
          notes={notes}
          currentUser={user ? { ...user, color: boardUserColor } : null}
          onClose={() => setShowAllComments(false)}
          onOpenNote={(note) => { setShowAllComments(false); setCommentElement(null); setCommentNote(note) }}
          onDeleteComment={handleDeleteComment}
        />
      )}
      {showActionItems && (
        <ActionItemModal
          note={actionItemNote}
          initialTitle={actionItemElement?.text_content}
          initialView={actionItemInitView}
          existingItems={actionItems}
          currentUser={user}
          onClose={() => { setShowActionItems(false); setActionItemNote(null); setActionItemElement(null); setActionItemInitView('list') }}
          onCreate={handleCreateActionItem} onUpdateStatus={handleUpdateActionStatus} onDelete={handleDeleteActionItem} />
      )}
      {showExport && <ExportModal sessionId={sessionId} payload={exportPayload} loading={exportLoading} onClose={() => setShowExport(false)} />}
      {showSettings && (
        <BoardSettingsModal
          session={{ id: sessionId, name: sessionName, team: sessionTeam, sprint_number: sessionSprint, created_at: '' }}
          onClose={() => setShowSettings(false)}
          onSave={handleSaveSettings}
        />
      )}
      <CursorOverlay cursors={cursors} currentUserId={user?.id ?? ''} />
    </div>
  )
}

'use client'

import { CanvasTool } from '@/types'

interface BottomToolbarProps {
  activeTool: CanvasTool
  onToolChange: (tool: CanvasTool) => void
}

const TOOLS: { id: CanvasTool; label: string; icon: React.ReactNode }[] = [
  {
    id: 'select',
    label: 'Select',
    icon: (
      <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
        <path d="M4 0l16 12-7 1-4 8z" />
      </svg>
    ),
  },
  {
    id: 'text',
    label: 'Text',
    icon: <span className="font-bold text-sm leading-none">T</span>,
  },
  {
    id: 'rect',
    label: 'Rect',
    icon: (
      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
        <rect x="3" y="5" width="18" height="14" rx="1" />
      </svg>
    ),
  },
  {
    id: 'circle',
    label: 'Circle',
    icon: (
      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
        <circle cx="12" cy="12" r="9" />
      </svg>
    ),
  },
  {
    id: 'arrow',
    label: 'Arrow',
    icon: (
      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
        <line x1="5" y1="19" x2="19" y2="5" />
        <polyline points="9 5 19 5 19 15" />
      </svg>
    ),
  },
]

export default function BottomToolbar({ activeTool, onToolChange }: BottomToolbarProps) {
  return (
    <div className="fixed bottom-5 left-1/2 -translate-x-1/2 z-50 flex items-center gap-1 bg-white rounded-2xl shadow-xl border border-gray-200 px-3 py-2">
      {TOOLS.map((tool) => (
        <button
          key={tool.id}
          onClick={() => onToolChange(tool.id)}
          title={tool.label}
          className={`flex flex-col items-center gap-1 px-3 py-2 rounded-xl transition-all text-xs font-medium ${
            activeTool === tool.id
              ? 'bg-blue-500 text-white shadow-md'
              : 'text-gray-500 hover:bg-gray-100 hover:text-gray-700'
          }`}
        >
          {tool.icon}
          <span>{tool.label}</span>
        </button>
      ))}
    </div>
  )
}

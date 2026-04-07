'use client'

import { SectionConfig } from '@/types'

interface SectionProps {
  config: SectionConfig
  noteCount: number
  isHighlighted?: boolean
  onAddNote: (sectionId: string) => void
  onAutoArrange: (sectionId: string) => void
}

export default function Section({ config, noteCount, isHighlighted, onAddNote, onAutoArrange }: SectionProps) {
  return (
    <div
      className={`h-full flex flex-col rounded-2xl border-2 transition-all duration-150 overflow-hidden ${
        isHighlighted ? 'border-blue-400 shadow-xl scale-[1.005]' : 'border-transparent shadow-sm'
      } ${config.sectionBg}`}
    >
      {/* Section Header */}
      <div className={`${config.headerBg} px-4 py-3 flex items-center justify-between shrink-0`}>
        <div className="flex items-center gap-2">
          <span className="text-xl">{config.emoji}</span>
          <h2 className="text-white font-bold text-lg">{config.title}</h2>
          <span className="bg-white bg-opacity-20 text-white text-xs rounded-full px-2 py-0.5">
            {noteCount}
          </span>
        </div>
        <div className="flex items-center gap-1.5">
          <button
            onClick={() => onAutoArrange(config.id)}
            className="bg-white bg-opacity-80 hover:bg-opacity-100 text-gray-700 rounded-lg px-2 py-1 flex items-center gap-1 transition-all text-xs font-semibold"
            title="Auto-arrange notes by author"
          >
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
              <line x1="3" y1="6" x2="21" y2="6" />
              <line x1="3" y1="12" x2="21" y2="12" />
              <line x1="3" y1="18" x2="21" y2="18" />
            </svg>
            Auto
          </button>
          <button
            onClick={() => onAddNote(config.id)}
            className="bg-white bg-opacity-25 hover:bg-opacity-40 text-white rounded-full w-7 h-7 flex items-center justify-center transition-all text-lg font-bold"
            title={`Add sticky note to ${config.title}`}
          >
            +
          </button>
        </div>
      </div>

      {/* Subtitle */}
      <div className="px-4 py-2 bg-gray-100 shrink-0">
        <p className="text-sm text-gray-600 font-bold">{config.subtitle}</p>
      </div>

      {/* Notes area — purely visual; actual notes rendered in canvas overlay */}
      <div className="flex-1" />
    </div>
  )
}

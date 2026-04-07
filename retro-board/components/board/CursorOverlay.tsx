'use client'

import { CursorPosition } from '@/types'

interface CursorOverlayProps {
  cursors: CursorPosition[]
  currentUserId: string
}

export default function CursorOverlay({ cursors, currentUserId }: CursorOverlayProps) {
  return (
    <div className="fixed inset-0 pointer-events-none z-50 overflow-hidden">
      {cursors
        .filter((c) => c.userId !== currentUserId)
        .map((cursor) => (
          <div
            key={cursor.userId}
            className="absolute transition-all duration-75"
            style={{ left: cursor.x, top: cursor.y }}
          >
            <svg width="20" height="20" viewBox="0 0 20 20" fill="none">
              <path
                d="M4 2l12 7-6 1-3 6L4 2z"
                fill={cursor.color}
                stroke="white"
                strokeWidth="1.5"
              />
            </svg>
            <span
              className="absolute top-5 left-2 text-xs text-white rounded-full px-2 py-0.5 whitespace-nowrap font-medium"
              style={{ backgroundColor: cursor.color }}
            >
              {cursor.userName}
            </span>
          </div>
        ))}
    </div>
  )
}

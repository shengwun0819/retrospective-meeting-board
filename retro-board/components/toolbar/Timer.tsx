'use client'

import { useState, useEffect, useCallback } from 'react'

const DURATIONS = [
  { label: '3m', seconds: 180 },
  { label: '5m', seconds: 300 },
  { label: '10m', seconds: 600 },
]

export default function Timer() {
  const [selected, setSelected] = useState(300)
  const [remaining, setRemaining] = useState(300)
  const [running, setRunning] = useState(false)

  useEffect(() => {
    if (!running) return
    if (remaining <= 0) {
      setRunning(false)
      return
    }
    const interval = setInterval(() => setRemaining((r) => r - 1), 1000)
    return () => clearInterval(interval)
  }, [running, remaining])

  const reset = useCallback(() => {
    setRunning(false)
    setRemaining(selected)
  }, [selected])

  const selectDuration = (s: number) => {
    setSelected(s)
    setRemaining(s)
    setRunning(false)
  }

  const minutes = Math.floor(remaining / 60)
  const seconds = remaining % 60
  const pct = remaining / selected
  const isUrgent = remaining <= 30 && running

  return (
    <div className="flex items-center gap-2">
      <div className="flex gap-1">
        {DURATIONS.map((d) => (
          <button
            key={d.seconds}
            onClick={() => selectDuration(d.seconds)}
            className={`text-xs px-2 py-1 rounded transition-all ${
              selected === d.seconds
                ? 'bg-blue-500 text-white'
                : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
            }`}
          >
            {d.label}
          </button>
        ))}
      </div>

      <div
        className={`font-mono font-bold text-sm px-3 py-1 rounded-lg min-w-[56px] text-center transition-all ${
          isUrgent ? 'bg-red-100 text-red-600 animate-pulse' : 'bg-gray-100 text-gray-700'
        }`}
      >
        {String(minutes).padStart(2, '0')}:{String(seconds).padStart(2, '0')}
      </div>

      <div className="flex gap-1">
        <button
          onClick={() => setRunning((r) => !r)}
          className="bg-gray-100 hover:bg-gray-200 text-gray-700 px-2 py-1 rounded text-sm transition-all"
        >
          {running ? '⏸' : '▶'}
        </button>
        <button
          onClick={reset}
          className="bg-gray-100 hover:bg-gray-200 text-gray-700 px-2 py-1 rounded text-sm transition-all"
        >
          ↺
        </button>
      </div>
    </div>
  )
}

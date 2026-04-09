'use client'

import { useState } from 'react'

export default function FeedbackButton() {
  const [open, setOpen] = useState(false)
  const [feedback, setFeedback] = useState('')
  const [sent, setSent] = useState(false)
  const [sending, setSending] = useState(false)

  const handleSend = async () => {
    if (!feedback.trim()) return
    setSending(true)
    try {
      await fetch('/api/feedback', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ content: feedback.trim() }),
      })
    } catch {
      // best-effort; don't block user
    } finally {
      setSending(false)
      setSent(true)
      setFeedback('')
      setTimeout(() => { setSent(false); setOpen(false) }, 2000)
    }
  }

  return (
    <>
      {/* Floating button */}
      <button
        onClick={() => setOpen(true)}
        className="fixed bottom-5 right-5 z-40 flex items-center gap-1.5 bg-white hover:bg-gray-50 text-gray-700 text-sm font-medium px-4 py-2.5 rounded-full shadow-lg border border-gray-200 transition-all hover:shadow-xl"
        title="Send feedback"
      >
        💬 Feedback
      </button>

      {/* Modal */}
      {open && (
        <div className="fixed inset-0 bg-black/30 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md flex flex-col">
            <div className="p-5 border-b border-gray-200 flex items-center justify-between">
              <div>
                <h2 className="font-bold text-gray-800 text-lg">💬 Share Your Feedback</h2>
                <p className="text-xs text-gray-400 mt-0.5">Help us improve the retro board experience</p>
              </div>
              <button onClick={() => setOpen(false)} className="text-gray-400 hover:text-gray-600 text-2xl leading-none">×</button>
            </div>

            <div className="p-5 space-y-4">
              <p className="text-sm text-gray-500">
                Tell us what you liked, what could be better, or any ideas you have. All feedback is welcome!
              </p>
              <textarea
                value={feedback}
                onChange={(e) => setFeedback(e.target.value)}
                placeholder="e.g. It would be great if I could filter notes by author..."
                rows={5}
                className="w-full border border-gray-200 rounded-xl px-4 py-3 text-sm focus:outline-none focus:border-blue-500 transition-colors resize-none"
                autoFocus
              />
            </div>

            <div className="p-4 border-t border-gray-200 flex gap-3">
              <button
                onClick={() => setOpen(false)}
                className="flex-1 bg-gray-100 hover:bg-gray-200 text-gray-700 font-medium py-2.5 rounded-xl transition-all text-sm"
              >
                Cancel
              </button>
              <button
                onClick={handleSend}
                disabled={!feedback.trim() || sending || sent}
                className="flex-1 bg-blue-500 hover:bg-blue-600 text-white font-medium py-2.5 rounded-xl transition-all text-sm disabled:opacity-50"
              >
                {sent ? '✓ Sent!' : sending ? 'Sending...' : 'Send'}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  )
}

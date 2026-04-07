'use client'

import { useState } from 'react'
import { RetroExportPayload } from '@/lib/clickup'

interface ExportModalProps {
  sessionId: string
  payload: RetroExportPayload | null
  loading: boolean
  onClose: () => void
}

export default function ExportModal({ sessionId, payload, loading, onClose }: ExportModalProps) {
  const [copied, setCopied] = useState<'command' | 'json' | null>(null)

  const command = `/clickup-export ${sessionId}`

  const copyText = async (text: string, type: 'command' | 'json') => {
    await navigator.clipboard.writeText(text)
    setCopied(type)
    setTimeout(() => setCopied(null), 2000)
  }

  return (
    <div className="fixed inset-0 bg-black/30 backdrop-blur-sm flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg max-h-[85vh] flex flex-col">
        {/* Header */}
        <div className="p-5 border-b border-gray-200 flex items-center justify-between">
          <div>
            <h2 className="font-bold text-gray-800 text-lg">📤 Export to ClickUp</h2>
            <p className="text-xs text-gray-400 mt-0.5">Writes to the retro record doc via ClickUp MCP Server</p>
          </div>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600 text-2xl leading-none">×</button>
        </div>

        <div className="flex-1 overflow-y-auto p-5 space-y-5">
          {loading ? (
            <div className="flex items-center justify-center py-12 text-gray-400">
              <div className="text-center">
                <div className="text-3xl mb-3 animate-spin">⏳</div>
                <p className="text-sm">Loading export data...</p>
              </div>
            </div>
          ) : !payload ? (
            <div className="text-center py-12 text-gray-400">
              <p className="text-4xl mb-3">⚠️</p>
              <p className="text-sm">Failed to load export data</p>
            </div>
          ) : (
            <>
              {/* Step 1 */}
              <div className="bg-blue-50 rounded-xl p-4 border border-blue-100">
                <p className="text-sm font-semibold text-blue-800 mb-2">
                  Step 1: Make sure ClickUp MCP Server is configured in Claude Code
                </p>
                <p className="text-xs text-blue-600 leading-relaxed">
                  Add the ClickUp MCP Server (OAuth mode) to your Claude Code settings (<code className="bg-blue-100 px-1 rounded">~/.claude/settings.json</code>). The browser will open automatically for authorization on first use — no API token needed.
                </p>
              </div>

              {/* Step 2 */}
              <div className="bg-gray-50 rounded-xl p-4 border border-gray-200">
                <p className="text-sm font-semibold text-gray-700 mb-2">
                  Step 2: Run this command in Claude Code
                </p>
                <div className="flex items-center gap-2">
                  <code className="flex-1 bg-gray-900 text-green-400 rounded-lg px-3 py-2 text-sm font-mono">
                    {command}
                  </code>
                  <button
                    onClick={() => copyText(command, 'command')}
                    className={`shrink-0 px-3 py-2 rounded-lg text-xs font-medium transition-all ${
                      copied === 'command'
                        ? 'bg-green-100 text-green-700'
                        : 'bg-gray-200 hover:bg-gray-300 text-gray-700'
                    }`}
                  >
                    {copied === 'command' ? 'Copied!' : 'Copy'}
                  </button>
                </div>
                <p className="text-xs text-gray-500 mt-2">
                  Claude will read this session&apos;s retro data and create a new page in the &quot;retro record&quot; doc via ClickUp MCP.
                </p>
              </div>

              {/* Summary Preview */}
              <div className="border border-gray-200 rounded-xl overflow-hidden">
                <div className="bg-gray-50 px-4 py-2 flex items-center justify-between">
                  <p className="text-xs font-semibold text-gray-600">Export data preview</p>
                  <button
                    onClick={() => copyText(JSON.stringify({ payload }, null, 2), 'json')}
                    className={`text-xs px-2 py-1 rounded transition-all ${
                      copied === 'json'
                        ? 'text-green-600'
                        : 'text-gray-500 hover:text-gray-700'
                    }`}
                  >
                    {copied === 'json' ? 'Copied JSON' : 'Copy JSON'}
                  </button>
                </div>
                <div className="p-4 space-y-3">
                  <div>
                    <p className="text-xs text-gray-500 mb-1">Task title</p>
                    <p className="text-sm font-medium text-gray-800">{payload.taskName}</p>
                  </div>
                  <div>
                    <p className="text-xs text-gray-500 mb-1">Tags</p>
                    <div className="flex gap-1 flex-wrap">
                      {payload.tags.map((tag) => (
                        <span key={tag} className="text-xs bg-purple-100 text-purple-700 rounded-full px-2 py-0.5">
                          {tag}
                        </span>
                      ))}
                    </div>
                  </div>
                  <div>
                    <p className="text-xs text-gray-500 mb-1">
                      Act notes ({payload.actNotes.length})
                    </p>
                    {payload.actNotes.length === 0 ? (
                      <p className="text-xs text-gray-400 italic">(empty)</p>
                    ) : (
                      <ul className="space-y-1">
                        {payload.actNotes.slice(0, 3).map((n, i) => (
                          <li key={i} className="text-xs text-gray-700 truncate">
                            • {n.content} <span className="text-gray-400">— {n.author}</span>
                          </li>
                        ))}
                        {payload.actNotes.length > 3 && (
                          <li className="text-xs text-gray-400">...and {payload.actNotes.length - 3} more</li>
                        )}
                      </ul>
                    )}
                  </div>
                  <div>
                    <p className="text-xs text-gray-500 mb-1">
                      Action items ({payload.actionItems.length})
                    </p>
                    {payload.actionItems.length === 0 ? (
                      <p className="text-xs text-gray-400 italic">(no action items)</p>
                    ) : (
                      <ul className="space-y-1">
                        {payload.actionItems.slice(0, 3).map((a, i) => (
                          <li key={i} className="text-xs text-gray-700 truncate">
                            <span className={`inline-block rounded px-1 mr-1 ${
                              a.status === 'Done' ? 'bg-green-100 text-green-700' :
                              a.status === 'InProgress' ? 'bg-blue-100 text-blue-700' :
                              'bg-gray-100 text-gray-600'
                            }`}>{a.status}</span>
                            {a.title}
                          </li>
                        ))}
                        {payload.actionItems.length > 3 && (
                          <li className="text-xs text-gray-400">...and {payload.actionItems.length - 3} more</li>
                        )}
                      </ul>
                    )}
                  </div>
                </div>
              </div>
            </>
          )}
        </div>

        <div className="p-4 border-t border-gray-200">
          <button
            onClick={onClose}
            className="w-full bg-gray-100 hover:bg-gray-200 text-gray-700 font-medium py-2.5 rounded-xl transition-all text-sm"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  )
}

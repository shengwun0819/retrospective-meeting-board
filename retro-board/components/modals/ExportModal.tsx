'use client'

import { useState } from 'react'
import { RetroExportPayload } from '@/lib/clickup'

interface ExportModalProps {
  sessionId: string
  payload: RetroExportPayload | null
  loading: boolean
  onClose: () => void
}

// Recursive JSON tree node
function JsonNode({ value, depth = 0 }: { value: unknown; depth?: number }) {
  const [open, setOpen] = useState(depth < 2)

  if (value === null) return <span className="text-gray-400">null</span>
  if (typeof value === 'boolean') return <span className="text-purple-500">{value.toString()}</span>
  if (typeof value === 'number') return <span className="text-blue-500">{value}</span>
  if (typeof value === 'string') return <span className="text-green-600">&quot;{value}&quot;</span>

  if (Array.isArray(value)) {
    if (value.length === 0) return <span className="text-gray-400">[]</span>
    return (
      <span>
        <button onClick={() => setOpen(o => !o)} className="text-gray-500 hover:text-gray-700 font-mono text-xs mr-1">{open ? '▼' : '▶'}</button>
        <span className="text-gray-500">[{!open && <span className="text-gray-400 italic"> {value.length} items </span>}]</span>
        {open && (
          <div className="pl-4 border-l border-gray-100 dark:border-gray-700 ml-1 mt-0.5 space-y-0.5">
            {value.map((item, i) => (
              <div key={i} className="flex gap-1 items-start">
                <span className="text-gray-300 text-xs shrink-0">{i}:</span>
                <JsonNode value={item} depth={depth + 1} />
              </div>
            ))}
          </div>
        )}
      </span>
    )
  }

  if (typeof value === 'object') {
    const keys = Object.keys(value as object)
    if (keys.length === 0) return <span className="text-gray-400">{'{}'}</span>
    return (
      <span>
        <button onClick={() => setOpen(o => !o)} className="text-gray-500 hover:text-gray-700 font-mono text-xs mr-1">{open ? '▼' : '▶'}</button>
        <span className="text-gray-500">{'{'}{!open && <span className="text-gray-400 italic"> {keys.length} keys </span>}{'}'}</span>
        {open && (
          <div className="pl-4 border-l border-gray-100 dark:border-gray-700 ml-1 mt-0.5 space-y-0.5">
            {keys.map(k => (
              <div key={k} className="flex gap-1 items-start">
                <span className="text-amber-600 text-xs shrink-0 font-medium">{k}:</span>
                <JsonNode value={(value as Record<string, unknown>)[k]} depth={depth + 1} />
              </div>
            ))}
          </div>
        )}
      </span>
    )
  }

  return <span className="text-gray-700">{String(value)}</span>
}

export default function ExportModal({ sessionId, payload, loading, onClose }: ExportModalProps) {
  const [copied, setCopied] = useState<'command' | 'json' | null>(null)
  const [spaceId, setSpaceId] = useState('')
  const [docName, setDocName] = useState('')

  const command = spaceId && docName
    ? `/clickup-export ${sessionId} --space-id ${spaceId} --doc "${docName}"`
    : `/clickup-export ${sessionId}`

  const copyText = async (text: string, type: 'command' | 'json') => {
    await navigator.clipboard.writeText(text)
    setCopied(type)
    setTimeout(() => setCopied(null), 2000)
  }

  return (
    <div className="fixed inset-0 bg-black/30 backdrop-blur-sm flex items-center justify-center z-50 p-4">
      <div className="bg-white dark:bg-gray-900 rounded-2xl shadow-2xl w-full max-w-lg max-h-[90vh] flex flex-col">
        {/* Header */}
        <div className="p-5 border-b border-gray-200 dark:border-gray-700 flex items-center justify-between shrink-0">
          <div>
            <h2 className="font-bold text-gray-800 dark:text-gray-100 text-lg">📤 Export to ClickUp</h2>
            <p className="text-xs text-gray-400 dark:text-gray-500 mt-0.5">Writes to your ClickUp doc via ClickUp MCP Server</p>
          </div>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 text-2xl leading-none">×</button>
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
              {/* Step 1: MCP Setup */}
              <div className="bg-blue-50 rounded-xl p-4 border border-blue-100 space-y-3">
                <p className="text-sm font-semibold text-blue-800">
                  Step 1: Configure ClickUp MCP Server in Claude Code
                </p>
                <p className="text-xs text-blue-600 leading-relaxed">
                  Add the following to <code className="bg-blue-100 px-1 rounded">~/.claude/settings.json</code> under <code className="bg-blue-100 px-1 rounded">mcpServers</code>:
                </p>
                <div className="relative">
                  <pre className="bg-blue-900 text-blue-100 rounded-lg p-3 text-xs overflow-x-auto font-mono leading-relaxed">{`"clickup": {
  "command": "npx",
  "args": ["-y", "@clickup/mcp-server"],
  "env": { "CLICKUP_AUTH_TYPE": "oauth" }
}`}</pre>
                </div>
                <p className="text-xs text-blue-500">
                  The browser will open automatically for OAuth authorization on first use — no API token needed.
                </p>
              </div>

              {/* Step 2: Target */}
              <div className="bg-gray-50 dark:bg-gray-800 rounded-xl p-4 border border-gray-200 dark:border-gray-700 space-y-3">
                <p className="text-sm font-semibold text-gray-700 dark:text-gray-200">Step 2: Set export target (optional)</p>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-medium text-gray-600 dark:text-gray-400 mb-1">Space ID</label>
                    <input
                      type="text"
                      value={spaceId}
                      onChange={(e) => setSpaceId(e.target.value)}
                      placeholder="e.g. 90151234"
                      className="w-full border border-gray-200 dark:border-gray-700 rounded-lg px-3 py-2 text-xs focus:outline-none focus:border-blue-500 transition-colors bg-white dark:bg-gray-900 text-gray-800 dark:text-gray-100 placeholder-gray-400 dark:placeholder-gray-500"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-gray-600 dark:text-gray-400 mb-1">Document name</label>
                    <input
                      type="text"
                      value={docName}
                      onChange={(e) => setDocName(e.target.value)}
                      placeholder="e.g. Retro Record"
                      className="w-full border border-gray-200 dark:border-gray-700 rounded-lg px-3 py-2 text-xs focus:outline-none focus:border-blue-500 transition-colors bg-white dark:bg-gray-900 text-gray-800 dark:text-gray-100 placeholder-gray-400 dark:placeholder-gray-500"
                    />
                  </div>
                </div>
                {(!spaceId || !docName) && (
                  <p className="text-xs text-gray-400 dark:text-gray-500">Leave blank to use the default hardcoded target.</p>
                )}
              </div>

              {/* Step 3: Command */}
              <div className="bg-gray-50 dark:bg-gray-800 rounded-xl p-4 border border-gray-200 dark:border-gray-700">
                <p className="text-sm font-semibold text-gray-700 dark:text-gray-200 mb-2">
                  Step 3: Run this command in Claude Code
                </p>
                <div className="flex items-center gap-2">
                  <code className="flex-1 bg-gray-900 text-green-400 rounded-lg px-3 py-2 text-xs font-mono break-all">
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
                <p className="text-xs text-gray-500 dark:text-gray-400 mt-2">
                  Claude will read this session&apos;s retro data and create a new page in the target doc.
                </p>
              </div>

              {/* Export Data Preview (JSON tree) */}
              <div className="border border-gray-200 dark:border-gray-700 rounded-xl overflow-hidden">
                <div className="bg-gray-50 dark:bg-gray-800 px-4 py-2 flex items-center justify-between">
                  <p className="text-xs font-semibold text-gray-600 dark:text-gray-300">Export data preview</p>
                  <button
                    onClick={() => copyText(JSON.stringify({ payload }, null, 2), 'json')}
                    className={`text-xs px-2 py-1 rounded transition-all ${
                      copied === 'json'
                        ? 'text-green-600 dark:text-green-400'
                        : 'text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200'
                    }`}
                  >
                    {copied === 'json' ? 'Copied JSON' : 'Copy JSON'}
                  </button>
                </div>
                <div className="p-4 text-xs font-mono overflow-x-auto max-h-64 overflow-y-auto bg-white dark:bg-gray-900">
                  <JsonNode value={payload} depth={0} />
                </div>
              </div>
            </>
          )}
        </div>

        <div className="p-4 border-t border-gray-200 dark:border-gray-700 shrink-0">
          <button
            onClick={onClose}
            className="w-full bg-gray-100 hover:bg-gray-200 dark:bg-gray-800 dark:hover:bg-gray-700 text-gray-700 dark:text-gray-200 font-medium py-2.5 rounded-xl transition-all text-sm"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  )
}

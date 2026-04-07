import { RetroSession, StickyNote, ActionItem } from '@/types'

/**
 * ClickUp integration uses MCP Server mode.
 *
 * This module formats retro data into a structured payload.
 * The actual ClickUp Doc Page creation is performed by Claude Code (with ClickUp MCP Server).
 *
 * Workflow:
 *   1. User clicks "Export" → frontend calls GET /api/sessions/[id]/export to get the payload
 *   2. User runs /clickup-export <session-id> in Claude Code
 *   3. Claude creates a new Page in the "retro record" Doc via ClickUp MCP Server
 */

export interface SectionNotes {
  sectionId: string
  sectionName: string
  notes: Array<{
    content: string
    author: string
    comments: Array<{ content: string; author: string }>
  }>
}

export interface RetroExportPayload {
  taskName: string
  description: string
  tags: string[]
  session: {
    id: string
    name: string
    sprintNumber?: number
    startDate?: string
    endDate?: string
  }
  sections: SectionNotes[]
  actNotes: Array<{ content: string; author: string }>
  actionItems: Array<{
    title: string
    description?: string
    owner?: string
    dueDate?: string
    status: string
  }>
  markdownContent: string
}

const SECTION_LABELS: Record<string, string> = {
  continue: 'Continue ✅',
  stop: 'Stop 🛑',
  invent: 'Invent 💡',
  act: 'Act 💪',
}

/**
 * Formats retro data into a payload for use by ClickUp MCP.
 * This function is a pure data transformation — it makes no network requests.
 */
export function buildRetroExportPayload(
  session: RetroSession,
  allNotes: StickyNote[],
  actionItems: ActionItem[]
): RetroExportPayload {
  const sprintLabel = session.sprint_number ? `Sprint ${session.sprint_number}` : ''
  const period =
    session.start_date && session.end_date
      ? `${session.start_date} ~ ${session.end_date}`
      : ''

  const sectionOrder = ['continue', 'stop', 'invent', 'act']
  const notesBySection = sectionOrder.map((sectionId) => ({
    sectionId,
    sectionName: SECTION_LABELS[sectionId] ?? sectionId,
    notes: allNotes
      .filter((n) => n.section_id === sectionId)
      .map((n) => ({
        content: n.content,
        author: n.author_name,
        comments: (n.comments ?? []).map((c) => ({ content: c.content, author: c.author_name })),
      })),
  }))

  const actNotes = notesBySection.find((s) => s.sectionId === 'act')?.notes ?? []

  // 建立完整 Markdown 內容（供寫入 ClickUp Doc Page）
  const lines: string[] = [
    `# ${sprintLabel ? sprintLabel + ' ' : ''}Retrospective — ${session.name}`,
    '',
    period ? `**Period:** ${period}` : '',
    `**Export date:** ${new Date().toISOString().split('T')[0]}`,
    '',
    '---',
    '',
  ].filter((l) => l !== undefined)

  for (const section of notesBySection) {
    lines.push(`## ${section.sectionName}`)
    if (section.notes.length === 0) {
      lines.push('(empty)')
    } else {
      for (const n of section.notes) {
        lines.push(`- ${n.content} *(by ${n.author})*`)
        for (const c of n.comments) {
          lines.push(`  - 💬 ${c.content} *(by ${c.author})*`)
        }
      }
    }
    lines.push('')
  }

  lines.push('---', '', '## Action Items', '')
  if (actionItems.length === 0) {
    lines.push('(no action items)')
  } else {
    lines.push('| Item | Owner | Due Date | Status |')
    lines.push('|------|-------|----------|--------|')
    for (const a of actionItems) {
      lines.push(
        `| ${a.title} | ${a.owner_name ?? '—'} | ${a.due_date ?? '—'} | ${a.status} |`
      )
    }
  }

  const markdownContent = lines.join('\n')

  // Plain-text description (for backwards compatibility)
  const description = [
    `## ${sprintLabel ? sprintLabel + ' ' : ''}Retrospective Summary`,
    '',
    `**Session name:** ${session.name}`,
    period ? `**Period:** ${period}` : '',
    '',
    ...notesBySection.map((s) => [
      `### ${s.sectionName}`,
      s.notes.length === 0 ? '(empty)' : s.notes.map((n) => `- ${n.content} (by ${n.author})`).join('\n'),
      '',
    ].join('\n')),
  ]
    .filter((line) => line !== undefined)
    .join('\n')

  return {
    taskName: `Retro: ${session.name}`,
    description,
    tags: ['retro', ...(session.sprint_number ? [`sprint-${session.sprint_number}`] : [])],
    session: {
      id: session.id,
      name: session.name,
      sprintNumber: session.sprint_number,
      startDate: session.start_date,
      endDate: session.end_date,
    },
    sections: notesBySection,
    actNotes,
    actionItems: actionItems.map((a) => ({
      title: a.title,
      description: a.description,
      owner: a.owner_name,
      dueDate: a.due_date,
      status: a.status,
    })),
    markdownContent,
  }
}

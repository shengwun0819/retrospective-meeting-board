export const COL_W = 190
export const ROW_H = 145
export const GROUP_GAP = 20

export interface NotePosition {
  id: string
  pos_x: number
  pos_y: number
}

export interface NoteInput {
  id: string
  author_name: string
}

/**
 * Calculate auto-arrange positions for sticky notes within a section.
 * Notes are grouped by author (alphabetically), wrapped into columns that
 * fit within the section width, and positioned using normalized fractions (0.0–1.0).
 */
export function calculateAutoArrangePositions(
  sectionId: string,
  notes: NoteInput[],
  canvasW: number,
  canvasH: number,
  splitXPercent: number,
  splitYPercent: number
): NotePosition[] {
  if (notes.length === 0) return []

  const splitXPx = canvasW * splitXPercent / 100
  const splitYPx = canvasH * splitYPercent / 100

  const inRight = sectionId === 'stop' || sectionId === 'act'
  const inBottom = sectionId === 'invent' || sectionId === 'act'
  const originX = (inRight ? splitXPx : 0) + 20
  const originY = (inBottom ? splitYPx : 0) + 70

  // Group by author_name, sort alphabetically
  const byAuthor: Record<string, NoteInput[]> = {}
  for (const note of notes) {
    if (!byAuthor[note.author_name]) byAuthor[note.author_name] = []
    byAuthor[note.author_name].push(note)
  }
  const authors = Object.keys(byAuthor).sort()

  // Calculate max columns that fit within the section width
  const sectionW = inRight ? (canvasW - splitXPx) : splitXPx
  const availW = sectionW - 40 // 20px left + 20px right padding
  const maxCols = Math.max(1, Math.floor(availW / COL_W))

  // Pre-calculate Y offset for each group row
  const groupOffsets: number[] = []
  const totalGroups = Math.ceil(authors.length / maxCols)
  let accY = 0
  for (let g = 0; g < totalGroups; g++) {
    groupOffsets.push(accY)
    let maxNotesInGroup = 0
    for (let c = 0; c < maxCols; c++) {
      const aIdx = g * maxCols + c
      if (aIdx < authors.length) {
        maxNotesInGroup = Math.max(maxNotesInGroup, byAuthor[authors[aIdx]].length)
      }
    }
    accY += maxNotesInGroup * ROW_H + GROUP_GAP
  }

  const updates: NotePosition[] = []
  authors.forEach((author, authorIdx) => {
    const colIdx = authorIdx % maxCols
    const groupIdx = Math.floor(authorIdx / maxCols)
    const groupOffsetY = groupOffsets[groupIdx]
    byAuthor[author].forEach((note, rowIdx) => {
      updates.push({
        id: note.id,
        pos_x: (originX + colIdx * COL_W) / canvasW,
        pos_y: (originY + groupOffsetY + rowIdx * ROW_H) / canvasH,
      })
    })
  })

  return updates
}

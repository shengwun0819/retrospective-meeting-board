import { calculateAutoArrangePositions, COL_W, ROW_H } from '@/lib/autoArrange'

const CANVAS_W = 1440
const CANVAS_H = 810
const SPLIT_X = 50 // 50%
const SPLIT_Y = 50 // 50%

describe('calculateAutoArrangePositions', () => {
  it('returns empty array when no notes', () => {
    const result = calculateAutoArrangePositions('continue', [], CANVAS_W, CANVAS_H, SPLIT_X, SPLIT_Y)
    expect(result).toHaveLength(0)
  })

  it('positions single note in top-left section (continue)', () => {
    const notes = [{ id: 'n1', author_name: 'Alice' }]
    const result = calculateAutoArrangePositions('continue', notes, CANVAS_W, CANVAS_H, SPLIT_X, SPLIT_Y)

    expect(result).toHaveLength(1)
    expect(result[0].id).toBe('n1')
    // continue is top-left: originX = 0+20=20, originY = 0+70=70
    expect(result[0].pos_x).toBeCloseTo(20 / CANVAS_W)
    expect(result[0].pos_y).toBeCloseTo(70 / CANVAS_H)
  })

  it('positions note in top-right section (stop) with offset', () => {
    const notes = [{ id: 'n1', author_name: 'Alice' }]
    const result = calculateAutoArrangePositions('stop', notes, CANVAS_W, CANVAS_H, SPLIT_X, SPLIT_Y)

    const splitXPx = CANVAS_W * SPLIT_X / 100 // 720
    // stop is top-right: originX = splitXPx + 20 = 740
    expect(result[0].pos_x).toBeCloseTo((splitXPx + 20) / CANVAS_W)
  })

  it('positions note in bottom-left section (invent) with vertical offset', () => {
    const notes = [{ id: 'n1', author_name: 'Alice' }]
    const result = calculateAutoArrangePositions('invent', notes, CANVAS_W, CANVAS_H, SPLIT_X, SPLIT_Y)

    const splitYPx = CANVAS_H * SPLIT_Y / 100 // 405
    // invent is bottom-left: originY = splitYPx + 70 = 475
    expect(result[0].pos_y).toBeCloseTo((splitYPx + 70) / CANVAS_H)
  })

  it('stacks multiple notes from same author vertically', () => {
    const notes = [
      { id: 'n1', author_name: 'Alice' },
      { id: 'n2', author_name: 'Alice' },
      { id: 'n3', author_name: 'Alice' },
    ]
    const result = calculateAutoArrangePositions('continue', notes, CANVAS_W, CANVAS_H, SPLIT_X, SPLIT_Y)

    expect(result).toHaveLength(3)
    // All same column (Alice is only author)
    expect(result[0].pos_x).toBeCloseTo(result[1].pos_x)
    expect(result[0].pos_x).toBeCloseTo(result[2].pos_x)
    // Stacked vertically: each ROW_H apart
    const dy1 = result[1].pos_y - result[0].pos_y
    const dy2 = result[2].pos_y - result[1].pos_y
    expect(dy1).toBeCloseTo(ROW_H / CANVAS_H)
    expect(dy2).toBeCloseTo(ROW_H / CANVAS_H)
  })

  it('places different authors in different columns', () => {
    const notes = [
      { id: 'n1', author_name: 'Alice' },
      { id: 'n2', author_name: 'Bob' },
    ]
    const result = calculateAutoArrangePositions('continue', notes, CANVAS_W, CANVAS_H, SPLIT_X, SPLIT_Y)

    const alice = result.find(r => r.id === 'n1')!
    const bob = result.find(r => r.id === 'n2')!
    // Alice (first alphabetically) col 0, Bob col 1
    expect(bob.pos_x - alice.pos_x).toBeCloseTo(COL_W / CANVAS_W)
  })

  it('wraps columns when authors exceed section width', () => {
    // Canvas width 1440, split 50% → section width 720, available = 680
    // maxCols = floor(680 / 190) = 3
    // 4 authors → 4th wraps to next row
    const notes = [
      { id: 'n1', author_name: 'Alice' },
      { id: 'n2', author_name: 'Bob' },
      { id: 'n3', author_name: 'Carol' },
      { id: 'n4', author_name: 'Dave' }, // wraps
    ]
    const result = calculateAutoArrangePositions('continue', notes, CANVAS_W, CANVAS_H, SPLIT_X, SPLIT_Y)

    const alice = result.find(r => r.id === 'n1')!
    const dave = result.find(r => r.id === 'n4')!
    // Dave wraps to col 0 of next group → same x as Alice
    expect(dave.pos_x).toBeCloseTo(alice.pos_x)
    // Dave starts below Alice's group
    expect(dave.pos_y).toBeGreaterThan(alice.pos_y)
  })

  it('notes never exceed section right boundary', () => {
    // Many authors → all must stay within section
    const authors = ['A', 'B', 'C', 'D', 'E', 'F', 'G', 'H']
    const notes = authors.map((a, i) => ({ id: `n${i}`, author_name: a }))
    const result = calculateAutoArrangePositions('continue', notes, CANVAS_W, CANVAS_H, SPLIT_X, SPLIT_Y)

    const splitXFraction = SPLIT_X / 100 // 0.5
    result.forEach(r => {
      expect(r.pos_x).toBeLessThan(splitXFraction)
    })
  })

  it('sorts authors alphabetically regardless of note order', () => {
    const notes = [
      { id: 'n1', author_name: 'Zara' },
      { id: 'n2', author_name: 'Alice' },
    ]
    const result = calculateAutoArrangePositions('continue', notes, CANVAS_W, CANVAS_H, SPLIT_X, SPLIT_Y)

    const alice = result.find(r => r.id === 'n2')! // Alice
    const zara = result.find(r => r.id === 'n1')!  // Zara
    // Alice col 0, Zara col 1
    expect(alice.pos_x).toBeLessThan(zara.pos_x)
  })
})

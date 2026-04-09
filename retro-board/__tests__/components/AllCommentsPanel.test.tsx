import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import AllCommentsPanel from '@/components/modals/AllCommentsPanel'
import { StickyNote } from '@/types'

const CURRENT_USER = { id: 'user-1', name: 'Alice', color: '#3b82f6' }

function makeNote(overrides: Partial<StickyNote> = {}): StickyNote {
  return {
    id: 'note-1',
    board_id: 'board-1',
    section_id: 'continue',
    content: 'Test note content',
    color: '#bbf7d0',
    author_id: 'user-1',
    author_name: 'Alice',
    pos_x: 0.1,
    pos_y: 0.1,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
    reactions: [],
    comments: [],
    ...overrides,
  }
}

function setup(notes: StickyNote[] = []) {
  const onClose = jest.fn()
  const onOpenNote = jest.fn()
  const onDeleteComment = jest.fn()
  render(
    <AllCommentsPanel
      notes={notes}
      currentUser={CURRENT_USER}
      onClose={onClose}
      onOpenNote={onOpenNote}
      onDeleteComment={onDeleteComment}
    />
  )
  return { onClose, onOpenNote, onDeleteComment }
}

describe('AllCommentsPanel', () => {
  it('shows empty state when no notes have comments', () => {
    setup([makeNote()])
    expect(screen.getByText('No comments yet')).toBeInTheDocument()
  })

  it('shows total comment count in header', () => {
    const note = makeNote({
      comments: [
        { id: 'c1', sticky_note_id: 'note-1', author_id: 'user-1', author_name: 'Alice', content: 'Hello', created_at: new Date().toISOString() },
        { id: 'c2', sticky_note_id: 'note-1', author_id: 'user-2', author_name: 'Bob', content: 'World', created_at: new Date().toISOString() },
      ],
    })
    setup([note])
    expect(screen.getByText(/2 comments/i)).toBeInTheDocument()
  })

  it('renders note content for notes that have comments', () => {
    const note = makeNote({
      content: 'My important note',
      comments: [
        { id: 'c1', sticky_note_id: 'note-1', author_id: 'user-1', author_name: 'Alice', content: 'Nice!', created_at: new Date().toISOString() },
      ],
    })
    setup([note])
    expect(screen.getByText('My important note')).toBeInTheDocument()
  })

  it('renders comment content', () => {
    const note = makeNote({
      comments: [
        { id: 'c1', sticky_note_id: 'note-1', author_id: 'user-1', author_name: 'Alice', content: 'Great idea!', created_at: new Date().toISOString() },
      ],
    })
    setup([note])
    expect(screen.getByText('Great idea!')).toBeInTheDocument()
  })

  it('does not show notes without comments', () => {
    const noteWithComment = makeNote({
      id: 'note-1',
      content: 'Note with comment',
      comments: [
        { id: 'c1', sticky_note_id: 'note-1', author_id: 'user-1', author_name: 'Alice', content: 'Hi', created_at: new Date().toISOString() },
      ],
    })
    const noteWithoutComment = makeNote({ id: 'note-2', content: 'Note without comment', comments: [] })
    setup([noteWithComment, noteWithoutComment])
    expect(screen.getByText('Note with comment')).toBeInTheDocument()
    expect(screen.queryByText('Note without comment')).not.toBeInTheDocument()
  })

  it('calls onOpenNote when Reply button is clicked', async () => {
    const user = userEvent.setup()
    const note = makeNote({
      comments: [
        { id: 'c1', sticky_note_id: 'note-1', author_id: 'user-1', author_name: 'Alice', content: 'Hi', created_at: new Date().toISOString() },
      ],
    })
    const { onOpenNote } = setup([note])
    await user.click(screen.getByRole('button', { name: /reply/i }))
    expect(onOpenNote).toHaveBeenCalledWith(note)
  })

  it('calls onClose when close button is clicked', async () => {
    const user = userEvent.setup()
    const { onClose } = setup([])
    // Close button (X icon)
    const closeButtons = screen.getAllByRole('button')
    const closeBtn = closeButtons.find(b => b.querySelector('svg line'))
    await user.click(closeBtn!)
    expect(onClose).toHaveBeenCalledTimes(1)
  })

  it('calls onClose when Escape is pressed', async () => {
    const user = userEvent.setup()
    const { onClose } = setup([])
    await user.keyboard('{Escape}')
    expect(onClose).toHaveBeenCalledTimes(1)
  })

  it('shows delete button for own comments on hover', () => {
    const note = makeNote({
      comments: [
        { id: 'c1', sticky_note_id: 'note-1', author_id: 'user-1', author_name: 'Alice', content: 'My comment', created_at: new Date().toISOString() },
      ],
    })
    setup([note])
    // Delete button exists (opacity-0 by default, visible on hover)
    const deleteBtn = screen.getByTitle('Delete comment')
    expect(deleteBtn).toBeInTheDocument()
  })

  it('does not show delete button for other users comments', () => {
    const note = makeNote({
      comments: [
        { id: 'c1', sticky_note_id: 'note-1', author_id: 'user-99', author_name: 'Bob', content: 'Not mine', created_at: new Date().toISOString() },
      ],
    })
    setup([note])
    expect(screen.queryByTitle('Delete comment')).not.toBeInTheDocument()
  })

  it('calls onDeleteComment when delete button is clicked', async () => {
    const user = userEvent.setup()
    const note = makeNote({
      comments: [
        { id: 'c1', sticky_note_id: 'note-1', author_id: 'user-1', author_name: 'Alice', content: 'My comment', created_at: new Date().toISOString() },
      ],
    })
    const { onDeleteComment } = setup([note])
    await user.click(screen.getByTitle('Delete comment'))
    expect(onDeleteComment).toHaveBeenCalledWith('c1')
  })

  it('shows correct section label for note', () => {
    const note = makeNote({ section_id: 'stop' })
    note.comments = [
      { id: 'c1', sticky_note_id: 'note-1', author_id: 'user-1', author_name: 'Alice', content: 'Hi', created_at: new Date().toISOString() },
    ]
    setup([note])
    expect(screen.getByText(/stop/i)).toBeInTheDocument()
  })
})

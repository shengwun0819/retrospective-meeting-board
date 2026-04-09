import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import FeedbackButton from '@/components/FeedbackButton'

// Mock fetch globally
const mockFetch = jest.fn()
global.fetch = mockFetch

beforeEach(() => {
  mockFetch.mockReset()
  mockFetch.mockResolvedValue({ ok: true })
})

function setup() {
  render(<FeedbackButton />)
}

describe('FeedbackButton', () => {
  it('renders the floating feedback button', () => {
    setup()
    expect(screen.getByRole('button', { name: /feedback/i })).toBeInTheDocument()
  })

  it('does not show the modal initially', () => {
    setup()
    expect(screen.queryByPlaceholderText(/e\.g\./i)).not.toBeInTheDocument()
  })

  it('opens the modal when feedback button is clicked', async () => {
    const user = userEvent.setup()
    setup()
    await user.click(screen.getByRole('button', { name: /feedback/i }))
    expect(screen.getByText(/share your feedback/i)).toBeInTheDocument()
    expect(screen.getByPlaceholderText(/e\.g\./i)).toBeInTheDocument()
  })

  it('closes the modal when Cancel is clicked', async () => {
    const user = userEvent.setup()
    setup()
    await user.click(screen.getByRole('button', { name: /feedback/i }))
    await user.click(screen.getByRole('button', { name: /cancel/i }))
    expect(screen.queryByText(/share your feedback/i)).not.toBeInTheDocument()
  })

  it('closes the modal when × is clicked', async () => {
    const user = userEvent.setup()
    setup()
    await user.click(screen.getByRole('button', { name: /feedback/i }))
    await user.click(screen.getByRole('button', { name: '×' }))
    expect(screen.queryByText(/share your feedback/i)).not.toBeInTheDocument()
  })

  it('Send button is disabled when textarea is empty', async () => {
    const user = userEvent.setup()
    setup()
    await user.click(screen.getByRole('button', { name: /feedback/i }))
    expect(screen.getByRole('button', { name: /^send$/i })).toBeDisabled()
  })

  it('Send button becomes enabled when feedback is typed', async () => {
    const user = userEvent.setup()
    setup()
    await user.click(screen.getByRole('button', { name: /feedback/i }))
    await user.type(screen.getByPlaceholderText(/e\.g\./i), 'Great tool!')
    expect(screen.getByRole('button', { name: /^send$/i })).not.toBeDisabled()
  })

  it('calls POST /api/feedback with the typed content', async () => {
    const user = userEvent.setup()
    setup()
    await user.click(screen.getByRole('button', { name: /feedback/i }))
    await user.type(screen.getByPlaceholderText(/e\.g\./i), 'Loving this tool')
    await user.click(screen.getByRole('button', { name: /^send$/i }))
    expect(mockFetch).toHaveBeenCalledWith(
      '/api/feedback',
      expect.objectContaining({
        method: 'POST',
        body: JSON.stringify({ content: 'Loving this tool' }),
      })
    )
  })

  it('shows "Sent!" confirmation after sending', async () => {
    const user = userEvent.setup()
    setup()
    await user.click(screen.getByRole('button', { name: /feedback/i }))
    await user.type(screen.getByPlaceholderText(/e\.g\./i), 'Nice UX!')
    await user.click(screen.getByRole('button', { name: /^send$/i }))
    expect(await screen.findByText(/sent!/i)).toBeInTheDocument()
  })
})

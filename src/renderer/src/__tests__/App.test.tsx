import { describe, it, expect, beforeEach, vi } from 'vitest'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import App from '../App'
import type { Coffee } from '../types'

// ── window.api mock ────────────────────────────────────────────────────────────

const mockApi = {
  coffee: {
    getAll: vi.fn().mockResolvedValue([]),
    getById: vi.fn(),
    getMostRecent: vi.fn().mockResolvedValue(null),
    create: vi.fn(),
    update: vi.fn(),
    delete: vi.fn(),
  },
  grind: {
    getForCoffee: vi.fn().mockResolvedValue([]),
    create: vi.fn(),
    update: vi.fn(),
    delete: vi.fn(),
  },
  sync: {
    trigger: vi.fn(),
    getLastSyncAt: vi.fn().mockResolvedValue(null),
    onStatusChange: vi.fn().mockReturnValue(() => {}),
  },
}

Object.defineProperty(window, 'api', { value: mockApi, writable: true })

// ── Fixture ────────────────────────────────────────────────────────────────────

const activeCoffee: Coffee = {
  id: 'coffee-1',
  name: 'Ethiopia Sidama',
  roaster: 'Blue Bottle',
  origin: 'Ethiopia',
  roast_date: null,
  purchase_date: null,
  net_weight_g: null,
  notes: null,
  is_active: 1,
  created_at: '2024-01-01T00:00:00.000Z',
  last_modified: '2024-01-01T00:00:00.000Z',
  synced_at: null,
}

// ── Tests ──────────────────────────────────────────────────────────────────────

describe('App', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mockApi.coffee.getMostRecent.mockResolvedValue(null)
    mockApi.coffee.getAll.mockResolvedValue([])
    mockApi.grind.getForCoffee.mockResolvedValue([])
    mockApi.sync.getLastSyncAt.mockResolvedValue(null)
    mockApi.sync.onStatusChange.mockReturnValue(() => {})
  })

  // ── Home screen ─────────────────────────────────────────────────────────────

  describe('home screen', () => {
    it('renders the home screen by default', async () => {
      render(<App />)
      // HomeScreen shows "Add Coffee Bag" CTA when there is no coffee
      expect(await screen.findByText('Add Coffee Bag')).toBeInTheDocument()
    })

    it('shows the coffee name when an active coffee exists', async () => {
      mockApi.coffee.getMostRecent.mockResolvedValue(activeCoffee)
      render(<App />)
      expect(await screen.findByText('Ethiopia Sidama')).toBeInTheDocument()
    })
  })

  // ── Navigation ──────────────────────────────────────────────────────────────

  describe('navigation', () => {
    it('navigates to the Add Coffee form when Add Coffee Bag is clicked', async () => {
      render(<App />)
      fireEvent.click(await screen.findByText('Add Coffee Bag'))
      expect(screen.getByText('Coffee Details')).toBeInTheDocument()
    })

    it('navigates to the coffee list when All Coffees is clicked', async () => {
      render(<App />)
      await screen.findByText('Add Coffee Bag')
      fireEvent.click(screen.getByRole('button', { name: /All Coffees/ }))
      // CoffeeList loads coffees; we mocked getAll to return []
      await waitFor(() =>
        expect(screen.getByText(/No coffees/i)).toBeInTheDocument()
      )
    })

    it('navigates back to the list from the add form via the back button', async () => {
      render(<App />)
      fireEvent.click(await screen.findByText('Add Coffee Bag'))
      expect(screen.getByText('Coffee Details')).toBeInTheDocument()
      fireEvent.click(screen.getByRole('button', { name: /back/i }))
      // Layout shows the "Add Coffee" header button when on the list screen
      expect(await screen.findByRole('button', { name: /Add Coffee/ })).toBeInTheDocument()
    })
  })
})

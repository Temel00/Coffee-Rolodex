import { describe, it, expect, beforeEach, vi } from 'vitest'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import CoffeeForm from '../components/CoffeeForm'
import type { Coffee, GrindProfile } from '../types'

// ── window.api mock ────────────────────────────────────────────────────────────

const mockApi = {
  coffee: {
    getAll: vi.fn(),
    getById: vi.fn(),
    getMostRecent: vi.fn(),
    create: vi.fn(),
    update: vi.fn(),
    delete: vi.fn(),
  },
  grind: {
    getForCoffee: vi.fn(),
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

// ── Fixtures ───────────────────────────────────────────────────────────────────

const existingCoffee: Coffee = {
  id: 'coffee-1',
  name: 'Ethiopia Yirgacheffe',
  roaster: 'Onyx Coffee Lab',
  origin: 'Ethiopia',
  roast_date: null,
  purchase_date: null,
  net_weight_g: 250,
  notes: null,
  is_active: 1,
  created_at: '2024-01-01T00:00:00.000Z',
  last_modified: '2024-01-01T00:00:00.000Z',
  synced_at: null,
}

const existingProfile: GrindProfile = {
  id: 'profile-1',
  coffee_id: 'coffee-1',
  basket_type: '18g VST',
  dosage_g: 18.0,
  grind_size: '3.5',
  water_amount_ml: 36.0,
  notes: null,
  created_at: '2024-01-01T00:00:00.000Z',
  last_modified: '2024-01-01T00:00:00.000Z',
  synced_at: null,
}

// ── Tests ──────────────────────────────────────────────────────────────────────

describe('CoffeeForm', () => {
  const navigate = vi.fn()

  beforeEach(() => {
    vi.clearAllMocks()
    mockApi.coffee.create.mockResolvedValue({ ...existingCoffee, id: 'new-id' })
    mockApi.coffee.update.mockResolvedValue(existingCoffee)
    mockApi.coffee.delete.mockResolvedValue(true)
    mockApi.grind.create.mockResolvedValue(existingProfile)
    mockApi.grind.update.mockResolvedValue(existingProfile)
    mockApi.grind.delete.mockResolvedValue(true)
  })

  // ── Create mode ─────────────────────────────────────────────────────────────

  describe('create mode (no coffeeId)', () => {
    it('renders Coffee Details heading and name field', () => {
      render(<CoffeeForm navigate={navigate} />)
      expect(screen.getByText('Coffee Details')).toBeInTheDocument()
      expect(screen.getByPlaceholderText(/Ethiopia Yirgacheffe/)).toBeInTheDocument()
    })

    it('shows Create Coffee button', () => {
      render(<CoffeeForm navigate={navigate} />)
      expect(screen.getByRole('button', { name: /Create Coffee/ })).toBeInTheDocument()
    })

    it('does not show Delete button', () => {
      render(<CoffeeForm navigate={navigate} />)
      expect(screen.queryByRole('button', { name: /^Delete$/ })).not.toBeInTheDocument()
    })

    it('shows validation error when name is empty on save', async () => {
      render(<CoffeeForm navigate={navigate} />)
      fireEvent.click(screen.getByRole('button', { name: /Create Coffee/ }))
      expect(await screen.findByText('Coffee name is required.')).toBeInTheDocument()
      expect(mockApi.coffee.create).not.toHaveBeenCalled()
    })

    it('trims whitespace from the name before saving', async () => {
      render(<CoffeeForm navigate={navigate} />)
      await userEvent.type(screen.getByPlaceholderText(/Ethiopia Yirgacheffe/), '  My Coffee  ')
      fireEvent.click(screen.getByRole('button', { name: /Create Coffee/ }))
      await waitFor(() =>
        expect(mockApi.coffee.create).toHaveBeenCalledWith(
          expect.objectContaining({ name: 'My Coffee' })
        )
      )
    })

    it('calls coffee.create with is_active: 1 by default', async () => {
      render(<CoffeeForm navigate={navigate} />)
      await userEvent.type(screen.getByPlaceholderText(/Ethiopia Yirgacheffe/), 'My Coffee')
      fireEvent.click(screen.getByRole('button', { name: /Create Coffee/ }))
      await waitFor(() =>
        expect(mockApi.coffee.create).toHaveBeenCalledWith(
          expect.objectContaining({ is_active: 1 })
        )
      )
    })

    it('navigates to home after successful create', async () => {
      render(<CoffeeForm navigate={navigate} />)
      await userEvent.type(screen.getByPlaceholderText(/Ethiopia Yirgacheffe/), 'My Coffee')
      fireEvent.click(screen.getByRole('button', { name: /Create Coffee/ }))
      await waitFor(() => expect(navigate).toHaveBeenCalledWith({ name: 'home' }))
    })

    it('converts empty weight field to null', async () => {
      render(<CoffeeForm navigate={navigate} />)
      await userEvent.type(screen.getByPlaceholderText(/Ethiopia Yirgacheffe/), 'My Coffee')
      fireEvent.click(screen.getByRole('button', { name: /Create Coffee/ }))
      await waitFor(() =>
        expect(mockApi.coffee.create).toHaveBeenCalledWith(
          expect.objectContaining({ net_weight_g: null })
        )
      )
    })
  })

  // ── Grind profile management ─────────────────────────────────────────────────

  describe('grind profiles', () => {
    it('starts with no profiles and shows empty state', () => {
      render(<CoffeeForm navigate={navigate} />)
      expect(screen.getByText('No grind profiles yet.')).toBeInTheDocument()
    })

    it('adds a profile when Add Profile is clicked', () => {
      render(<CoffeeForm navigate={navigate} />)
      fireEvent.click(screen.getByRole('button', { name: /Add Profile/ }))
      expect(screen.getByText('Profile 1')).toBeInTheDocument()
    })

    it('shows the profile count in the heading', () => {
      render(<CoffeeForm navigate={navigate} />)
      expect(screen.getByText('(0/5)')).toBeInTheDocument()
      fireEvent.click(screen.getByRole('button', { name: /Add Profile/ }))
      expect(screen.getByText('(1/5)')).toBeInTheDocument()
    })

    it('hides Add Profile button after 5 profiles are added', () => {
      render(<CoffeeForm navigate={navigate} />)
      for (let i = 0; i < 5; i++) {
        fireEvent.click(screen.getByRole('button', { name: /Add Profile/ }))
      }
      expect(screen.queryByRole('button', { name: /Add Profile/ })).not.toBeInTheDocument()
    })

    it('removes a profile when its delete button is clicked', () => {
      render(<CoffeeForm navigate={navigate} />)
      fireEvent.click(screen.getByRole('button', { name: /Add Profile/ }))
      expect(screen.getByText('Profile 1')).toBeInTheDocument()
      fireEvent.click(screen.getByTitle('Remove profile'))
      expect(screen.queryByText('Profile 1')).not.toBeInTheDocument()
    })

    it('calls grind.create for new profiles on save', async () => {
      render(<CoffeeForm navigate={navigate} />)
      await userEvent.type(screen.getByPlaceholderText(/Ethiopia Yirgacheffe/), 'My Coffee')
      fireEvent.click(screen.getByRole('button', { name: /Add Profile/ }))
      fireEvent.click(screen.getByRole('button', { name: /Create Coffee/ }))
      await waitFor(() =>
        expect(mockApi.grind.create).toHaveBeenCalledWith(
          expect.objectContaining({ coffee_id: 'new-id' })
        )
      )
    })
  })

  // ── Edit mode ───────────────────────────────────────────────────────────────

  describe('edit mode (with coffeeId)', () => {
    beforeEach(() => {
      mockApi.coffee.getById.mockResolvedValue(existingCoffee)
      mockApi.grind.getForCoffee.mockResolvedValue([])
    })

    it('loads and displays the existing coffee name', async () => {
      render(<CoffeeForm coffeeId="coffee-1" navigate={navigate} />)
      expect(await screen.findByDisplayValue('Ethiopia Yirgacheffe')).toBeInTheDocument()
    })

    it('shows Save Changes button', async () => {
      render(<CoffeeForm coffeeId="coffee-1" navigate={navigate} />)
      expect(await screen.findByRole('button', { name: /Save Changes/ })).toBeInTheDocument()
    })

    it('shows Delete button', async () => {
      render(<CoffeeForm coffeeId="coffee-1" navigate={navigate} />)
      expect(await screen.findByRole('button', { name: /^Delete$/ })).toBeInTheDocument()
    })

    it('calls coffee.update with the current fields on save', async () => {
      render(<CoffeeForm coffeeId="coffee-1" navigate={navigate} />)
      await screen.findByDisplayValue('Ethiopia Yirgacheffe')
      fireEvent.click(screen.getByRole('button', { name: /Save Changes/ }))
      await waitFor(() =>
        expect(mockApi.coffee.update).toHaveBeenCalledWith(
          'coffee-1',
          expect.objectContaining({ name: 'Ethiopia Yirgacheffe' })
        )
      )
    })

    it('navigates to home after successful save', async () => {
      render(<CoffeeForm coffeeId="coffee-1" navigate={navigate} />)
      await screen.findByDisplayValue('Ethiopia Yirgacheffe')
      fireEvent.click(screen.getByRole('button', { name: /Save Changes/ }))
      await waitFor(() => expect(navigate).toHaveBeenCalledWith({ name: 'home' }))
    })

    it('loads existing profiles', async () => {
      mockApi.grind.getForCoffee.mockResolvedValue([existingProfile])
      render(<CoffeeForm coffeeId="coffee-1" navigate={navigate} />)
      expect(await screen.findByDisplayValue('18g VST')).toBeInTheDocument()
    })

    it('shows delete confirmation dialog when Delete is clicked', async () => {
      render(<CoffeeForm coffeeId="coffee-1" navigate={navigate} />)
      await screen.findByRole('button', { name: /^Delete$/ })
      fireEvent.click(screen.getByRole('button', { name: /^Delete$/ }))
      expect(await screen.findByText(/Delete Coffee/)).toBeInTheDocument()
    })

    it('calls coffee.delete and navigates to list after confirm', async () => {
      render(<CoffeeForm coffeeId="coffee-1" navigate={navigate} />)
      await screen.findByRole('button', { name: /^Delete$/ })
      fireEvent.click(screen.getByRole('button', { name: /^Delete$/ }))
      fireEvent.click(await screen.findByRole('button', { name: 'Delete Coffee' }))
      await waitFor(() => expect(mockApi.coffee.delete).toHaveBeenCalledWith('coffee-1'))
      await waitFor(() => expect(navigate).toHaveBeenCalledWith({ name: 'list' }))
    })

    it('calls grind.delete for profiles removed during edit', async () => {
      mockApi.grind.getForCoffee.mockResolvedValue([existingProfile])
      render(<CoffeeForm coffeeId="coffee-1" navigate={navigate} />)
      await screen.findByDisplayValue('18g VST')
      fireEvent.click(screen.getByTitle('Remove profile'))
      fireEvent.click(screen.getByRole('button', { name: /Save Changes/ }))
      await waitFor(() =>
        expect(mockApi.grind.delete).toHaveBeenCalledWith('profile-1')
      )
    })
  })
})

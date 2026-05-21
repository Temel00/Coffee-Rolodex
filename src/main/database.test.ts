// @vitest-environment node
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'

// Mock electron before importing database — getDb() calls app.getPath('userData').
// Tests bypass getDb() entirely via initDb(':memory:'), so this mock just satisfies the import.
vi.mock('electron', () => ({
  app: { getPath: vi.fn().mockReturnValue('/tmp') },
}))

import {
  initDb,
  closeDb,
  getAllCoffees,
  getCoffeeById,
  getMostRecentCoffee,
  createCoffee,
  updateCoffee,
  deleteCoffee,
  getGrindProfilesForCoffee,
  createGrindProfile,
  updateGrindProfile,
  deleteGrindProfile,
  getSetting,
  setSetting,
} from './database'

function makeCoffeeInput(overrides: Record<string, unknown> = {}) {
  return {
    name: 'Test Coffee',
    roaster: 'Test Roaster',
    origin: 'Ethiopia',
    roast_date: null,
    purchase_date: null,
    net_weight_g: null,
    notes: null,
    is_active: 1 as const,
    ...overrides,
  }
}

function makeProfileInput(coffeeId: string, overrides: Record<string, unknown> = {}) {
  return {
    coffee_id: coffeeId,
    basket_type: '18g VST',
    dosage_g: 18.0,
    grind_size: '3.5',
    water_amount_ml: 36.0,
    notes: null,
    ...overrides,
  }
}

describe('database', () => {
  beforeEach(() => {
    initDb(':memory:')
  })

  afterEach(() => {
    closeDb()
  })

  // ── Coffees ────────────────────────────────────────────────────────────────

  describe('createCoffee', () => {
    it('returns the created coffee with timestamps', () => {
      const coffee = createCoffee('id-1', makeCoffeeInput())
      expect(coffee.id).toBe('id-1')
      expect(coffee.name).toBe('Test Coffee')
      expect(coffee.is_active).toBe(1)
      expect(coffee.created_at).toMatch(/^\d{4}-\d{2}-\d{2}T/)
      expect(coffee.last_modified).toBe(coffee.created_at)
      expect(coffee.synced_at).toBeNull()
    })
  })

  describe('getAllCoffees', () => {
    it('returns empty array when no coffees exist', () => {
      expect(getAllCoffees()).toEqual([])
    })

    it('returns all coffees ordered by last_modified descending', () => {
      createCoffee('id-1', makeCoffeeInput({ name: 'First' }))
      createCoffee('id-2', makeCoffeeInput({ name: 'Second' }))
      const all = getAllCoffees()
      expect(all).toHaveLength(2)
      expect(all[0].name).toBe('Second')
      expect(all[1].name).toBe('First')
    })
  })

  describe('getCoffeeById', () => {
    it('returns the coffee for a known id', () => {
      createCoffee('id-1', makeCoffeeInput())
      expect(getCoffeeById('id-1')?.id).toBe('id-1')
    })

    it('returns undefined for an unknown id', () => {
      expect(getCoffeeById('nope')).toBeUndefined()
    })
  })

  describe('getMostRecentCoffee', () => {
    it('returns only active coffees', () => {
      createCoffee('id-1', makeCoffeeInput({ name: 'Inactive', is_active: 0 }))
      createCoffee('id-2', makeCoffeeInput({ name: 'Active', is_active: 1 }))
      expect(getMostRecentCoffee()?.name).toBe('Active')
    })

    it('returns undefined when no active coffees exist', () => {
      createCoffee('id-1', makeCoffeeInput({ is_active: 0 }))
      expect(getMostRecentCoffee()).toBeUndefined()
    })

    it('returns undefined when the table is empty', () => {
      expect(getMostRecentCoffee()).toBeUndefined()
    })
  })

  describe('updateCoffee', () => {
    it('updates the specified fields', () => {
      createCoffee('id-1', makeCoffeeInput())
      const updated = updateCoffee('id-1', { name: 'Renamed', is_active: 0 })
      expect(updated?.name).toBe('Renamed')
      expect(updated?.is_active).toBe(0)
    })

    it('bumps last_modified', () => {
      const original = createCoffee('id-1', makeCoffeeInput())
      const updated = updateCoffee('id-1', { name: 'New Name' })
      expect(updated?.last_modified).toBeGreaterThanOrEqual(original.last_modified)
    })

    it('returns undefined for an unknown id', () => {
      expect(updateCoffee('nope', { name: 'x' })).toBeUndefined()
    })
  })

  describe('deleteCoffee', () => {
    it('returns true and removes the coffee', () => {
      createCoffee('id-1', makeCoffeeInput())
      expect(deleteCoffee('id-1')).toBe(true)
      expect(getCoffeeById('id-1')).toBeUndefined()
    })

    it('returns false for an unknown id', () => {
      expect(deleteCoffee('nope')).toBe(false)
    })
  })

  // ── Grind Profiles ─────────────────────────────────────────────────────────

  describe('grind profiles', () => {
    beforeEach(() => {
      createCoffee('coffee-1', makeCoffeeInput())
    })

    it('creates and retrieves a profile', () => {
      const profile = createGrindProfile('p-1', makeProfileInput('coffee-1'))
      expect(profile.id).toBe('p-1')
      expect(profile.basket_type).toBe('18g VST')
      expect(profile.dosage_g).toBe(18.0)
      expect(profile.synced_at).toBeNull()
    })

    it('getGrindProfilesForCoffee returns profiles in created_at order', () => {
      createGrindProfile('p-1', makeProfileInput('coffee-1', { basket_type: 'Single' }))
      createGrindProfile('p-2', makeProfileInput('coffee-1', { basket_type: 'Double' }))
      const profiles = getGrindProfilesForCoffee('coffee-1')
      expect(profiles).toHaveLength(2)
      expect(profiles[0].basket_type).toBe('Single')
      expect(profiles[1].basket_type).toBe('Double')
    })

    it('getGrindProfilesForCoffee returns empty array for unknown coffee', () => {
      expect(getGrindProfilesForCoffee('unknown')).toEqual([])
    })

    it('updateGrindProfile updates the specified fields', () => {
      createGrindProfile('p-1', makeProfileInput('coffee-1'))
      const updated = updateGrindProfile('p-1', { dosage_g: 20.0, grind_size: '4.0' })
      expect(updated?.dosage_g).toBe(20.0)
      expect(updated?.grind_size).toBe('4.0')
    })

    it('updateGrindProfile returns undefined for an unknown id', () => {
      expect(updateGrindProfile('nope', { dosage_g: 1 })).toBeUndefined()
    })

    it('deleteGrindProfile removes the profile and returns true', () => {
      createGrindProfile('p-1', makeProfileInput('coffee-1'))
      expect(deleteGrindProfile('p-1')).toBe(true)
      expect(getGrindProfilesForCoffee('coffee-1')).toHaveLength(0)
    })

    it('deleteGrindProfile returns false for an unknown id', () => {
      expect(deleteGrindProfile('nope')).toBe(false)
    })

    it('deleting a coffee cascades to its profiles', () => {
      createGrindProfile('p-1', makeProfileInput('coffee-1'))
      deleteCoffee('coffee-1')
      expect(getGrindProfilesForCoffee('coffee-1')).toHaveLength(0)
    })
  })

  // ── Settings ───────────────────────────────────────────────────────────────

  describe('settings', () => {
    it('sets and gets a value', () => {
      setSetting('key', 'value')
      expect(getSetting('key')).toBe('value')
    })

    it('returns undefined for an unknown key', () => {
      expect(getSetting('missing')).toBeUndefined()
    })

    it('overwrites an existing value', () => {
      setSetting('key', 'old')
      setSetting('key', 'new')
      expect(getSetting('key')).toBe('new')
    })
  })
})

import type { Coffee, GrindProfile, SyncState } from './types'

type CreateCoffeeInput = Omit<Coffee, 'id' | 'created_at' | 'last_modified' | 'synced_at'>
type UpdateCoffeeInput = Partial<Omit<Coffee, 'id' | 'created_at' | 'synced_at'>>
type CreateGrindInput  = Omit<GrindProfile, 'id' | 'created_at' | 'last_modified' | 'synced_at'>
type UpdateGrindInput  = Partial<Omit<GrindProfile, 'id' | 'coffee_id' | 'created_at' | 'synced_at'>>

declare global {
  interface Window {
    api: {
      coffee: {
        getAll: () => Promise<Coffee[]>
        getById: (id: string) => Promise<Coffee | null>
        getMostRecent: () => Promise<Coffee | null>
        create: (input: CreateCoffeeInput) => Promise<Coffee>
        update: (id: string, input: UpdateCoffeeInput) => Promise<Coffee | null>
        delete: (id: string) => Promise<boolean>
      }
      grind: {
        getForCoffee: (coffeeId: string) => Promise<GrindProfile[]>
        create: (input: CreateGrindInput) => Promise<GrindProfile>
        update: (id: string, input: UpdateGrindInput) => Promise<GrindProfile | null>
        delete: (id: string) => Promise<boolean>
      }
      sync: {
        trigger: () => Promise<void>
        getLastSyncAt: () => Promise<string | null>
        onStatusChange: (callback: (state: SyncState) => void) => () => void
      }
    }
  }
}

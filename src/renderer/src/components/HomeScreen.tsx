import { useEffect, useState } from 'react'
import { Pencil, Plus, Package, Calendar, MapPin, Weight } from 'lucide-react'
import type { Coffee, GrindProfile, View } from '../types'
import GrindProfileCard from './GrindProfileCard'

interface Props {
  navigate: (v: View) => void
}

function formatDate(iso: string | null): string {
  if (!iso) return ''
  const d = new Date(iso)
  return d.toLocaleDateString(undefined, { year: 'numeric', month: 'short', day: 'numeric' })
}

export default function HomeScreen({ navigate }: Props) {
  const [coffee, setCoffee] = useState<Coffee | null>(null)
  const [profiles, setProfiles] = useState<GrindProfile[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    let cancelled = false
    async function load() {
      setLoading(true)
      const c = await window.api.coffee.getMostRecent()
      if (cancelled) return
      setCoffee(c)
      if (c) {
        const p = await window.api.grind.getForCoffee(c.id)
        if (!cancelled) setProfiles(p)
      }
      setLoading(false)
    }
    load()
    return () => { cancelled = true }
  }, [])

  if (loading) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="text-text-muted text-xl animate-pulse">Loading…</div>
      </div>
    )
  }

  if (!coffee) {
    return (
      <div className="flex flex-col items-center justify-center h-full gap-8">
        <div className="flex flex-col items-center gap-4 text-center">
          <Package size={64} className="text-text-faint" />
          <div>
            <p className="text-2xl font-bold text-text">No coffees yet</p>
            <p className="text-text-muted mt-2">Add your first espresso bag to get started.</p>
          </div>
        </div>
        <button
          className="btn btn-primary text-xl px-10 py-5"
          onClick={() => navigate({ name: 'add' })}
        >
          <Plus size={24} />
          Add Coffee Bag
        </button>
      </div>
    )
  }

  return (
    <div className="scrollable h-full px-8 py-8">
      {/* Hero card */}
      <div className="card mb-8" style={{ borderColor: 'var(--color-primary)', borderWidth: '2px' }}>
        <div className="flex items-start justify-between gap-6">
          <div className="flex-1 min-w-0">
            {/* Active badge */}
            <div className="flex items-center gap-3 mb-4">
              <span className={`badge ${coffee.is_active ? 'badge-active' : 'badge-inactive'}`}>
                {coffee.is_active ? '● Active' : '● Finished'}
              </span>
              <span className="text-text-faint text-sm">Most recently used</span>
            </div>

            {/* Name */}
            <h1
              className="font-bold text-text leading-tight mb-1 truncate"
              style={{ fontSize: 'var(--font-3xl)' }}
            >
              {coffee.name}
            </h1>

            {/* Roaster */}
            {coffee.roaster && (
              <p className="text-primary text-xl font-medium mb-4">{coffee.roaster}</p>
            )}

            {/* Meta chips */}
            <div className="flex flex-wrap gap-4 text-text-muted">
              {coffee.origin && (
                <span className="flex items-center gap-1.5">
                  <MapPin size={16} className="text-text-faint" />
                  {coffee.origin}
                </span>
              )}
              {coffee.roast_date && (
                <span className="flex items-center gap-1.5">
                  <Calendar size={16} className="text-text-faint" />
                  Roasted {formatDate(coffee.roast_date)}
                </span>
              )}
              {coffee.net_weight_g && (
                <span className="flex items-center gap-1.5">
                  <Weight size={16} className="text-text-faint" />
                  {coffee.net_weight_g}g
                </span>
              )}
            </div>

            {coffee.notes && (
              <p className="mt-4 text-text-muted text-base italic leading-relaxed line-clamp-3">
                "{coffee.notes}"
              </p>
            )}
          </div>

          {/* Edit button */}
          <button
            className="btn btn-ghost shrink-0"
            onClick={() => navigate({ name: 'edit', coffeeId: coffee.id })}
          >
            <Pencil size={18} />
            Edit
          </button>
        </div>
      </div>

      {/* Grind profiles section */}
      {profiles.length > 0 ? (
        <section>
          <h2 className="text-text-muted font-semibold text-lg mb-4 uppercase tracking-wider">
            Grind Profiles
          </h2>
          <div
            className="flex gap-4 pb-4"
            style={{ overflowX: 'auto', WebkitOverflowScrolling: 'touch' }}
          >
            {profiles.map((p, i) => (
              <GrindProfileCard key={p.id} profile={p} index={i} />
            ))}
          </div>
        </section>
      ) : (
        <div className="card text-center py-8">
          <p className="text-text-muted mb-4">No grind profiles yet for this coffee.</p>
          <button
            className="btn btn-primary"
            onClick={() => navigate({ name: 'edit', coffeeId: coffee.id })}
          >
            <Plus size={18} />
            Add Grind Profile
          </button>
        </div>
      )}
    </div>
  )
}

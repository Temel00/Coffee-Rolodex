import { useEffect, useState, useCallback } from 'react'
import { Calendar, MapPin, Layers, Package } from 'lucide-react'
import type { Coffee, GrindProfile, View } from '../types'

interface Props {
  navigate: (v: View) => void
}

type Filter = 'all' | 'active' | 'inactive'

function formatDate(iso: string | null): string {
  if (!iso) return ''
  return new Date(iso).toLocaleDateString(undefined, {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  })
}

interface CoffeeCardProps {
  coffee: Coffee
  profileCount: number
  onClick: () => void
}

function CoffeeCard({ coffee, profileCount, onClick }: CoffeeCardProps) {
  return (
    <button
      onClick={onClick}
      className="card text-left w-full transition-colors cursor-pointer"
      style={{
        background: 'var(--color-surface)',
        borderColor: coffee.is_active ? 'var(--color-border)' : 'var(--color-border-subtle)',
      }}
      onMouseEnter={(e) =>
        (e.currentTarget.style.background = 'var(--color-surface-hover)')
      }
      onMouseLeave={(e) =>
        (e.currentTarget.style.background = 'var(--color-surface)')
      }
    >
      <div className="flex items-start justify-between gap-3 mb-3">
        <div className="flex-1 min-w-0">
          <h3 className="text-xl font-bold text-text truncate leading-tight">
            {coffee.name}
          </h3>
          {coffee.roaster && (
            <p className="text-primary font-medium mt-0.5 truncate">{coffee.roaster}</p>
          )}
        </div>
        <span className={`badge shrink-0 ${coffee.is_active ? 'badge-active' : 'badge-inactive'}`}>
          {coffee.is_active ? 'Active' : 'Finished'}
        </span>
      </div>

      <div className="flex flex-wrap gap-x-4 gap-y-1 text-text-muted text-sm">
        {coffee.origin && (
          <span className="flex items-center gap-1">
            <MapPin size={13} className="text-text-faint" />
            {coffee.origin}
          </span>
        )}
        {coffee.roast_date && (
          <span className="flex items-center gap-1">
            <Calendar size={13} className="text-text-faint" />
            {formatDate(coffee.roast_date)}
          </span>
        )}
        <span className="flex items-center gap-1">
          <Layers size={13} className="text-text-faint" />
          {profileCount} {profileCount === 1 ? 'profile' : 'profiles'}
        </span>
      </div>
    </button>
  )
}

export default function CoffeeList({ navigate }: Props) {
  const [coffees, setCoffees] = useState<Coffee[]>([])
  const [profileCounts, setProfileCounts] = useState<Record<string, number>>({})
  const [filter, setFilter] = useState<Filter>('active')
  const [loading, setLoading] = useState(true)

  const loadData = useCallback(async () => {
    setLoading(true)
    const all = await window.api.coffee.getAll()
    setCoffees(all)

    const counts: Record<string, number> = {}
    await Promise.all(
      all.map(async (c) => {
        const p = await window.api.grind.getForCoffee(c.id)
        counts[c.id] = p.length
      })
    )
    setProfileCounts(counts)
    setLoading(false)
  }, [])

  useEffect(() => { loadData() }, [loadData])

  const visible = coffees.filter((c) => {
    if (filter === 'active') return c.is_active === 1
    if (filter === 'inactive') return c.is_active === 0
    return true
  })

  const filterBtn = (f: Filter, label: string) => (
    <button
      className={`btn ${filter === f ? 'btn-primary' : 'btn-ghost'}`}
      onClick={() => setFilter(f)}
    >
      {label}
    </button>
  )

  return (
    <div className="flex flex-col h-full">
      {/* Filter bar */}
      <div className="flex items-center gap-3 px-8 py-4 border-b border-border shrink-0">
        {filterBtn('all', 'All')}
        {filterBtn('active', 'Active')}
        {filterBtn('inactive', 'Finished')}
        <span className="ml-auto text-text-muted text-sm">
          {visible.length} {visible.length === 1 ? 'bag' : 'bags'}
        </span>
      </div>

      {/* List */}
      <div className="scrollable flex-1 px-8 py-6">
        {loading ? (
          <div className="flex justify-center py-20">
            <div className="text-text-muted animate-pulse">Loading…</div>
          </div>
        ) : visible.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full gap-4 py-20">
            <Package size={48} className="text-text-faint" />
            <p className="text-text-muted text-xl">
              {coffees.length === 0 ? 'No coffees yet.' : 'No coffees in this filter.'}
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-2 gap-4" style={{ gridTemplateColumns: 'repeat(auto-fill, minmax(360px, 1fr))' }}>
            {visible.map((c) => (
              <CoffeeCard
                key={c.id}
                coffee={c}
                profileCount={profileCounts[c.id] ?? 0}
                onClick={() => navigate({ name: 'edit', coffeeId: c.id })}
              />
            ))}
          </div>
        )}
      </div>
    </div>
  )
}

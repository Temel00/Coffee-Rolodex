import { ArrowLeft, Coffee, List, Plus, RefreshCw, CloudOff, Cloud, Loader } from 'lucide-react'
import type { View, SyncState } from '../types'

interface Props {
  view: View
  navigate: (v: View) => void
  syncState: SyncState
  children: React.ReactNode
}

function SyncIndicator({ syncState }: { syncState: SyncState }) {
  const { status, lastSyncAt } = syncState

  const label = (() => {
    if (status === 'syncing') return 'Syncing…'
    if (status === 'error') return 'Sync failed'
    if (lastSyncAt) {
      const mins = Math.round((Date.now() - new Date(lastSyncAt).getTime()) / 60000)
      if (mins < 1) return 'Synced just now'
      if (mins < 60) return `Synced ${mins}m ago`
      return `Synced ${Math.round(mins / 60)}h ago`
    }
    return 'Not synced'
  })()

  const icon = (() => {
    if (status === 'syncing') return <Loader size={14} className="animate-spin" />
    if (status === 'error') return <CloudOff size={14} />
    if (lastSyncAt) return <Cloud size={14} />
    return <CloudOff size={14} />
  })()

  const colorClass =
    status === 'error'
      ? 'text-danger'
      : status === 'syncing'
        ? 'text-warning'
        : lastSyncAt
          ? 'text-success'
          : 'text-text-faint'

  return (
    <button
      onClick={() => window.api.sync.trigger()}
      className={`flex items-center gap-1.5 text-sm px-3 py-2 rounded-md btn-icon ${colorClass}`}
      title={syncState.error ?? label}
    >
      {icon}
      <span className="hidden sm:inline">{label}</span>
    </button>
  )
}

export default function Layout({ view, navigate, syncState, children }: Props) {
  const isHome = view.name === 'home'
  const isList = view.name === 'list'
  const isForm = view.name === 'add' || view.name === 'edit'

  const title = (() => {
    if (view.name === 'home') return 'Coffee Rolodex'
    if (view.name === 'list') return 'All Coffees'
    if (view.name === 'add') return 'New Coffee'
    if (view.name === 'edit') return 'Edit Coffee'
    return ''
  })()

  return (
    <div className="flex flex-col h-screen bg-bg text-text overflow-hidden">
      {/* ── Nav bar ──────────────────────────────────────────────────────── */}
      <header className="flex items-center gap-4 px-6 py-4 border-b border-border shrink-0"
        style={{ minHeight: '72px' }}>

        {/* Back / Home logo */}
        {isHome ? (
          <div className="flex items-center gap-3">
            <Coffee size={28} className="text-primary" />
            <span className="text-xl font-bold text-text">{title}</span>
          </div>
        ) : (
          <button
            className="btn btn-ghost flex items-center gap-2"
            onClick={() => navigate({ name: isForm ? 'list' : 'home' })}
          >
            <ArrowLeft size={20} />
            <span>Back</span>
          </button>
        )}

        {/* Title (non-home screens) */}
        {!isHome && (
          <h1 className="text-xl font-bold text-text flex-1 text-center">{title}</h1>
        )}

        <div className="flex items-center gap-2 ml-auto">
          {/* List nav button on home */}
          {isHome && (
            <button
              className="btn btn-ghost flex items-center gap-2"
              onClick={() => navigate({ name: 'list' })}
            >
              <List size={20} />
              <span>All Coffees</span>
            </button>
          )}

          {/* Add button on list */}
          {isList && (
            <button
              className="btn btn-primary flex items-center gap-2"
              onClick={() => navigate({ name: 'add' })}
            >
              <Plus size={20} />
              <span>Add Coffee</span>
            </button>
          )}

          {/* Sync indicator */}
          <SyncIndicator syncState={syncState} />
        </div>
      </header>

      {/* ── Main content ─────────────────────────────────────────────────── */}
      <main className="flex-1 overflow-hidden">
        {children}
      </main>
    </div>
  )
}

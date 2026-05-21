import { useState, useEffect, useCallback } from 'react'
import type { View, SyncState } from './types'
import Layout from './components/Layout'
import HomeScreen from './components/HomeScreen'
import CoffeeList from './components/CoffeeList'
import CoffeeForm from './components/CoffeeForm'

export default function App() {
  const [view, setView] = useState<View>({ name: 'list' })
  const [syncState, setSyncState] = useState<SyncState>({
    status: 'idle',
    lastSyncAt: null,
    error: null,
  })

  // Subscribe to sync status events from the main process
  useEffect(() => {
    const cleanup = window.api.sync.onStatusChange((state) => {
      setSyncState(state as SyncState)
    })
    window.api.sync.getLastSyncAt().then((ts) => {
      if (ts) setSyncState((s) => ({ ...s, lastSyncAt: ts }))
    })
    return cleanup
  }, [])

  const navigate = useCallback((v: View) => setView(v), [])

  return (
    <Layout view={view} navigate={navigate} syncState={syncState}>
      {view.name === 'home' && <HomeScreen navigate={navigate} />}
      {view.name === 'list' && <CoffeeList navigate={navigate} />}
      {(view.name === 'add' || view.name === 'edit') && (
        <CoffeeForm
          coffeeId={view.name === 'edit' ? view.coffeeId : undefined}
          navigate={navigate}
        />
      )}
    </Layout>
  )
}

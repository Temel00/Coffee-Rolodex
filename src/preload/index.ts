import { contextBridge, ipcRenderer } from 'electron'

// All types are inlined here so the preload bundle stays self-contained.
// The renderer imports these same shapes from its own types.ts.

contextBridge.exposeInMainWorld('api', {
  coffee: {
    getAll: () =>
      ipcRenderer.invoke('coffee:getAll'),
    getById: (id: string) =>
      ipcRenderer.invoke('coffee:getById', id),
    getMostRecent: () =>
      ipcRenderer.invoke('coffee:getMostRecent'),
    create: (input: Record<string, unknown>) =>
      ipcRenderer.invoke('coffee:create', input),
    update: (id: string, input: Record<string, unknown>) =>
      ipcRenderer.invoke('coffee:update', id, input),
    delete: (id: string) =>
      ipcRenderer.invoke('coffee:delete', id),
  },
  grind: {
    getForCoffee: (coffeeId: string) =>
      ipcRenderer.invoke('grind:getForCoffee', coffeeId),
    create: (input: Record<string, unknown>) =>
      ipcRenderer.invoke('grind:create', input),
    update: (id: string, input: Record<string, unknown>) =>
      ipcRenderer.invoke('grind:update', id, input),
    delete: (id: string) =>
      ipcRenderer.invoke('grind:delete', id),
  },
  sync: {
    trigger: () =>
      ipcRenderer.invoke('sync:trigger'),
    getLastSyncAt: () =>
      ipcRenderer.invoke('sync:getLastSyncAt'),
    onStatusChange: (callback: (state: unknown) => void) => {
      const handler = (_: Electron.IpcRendererEvent, state: unknown) => callback(state)
      ipcRenderer.on('sync:status', handler)
      // Returns a cleanup function
      return () => ipcRenderer.removeListener('sync:status', handler)
    },
  },
})

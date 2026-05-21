"use strict";
const electron = require("electron");
electron.contextBridge.exposeInMainWorld("api", {
  coffee: {
    getAll: () => electron.ipcRenderer.invoke("coffee:getAll"),
    getById: (id) => electron.ipcRenderer.invoke("coffee:getById", id),
    getMostRecent: () => electron.ipcRenderer.invoke("coffee:getMostRecent"),
    create: (input) => electron.ipcRenderer.invoke("coffee:create", input),
    update: (id, input) => electron.ipcRenderer.invoke("coffee:update", id, input),
    delete: (id) => electron.ipcRenderer.invoke("coffee:delete", id)
  },
  grind: {
    getForCoffee: (coffeeId) => electron.ipcRenderer.invoke("grind:getForCoffee", coffeeId),
    create: (input) => electron.ipcRenderer.invoke("grind:create", input),
    update: (id, input) => electron.ipcRenderer.invoke("grind:update", id, input),
    delete: (id) => electron.ipcRenderer.invoke("grind:delete", id)
  },
  sync: {
    trigger: () => electron.ipcRenderer.invoke("sync:trigger"),
    getLastSyncAt: () => electron.ipcRenderer.invoke("sync:getLastSyncAt"),
    onStatusChange: (callback) => {
      const handler = (_, state) => callback(state);
      electron.ipcRenderer.on("sync:status", handler);
      return () => electron.ipcRenderer.removeListener("sync:status", handler);
    }
  }
});

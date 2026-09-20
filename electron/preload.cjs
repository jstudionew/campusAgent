const { contextBridge, ipcRenderer } = require('electron');

// Expose runtime config used by frontend/src/services/http.js
contextBridge.exposeInMainWorld('ELECTRON_CONFIG', {
  API_BASE_URL: 'http://127.0.0.1:59201/api',
  IS_ELECTRON: true,
});

// Expose safe desktop IPC utilities
contextBridge.exposeInMainWorld('electronAPI', {
  openConfigFolder: () => ipcRenderer.invoke('open-config-folder'),
  openEnvFile: () => ipcRenderer.invoke('open-env-file'),
  openLogFile: () => ipcRenderer.invoke('open-log-file'),
  getDbStatus: () => ipcRenderer.invoke('get-db-status'),
  restartBackend: () => ipcRenderer.invoke('restart-backend'),
  openExternal: (url) => ipcRenderer.invoke('open-external', url),
});

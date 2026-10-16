const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('desktopAPI', {
  platform: process.platform,
  isElectron: true,
  appVersion: '1.0.0',
  getDefaultStoragePath: () => ipcRenderer.invoke('get-default-storage-path'),
  selectDirectory: () => ipcRenderer.invoke('select-directory'),
  openDirectoryInExplorer: (path) => ipcRenderer.invoke('open-directory-in-explorer', path),
  saveWorkbookFile: (dir, filename, data) => ipcRenderer.invoke('save-workbook-file', { dir, filename, data }),
  saveWorkbookAs: (defaultName, data) => ipcRenderer.invoke('save-workbook-as', { defaultName, data }),
  loadAllWorkbooks: (dir) => ipcRenderer.invoke('load-all-workbooks', dir),
  deleteWorkbookFile: (dir, filename) => ipcRenderer.invoke('delete-workbook-file', { dir, filename })
});

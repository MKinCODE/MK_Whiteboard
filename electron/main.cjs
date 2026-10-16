const { app, BrowserWindow, Menu, ipcMain, dialog, shell } = require('electron');
const path = require('path');
const fs = require('fs');

// Windows hardware acceleration flags
app.commandLine.appendSwitch('enable-features', 'msHapticsAPI,msIntelLockFileExWorkaround');
app.commandLine.appendSwitch('high-dpi-support', '1');

let mainWindow;

function createWindow() {
  const iconPath = path.join(__dirname, '../public/assets/icon.ico');

  mainWindow = new BrowserWindow({
    width: 1360,
    height: 860,
    minWidth: 840,
    minHeight: 600,
    title: 'MK Whiteboard',
    icon: fs.existsSync(iconPath) ? iconPath : undefined,
    autoHideMenuBar: true,
    show: true,
    backgroundColor: '#ffffff',
    webPreferences: {
      nodeIntegration: false,
      contextIsolation: true,
      preload: path.join(__dirname, 'preload.cjs'),
      webSecurity: true,
      allowRunningInsecureContent: false
    }
  });

  Menu.setApplicationMenu(null);

  const indexPath = path.join(__dirname, '../dist/index.html');
  mainWindow.loadFile(indexPath).catch(err => {
    console.error('Failed to load file:', err);
  });

  mainWindow.on('closed', () => {
    mainWindow = null;
  });
}

// IPC handlers for local Windows storage allocation and file management
ipcMain.handle('get-default-storage-path', () => {
  const docs = app.getPath('documents');
  const target = path.join(docs, 'MK Whiteboard');
  if (!fs.existsSync(target)) {
    fs.mkdirSync(target, { recursive: true });
  }
  return target;
});

ipcMain.handle('select-directory', async () => {
  const result = await dialog.showOpenDialog(mainWindow, {
    title: 'Select Folder for MK Whiteboard Files',
    properties: ['openDirectory', 'createDirectory']
  });
  if (result.canceled || result.filePaths.length === 0) {
    return null;
  }
  return result.filePaths[0];
});

ipcMain.handle('open-directory-in-explorer', async (event, dirPath) => {
  if (dirPath && fs.existsSync(dirPath)) {
    await shell.openPath(dirPath);
    return true;
  }
  return false;
});

ipcMain.handle('save-workbook-as', async (event, { defaultName, data }) => {
  try {
    const safeName = (defaultName || 'Untitled Whiteboard').replace(/[/\\?%*:|"<>]/g, '_') + '.mkwhiteboard';
    const result = await dialog.showSaveDialog(mainWindow, {
      title: 'Save Whiteboard As',
      defaultPath: safeName,
      filters: [{ name: 'MK Whiteboard File', extensions: ['mkwhiteboard'] }]
    });
    if (result.canceled || !result.filePath) {
      return { canceled: true };
    }
    fs.writeFileSync(result.filePath, JSON.stringify(data, null, 2), 'utf8');
    return { success: true, filePath: result.filePath };
  } catch (err) {
    console.error('save-workbook-as error:', err);
    return { success: false, error: err.message };
  }
});

ipcMain.handle('save-workbook-file', async (event, { dir, filename, data }) => {
  try {
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }
    const safeName = filename.replace(/[/\\?%*:|"<>]/g, '_') + '.mkwhiteboard';
    const filePath = path.join(dir, safeName);
    fs.writeFileSync(filePath, JSON.stringify(data, null, 2), 'utf8');
    return { success: true, filePath };
  } catch (err) {
    console.error('save-workbook-file error:', err);
    return { success: false, error: err.message };
  }
});

ipcMain.handle('load-all-workbooks', async (event, dir) => {
  try {
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
      return [];
    }
    const files = fs.readdirSync(dir);
    const workbooks = [];
    for (const file of files) {
      if (file.endsWith('.mkwhiteboard')) {
        const fullPath = path.join(dir, file);
        try {
          const raw = fs.readFileSync(fullPath, 'utf8');
          const parsed = JSON.parse(raw);
          workbooks.push(parsed);
        } catch (e) {
          console.warn('Skipping unreadable file:', file);
        }
      }
    }
    return workbooks;
  } catch (err) {
    console.error('load-all-workbooks error:', err);
    return [];
  }
});

ipcMain.handle('delete-workbook-file', async (event, { dir, filename }) => {
  try {
    const safeName = filename.replace(/[/\\?%*:|"<>]/g, '_') + '.mkwhiteboard';
    const filePath = path.join(dir, safeName);
    if (fs.existsSync(filePath)) {
      fs.unlinkSync(filePath);
      return true;
    }
    return false;
  } catch (err) {
    console.error('delete-workbook-file error:', err);
    return false;
  }
});

app.whenReady().then(() => {
  createWindow();

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) {
      createWindow();
    }
  });
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit();
  }
});

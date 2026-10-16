/**
 * WhiteboardStore manages all local workbooks, active whiteboard state,
 * stroke/object persistence, undo/redo history, and local privacy.
 * 100% offline, zero network requests, zero telemetry.
 */
export class WhiteboardStore {
  constructor() {
    this.storageKey = 'mk_whiteboard_workbooks_v1';
    this.settingsKey = 'mk_whiteboard_settings_v1';
    this.workbooks = [];
    this.activeWorkbookId = null;
    this.currentView = 'dashboard'; // 'dashboard' | 'canvas'

    // Active workbook working data
    this.title = 'Untitled Whiteboard';
    this.strokes = [];
    this.objects = [];
    this.backgroundStyle = 'dots';
    this.backgroundColor = '#ffffff';
    this.isDarkMode = false;
    this.selectedIds = new Set();
    this.undoStack = [];
    this.redoStack = [];
    this.maxHistory = 50;
    this.listeners = new Set();
    this.storageDirectory = 'Default (Local App Storage)';
    this.setupCompleted = true;

    this.loadSettings();
    this.loadWorkbooks();
    this.initNativeStorage();
  }

  subscribe(callback) {
    this.listeners.add(callback);
    return () => this.listeners.delete(callback);
  }

  notify(actionType = 'update') {
    for (const listener of this.listeners) {
      listener(actionType, this);
    }
    if (this.currentView === 'canvas' && this.activeWorkbookId) {
      this.saveActiveWorkbookDebounced();
    }
  }

  getUniqueTitle(baseTitle = 'New Whiteboard', excludeId = null) {
    const trimmed = (baseTitle || 'New Whiteboard').trim();
    const otherTitles = new Set(
      this.workbooks
        .filter(w => w.id !== excludeId)
        .map(w => (w.title || '').trim().toLowerCase())
    );

    if (!otherTitles.has(trimmed.toLowerCase())) {
      return trimmed;
    }

    let counter = 2;
    let candidate = `${trimmed} (${counter})`;
    while (otherTitles.has(candidate.toLowerCase())) {
      counter++;
      candidate = `${trimmed} (${counter})`;
    }
    return candidate;
  }

  isSetupCompleted() {
    return true;
  }

  markSetupCompleted() {
    this.setupCompleted = true;
    this.saveSettings();
    this.notify('setup');
  }

  async saveWorkbookAs(id) {
    const targetId = id || this.activeWorkbookId;
    const wb = this.workbooks.find(w => w.id === targetId);
    if (!wb) return { success: false, error: 'Workbook not found' };

    if (window.desktopAPI && window.desktopAPI.saveWorkbookAs) {
      const res = await window.desktopAPI.saveWorkbookAs(wb.title, wb);
      return res;
    } else {
      // Browser fallback
      const json = JSON.stringify(wb, null, 2);
      const blob = new Blob([json], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `${(wb.title || 'Whiteboard').replace(/[/\\?%*:|"<>]/g, '_')}.mkwhiteboard`;
      a.click();
      URL.revokeObjectURL(url);
      return { success: true };
    }
  }

  setStorageDirectory(dir) {
    this.storageDirectory = dir;
    this.saveSettings();
    this.initNativeStorage();
    this.notify('settings');
  }

  async initNativeStorage() {
    if (window.desktopAPI && window.desktopAPI.loadAllWorkbooks) {
      try {
        if (!this.storageDirectory || this.storageDirectory.startsWith('Default')) {
          const defaultPath = await window.desktopAPI.getDefaultStoragePath();
          if (defaultPath) {
            this.storageDirectory = defaultPath;
            this.saveSettings();
          }
        }
        if (this.storageDirectory && !this.storageDirectory.startsWith('Default')) {
          const diskWorkbooks = await window.desktopAPI.loadAllWorkbooks(this.storageDirectory);
          if (diskWorkbooks && diskWorkbooks.length > 0) {
            this.workbooks = diskWorkbooks;
            this.notify('loadWorkbooks');
          } else if (this.workbooks.length > 0) {
            for (const wb of this.workbooks) {
              await window.desktopAPI.saveWorkbookFile(this.storageDirectory, wb.id, wb);
            }
          }
        }
      } catch (err) {
        console.warn('Native storage sync error:', err);
      }
    }
  }

  saveWorkbookToDisk(wb) {
    if (window.desktopAPI && window.desktopAPI.saveWorkbookFile && this.storageDirectory && !this.storageDirectory.startsWith('Default')) {
      window.desktopAPI.saveWorkbookFile(this.storageDirectory, wb.id, wb).catch(err => {
        console.warn('Failed saving workbook to disk:', err);
      });
    }
  }

  loadSettings() {
    try {
      const raw = localStorage.getItem(this.settingsKey);
      if (raw) {
        const s = JSON.parse(raw);
        this.isDarkMode = !!s.isDarkMode;
        this.storageDirectory = s.storageDirectory || 'Default (Local App Storage)';
        this.setupCompleted = !!s.setupCompleted;
      }
    } catch (e) {
      console.warn('Failed to load settings', e);
    }
  }

  saveSettings() {
    try {
      localStorage.setItem(this.settingsKey, JSON.stringify({
        isDarkMode: this.isDarkMode,
        storageDirectory: this.storageDirectory,
        setupCompleted: this.setupCompleted
      }));
    } catch (e) {
      console.warn('Failed to save settings', e);
    }
  }

  loadWorkbooks() {
    try {
      const raw = localStorage.getItem(this.storageKey);
      if (raw) {
        this.workbooks = JSON.parse(raw);
      }
    } catch (e) {
      console.warn('Failed to load workbooks from storage', e);
      this.workbooks = [];
    }

    if (!this.workbooks || this.workbooks.length === 0) {
      this.initDefaultWorkbooks();
    }
  }

  initDefaultWorkbooks() {
    const defaultBoard = {
      id: 'wb-' + Date.now(),
      title: 'Welcome to MK Whiteboard',
      createdAt: Date.now() - 3600000,
      updatedAt: Date.now(),
      backgroundStyle: 'dots',
      backgroundColor: '#ffffff',
      strokes: [],
      objects: [
        {
          id: 'note-1',
          type: 'note',
          x: -280,
          y: -140,
          width: 220,
          height: 220,
          color: '#fff7d1',
          text: 'Welcome to MK Whiteboard!\n\n• 100% Local & Private\n• Smooth Windows Inking\n• Galaxy Pen & Ruler\n• Sticky notes & shapes',
          angle: -2,
          author: 'MK'
        },
        {
          id: 'note-2',
          type: 'note',
          x: -20,
          y: -140,
          width: 220,
          height: 220,
          color: '#dcf4ff',
          text: 'Privacy First:\n\n• No cloud tracking\n• No accounts needed\n• All workbooks stay on your Windows PC\n• Export anytime',
          angle: 1,
          author: 'Privacy'
        },
        {
          id: 'note-3',
          type: 'note',
          x: 240,
          y: -140,
          width: 220,
          height: 220,
          color: '#e4f9e0',
          text: 'Tools & Hotkeys:\n\n• V: Select / Pan\n• P: Pen\n• H: Highlighter\n• E: Eraser\n• R: Interactive Ruler\n• N: Sticky Note\n• T: Text',
          angle: -1.5,
          author: 'Tips'
        }
      ]
    };

    const projectBoard = {
      id: 'wb-' + (Date.now() + 1),
      title: 'Project Roadmap & Ideas',
      createdAt: Date.now() - 86400000,
      updatedAt: Date.now() - 7200000,
      backgroundStyle: 'squares',
      backgroundColor: '#ffffff',
      strokes: [],
      objects: [
        {
          id: 'note-proj-1',
          type: 'note',
          x: -160,
          y: -100,
          width: 240,
          height: 200,
          color: '#f3e8fd',
          text: 'Goals for Q4:\n\n1. Launch Windows App\n2. Add custom templates\n3. Export to high-res SVG',
          angle: 0,
          author: 'Plan'
        }
      ]
    };

    this.workbooks = [defaultBoard, projectBoard];
    this.saveAllWorkbooks();
  }

  saveAllWorkbooks() {
    try {
      localStorage.setItem(this.storageKey, JSON.stringify(this.workbooks));
      if (this.workbooks) {
        for (const wb of this.workbooks) {
          this.saveWorkbookToDisk(wb);
        }
      }
    } catch (e) {
      console.warn('Failed to save all workbooks', e);
    }
  }

  saveActiveWorkbookDebounced() {
    if (this._saveTimeout) clearTimeout(this._saveTimeout);
    this._saveTimeout = setTimeout(() => {
      this.saveActiveWorkbook();
    }, 300);
  }

  saveActiveWorkbook() {
    if (!this.activeWorkbookId) return;
    const wb = this.workbooks.find(w => w.id === this.activeWorkbookId);
    if (wb) {
      wb.title = this.title;
      wb.backgroundStyle = this.backgroundStyle;
      wb.backgroundColor = this.backgroundColor;
      wb.strokes = this.strokes;
      wb.objects = this.objects;
      wb.updatedAt = Date.now();
      wb.strokeCount = this.strokes.length;
      wb.objectCount = this.objects.length;
      this.saveAllWorkbooks();
      this.saveWorkbookToDisk(wb);
    }
  }

  createWorkbook(title = 'New Whiteboard', templateType = 'blank') {
    const uniqueTitle = this.getUniqueTitle(title || 'New Whiteboard');
    const newId = 'wb-' + Date.now();
    let initialObjects = [];
    let bgStyle = 'dots';

    if (templateType === 'kanban') {
      const cols = ['To Do', 'In Progress', 'Done'];
      const colors = ['#fff7d1', '#dcf4ff', '#e4f9e0'];
      cols.forEach((col, idx) => {
        initialObjects.push({
          id: `kanban-t-${idx}`,
          type: 'text',
          x: -300 + idx * 260,
          y: -180,
          width: 220,
          height: 40,
          fontSize: 22,
          isBold: true,
          color: '#0284c7',
          text: col
        });
        initialObjects.push({
          id: `kanban-n-${idx}`,
          type: 'note',
          x: -300 + idx * 260,
          y: -120,
          width: 220,
          height: 180,
          color: colors[idx],
          text: `Sample item for ${col}`,
          author: 'Task'
        });
      });
    } else if (templateType === 'swot') {
      const quadrants = [
        { label: 'Strengths', color: '#e4f9e0', x: -240, y: -240 },
        { label: 'Weaknesses', color: '#ffe6f0', x: 20, y: -240 },
        { label: 'Opportunities', color: '#dcf4ff', x: -240, y: 20 },
        { label: 'Threats', color: '#ffedd5', x: 20, y: 20 }
      ];
      quadrants.forEach((q, idx) => {
        initialObjects.push({
          id: `swot-${idx}`,
          type: 'note',
          x: q.x,
          y: q.y,
          width: 240,
          height: 240,
          color: q.color,
          text: `${q.label}\n\n• Key Point 1\n• Key Point 2`,
          author: 'SWOT'
        });
      });
    }

    const newWb = {
      id: newId,
      title: uniqueTitle,
      createdAt: Date.now(),
      updatedAt: Date.now(),
      backgroundStyle: bgStyle,
      backgroundColor: '#ffffff',
      strokes: [],
      objects: initialObjects,
      strokeCount: 0,
      objectCount: initialObjects.length
    };

    this.workbooks.unshift(newWb);
    this.saveAllWorkbooks();
    this.saveWorkbookToDisk(newWb);
    this.openWorkbook(newId);
    return newWb;
  }

  openWorkbook(id) {
    const wb = this.workbooks.find(w => w.id === id);
    if (!wb) return false;

    this.activeWorkbookId = id;
    this.title = wb.title || 'Untitled Whiteboard';
    this.backgroundStyle = wb.backgroundStyle || 'dots';
    this.backgroundColor = wb.backgroundColor || '#ffffff';
    this.strokes = JSON.parse(JSON.stringify(wb.strokes || []));
    this.objects = JSON.parse(JSON.stringify(wb.objects || []));
    this.selectedIds.clear();
    this.undoStack = [];
    this.redoStack = [];

    this.currentView = 'canvas';
    this.notify('openWorkbook');
    return true;
  }

  closeToDashboard() {
    this.saveActiveWorkbook();
    this.activeWorkbookId = null;
    this.currentView = 'dashboard';
    this.notify('closeToDashboard');
  }

  renameWorkbook(id, newTitle) {
    const wb = this.workbooks.find(w => w.id === id);
    if (!wb) return { success: false, error: 'Whiteboard not found.' };
    const trimmed = (newTitle || '').trim();
    if (!trimmed) {
      return { success: false, error: 'Whiteboard title cannot be empty.' };
    }

    // Check if another whiteboard already has this title
    const duplicate = this.workbooks.find(w => w.id !== id && (w.title || '').trim().toLowerCase() === trimmed.toLowerCase());
    if (duplicate) {
      return { success: false, error: `A whiteboard named "${trimmed}" already exists. Please choose a unique name.` };
    }

    wb.title = trimmed;
    wb.updatedAt = Date.now();
    if (this.activeWorkbookId === id) {
      this.title = trimmed;
    }
    this.saveAllWorkbooks();
    this.saveWorkbookToDisk(wb);
    this.notify('renameWorkbook');
    return { success: true };
  }

  duplicateWorkbook(id) {
    const wb = this.workbooks.find(w => w.id === id);
    if (!wb) return null;

    const copy = JSON.parse(JSON.stringify(wb));
    copy.id = 'wb-' + Date.now();
    copy.title = this.getUniqueTitle(`${wb.title} (Copy)`);
    copy.createdAt = Date.now();
    copy.updatedAt = Date.now();

    this.workbooks.unshift(copy);
    this.saveAllWorkbooks();
    this.saveWorkbookToDisk(copy);
    this.notify('duplicateWorkbook');
    return copy;
  }

  deleteWorkbook(id) {
    const idx = this.workbooks.findIndex(w => w.id === id);
    if (idx !== -1) {
      this.workbooks.splice(idx, 1);
      if (window.desktopAPI && window.desktopAPI.deleteWorkbookFile && this.storageDirectory && !this.storageDirectory.startsWith('Default')) {
        window.desktopAPI.deleteWorkbookFile(this.storageDirectory, id).catch(err => console.warn(err));
      }
      if (this.workbooks.length === 0) {
        this.initDefaultWorkbooks();
      }
      this.saveAllWorkbooks();
      if (this.activeWorkbookId === id) {
        this.closeToDashboard();
      } else {
        this.notify('deleteWorkbook');
      }
    }
  }

  recordHistory() {
    const snapshot = {
      strokes: JSON.parse(JSON.stringify(this.strokes)),
      objects: JSON.parse(JSON.stringify(this.objects))
    };
    this.undoStack.push(snapshot);
    if (this.undoStack.length > this.maxHistory) {
      this.undoStack.shift();
    }
    this.redoStack = [];
  }

  undo() {
    if (this.undoStack.length === 0) return false;
    const current = {
      strokes: JSON.parse(JSON.stringify(this.strokes)),
      objects: JSON.parse(JSON.stringify(this.objects))
    };
    this.redoStack.push(current);

    const prev = this.undoStack.pop();
    this.strokes = prev.strokes;
    this.objects = prev.objects;
    this.selectedIds.clear();
    this.notify('undo');
    return true;
  }

  redo() {
    if (this.redoStack.length === 0) return false;
    const current = {
      strokes: JSON.parse(JSON.stringify(this.strokes)),
      objects: JSON.parse(JSON.stringify(this.objects))
    };
    this.undoStack.push(current);

    const next = this.redoStack.pop();
    this.strokes = next.strokes;
    this.objects = next.objects;
    this.selectedIds.clear();
    this.notify('redo');
    return true;
  }

  addStroke(stroke) {
    this.recordHistory();
    this.strokes.push(stroke);
    this.notify('addStroke');
  }

  removeStroke(strokeId) {
    const idx = this.strokes.findIndex(s => s.id === strokeId);
    if (idx !== -1) {
      this.recordHistory();
      this.strokes.splice(idx, 1);
      this.notify('removeStroke');
      return true;
    }
    return false;
  }

  addObject(obj) {
    this.recordHistory();
    this.objects.push(obj);
    this.selectedIds.clear();
    this.selectedIds.add(obj.id);
    this.notify('addObject');
  }

  updateObject(id, partial) {
    const obj = this.objects.find(o => o.id === id);
    if (obj) {
      this.recordHistory();
      Object.assign(obj, partial);
      this.notify('updateObject');
    }
  }

  removeObject(id) {
    const idx = this.objects.findIndex(o => o.id === id);
    if (idx !== -1) {
      this.recordHistory();
      this.objects.splice(idx, 1);
      this.selectedIds.delete(id);
      this.notify('removeObject');
      return true;
    }
    return false;
  }

  duplicateSelected() {
    if (this.selectedIds.size === 0) return;
    this.recordHistory();
    const newSelected = new Set();

    for (const id of this.selectedIds) {
      const obj = this.objects.find(o => o.id === id);
      if (obj) {
        const copy = JSON.parse(JSON.stringify(obj));
        copy.id = 'obj-' + Math.random().toString(36).substr(2, 9);
        copy.x += 30;
        copy.y += 30;
        this.objects.push(copy);
        newSelected.add(copy.id);
      }
    }

    this.selectedIds = newSelected;
    this.notify('duplicate');
  }

  deleteSelected() {
    if (this.selectedIds.size === 0) return;
    this.recordHistory();

    this.objects = this.objects.filter(o => !this.selectedIds.has(o.id));
    this.strokes = this.strokes.filter(s => !this.selectedIds.has(s.id));
    this.selectedIds.clear();
    this.notify('delete');
  }

  clearBoard() {
    this.recordHistory();
    this.strokes = [];
    this.objects = [];
    this.selectedIds.clear();
    this.notify('clear');
  }

  bringToFront(id) {
    const idx = this.objects.findIndex(o => o.id === id);
    if (idx !== -1) {
      this.recordHistory();
      const [item] = this.objects.splice(idx, 1);
      this.objects.push(item);
      this.notify('zorder');
    }
  }

  getBounds() {
    let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;
    let hasItems = false;

    for (const stroke of this.strokes) {
      if (stroke.bounds) {
        hasItems = true;
        minX = Math.min(minX, stroke.bounds.x);
        minY = Math.min(minY, stroke.bounds.y);
        maxX = Math.max(maxX, stroke.bounds.x + stroke.bounds.width);
        maxY = Math.max(maxY, stroke.bounds.y + stroke.bounds.height);
      }
    }

    for (const obj of this.objects) {
      hasItems = true;
      minX = Math.min(minX, obj.x);
      minY = Math.min(minY, obj.y);
      maxX = Math.max(maxX, obj.x + (obj.width || 200));
      maxY = Math.max(maxY, obj.y + (obj.height || 200));
    }

    if (!hasItems) return null;
    return {
      x: minX,
      y: minY,
      width: maxX - minX,
      height: maxY - minY
    };
  }

  setBackground(style, color) {
    this.backgroundStyle = style;
    this.backgroundColor = color;
    this.notify('background');
  }

  toggleTheme() {
    this.isDarkMode = !this.isDarkMode;
    if (this.isDarkMode) {
      this.backgroundColor = '#1e1b4b';
    } else {
      this.backgroundColor = '#ffffff';
    }
    this.saveSettings();
    this.notify('theme');
  }

  backupAllToJson() {
    return JSON.stringify({
      app: 'MK Whiteboard',
      version: '1.0.0',
      exportedAt: Date.now(),
      workbooks: this.workbooks,
      settings: {
        storageDirectory: this.storageDirectory,
        isDarkMode: this.isDarkMode
      }
    }, null, 2);
  }

  restoreFromJson(jsonString) {
    try {
      const data = JSON.parse(jsonString);
      if (data.workbooks && Array.isArray(data.workbooks)) {
        this.workbooks = data.workbooks;
        if (data.settings) {
          this.storageDirectory = data.settings.storageDirectory || this.storageDirectory;
          this.isDarkMode = !!data.settings.isDarkMode;
        }
        this.saveAllWorkbooks();
        this.saveSettings();
        this.notify('restore');
        return true;
      }
    } catch (e) {
      console.error('Failed to parse backup JSON', e);
    }
    return false;
  }
}

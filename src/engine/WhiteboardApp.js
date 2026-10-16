import confetti from 'canvas-confetti';
import { CanvasTransform } from './CanvasTransform.js';
import { InkingEngine } from './InkingEngine.js';
import { Ruler } from './Ruler.js';
import { WhiteboardStore } from '../models/WhiteboardStore.js';
import { Dashboard } from '../ui/Dashboard.js';
import { Toolbar } from '../ui/Toolbar.js';
import { Header } from '../ui/Header.js';
import { CreatePanel } from '../ui/CreatePanel.js';
import { Minimap } from '../ui/Minimap.js';
import { ContextMenu } from '../ui/ContextMenu.js';
import { AudioEffects } from '../ui/AudioEffects.js';

export class WhiteboardApp {
  constructor(root) {
    this.root = root;
    this.store = new WhiteboardStore();
    this.audio = new AudioEffects();
    this.inking = new InkingEngine();

    this.activeTool = 'pen';
    this.currentPenConfig = { color: '#242424', size: 3, opacity: 1.0, type: 'pen' };

    // Active inking state
    this.isDrawing = false;
    this.currentStrokePoints = [];
    this.activePointerId = null;

    // Pan state
    this.isPanning = false;
    this.lastPanPoint = { x: 0, y: 0 };
    this.isSpacePressed = false;

    // Dragging / Resizing objects
    this.isDraggingObject = false;
    this.draggedObjectId = null;
    this.dragStartWorld = { x: 0, y: 0 };
    this.objectStartPos = { x: 0, y: 0 };

    // Ruler interaction
    this.rulerMode = null; // 'move' | 'rotate'

    // Lasso selection
    this.isLassoing = false;
    this.lassoPoints = [];

    this.initDOM();
    this.initCanvas();
    this.initUI();
    this.initEvents();
    this.startRenderLoop();

    // Start directly on Dashboard (no extra setup popup)
    this.setView('dashboard');
  }

  initDOM() {
    this.root.innerHTML = `
      <div class="ms-whiteboard-app ${this.store.isDarkMode ? 'dark-theme' : ''}">
        <!-- Setup Wizard View Container -->
        <div id="setup-container" class="setup-wrapper" style="display:none;"></div>

        <!-- Dashboard View Container -->
        <div id="dashboard-container" class="dashboard-wrapper"></div>

        <!-- Canvas View Container -->
        <div id="canvas-view-container" class="canvas-view-wrapper" style="display:none;">
          <div class="canvas-viewport" id="canvas-viewport">
            <canvas id="board-canvas"></canvas>
            <div class="objects-layer" id="objects-layer"></div>
          </div>
          <div id="header-container"></div>
          <div id="toolbar-container"></div>
          <div id="create-panel-container"></div>
          <div id="minimap-container"></div>
          <div id="context-menu-container"></div>
        </div>

        <!-- Hidden input for file paste/drag -->
        <input type="file" id="drop-image-file" accept="image/*" style="display:none;" />
      </div>
    `;

    this.setupContainer = this.root.querySelector('#setup-container');
    this.dashboardContainer = this.root.querySelector('#dashboard-container');
    this.canvasViewContainer = this.root.querySelector('#canvas-view-container');
    this.viewport = this.root.querySelector('#canvas-viewport');
    this.canvas = this.root.querySelector('#board-canvas');
    this.ctx = this.canvas.getContext('2d');
    this.objectsLayer = this.root.querySelector('#objects-layer');
  }

  setView(view) {
    if (view === 'setup') {
      this.setupContainer.style.display = 'flex';
      this.dashboardContainer.style.display = 'none';
      this.canvasViewContainer.style.display = 'none';
      this.setupWizard.show();
    } else if (view === 'dashboard') {
      this.setupContainer.style.display = 'none';
      this.dashboardContainer.style.display = 'flex';
      this.canvasViewContainer.style.display = 'none';
      this.dashboard.renderWorkbooksGrid();
    } else {
      this.setupContainer.style.display = 'none';
      this.dashboardContainer.style.display = 'none';
      this.canvasViewContainer.style.display = 'block';
      this.resizeCanvas();
      this.updateObjectsDOM();
      const bounds = this.store.getBounds();
      this.transform.fitBounds(bounds, 120);
    }
  }

  initCanvas() {
    this.transform = new CanvasTransform(this.canvas);
    this.ruler = new Ruler(this.transform);

    this.resizeCanvas();
    window.addEventListener('resize', () => {
      if (this.store.currentView === 'canvas') {
        this.resizeCanvas();
        this.updateObjectsDOM();
      }
    });
  }

  resizeCanvas() {
    const dpr = window.devicePixelRatio || 1;
    this.transform.dpr = dpr;
    const width = this.viewport.clientWidth || window.innerWidth;
    const height = this.viewport.clientHeight || window.innerHeight;

    this.canvas.width = width * dpr;
    this.canvas.height = height * dpr;
    this.canvas.style.width = `${width}px`;
    this.canvas.style.height = `${height}px`;

    this.ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    this.requestRender();
  }

  initUI() {
    this.dashboard = new Dashboard(
      this.dashboardContainer,
      this.store,
      {
        onOpenWorkbook: (id) => {
          this.store.openWorkbook(id);
          this.audio.playPop();
        }
      }
    );

    this.header = new Header(
      this.root.querySelector('#header-container'),
      this.store,
      {
        onExport: (format) => this.exportBoard(format),
        onClear: () => {
          this.store.clearBoard();
          this.audio.playSwoosh();
        },
        onBackToDashboard: () => {
          this.store.closeToDashboard();
          this.audio.playClick();
        }
      }
    );

    this.toolbar = new Toolbar(
      this.root.querySelector('#toolbar-container'),
      {
        onToolChange: (tool, config) => {
          this.activeTool = tool;
          this.currentPenConfig = config;
          this.audio.playTap();
        },
        onPenConfigChange: (tool, config) => {
          this.currentPenConfig = config;
        },
        onUndo: () => {
          this.store.undo();
          this.audio.playClick();
        },
        onRedo: () => {
          this.store.redo();
          this.audio.playClick();
        },
        onOpenCreate: () => {
          this.createPanel.toggle();
          this.audio.playPop();
        },
        onToggleRuler: () => {
          this.ruler.toggle();
          this.toolbar.setRulerState(this.ruler.visible);
          this.audio.playClick();
          this.requestRender();
        }
      }
    );

    this.createPanel = new CreatePanel(
      this.root.querySelector('#create-panel-container'),
      {
        onInsert: (item) => this.handleInsertItem(item)
      }
    );

    this.minimap = new Minimap(
      this.root.querySelector('#minimap-container'),
      this.transform,
      this.store,
      {
        onFitToScreen: () => {
          const bounds = this.store.getBounds();
          this.transform.fitBounds(bounds);
          this.audio.playClick();
        }
      }
    );

    this.contextMenu = new ContextMenu(
      this.root.querySelector('#context-menu-container'),
      this.store,
      this.transform,
      {
        onDelete: () => {
          this.store.deleteSelected();
          this.audio.playSwoosh();
        },
        onDuplicate: () => {
          this.store.duplicateSelected();
          this.audio.playPop();
        }
      }
    );

    this.store.subscribe((action) => {
      if (action === 'openWorkbook') {
        this.setView('canvas');
      } else if (action === 'closeToDashboard') {
        this.setView('dashboard');
      } else if (action === 'theme') {
        const appEl = this.root.querySelector('.ms-whiteboard-app');
        appEl.classList.toggle('dark-theme', this.store.isDarkMode);
      }
      if (this.store.currentView === 'canvas') {
        this.updateObjectsDOM();
        this.requestRender();
      }
    });

    this.transform.onChange(() => {
      if (this.store.currentView === 'canvas') {
        this.updateObjectsDOM();
        this.requestRender();
      }
    });
  }

  handleInsertItem(item) {
    const center = this.transform.screenToWorld(
      (this.canvas.width / this.transform.dpr) / 2,
      (this.canvas.height / this.transform.dpr) / 2
    );

    if (item.type === 'note') {
      const note = {
        id: 'note-' + Date.now(),
        type: 'note',
        x: center.x - 110 + (Math.random() * 40 - 20),
        y: center.y - 110 + (Math.random() * 40 - 20),
        width: 220,
        height: 220,
        color: item.color || '#fff7d1',
        text: '',
        angle: (Math.random() * 4 - 2),
        author: 'Note'
      };
      this.store.addObject(note);
      this.audio.playPop();
    } else if (item.type === 'note-grid') {
      const colors = ['#fff7d1', '#e4f9e0', '#dcf4ff', '#f3e8fd', '#ffe6f0', '#ffedd5'];
      const startX = center.x - 360;
      const startY = center.y - 360;
      for (let r = 0; r < 3; r++) {
        for (let c = 0; c < 3; c++) {
          const note = {
            id: `note-grid-${r}-${c}-${Date.now()}`,
            type: 'note',
            x: startX + c * 240,
            y: startY + r * 240,
            width: 220,
            height: 220,
            color: colors[(r * 3 + c) % colors.length],
            text: `Card ${r * 3 + c + 1}`,
            angle: 0,
            author: 'Board'
          };
          this.store.addObject(note);
        }
      }
      this.audio.playPop();
    } else if (item.type === 'text') {
      const textObj = {
        id: 'text-' + Date.now(),
        type: 'text',
        x: center.x - 130,
        y: center.y - 30,
        width: 300,
        height: 60,
        fontSize: item.fontSize || 24,
        isBold: !!item.isBold,
        color: this.store.isDarkMode ? '#ffffff' : '#242424',
        text: 'Type text here...'
      };
      this.store.addObject(textObj);
      this.audio.playTap();
    } else if (item.type === 'shape') {
      const shape = {
        id: 'shape-' + Date.now(),
        type: 'shape',
        shapeType: item.shapeType,
        x: center.x - 100,
        y: center.y - 100,
        width: 200,
        height: 200,
        fill: '#0284c7',
        stroke: '#0369a1',
        strokeWidth: 2
      };
      this.store.addObject(shape);
      this.audio.playPop();
    } else if (item.type === 'template') {
      this.insertTemplate(item.templateType, center);
    } else if (item.type === 'stamp') {
      const stamp = {
        id: 'stamp-' + Date.now(),
        type: 'stamp',
        stampId: item.stampId || 'star',
        x: center.x - 24,
        y: center.y - 24,
        size: 48,
        angle: 0
      };
      this.store.addObject(stamp);
      this.audio.playPop();
    } else if (item.type === 'image') {
      const img = new Image();
      img.onload = () => {
        const aspect = img.width / img.height;
        const w = Math.min(img.width, 400);
        const h = w / aspect;
        const imgObj = {
          id: 'img-' + Date.now(),
          type: 'image',
          x: center.x - w / 2,
          y: center.y - h / 2,
          width: w,
          height: h,
          src: item.src
        };
        this.store.addObject(imgObj);
        this.audio.playPop();
      };
      img.src = item.src;
    }
  }

  insertTemplate(type, center) {
    if (type === 'kanban') {
      const cols = ['To Do', 'In Progress', 'Done'];
      const colColors = ['#fff7d1', '#dcf4ff', '#e4f9e0'];
      cols.forEach((col, idx) => {
        const x = center.x - 360 + idx * 260;
        this.store.addObject({
          id: `kanban-head-${idx}-${Date.now()}`,
          type: 'text',
          x: x,
          y: center.y - 180,
          width: 220,
          height: 40,
          fontSize: 22,
          isBold: true,
          color: this.store.isDarkMode ? '#ffffff' : '#0284c7',
          text: col
        });
        this.store.addObject({
          id: `kanban-card-${idx}-${Date.now()}`,
          type: 'note',
          x: x,
          y: center.y - 120,
          width: 220,
          height: 180,
          color: colColors[idx],
          text: `Task card for ${col}`,
          author: 'Board'
        });
      });
    } else if (type === 'swot') {
      const quadrants = [
        { label: 'Strengths', color: '#e4f9e0', x: -240, y: -240 },
        { label: 'Weaknesses', color: '#ffe6f0', x: 20, y: -240 },
        { label: 'Opportunities', color: '#dcf4ff', x: -240, y: 20 },
        { label: 'Threats', color: '#ffedd5', x: 20, y: 20 }
      ];
      quadrants.forEach((q, idx) => {
        this.store.addObject({
          id: `swot-${idx}-${Date.now()}`,
          type: 'note',
          x: center.x + q.x,
          y: center.y + q.y,
          width: 240,
          height: 240,
          color: q.color,
          text: `${q.label}\n\n• Point 1\n• Point 2`,
          author: 'SWOT'
        });
      });
    } else {
      for (let i = 0; i < 4; i++) {
        this.store.addObject({
          id: `brainstorm-${i}-${Date.now()}`,
          type: 'note',
          x: center.x - 240 + (i % 2) * 260,
          y: center.y - 200 + Math.floor(i / 2) * 240,
          width: 220,
          height: 220,
          color: '#fff7d1',
          text: `Idea #${i + 1}`,
          author: 'Brainstorm'
        });
      }
    }
    this.audio.playPop();
  }

  initEvents() {
    this.canvas.addEventListener('pointerdown', (e) => this.onPointerDown(e));
    window.addEventListener('pointermove', (e) => this.onPointerMove(e));
    window.addEventListener('pointerup', (e) => this.onPointerUp(e));
    window.addEventListener('pointercancel', (e) => this.onPointerUp(e));

    this.canvas.addEventListener('wheel', (e) => this.onWheel(e), { passive: false });

    window.addEventListener('keydown', (e) => this.onKeyDown(e));
    window.addEventListener('keyup', (e) => this.onKeyUp(e));

    this.viewport.addEventListener('dragover', (e) => e.preventDefault());
    this.viewport.addEventListener('drop', (e) => this.onDrop(e));

    window.addEventListener('paste', (e) => this.onPaste(e));
  }

  onWheel(e) {
    if (this.store.currentView !== 'canvas') return;
    e.preventDefault();

    const rect = this.canvas.getBoundingClientRect();
    const screenX = e.clientX - rect.left;
    const screenY = e.clientY - rect.top;
    const world = this.transform.screenToWorld(screenX, screenY);

    if (this.ruler.visible && this.ruler.hitTest(world.x, world.y)) {
      const deltaAngle = e.deltaY > 0 ? 5 : -5;
      this.ruler.rotateBy(deltaAngle);
      this.requestRender();
      return;
    }

    const zoomFactor = e.deltaY < 0 ? 1.12 : 0.89;
    this.transform.zoomAt(screenX, screenY, zoomFactor);
  }

  onPointerDown(e) {
    if (this.store.currentView !== 'canvas') return;

    if (e.button === 1 || this.isSpacePressed || (this.activeTool === 'select' && e.target === this.canvas)) {
      this.isPanning = true;
      this.lastPanPoint = { x: e.clientX, y: e.clientY };
      this.canvas.style.cursor = 'grabbing';
      return;
    }

    if (e.button !== 0) return;

    const rect = this.canvas.getBoundingClientRect();
    const screenX = e.clientX - rect.left;
    const screenY = e.clientY - rect.top;
    let world = this.transform.screenToWorld(screenX, screenY);

    if (this.ruler.visible) {
      const hit = this.ruler.hitTest(world.x, world.y);
      if (hit === 'move') {
        this.rulerMode = 'move';
        this.ruler.dragStart = { x: world.x - this.ruler.x, y: world.y - this.ruler.y };
        return;
      } else if (hit === 'rotate') {
        this.rulerMode = 'rotate';
        const rad = Math.atan2(world.y - this.ruler.y, world.x - this.ruler.x);
        this.ruler.initialAngle = (rad * 180) / Math.PI - this.ruler.angle;
        return;
      }
    }

    if (this.activeTool === 'eraser') {
      this.isDrawing = true;
      this.audio.playTap();
      this.eraseAt(world.x, world.y);
      return;
    }

    if (this.activeTool === 'lasso') {
      this.isLassoing = true;
      this.lassoPoints = [[world.x, world.y]];
      this.requestRender();
      return;
    }

    if (['pen', 'red-pen', 'blue-pen', 'galaxy', 'highlighter'].includes(this.activeTool)) {
      this.isDrawing = true;
      this.activePointerId = e.pointerId;
      this.canvas.setPointerCapture(e.pointerId);

      if (this.ruler.visible) {
        const snapped = this.ruler.snapPoint(world.x, world.y);
        if (snapped) world = snapped;
      }

      const pressure = e.pressure !== 0 && e.pressure !== 0.5 ? e.pressure : 0.5;
      this.currentStrokePoints = [[world.x, world.y, pressure]];
      this.audio.playTap();
      this.requestRender();
    }
  }

  onPointerMove(e) {
    if (this.store.currentView !== 'canvas') return;

    if (this.isPanning) {
      const dx = e.clientX - this.lastPanPoint.x;
      const dy = e.clientY - this.lastPanPoint.y;
      this.transform.panBy(dx, dy);
      this.lastPanPoint = { x: e.clientX, y: e.clientY };
      return;
    }

    const rect = this.canvas.getBoundingClientRect();
    const screenX = e.clientX - rect.left;
    const screenY = e.clientY - rect.top;
    let world = this.transform.screenToWorld(screenX, screenY);

    if (this.rulerMode === 'move') {
      this.ruler.x = world.x - this.ruler.dragStart.x;
      this.ruler.y = world.y - this.ruler.dragStart.y;
      this.requestRender();
      return;
    }

    if (this.rulerMode === 'rotate') {
      const rad = Math.atan2(world.y - this.ruler.y, world.x - this.ruler.x);
      const newAngle = (rad * 180) / Math.PI - this.ruler.initialAngle;
      this.ruler.setAngle(newAngle);
      this.requestRender();
      return;
    }

    if (this.isDraggingObject && this.draggedObjectId) {
      const dx = world.x - this.dragStartWorld.x;
      const dy = world.y - this.dragStartWorld.y;
      const obj = this.store.objects.find(o => o.id === this.draggedObjectId);
      if (obj) {
        obj.x = this.objectStartPos.x + dx;
        obj.y = this.objectStartPos.y + dy;
        this.updateObjectsDOM();
        this.requestRender();
      }
      return;
    }

    if (this.isLassoing) {
      this.lassoPoints.push([world.x, world.y]);
      this.requestRender();
      return;
    }

    if (this.isDrawing) {
      if (this.activeTool === 'eraser') {
        this.eraseAt(world.x, world.y);
      } else {
        if (this.ruler.visible) {
          const snapped = this.ruler.snapPoint(world.x, world.y);
          if (snapped) world = snapped;
        }

        const pressure = e.pressure !== 0 && e.pressure !== 0.5 ? e.pressure : 0.5;
        this.currentStrokePoints.push([world.x, world.y, pressure]);
        this.requestRender();
      }
    }
  }

  onPointerUp(e) {
    if (this.isPanning) {
      this.isPanning = false;
      this.canvas.style.cursor = 'default';
    }

    if (this.rulerMode) {
      this.rulerMode = null;
    }

    if (this.isDraggingObject) {
      this.isDraggingObject = false;
      this.draggedObjectId = null;
      this.store.notify('updateObject');
    }

    if (this.isLassoing) {
      this.isLassoing = false;
      this.finishLasso();
      this.requestRender();
    }

    if (this.isDrawing) {
      this.isDrawing = false;
      if (this.currentStrokePoints.length > 0) {
        const bounds = this.inking.computeBounds(this.currentStrokePoints, this.currentPenConfig.size);
        const stroke = {
          id: 'stroke-' + Date.now(),
          type: this.currentPenConfig.type,
          color: this.currentPenConfig.color,
          size: this.currentPenConfig.size,
          opacity: this.currentPenConfig.opacity,
          points: this.currentStrokePoints,
          bounds
        };
        this.store.addStroke(stroke);
        this.currentStrokePoints = [];
      }
      this.requestRender();
    }
  }

  eraseAt(worldX, worldY) {
    const toRemove = [];
    for (const stroke of this.store.strokes) {
      if (this.inking.strokeHitTest(stroke, worldX, worldY, 18)) {
        toRemove.push(stroke.id);
      }
    }
    if (toRemove.length > 0) {
      toRemove.forEach(id => this.store.removeStroke(id));
      this.audio.playSwoosh();
      this.requestRender();
    }
  }

  finishLasso() {
    if (this.lassoPoints.length < 3) return;

    const selected = new Set();
    for (const obj of this.store.objects) {
      const centerX = obj.x + (obj.width || 200) / 2;
      const centerY = obj.y + (obj.height || 200) / 2;
      if (this.pointInPolygon(centerX, centerY, this.lassoPoints)) {
        selected.add(obj.id);
      }
    }

    this.store.selectedIds = selected;
    this.store.notify('select');
    this.lassoPoints = [];
  }

  pointInPolygon(px, py, polygon) {
    let inside = false;
    for (let i = 0, j = polygon.length - 1; i < polygon.length; j = i++) {
      const xi = polygon[i][0], yi = polygon[i][1];
      const xj = polygon[j][0], yj = polygon[j][1];
      const intersect = ((yi > py) !== (yj > py)) &&
        (px < (xj - xi) * (py - yi) / (yj - yi) + xi);
      if (intersect) inside = !inside;
    }
    return inside;
  }

  onKeyDown(e) {
    if (this.store.currentView !== 'canvas') return;
    if (e.target.tagName === 'INPUT' || e.target.tagName === 'TEXTAREA' || e.target.isContentEditable) {
      return;
    }

    if (e.code === 'Space' && !this.isSpacePressed) {
      this.isSpacePressed = true;
      this.canvas.style.cursor = 'grab';
    }

    if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'z') {
      e.preventDefault();
      if (e.shiftKey) {
        this.store.redo();
      } else {
        this.store.undo();
      }
      this.audio.playClick();
    }

    if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'y') {
      e.preventDefault();
      this.store.redo();
      this.audio.playClick();
    }

    if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'd') {
      e.preventDefault();
      this.store.duplicateSelected();
      this.audio.playPop();
    }

    if (e.key === 'Delete' || e.key === 'Backspace') {
      if (this.store.selectedIds.size > 0) {
        this.store.deleteSelected();
        this.audio.playSwoosh();
      }
    }

    const key = e.key.toLowerCase();
    if (key === 'v') this.toolbar.setTool('select');
    if (key === 'p') this.toolbar.setTool('pen');
    if (key === 'h') this.toolbar.setTool('highlighter');
    if (key === 'e') this.toolbar.setTool('eraser');
    if (key === 'r') this.toolbar.setTool('ruler');
    if (key === 'l') this.toolbar.setTool('lasso');
    if (key === 'n') this.handleInsertItem({ type: 'note', color: '#fff7d1' });
    if (key === 't') this.handleInsertItem({ type: 'text' });
  }

  onKeyUp(e) {
    if (e.code === 'Space') {
      this.isSpacePressed = false;
      this.canvas.style.cursor = 'default';
    }
  }

  onDrop(e) {
    e.preventDefault();
    if (this.store.currentView !== 'canvas') return;
    const files = e.dataTransfer.files;
    if (files && files.length > 0) {
      const file = files[0];
      if (file.type.startsWith('image/')) {
        const reader = new FileReader();
        reader.onload = (loadEvt) => {
          this.handleInsertItem({ type: 'image', src: loadEvt.target.result });
        };
        reader.readAsDataURL(file);
      }
    }
  }

  onPaste(e) {
    if (this.store.currentView !== 'canvas') return;
    const items = (e.clipboardData || e.originalEvent.clipboardData).items;
    for (const item of items) {
      if (item.type.indexOf('image') !== -1) {
        const blob = item.getAsFile();
        const reader = new FileReader();
        reader.onload = (loadEvt) => {
          this.handleInsertItem({ type: 'image', src: loadEvt.target.result });
        };
        reader.readAsDataURL(blob);
      }
    }
  }

  updateObjectsDOM() {
    const existingMap = new Map();
    this.objectsLayer.querySelectorAll('.whiteboard-node').forEach(el => {
      existingMap.set(el.getAttribute('data-id'), el);
    });

    const activeIds = new Set();

    for (const obj of this.store.objects) {
      activeIds.add(obj.id);
      let el = existingMap.get(obj.id);

      if (!el) {
        el = this.createObjectDOMNode(obj);
        this.objectsLayer.appendChild(el);
      }

      this.updateObjectDOMNode(el, obj);
    }

    for (const [id, el] of existingMap) {
      if (!activeIds.has(id)) {
        el.remove();
      }
    }
  }

  createObjectDOMNode(obj) {
    const el = document.createElement('div');
    el.className = `whiteboard-node node-type-${obj.type}`;
    el.setAttribute('data-id', obj.id);

    el.addEventListener('pointerdown', (e) => {
      if (e.target.closest('.node-delete-btn') || e.target.tagName === 'TEXTAREA' || e.target.isContentEditable) {
        return;
      }
      this.store.selectedIds.clear();
      this.store.selectedIds.add(obj.id);
      this.store.notify('select');

      this.isDraggingObject = true;
      this.draggedObjectId = obj.id;
      const rect = this.canvas.getBoundingClientRect();
      this.dragStartWorld = this.transform.screenToWorld(e.clientX - rect.left, e.clientY - rect.top);
      this.objectStartPos = { x: obj.x, y: obj.y };
      el.setPointerCapture(e.pointerId);
      this.audio.playTap();
    });

    return el;
  }

  updateObjectDOMNode(el, obj) {
    const screenPos = this.transform.worldToScreen(obj.x, obj.y);
    const scale = this.transform.scale;
    const isSelected = this.store.selectedIds.has(obj.id);

    el.classList.toggle('selected', isSelected);
    el.style.transform = `translate3d(${screenPos.x}px, ${screenPos.y}px, 0) scale(${scale}) rotate(${obj.angle || 0}deg)`;
    el.style.transformOrigin = '0 0';

    if (obj.type === 'note') {
      el.style.width = `${obj.width}px`;
      el.style.height = `${obj.height}px`;
      el.style.backgroundColor = obj.color;

      if (!el.querySelector('.note-textarea')) {
        el.innerHTML = `
          <div class="sticky-note-header">
            <span class="note-pin-dot"></span>
            <span class="note-author-tag">${obj.author || 'Note'}</span>
          </div>
          <textarea class="note-textarea" placeholder="Take a note..." spellcheck="false">${obj.text || ''}</textarea>
        `;
        const textarea = el.querySelector('.note-textarea');
        textarea.addEventListener('input', (e) => {
          obj.text = e.target.value;
          this.store.notify('updateObject');
        });
      } else {
        const textarea = el.querySelector('.note-textarea');
        if (textarea !== document.activeElement && textarea.value !== obj.text) {
          textarea.value = obj.text || '';
        }
      }
    } else if (obj.type === 'text') {
      el.style.width = `${obj.width}px`;
      if (!el.querySelector('.text-box-input')) {
        el.innerHTML = `
          <div class="text-box-input" contenteditable="true" spellcheck="false" style="font-size: ${obj.fontSize || 24}px; font-weight: ${obj.isBold ? '700' : '400'}; color: ${obj.color || '#242424'};">${obj.text || ''}</div>
        `;
        const textInput = el.querySelector('.text-box-input');
        textInput.addEventListener('input', (e) => {
          obj.text = e.target.innerText;
          this.store.notify('updateObject');
        });
      }
    } else if (obj.type === 'shape') {
      el.style.width = `${obj.width}px`;
      el.style.height = `${obj.height}px`;
      if (!el.querySelector('.shape-svg')) {
        el.innerHTML = `<svg class="shape-svg" viewBox="0 0 100 100" width="100%" height="100%">${this.getShapeSvgPath(obj.shapeType, obj.fill)}</svg>`;
      } else {
        el.querySelector('.shape-svg').innerHTML = this.getShapeSvgPath(obj.shapeType, obj.fill);
      }
    } else if (obj.type === 'stamp') {
      el.style.width = `${obj.size || 48}px`;
      el.style.height = `${obj.size || 48}px`;
      el.innerHTML = `<div class="stamp-vector-container" style="width: 100%; height: 100%; display: flex; align-items: center; justify-content: center;">${this.getStampSvg(obj.stampId)}</div>`;
    } else if (obj.type === 'reaction') {
      el.innerHTML = `<div class="stamp-vector-container" style="width: 100%; height: 100%;">${this.getStampSvg('star')}</div>`;
    } else if (obj.type === 'image') {
      el.style.width = `${obj.width}px`;
      el.style.height = `${obj.height}px`;
      if (!el.querySelector('.whiteboard-img')) {
        el.innerHTML = `<img src="${obj.src}" class="whiteboard-img" alt="Uploaded graphic" draggable="false" />`;
      }
    }
  }

  getShapeSvgPath(type, fill = '#0284c7') {
    switch (type) {
      case 'circle':
        return `<circle cx="50" cy="50" r="46" fill="${fill}" stroke="rgba(0,0,0,0.15)" stroke-width="2"/>`;
      case 'triangle':
        return `<polygon points="50,6 94,94 6,94" fill="${fill}" stroke="rgba(0,0,0,0.15)" stroke-width="2"/>`;
      case 'star':
        return `<polygon points="50,4 64,34 96,38 72,60 78,92 50,76 22,92 28,60 4,38 36,34" fill="${fill}" stroke="rgba(0,0,0,0.15)" stroke-width="2"/>`;
      case 'diamond':
        return `<polygon points="50,4 96,50 50,96 4,50" fill="${fill}" stroke="rgba(0,0,0,0.15)" stroke-width="2"/>`;
      case 'arrow':
        return `<path d="M10,40 H60 V20 L94,50 L60,80 V60 H10 Z" fill="${fill}" stroke="rgba(0,0,0,0.15)" stroke-width="2"/>`;
      case 'speech':
        return `<path d="M10,10 H90 V70 H30 L10,90 Z" rx="10" fill="${fill}" stroke="rgba(0,0,0,0.15)" stroke-width="2"/>`;
      case 'rounded-rect':
        return `<rect x="4" y="4" width="92" height="92" rx="16" fill="${fill}" stroke="rgba(0,0,0,0.15)" stroke-width="2"/>`;
      default:
        return `<rect x="4" y="4" width="92" height="92" rx="4" fill="${fill}" stroke="rgba(0,0,0,0.15)" stroke-width="2"/>`;
    }
  }

  getStampSvg(stampId) {
    const map = {
      star: { path: 'm12 2 3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z', color: '#eab308' },
      check: { path: 'M20 6 9 17l-5-5', color: '#10b981' },
      cross: { path: 'M18 6 6 18M6 6l12 12', color: '#ef4444' },
      flag: { path: 'M4 15s1-1 4-1 5 2 8 2 4-1 4-1V3s-1 1-4 1-5-2-8-2-4 1-4 1zM4 22v-7', color: '#f97316' },
      pin: { path: 'M12 2v6m0 0a4 4 0 1 0 0 8 4 4 0 0 0 0-8zm0 8v6', color: '#8b5cf6' },
      heart: { path: 'M19 14c1.49-1.46 3-3.21 3-5.5A5.5 5.5 0 0 0 16.5 3c-1.76 0-3 .5-4.5 2-1.5-1.5-2.74-2-4.5-2A5.5 5.5 0 0 0 2 8.5c0 2.3 1.5 4.05 3 5.5l7 7Z', color: '#ec4899' },
      target: { path: 'M12 2a10 10 0 1 0 10 10A10 10 0 0 0 12 2zm0 6a4 4 0 1 0 4 4 4 4 0 0 0-4-4zm0 2a2 2 0 1 1-2 2 2 2 0 0 1 2-2z', color: '#0284c7' },
      thumbsup: { path: 'M7 10v12M15 10.5a3 3 0 0 0-3-3l-2 1v-3.5a2.5 2.5 0 0 0-5 0V11l-2 3v8h14.5a2.5 2.5 0 0 0 2.4-1.8l1.6-6.4a2.5 2.5 0 0 0-2.4-3.3H15z', color: '#059669' },
      thumbsdown: { path: 'M17 14V2M9 13.5a3 3 0 0 0 3 3l2-1v3.5a2.5 2.5 0 0 0 5 0V13l2-3V2H6.5a2.5 2.5 0 0 0-2.4 1.8L2.5 10.2a2.5 2.5 0 0 0 2.4 3.3H9z', color: '#dc2626' },
      info: { path: 'M12 16v-4m0-4h.01M12 2a10 10 0 1 0 10 10A10 10 0 0 0 12 2z', color: '#3b82f6' }
    };
    const s = map[stampId] || map.star;
    return `<svg viewBox="0 0 24 24" width="100%" height="100%" stroke="${s.color}" fill="none" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><path d="${s.path}"/></svg>`;
  }

  requestRender() {
    this.needsRender = true;
  }

  startRenderLoop() {
    const loop = () => {
      if (this.needsRender && this.store.currentView === 'canvas') {
        this.renderCanvas();
        this.needsRender = false;
      }
      requestAnimationFrame(loop);
    };
    requestAnimationFrame(loop);
  }

  renderCanvas() {
    const width = this.canvas.width / this.transform.dpr;
    const height = this.canvas.height / this.transform.dpr;
    const ctx = this.ctx;

    ctx.clearRect(0, 0, width, height);

    this.drawBackground(ctx, width, height);

    ctx.save();
    ctx.translate(this.transform.x, this.transform.y);
    ctx.scale(this.transform.scale, this.transform.scale);

    for (const stroke of this.store.strokes) {
      this.inking.renderStroke(ctx, stroke);
    }

    if (this.isDrawing && this.currentStrokePoints.length > 0) {
      this.inking.renderStroke(ctx, {
        points: this.currentStrokePoints,
        type: this.currentPenConfig.type,
        color: this.currentPenConfig.color,
        size: this.currentPenConfig.size,
        opacity: this.currentPenConfig.opacity
      });
    }

    if (this.ruler.visible) {
      this.ruler.render(ctx);
    }

    if (this.isLassoing && this.lassoPoints.length > 1) {
      ctx.strokeStyle = '#0284c7';
      ctx.lineWidth = 2 / this.transform.scale;
      ctx.setLineDash([6 / this.transform.scale, 4 / this.transform.scale]);
      ctx.fillStyle = 'rgba(2, 132, 199, 0.08)';
      ctx.beginPath();
      ctx.moveTo(this.lassoPoints[0][0], this.lassoPoints[0][1]);
      for (let i = 1; i < this.lassoPoints.length; i++) {
        ctx.lineTo(this.lassoPoints[i][0], this.lassoPoints[i][1]);
      }
      ctx.closePath();
      ctx.fill();
      ctx.stroke();
      ctx.setLineDash([]);
    }

    ctx.restore();
  }

  drawBackground(ctx, width, height) {
    ctx.fillStyle = this.store.backgroundColor;
    ctx.fillRect(0, 0, width, height);

    const style = this.store.backgroundStyle;
    if (style === 'none') return;

    const baseSpacing = 28;
    const spacing = baseSpacing * this.transform.scale;
    if (spacing < 8) return;

    const startX = ((this.transform.x % spacing) + spacing) % spacing;
    const startY = ((this.transform.y % spacing) + spacing) % spacing;

    const dotColor = this.store.isDarkMode ? 'rgba(255, 255, 255, 0.16)' : 'rgba(0, 0, 0, 0.12)';
    const lineColor = this.store.isDarkMode ? 'rgba(255, 255, 255, 0.07)' : 'rgba(0, 0, 0, 0.07)';

    if (style === 'dots') {
      ctx.fillStyle = dotColor;
      const dotRadius = Math.max(1.2, Math.min(2.0, 1.4 * this.transform.scale));
      for (let x = startX; x < width; x += spacing) {
        for (let y = startY; y < height; y += spacing) {
          ctx.beginPath();
          ctx.arc(x, y, dotRadius, 0, Math.PI * 2);
          ctx.fill();
        }
      }
    } else if (style === 'squares' || style === 'graph') {
      ctx.strokeStyle = lineColor;
      ctx.lineWidth = 1;
      ctx.beginPath();
      for (let x = startX; x < width; x += spacing) {
        ctx.moveTo(x, 0);
        ctx.lineTo(x, height);
      }
      for (let y = startY; y < height; y += spacing) {
        ctx.moveTo(0, y);
        ctx.lineTo(width, y);
      }
      ctx.stroke();
    } else if (style === 'lines') {
      ctx.strokeStyle = lineColor;
      ctx.lineWidth = 1;
      ctx.beginPath();
      for (let y = startY; y < height; y += spacing) {
        ctx.moveTo(0, y);
        ctx.lineTo(width, y);
      }
      ctx.stroke();
    } else if (style === 'isometric') {
      ctx.strokeStyle = lineColor;
      ctx.lineWidth = 1;
      const hSpacing = spacing * Math.sqrt(3);
      ctx.beginPath();
      for (let x = -width; x < width * 2; x += hSpacing) {
        ctx.moveTo(x, 0);
        ctx.lineTo(x + height / Math.sqrt(3), height);
        ctx.moveTo(x, 0);
        ctx.lineTo(x - height / Math.sqrt(3), height);
      }
      ctx.stroke();
    }
  }

  async exportBoard(format) {
    if (format === 'save-as') {
      const res = await this.store.saveWorkbookAs(this.store.activeWorkbookId);
      if (res && res.success && res.filePath) {
        alert(`Whiteboard saved to:\n${res.filePath}`);
      }
      return;
    }

    if (format === 'json') {
      const dataStr = 'data:text/json;charset=utf-8,' + encodeURIComponent(JSON.stringify({
        app: 'MK Whiteboard',
        version: '1.0.0',
        title: this.store.title,
        strokes: this.store.strokes,
        objects: this.store.objects,
        backgroundStyle: this.store.backgroundStyle,
        backgroundColor: this.store.backgroundColor,
        exportedAt: Date.now()
      }, null, 2));
      const a = document.createElement('a');
      a.href = dataStr;
      a.download = `${this.store.title.replace(/\s+/g, '_')}.mkwhiteboard`;
      document.body.appendChild(a);
      a.click();
      a.remove();
      return;
    }

    if (format === 'svg') {
      const bounds = this.store.getBounds() || { x: 0, y: 0, width: 800, height: 600 };
      const pad = 40;
      let svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="${bounds.x - pad} ${bounds.y - pad} ${bounds.width + pad * 2} ${bounds.height + pad * 2}" width="${bounds.width + pad * 2}" height="${bounds.height + pad * 2}">\n`;
      svg += `  <rect x="${bounds.x - pad}" y="${bounds.y - pad}" width="${bounds.width + pad * 2}" height="${bounds.height + pad * 2}" fill="${this.store.backgroundColor}"/>\n`;

      for (const s of this.store.strokes) {
        const pathData = this.inking.getSvgPathFromStroke(this.inking.computeStrokeOutline(s.points, { size: s.size, type: s.type }));
        if (pathData) {
          svg += `  <path d="${pathData}" fill="${s.color}" opacity="${s.opacity || 1}"/>\n`;
        }
      }

      for (const obj of this.store.objects) {
        if (obj.type === 'note') {
          svg += `  <rect x="${obj.x}" y="${obj.y}" width="${obj.width}" height="${obj.height}" rx="8" fill="${obj.color}" stroke="#cbd5e1"/>\n`;
          svg += `  <text x="${obj.x + 16}" y="${obj.y + 40}" font-family="Segoe UI, sans-serif" font-size="14" fill="#242424">${(obj.text || '').replace(/&/g, '&amp;').replace(/</g, '&lt;')}</text>\n`;
        }
      }

      svg += `</svg>`;

      const blob = new Blob([svg], { type: 'image/svg+xml;charset=utf-8' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `${this.store.title.replace(/\s+/g, '_')}.svg`;
      a.click();
      URL.revokeObjectURL(url);
      return;
    }

    // Default: High-Res PNG
    const bounds = this.store.getBounds() || { x: -400, y: -300, width: 800, height: 600 };
    const pad = 60;
    const exportCanvas = document.createElement('canvas');
    const expW = Math.max(bounds.width + pad * 2, 400);
    const expH = Math.max(bounds.height + pad * 2, 400);

    exportCanvas.width = expW * 2;
    exportCanvas.height = expH * 2;
    const eCtx = exportCanvas.getContext('2d');
    eCtx.scale(2, 2);

    eCtx.fillStyle = this.store.backgroundColor;
    eCtx.fillRect(0, 0, expW, expH);
    eCtx.translate(-bounds.x + pad, -bounds.y + pad);

    for (const stroke of this.store.strokes) {
      this.inking.renderStroke(eCtx, stroke);
    }

    for (const obj of this.store.objects) {
      if (obj.type === 'note') {
        eCtx.fillStyle = obj.color;
        eCtx.shadowColor = 'rgba(0,0,0,0.15)';
        eCtx.shadowBlur = 12;
        eCtx.beginPath();
        eCtx.roundRect(obj.x, obj.y, obj.width, obj.height, 8);
        eCtx.fill();
        eCtx.shadowColor = 'transparent';

        eCtx.fillStyle = '#242424';
        eCtx.font = '14px "Segoe UI", sans-serif';
        const lines = (obj.text || '').split('\n');
        lines.forEach((l, i) => {
          eCtx.fillText(l, obj.x + 16, obj.y + 40 + i * 22);
        });
      } else if (obj.type === 'text') {
        eCtx.fillStyle = obj.color || '#242424';
        eCtx.font = `${obj.isBold ? 'bold ' : ''}${obj.fontSize || 24}px "Segoe UI", sans-serif`;
        eCtx.fillText(obj.text || '', obj.x, obj.y + (obj.fontSize || 24));
      }
    }

    const link = document.createElement('a');
    link.download = `${this.store.title.replace(/\s+/g, '_')}.png`;
    link.href = exportCanvas.toDataURL('image/png');
    link.click();
  }
}

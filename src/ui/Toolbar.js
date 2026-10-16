/**
 * Toolbar represents the signature floating Microsoft Whiteboard bottom dock.
 * Provides quick access to Select, Pens, Galaxy Pen, Highlighter, Eraser,
 * Ruler, Lasso, Create (+) flyout, Undo, and Redo.
 */
export class Toolbar {
  constructor(container, options = {}) {
    this.container = container;
    this.onToolChange = options.onToolChange || (() => {});
    this.onPenConfigChange = options.onPenConfigChange || (() => {});
    this.onUndo = options.onUndo || (() => {});
    this.onRedo = options.onRedo || (() => {});
    this.onOpenCreate = options.onOpenCreate || (() => {});
    this.onToggleRuler = options.onToggleRuler || (() => {});

    this.activeTool = 'pen'; // 'select' | 'pen' | 'red-pen' | 'blue-pen' | 'galaxy' | 'highlighter' | 'eraser' | 'lasso'
    this.rulerActive = false;

    this.penConfigs = {
      pen: { color: '#242424', size: 3, opacity: 1.0, type: 'pen' },
      'red-pen': { color: '#d13438', size: 3, opacity: 1.0, type: 'pen' },
      'blue-pen': { color: '#0078d4', size: 3, opacity: 1.0, type: 'pen' },
      galaxy: { color: '#8a2be2', size: 6, opacity: 1.0, type: 'galaxy' },
      highlighter: { color: '#fef08a', size: 24, opacity: 0.45, type: 'highlighter' },
      eraser: { mode: 'stroke', size: 16 }
    };

    this.fluentColors = [
      '#242424', '#707070', '#d13438', '#ea4335',
      '#ff8c00', '#f59e0b', '#107c41', '#10b981',
      '#0078d4', '#6366f1', '#881798', '#ec4899'
    ];

    this.thicknesses = [2, 4, 8, 14, 20];

    this.render();
  }

  getActivePenConfig() {
    return this.penConfigs[this.activeTool] || this.penConfigs.pen;
  }

  setRulerState(active) {
    this.rulerActive = active;
    const btn = this.container.querySelector('[data-tool="ruler"]');
    if (btn) {
      btn.classList.toggle('active', active);
    }
  }

  setTool(tool) {
    if (tool === 'ruler') {
      this.onToggleRuler();
      return;
    }

    if (this.activeTool === tool && ['pen', 'red-pen', 'blue-pen', 'highlighter'].includes(tool)) {
      this.toggleColorPopover(tool);
      return;
    }

    this.activeTool = tool;
    this.closePopovers();
    this.updateActiveButton();
    this.onToolChange(this.activeTool, this.getActivePenConfig());
  }

  updateActiveButton() {
    const buttons = this.container.querySelectorAll('.tool-btn[data-tool]');
    buttons.forEach(btn => {
      const tool = btn.getAttribute('data-tool');
      if (tool === 'ruler') {
        btn.classList.toggle('active', this.rulerActive);
      } else {
        btn.classList.toggle('active', tool === this.activeTool);
      }
    });
  }

  closePopovers() {
    const popover = this.container.querySelector('.pen-popover');
    if (popover) popover.remove();
  }

  toggleColorPopover(tool) {
    const existing = this.container.querySelector(`.pen-popover[data-for="${tool}"]`);
    if (existing) {
      existing.remove();
      return;
    }
    this.closePopovers();

    const config = this.penConfigs[tool];
    const btn = this.container.querySelector(`[data-tool="${tool}"]`);
    if (!btn) return;

    const popover = document.createElement('div');
    popover.className = 'pen-popover';
    popover.setAttribute('data-for', tool);

    popover.innerHTML = `
      <div class="popover-header">Stroke Thickness</div>
      <div class="size-selector">
        ${this.thicknesses.map(size => `
          <button class="size-dot-btn ${config.size === size ? 'active' : ''}" data-size="${size}" title="${size}px">
            <span class="size-dot" style="width: ${Math.min(size + 2, 18)}px; height: ${Math.min(size + 2, 18)}px; background-color: ${config.color};"></span>
          </button>
        `).join('')}
      </div>
      <div class="popover-header">Fluent Colors</div>
      <div class="color-palette-grid">
        ${this.fluentColors.map(c => `
          <button class="color-swatch-btn ${config.color.toLowerCase() === c.toLowerCase() ? 'active' : ''}" data-color="${c}" style="background-color: ${c};" title="${c}"></button>
        `).join('')}
      </div>
    `;

    // Handle clicks inside popover
    popover.addEventListener('click', (e) => {
      const sizeBtn = e.target.closest('.size-dot-btn');
      if (sizeBtn) {
        const newSize = parseInt(sizeBtn.getAttribute('data-size'), 10);
        config.size = newSize;
        popover.querySelectorAll('.size-dot-btn').forEach(b => b.classList.toggle('active', b === sizeBtn));
        this.onPenConfigChange(this.activeTool, config);
        return;
      }

      const colorBtn = e.target.closest('.color-swatch-btn');
      if (colorBtn) {
        const newColor = colorBtn.getAttribute('data-color');
        config.color = newColor;
        popover.querySelectorAll('.color-swatch-btn').forEach(b => b.classList.toggle('active', b === colorBtn));
        popover.querySelectorAll('.size-dot').forEach(dot => dot.style.backgroundColor = newColor);
        // Update pen icon indicator
        const indicator = btn.querySelector('.tool-color-bar');
        if (indicator) indicator.style.backgroundColor = newColor;
        this.onPenConfigChange(this.activeTool, config);
      }
    });

    btn.appendChild(popover);
  }

  render() {
    this.container.innerHTML = `
      <div class="ms-dock-container">
        <!-- Floating Dock Pill -->
        <nav class="ms-toolbar-pill" aria-label="Whiteboard Drawing Tools">
          <!-- Select / Pan Tool -->
          <button type="button" class="tool-btn ${this.activeTool === 'select' ? 'active' : ''}" data-tool="select" title="Select & Pan (V)" aria-label="Select">
            <svg class="tool-icon" viewBox="0 0 24 24" width="20" height="20" stroke="currentColor" fill="none" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
              <path d="m3 3 7.07 16.97 2.51-7.39 7.39-2.51L3 3z"/>
              <path d="m13 13 6 6"/>
            </svg>
            <span class="tool-label">Select</span>
          </button>

          <div class="dock-separator"></div>

          <!-- Black / Standard Pen -->
          <button type="button" class="tool-btn ${this.activeTool === 'pen' ? 'active' : ''}" data-tool="pen" title="Black Pen (P) - Click again for colors & thickness" aria-label="Pen">
            <div class="pen-tip-wrapper">
              <svg class="tool-icon" viewBox="0 0 24 24" width="20" height="20" stroke="currentColor" fill="none" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                <path d="M17 3a2.85 2.83 0 1 1 4 4L7.5 20.5 2 22l1.5-5.5Z"/>
                <path d="m15 5 4 4"/>
              </svg>
              <span class="tool-color-bar" style="background-color: ${this.penConfigs.pen.color};"></span>
            </div>
            <span class="tool-label">Pen</span>
          </button>

          <!-- Red Pen -->
          <button type="button" class="tool-btn ${this.activeTool === 'red-pen' ? 'active' : ''}" data-tool="red-pen" title="Red Pen - Click again to configure" aria-label="Red Pen">
            <div class="pen-tip-wrapper">
              <svg class="tool-icon" viewBox="0 0 24 24" width="20" height="20" stroke="#d13438" fill="none" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                <path d="M17 3a2.85 2.83 0 1 1 4 4L7.5 20.5 2 22l1.5-5.5Z"/>
                <path d="m15 5 4 4"/>
              </svg>
              <span class="tool-color-bar" style="background-color: #d13438;"></span>
            </div>
            <span class="tool-label">Red</span>
          </button>

          <!-- Blue Pen -->
          <button type="button" class="tool-btn ${this.activeTool === 'blue-pen' ? 'active' : ''}" data-tool="blue-pen" title="Blue Pen - Click again to configure" aria-label="Blue Pen">
            <div class="pen-tip-wrapper">
              <svg class="tool-icon" viewBox="0 0 24 24" width="20" height="20" stroke="#0078d4" fill="none" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                <path d="M17 3a2.85 2.83 0 1 1 4 4L7.5 20.5 2 22l1.5-5.5Z"/>
                <path d="m15 5 4 4"/>
              </svg>
              <span class="tool-color-bar" style="background-color: #0078d4;"></span>
            </div>
            <span class="tool-label">Blue</span>
          </button>

          <!-- Galaxy / Rainbow Pen (Signature MS Whiteboard) -->
          <button type="button" class="tool-btn galaxy-btn ${this.activeTool === 'galaxy' ? 'active' : ''}" data-tool="galaxy" title="Galaxy Rainbow Pen" aria-label="Galaxy Pen">
            <div class="pen-tip-wrapper">
              <svg class="tool-icon rainbow-stroke" viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="url(#galaxyGrad)" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
                <defs>
                  <linearGradient id="galaxyGrad" x1="0%" y1="0%" x2="100%" y2="100%">
                    <stop offset="0%" stop-color="#ec4899" />
                    <stop offset="50%" stop-color="#8b5cf6" />
                    <stop offset="100%" stop-color="#06b6d4" />
                  </linearGradient>
                </defs>
                <path d="m12 3-1.9 5.8a2 2 0 0 1-1.3 1.3L3 12l5.8 1.9a2 2 0 0 1 1.3 1.3L12 21l1.9-5.8a2 2 0 0 1 1.3-1.3L21 12l-5.8-1.9a2 2 0 0 1-1.3-1.3L12 3Z"/>
              </svg>
              <span class="tool-color-bar rainbow-gradient-bar"></span>
            </div>
            <span class="tool-label">Galaxy</span>
          </button>

          <!-- Highlighter -->
          <button type="button" class="tool-btn ${this.activeTool === 'highlighter' ? 'active' : ''}" data-tool="highlighter" title="Highlighter (H)" aria-label="Highlighter">
            <div class="pen-tip-wrapper">
              <svg class="tool-icon" viewBox="0 0 24 24" width="20" height="20" stroke="#ca8a04" fill="none" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                <path d="m9 11-6 6v3h3l6-6"/>
                <path d="m22 12-4.6 4.6a2 2 0 0 1-2.8 0l-5.2-5.2a2 2 0 0 1 0-2.8L14 4"/>
              </svg>
              <span class="tool-color-bar" style="background-color: #fef08a;"></span>
            </div>
            <span class="tool-label">Highlight</span>
          </button>

          <!-- Eraser -->
          <button type="button" class="tool-btn ${this.activeTool === 'eraser' ? 'active' : ''}" data-tool="eraser" title="Eraser (E) - Touch any stroke to erase" aria-label="Eraser">
            <svg class="tool-icon" viewBox="0 0 24 24" width="20" height="20" stroke="currentColor" fill="none" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
              <path d="m7 21-4.3-4.3c-1-1-1-2.5 0-3.4l9.6-9.6c1-1 2.5-1 3.4 0l5.6 5.6c1 1 1 2.5 0 3.4L13 21"/>
              <path d="M22 21H7"/>
              <path d="m5 11 9 9"/>
            </svg>
            <span class="tool-label">Eraser</span>
          </button>

          <!-- Interactive Ruler Tool -->
          <button type="button" class="tool-btn ${this.rulerActive ? 'active' : ''}" data-tool="ruler" title="Virtual Ruler (R) - Draw straight lines & measure angles" aria-label="Ruler">
            <svg class="tool-icon" viewBox="0 0 24 24" width="20" height="20" stroke="currentColor" fill="none" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
              <path d="M21.3 15.3a2.4 2.4 0 0 1 0 3.4l-2.6 2.6a2.4 2.4 0 0 1-3.4 0L2.7 8.7a2.4 2.4 0 0 1 0-3.4l2.6-2.6a2.4 2.4 0 0 1 3.4 0Z"/>
              <path d="m14.5 12.5 2-2"/>
              <path d="m11.5 9.5 2-2"/>
              <path d="m8.5 6.5 2-2"/>
              <path d="m17.5 15.5 2-2"/>
            </svg>
            <span class="tool-label">Ruler</span>
          </button>

          <!-- Lasso Select -->
          <button type="button" class="tool-btn ${this.activeTool === 'lasso' ? 'active' : ''}" data-tool="lasso" title="Lasso Select (L)" aria-label="Lasso">
            <svg class="tool-icon" viewBox="0 0 24 24" width="20" height="20" stroke="currentColor" fill="none" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
              <path d="M7 22a5 5 0 0 1-2-4c0-4 4-8 9-8s9 4 9 8a5 5 0 0 1-2 4"/>
              <path d="M10 22a5 5 0 0 1-5-5"/>
              <path d="M12 2v4"/>
            </svg>
            <span class="tool-label">Lasso</span>
          </button>

          <div class="dock-separator"></div>

          <!-- Add / Create Button (+) -->
          <button type="button" class="tool-btn create-plus-btn" data-action="create" title="Create: Sticky Notes, Shapes, Templates, Reactions (N)" aria-label="Add Content">
            <div class="plus-icon-circle">
              <svg viewBox="0 0 24 24" width="18" height="18" stroke="#ffffff" fill="none" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
                <line x1="12" y1="5" x2="12" y2="19"></line>
                <line x1="5" y1="12" x2="19" y2="12"></line>
              </svg>
            </div>
            <span class="tool-label">Create</span>
          </button>
        </nav>

        <!-- Floating Undo/Redo pill at bottom left -->
        <aside class="ms-undo-redo-pill" aria-label="History Controls">
          <button type="button" class="history-btn" data-action="undo" title="Undo (Ctrl+Z)" aria-label="Undo">
            <svg viewBox="0 0 24 24" width="18" height="18" stroke="currentColor" fill="none" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
              <path d="M3 7v6h6"/>
              <path d="M21 17a9 9 0 0 0-9-9 9 9 0 0 0-6 2.3L3 13"/>
            </svg>
          </button>
          <div class="history-separator"></div>
          <button type="button" class="history-btn" data-action="redo" title="Redo (Ctrl+Y)" aria-label="Redo">
            <svg viewBox="0 0 24 24" width="18" height="18" stroke="currentColor" fill="none" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
              <path d="M21 7v6h-6"/>
              <path d="M3 17a9 9 0 0 1 9-9 9 9 0 0 1 6 2.3l3 2.7"/>
            </svg>
          </button>
        </aside>
      </div>
    `;

    // Bind event listeners
    this.container.addEventListener('click', (e) => {
      const toolBtn = e.target.closest('[data-tool]');
      if (toolBtn) {
        const tool = toolBtn.getAttribute('data-tool');
        this.setTool(tool);
        return;
      }

      const actionBtn = e.target.closest('[data-action]');
      if (actionBtn) {
        const action = actionBtn.getAttribute('data-action');
        if (action === 'undo') this.onUndo();
        if (action === 'redo') this.onRedo();
        if (action === 'create') this.onOpenCreate();
      }
    });

    // Close popovers when clicking outside
    document.addEventListener('pointerdown', (e) => {
      if (!e.target.closest('.ms-toolbar-pill')) {
        this.closePopovers();
      }
    });
  }
}

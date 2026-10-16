/**
 * Header represents the Windows 11 Fluent mica header bar for MK Whiteboard.
 * Contains: Back to My Whiteboards button, MK Whiteboard logo, editable title,
 * genuine "Saved locally" indicator, Format Background, Clear, Export, Fullscreen, and Theme toggles.
 * NO fake cloud share or fake accounts.
 */
export class Header {
  constructor(container, store, options = {}) {
    this.container = container;
    this.store = store;
    this.onExport = options.onExport || (() => {});
    this.onClear = options.onClear || (() => {});
    this.onBackToDashboard = options.onBackToDashboard || (() => {});

    this.gridStyles = [
      { id: 'none', label: 'None', iconSvg: '<rect x="4" y="4" width="16" height="16" rx="2" fill="none" stroke="currentColor" stroke-width="1.5"/>' },
      { id: 'dots', label: 'Dots', iconSvg: '<circle cx="8" cy="8" r="1.5" fill="currentColor"/><circle cx="16" cy="8" r="1.5" fill="currentColor"/><circle cx="8" cy="16" r="1.5" fill="currentColor"/><circle cx="16" cy="16" r="1.5" fill="currentColor"/>' },
      { id: 'squares', label: 'Squares', iconSvg: '<rect x="5" y="5" width="6" height="6" fill="none" stroke="currentColor"/><rect x="13" y="5" width="6" height="6" fill="none" stroke="currentColor"/><rect x="5" y="13" width="6" height="6" fill="none" stroke="currentColor"/><rect x="13" y="13" width="6" height="6" fill="none" stroke="currentColor"/>' },
      { id: 'graph', label: 'Graph', iconSvg: '<path d="M4 8h16M4 16h16M8 4v16M16 4v16" stroke="currentColor" stroke-width="1.5"/>' },
      { id: 'lines', label: 'Lines', iconSvg: '<path d="M4 7h16M4 12h16M4 17h16" stroke="currentColor" stroke-width="1.5"/>' },
      { id: 'isometric', label: 'Isometric', iconSvg: '<polygon points="12 4 20 9 20 18 12 14 4 18 4 9" fill="none" stroke="currentColor" stroke-width="1.5"/>' }
    ];

    this.canvasColors = [
      { id: '#ffffff', label: 'White', isLight: true },
      { id: '#fffdf7', label: 'Warm Cream', isLight: true },
      { id: '#f3f4f6', label: 'Slate Gray', isLight: true },
      { id: '#1e1b4b', label: 'Dark Navy', isLight: false },
      { id: '#1f1f1f', label: 'Charcoal Dark', isLight: false },
      { id: '#064e3b', label: 'Forest Green', isLight: false }
    ];

    this.render();
    this.store.subscribe((action) => {
      if (['title', 'theme', 'background', 'update', 'addStroke', 'addObject', 'openWorkbook'].includes(action)) {
        this.updateState();
      }
    });
  }

  updateState() {
    const titleInput = this.container.querySelector('.board-title-input');
    if (titleInput && titleInput !== document.activeElement) {
      titleInput.value = this.store.title;
    }
  }

  toggleBackgroundPopover() {
    const existing = this.container.querySelector('.bg-format-popover');
    if (existing) {
      existing.remove();
      return;
    }

    const btn = this.container.querySelector('#format-bg-btn');
    if (!btn) return;

    const popover = document.createElement('div');
    popover.className = 'bg-format-popover';
    popover.innerHTML = `
      <div class="popover-title">Format Background</div>
      
      <div class="popover-subtitle">Canvas Color</div>
      <div class="color-options-row">
        ${this.canvasColors.map(c => `
          <button class="bg-color-circle ${this.store.backgroundColor === c.id ? 'active' : ''}" 
                  data-color="${c.id}" 
                  style="background-color: ${c.id}; border: 1.5px solid ${c.isLight ? '#e2e8f0' : '#4b5563'};"
                  title="${c.label}">
          </button>
        `).join('')}
      </div>

      <div class="popover-subtitle" style="margin-top: 14px;">Grid Pattern</div>
      <div class="grid-styles-list">
        ${this.gridStyles.map(g => `
          <button class="grid-style-btn ${this.store.backgroundStyle === g.id ? 'active' : ''}" data-style="${g.id}">
            <svg viewBox="0 0 24 24" width="18" height="18" class="grid-icon">${g.iconSvg}</svg>
            <span class="grid-label">${g.label}</span>
          </button>
        `).join('')}
      </div>
    `;

    popover.addEventListener('click', (e) => {
      const colorBtn = e.target.closest('.bg-color-circle');
      if (colorBtn) {
        const color = colorBtn.getAttribute('data-color');
        this.store.setBackground(this.store.backgroundStyle, color);
        popover.querySelectorAll('.bg-color-circle').forEach(b => b.classList.toggle('active', b === colorBtn));
        return;
      }

      const styleBtn = e.target.closest('.grid-style-btn');
      if (styleBtn) {
        const style = styleBtn.getAttribute('data-style');
        this.store.setBackground(style, this.store.backgroundColor);
        popover.querySelectorAll('.grid-style-btn').forEach(b => b.classList.toggle('active', b === styleBtn));
      }
    });

    btn.appendChild(popover);

    const outsideHandler = (e) => {
      if (!e.target.closest('#format-bg-btn')) {
        popover.remove();
        document.removeEventListener('pointerdown', outsideHandler);
      }
    };
    setTimeout(() => document.addEventListener('pointerdown', outsideHandler), 10);
  }

  toggleExportPopover() {
    const existing = this.container.querySelector('.export-popover');
    if (existing) {
      existing.remove();
      return;
    }

    const btn = this.container.querySelector('#export-btn');
    if (!btn) return;

    const popover = document.createElement('div');
    popover.className = 'export-popover';
    popover.innerHTML = `
      <div class="popover-title">Export / Save Whiteboard</div>
      <button class="export-opt-btn" data-export="save-as">
        <span class="export-icon">
          <svg viewBox="0 0 24 24" width="20" height="20" stroke="#0284c7" fill="none" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
            <path d="M19 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11l5 5v11a2 2 0 0 1-2 2z"></path>
            <polyline points="17 21 17 13 7 13 7 21"></polyline>
            <polyline points="7 3 7 8 15 8"></polyline>
          </svg>
        </span>
        <div class="export-text">
          <div class="export-name">Save As... (.mkwhiteboard)</div>
          <div class="export-desc">Choose any folder on your PC to save a copy</div>
        </div>
      </button>
      <button class="export-opt-btn" data-export="png">
        <span class="export-icon">
          <svg viewBox="0 0 24 24" width="20" height="20" stroke="#0284c7" fill="none" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
            <rect x="3" y="3" width="18" height="18" rx="2" ry="2"></rect>
            <circle cx="8.5" cy="8.5" r="1.5"></circle>
            <polyline points="21 15 16 10 5 21"></polyline>
          </svg>
        </span>
        <div class="export-text">
          <div class="export-name">PNG Image</div>
          <div class="export-desc">High-resolution image file for presentations</div>
        </div>
      </button>
      <button class="export-opt-btn" data-export="svg">
        <span class="export-icon">
          <svg viewBox="0 0 24 24" width="20" height="20" stroke="#059669" fill="none" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
            <polygon points="12 2 2 7 12 12 22 7 12 2"></polygon>
            <polyline points="2 17 12 22 22 17"></polyline>
            <polyline points="2 12 12 17 22 12"></polyline>
          </svg>
        </span>
        <div class="export-text">
          <div class="export-name">Scalable Vector (SVG)</div>
          <div class="export-desc">Lossless vector graphic</div>
        </div>
      </button>
      <button class="export-opt-btn" data-export="json">
        <span class="export-icon">
          <svg viewBox="0 0 24 24" width="20" height="20" stroke="#d97706" fill="none" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
            <path d="M19 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11l5 5v11a2 2 0 0 1-2 2z"></path>
            <polyline points="17 21 17 13 7 13 7 21"></polyline>
            <polyline points="7 3 7 8 15 8"></polyline>
          </svg>
        </span>
        <div class="export-text">
          <div class="export-name">Backup to Downloads</div>
          <div class="export-desc">Quickly download a .mkwhiteboard backup file</div>
        </div>
      </button>
    `;

    popover.addEventListener('click', (e) => {
      const optBtn = e.target.closest('.export-opt-btn');
      if (optBtn) {
        const format = optBtn.getAttribute('data-export');
        this.onExport(format);
        popover.remove();
      }
    });

    btn.appendChild(popover);

    const outsideHandler = (e) => {
      if (!e.target.closest('#export-btn')) {
        popover.remove();
        document.removeEventListener('pointerdown', outsideHandler);
      }
    };
    setTimeout(() => document.addEventListener('pointerdown', outsideHandler), 10);
  }

  render() {
    this.container.innerHTML = `
      <header class="ms-app-header" role="banner">
        <!-- Left: Back to Dashboard & Board Title -->
        <div class="header-left-cluster">
          <button class="back-to-boards-btn" title="Back to My Whiteboards" aria-label="My Whiteboards">
            <svg viewBox="0 0 24 24" width="16" height="16" stroke="currentColor" fill="none" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
              <polyline points="15 18 9 12 15 6"></polyline>
            </svg>
            <span>My Whiteboards</span>
          </button>

          <div class="brand-divider"></div>
          
          <img src="./assets/mk-logo.svg" alt="MK Whiteboard" class="whiteboard-app-icon" />
          
          <div class="title-and-status">
            <input type="text" class="board-title-input" value="${this.store.title}" placeholder="Untitled whiteboard" aria-label="Whiteboard Title" spellcheck="false" />
            <div class="save-indicator">
              <span class="save-dot"></span>
              <span class="save-status-text">Saved locally</span>
            </div>
          </div>
        </div>

        <!-- Right: Actions -->
        <div class="header-right-cluster">
          <!-- Format Background -->
          <div class="popover-wrapper" id="format-bg-btn">
            <button type="button" class="header-icon-btn" title="Format Background (Colors & Grids)" aria-label="Format Background">
              <svg viewBox="0 0 24 24" width="18" height="18" stroke="currentColor" fill="none" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                <circle cx="12" cy="12" r="10"/>
                <path d="M12 2a4.5 4.5 0 0 0 0 9 4.5 4.5 0 0 1 0 9 10 10 0 0 0 0-18"/>
              </svg>
            </button>
          </div>

          <!-- Clear Canvas -->
          <button type="button" class="header-icon-btn" id="clear-board-btn" title="Clear Canvas" aria-label="Clear Canvas">
            <svg viewBox="0 0 24 24" width="18" height="18" stroke="currentColor" fill="none" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
              <path d="M3 6h18"/>
              <path d="M19 6v14c0 1-1 2-2 2H7c-1 0-2-1-2-2V6"/>
              <path d="M8 6V4c0-1 1-2 2-2h4c1 0 2 1 2 2v2"/>
            </svg>
          </button>

          <!-- Export -->
          <div class="popover-wrapper" id="export-btn">
            <button type="button" class="header-icon-btn" title="Export Image or File" aria-label="Export">
              <svg viewBox="0 0 24 24" width="18" height="18" stroke="currentColor" fill="none" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/>
                <polyline points="7 10 12 15 17 10"/>
                <line x1="12" y1="15" x2="12" y2="3"/>
              </svg>
            </button>
          </div>

          <!-- Fullscreen -->
          <button type="button" class="header-icon-btn" id="fullscreen-btn" title="Toggle Fullscreen (F11)" aria-label="Fullscreen">
            <svg viewBox="0 0 24 24" width="18" height="18" stroke="currentColor" fill="none" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
              <path d="M8 3H5a2 2 0 0 0-2 2v3m18 0V5a2 2 0 0 0-2-2h-3m0 18h3a2 2 0 0 0 2-2v-3M3 16v3a2 2 0 0 0 2 2h3"/>
            </svg>
          </button>

          <!-- Theme Toggle -->
          <button type="button" class="header-icon-btn" id="theme-btn" title="Toggle Dark/Light Mode" aria-label="Theme">
            <svg viewBox="0 0 24 24" width="18" height="18" stroke="currentColor" fill="none" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
              <circle cx="12" cy="12" r="4"/>
              <path d="M12 2v2"/>
              <path d="M12 20v2"/>
              <path d="m4.93 4.93 1.41 1.41"/>
              <path d="m17.66 17.66 1.41 1.41"/>
              <path d="M2 12h2"/>
              <path d="M20 12h2"/>
              <path d="m6.34 17.66-1.41 1.41"/>
              <path d="m19.07 4.93-1.41 1.41"/>
            </svg>
          </button>
        </div>
      </header>
    `;

    // Event binding
    const titleInput = this.container.querySelector('.board-title-input');
    titleInput.addEventListener('change', (e) => {
      const val = e.target.value.trim();
      const res = this.store.renameWorkbook(this.store.activeWorkbookId, val);
      if (res && !res.success) {
        alert(res.error);
        e.target.value = this.store.title;
      }
    });

    this.container.querySelector('.back-to-boards-btn').addEventListener('click', () => {
      this.onBackToDashboard();
    });

    this.container.querySelector('#format-bg-btn').addEventListener('click', (e) => {
      if (e.target.closest('.header-icon-btn')) {
        this.toggleBackgroundPopover();
      }
    });

    this.container.querySelector('#export-btn').addEventListener('click', (e) => {
      if (e.target.closest('.header-icon-btn')) {
        this.toggleExportPopover();
      }
    });

    this.container.querySelector('#clear-board-btn').addEventListener('click', () => {
      if (confirm('Clear all strokes and objects from this whiteboard?')) {
        this.onClear();
      }
    });

    this.container.querySelector('#theme-btn').addEventListener('click', () => {
      this.store.toggleTheme();
    });

    this.container.querySelector('#fullscreen-btn').addEventListener('click', () => {
      if (!document.fullscreenElement) {
        document.documentElement.requestFullscreen().catch(() => {});
      } else {
        document.exitFullscreen().catch(() => {});
      }
    });
  }
}

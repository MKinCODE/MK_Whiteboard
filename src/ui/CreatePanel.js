/**
 * CreatePanel flyout drawer for inserting Sticky Notes, Text, Shapes,
 * Templates, Reactions, and Images onto the Whiteboard.
 */
export class CreatePanel {
  constructor(container, options = {}) {
    this.container = container;
    this.isOpen = false;
    this.activeTab = 'notes'; // 'notes' | 'text' | 'shapes' | 'templates' | 'reactions'
    this.onInsert = options.onInsert || (() => {});
    this.onClose = options.onClose || (() => {});

    this.stickyColors = [
      { name: 'Yellow', color: '#fff7d1', border: '#fef08a' },
      { name: 'Green', color: '#e4f9e0', border: '#bbf7d0' },
      { name: 'Blue', color: '#dcf4ff', border: '#bae6fd' },
      { name: 'Purple', color: '#f3e8fd', border: '#e9d5ff' },
      { name: 'Pink', color: '#ffe6f0', border: '#fbcfe8' },
      { name: 'Orange', color: '#ffedd5', border: '#fed7aa' }
    ];

    this.shapes = [
      { id: 'rect', name: 'Rectangle', icon: 'M4 4h16v16H4z' },
      { id: 'rounded-rect', name: 'Rounded', icon: 'M5 3h14a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2z' },
      { id: 'circle', name: 'Circle', icon: 'M12 2a10 10 0 1 0 10 10A10 10 0 0 0 12 2z' },
      { id: 'triangle', name: 'Triangle', icon: 'M12 2 2 22h20L12 2z' },
      { id: 'star', name: 'Star', icon: 'm12 2 3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z' },
      { id: 'diamond', name: 'Diamond', icon: 'M12 2 2 12l10 10 10-10L12 2z' },
      { id: 'arrow', name: 'Arrow', icon: 'm12 5 7 7-7 7M5 12h14' },
      { id: 'speech', name: 'Speech Bubble', icon: 'M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z' }
    ];

    this.templates = [
      {
        id: 'kanban',
        title: 'Kanban Board',
        desc: 'To Do, In Progress, and Done cards',
        iconSvg: '<rect x="3" y="3" width="5" height="18" rx="1"></rect><rect x="10" y="3" width="5" height="12" rx="1"></rect><rect x="17" y="3" width="5" height="15" rx="1"></rect>'
      },
      {
        id: 'swot',
        title: 'SWOT Analysis',
        desc: 'Strengths, Weaknesses, Opportunities, Threats',
        iconSvg: '<rect x="3" y="3" width="8" height="8" rx="1"></rect><rect x="13" y="3" width="8" height="8" rx="1"></rect><rect x="3" y="13" width="8" height="8" rx="1"></rect><rect x="13" y="13" width="8" height="8" rx="1"></rect>'
      },
      {
        id: 'brainstorm',
        title: 'Brainstorm Grid',
        desc: '4-quadrant structured idea space',
        iconSvg: '<circle cx="12" cy="12" r="9"></circle><path d="M12 3v18M3 12h18"></path>'
      },
      {
        id: 'retrospective',
        title: 'Sprint Retrospective',
        desc: 'What went well, What did not, Next steps',
        iconSvg: '<path d="M21 12a9 9 0 0 0-9-9 9.75 9.75 0 0 0-6.74 2.74L3 8"></path><path d="M3 3v5h5"></path><path d="M3 12a9 9 0 0 0 9 9 9.75 9.75 0 0 0 6.74-2.74L21 16"></path><path d="M16 21h5v-5"></path>'
      }
    ];

    this.stamps = [
      { id: 'star', name: 'Star', path: 'm12 2 3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z', color: '#eab308' },
      { id: 'check', name: 'Checkmark', path: 'M20 6 9 17l-5-5', color: '#10b981' },
      { id: 'cross', name: 'Cross', path: 'M18 6 6 18M6 6l12 12', color: '#ef4444' },
      { id: 'flag', name: 'Flag', path: 'M4 15s1-1 4-1 5 2 8 2 4-1 4-1V3s-1 1-4 1-5-2-8-2-4 1-4 1zM4 22v-7', color: '#f97316' },
      { id: 'pin', name: 'Pin', path: 'M12 2v6m0 0a4 4 0 1 0 0 8 4 4 0 0 0 0-8zm0 8v6', color: '#8b5cf6' },
      { id: 'heart', name: 'Heart', path: 'M19 14c1.49-1.46 3-3.21 3-5.5A5.5 5.5 0 0 0 16.5 3c-1.76 0-3 .5-4.5 2-1.5-1.5-2.74-2-4.5-2A5.5 5.5 0 0 0 2 8.5c0 2.3 1.5 4.05 3 5.5l7 7Z', color: '#ec4899' },
      { id: 'target', name: 'Target', path: 'M12 2a10 10 0 1 0 10 10A10 10 0 0 0 12 2zm0 6a4 4 0 1 0 4 4 4 4 0 0 0-4-4zm0 2a2 2 0 1 1-2 2 2 2 0 0 1 2-2z', color: '#0284c7' },
      { id: 'thumbsup', name: 'Approve', path: 'M7 10v12M15 10.5a3 3 0 0 0-3-3l-2 1v-3.5a2.5 2.5 0 0 0-5 0V11l-2 3v8h14.5a2.5 2.5 0 0 0 2.4-1.8l1.6-6.4a2.5 2.5 0 0 0-2.4-3.3H15z', color: '#059669' },
      { id: 'thumbsdown', name: 'Reject', path: 'M17 14V2M9 13.5a3 3 0 0 0 3 3l2-1v3.5a2.5 2.5 0 0 0 5 0V13l2-3V2H6.5a2.5 2.5 0 0 0-2.4 1.8L2.5 10.2a2.5 2.5 0 0 0 2.4 3.3H9z', color: '#dc2626' },
      { id: 'info', name: 'Info', path: 'M12 16v-4m0-4h.01M12 2a10 10 0 1 0 10 10A10 10 0 0 0 12 2z', color: '#3b82f6' }
    ];

    this.render();
  }

  toggle() {
    this.isOpen ? this.close() : this.open();
  }

  open() {
    this.isOpen = true;
    this.panelEl.classList.add('visible');
    this.backdropEl.classList.add('visible');
  }

  close() {
    this.isOpen = false;
    this.panelEl.classList.remove('visible');
    this.backdropEl.classList.remove('visible');
    this.onClose();
  }

  switchTab(tab) {
    this.activeTab = tab;
    this.panelEl.querySelectorAll('.create-tab-btn').forEach(btn => {
      btn.classList.toggle('active', btn.getAttribute('data-tab') === tab);
    });
    this.panelEl.querySelectorAll('.tab-content-section').forEach(sec => {
      sec.classList.toggle('active', sec.getAttribute('data-section') === tab);
    });
  }

  render() {
    this.container.innerHTML = `
      <div class="create-backdrop"></div>
      <div class="ms-create-drawer" role="dialog" aria-label="Create Content Panel">
        <!-- Drawer Header -->
        <div class="drawer-header">
          <div class="drawer-title-group">
            <h2 class="drawer-title">Create</h2>
            <span class="drawer-subtitle">Add items to whiteboard</span>
          </div>
          <button class="drawer-close-btn" aria-label="Close drawer">
            <svg viewBox="0 0 24 24" width="18" height="18" stroke="currentColor" fill="none" stroke-width="2" stroke-linecap="round">
              <line x1="18" y1="6" x2="6" y2="18"></line>
              <line x1="6" y1="6" x2="18" y2="18"></line>
            </svg>
          </button>
        </div>

        <!-- Navigation Tabs -->
        <div class="create-tabs">
          <button class="create-tab-btn ${this.activeTab === 'notes' ? 'active' : ''}" data-tab="notes">Notes</button>
          <button class="create-tab-btn ${this.activeTab === 'text' ? 'active' : ''}" data-tab="text">Text</button>
          <button class="create-tab-btn ${this.activeTab === 'shapes' ? 'active' : ''}" data-tab="shapes">Shapes</button>
          <button class="create-tab-btn ${this.activeTab === 'templates' ? 'active' : ''}" data-tab="templates">Templates</button>
          <button class="create-tab-btn ${this.activeTab === 'stamps' ? 'active' : ''}" data-tab="stamps">Stamps</button>
        </div>

        <div class="create-drawer-body">
          <!-- Notes Section -->
          <div class="tab-content-section ${this.activeTab === 'notes' ? 'active' : ''}" data-section="notes">
            <div class="section-label">Sticky Notes</div>
            <div class="sticky-swatch-grid">
              ${this.stickyColors.map(c => `
                <button class="sticky-create-card" data-action="note" data-color="${c.color}" style="background-color: ${c.color}; border-color: ${c.border};" title="Add ${c.name} Note">
                  <span class="note-author-pill">Note</span>
                  <div class="note-preview-lines">
                    <span class="line-skeleton"></span>
                    <span class="line-skeleton short"></span>
                  </div>
                </button>
              `).join('')}
            </div>

            <div class="section-label" style="margin-top: 18px;">Note Grid (3x3 Matrix)</div>
            <button class="action-card-row" data-action="note-grid">
              <div class="action-card-icon">
                <svg viewBox="0 0 24 24" width="22" height="22" stroke="#0284c7" fill="none" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                  <rect x="3" y="3" width="7" height="7"></rect>
                  <rect x="14" y="3" width="7" height="7"></rect>
                  <rect x="14" y="14" width="7" height="7"></rect>
                  <rect x="3" y="14" width="7" height="7"></rect>
                </svg>
              </div>
              <div class="action-card-text">
                <div class="card-name">3x3 Brainstorm Grid</div>
                <div class="card-desc">Quickly drop a structured set of 9 categorized notes</div>
              </div>
            </button>
          </div>

          <!-- Text Section -->
          <div class="tab-content-section ${this.activeTab === 'text' ? 'active' : ''}" data-section="text">
            <div class="section-label">Text Elements</div>
            <button class="action-card-row" data-action="text-title">
              <div class="action-card-icon" style="font-size: 20px; font-weight: bold;">H1</div>
              <div class="action-card-text">
                <div class="card-name">Board Heading</div>
                <div class="card-desc">Large 36px title for whiteboard section</div>
              </div>
            </button>
            <button class="action-card-row" data-action="text-body">
              <div class="action-card-icon" style="font-size: 16px;">Aa</div>
              <div class="action-card-text">
                <div class="card-name">Body Text</div>
                <div class="card-desc">Standard 20px text box for ideas & notes</div>
              </div>
            </button>
          </div>

          <!-- Shapes Section -->
          <div class="tab-content-section ${this.activeTab === 'shapes' ? 'active' : ''}" data-section="shapes">
            <div class="section-label">Geometric Shapes</div>
            <div class="shapes-picker-grid">
              ${this.shapes.map(s => `
                <button class="shape-picker-btn" data-action="shape" data-shape="${s.id}" title="${s.name}">
                  <svg viewBox="0 0 24 24" width="24" height="24" stroke="currentColor" fill="none" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                    <path d="${s.icon}"/>
                  </svg>
                  <span class="shape-name">${s.name}</span>
                </button>
              `).join('')}
            </div>
          </div>

          <!-- Templates Section -->
          <div class="tab-content-section ${this.activeTab === 'templates' ? 'active' : ''}" data-section="templates">
            <div class="section-label">Pre-built Whiteboard Templates</div>
            <div class="templates-list">
              ${this.templates.map(t => `
                <button class="action-card-row" data-action="template" data-template="${t.id}">
                  <div class="action-card-icon">
                    <svg viewBox="0 0 24 24" width="20" height="20" stroke="#0284c7" fill="none" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                      ${t.iconSvg}
                    </svg>
                  </div>
                  <div class="action-card-text">
                    <div class="card-name">${t.title}</div>
                    <div class="card-desc">${t.desc}</div>
                  </div>
                </button>
              `).join('')}
            </div>
          </div>

          <!-- Stamps Section (Zero Emojis, Clean Vector Badges) -->
          <div class="tab-content-section ${this.activeTab === 'stamps' ? 'active' : ''}" data-section="stamps">
            <div class="section-label">Symbols & Status Badges</div>
            <div class="reactions-grid">
              ${this.stamps.map(s => `
                <button class="stamp-badge-btn" data-action="stamp" data-stamp="${s.id}" title="Stamp ${s.name}">
                  <svg viewBox="0 0 24 24" width="24" height="24" stroke="${s.color}" fill="none" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                    <path d="${s.path}"/>
                  </svg>
                </button>
              `).join('')}
            </div>
          </div>

          <!-- Media Section -->
          <div class="drawer-divider"></div>
          <div class="section-label">Insert Media</div>
          <label class="action-card-row file-upload-label">
            <div class="action-card-icon">
              <svg viewBox="0 0 24 24" width="20" height="20" stroke="#0284c7" fill="none" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                <rect x="3" y="3" width="18" height="18" rx="2" ry="2"></rect>
                <circle cx="8.5" cy="8.5" r="1.5"></circle>
                <polyline points="21 15 16 10 5 21"></polyline>
              </svg>
            </div>
            <div class="action-card-text">
              <div class="card-name">Insert Image</div>
              <div class="card-desc">Add PNG, JPEG, SVG or WebP from PC</div>
            </div>
            <input type="file" id="whiteboard-image-input" accept="image/*" style="display:none;" />
          </label>
        </div>
      </div>
    `;

    this.backdropEl = this.container.querySelector('.create-backdrop');
    this.panelEl = this.container.querySelector('.ms-create-drawer');

    // Event handlers
    this.backdropEl.addEventListener('click', () => this.close());
    this.panelEl.querySelector('.drawer-close-btn').addEventListener('click', () => this.close());

    this.panelEl.addEventListener('click', (e) => {
      const tabBtn = e.target.closest('.create-tab-btn');
      if (tabBtn) {
        this.switchTab(tabBtn.getAttribute('data-tab'));
        return;
      }

      const itemBtn = e.target.closest('[data-action]');
      if (itemBtn) {
        const action = itemBtn.getAttribute('data-action');
        if (action === 'note') {
          const color = itemBtn.getAttribute('data-color');
          this.onInsert({ type: 'note', color });
          this.close();
        } else if (action === 'note-grid') {
          this.onInsert({ type: 'note-grid' });
          this.close();
        } else if (action === 'text-title') {
          this.onInsert({ type: 'text', fontSize: 36, isBold: true });
          this.close();
        } else if (action === 'text-body') {
          this.onInsert({ type: 'text', fontSize: 20 });
          this.close();
        } else if (action === 'shape') {
          const shapeType = itemBtn.getAttribute('data-shape');
          this.onInsert({ type: 'shape', shapeType });
          this.close();
        } else if (action === 'template') {
          const templateType = itemBtn.getAttribute('data-template');
          this.onInsert({ type: 'template', templateType });
          this.close();
        } else if (action === 'stamp') {
          const stampId = itemBtn.getAttribute('data-stamp');
          this.onInsert({ type: 'stamp', stampId });
          this.close();
        }
      }
    });

    const fileInput = this.container.querySelector('#whiteboard-image-input');
    fileInput.addEventListener('change', (e) => {
      const file = e.target.files && e.target.files[0];
      if (file) {
        const reader = new FileReader();
        reader.onload = (loadEvt) => {
          this.onInsert({ type: 'image', src: loadEvt.target.result });
          this.close();
        };
        reader.readAsDataURL(file);
      }
    });
  }
}

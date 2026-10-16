/**
 * Dashboard provides the local-first whiteboard gallery.
 * Shows all user workbooks, creation buttons, templates, search,
 * sorting, and local storage management with zero cloud or fake accounts.
 */
export class Dashboard {
  constructor(container, store, options = {}) {
    this.container = container;
    this.store = store;
    this.onOpenWorkbook = options.onOpenWorkbook || (() => {});
    this.searchQuery = '';
    this.sortBy = 'modified'; // 'modified' | 'title' | 'created'

    this.render();
    this.store.subscribe((action) => {
      if (this.store.currentView === 'dashboard') {
        this.renderWorkbooksGrid();
      }
    });
  }

  show() {
    this.container.style.display = 'flex';
    this.renderWorkbooksGrid();
  }

  hide() {
    this.container.style.display = 'none';
  }

  getFilteredWorkbooks() {
    let list = [...this.store.workbooks];
    if (this.searchQuery.trim()) {
      const q = this.searchQuery.toLowerCase();
      list = list.filter(w => (w.title || '').toLowerCase().includes(q));
    }

    if (this.sortBy === 'modified') {
      list.sort((a, b) => (b.updatedAt || 0) - (a.updatedAt || 0));
    } else if (this.sortBy === 'created') {
      list.sort((a, b) => (b.createdAt || 0) - (a.createdAt || 0));
    } else if (this.sortBy === 'title') {
      list.sort((a, b) => (a.title || '').localeCompare(b.title || ''));
    }
    return list;
  }

  formatDate(timestamp) {
    if (!timestamp) return 'Recently';
    const diff = Date.now() - timestamp;
    if (diff < 60000) return 'Just now';
    if (diff < 3600000) return `${Math.floor(diff / 60000)}m ago`;
    if (diff < 86400000) return `${Math.floor(diff / 3600000)}h ago`;
    if (diff < 604800000) return `${Math.floor(diff / 86400000)}d ago`;
    return new Date(timestamp).toLocaleDateString();
  }

  renderWorkbooksGrid() {
    const grid = this.container.querySelector('.workbooks-grid');
    if (!grid) return;

    const list = this.getFilteredWorkbooks();
    if (list.length === 0) {
      grid.innerHTML = `
        <div class="empty-boards-state">
          <div class="empty-icon">
            <svg viewBox="0 0 24 24" width="48" height="48" stroke="#94a3b8" fill="none" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round">
              <rect x="2" y="3" width="20" height="14" rx="2" ry="2"></rect>
              <line x1="8" y1="21" x2="16" y2="21"></line>
              <line x1="12" y1="17" x2="12" y2="21"></line>
            </svg>
          </div>
          <h3>No Whiteboards Found</h3>
          <p>Create a new whiteboard or select a template above to get started.</p>
          <button class="primary-create-btn" id="empty-create-btn">Create Whiteboard</button>
        </div>
      `;
      const btn = grid.querySelector('#empty-create-btn');
      if (btn) {
        btn.addEventListener('click', () => {
          this.store.createWorkbook('My Whiteboard', 'blank');
        });
      }
      return;
    }

    grid.innerHTML = list.map(wb => `
      <div class="workbook-card" data-id="${wb.id}">
        <!-- Thumbnail Preview Area -->
        <div class="card-thumbnail-area" style="background-color: ${wb.backgroundColor || '#ffffff'};">
          <div class="thumbnail-grid-overlay bg-${wb.backgroundStyle || 'dots'}"></div>
          <div class="card-preview-content">
            <span class="preview-badge">${(wb.strokes || []).length} strokes • ${(wb.objects || []).length} items</span>
          </div>
          <button class="card-quick-open-btn" title="Open Whiteboard">Open</button>
        </div>

        <!-- Details Footer -->
        <div class="card-info-row">
          <div class="card-text-col">
            <input type="text" class="card-title-input" value="${wb.title}" spellcheck="false" data-id="${wb.id}" />
            <span class="card-date-meta">Edited ${this.formatDate(wb.updatedAt)}</span>
          </div>

          <div class="card-actions-col">
            <button class="card-icon-btn save-as-wb-btn" data-id="${wb.id}" title="Save As... (Export to custom folder)">
              <svg viewBox="0 0 24 24" width="15" height="15" stroke="currentColor" fill="none" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                <path d="M19 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11l5 5v11a2 2 0 0 1-2 2z"/>
                <polyline points="17 21 17 13 7 13 7 21"/>
                <polyline points="7 3 7 8 15 8"/>
              </svg>
            </button>
            <button class="card-icon-btn duplicate-wb-btn" data-id="${wb.id}" title="Duplicate Whiteboard">
              <svg viewBox="0 0 24 24" width="15" height="15" stroke="currentColor" fill="none" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                <rect width="14" height="14" x="8" y="8" rx="2" ry="2"/>
                <path d="M4 16c-1.1 0-2-.9-2-2V4c0-1.1.9-2 2-2h10c1.1 0 2 .9 2 2"/>
              </svg>
            </button>
            <button class="card-icon-btn delete-wb-btn" data-id="${wb.id}" title="Delete Whiteboard">
              <svg viewBox="0 0 24 24" width="15" height="15" stroke="currentColor" fill="none" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                <path d="M3 6h18"/>
                <path d="M19 6v14c0 1-1 2-2 2H7c-1 0-2-1-2-2V6"/>
              </svg>
            </button>
          </div>
        </div>
      </div>
    `).join('');
  }

  showStorageSettingsModal() {
    const modal = document.createElement('div');
    modal.className = 'mk-modal-backdrop';
    modal.innerHTML = `
      <div class="mk-dialog-card">
        <div class="dialog-header">
          <div class="dialog-title-group">
            <h3>Local Storage & Privacy</h3>
            <span class="dialog-subtitle">Configure where workbooks are saved on your computer</span>
          </div>
          <button class="modal-close-btn">&times;</button>
        </div>

        <div class="settings-section">
          <label class="settings-label">Storage Folder Path</label>
          <div class="storage-path-box" style="display: flex; gap: 8px;">
            <input type="text" class="storage-path-input" id="storage-dir-input" value="${this.store.storageDirectory}" style="flex: 1;" />
            <button class="secondary-btn" id="browse-dir-btn" type="button">Browse...</button>
            <button class="secondary-btn" id="save-location-btn" type="button">Save</button>
          </div>
          <div style="display: flex; gap: 12px; margin-top: 8px; align-items: center;">
            <p class="settings-hint" style="margin: 0; flex: 1;">All workbooks are saved locally as .mkwhiteboard files on this PC with zero cloud tracking.</p>
            <button class="action-outline-btn" id="modal-explore-btn" type="button" style="padding: 4px 10px; font-size: 12px;">Open Folder</button>
          </div>
        </div>

        <div class="settings-section" style="margin-top: 18px;">
          <label class="settings-label">Backup & Restore</label>
          <div class="backup-actions-row">
            <button class="action-outline-btn" id="export-all-btn">
              <svg viewBox="0 0 24 24" width="16" height="16" stroke="currentColor" fill="none" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                <path d="M19 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11l5 5v11a2 2 0 0 1-2 2z"></path>
                <polyline points="17 21 17 13 7 13 7 21"></polyline>
                <polyline points="7 3 7 8 15 8"></polyline>
              </svg>
              <span>Backup All Workbooks (.json)</span>
            </button>
            <label class="action-outline-btn file-upload-label">
              <svg viewBox="0 0 24 24" width="16" height="16" stroke="currentColor" fill="none" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"></path>
                <polyline points="7 10 12 15 17 10"></polyline>
                <line x1="12" y1="15" x2="12" y2="3"></line>
              </svg>
              <span>Restore from Backup</span>
              <input type="file" id="restore-file-input" accept=".json" style="display:none;" />
            </label>
          </div>
        </div>

        <div class="dialog-footer">
          <button class="primary-btn close-modal-btn">Done</button>
        </div>
      </div>
    `;

    const input = modal.querySelector('#storage-dir-input');

    const browseBtn = modal.querySelector('#browse-dir-btn');
    browseBtn.addEventListener('click', async () => {
      if (window.desktopAPI && window.desktopAPI.selectDirectory) {
        const picked = await window.desktopAPI.selectDirectory();
        if (picked) {
          input.value = picked;
          this.store.setStorageDirectory(picked);
        }
      }
    });

    const exploreBtn = modal.querySelector('#modal-explore-btn');
    exploreBtn.addEventListener('click', () => {
      if (window.desktopAPI && window.desktopAPI.openDirectoryInExplorer) {
        window.desktopAPI.openDirectoryInExplorer(this.store.storageDirectory);
      }
    });

    modal.querySelector('#save-location-btn').addEventListener('click', () => {
      const val = input.value.trim();
      if (val) {
        this.store.setStorageDirectory(val);
        modal.querySelector('#save-location-btn').textContent = 'Saved!';
        setTimeout(() => modal.querySelector('#save-location-btn').textContent = 'Save', 1500);
      }
    });

    modal.querySelector('#export-all-btn').addEventListener('click', () => {
      const json = this.store.backupAllToJson();
      const blob = new Blob([json], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `MK_Whiteboard_Backup_${new Date().toISOString().slice(0, 10)}.json`;
      a.click();
      URL.revokeObjectURL(url);
    });

    modal.querySelector('#restore-file-input').addEventListener('change', (e) => {
      const file = e.target.files && e.target.files[0];
      if (file) {
        const reader = new FileReader();
        reader.onload = (loadEvt) => {
          if (this.store.restoreFromJson(loadEvt.target.result)) {
            alert('Workbooks restored successfully!');
            modal.remove();
          } else {
            alert('Invalid backup file.');
          }
        };
        reader.readAsText(file);
      }
    });

    const close = () => modal.remove();
    modal.querySelector('.modal-close-btn').addEventListener('click', close);
    modal.querySelector('.close-modal-btn').addEventListener('click', close);
    modal.addEventListener('click', (e) => {
      if (e.target === modal) close();
    });

    document.body.appendChild(modal);
  }

  render() {
    this.container.innerHTML = `
      <div class="mk-dashboard-view">
        <!-- Dashboard Top Navigation -->
        <header class="dashboard-header">
          <div class="dash-brand-group">
            <img src="./assets/mk-logo.svg" class="dash-app-logo" alt="MK Whiteboard Logo" />
            <div class="dash-title-group">
              <h1 class="dash-app-name">MK Whiteboard</h1>
              <span class="dash-app-tagline">Local-first Infinite Drawing Canvas</span>
            </div>
          </div>

          <!-- Middle: Search Box -->
          <div class="dash-search-container">
            <svg class="search-icon" viewBox="0 0 24 24" width="16" height="16" stroke="currentColor" fill="none" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
              <circle cx="11" cy="11" r="8"/>
              <line x1="21" y1="21" x2="16.65" y2="16.65"/>
            </svg>
            <input type="text" class="dash-search-input" placeholder="Search your whiteboards..." spellcheck="false" />
          </div>

          <!-- Right: Controls & New Board -->
          <div class="dash-right-controls">
            <!-- Sort dropdown -->
            <select class="dash-sort-select">
              <option value="modified">Last Modified</option>
              <option value="created">Date Created</option>
              <option value="title">Title (A-Z)</option>
            </select>

            <!-- Storage & Settings -->
            <button class="dash-icon-btn" id="dash-settings-btn" title="Storage Location & Backup">
              <svg viewBox="0 0 24 24" width="18" height="18" stroke="currentColor" fill="none" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                <path d="M12.22 2h-.44a2 2 0 0 0-2 2v.18a2 2 0 0 1-1 1.73l-.43.25a2 2 0 0 1-2 0l-.15-.08a2 2 0 0 0-2.73.73l-.22.38a2 2 0 0 0 .73 2.73l.15.1a2 2 0 0 1 1 1.72v.51a2 2 0 0 1-1 1.74l-.15.09a2 2 0 0 0-.73 2.73l.22.38a2 2 0 0 0 2.73.73l.15-.08a2 2 0 0 1 2 0l.43.25a2 2 0 0 1 1 1.73V20a2 2 0 0 0 2 2h.44a2 2 0 0 0 2-2v-.18a2 2 0 0 1 1-1.73l.43-.25a2 2 0 0 1 2 0l.15.08a2 2 0 0 0 2.73-.73l.22-.39a2 2 0 0 0-.73-2.73l-.15-.08a2 2 0 0 1-1-1.74v-.5a2 2 0 0 1 1-1.74l.15-.09a2 2 0 0 0 .73-2.73l-.22-.38a2 2 0 0 0-2.73-.73l-.15.08a2 2 0 0 1-2 0l-.43-.25a2 2 0 0 1-1-1.73V4a2 2 0 0 0-2-2z"/>
                <circle cx="12" cy="12" r="3"/>
              </svg>
            </button>

            <!-- Theme Toggle -->
            <button class="dash-icon-btn" id="dash-theme-btn" title="Toggle Dark/Light Mode">
              <svg viewBox="0 0 24 24" width="18" height="18" stroke="currentColor" fill="none" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                <circle cx="12" cy="12" r="4"/>
                <path d="M12 2v2M12 20v2M4.93 4.93l1.41 1.41M17.66 17.66l1.41 1.41M2 12h2M20 12h2M6.34 17.66l-1.41 1.41M19.07 4.93l-1.41 1.41"/>
              </svg>
            </button>

            <!-- Prominent New Whiteboard Button -->
            <button class="new-whiteboard-cta-btn" id="new-whiteboard-btn">
              <svg viewBox="0 0 24 24" width="18" height="18" stroke="#ffffff" fill="none" stroke-width="2.5" stroke-linecap="round">
                <line x1="12" y1="5" x2="12" y2="19"></line>
                <line x1="5" y1="12" x2="19" y2="12"></line>
              </svg>
              <span>New Whiteboard</span>
            </button>
          </div>
        </header>

        <!-- Main Dashboard Scrollable Body -->
        <main class="dashboard-body">
          <!-- Quick Templates Bar -->
          <section class="templates-section">
            <h2 class="section-heading">Quick Start Templates</h2>
            <div class="templates-grid">
              <button class="template-card" data-template="blank">
                <div class="template-icon-wrapper" style="background-color: #0284c7;">
                  <svg viewBox="0 0 24 24" width="22" height="22" stroke="#ffffff" fill="none" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                    <rect x="3" y="3" width="18" height="18" rx="2" ry="2"></rect>
                    <line x1="3" y1="9" x2="21" y2="9"></line>
                    <line x1="9" y1="21" x2="9" y2="9"></line>
                  </svg>
                </div>
                <div class="template-card-text">
                  <div class="tpl-name">Blank Canvas</div>
                  <div class="tpl-sub">Start with an empty infinite board</div>
                </div>
              </button>

              <button class="template-card" data-template="kanban">
                <div class="template-icon-wrapper" style="background-color: #059669;">
                  <svg viewBox="0 0 24 24" width="22" height="22" stroke="#ffffff" fill="none" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                    <rect x="3" y="3" width="5" height="18" rx="1"></rect>
                    <rect x="10" y="3" width="5" height="12" rx="1"></rect>
                    <rect x="17" y="3" width="5" height="15" rx="1"></rect>
                  </svg>
                </div>
                <div class="template-card-text">
                  <div class="tpl-name">Kanban Board</div>
                  <div class="tpl-sub">To Do, In Progress, Done cards</div>
                </div>
              </button>

              <button class="template-card" data-template="swot">
                <div class="template-icon-wrapper" style="background-color: #d97706;">
                  <svg viewBox="0 0 24 24" width="22" height="22" stroke="#ffffff" fill="none" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                    <rect x="3" y="3" width="8" height="8" rx="1"></rect>
                    <rect x="13" y="3" width="8" height="8" rx="1"></rect>
                    <rect x="3" y="13" width="8" height="8" rx="1"></rect>
                    <rect x="13" y="13" width="8" height="8" rx="1"></rect>
                  </svg>
                </div>
                <div class="template-card-text">
                  <div class="tpl-name">SWOT Analysis</div>
                  <div class="tpl-sub">4-quadrant strategic matrix</div>
                </div>
              </button>
            </div>
          </section>

          <!-- User Whiteboards Section -->
          <section class="boards-section">
            <div class="boards-header-row">
              <h2 class="section-heading">Your Whiteboards</h2>
              <span class="boards-count-label">${this.store.workbooks.length} workbooks stored locally</span>
            </div>

            <!-- Grid of Whiteboard Cards -->
            <div class="workbooks-grid"></div>
          </section>
        </main>

        <!-- Privacy & Offline Status Footer -->
        <footer class="dashboard-footer">
          <div class="privacy-badge">
            <svg viewBox="0 0 24 24" width="14" height="14" stroke="#10b981" fill="none" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
              <rect width="18" height="11" x="3" y="11" rx="2" ry="2"/>
              <path d="M7 11V7a5 5 0 0 1 10 0v4"/>
            </svg>
            <span>100% Offline & Private • Stored locally in <strong>${this.store.storageDirectory}</strong></span>
          </div>
          <span class="app-version-tag">MK Whiteboard v1.0.0 (Windows Native)</span>
        </footer>
      </div>
    `;

    // Event binding
    const searchInput = this.container.querySelector('.dash-search-input');
    searchInput.addEventListener('input', (e) => {
      this.searchQuery = e.target.value;
      this.renderWorkbooksGrid();
    });

    const sortSelect = this.container.querySelector('.dash-sort-select');
    sortSelect.addEventListener('change', (e) => {
      this.sortBy = e.target.value;
      this.renderWorkbooksGrid();
    });

    this.container.querySelector('#new-whiteboard-btn').addEventListener('click', () => {
      this.store.createWorkbook('New Whiteboard', 'blank');
    });

    this.container.querySelector('#dash-settings-btn').addEventListener('click', () => {
      this.showStorageSettingsModal();
    });

    this.container.querySelector('#dash-theme-btn').addEventListener('click', () => {
      this.store.toggleTheme();
    });

    // Template clicks
    this.container.querySelectorAll('.template-card').forEach(btn => {
      btn.addEventListener('click', () => {
        const tpl = btn.getAttribute('data-template');
        const title = tpl === 'kanban' ? 'Kanban Project Board' : tpl === 'swot' ? 'SWOT Strategy' : 'New Whiteboard';
        this.store.createWorkbook(title, tpl);
      });
    });

    // Delegated card actions
    this.container.querySelector('.workbooks-grid').addEventListener('click', (e) => {
      const card = e.target.closest('.workbook-card');
      if (!card) return;
      const id = card.getAttribute('data-id');

      // Click on open button or card thumbnail area
      if (e.target.closest('.card-thumbnail-area') || e.target.closest('.card-quick-open-btn')) {
        this.store.openWorkbook(id);
        return;
      }

      if (e.target.closest('.save-as-wb-btn')) {
        this.store.saveWorkbookAs(id).then(res => {
          if (res && res.success && res.filePath) {
            alert(`Whiteboard saved to:\n${res.filePath}`);
          }
        });
        return;
      }

      if (e.target.closest('.duplicate-wb-btn')) {
        this.store.duplicateWorkbook(id);
        return;
      }

      if (e.target.closest('.delete-wb-btn')) {
        if (confirm('Delete this whiteboard from your local storage?')) {
          this.store.deleteWorkbook(id);
        }
      }
    });

    this.container.querySelector('.workbooks-grid').addEventListener('change', (e) => {
      if (e.target.classList.contains('card-title-input')) {
        const id = e.target.getAttribute('data-id');
        const res = this.store.renameWorkbook(id, e.target.value);
        if (res && !res.success) {
          alert(res.error);
          const wb = this.store.workbooks.find(w => w.id === id);
          if (wb) e.target.value = wb.title;
        }
      }
    });

    this.renderWorkbooksGrid();
  }
}

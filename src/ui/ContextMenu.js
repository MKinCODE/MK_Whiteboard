/**
 * ContextMenu provides a floating action bar above selected whiteboard elements.
 * Features: Color switching, duplication, z-ordering, text formatting, and deletion.
 */
export class ContextMenu {
  constructor(container, store, transform, options = {}) {
    this.container = container;
    this.store = store;
    this.transform = transform;
    this.onDelete = options.onDelete || (() => {});
    this.onDuplicate = options.onDuplicate || (() => {});

    this.stickyColors = [
      '#fff7d1', '#e4f9e0', '#dcf4ff', '#f3e8fd', '#ffe6f0', '#ffedd5'
    ];

    this.shapeColors = [
      '#0f6cbd', '#107c41', '#d13438', '#ff8c00', '#881798', '#242424'
    ];

    this.render();
    this.store.subscribe((action) => {
      this.updatePosition();
    });
    this.transform.onChange(() => {
      this.updatePosition();
    });
  }

  getSelectedObject() {
    if (this.store.selectedIds.size !== 1) return null;
    const id = Array.from(this.store.selectedIds)[0];
    return this.store.objects.find(o => o.id === id);
  }

  updatePosition() {
    const obj = this.getSelectedObject();
    if (!obj) {
      this.menuEl.classList.remove('visible');
      return;
    }

    const screenPos = this.transform.worldToScreen(obj.x, obj.y);
    const objScreenW = (obj.width || 200) * this.transform.scale;

    const left = screenPos.x + (objScreenW / 2);
    const top = screenPos.y - 54;

    this.menuEl.style.transform = `translate3d(${left}px, ${top}px, 0) translate(-50%, 0)`;
    this.menuEl.classList.add('visible');

    // Update color swatches based on object type
    const colorRow = this.menuEl.querySelector('.context-color-row');
    if (obj.type === 'note') {
      colorRow.style.display = 'flex';
      colorRow.innerHTML = this.stickyColors.map(c => `
        <button class="ctx-color-dot ${obj.color === c ? 'active' : ''}" data-color="${c}" style="background-color: ${c};" title="${c}"></button>
      `).join('');
    } else if (obj.type === 'shape') {
      colorRow.style.display = 'flex';
      colorRow.innerHTML = this.shapeColors.map(c => `
        <button class="ctx-color-dot ${obj.fill === c ? 'active' : ''}" data-color="${c}" style="background-color: ${c};" title="${c}"></button>
      `).join('');
    } else {
      colorRow.style.display = 'none';
    }
  }

  render() {
    this.container.innerHTML = `
      <div class="ms-context-bar" role="toolbar" aria-label="Element Controls">
        <div class="context-color-row"></div>
        <div class="context-divider"></div>
        <button type="button" class="ctx-action-btn" data-action="duplicate" title="Duplicate (Ctrl+D)">
          <svg viewBox="0 0 24 24" width="16" height="16" stroke="currentColor" fill="none" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
            <rect width="14" height="14" x="8" y="8" rx="2" ry="2"/>
            <path d="M4 16c-1.1 0-2-.9-2-2V4c0-1.1.9-2 2-2h10c1.1 0 2 .9 2 2"/>
          </svg>
        </button>
        <button type="button" class="ctx-action-btn" data-action="bring-front" title="Bring to Front">
          <svg viewBox="0 0 24 24" width="16" height="16" stroke="currentColor" fill="none" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
            <polygon points="12 2 2 7 12 12 22 7 12 2"></polygon>
            <polyline points="2 17 12 22 22 17"></polyline>
          </svg>
        </button>
        <button type="button" class="ctx-action-btn delete-btn" data-action="delete" title="Delete (Del)">
          <svg viewBox="0 0 24 24" width="16" height="16" stroke="currentColor" fill="none" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
            <path d="M3 6h18"/>
            <path d="M19 6v14c0 1-1 2-2 2H7c-1 0-2-1-2-2V6"/>
            <path d="M8 6V4c0-1 1-2 2-2h4c1 0 2 1 2 2v2"/>
          </svg>
        </button>
      </div>
    `;

    this.menuEl = this.container.querySelector('.ms-context-bar');

    this.menuEl.addEventListener('click', (e) => {
      const obj = this.getSelectedObject();
      if (!obj) return;

      const colorBtn = e.target.closest('.ctx-color-dot');
      if (colorBtn) {
        const color = colorBtn.getAttribute('data-color');
        if (obj.type === 'note') {
          this.store.updateObject(obj.id, { color });
        } else if (obj.type === 'shape') {
          this.store.updateObject(obj.id, { fill: color });
        }
        return;
      }

      const actionBtn = e.target.closest('[data-action]');
      if (actionBtn) {
        const action = actionBtn.getAttribute('data-action');
        if (action === 'duplicate') this.onDuplicate();
        if (action === 'delete') this.onDelete();
        if (action === 'bring-front') this.store.bringToFront(obj.id);
      }
    });
  }
}

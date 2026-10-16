/**
 * Minimap and Zoom HUD component.
 * Displays real-time overview radar, viewport indicator box,
 * and zoom percentage controls with Fit-to-screen.
 */
export class Minimap {
  constructor(container, transform, store, options = {}) {
    this.container = container;
    this.transform = transform;
    this.store = store;
    this.onFitToScreen = options.onFitToScreen || (() => {});
    this.isExpanded = true;

    this.render();

    this.miniCanvas = this.container.querySelector('.minimap-canvas');
    this.miniCtx = this.miniCanvas ? this.miniCanvas.getContext('2d') : null;

    this.transform.onChange(() => {
      this.updateZoomDisplay();
      this.drawRadar();
    });

    this.store.subscribe(() => {
      this.drawRadar();
    });

    this.initInteractions();
  }

  updateZoomDisplay() {
    const label = this.container.querySelector('.zoom-pct-label');
    if (label) {
      label.textContent = `${Math.round(this.transform.scale * 100)}%`;
    }
  }

  drawRadar() {
    if (!this.miniCanvas || !this.miniCtx || !this.isExpanded) return;

    const w = this.miniCanvas.width;
    const h = this.miniCanvas.height;
    const ctx = this.miniCtx;

    ctx.clearRect(0, 0, w, h);

    // Dark/light background
    ctx.fillStyle = this.store.isDarkMode ? '#242424' : '#f9fafb';
    ctx.fillRect(0, 0, w, h);

    // Board bounding box
    const bounds = this.store.getBounds() || { x: -400, y: -300, width: 800, height: 600 };
    // Expand bounds to include current viewport
    const viewTopLeft = this.transform.screenToWorld(0, 0);
    const viewBottomRight = this.transform.screenToWorld(
      this.transform.canvas.width / this.transform.dpr,
      this.transform.canvas.height / this.transform.dpr
    );

    const worldMinX = Math.min(bounds.x, viewTopLeft.x) - 100;
    const worldMinY = Math.min(bounds.y, viewTopLeft.y) - 100;
    const worldMaxX = Math.max(bounds.x + bounds.width, viewBottomRight.x) + 100;
    const worldMaxY = Math.max(bounds.y + bounds.height, viewBottomRight.y) + 100;

    const worldW = worldMaxX - worldMinX;
    const worldH = worldMaxY - worldMinY;

    this.radarWorldBounds = { minX: worldMinX, minY: worldMinY, width: worldW, height: worldH };

    const scale = Math.min((w - 16) / worldW, (h - 16) / worldH);
    const offsetX = (w - worldW * scale) / 2;
    const offsetY = (h - worldH * scale) / 2;

    const worldToMini = (wx, wy) => ({
      x: offsetX + (wx - worldMinX) * scale,
      y: offsetY + (wy - worldMinY) * scale
    });

    // Draw objects thumbnail
    for (const obj of this.store.objects) {
      const p = worldToMini(obj.x, obj.y);
      const ow = (obj.width || 200) * scale;
      const oh = (obj.height || 200) * scale;

      ctx.fillStyle = obj.color || '#94a3b8';
      ctx.fillRect(p.x, p.y, Math.max(ow, 3), Math.max(oh, 3));
    }

    // Draw strokes thumbnail
    ctx.lineWidth = 1.5;
    for (const stroke of this.store.strokes) {
      if (!stroke.points || stroke.points.length < 2) continue;
      ctx.strokeStyle = stroke.type === 'galaxy' ? '#ec4899' : stroke.color;
      ctx.beginPath();
      const start = worldToMini(stroke.points[0][0], stroke.points[0][1]);
      ctx.moveTo(start.x, start.y);
      for (let i = 1; i < stroke.points.length; i += 2) {
        const pt = worldToMini(stroke.points[i][0], stroke.points[i][1]);
        ctx.lineTo(pt.x, pt.y);
      }
      ctx.stroke();
    }

    // Draw viewport rectangle
    const v1 = worldToMini(viewTopLeft.x, viewTopLeft.y);
    const v2 = worldToMini(viewBottomRight.x, viewBottomRight.y);
    const vw = v2.x - v1.x;
    const vh = v2.y - v1.y;

    ctx.strokeStyle = '#0f6cbd';
    ctx.lineWidth = 1.5;
    ctx.fillStyle = 'rgba(15, 108, 189, 0.12)';
    ctx.beginPath();
    ctx.rect(v1.x, v1.y, vw, vh);
    ctx.fill();
    ctx.stroke();
  }

  initInteractions() {
    // Zoom in / out buttons
    this.container.querySelector('[data-action="zoom-in"]').addEventListener('click', () => {
      this.transform.zoomTo(this.transform.scale * 1.25);
    });

    this.container.querySelector('[data-action="zoom-out"]').addEventListener('click', () => {
      this.transform.zoomTo(this.transform.scale * 0.8);
    });

    this.container.querySelector('.zoom-pct-label').addEventListener('click', () => {
      this.transform.zoomTo(1.0);
    });

    this.container.querySelector('[data-action="fit-screen"]').addEventListener('click', () => {
      this.onFitToScreen();
    });

    const toggleBtn = this.container.querySelector('.minimap-toggle-btn');
    const radarWrapper = this.container.querySelector('.minimap-radar-card');

    toggleBtn.addEventListener('click', () => {
      this.isExpanded = !this.isExpanded;
      radarWrapper.classList.toggle('collapsed', !this.isExpanded);
      toggleBtn.classList.toggle('active', this.isExpanded);
      if (this.isExpanded) this.drawRadar();
    });

    // Drag / click on radar to jump viewport
    let isDraggingRadar = false;
    const handleRadarPan = (e) => {
      if (!this.radarWorldBounds || !this.miniCanvas) return;
      const rect = this.miniCanvas.getBoundingClientRect();
      const clickX = e.clientX - rect.left;
      const clickY = e.clientY - rect.top;

      const w = this.miniCanvas.width;
      const h = this.miniCanvas.height;
      const b = this.radarWorldBounds;
      const scale = Math.min((w - 16) / b.width, (h - 16) / b.height);
      const offsetX = (w - b.width * scale) / 2;
      const offsetY = (h - b.height * scale) / 2;

      const worldX = b.minX + (clickX - offsetX) / scale;
      const worldY = b.minY + (clickY - offsetY) / scale;

      const viewW = (this.transform.canvas.width / this.transform.dpr);
      const viewH = (this.transform.canvas.height / this.transform.dpr);

      this.transform.setPan(
        viewW / 2 - worldX * this.transform.scale,
        viewH / 2 - worldY * this.transform.scale
      );
    };

    this.miniCanvas.addEventListener('pointerdown', (e) => {
      isDraggingRadar = true;
      this.miniCanvas.setPointerCapture(e.pointerId);
      handleRadarPan(e);
    });

    this.miniCanvas.addEventListener('pointermove', (e) => {
      if (isDraggingRadar) handleRadarPan(e);
    });

    this.miniCanvas.addEventListener('pointerup', () => {
      isDraggingRadar = false;
    });
  }

  render() {
    this.container.innerHTML = `
      <div class="ms-minimap-cluster">
        <!-- Collapsible Radar Overview -->
        <div class="minimap-radar-card">
          <div class="radar-header">
            <span>Canvas Radar</span>
          </div>
          <canvas class="minimap-canvas" width="180" height="110"></canvas>
        </div>

        <!-- Floating Zoom HUD Pill -->
        <div class="ms-zoom-hud-pill">
          <button type="button" class="minimap-toggle-btn active" title="Toggle Radar Minimap" aria-label="Toggle Radar">
            <svg viewBox="0 0 24 24" width="16" height="16" stroke="currentColor" fill="none" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
              <polygon points="3 6 9 3 15 6 21 3 21 18 15 21 9 18 3 21"></polygon>
              <line x1="9" y1="3" x2="9" y2="18"></line>
              <line x1="15" y1="6" x2="15" y2="21"></line>
            </svg>
          </button>
          
          <div class="hud-divider"></div>

          <button type="button" class="zoom-step-btn" data-action="zoom-out" title="Zoom Out (Ctrl+-)" aria-label="Zoom Out">
            <svg viewBox="0 0 24 24" width="14" height="14" stroke="currentColor" fill="none" stroke-width="2.5" stroke-linecap="round">
              <line x1="5" y1="12" x2="19" y2="12"></line>
            </svg>
          </button>

          <button type="button" class="zoom-pct-label" title="Click to reset to 100%">100%</button>

          <button type="button" class="zoom-step-btn" data-action="zoom-in" title="Zoom In (Ctrl++)" aria-label="Zoom In">
            <svg viewBox="0 0 24 24" width="14" height="14" stroke="currentColor" fill="none" stroke-width="2.5" stroke-linecap="round">
              <line x1="12" y1="5" x2="12" y2="19"></line>
              <line x1="5" y1="12" x2="19" y2="12"></line>
            </svg>
          </button>

          <div class="hud-divider"></div>

          <button type="button" class="fit-screen-btn" data-action="fit-screen" title="Fit to Screen (Ctrl+0)" aria-label="Fit to Screen">
            <svg viewBox="0 0 24 24" width="16" height="16" stroke="currentColor" fill="none" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
              <path d="M15 3h6v6M9 21H3v-6M21 3l-7 7M3 21l7-7"/>
            </svg>
          </button>
        </div>
      </div>
    `;
  }
}

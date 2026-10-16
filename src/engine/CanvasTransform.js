/**
 * CanvasTransform manages pan, zoom, and coordinate space conversions
 * between screen pixels and the infinite whiteboard world coordinates.
 */
export class CanvasTransform {
  constructor(canvas) {
    this.canvas = canvas;
    this.x = 0; // pan x in screen pixels
    this.y = 0; // pan y in screen pixels
    this.scale = 1.0; // zoom factor (1.0 = 100%)
    this.minScale = 0.1;
    this.maxScale = 8.0;
    this.dpr = window.devicePixelRatio || 1;
    this.listeners = new Set();
  }

  onChange(callback) {
    this.listeners.add(callback);
    return () => this.listeners.delete(callback);
  }

  notify() {
    for (const listener of this.listeners) {
      listener(this);
    }
  }

  screenToWorld(screenX, screenY) {
    return {
      x: (screenX - this.x) / this.scale,
      y: (screenY - this.y) / this.scale
    };
  }

  worldToScreen(worldX, worldY) {
    return {
      x: worldX * this.scale + this.x,
      y: worldY * this.scale + this.y
    };
  }

  panBy(dx, dy) {
    this.x += dx;
    this.y += dy;
    this.notify();
  }

  setPan(x, y) {
    this.x = x;
    this.y = y;
    this.notify();
  }

  zoomAt(screenX, screenY, zoomFactor) {
    const newScale = Math.min(Math.max(this.scale * zoomFactor, this.minScale), this.maxScale);
    if (newScale === this.scale) return;

    // Zoom anchored to the screen point
    this.x = screenX - (screenX - this.x) * (newScale / this.scale);
    this.y = screenY - (screenY - this.y) * (newScale / this.scale);
    this.scale = newScale;
    this.notify();
  }

  zoomTo(newScale, screenCenter = null) {
    const targetScale = Math.min(Math.max(newScale, this.minScale), this.maxScale);
    const center = screenCenter || {
      x: this.canvas.width / (2 * this.dpr),
      y: this.canvas.height / (2 * this.dpr)
    };
    this.zoomAt(center.x, center.y, targetScale / this.scale);
  }

  reset(centerX = 0, centerY = 0) {
    const width = this.canvas.width / this.dpr;
    const height = this.canvas.height / this.dpr;
    this.scale = 1.0;
    this.x = width / 2 - centerX;
    this.y = height / 2 - centerY;
    this.notify();
  }

  fitBounds(bounds, padding = 80) {
    if (!bounds || bounds.width <= 0 || bounds.height <= 0) {
      this.reset(0, 0);
      return;
    }
    const viewWidth = (this.canvas.width / this.dpr) - padding * 2;
    const viewHeight = (this.canvas.height / this.dpr) - padding * 2;
    if (viewWidth <= 0 || viewHeight <= 0) return;

    const scaleX = viewWidth / bounds.width;
    const scaleY = viewHeight / bounds.height;
    const targetScale = Math.min(Math.max(Math.min(scaleX, scaleY), this.minScale), 2.0);

    const centerX = bounds.x + bounds.width / 2;
    const centerY = bounds.y + bounds.height / 2;
    const viewCenterX = (this.canvas.width / this.dpr) / 2;
    const viewCenterY = (this.canvas.height / this.dpr) / 2;

    this.scale = targetScale;
    this.x = viewCenterX - centerX * this.scale;
    this.y = viewCenterY - centerY * this.scale;
    this.notify();
  }
}

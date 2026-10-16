import { getStroke } from 'perfect-freehand';

/**
 * InkingEngine handles high-precision, pressure-sensitive drawing,
 * smoothing, curve generation, highlighter rendering, and Galaxy pen shader.
 */
export class InkingEngine {
  constructor() {
    this.rainbowHue = 0;
  }

  /**
   * Convert an array of [x, y, pressure] points to a smooth SVG path data string
   */
  getSvgPathFromStroke(stroke) {
    if (!stroke || stroke.length < 2) return '';

    const d = [];
    const [p0, ...rest] = stroke;
    d.push(`M ${p0[0].toFixed(2)} ${p0[1].toFixed(2)}`);

    for (let i = 0; i < rest.length; i++) {
      const p1 = rest[i];
      const next = rest[i + 1] || p1;
      const midX = ((p1[0] + next[0]) / 2).toFixed(2);
      const midY = ((p1[1] + next[1]) / 2).toFixed(2);
      d.push(`Q ${p1[0].toFixed(2)} ${p1[1].toFixed(2)}, ${midX} ${midY}`);
    }

    d.push('Z');
    return d.join(' ');
  }

  /**
   * Compute smooth outline polygon points using perfect-freehand
   */
  computeStrokeOutline(points, options = {}) {
    if (!points || points.length === 0) return [];

    const defaultOptions = {
      size: options.size || 4,
      thinning: options.type === 'highlighter' ? 0.05 : 0.5,
      smoothing: 0.58,
      streamline: 0.52,
      easing: (t) => t,
      start: {
        taper: options.type === 'highlighter' ? 0 : 2,
        cap: true,
      },
      end: {
        taper: options.type === 'highlighter' ? 0 : 2,
        cap: true,
      },
      simulatePressure: points[0] && points[0][2] === undefined,
    };

    return getStroke(points, { ...defaultOptions, ...options });
  }

  /**
   * Render a stroke onto a 2D canvas context in world coordinates
   */
  renderStroke(ctx, stroke) {
    if (!stroke.points || stroke.points.length === 0) return;

    ctx.save();

    if (stroke.type === 'highlighter') {
      ctx.globalCompositeOperation = 'multiply';
      ctx.globalAlpha = stroke.opacity || 0.45;
      ctx.fillStyle = stroke.color;
      ctx.strokeStyle = stroke.color;
    } else {
      ctx.globalCompositeOperation = 'source-over';
      ctx.globalAlpha = stroke.opacity || 1.0;
    }

    if (stroke.type === 'galaxy') {
      this.renderGalaxyStroke(ctx, stroke);
    } else {
      const outline = this.computeStrokeOutline(stroke.points, {
        size: stroke.size,
        type: stroke.type,
      });

      if (outline.length > 1) {
        ctx.fillStyle = stroke.color;
        ctx.beginPath();
        ctx.moveTo(outline[0][0], outline[0][1]);
        for (let i = 1; i < outline.length; i++) {
          const p1 = outline[i];
          const next = outline[(i + 1) % outline.length];
          const midX = (p1[0] + next[0]) / 2;
          const midY = (p1[1] + next[1]) / 2;
          ctx.quadraticCurveTo(p1[0], p1[1], midX, midY);
        }
        ctx.closePath();
        ctx.fill();
      } else if (stroke.points.length === 1) {
        // Draw a neat dot for single tap
        const [x, y] = stroke.points[0];
        const radius = (stroke.size || 4) / 2;
        ctx.fillStyle = stroke.color;
        ctx.beginPath();
        ctx.arc(x, y, radius, 0, Math.PI * 2);
        ctx.fill();
      }
    }

    ctx.restore();
  }

  /**
   * Microsoft Whiteboard Galaxy Pen:
   * Multi-spectral cosmic gradient along stroke with subtle sparkle particles
   */
  renderGalaxyStroke(ctx, stroke) {
    const pts = stroke.points;
    if (pts.length < 2) {
      if (pts.length === 1) {
        ctx.fillStyle = '#b744b8';
        ctx.beginPath();
        ctx.arc(pts[0][0], pts[0][1], stroke.size / 2, 0, Math.PI * 2);
        ctx.fill();
      }
      return;
    }

    // Determine bounding box for gradient
    let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;
    for (const [x, y] of pts) {
      if (x < minX) minX = x;
      if (y < minY) minY = y;
      if (x > maxX) maxX = x;
      if (y > maxY) maxY = y;
    }

    const grad = ctx.createLinearGradient(minX, minY, maxX || minX + 1, maxY || minY + 1);
    grad.addColorStop(0.00, '#6366f1'); // Deep Indigo
    grad.addColorStop(0.20, '#a855f7'); // Violet
    grad.addColorStop(0.40, '#ec4899'); // Fuchsia
    grad.addColorStop(0.60, '#f43f5e'); // Rose
    grad.addColorStop(0.80, '#f59e0b'); // Amber
    grad.addColorStop(1.00, '#10b981'); // Emerald

    const outline = this.computeStrokeOutline(pts, {
      size: stroke.size || 6,
      type: 'galaxy'
    });

    if (outline.length > 1) {
      ctx.fillStyle = grad;
      ctx.shadowColor = 'rgba(168, 85, 247, 0.4)';
      ctx.shadowBlur = 4;
      ctx.beginPath();
      ctx.moveTo(outline[0][0], outline[0][1]);
      for (let i = 1; i < outline.length; i++) {
        const p1 = outline[i];
        const next = outline[(i + 1) % outline.length];
        const midX = (p1[0] + next[0]) / 2;
        const midY = (p1[1] + next[1]) / 2;
        ctx.quadraticCurveTo(p1[0], p1[1], midX, midY);
      }
      ctx.closePath();
      ctx.fill();

      // Render star sparkles along stroke length
      const step = Math.max(1, Math.floor(pts.length / 8));
      ctx.fillStyle = '#ffffff';
      ctx.shadowBlur = 6;
      ctx.shadowColor = '#ffffff';
      for (let i = 1; i < pts.length; i += step) {
        const [px, py] = pts[i];
        // Little cross star
        const starSize = (stroke.size || 6) * 0.35;
        ctx.beginPath();
        ctx.arc(px, py, starSize * 0.6, 0, Math.PI * 2);
        ctx.fill();
      }
    }
  }

  /**
   * Distance between a point and a line segment
   */
  pointToSegmentDistance(px, py, x1, y1, x2, y2) {
    const l2 = (x2 - x1) * (x2 - x1) + (y2 - y1) * (y2 - y1);
    if (l2 === 0) return Math.hypot(px - x1, py - y1);
    let t = ((px - x1) * (x2 - x1) + (py - y1) * (y2 - y1)) / l2;
    t = Math.max(0, Math.min(1, t));
    return Math.hypot(px - (x1 + t * (x2 - x1)), py - (y1 + t * (y2 - y1)));
  }

  /**
   * Test if an eraser point hits a stroke
   */
  strokeHitTest(stroke, testX, testY, eraserRadius = 12) {
    if (!stroke.points || stroke.points.length === 0) return false;
    const threshold = (stroke.size / 2) + eraserRadius;

    // Quick bounding box check
    if (stroke.bounds) {
      if (
        testX < stroke.bounds.x - threshold ||
        testX > stroke.bounds.x + stroke.bounds.width + threshold ||
        testY < stroke.bounds.y - threshold ||
        testY > stroke.bounds.y + stroke.bounds.height + threshold
      ) {
        return false;
      }
    }

    const pts = stroke.points;
    for (let i = 0; i < pts.length - 1; i++) {
      const dist = this.pointToSegmentDistance(
        testX, testY,
        pts[i][0], pts[i][1],
        pts[i + 1][0], pts[i + 1][1]
      );
      if (dist <= threshold) {
        return true;
      }
    }
    return false;
  }

  /**
   * Compute bounding box of points
   */
  computeBounds(points, size = 4) {
    if (!points || points.length === 0) {
      return { x: 0, y: 0, width: 0, height: 0 };
    }
    let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;
    for (const [x, y] of points) {
      if (x < minX) minX = x;
      if (y < minY) minY = y;
      if (x > maxX) maxX = x;
      if (y > maxY) maxY = y;
    }
    const pad = size / 2;
    return {
      x: minX - pad,
      y: minY - pad,
      width: (maxX - minX) + pad * 2,
      height: (maxY - minY) + pad * 2,
    };
  }
}

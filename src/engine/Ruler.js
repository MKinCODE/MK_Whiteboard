/**
 * Microsoft Whiteboard Virtual Ruler tool.
 * Features realistic cm/inch ticks, angle indicator dial,
 * drag-to-move, wheel-to-rotate, and edge-snapping for inking.
 */
export class Ruler {
  constructor(transform) {
    this.transform = transform;
    this.visible = false;
    this.x = 200; // world position
    this.y = 300;
    this.width = 600; // world width
    this.height = 90; // world height
    this.angle = 0; // degrees
    this.isDragging = false;
    this.isRotating = false;
    this.dragStart = { x: 0, y: 0 };
    this.initialAngle = 0;
    this.snapThreshold = 25; // world pixels
  }

  toggle() {
    this.visible = !this.visible;
  }

  show() {
    this.visible = true;
  }

  hide() {
    this.visible = false;
  }

  setAngle(deg) {
    this.angle = (deg % 360 + 360) % 360;
  }

  rotateBy(deltaDeg) {
    this.setAngle(this.angle + deltaDeg);
  }

  /**
   * Convert world point to ruler local space
   */
  worldToRulerLocal(wx, wy) {
    const rad = (-this.angle * Math.PI) / 180;
    const dx = wx - this.x;
    const dy = wy - this.y;
    return {
      x: dx * Math.cos(rad) - dy * Math.sin(rad),
      y: dx * Math.sin(rad) + dy * Math.cos(rad)
    };
  }

  /**
   * Convert ruler local point to world space
   */
  rulerLocalToWorld(lx, ly) {
    const rad = (this.angle * Math.PI) / 180;
    return {
      x: this.x + lx * Math.cos(rad) - ly * Math.sin(rad),
      y: this.y + lx * Math.sin(rad) + ly * Math.cos(rad)
    };
  }

  /**
   * Hit test for pointer events
   */
  hitTest(worldX, worldY) {
    if (!this.visible) return null;
    const local = this.worldToRulerLocal(worldX, worldY);
    const halfW = this.width / 2;
    const halfH = this.height / 2;

    if (local.x >= -halfW && local.x <= halfW && local.y >= -halfH && local.y <= halfH) {
      // Check if center dial (rotation handle)
      const distToCenter = Math.hypot(local.x, local.y);
      if (distToCenter <= 35) {
        return 'rotate';
      }
      return 'move';
    }
    return null;
  }

  /**
   * If point is close to top or bottom edge of the ruler, snap it to the line
   */
  snapPoint(worldX, worldY) {
    if (!this.visible) return null;
    const local = this.worldToRulerLocal(worldX, worldY);
    const halfW = this.width / 2;
    const halfH = this.height / 2;

    // Only snap along the length of ruler
    if (local.x < -halfW || local.x > halfW) return null;

    // Top edge (y = -halfH)
    if (Math.abs(local.y - (-halfH)) <= this.snapThreshold) {
      return this.rulerLocalToWorld(local.x, -halfH);
    }
    // Bottom edge (y = halfH)
    if (Math.abs(local.y - halfH) <= this.snapThreshold) {
      return this.rulerLocalToWorld(local.x, halfH);
    }
    return null;
  }

  /**
   * Render the ruler in canvas world coordinates
   */
  render(ctx) {
    if (!this.visible) return;

    ctx.save();
    ctx.translate(this.x, this.y);
    ctx.rotate((this.angle * Math.PI) / 180);

    const halfW = this.width / 2;
    const halfH = this.height / 2;

    // Ruler body with acrylic translucent effect
    ctx.shadowColor = 'rgba(0, 0, 0, 0.22)';
    ctx.shadowBlur = 24;
    ctx.shadowOffsetY = 8;

    // Rounded rectangle body
    const radius = 10;
    ctx.beginPath();
    ctx.roundRect(-halfW, -halfH, this.width, this.height, radius);
    ctx.fillStyle = 'rgba(255, 255, 255, 0.92)';
    ctx.fill();

    ctx.shadowColor = 'transparent';
    ctx.lineWidth = 1;
    ctx.strokeStyle = 'rgba(0, 0, 0, 0.15)';
    ctx.stroke();

    // Subtle edge highlight lines
    ctx.strokeStyle = 'rgba(0, 120, 212, 0.35)'; // Fluent accent hint
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    ctx.moveTo(-halfW + 4, -halfH + 0.5);
    ctx.lineTo(halfW - 4, -halfH + 0.5);
    ctx.moveTo(-halfW + 4, halfH - 0.5);
    ctx.lineTo(halfW - 4, halfH - 0.5);
    ctx.stroke();

    // Measurement ticks (top edge)
    ctx.strokeStyle = '#2b2b2b';
    ctx.fillStyle = '#444444';
    ctx.font = '10px "Segoe UI", -apple-system, sans-serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'top';

    const tickSpacing = 10; // mm
    const startX = -halfW + 20;
    const endX = halfW - 20;

    let cmCount = 0;
    for (let x = startX; x <= endX; x += tickSpacing) {
      const isCm = cmCount % 10 === 0;
      const isHalfCm = cmCount % 5 === 0;
      const tickLen = isCm ? 18 : isHalfCm ? 12 : 7;

      ctx.lineWidth = isCm ? 1.5 : 1;
      ctx.beginPath();
      ctx.moveTo(x, -halfH);
      ctx.lineTo(x, -halfH + tickLen);
      ctx.stroke();

      if (isCm && cmCount > 0 && x + 10 < endX) {
        ctx.fillText(`${cmCount / 10}`, x, -halfH + 20);
      }
      cmCount++;
    }

    // Measurement ticks (bottom edge)
    ctx.textBaseline = 'bottom';
    for (let x = startX; x <= endX; x += tickSpacing * 1.5) {
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.moveTo(x, halfH);
      ctx.lineTo(x, halfH - 8);
      ctx.stroke();
    }

    // Center circular angle protractor dial
    ctx.beginPath();
    ctx.arc(0, 0, 32, 0, Math.PI * 2);
    ctx.fillStyle = '#ffffff';
    ctx.shadowColor = 'rgba(0, 0, 0, 0.15)';
    ctx.shadowBlur = 8;
    ctx.fill();
    ctx.shadowColor = 'transparent';

    ctx.lineWidth = 2;
    ctx.strokeStyle = '#0f6cbd';
    ctx.stroke();

    // Angle degree text
    ctx.fillStyle = '#0f6cbd';
    ctx.font = 'bold 13px "Segoe UI", sans-serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(`${Math.round(this.angle)}°`, 0, 0);

    // Mini rotate hint ticks around center dial
    for (let i = 0; i < 360; i += 30) {
      const rad = (i * Math.PI) / 180;
      const r1 = 28;
      const r2 = 32;
      ctx.lineWidth = 1;
      ctx.strokeStyle = 'rgba(15, 108, 189, 0.4)';
      ctx.beginPath();
      ctx.moveTo(Math.cos(rad) * r1, Math.sin(rad) * r1);
      ctx.lineTo(Math.cos(rad) * r2, Math.sin(rad) * r2);
      ctx.stroke();
    }

    ctx.restore();
  }
}

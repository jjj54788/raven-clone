// ══════════════════════════════════════════════════════════
// Frostland Sprite Cache — Pre-rendered building & terrain
// sprites on offscreen canvases for high-quality rendering
// ══════════════════════════════════════════════════════════

import { CELL_SIZE_PX } from './constants';

const S = CELL_SIZE_PX; // 48

// ── Helpers ──

function oc(w: number, h: number): [HTMLCanvasElement, CanvasRenderingContext2D] {
  const c = document.createElement('canvas');
  c.width = w;
  c.height = h;
  return [c, c.getContext('2d')!];
}

function planks(ctx: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, baseColor: string, lineColor: string) {
  ctx.fillStyle = baseColor;
  ctx.fillRect(x, y, w, h);
  ctx.strokeStyle = lineColor;
  ctx.lineWidth = 0.6;
  const gap = 4;
  for (let py = y + gap; py < y + h; py += gap) {
    ctx.beginPath();
    ctx.moveTo(x, py);
    ctx.lineTo(x + w, py);
    ctx.stroke();
  }
}

function bricks(ctx: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, color: string, mortarColor: string) {
  ctx.fillStyle = color;
  ctx.fillRect(x, y, w, h);
  ctx.strokeStyle = mortarColor;
  ctx.lineWidth = 0.5;
  const bw = 7;
  const bh = 4;
  for (let row = 0; row * bh < h; row++) {
    const py = y + row * bh;
    const offset = row % 2 === 0 ? 0 : bw / 2;
    ctx.beginPath();
    ctx.moveTo(x, py);
    ctx.lineTo(x + w, py);
    ctx.stroke();
    for (let px = x + offset; px < x + w; px += bw) {
      ctx.beginPath();
      ctx.moveTo(px, py);
      ctx.lineTo(px, py + bh);
      ctx.stroke();
    }
  }
}

function snowCap(ctx: CanvasRenderingContext2D, points: number[][], alpha = 0.45) {
  ctx.fillStyle = `rgba(170, 190, 215, ${alpha})`;
  ctx.beginPath();
  ctx.moveTo(points[0][0], points[0][1]);
  for (let i = 1; i < points.length; i++) ctx.lineTo(points[i][0], points[i][1]);
  ctx.closePath();
  ctx.fill();
}

function windowGlow(ctx: CanvasRenderingContext2D, x: number, y: number, w: number, h: number) {
  // Outer warm glow
  const g = ctx.createRadialGradient(x + w / 2, y + h / 2, 0, x + w / 2, y + h / 2, w * 1.8);
  g.addColorStop(0, 'rgba(255, 200, 100, 0.2)');
  g.addColorStop(1, 'rgba(255, 200, 100, 0)');
  ctx.fillStyle = g;
  ctx.fillRect(x - w, y - h, w * 3, h * 3);
  // Window pane
  ctx.fillStyle = '#ffd080';
  ctx.fillRect(x, y, w, h);
  // Cross bars
  ctx.strokeStyle = 'rgba(80, 50, 20, 0.5)';
  ctx.lineWidth = 0.7;
  ctx.beginPath();
  ctx.moveTo(x + w / 2, y);
  ctx.lineTo(x + w / 2, y + h);
  ctx.moveTo(x, y + h / 2);
  ctx.lineTo(x + w, y + h / 2);
  ctx.stroke();
}

function rivets(ctx: CanvasRenderingContext2D, cx: number, cy: number, radius: number, count: number) {
  for (let i = 0; i < count; i++) {
    const a = (i / count) * Math.PI * 2;
    ctx.fillStyle = 'rgba(100, 110, 125, 0.5)';
    ctx.beginPath();
    ctx.arc(cx + Math.cos(a) * radius, cy + Math.sin(a) * radius, 1.2, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = 'rgba(200, 210, 220, 0.15)';
    ctx.beginPath();
    ctx.arc(cx + Math.cos(a) * radius - 0.3, cy + Math.sin(a) * radius - 0.3, 0.6, 0, Math.PI * 2);
    ctx.fill();
  }
}

// ══════════════════════════════════════════
//  BUILDING SPRITES
// ══════════════════════════════════════════

function renderGenerator(): HTMLCanvasElement {
  const sz = S * 2; // generator renders at 2x then drawn larger
  const [c, ctx] = oc(sz, sz);
  const cx = sz / 2;
  const cy = sz / 2;

  // Base shadow
  ctx.fillStyle = 'rgba(0, 0, 0, 0.15)';
  ctx.beginPath();
  ctx.ellipse(cx + 2, cy + 4, sz * 0.4, sz * 0.35, 0, 0, Math.PI * 2);
  ctx.fill();

  // Stone base — octagonal
  const baseGrad = ctx.createRadialGradient(cx, cy, 0, cx, cy, sz * 0.42);
  baseGrad.addColorStop(0, '#4a4540');
  baseGrad.addColorStop(0.7, '#3a3530');
  baseGrad.addColorStop(1, '#2a2520');
  ctx.fillStyle = baseGrad;
  ctx.beginPath();
  for (let i = 0; i < 8; i++) {
    const a = (i / 8) * Math.PI * 2 - Math.PI / 8;
    const r = sz * 0.38;
    const method = i === 0 ? 'moveTo' : 'lineTo';
    ctx[method](cx + Math.cos(a) * r, cy + Math.sin(a) * r);
  }
  ctx.closePath();
  ctx.fill();

  // Stone texture lines
  ctx.strokeStyle = 'rgba(60, 55, 48, 0.5)';
  ctx.lineWidth = 0.8;
  for (let i = 0; i < 8; i++) {
    const a = (i / 8) * Math.PI * 2 - Math.PI / 8;
    ctx.beginPath();
    ctx.moveTo(cx + Math.cos(a) * sz * 0.2, cy + Math.sin(a) * sz * 0.2);
    ctx.lineTo(cx + Math.cos(a) * sz * 0.38, cy + Math.sin(a) * sz * 0.38);
    ctx.stroke();
  }

  // Inner ring
  ctx.strokeStyle = '#5a5045';
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.arc(cx, cy, sz * 0.25, 0, Math.PI * 2);
  ctx.stroke();

  // Core glow gradient
  const coreGrad = ctx.createRadialGradient(cx, cy, 0, cx, cy, sz * 0.2);
  coreGrad.addColorStop(0, '#fff0d0');
  coreGrad.addColorStop(0.3, '#ffa840');
  coreGrad.addColorStop(0.7, '#e06010');
  coreGrad.addColorStop(1, '#802000');
  ctx.fillStyle = coreGrad;
  ctx.beginPath();
  ctx.arc(cx, cy, sz * 0.18, 0, Math.PI * 2);
  ctx.fill();

  // Pipes (4 cardinal directions)
  ctx.fillStyle = '#4a4540';
  for (let i = 0; i < 4; i++) {
    const a = (i / 4) * Math.PI * 2;
    const px = cx + Math.cos(a) * sz * 0.32;
    const py = cy + Math.sin(a) * sz * 0.32;
    ctx.beginPath();
    ctx.arc(px, py, 4, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = '#333028';
    ctx.beginPath();
    ctx.arc(px, py, 2.5, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = '#4a4540';
  }

  // Rivets
  rivets(ctx, cx, cy, sz * 0.35, 12);

  return c;
}

function renderTent(): HTMLCanvasElement {
  const [c, ctx] = oc(S, S);
  const p = 5;

  // Shadow
  ctx.fillStyle = 'rgba(0, 0, 0, 0.12)';
  ctx.beginPath();
  ctx.ellipse(S / 2 + 2, S - p + 2, S * 0.38, 4, 0, 0, Math.PI * 2);
  ctx.fill();

  // Canvas body
  const tentGrad = ctx.createLinearGradient(p, p, S - p, S - p);
  tentGrad.addColorStop(0, '#7d8590');
  tentGrad.addColorStop(0.5, '#6b7280');
  tentGrad.addColorStop(1, '#5a6370');
  ctx.fillStyle = tentGrad;
  ctx.beginPath();
  ctx.moveTo(S / 2, p);
  ctx.lineTo(S - p, S - p);
  ctx.lineTo(p, S - p);
  ctx.closePath();
  ctx.fill();

  // Canvas folds/creases
  ctx.strokeStyle = 'rgba(50, 55, 65, 0.2)';
  ctx.lineWidth = 0.5;
  ctx.beginPath();
  ctx.moveTo(S / 2, p + 3);
  ctx.lineTo(S * 0.32, S - p);
  ctx.moveTo(S / 2, p + 3);
  ctx.lineTo(S * 0.68, S - p);
  ctx.stroke();

  // Snow on top
  snowCap(ctx, [[S / 2, p - 1], [S * 0.62, S * 0.32], [S * 0.38, S * 0.32]]);

  // Door opening
  ctx.fillStyle = 'rgba(10, 15, 25, 0.4)';
  ctx.beginPath();
  ctx.arc(S / 2, S - p, 5, Math.PI, 0);
  ctx.fill();

  // Guy ropes
  ctx.strokeStyle = 'rgba(120, 100, 80, 0.4)';
  ctx.lineWidth = 0.6;
  ctx.setLineDash([2, 2]);
  ctx.beginPath();
  ctx.moveTo(S / 2, p);
  ctx.lineTo(p - 3, S - 2);
  ctx.moveTo(S / 2, p);
  ctx.lineTo(S - p + 3, S - 2);
  ctx.stroke();
  ctx.setLineDash([]);

  // Stake dots
  ctx.fillStyle = 'rgba(90, 80, 60, 0.5)';
  ctx.fillRect(p - 4, S - 4, 2, 3);
  ctx.fillRect(S - p + 1, S - 4, 2, 3);

  return c;
}

function renderHouse(): HTMLCanvasElement {
  const [c, ctx] = oc(S, S);
  const p = 4;

  // Shadow
  ctx.fillStyle = 'rgba(0, 0, 0, 0.12)';
  ctx.fillRect(p + 3, S * 0.44 + 3, S - p * 2, S * 0.58 - p);

  // Wall body — planks
  planks(ctx, p, S * 0.4, S - p * 2, S * 0.6 - p, '#7c5a3a', 'rgba(60, 40, 25, 0.25)');

  // Roof
  const roofGrad = ctx.createLinearGradient(S / 2, p, S / 2, S * 0.42);
  roofGrad.addColorStop(0, '#5a3e28');
  roofGrad.addColorStop(1, '#4a3020');
  ctx.fillStyle = roofGrad;
  ctx.beginPath();
  ctx.moveTo(S / 2, p);
  ctx.lineTo(S - p + 3, S * 0.42);
  ctx.lineTo(p - 3, S * 0.42);
  ctx.closePath();
  ctx.fill();

  // Roof shingle lines
  ctx.strokeStyle = 'rgba(40, 25, 15, 0.3)';
  ctx.lineWidth = 0.5;
  for (let i = 1; i < 4; i++) {
    const t = i / 4;
    const ly = p + (S * 0.42 - p) * t;
    const lx1 = S / 2 - (S / 2 - p + 3) * t;
    const lx2 = S / 2 + (S / 2 - p + 3) * t;
    ctx.beginPath();
    ctx.moveTo(lx1, ly);
    ctx.lineTo(lx2, ly);
    ctx.stroke();
  }

  // Snow on roof
  snowCap(ctx, [
    [S / 2, p - 1],
    [S * 0.72, S * 0.32],
    [S * 0.45, S * 0.3],
    [S * 0.28, S * 0.34],
  ], 0.5);

  // Windows with glow
  windowGlow(ctx, S * 0.2, S * 0.52, 7, 7);
  windowGlow(ctx, S * 0.6, S * 0.52, 7, 7);

  // Door
  ctx.fillStyle = '#3a2218';
  ctx.fillRect(S / 2 - 4, S - p - 13, 8, 13);
  ctx.fillStyle = '#2a1510';
  ctx.fillRect(S / 2 - 3, S - p - 12, 6, 11);
  // Doorknob
  ctx.fillStyle = '#c8956b';
  ctx.beginPath();
  ctx.arc(S / 2 + 1, S - p - 6, 1, 0, Math.PI * 2);
  ctx.fill();

  // Chimney
  bricks(ctx, S * 0.72, p + 2, 6, S * 0.22, '#5a3828', 'rgba(40, 25, 15, 0.3)');

  return c;
}

function renderCoalMine(): HTMLCanvasElement {
  const [c, ctx] = oc(S, S);
  const p = 4;

  // Shadow
  ctx.fillStyle = 'rgba(0, 0, 0, 0.15)';
  ctx.fillRect(p + 3, S * 0.32 + 3, S - p * 2, S * 0.68 - p);

  // Main structure
  ctx.fillStyle = '#2d2926';
  ctx.fillRect(p, S * 0.3, S - p * 2, S * 0.7 - p);

  // Headframe (A-frame)
  ctx.strokeStyle = '#5a5450';
  ctx.lineWidth = 3;
  ctx.beginPath();
  ctx.moveTo(S / 2, p - 1);
  ctx.lineTo(p + 3, S * 0.42);
  ctx.moveTo(S / 2, p - 1);
  ctx.lineTo(S - p - 3, S * 0.42);
  ctx.stroke();
  // Crossbar
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.moveTo(S * 0.28, S * 0.26);
  ctx.lineTo(S * 0.72, S * 0.26);
  ctx.stroke();
  // Pulley wheel
  ctx.strokeStyle = '#7a7570';
  ctx.lineWidth = 1.5;
  ctx.beginPath();
  ctx.arc(S / 2, p + 2, 3, 0, Math.PI * 2);
  ctx.stroke();

  // Mine entrance (dark arch)
  ctx.fillStyle = '#050404';
  ctx.beginPath();
  ctx.arc(S / 2, S * 0.58, 8, Math.PI, 0);
  ctx.fill();
  ctx.fillRect(S / 2 - 8, S * 0.58, 16, 12);

  // Entrance frame
  ctx.strokeStyle = '#5a5248';
  ctx.lineWidth = 1.5;
  ctx.beginPath();
  ctx.arc(S / 2, S * 0.58, 8.5, Math.PI, 0);
  ctx.stroke();

  // Lantern at entrance
  ctx.fillStyle = 'rgba(255, 200, 100, 0.4)';
  ctx.beginPath();
  ctx.arc(S / 2 + 9, S * 0.56, 3, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = '#ffc060';
  ctx.beginPath();
  ctx.arc(S / 2 + 9, S * 0.56, 1.2, 0, Math.PI * 2);
  ctx.fill();

  // Coal pile
  ctx.fillStyle = '#1a1714';
  ctx.beginPath();
  ctx.ellipse(S * 0.72, S * 0.84, 9, 5, 0, 0, Math.PI * 2);
  ctx.fill();
  // Shiny coal bits
  ctx.fillStyle = 'rgba(60, 55, 50, 0.5)';
  ctx.fillRect(S * 0.68, S * 0.82, 2, 2);
  ctx.fillRect(S * 0.74, S * 0.8, 2, 1);

  // Cart rail tracks
  ctx.strokeStyle = 'rgba(80, 72, 65, 0.35)';
  ctx.lineWidth = 1;
  ctx.beginPath();
  ctx.moveTo(S / 2 - 4, S * 0.68);
  ctx.lineTo(S / 2 - 4, S - p);
  ctx.moveTo(S / 2 + 4, S * 0.68);
  ctx.lineTo(S / 2 + 4, S - p);
  ctx.stroke();

  return c;
}

function renderWoodDepot(): HTMLCanvasElement {
  const [c, ctx] = oc(S, S);
  const p = 4;

  // Shadow
  ctx.fillStyle = 'rgba(0, 0, 0, 0.1)';
  ctx.fillRect(p + 2, S * 0.36 + 2, S - p * 2, S * 0.64 - p);

  // Open shed structure
  planks(ctx, p, S * 0.35, S - p * 2, S * 0.65 - p, '#5c3d1e', 'rgba(40, 25, 12, 0.2)');

  // Roof overhang
  ctx.fillStyle = '#4a3018';
  ctx.fillRect(p - 3, S * 0.29, S - p * 2 + 6, 6);
  // Support posts
  ctx.fillStyle = '#5a4030';
  ctx.fillRect(p + 1, S * 0.35, 3, S * 0.58);
  ctx.fillRect(S - p - 4, S * 0.35, 3, S * 0.58);

  // Stacked logs (detailed cross-sections)
  const logColors = ['#7a5535', '#6b4828', '#8a6040', '#5c3a20'];
  for (let row = 0; row < 3; row++) {
    for (let col = 0; col < 4 - row; col++) {
      const lx = S * 0.22 + col * 8 + row * 4;
      const ly = S * 0.78 - row * 8;
      const lc = logColors[(row + col) % 4];
      ctx.fillStyle = lc;
      ctx.beginPath();
      ctx.arc(lx, ly, 3.8, 0, Math.PI * 2);
      ctx.fill();
      // Growth rings
      ctx.strokeStyle = 'rgba(100, 70, 40, 0.35)';
      ctx.lineWidth = 0.4;
      ctx.beginPath();
      ctx.arc(lx, ly, 2.2, 0, Math.PI * 2);
      ctx.stroke();
      ctx.beginPath();
      ctx.arc(lx, ly, 1, 0, Math.PI * 2);
      ctx.stroke();
      // Core dot
      ctx.fillStyle = 'rgba(90, 60, 35, 0.5)';
      ctx.beginPath();
      ctx.arc(lx, ly, 0.6, 0, Math.PI * 2);
      ctx.fill();
    }
  }

  // Axe detail
  ctx.strokeStyle = '#8a7560';
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.moveTo(S * 0.78, S * 0.45);
  ctx.lineTo(S * 0.78, S * 0.82);
  ctx.stroke();
  // Axe head
  ctx.fillStyle = '#8a8a8a';
  ctx.beginPath();
  ctx.moveTo(S * 0.78, S * 0.45);
  ctx.lineTo(S * 0.84, S * 0.48);
  ctx.lineTo(S * 0.84, S * 0.52);
  ctx.lineTo(S * 0.78, S * 0.5);
  ctx.closePath();
  ctx.fill();

  return c;
}

function renderSteelMill(): HTMLCanvasElement {
  const [c, ctx] = oc(S, S);
  const p = 4;

  // Shadow
  ctx.fillStyle = 'rgba(0, 0, 0, 0.15)';
  ctx.fillRect(p + 3, S * 0.38 + 3, S - p * 2, S * 0.62 - p);

  // Main body — metal
  const bodyGrad = ctx.createLinearGradient(p, S * 0.36, S - p, S * 0.36);
  bodyGrad.addColorStop(0, '#4a4e57');
  bodyGrad.addColorStop(0.5, '#555960');
  bodyGrad.addColorStop(1, '#3a3e47');
  ctx.fillStyle = bodyGrad;
  ctx.fillRect(p, S * 0.36, S - p * 2, S * 0.64 - p);

  // Metal panel lines
  ctx.strokeStyle = 'rgba(70, 80, 90, 0.3)';
  ctx.lineWidth = 0.5;
  ctx.beginPath();
  ctx.moveTo(S * 0.5, S * 0.36);
  ctx.lineTo(S * 0.5, S - p);
  ctx.moveTo(p, S * 0.6);
  ctx.lineTo(S - p, S * 0.6);
  ctx.stroke();

  // Tall chimney
  bricks(ctx, S * 0.62, p, 9, S * 0.36, '#3a3e47', 'rgba(50, 55, 60, 0.3)');

  // Chimney cap
  ctx.fillStyle = '#2a2e35';
  ctx.fillRect(S * 0.59, p - 2, 15, 4);

  // Furnace opening — molten glow
  const furnaceGrad = ctx.createRadialGradient(S * 0.35, S * 0.85, 0, S * 0.35, S * 0.85, 12);
  furnaceGrad.addColorStop(0, 'rgba(255, 120, 20, 0.6)');
  furnaceGrad.addColorStop(0.5, 'rgba(255, 60, 0, 0.3)');
  furnaceGrad.addColorStop(1, 'rgba(255, 40, 0, 0)');
  ctx.fillStyle = furnaceGrad;
  ctx.fillRect(S * 0.18, S * 0.72, S * 0.35, S * 0.25);
  // Furnace door
  ctx.fillStyle = '#1a1614';
  ctx.beginPath();
  ctx.arc(S * 0.35, S * 0.82, 5, Math.PI, 0);
  ctx.fill();
  ctx.fillRect(S * 0.35 - 5, S * 0.82, 10, 6);
  ctx.fillStyle = '#ff6020';
  ctx.beginPath();
  ctx.arc(S * 0.35, S * 0.84, 3, 0, Math.PI * 2);
  ctx.fill();

  // Rivets on building
  for (let i = 0; i < 3; i++) {
    ctx.fillStyle = 'rgba(80, 85, 95, 0.4)';
    ctx.beginPath();
    ctx.arc(S * 0.2 + i * 10, S * 0.48, 1.3, 0, Math.PI * 2);
    ctx.fill();
  }

  return c;
}

function renderCookhouse(): HTMLCanvasElement {
  const [c, ctx] = oc(S, S);
  const p = 4;

  // Shadow
  ctx.fillStyle = 'rgba(0, 0, 0, 0.12)';
  ctx.fillRect(p + 2, S * 0.35 + 2, S - p * 2, S * 0.65 - p);

  // Body
  planks(ctx, p, S * 0.33, S - p * 2, S * 0.67 - p, '#8b3a2a', 'rgba(60, 25, 18, 0.2)');

  // Roof
  ctx.fillStyle = '#6a2a1e';
  ctx.fillRect(p - 2, S * 0.28, S - p * 2 + 4, 6);

  // Snow on roof edge
  snowCap(ctx, [[p - 2, S * 0.28], [S - p + 2, S * 0.28], [S - p + 2, S * 0.31], [p - 2, S * 0.31]], 0.35);

  // Interior warm glow through opening
  const warmGrad = ctx.createRadialGradient(S * 0.4, S * 0.62, 0, S * 0.4, S * 0.62, 18);
  warmGrad.addColorStop(0, 'rgba(255, 180, 80, 0.45)');
  warmGrad.addColorStop(1, 'rgba(255, 150, 50, 0)');
  ctx.fillStyle = warmGrad;
  ctx.fillRect(S * 0.2, S * 0.48, S * 0.5, S * 0.4);
  // Opening
  ctx.fillStyle = 'rgba(255, 180, 100, 0.35)';
  ctx.fillRect(S * 0.28, S * 0.52, 14, 12);

  // Cauldron
  ctx.fillStyle = '#2a1a10';
  ctx.beginPath();
  ctx.arc(S * 0.42, S * 0.72, 6, 0, Math.PI);
  ctx.fill();
  // Stew inside
  ctx.fillStyle = 'rgba(180, 100, 40, 0.4)';
  ctx.beginPath();
  ctx.arc(S * 0.42, S * 0.72, 4.5, Math.PI, 0);
  ctx.fill();

  // Hanging meat/sack
  ctx.fillStyle = '#6a4030';
  ctx.fillRect(S * 0.7, S * 0.42, 4, 10);
  ctx.fillStyle = '#8a6050';
  ctx.beginPath();
  ctx.arc(S * 0.72, S * 0.54, 3, 0, Math.PI * 2);
  ctx.fill();

  return c;
}

function renderHunterHut(): HTMLCanvasElement {
  const [c, ctx] = oc(S, S);
  const p = 5;

  // Shadow
  ctx.fillStyle = 'rgba(0, 0, 0, 0.1)';
  ctx.fillRect(p + 2, S * 0.42 + 2, S - p * 2, S * 0.58 - p);

  // Log cabin body (horizontal logs)
  planks(ctx, p, S * 0.4, S - p * 2, S * 0.6 - p, '#4a6b2a', 'rgba(30, 50, 18, 0.25)');

  // Roof
  const roofGrad = ctx.createLinearGradient(S / 2, p + 2, S / 2, S * 0.42);
  roofGrad.addColorStop(0, '#3a5820');
  roofGrad.addColorStop(1, '#2e4a18');
  ctx.fillStyle = roofGrad;
  ctx.beginPath();
  ctx.moveTo(S / 2, p + 2);
  ctx.lineTo(S - p + 2, S * 0.42);
  ctx.lineTo(p - 2, S * 0.42);
  ctx.closePath();
  ctx.fill();

  // Snow on roof
  snowCap(ctx, [[S / 2, p + 1], [S * 0.68, S * 0.34], [S * 0.32, S * 0.34]], 0.4);

  // Antlers
  ctx.strokeStyle = '#d4c0a0';
  ctx.lineWidth = 1.8;
  ctx.beginPath();
  ctx.moveTo(S / 2, S * 0.2);
  ctx.lineTo(S / 2 - 7, S * 0.1);
  ctx.moveTo(S / 2, S * 0.2);
  ctx.lineTo(S / 2 + 7, S * 0.1);
  ctx.moveTo(S / 2 - 5, S * 0.14);
  ctx.lineTo(S / 2 - 9, S * 0.08);
  ctx.moveTo(S / 2 + 5, S * 0.14);
  ctx.lineTo(S / 2 + 9, S * 0.08);
  ctx.stroke();

  // Window
  windowGlow(ctx, S * 0.55, S * 0.54, 6, 6);

  // Pelts hanging on wall
  ctx.fillStyle = 'rgba(140, 100, 60, 0.5)';
  ctx.beginPath();
  ctx.ellipse(p + 4, S * 0.56, 3, 6, 0, 0, Math.PI * 2);
  ctx.fill();

  // Door
  ctx.fillStyle = '#2a3a15';
  ctx.fillRect(S / 2 - 4, S - p - 11, 8, 11);

  return c;
}

function renderMedicalPost(): HTMLCanvasElement {
  const [c, ctx] = oc(S, S);
  const p = 4;

  // Shadow
  ctx.fillStyle = 'rgba(0, 0, 0, 0.1)';
  ctx.fillRect(p + 2, p + 8, S - p * 2, S - p * 2 - 6);

  // Clean building
  const wallGrad = ctx.createLinearGradient(p, p + 6, S - p, p + 6);
  wallGrad.addColorStop(0, '#c0c8d2');
  wallGrad.addColorStop(0.5, '#d0d8e0');
  wallGrad.addColorStop(1, '#b8c0ca');
  ctx.fillStyle = wallGrad;
  ctx.fillRect(p, p + 6, S - p * 2, S - p * 2 - 6);

  // Flat roof
  ctx.fillStyle = '#a0a8b2';
  ctx.fillRect(p - 1, p + 4, S - p * 2 + 2, 4);

  // Red cross
  ctx.fillStyle = '#dc3545';
  const cx = S / 2;
  const cy = S / 2 + 3;
  ctx.fillRect(cx - 3, cy - 9, 6, 18);
  ctx.fillRect(cx - 9, cy - 3, 18, 6);
  // Cross outline
  ctx.strokeStyle = 'rgba(150, 20, 30, 0.3)';
  ctx.lineWidth = 0.5;
  ctx.strokeRect(cx - 3, cy - 9, 6, 18);
  ctx.strokeRect(cx - 9, cy - 3, 18, 6);

  // Lamp at entrance
  ctx.fillStyle = 'rgba(255, 240, 200, 0.35)';
  ctx.beginPath();
  ctx.arc(S * 0.82, S * 0.5, 4, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = '#ffe8c0';
  ctx.beginPath();
  ctx.arc(S * 0.82, S * 0.5, 1.5, 0, Math.PI * 2);
  ctx.fill();

  // Door
  ctx.fillStyle = '#8a9aaa';
  ctx.fillRect(S * 0.38, S - p - 10, 12, 10);

  return c;
}

function renderWorkshop(): HTMLCanvasElement {
  const [c, ctx] = oc(S, S);
  const p = 4;

  // Shadow
  ctx.fillStyle = 'rgba(0, 0, 0, 0.12)';
  ctx.fillRect(p + 2, p + 8, S - p * 2, S - p * 2 - 6);

  // Blue-tinted industrial building
  ctx.fillStyle = '#2d5a8c';
  ctx.fillRect(p, p + 6, S - p * 2, S - p * 2 - 6);

  // Roof
  ctx.fillStyle = '#224a72';
  ctx.fillRect(p - 1, p + 4, S - p * 2 + 2, 4);

  // Metal wall panel detail
  ctx.strokeStyle = 'rgba(30, 60, 100, 0.25)';
  ctx.lineWidth = 0.5;
  ctx.beginPath();
  ctx.moveTo(S / 2, p + 8);
  ctx.lineTo(S / 2, S - p);
  ctx.moveTo(p, S * 0.6);
  ctx.lineTo(S - p, S * 0.6);
  ctx.stroke();

  // Large gear (pre-rendered, will be rotated by renderer)
  ctx.strokeStyle = 'rgba(180, 200, 230, 0.45)';
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.arc(S * 0.32, S * 0.52, 9, 0, Math.PI * 2);
  ctx.stroke();
  for (let i = 0; i < 8; i++) {
    const a = (i / 8) * Math.PI * 2;
    ctx.beginPath();
    ctx.moveTo(S * 0.32 + Math.cos(a) * 8, S * 0.52 + Math.sin(a) * 8);
    ctx.lineTo(S * 0.32 + Math.cos(a) * 12, S * 0.52 + Math.sin(a) * 12);
    ctx.stroke();
  }
  ctx.fillStyle = 'rgba(140, 170, 210, 0.3)';
  ctx.beginPath();
  ctx.arc(S * 0.32, S * 0.52, 3.5, 0, Math.PI * 2);
  ctx.fill();

  // Blueprint paper
  ctx.fillStyle = 'rgba(140, 180, 220, 0.2)';
  ctx.fillRect(S * 0.56, S * 0.38, 14, 18);
  ctx.strokeStyle = 'rgba(100, 160, 220, 0.25)';
  ctx.lineWidth = 0.4;
  for (let i = 0; i < 5; i++) {
    ctx.beginPath();
    ctx.moveTo(S * 0.58, S * 0.42 + i * 3.2);
    ctx.lineTo(S * 0.58 + 10, S * 0.42 + i * 3.2);
    ctx.stroke();
  }

  // Window
  windowGlow(ctx, S * 0.6, S * 0.68, 8, 7);

  return c;
}

function renderWall(): HTMLCanvasElement {
  const [c, ctx] = oc(S, S);

  // Shadow
  ctx.fillStyle = 'rgba(0, 0, 0, 0.1)';
  ctx.fillRect(4, S * 0.24 + 2, S - 6, S * 0.48);

  // Wall body — stone bricks
  bricks(ctx, 2, S * 0.3, S - 4, S * 0.4, '#4a5568', 'rgba(60, 70, 85, 0.35)');

  // Battlements
  for (let i = 0; i < 4; i++) {
    bricks(ctx, 3 + i * 12, S * 0.18, 8, S * 0.12, '#4a5568', 'rgba(60, 70, 85, 0.35)');
  }

  // Frost on top
  snowCap(ctx, [
    [2, S * 0.18], [S - 2, S * 0.18],
    [S - 2, S * 0.22], [2, S * 0.22],
  ], 0.3);

  // Torch sconce
  ctx.fillStyle = '#5a4a3a';
  ctx.fillRect(S / 2 - 1, S * 0.35, 3, 12);
  ctx.fillStyle = 'rgba(255, 180, 60, 0.4)';
  ctx.beginPath();
  ctx.arc(S / 2, S * 0.33, 3, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = '#ffa020';
  ctx.beginPath();
  ctx.arc(S / 2, S * 0.33, 1.3, 0, Math.PI * 2);
  ctx.fill();

  return c;
}

// ══════════════════════════════════════════
//  TERRAIN SPRITES
// ══════════════════════════════════════════

function renderSnowTile(variant: number): HTMLCanvasElement {
  const [c, ctx] = oc(S, S);

  // Base color
  const bases = [[74, 85, 104], [65, 78, 95], [70, 82, 100], [60, 72, 90]];
  const base = bases[variant % 4];
  ctx.fillStyle = `rgb(${base[0]}, ${base[1]}, ${base[2]})`;
  ctx.fillRect(0, 0, S, S);

  // Snow drift
  if (variant % 3 === 0) {
    ctx.fillStyle = 'rgba(100, 120, 145, 0.15)';
    ctx.beginPath();
    ctx.ellipse(S * 0.6, S * 0.65, S * 0.3, 3, 0.2, 0, Math.PI * 2);
    ctx.fill();
  }

  // Small rock
  if (variant % 4 === 1) {
    ctx.fillStyle = 'rgba(50, 60, 75, 0.3)';
    ctx.beginPath();
    ctx.ellipse(S * 0.3, S * 0.8, 3, 2, 0, 0, Math.PI * 2);
    ctx.fill();
  }

  // Subtle footprint hints
  if (variant % 5 === 2) {
    ctx.fillStyle = 'rgba(55, 65, 80, 0.12)';
    ctx.fillRect(S * 0.4, S * 0.3, 2, 3);
    ctx.fillRect(S * 0.45, S * 0.4, 2, 3);
    ctx.fillRect(S * 0.41, S * 0.5, 2, 3);
  }

  return c;
}

function renderIceTile(variant: number): HTMLCanvasElement {
  const [c, ctx] = oc(S, S);

  ctx.fillStyle = variant === 0 ? '#3a6d8c' : '#356585';
  ctx.fillRect(0, 0, S, S);

  // Cracks
  ctx.strokeStyle = 'rgba(45, 84, 112, 0.6)';
  ctx.lineWidth = 0.8;
  if (variant === 0) {
    ctx.beginPath();
    ctx.moveTo(S * 0.15, S * 0.3);
    ctx.lineTo(S * 0.5, S * 0.5);
    ctx.lineTo(S * 0.85, S * 0.35);
    ctx.moveTo(S * 0.5, S * 0.5);
    ctx.lineTo(S * 0.35, S * 0.85);
    ctx.stroke();
  } else {
    ctx.beginPath();
    ctx.moveTo(S * 0.2, S * 0.7);
    ctx.lineTo(S * 0.6, S * 0.45);
    ctx.lineTo(S * 0.8, S * 0.6);
    ctx.stroke();
  }

  // Frost highlight
  ctx.fillStyle = 'rgba(180, 220, 255, 0.08)';
  ctx.beginPath();
  ctx.ellipse(S * 0.4, S * 0.3, S * 0.25, S * 0.15, -0.2, 0, Math.PI * 2);
  ctx.fill();

  return c;
}

function renderRockTile(variant: number): HTMLCanvasElement {
  const [c, ctx] = oc(S, S);

  ctx.fillStyle = variant === 0 ? '#2d3748' : '#333d50';
  ctx.fillRect(0, 0, S, S);

  // Rock shapes
  ctx.fillStyle = 'rgba(25, 30, 42, 0.5)';
  ctx.beginPath();
  if (variant === 0) {
    ctx.moveTo(6, 10);
    ctx.lineTo(22, 6);
    ctx.lineTo(30, 18);
    ctx.lineTo(15, 26);
  } else {
    ctx.moveTo(10, 14);
    ctx.lineTo(28, 8);
    ctx.lineTo(35, 22);
    ctx.lineTo(18, 28);
  }
  ctx.closePath();
  ctx.fill();

  ctx.fillStyle = 'rgba(55, 65, 82, 0.4)';
  ctx.beginPath();
  ctx.moveTo(24, 28);
  ctx.lineTo(40, 22);
  ctx.lineTo(44, 38);
  ctx.lineTo(26, 42);
  ctx.closePath();
  ctx.fill();

  return c;
}

function renderRuinsTile(variant: number): HTMLCanvasElement {
  const [c, ctx] = oc(S, S);

  ctx.fillStyle = variant === 0 ? '#4a3f35' : '#453a30';
  ctx.fillRect(0, 0, S, S);

  // Broken wall fragments
  ctx.fillStyle = 'rgba(55, 45, 38, 0.6)';
  ctx.fillRect(5, 6, 14, 22);
  ctx.fillRect(24, 14, 10, 16);

  // Rubble
  ctx.fillStyle = 'rgba(70, 58, 48, 0.4)';
  ctx.fillRect(20, 36, 5, 3);
  ctx.fillRect(34, 32, 4, 4);
  ctx.fillRect(12, 38, 6, 3);
  ctx.fillRect(38, 40, 3, 3);

  // Crumbled bricks
  ctx.fillStyle = 'rgba(85, 70, 55, 0.3)';
  ctx.fillRect(6, 30, 4, 3);
  ctx.fillRect(28, 34, 3, 3);

  return c;
}

// ══════════════════════════════════════════
//  SPRITE CACHE
// ══════════════════════════════════════════

export class SpriteCache {
  private cache = new Map<string, HTMLCanvasElement>();
  private ready = false;

  init(): void {
    // Buildings
    this.cache.set('generator', renderGenerator());
    this.cache.set('tent', renderTent());
    this.cache.set('house', renderHouse());
    this.cache.set('coal_mine', renderCoalMine());
    this.cache.set('wood_depot', renderWoodDepot());
    this.cache.set('steel_mill', renderSteelMill());
    this.cache.set('cookhouse', renderCookhouse());
    this.cache.set('hunter_hut', renderHunterHut());
    this.cache.set('medical_post', renderMedicalPost());
    this.cache.set('workshop', renderWorkshop());
    this.cache.set('wall', renderWall());

    // Terrain variants
    for (let i = 0; i < 4; i++) this.cache.set(`snow_${i}`, renderSnowTile(i));
    for (let i = 0; i < 2; i++) this.cache.set(`frozen_lake_${i}`, renderIceTile(i));
    for (let i = 0; i < 2; i++) this.cache.set(`rock_${i}`, renderRockTile(i));
    for (let i = 0; i < 2; i++) this.cache.set(`ruins_${i}`, renderRuinsTile(i));

    this.ready = true;
  }

  get(key: string): HTMLCanvasElement | undefined {
    return this.cache.get(key);
  }

  isReady(): boolean {
    return this.ready;
  }

  /** Get terrain sprite for a grid cell */
  getTerrain(terrain: string, x: number, y: number): HTMLCanvasElement | undefined {
    const seed = (x * 7 + y * 13) % 17;
    switch (terrain) {
      case 'snow': return this.cache.get(`snow_${seed % 4}`);
      case 'frozen_lake': return this.cache.get(`frozen_lake_${seed % 2}`);
      case 'rock': return this.cache.get(`rock_${seed % 2}`);
      case 'ruins': return this.cache.get(`ruins_${seed % 2}`);
      default: return this.cache.get('snow_0');
    }
  }
}

import type { GameState, PlacedBuilding } from './types';
import { GRID_SIZE, CELL_SIZE_PX, COLORS, getBuildingDef } from './constants';
import { getHeatMap } from './temperature';
import { SpriteCache } from './sprites';

// ── Particles ──

interface SnowParticle {
  x: number;
  y: number;
  r: number;
  speed: number;
  drift: number;
  opacity: number;
  layer: number; // 0=far 1=mid 2=near
}

interface SmokeParticle {
  x: number;
  y: number;
  r: number;
  life: number;
  maxLife: number;
  vx: number;
  vy: number;
  opacity: number;
}

interface EmberParticle {
  x: number;
  y: number;
  r: number;
  life: number;
  vy: number;
  vx: number;
  opacity: number;
}

export interface Viewport {
  offsetX: number;
  offsetY: number;
  scale: number;
}

// ── Main Renderer ──

export class GameRenderer {
  private ctx: CanvasRenderingContext2D;
  private canvas: HTMLCanvasElement;
  private snow: SnowParticle[] = [];
  private smoke: SmokeParticle[] = [];
  private embers: EmberParticle[] = [];
  private animFrameId: number | null = null;
  private dpr = 1;
  private w = 0;
  private h = 0;
  private t = 0;
  // Pre-rendered terrain noise pattern
  private noiseCanvas: HTMLCanvasElement | null = null;
  // Pre-rendered sprite cache
  private sprites: SpriteCache;
  // Building placement animation tracking (buildingId → frame when placed)
  private buildAnims = new Map<string, number>();

  constructor(canvas: HTMLCanvasElement) {
    this.canvas = canvas;
    this.ctx = canvas.getContext('2d', { alpha: false })!;
    this.dpr = window.devicePixelRatio || 1;
    this.sprites = new SpriteCache();
    this.sprites.init();
    this.resize();
    this.initSnow(200);
    this.generateNoiseTexture();
  }

  resize(): void {
    const rect = this.canvas.getBoundingClientRect();
    this.w = rect.width;
    this.h = rect.height;
    this.canvas.width = rect.width * this.dpr;
    this.canvas.height = rect.height * this.dpr;
    this.ctx.setTransform(this.dpr, 0, 0, this.dpr, 0, 0);
  }

  // ── Pre-rendered noise texture for terrain ──
  private generateNoiseTexture(): void {
    const size = GRID_SIZE * CELL_SIZE_PX;
    const nc = document.createElement('canvas');
    nc.width = size;
    nc.height = size;
    const nctx = nc.getContext('2d')!;
    const imgData = nctx.createImageData(size, size);
    for (let i = 0; i < imgData.data.length; i += 4) {
      const v = Math.random() * 20;
      imgData.data[i] = v;
      imgData.data[i + 1] = v;
      imgData.data[i + 2] = v;
      imgData.data[i + 3] = 12; // very subtle
    }
    nctx.putImageData(imgData, 0, 0);
    this.noiseCanvas = nc;
  }

  // ══════════════════════════════════════════
  //  MAIN RENDER
  // ══════════════════════════════════════════

  render(
    state: GameState,
    viewport: Viewport,
    hoverCell: { x: number; y: number } | null = null,
  ): void {
    this.t++;
    const { ctx } = this;
    ctx.save();

    // Periodic cleanup of stale build animations
    if (this.t % 120 === 0) this.cleanBuildAnims(state);

    // ── Background: dark gradient sky ──
    this.drawBackground(state);

    // ── Viewport transform ──
    ctx.translate(viewport.offsetX, viewport.offsetY);
    ctx.scale(viewport.scale, viewport.scale);

    const gridPx = GRID_SIZE * CELL_SIZE_PX;

    // ── Outer frost border ──
    this.drawFrostBorder(gridPx);

    // ── Terrain ──
    this.drawTerrain(state);

    // ── Noise texture overlay ──
    if (this.noiseCanvas) {
      ctx.drawImage(this.noiseCanvas, 0, 0);
    }

    // ── Grid lines (very subtle) ──
    this.drawGridLines();

    // ── Heat zones ──
    this.drawHeatOverlay(state);

    // ── Building shadows ──
    for (const b of state.buildings) this.drawBuildingShadow(b);

    // ── Buildings ──
    for (const b of state.buildings) this.drawBuilding(b, state);

    // ── Smoke particles (grid space) ──
    this.drawSmokeParticles();

    // ── Ember particles (grid space, from generator) ──
    this.drawEmberParticles();

    // ── Hover / selection ──
    if (hoverCell) this.drawCellHighlight(hoverCell.x, hoverCell.y, state);
    if (state.selectedCell) this.drawSelectionRing(state.selectedCell.x, state.selectedCell.y);

    // ── Tooltip ──
    if (hoverCell) this.drawTooltip(hoverCell.x, hoverCell.y, state);

    // ── Cold vignette on grid ──
    this.drawColdVignette(state, gridPx);

    ctx.restore();

    // ── Snow (screen space) ──
    if (state.settings.snowParticles) this.drawSnow(state);

    // ── Screen-space frost border ──
    this.drawScreenVignette(state);
  }

  // ══════════════════════════════════════════
  //  BACKGROUND
  // ══════════════════════════════════════════

  private drawBackground(state: GameState): void {
    const { ctx, w, h } = this;
    const coldness = Math.min(1, Math.max(0, (-state.globalTemperature - 20) / 40));

    // Vertical gradient: deep navy → slightly lighter at horizon
    const grad = ctx.createLinearGradient(0, 0, 0, h);
    const r1 = Math.round(10 - coldness * 5);
    const g1 = Math.round(22 - coldness * 8);
    const b1 = Math.round(40 + coldness * 15);
    grad.addColorStop(0, `rgb(${r1}, ${g1}, ${b1})`);
    grad.addColorStop(0.5, `rgb(${r1 + 8}, ${g1 + 10}, ${b1 + 8})`);
    grad.addColorStop(1, `rgb(${r1 + 3}, ${g1 + 5}, ${b1 + 3})`);
    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, w, h);
  }

  // ══════════════════════════════════════════
  //  FROST BORDER AROUND GRID
  // ══════════════════════════════════════════

  private drawFrostBorder(size: number): void {
    const { ctx } = this;
    const bw = 3;
    // Outer glow
    ctx.shadowColor = 'rgba(100, 150, 220, 0.3)';
    ctx.shadowBlur = 12;
    ctx.strokeStyle = 'rgba(100, 150, 220, 0.15)';
    ctx.lineWidth = bw;
    ctx.strokeRect(-bw, -bw, size + bw * 2, size + bw * 2);
    ctx.shadowBlur = 0;
  }

  // ══════════════════════════════════════════
  //  TERRAIN
  // ══════════════════════════════════════════

  private drawTerrain(state: GameState): void {
    const { ctx } = this;
    const S = CELL_SIZE_PX;

    for (let y = 0; y < GRID_SIZE; y++) {
      for (let x = 0; x < GRID_SIZE; x++) {
        const cell = state.grid[y][x];
        const px = x * S;
        const py = y * S;

        // Use pre-rendered sprite
        const sprite = this.sprites.getTerrain(cell.terrain, x, y);
        if (sprite) {
          ctx.drawImage(sprite, px, py);
        }

        // Animated overlays that can't be pre-rendered
        if (cell.terrain === 'frozen_lake') {
          const shimmer = Math.sin(this.t * 0.015 + x * 3 + y * 5) * 0.06 + 0.04;
          ctx.fillStyle = `rgba(180, 220, 255, ${shimmer})`;
          ctx.fillRect(px, py, S, S);
        }
      }
    }
  }

  // ══════════════════════════════════════════
  //  GRID LINES
  // ══════════════════════════════════════════

  private drawGridLines(): void {
    const { ctx } = this;
    const total = GRID_SIZE * CELL_SIZE_PX;
    ctx.strokeStyle = COLORS.gridLine;
    ctx.lineWidth = 0.5;

    for (let i = 0; i <= GRID_SIZE; i++) {
      const pos = i * CELL_SIZE_PX;
      ctx.beginPath();
      ctx.moveTo(pos, 0);
      ctx.lineTo(pos, total);
      ctx.stroke();
      ctx.beginPath();
      ctx.moveTo(0, pos);
      ctx.lineTo(total, pos);
      ctx.stroke();
    }
  }

  // ══════════════════════════════════════════
  //  HEAT OVERLAY
  // ══════════════════════════════════════════

  private drawHeatOverlay(state: GameState): void {
    const { ctx } = this;
    const heatMap = getHeatMap(state);
    const S = CELL_SIZE_PX;

    for (let y = 0; y < GRID_SIZE; y++) {
      for (let x = 0; x < GRID_SIZE; x++) {
        const heat = heatMap[y][x];
        if (heat <= 0) continue;

        const cx = x * S + S / 2;
        const cy = y * S + S / 2;
        const alpha = Math.min(0.35, heat / 25);

        // Warm glow — layered radial gradient
        const grad = ctx.createRadialGradient(cx, cy, 0, cx, cy, S * 0.8);
        grad.addColorStop(0, `rgba(255, 140, 40, ${alpha * 0.8})`);
        grad.addColorStop(0.5, `rgba(255, 100, 20, ${alpha * 0.4})`);
        grad.addColorStop(1, `rgba(255, 80, 10, 0)`);
        ctx.fillStyle = grad;
        ctx.fillRect(x * S - S * 0.3, y * S - S * 0.3, S * 1.6, S * 1.6);
      }
    }
  }

  // ══════════════════════════════════════════
  //  COLD VIGNETTE (on grid)
  // ══════════════════════════════════════════

  private drawColdVignette(state: GameState, gridPx: number): void {
    const { ctx } = this;
    const coldness = Math.min(1, Math.max(0, (-state.globalTemperature - 25) / 35));
    if (coldness <= 0) return;

    const grad = ctx.createRadialGradient(
      gridPx / 2, gridPx / 2, gridPx * 0.25,
      gridPx / 2, gridPx / 2, gridPx * 0.72,
    );
    grad.addColorStop(0, 'rgba(60, 100, 180, 0)');
    grad.addColorStop(1, `rgba(30, 60, 120, ${coldness * 0.2})`);
    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, gridPx, gridPx);
  }

  // Screen-space frost/vignette
  private drawScreenVignette(state: GameState): void {
    const { ctx, w, h } = this;
    const coldness = Math.min(1, Math.max(0, (-state.globalTemperature - 20) / 40));
    const alpha = 0.15 + coldness * 0.2;

    const grad = ctx.createRadialGradient(w / 2, h / 2, Math.min(w, h) * 0.3, w / 2, h / 2, Math.max(w, h) * 0.7);
    grad.addColorStop(0, 'rgba(0, 0, 0, 0)');
    grad.addColorStop(1, `rgba(5, 15, 30, ${alpha})`);
    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, w, h);
  }

  // ══════════════════════════════════════════
  //  BUILDING SHADOWS
  // ══════════════════════════════════════════

  private drawBuildingShadow(b: PlacedBuilding): void {
    const { ctx } = this;
    const S = CELL_SIZE_PX;
    const px = b.gridX * S;
    const py = b.gridY * S;

    // Shadow offset (light from top-left)
    const shadowOff = 3;
    const pad = b.type === 'generator' ? 2 : 5;

    ctx.fillStyle = 'rgba(0, 5, 15, 0.25)';
    if (b.type === 'generator') {
      ctx.beginPath();
      ctx.arc(px + S / 2 + shadowOff, py + S / 2 + shadowOff, S * 0.38, 0, Math.PI * 2);
      ctx.fill();
    } else {
      ctx.fillRect(px + pad + shadowOff, py + pad + shadowOff + 4, S - pad * 2, S - pad * 2 - 4);
    }
  }

  // ══════════════════════════════════════════
  //  BUILDINGS
  // ══════════════════════════════════════════

  private drawBuilding(b: PlacedBuilding, state: GameState): void {
    const { ctx } = this;
    const S = CELL_SIZE_PX;
    const px = b.gridX * S;
    const py = b.gridY * S;

    // ── Placement scale-in animation ──
    let animProgress = 1;
    if (!this.buildAnims.has(b.id)) {
      this.buildAnims.set(b.id, this.t);
    }
    const placedFrame = this.buildAnims.get(b.id)!;
    const elapsed = this.t - placedFrame;
    if (elapsed < 20) {
      // Ease-out bounce: 0→1 over 20 frames
      const t01 = elapsed / 20;
      animProgress = 1 - Math.pow(1 - t01, 3) * (1 + 2.5 * (1 - t01));
      animProgress = Math.max(0.01, Math.min(1, animProgress));
    }

    // Draw pre-rendered sprite (with placement scale animation)
    const sprite = this.sprites.get(b.type);
    if (sprite) {
      if (animProgress < 1) {
        ctx.save();
        ctx.translate(px + S / 2, py + S / 2);
        ctx.scale(animProgress, animProgress);
        ctx.globalAlpha = Math.min(1, animProgress * 1.5);
        if (b.type === 'generator') {
          ctx.drawImage(sprite, -S, -S, S * 2, S * 2);
        } else {
          ctx.drawImage(sprite, -S / 2, -S / 2);
        }
        ctx.restore();

        // Dust puff particles during placement
        if (elapsed < 8 && elapsed % 2 === 0) {
          for (let i = 0; i < 3; i++) {
            this.smoke.push({
              x: px + S * Math.random(),
              y: py + S - 4,
              r: Math.random() * 3 + 2,
              life: 0,
              maxLife: 25 + Math.random() * 15,
              vx: (Math.random() - 0.5) * 1.2,
              vy: -(Math.random() * 0.3 + 0.1),
              opacity: 0.35,
            });
          }
        }
      } else {
        if (b.type === 'generator') {
          ctx.drawImage(sprite, px - S / 2, py - S / 2, S * 2, S * 2);
        } else {
          ctx.drawImage(sprite, px, py);
        }
      }
    } else {
      ctx.fillStyle = '#555';
      ctx.fillRect(px + 6, py + 6, S - 12, S - 12);
    }

    // ── Animated overlays (can't be pre-rendered) ──
    this.drawBuildingAnimations(b, px, py, S);

    // ── Efficiency bar ──
    if (b.efficiency < 1 && !['wall', 'tent', 'house'].includes(b.type)) {
      const barW = (S - 10) * b.efficiency;
      ctx.fillStyle = 'rgba(0,0,0,0.4)';
      ctx.fillRect(px + 5, py + S - 5, S - 10, 3);
      ctx.fillStyle = b.efficiency > 0.5 ? '#4ade80' : '#fbbf24';
      ctx.fillRect(px + 5, py + S - 5, barW, 3);
    }

    // ── Health bar (only when damaged) ──
    if (b.health < 100) {
      const hW = (S - 10) * (b.health / 100);
      ctx.fillStyle = 'rgba(0,0,0,0.4)';
      ctx.fillRect(px + 5, py + 2, S - 10, 2);
      ctx.fillStyle = '#ef4444';
      ctx.fillRect(px + 5, py + 2, hW, 2);
    }

    // ── Worker dots ──
    const totalAssigned = b.assignedWorkers + b.assignedEngineers;
    if (totalAssigned > 0) {
      for (let i = 0; i < Math.min(totalAssigned, 6); i++) {
        ctx.fillStyle = i < b.assignedWorkers ? '#60a5fa' : '#a78bfa';
        ctx.beginPath();
        ctx.arc(px + S - 6 - i * 5, py + 6, 2, 0, Math.PI * 2);
        ctx.fill();
      }
    }
  }

  // Animated overlays drawn on top of sprites each frame
  private drawBuildingAnimations(b: PlacedBuilding, px: number, py: number, S: number): void {
    const { ctx, t } = this;
    const cx = px + S / 2;
    const cy = py + S / 2;

    switch (b.type) {
      case 'generator': {
        // Pulsing outer glow
        const pulseA = 0.2 + Math.sin(t * 0.025) * 0.1;
        const outerGlow = ctx.createRadialGradient(cx, cy, 0, cx, cy, S * 0.9);
        outerGlow.addColorStop(0, `rgba(255, 120, 30, ${pulseA})`);
        outerGlow.addColorStop(0.5, `rgba(255, 80, 10, ${pulseA * 0.4})`);
        outerGlow.addColorStop(1, 'rgba(255, 60, 0, 0)');
        ctx.fillStyle = outerGlow;
        ctx.fillRect(px - S * 0.4, py - S * 0.4, S * 1.8, S * 1.8);

        // Rotating heat rays
        ctx.strokeStyle = `rgba(255, 180, 60, ${0.25 + Math.sin(t * 0.03) * 0.08})`;
        ctx.lineWidth = 1.2;
        const rotOff = t * 0.008;
        for (let i = 0; i < 8; i++) {
          const a = (i / 8) * Math.PI * 2 + rotOff;
          ctx.beginPath();
          ctx.moveTo(cx + Math.cos(a) * S * 0.24, cy + Math.sin(a) * S * 0.24);
          ctx.lineTo(cx + Math.cos(a) * S * 0.4, cy + Math.sin(a) * S * 0.4);
          ctx.stroke();
        }

        // Spawn embers
        if (t % 8 === 0) {
          this.embers.push({
            x: cx + (Math.random() - 0.5) * S * 0.3,
            y: cy - S * 0.1,
            r: Math.random() * 1.5 + 0.5,
            life: 60 + Math.random() * 40,
            vy: -(Math.random() * 0.8 + 0.3),
            vx: (Math.random() - 0.5) * 0.4,
            opacity: 0.8,
          });
        }
        break;
      }
      case 'house': {
        // Flickering window glow
        const flicker = Math.sin(t * 0.04) * 0.1;
        ctx.fillStyle = `rgba(255, 208, 128, ${0.3 + flicker})`;
        ctx.fillRect(px + S * 0.2, py + S * 0.52, 7, 7);
        ctx.fillRect(px + S * 0.6, py + S * 0.52, 7, 7);
        // Chimney smoke
        this.spawnSmoke(px + S * 0.74, py + 8, 0.3);
        break;
      }
      case 'steel_mill': {
        // Furnace glow pulse
        const glowA = 0.25 + Math.sin(t * 0.04) * 0.1;
        ctx.fillStyle = `rgba(255, 100, 20, ${glowA})`;
        ctx.fillRect(px + 5, py + S - 9, S - 10, 5);
        // Smoke
        this.spawnSmoke(px + S * 0.69, py + 3, 0.6);
        break;
      }
      case 'cookhouse': {
        // Warm cooking glow
        const glow = 0.3 + Math.sin(t * 0.05) * 0.12;
        ctx.fillStyle = `rgba(255, 180, 80, ${glow})`;
        ctx.fillRect(px + S * 0.28, py + S * 0.52, 14, 12);
        // Steam
        this.spawnSmoke(px + S * 0.4, py + S * 0.26, 0.25);
        break;
      }
      case 'medical_post': {
        // Lamp flicker
        const lampGlow = 0.35 + Math.sin(t * 0.06) * 0.12;
        ctx.fillStyle = `rgba(255, 240, 200, ${lampGlow})`;
        ctx.beginPath();
        ctx.arc(px + S * 0.82, py + S * 0.5, 4, 0, Math.PI * 2);
        ctx.fill();
        break;
      }
      case 'workshop': {
        // Animated gear rotation overlay
        const gcx = px + S * 0.32;
        const gcy = py + S * 0.52;
        ctx.save();
        ctx.translate(gcx, gcy);
        ctx.rotate(t * 0.015);
        ctx.strokeStyle = 'rgba(180, 200, 230, 0.35)';
        ctx.lineWidth = 1.2;
        ctx.beginPath();
        ctx.arc(0, 0, 9, 0, Math.PI * 2);
        ctx.stroke();
        for (let i = 0; i < 8; i++) {
          const a = (i / 8) * Math.PI * 2;
          ctx.beginPath();
          ctx.moveTo(Math.cos(a) * 8, Math.sin(a) * 8);
          ctx.lineTo(Math.cos(a) * 12, Math.sin(a) * 12);
          ctx.stroke();
        }
        ctx.restore();
        break;
      }
      case 'wall': {
        // Torch flicker
        const flameA = 0.4 + Math.sin(t * 0.08) * 0.2;
        ctx.fillStyle = `rgba(255, 180, 60, ${flameA})`;
        ctx.beginPath();
        ctx.arc(px + S / 2, py + S * 0.33, 3, 0, Math.PI * 2);
        ctx.fill();
        break;
      }
    }
  }

  // Old inline building methods removed — now using SpriteCache

  // ══════════════════════════════════════════
  //  SMOKE PARTICLES
  // ══════════════════════════════════════════

  private spawnSmoke(x: number, y: number, chance: number): void {
    if (Math.random() > chance || this.smoke.length > 80) return;
    this.smoke.push({
      x, y,
      r: Math.random() * 2.5 + 1.5,
      life: 0,
      maxLife: 50 + Math.random() * 30,
      vx: (Math.random() - 0.5) * 0.2,
      vy: -(Math.random() * 0.5 + 0.2),
      opacity: 0.4 + Math.random() * 0.2,
    });
  }

  private drawSmokeParticles(): void {
    const { ctx } = this;
    for (let i = this.smoke.length - 1; i >= 0; i--) {
      const p = this.smoke[i];
      p.x += p.vx;
      p.y += p.vy;
      p.r += 0.03;
      p.life++;
      const fade = 1 - p.life / p.maxLife;
      if (fade <= 0) { this.smoke.splice(i, 1); continue; }

      ctx.fillStyle = `rgba(160, 180, 200, ${p.opacity * fade * 0.5})`;
      ctx.beginPath();
      ctx.arc(p.x, p.y, p.r, 0, Math.PI * 2);
      ctx.fill();
    }
  }

  // ══════════════════════════════════════════
  //  EMBER PARTICLES (from generator)
  // ══════════════════════════════════════════

  private drawEmberParticles(): void {
    const { ctx } = this;
    for (let i = this.embers.length - 1; i >= 0; i--) {
      const p = this.embers[i];
      p.x += p.vx + Math.sin(this.t * 0.1 + i) * 0.1;
      p.y += p.vy;
      p.life--;
      if (p.life <= 0) { this.embers.splice(i, 1); continue; }

      const fade = Math.min(1, p.life / 20);
      ctx.fillStyle = `rgba(255, ${140 + Math.random() * 60}, 30, ${fade * p.opacity})`;
      ctx.beginPath();
      ctx.arc(p.x, p.y, p.r, 0, Math.PI * 2);
      ctx.fill();
    }
  }

  // ══════════════════════════════════════════
  //  TOOLTIP
  // ══════════════════════════════════════════

  private drawTooltip(x: number, y: number, state: GameState): void {
    const cell = state.grid[y]?.[x];
    if (!cell) return;

    const b = cell.buildingId ? state.buildings.find((b) => b.id === cell.buildingId) : null;
    if (!b && cell.terrain === 'snow') return;

    const def = b ? getBuildingDef(b.type) : null;
    const lines: string[] = [];
    if (b && def) {
      lines.push(def.name);
      if (b.efficiency < 1) lines.push(`Efficiency: ${Math.round(b.efficiency * 100)}%`);
      if (b.health < 100) lines.push(`Health: ${b.health}%`);
      if (b.assignedWorkers > 0 || b.assignedEngineers > 0) {
        lines.push(`Staff: ${b.assignedWorkers}W ${b.assignedEngineers}E`);
      }
    } else {
      const names: Record<string, string> = {
        frozen_lake: 'Frozen Lake', rock: 'Rock', ruins: 'Ruins',
      };
      if (names[cell.terrain]) lines.push(names[cell.terrain]);
    }
    lines.push(`${Math.round(cell.temperature)}°C`);
    if (lines.length === 0) return;

    const { ctx } = this;
    const S = CELL_SIZE_PX;
    const tipX = x * S + S + 6;
    const tipY = y * S;
    const lineH = 14;
    const padX = 8;
    const padY = 6;

    ctx.font = '600 10px "Inter", system-ui, sans-serif';
    const w = Math.max(...lines.map((l) => ctx.measureText(l).width)) + padX * 2;
    const h = lines.length * lineH + padY * 2;

    // Tooltip background with border
    ctx.fillStyle = 'rgba(10, 18, 32, 0.92)';
    ctx.beginPath();
    ctx.roundRect(tipX, tipY, w + 4, h, 5);
    ctx.fill();
    ctx.strokeStyle = 'rgba(100, 130, 160, 0.3)';
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.roundRect(tipX, tipY, w + 4, h, 5);
    ctx.stroke();

    // Text
    ctx.textAlign = 'left';
    lines.forEach((line, i) => {
      ctx.fillStyle = i === 0 ? '#e0e8f0' : '#7a8a9c';
      ctx.font = i === 0 ? '600 10px "Inter", system-ui, sans-serif' : '10px "Inter", system-ui, sans-serif';
      ctx.fillText(line, tipX + padX, tipY + padY + (i + 1) * lineH - 3);
    });
  }

  // ══════════════════════════════════════════
  //  SELECTION / HOVER
  // ══════════════════════════════════════════

  private drawCellHighlight(x: number, y: number, state: GameState): void {
    const { ctx } = this;
    const S = CELL_SIZE_PX;
    const px = x * S;
    const py = y * S;
    const cell = state.grid[y]?.[x];
    if (!cell) return;

    if (state.selectedBuildingType) {
      const canBuild = !cell.buildingId && cell.terrain !== 'frozen_lake';
      ctx.fillStyle = canBuild ? COLORS.canPlace : COLORS.cannotPlace;
    } else {
      ctx.fillStyle = 'rgba(200, 180, 140, 0.1)';
    }
    ctx.fillRect(px, py, S, S);

    // Highlight border
    ctx.strokeStyle = state.selectedBuildingType
      ? 'rgba(200, 180, 140, 0.4)'
      : 'rgba(200, 180, 140, 0.2)';
    ctx.lineWidth = 1;
    ctx.strokeRect(px + 0.5, py + 0.5, S - 1, S - 1);
  }

  private drawSelectionRing(x: number, y: number): void {
    const { ctx, t } = this;
    const S = CELL_SIZE_PX;
    const px = x * S;
    const py = y * S;

    // Animated brass-colored selection
    const alpha = 0.5 + Math.sin(t * 0.05) * 0.2;
    ctx.strokeStyle = `rgba(200, 149, 107, ${alpha})`;
    ctx.lineWidth = 2;
    ctx.setLineDash([4, 3]);
    ctx.lineDashOffset = -t * 0.3;
    ctx.strokeRect(px + 1.5, py + 1.5, S - 3, S - 3);
    ctx.setLineDash([]);
  }

  // ══════════════════════════════════════════
  //  SNOW
  // ══════════════════════════════════════════

  private initSnow(count: number): void {
    this.snow = [];
    for (let i = 0; i < count; i++) {
      this.snow.push({
        x: Math.random() * (this.w || 1200),
        y: Math.random() * (this.h || 800),
        r: Math.random() * 2.5 + 0.3,
        speed: Math.random() * 1.0 + 0.15,
        drift: (Math.random() - 0.5) * 0.4,
        opacity: Math.random() * 0.5 + 0.15,
        layer: Math.floor(Math.random() * 3),
      });
    }
  }

  private drawSnow(state: GameState): void {
    const { ctx } = this;
    const coldness = Math.min(1, Math.max(0, (-state.globalTemperature - 20) / 30));
    const visibleCount = Math.floor(this.snow.length * (0.3 + coldness * 0.7));

    for (let i = 0; i < visibleCount; i++) {
      const p = this.snow[i];
      // Layer-based size and opacity
      const layerScale = 0.6 + p.layer * 0.2;
      ctx.fillStyle = `rgba(200, 215, 235, ${p.opacity * layerScale})`;
      ctx.beginPath();
      ctx.arc(p.x, p.y, p.r * layerScale, 0, Math.PI * 2);
      ctx.fill();
    }
  }

  updateSnow(): void {
    const windGust = Math.sin(this.t * 0.003) * 0.5;
    for (const p of this.snow) {
      const layerSpeed = 0.5 + p.layer * 0.3;
      p.y += p.speed * layerSpeed;
      p.x += p.drift + windGust * (0.5 + p.layer * 0.3) + Math.sin(this.t * 0.004 + p.y * 0.008) * 0.2;
      if (p.y > this.h + 5) { p.y = -5; p.x = Math.random() * this.w; }
      if (p.x < -5) p.x = this.w + 5;
      if (p.x > this.w + 5) p.x = -5;
    }
  }

  // ══════════════════════════════════════════
  //  ANIMATION CONTROL
  // ══════════════════════════════════════════

  startSnowAnimation(state: GameState, viewport: Viewport, hoverCell: { x: number; y: number } | null): void {
    const animate = () => {
      this.updateSnow();
      this.render(state, viewport, hoverCell);
      this.animFrameId = requestAnimationFrame(animate);
    };
    this.animFrameId = requestAnimationFrame(animate);
  }

  stopSnowAnimation(): void {
    if (this.animFrameId !== null) {
      cancelAnimationFrame(this.animFrameId);
      this.animFrameId = null;
    }
  }

  // ══════════════════════════════════════════
  //  COORDINATE CONVERSION
  // ══════════════════════════════════════════

  screenToGrid(
    screenX: number,
    screenY: number,
    viewport: Viewport,
  ): { x: number; y: number } | null {
    const gx = Math.floor((screenX - viewport.offsetX) / (CELL_SIZE_PX * viewport.scale));
    const gy = Math.floor((screenY - viewport.offsetY) / (CELL_SIZE_PX * viewport.scale));
    if (gx < 0 || gy < 0 || gx >= GRID_SIZE || gy >= GRID_SIZE) return null;
    return { x: gx, y: gy };
  }

  // Clean up stale build animations (called periodically)
  private cleanBuildAnims(state: GameState): void {
    const currentIds = new Set(state.buildings.map(b => b.id));
    for (const id of this.buildAnims.keys()) {
      if (!currentIds.has(id)) this.buildAnims.delete(id);
    }
  }

  dispose(): void {
    this.stopSnowAnimation();
    this.smoke = [];
    this.embers = [];
    this.buildAnims.clear();
  }
}

// Realistic water renderer with fluid dynamics simulation

import { Hazard } from '../../../types/game';

// Water column for 1D wave simulation
interface WaterColumn {
  height: number;
  velocity: number;
  targetHeight: number;
}

// Water particle for splashes and droplets
interface WaterParticle {
  x: number;
  y: number;
  vx: number;
  vy: number;
  life: number;
  maxLife: number;
  size: number;
  type: 'droplet' | 'splash' | 'foam' | 'bubble';
}

// Ripple effect
interface Ripple {
  x: number;
  y: number;
  radius: number;
  maxRadius: number;
  strength: number;
  life: number;
}

// Water state per hazard (keyed by position)
interface WaterState {
  columns: WaterColumn[];
  particles: WaterParticle[];
  ripples: Ripple[];
  lastUpdate: number;
  baseHeight: number;
}

// Store water state for each water body
const waterStates: Map<string, WaterState> = new Map();

// Physics constants
const WAVE_SPEED = 0.15;
const WAVE_DAMPENING = 0.98;
const WAVE_SPREAD = 0.25;
const GRAVITY = 0.3;
const COLUMN_WIDTH = 8;

function getWaterKey(hazard: Hazard): string {
  return `${hazard.x},${hazard.y}`;
}

function initWaterState(hazard: Hazard): WaterState {
  const numColumns = Math.ceil(hazard.width / COLUMN_WIDTH) + 1;
  const columns: WaterColumn[] = [];

  for (let i = 0; i < numColumns; i++) {
    columns.push({
      height: 0,
      velocity: 0,
      targetHeight: 0,
    });
  }

  return {
    columns,
    particles: [],
    ripples: [],
    lastUpdate: performance.now(),
    baseHeight: hazard.y,
  };
}

function getOrCreateWaterState(hazard: Hazard): WaterState {
  const key = getWaterKey(hazard);
  if (!waterStates.has(key)) {
    waterStates.set(key, initWaterState(hazard));
  }
  return waterStates.get(key)!;
}

// Update water physics simulation
function updateWaterPhysics(state: WaterState, hazard: Hazard, deltaTime: number): void {
  const { columns, particles, ripples } = state;

  // Normalize delta time for consistent physics
  const dt = Math.min(deltaTime / 16.67, 3); // Cap at 3x normal speed

  // Add ambient wave motion
  const time = performance.now() * 0.001;
  for (let i = 0; i < columns.length; i++) {
    const x = i * COLUMN_WIDTH;
    // Multiple wave frequencies for realistic ocean-like motion
    const wave1 = Math.sin(time * 1.5 + x * 0.02) * 2;
    const wave2 = Math.sin(time * 2.3 + x * 0.035 + 1.5) * 1.5;
    const wave3 = Math.sin(time * 0.8 + x * 0.01 + 3.0) * 3;
    const wave4 = Math.sin(time * 3.5 + x * 0.05) * 0.5;

    columns[i].targetHeight = wave1 + wave2 + wave3 + wave4;
  }

  // Apply ripple effects to columns
  for (const ripple of ripples) {
    for (let i = 0; i < columns.length; i++) {
      const colX = hazard.x + i * COLUMN_WIDTH;
      const dist = Math.abs(colX - ripple.x);

      if (dist < ripple.radius && dist > ripple.radius - 20) {
        const waveHeight = Math.sin((dist / ripple.radius) * Math.PI * 4) *
                          ripple.strength * (1 - ripple.radius / ripple.maxRadius);
        columns[i].velocity += waveHeight * 0.3;
      }
    }
  }

  // Update column physics (spring-damper system)
  for (let i = 0; i < columns.length; i++) {
    const col = columns[i];

    // Spring force toward target height
    const springForce = (col.targetHeight - col.height) * WAVE_SPEED;
    col.velocity += springForce * dt;
    col.velocity *= WAVE_DAMPENING;
    col.height += col.velocity * dt;
  }

  // Wave propagation between columns
  const leftDeltas: number[] = new Array(columns.length).fill(0);
  const rightDeltas: number[] = new Array(columns.length).fill(0);

  for (let i = 0; i < columns.length; i++) {
    if (i > 0) {
      leftDeltas[i] = WAVE_SPREAD * (columns[i].height - columns[i - 1].height);
      columns[i - 1].velocity += leftDeltas[i] * dt;
    }
    if (i < columns.length - 1) {
      rightDeltas[i] = WAVE_SPREAD * (columns[i].height - columns[i + 1].height);
      columns[i + 1].velocity += rightDeltas[i] * dt;
    }
  }

  // Update particles
  for (let i = particles.length - 1; i >= 0; i--) {
    const p = particles[i];

    p.vy += GRAVITY * dt;
    p.x += p.vx * dt;
    p.y += p.vy * dt;
    p.life -= dt * 0.02;

    // Remove dead particles
    if (p.life <= 0 || p.y > hazard.y + hazard.height + 50) {
      particles.splice(i, 1);
      continue;
    }

    // Particle hits water surface - create small ripple
    if (p.type === 'droplet' && p.y > hazard.y && p.vy > 0) {
      const colIndex = Math.floor((p.x - hazard.x) / COLUMN_WIDTH);
      if (colIndex >= 0 && colIndex < columns.length) {
        columns[colIndex].velocity += p.vy * 0.5;

        // Small splash
        if (Math.random() < 0.3) {
          ripples.push({
            x: p.x,
            y: hazard.y,
            radius: 0,
            maxRadius: 30 + Math.random() * 20,
            strength: 2,
            life: 1,
          });
        }
      }
      particles.splice(i, 1);
    }
  }

  // Update ripples
  for (let i = ripples.length - 1; i >= 0; i--) {
    const r = ripples[i];
    r.radius += 2 * dt;
    r.life -= dt * 0.015;

    if (r.life <= 0 || r.radius > r.maxRadius) {
      ripples.splice(i, 1);
    }
  }

  // Randomly spawn ambient particles (bubbles rising, foam)
  if (Math.random() < 0.05) {
    particles.push({
      x: hazard.x + Math.random() * hazard.width,
      y: hazard.y + hazard.height * 0.5 + Math.random() * hazard.height * 0.5,
      vx: (Math.random() - 0.5) * 0.5,
      vy: -0.5 - Math.random() * 1,
      life: 1,
      maxLife: 1,
      size: 2 + Math.random() * 3,
      type: 'bubble',
    });
  }

  // Spawn foam on wave crests
  for (let i = 1; i < columns.length - 1; i++) {
    if (columns[i].height > columns[i - 1].height + 2 &&
        columns[i].height > columns[i + 1].height + 2 &&
        columns[i].height > 3 &&
        Math.random() < 0.02) {
      particles.push({
        x: hazard.x + i * COLUMN_WIDTH + (Math.random() - 0.5) * COLUMN_WIDTH,
        y: hazard.y + columns[i].height - 2,
        vx: (Math.random() - 0.5) * 2,
        vy: -1 - Math.random() * 2,
        life: 1,
        maxLife: 1,
        size: 1 + Math.random() * 2,
        type: 'foam',
      });
    }
  }
}

// Create splash effect at position
export function createSplash(hazard: Hazard, x: number, intensity: number = 1): void {
  const state = getOrCreateWaterState(hazard);

  // Add ripple
  state.ripples.push({
    x,
    y: hazard.y,
    radius: 0,
    maxRadius: 80 * intensity,
    strength: 8 * intensity,
    life: 1,
  });

  // Disturb nearby columns
  const colIndex = Math.floor((x - hazard.x) / COLUMN_WIDTH);
  for (let i = Math.max(0, colIndex - 3); i < Math.min(state.columns.length, colIndex + 4); i++) {
    const dist = Math.abs(i - colIndex);
    state.columns[i].velocity += (10 - dist * 2) * intensity;
  }

  // Spawn splash particles
  const particleCount = Math.floor(15 * intensity);
  for (let i = 0; i < particleCount; i++) {
    const angle = -Math.PI / 2 + (Math.random() - 0.5) * Math.PI * 0.8;
    const speed = 3 + Math.random() * 5 * intensity;

    state.particles.push({
      x: x + (Math.random() - 0.5) * 20,
      y: hazard.y,
      vx: Math.cos(angle) * speed,
      vy: Math.sin(angle) * speed - 2,
      life: 1,
      maxLife: 1,
      size: 2 + Math.random() * 4,
      type: 'droplet',
    });
  }
}

// Main render function
export function renderWater(ctx: CanvasRenderingContext2D, hazard: Hazard): void {
  const state = getOrCreateWaterState(hazard);
  const now = performance.now();
  const deltaTime = now - state.lastUpdate;
  state.lastUpdate = now;

  // Update physics
  updateWaterPhysics(state, hazard, deltaTime);

  const { columns, particles, ripples } = state;

  ctx.save();

  // Draw water body with depth gradient - dark Limbo-style
  const depthGradient = ctx.createLinearGradient(
    hazard.x, hazard.y,
    hazard.x, hazard.y + hazard.height
  );
  depthGradient.addColorStop(0, 'rgba(20, 22, 28, 0.95)');
  depthGradient.addColorStop(0.3, 'rgba(12, 14, 20, 0.98)');
  depthGradient.addColorStop(1, 'rgba(5, 5, 10, 1)');

  ctx.fillStyle = depthGradient;
  ctx.fillRect(hazard.x, hazard.y, hazard.width, hazard.height);

  // Draw underwater caustics (light patterns) - very subtle
  ctx.save();
  ctx.globalAlpha = 0.06;

  const time = now * 0.001;
  for (let i = 0; i < 5; i++) {
    const cx = hazard.x + (Math.sin(time * 0.5 + i * 2) * 0.5 + 0.5) * hazard.width;
    const cy = hazard.y + 20 + (Math.cos(time * 0.7 + i * 1.5) * 0.5 + 0.5) * (hazard.height - 40);
    const size = 30 + Math.sin(time + i) * 10;

    const causticGradient = ctx.createRadialGradient(cx, cy, 0, cx, cy, size);
    causticGradient.addColorStop(0, 'rgba(70, 75, 85, 0.2)');
    causticGradient.addColorStop(1, 'rgba(70, 75, 85, 0)');
    ctx.fillStyle = causticGradient;
    ctx.beginPath();
    ctx.arc(cx, cy, size, 0, Math.PI * 2);
    ctx.fill();
  }
  ctx.restore();

  // Draw bubbles - subtle gray
  for (const p of particles) {
    if (p.type === 'bubble' && p.y > hazard.y) {
      const alpha = p.life * 0.25;
      ctx.fillStyle = `rgba(80, 85, 95, ${alpha})`;
      ctx.beginPath();
      ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2);
      ctx.fill();

      // Bubble highlight
      ctx.fillStyle = `rgba(100, 105, 115, ${alpha * 0.4})`;
      ctx.beginPath();
      ctx.arc(p.x - p.size * 0.3, p.y - p.size * 0.3, p.size * 0.3, 0, Math.PI * 2);
      ctx.fill();
    }
  }

  // Draw water surface with wave columns
  ctx.beginPath();
  ctx.moveTo(hazard.x, hazard.y + hazard.height);
  ctx.lineTo(hazard.x, hazard.y + columns[0].height);

  // Smooth curve through column tops using bezier curves
  for (let i = 0; i < columns.length - 1; i++) {
    const x1 = hazard.x + i * COLUMN_WIDTH;
    const y1 = hazard.y + columns[i].height;
    const x2 = hazard.x + (i + 1) * COLUMN_WIDTH;
    const y2 = hazard.y + columns[i + 1].height;

    const cpx = (x1 + x2) / 2;
    ctx.quadraticCurveTo(x1, y1, cpx, (y1 + y2) / 2);
  }

  const lastCol = columns[columns.length - 1];
  ctx.lineTo(hazard.x + hazard.width, hazard.y + lastCol.height);
  ctx.lineTo(hazard.x + hazard.width, hazard.y + hazard.height);
  ctx.closePath();

  // Surface gradient - darker, more atmospheric
  const surfaceGradient = ctx.createLinearGradient(
    hazard.x, hazard.y - 10,
    hazard.x, hazard.y + 30
  );
  surfaceGradient.addColorStop(0, 'rgba(45, 50, 60, 0.85)');
  surfaceGradient.addColorStop(0.5, 'rgba(25, 28, 38, 0.92)');
  surfaceGradient.addColorStop(1, 'rgba(12, 15, 22, 0.98)');
  ctx.fillStyle = surfaceGradient;
  ctx.fill();

  // Draw surface highlights/reflections - subtle gray
  ctx.strokeStyle = 'rgba(90, 95, 105, 0.4)';
  ctx.lineWidth = 2;
  ctx.beginPath();

  for (let i = 0; i < columns.length - 1; i++) {
    const x = hazard.x + i * COLUMN_WIDTH;
    const y = hazard.y + columns[i].height;

    if (i === 0) {
      ctx.moveTo(x, y);
    } else {
      const prevY = hazard.y + columns[i - 1].height;
      const cpx = x - COLUMN_WIDTH / 2;
      ctx.quadraticCurveTo(cpx, (y + prevY) / 2, x, y);
    }
  }
  ctx.stroke();

  // Thinner highlight line
  ctx.strokeStyle = 'rgba(120, 125, 135, 0.35)';
  ctx.lineWidth = 1;
  ctx.beginPath();

  for (let i = 0; i < columns.length - 1; i++) {
    const x = hazard.x + i * COLUMN_WIDTH;
    const y = hazard.y + columns[i].height - 1;

    if (i === 0) {
      ctx.moveTo(x, y);
    } else {
      const prevY = hazard.y + columns[i - 1].height - 1;
      const cpx = x - COLUMN_WIDTH / 2;
      ctx.quadraticCurveTo(cpx, (y + prevY) / 2, x, y);
    }
  }
  ctx.stroke();

  // Draw ripple rings on surface - subtle gray
  ctx.lineWidth = 1;
  for (const ripple of ripples) {
    const alpha = ripple.life * 0.2;
    ctx.strokeStyle = `rgba(100, 105, 115, ${alpha})`;
    ctx.beginPath();
    ctx.ellipse(
      ripple.x,
      hazard.y,
      ripple.radius,
      ripple.radius * 0.3,
      0, 0, Math.PI * 2
    );
    ctx.stroke();
  }

  // Draw foam and splash particles above water - muted colors
  for (const p of particles) {
    if (p.type === 'foam' || p.type === 'droplet' || p.type === 'splash') {
      const alpha = p.life * 0.6;

      if (p.type === 'foam') {
        ctx.fillStyle = `rgba(130, 135, 145, ${alpha * 0.5})`;
      } else {
        ctx.fillStyle = `rgba(100, 105, 115, ${alpha})`;
      }

      ctx.beginPath();
      ctx.arc(p.x, p.y, p.size * p.life, 0, Math.PI * 2);
      ctx.fill();

      // Droplet highlight
      if (p.type === 'droplet' && p.size > 2) {
        ctx.fillStyle = `rgba(140, 145, 155, ${alpha * 0.4})`;
        ctx.beginPath();
        ctx.arc(p.x - p.size * 0.2, p.y - p.size * 0.2, p.size * 0.25, 0, Math.PI * 2);
        ctx.fill();
      }
    }
  }

  // Draw edge foam/meniscus at water boundaries
  ctx.fillStyle = 'rgba(70, 75, 85, 0.25)';

  // Left edge
  ctx.beginPath();
  ctx.moveTo(hazard.x, hazard.y + columns[0].height);
  ctx.quadraticCurveTo(
    hazard.x - 3, hazard.y + columns[0].height + 5,
    hazard.x, hazard.y + columns[0].height + 10
  );
  ctx.lineTo(hazard.x + 5, hazard.y + columns[0].height + 8);
  ctx.quadraticCurveTo(
    hazard.x + 3, hazard.y + columns[0].height + 3,
    hazard.x, hazard.y + columns[0].height
  );
  ctx.fill();

  // Right edge
  ctx.beginPath();
  ctx.moveTo(hazard.x + hazard.width, hazard.y + lastCol.height);
  ctx.quadraticCurveTo(
    hazard.x + hazard.width + 3, hazard.y + lastCol.height + 5,
    hazard.x + hazard.width, hazard.y + lastCol.height + 10
  );
  ctx.lineTo(hazard.x + hazard.width - 5, hazard.y + lastCol.height + 8);
  ctx.quadraticCurveTo(
    hazard.x + hazard.width - 3, hazard.y + lastCol.height + 3,
    hazard.x + hazard.width, hazard.y + lastCol.height
  );
  ctx.fill();

  ctx.restore();
}

// Level rendering (platforms, hazards, objects)

import {
  LevelData,
  Platform,
  Hazard,
  PushableObject,
  Switch,
  Checkpoint,
  GameState,
} from '../../../types/game';
import { COLORS } from '../../../game/constants';
import { renderWater } from './WaterRenderer';

export function renderLevel(
  ctx: CanvasRenderingContext2D,
  levelData: LevelData,
  gameState: GameState
): void {
  // Render platforms
  levelData.platforms.forEach((platform) => {
    renderPlatform(ctx, platform);
  });

  // Render hazards
  levelData.hazards.forEach((hazard) => {
    renderHazard(ctx, hazard);
  });

  // Render pushable objects
  levelData.pushableObjects.forEach((obj) => {
    renderPushableObject(ctx, obj);
  });

  // Render switches
  levelData.switches.forEach((sw) => {
    renderSwitch(ctx, sw);
  });

  // Render checkpoints
  levelData.checkpoints.forEach((cp) => {
    renderCheckpoint(ctx, cp);
  });

  // Render exit zone (subtle glow)
  renderExitZone(ctx, levelData.exitZone);

  // Render ropes
  levelData.ropes.forEach((rope) => {
    renderRope(ctx, rope);
  });
}

function renderPlatform(ctx: CanvasRenderingContext2D, platform: Platform): void {
  ctx.fillStyle = COLORS.platform;

  switch (platform.type) {
    case 'solid':
      // Solid platform with organic edges
      ctx.beginPath();
      ctx.moveTo(platform.x - 3, platform.y + 5);

      // Top edge with irregular rocky surface
      for (let i = 0; i <= platform.width; i += 8) {
        const seed = (platform.x + i) * 17;
        const offset = Math.sin(seed * 0.1) * 3 + ((seed * 7) % 5) - 2;
        ctx.lineTo(platform.x + i, platform.y + offset);
      }

      ctx.lineTo(platform.x + platform.width + 3, platform.y + 5);
      ctx.lineTo(platform.x + platform.width, platform.y + platform.height);
      ctx.lineTo(platform.x, platform.y + platform.height);
      ctx.closePath();
      ctx.fill();

      // Add grass tufts on top of platform
      if (platform.height > 15) {
        renderPlatformGrass(ctx, platform);
      }

      // Add small rocks/debris on the surface
      renderSurfaceDetails(ctx, platform);
      break;

    case 'one-way':
      // One-way platform (thinner, with visual indication)
      ctx.fillRect(platform.x, platform.y, platform.width, platform.height);

      // Add subtle pattern to indicate one-way
      ctx.fillStyle = COLORS.accent;
      for (let i = 0; i < platform.width; i += 15) {
        ctx.fillRect(platform.x + i, platform.y + 2, 8, 2);
      }
      break;

    case 'moving':
      // Moving platform with mechanical look
      ctx.fillStyle = COLORS.platform;
      ctx.fillRect(platform.x, platform.y, platform.width, platform.height);

      // Add gears/mechanical detail
      ctx.fillStyle = COLORS.highlight;
      ctx.beginPath();
      ctx.arc(platform.x + 15, platform.y + platform.height / 2, 8, 0, Math.PI * 2);
      ctx.fill();
      ctx.beginPath();
      ctx.arc(
        platform.x + platform.width - 15,
        platform.y + platform.height / 2,
        8,
        0,
        Math.PI * 2
      );
      ctx.fill();
      break;

    case 'crumbling':
      // Crumbling platform with cracks
      ctx.fillRect(platform.x, platform.y, platform.width, platform.height);

      // Add crack lines
      ctx.strokeStyle = COLORS.background;
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.moveTo(platform.x + platform.width * 0.3, platform.y);
      ctx.lineTo(platform.x + platform.width * 0.4, platform.y + platform.height);
      ctx.moveTo(platform.x + platform.width * 0.7, platform.y);
      ctx.lineTo(platform.x + platform.width * 0.6, platform.y + platform.height);
      ctx.stroke();
      break;
  }
}

function renderHazard(ctx: CanvasRenderingContext2D, hazard: Hazard): void {
  if (!hazard.isActive) {
    ctx.globalAlpha = 0.3;
  }

  ctx.fillStyle = COLORS.hazard;

  switch (hazard.type) {
    case 'spike':
      // Draw realistic iron spikes with base
      const baseHeight = 6;
      const spikeSpacing = 12;
      const numSpikes = Math.floor(hazard.width / spikeSpacing);

      // Draw the metal base strip
      ctx.fillRect(hazard.x, hazard.y + hazard.height - baseHeight, hazard.width, baseHeight);

      // Draw individual spikes with variation
      for (let i = 0; i < numSpikes; i++) {
        const seed = (hazard.x + i * 17) % 100;
        const spikeX = hazard.x + i * spikeSpacing + spikeSpacing / 2;
        const heightVariation = 0.85 + (seed % 30) / 100; // 85% to 115% height
        const spikeHeight = (hazard.height - baseHeight) * heightVariation;
        const leanAngle = ((seed % 10) - 5) * 0.02; // Slight random lean

        // Spike base width tapers to point
        const baseWidth = 4;
        const tipOffset = leanAngle * spikeHeight;

        ctx.beginPath();
        // Start at base left
        ctx.moveTo(spikeX - baseWidth, hazard.y + hazard.height - baseHeight);
        // Curve up to the tip
        ctx.quadraticCurveTo(
          spikeX - baseWidth * 0.3 + tipOffset * 0.5,
          hazard.y + hazard.height - baseHeight - spikeHeight * 0.6,
          spikeX + tipOffset,
          hazard.y + hazard.height - baseHeight - spikeHeight
        );
        // Curve down to base right
        ctx.quadraticCurveTo(
          spikeX + baseWidth * 0.3 + tipOffset * 0.5,
          hazard.y + hazard.height - baseHeight - spikeHeight * 0.6,
          spikeX + baseWidth,
          hazard.y + hazard.height - baseHeight
        );
        ctx.closePath();
        ctx.fill();
      }
      break;

    case 'saw':
      // Rotating saw blade
      const sawRadius = hazard.width / 2;
      const sawX = hazard.x + sawRadius;
      const sawY = hazard.y + sawRadius;
      const rotation = ((hazard.animationPhase || 0) + performance.now() * 0.005) % (Math.PI * 2);

      ctx.save();
      ctx.translate(sawX, sawY);
      ctx.rotate(rotation);

      // Saw blade teeth
      ctx.beginPath();
      const teeth = 12;
      for (let i = 0; i < teeth; i++) {
        const angle = (i / teeth) * Math.PI * 2;
        const innerRadius = sawRadius * 0.6;
        const outerRadius = sawRadius;

        if (i === 0) {
          ctx.moveTo(Math.cos(angle) * outerRadius, Math.sin(angle) * outerRadius);
        } else {
          ctx.lineTo(Math.cos(angle) * outerRadius, Math.sin(angle) * outerRadius);
        }

        const midAngle = ((i + 0.5) / teeth) * Math.PI * 2;
        ctx.lineTo(Math.cos(midAngle) * innerRadius, Math.sin(midAngle) * innerRadius);
      }
      ctx.closePath();
      ctx.fill();

      // Center hole
      ctx.fillStyle = COLORS.background;
      ctx.beginPath();
      ctx.arc(0, 0, sawRadius * 0.2, 0, Math.PI * 2);
      ctx.fill();

      ctx.restore();
      break;

    case 'water':
      // Use advanced water renderer with fluid dynamics
      renderWater(ctx, hazard);
      break;

    case 'bearTrap':
      // Bear trap jaws
      const trapOpen = hazard.isActive;
      const jawAngle = trapOpen ? 0.8 : 0;

      ctx.save();
      ctx.translate(hazard.x + hazard.width / 2, hazard.y + hazard.height);

      // Base
      ctx.fillRect(-hazard.width / 2, -5, hazard.width, 5);

      // Left jaw
      ctx.save();
      ctx.rotate(-jawAngle);
      ctx.beginPath();
      ctx.moveTo(-hazard.width / 2, 0);
      ctx.lineTo(-hazard.width / 2, -hazard.height);
      ctx.lineTo(-hazard.width / 4, -hazard.height * 0.7);
      ctx.lineTo(0, -hazard.height);
      ctx.lineTo(0, 0);
      ctx.closePath();
      ctx.fill();
      ctx.restore();

      // Right jaw
      ctx.save();
      ctx.rotate(jawAngle);
      ctx.beginPath();
      ctx.moveTo(hazard.width / 2, 0);
      ctx.lineTo(hazard.width / 2, -hazard.height);
      ctx.lineTo(hazard.width / 4, -hazard.height * 0.7);
      ctx.lineTo(0, -hazard.height);
      ctx.lineTo(0, 0);
      ctx.closePath();
      ctx.fill();
      ctx.restore();

      ctx.restore();
      break;

    case 'crusher':
      // Industrial crusher
      const crushPhase = ((hazard.animationPhase || 0) + performance.now() * 0.001) % 2;
      const crushOffset = crushPhase < 1 ? crushPhase * 150 : (2 - crushPhase) * 150;

      ctx.fillRect(hazard.x, hazard.y + crushOffset, hazard.width, hazard.height - crushOffset);

      // Crusher spikes
      const crusherSpikes = 3;
      const crusherSpikeWidth = hazard.width / crusherSpikes;
      for (let i = 0; i < crusherSpikes; i++) {
        ctx.beginPath();
        ctx.moveTo(hazard.x + i * crusherSpikeWidth, hazard.y + hazard.height);
        ctx.lineTo(hazard.x + i * crusherSpikeWidth + crusherSpikeWidth / 2, hazard.y + hazard.height + 20);
        ctx.lineTo(hazard.x + (i + 1) * crusherSpikeWidth, hazard.y + hazard.height);
        ctx.closePath();
        ctx.fill();
      }
      break;
  }

  ctx.globalAlpha = 1;
}

function renderPushableObject(ctx: CanvasRenderingContext2D, obj: PushableObject): void {
  ctx.fillStyle = COLORS.platform;

  switch (obj.type) {
    case 'box':
      // Wooden crate
      ctx.fillRect(obj.x, obj.y, obj.width, obj.height);

      // Add wood grain lines
      ctx.strokeStyle = COLORS.accent;
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.moveTo(obj.x, obj.y + obj.height * 0.33);
      ctx.lineTo(obj.x + obj.width, obj.y + obj.height * 0.33);
      ctx.moveTo(obj.x, obj.y + obj.height * 0.66);
      ctx.lineTo(obj.x + obj.width, obj.y + obj.height * 0.66);
      ctx.moveTo(obj.x + obj.width * 0.5, obj.y);
      ctx.lineTo(obj.x + obj.width * 0.5, obj.y + obj.height);
      ctx.stroke();
      break;

    case 'boulder':
      // Round boulder
      ctx.beginPath();
      ctx.ellipse(
        obj.x + obj.width / 2,
        obj.y + obj.height / 2,
        obj.width / 2,
        obj.height / 2,
        0,
        0,
        Math.PI * 2
      );
      ctx.fill();

      // Add texture
      ctx.fillStyle = COLORS.accent;
      ctx.beginPath();
      ctx.arc(obj.x + obj.width * 0.3, obj.y + obj.height * 0.3, 5, 0, Math.PI * 2);
      ctx.fill();
      ctx.beginPath();
      ctx.arc(obj.x + obj.width * 0.7, obj.y + obj.height * 0.5, 4, 0, Math.PI * 2);
      ctx.fill();
      break;

    case 'log':
      // Horizontal log
      ctx.beginPath();
      ctx.ellipse(
        obj.x + obj.width / 2,
        obj.y + obj.height / 2,
        obj.width / 2,
        obj.height / 2,
        0,
        0,
        Math.PI * 2
      );
      ctx.fill();

      // Add rings
      ctx.strokeStyle = COLORS.accent;
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.arc(obj.x + obj.width / 2, obj.y + obj.height / 2, obj.width * 0.3, 0, Math.PI * 2);
      ctx.stroke();
      ctx.beginPath();
      ctx.arc(obj.x + obj.width / 2, obj.y + obj.height / 2, obj.width * 0.15, 0, Math.PI * 2);
      ctx.stroke();
      break;
  }
}

function renderSwitch(ctx: CanvasRenderingContext2D, sw: Switch): void {
  ctx.fillStyle = sw.isActivated ? COLORS.highlight : COLORS.platform;

  switch (sw.type) {
    case 'lever':
      // Base
      ctx.fillRect(sw.x, sw.y + sw.height * 0.6, sw.width, sw.height * 0.4);

      // Lever arm
      ctx.save();
      ctx.translate(sw.x + sw.width / 2, sw.y + sw.height * 0.6);
      ctx.rotate(sw.isActivated ? 0.5 : -0.5);
      ctx.fillRect(-3, -sw.height * 0.8, 6, sw.height * 0.8);
      ctx.beginPath();
      ctx.arc(0, -sw.height * 0.8, 8, 0, Math.PI * 2);
      ctx.fill();
      ctx.restore();
      break;

    case 'button':
      // Button housing
      ctx.fillRect(sw.x, sw.y, sw.width, sw.height);

      // Button top
      const buttonDepth = sw.isActivated ? sw.height * 0.8 : sw.height * 0.4;
      ctx.fillStyle = sw.isActivated ? COLORS.accent : COLORS.highlight;
      ctx.fillRect(sw.x + 5, sw.y + buttonDepth, sw.width - 10, sw.height - buttonDepth);
      break;

    case 'pressurePlate':
      // Pressure plate
      const plateOffset = sw.isActivated ? 5 : 0;
      ctx.fillRect(sw.x, sw.y + plateOffset, sw.width, sw.height);
      break;
  }
}

function renderCheckpoint(ctx: CanvasRenderingContext2D, cp: Checkpoint): void {
  // Checkpoint lantern
  ctx.fillStyle = COLORS.platform;

  // Post
  ctx.fillRect(cp.x + cp.width / 2 - 3, cp.y, 6, cp.height);

  // Lantern cage
  ctx.strokeStyle = COLORS.platform;
  ctx.lineWidth = 2;
  ctx.strokeRect(cp.x, cp.y - 10, cp.width, 25);

  // Glow if activated
  if (cp.isActivated) {
    ctx.fillStyle = 'rgba(255, 200, 100, 0.3)';
    ctx.beginPath();
    ctx.arc(cp.x + cp.width / 2, cp.y, 30, 0, Math.PI * 2);
    ctx.fill();

    // Inner glow
    ctx.fillStyle = 'rgba(255, 220, 150, 0.6)';
    ctx.beginPath();
    ctx.arc(cp.x + cp.width / 2, cp.y, 10, 0, Math.PI * 2);
    ctx.fill();
  }
}

function renderExitZone(
  ctx: CanvasRenderingContext2D,
  exit: { x: number; y: number; width: number; height: number }
): void {
  // Glowing portal/exit
  const gradient = ctx.createRadialGradient(
    exit.x + exit.width / 2,
    exit.y + exit.height / 2,
    0,
    exit.x + exit.width / 2,
    exit.y + exit.height / 2,
    exit.width
  );

  gradient.addColorStop(0, 'rgba(255, 255, 255, 0.4)');
  gradient.addColorStop(0.5, 'rgba(200, 200, 200, 0.2)');
  gradient.addColorStop(1, 'rgba(100, 100, 100, 0)');

  ctx.fillStyle = gradient;
  ctx.fillRect(exit.x - exit.width / 2, exit.y - exit.height / 2, exit.width * 2, exit.height * 2);

  // Pulsing effect
  const pulse = Math.sin(performance.now() * 0.003) * 0.3 + 0.7;
  ctx.fillStyle = `rgba(255, 255, 255, ${0.1 * pulse})`;
  ctx.beginPath();
  ctx.arc(exit.x + exit.width / 2, exit.y + exit.height / 2, 30 * pulse, 0, Math.PI * 2);
  ctx.fill();
}

function renderRope(
  ctx: CanvasRenderingContext2D,
  rope: { anchorX: number; anchorY: number; length: number; angle: number }
): void {
  ctx.strokeStyle = COLORS.platform;
  ctx.lineWidth = 4;

  const endX = rope.anchorX + Math.sin(rope.angle) * rope.length;
  const endY = rope.anchorY + Math.cos(rope.angle) * rope.length;

  // Draw rope with slight curve
  ctx.beginPath();
  ctx.moveTo(rope.anchorX, rope.anchorY);

  // Add sag to rope
  const midX = (rope.anchorX + endX) / 2;
  const midY = (rope.anchorY + endY) / 2 + 10;
  ctx.quadraticCurveTo(midX, midY, endX, endY);
  ctx.stroke();

  // Anchor point
  ctx.fillStyle = COLORS.platform;
  ctx.beginPath();
  ctx.arc(rope.anchorX, rope.anchorY, 8, 0, Math.PI * 2);
  ctx.fill();

  // End knot
  ctx.beginPath();
  ctx.arc(endX, endY, 6, 0, Math.PI * 2);
  ctx.fill();
}

// Render sparse grass on top of a platform
function renderPlatformGrass(ctx: CanvasRenderingContext2D, platform: Platform): void {
  ctx.fillStyle = COLORS.platform;

  // Only a few grass blades at edges of platform
  const positions = [
    platform.x + 5,
    platform.x + platform.width - 5,
  ];

  // Add middle grass only for wide platforms
  if (platform.width > 150) {
    positions.push(platform.x + platform.width / 2);
  }

  for (const x of positions) {
    const seed = Math.floor(x * 31) % 10000;
    const bladeHeight = 10 + (seed % 8);
    const lean = ((seed * 13) % 10 - 5) * 0.02;

    ctx.beginPath();
    ctx.moveTo(x - 1, platform.y);
    ctx.quadraticCurveTo(
      x + lean * bladeHeight * 2,
      platform.y - bladeHeight * 0.6,
      x + lean * bladeHeight * 3,
      platform.y - bladeHeight
    );
    ctx.quadraticCurveTo(
      x + lean * bladeHeight * 2,
      platform.y - bladeHeight * 0.6,
      x + 1,
      platform.y
    );
    ctx.closePath();
    ctx.fill();
  }
}

// Render minimal surface details - just organic edge texture
function renderSurfaceDetails(ctx: CanvasRenderingContext2D, platform: Platform): void {
  // Only add a small rock on longer platforms
  if (platform.width > 200) {
    ctx.fillStyle = COLORS.platform;
    const seed = Math.floor(platform.x * 23) % 10000;
    const x = platform.x + platform.width * 0.3 + (seed % 50);
    const rockWidth = 3 + (seed % 4);
    ctx.beginPath();
    ctx.ellipse(x, platform.y - 1, rockWidth, 2, 0, 0, Math.PI * 2);
    ctx.fill();
  }
}

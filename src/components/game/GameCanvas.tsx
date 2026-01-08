// Main game canvas component with rendering
// Skeletal animation player renderer

import React, { useRef, useEffect, useCallback } from 'react';
import { GameState, LevelData, Camera } from '../../types/game';
import { CANVAS_WIDTH, CANVAS_HEIGHT, COLORS } from '../../game/constants';
import { renderPlayer } from './renderers/PlayerRenderer';
import { renderLevel } from './renderers/LevelRenderer';
import { renderEffects } from './renderers/EffectsRenderer';

interface GameCanvasProps {
  gameState: GameState;
  levelData: LevelData;
}

export const GameCanvas: React.FC<GameCanvasProps> = ({ gameState, levelData }) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const offscreenCanvasRef = useRef<HTMLCanvasElement | null>(null);

  // Create offscreen canvas for double buffering
  useEffect(() => {
    offscreenCanvasRef.current = document.createElement('canvas');
    offscreenCanvasRef.current.width = CANVAS_WIDTH;
    offscreenCanvasRef.current.height = CANVAS_HEIGHT;
  }, []);

  const render = useCallback(() => {
    const canvas = canvasRef.current;
    const offscreenCanvas = offscreenCanvasRef.current;
    if (!canvas || !offscreenCanvas) return;

    const ctx = offscreenCanvas.getContext('2d');
    if (!ctx) return;

    const mainCtx = canvas.getContext('2d');
    if (!mainCtx) return;

    // Apply camera shake
    const shakeX = gameState.camera.shake * (Math.random() - 0.5) * 10;
    const shakeY = gameState.camera.shake * (Math.random() - 0.5) * 10;

    // Clear canvas with background color
    ctx.fillStyle = COLORS.background;
    ctx.fillRect(0, 0, CANVAS_WIDTH, CANVAS_HEIGHT);

    // Save context state
    ctx.save();

    // Apply camera transform
    ctx.translate(
      -gameState.camera.x + CANVAS_WIDTH / 2 + shakeX,
      -gameState.camera.y + CANVAS_HEIGHT / 2 + shakeY
    );
    ctx.scale(gameState.camera.zoom, gameState.camera.zoom);

    // Render background layers (parallax)
    renderBackground(ctx, gameState.camera, levelData);

    // Render level elements
    renderLevel(ctx, levelData, gameState);

    // Render player
    renderPlayer(ctx, gameState.player);

    // Render foreground vegetation (in front of player)
    renderForeground(ctx, gameState.camera, levelData);

    // Restore context
    ctx.restore();

    // Render post-processing effects (film grain, vignette)
    renderEffects(ctx, gameState, levelData);

    // Draw to main canvas
    mainCtx.drawImage(offscreenCanvas, 0, 0);
  }, [gameState, levelData]);

  // Render on every state change
  useEffect(() => {
    render();
  }, [render]);

  return (
    <canvas
      ref={canvasRef}
      width={CANVAS_WIDTH}
      height={CANVAS_HEIGHT}
      style={{
        display: 'block',
        margin: '0 auto',
        maxWidth: '100%',
        maxHeight: '100vh',
        imageRendering: 'pixelated',
      }}
    />
  );
};

function renderBackground(
  ctx: CanvasRenderingContext2D,
  camera: Camera,
  levelData: LevelData
): void {
  // Ground level where gameplay happens
  const groundLevel = 580;

  // Sky/horizon line where mountains meet sky
  const horizonY = 320;

  // Layer 0: Very distant mountains (furthest back, barely moving) - in the sky
  const mountainParallax = camera.x * 0.02;
  ctx.save();
  ctx.filter = 'blur(2px)';
  drawMountainRange(ctx, mountainParallax, horizonY + 80, levelData.width, 1.0, '#4a4a50');
  ctx.restore();

  // Layer 0.5: Mid-distant mountains - darker, closer
  const midMountainParallax = camera.x * 0.04;
  ctx.save();
  ctx.filter = 'blur(1px)';
  drawMountainRange(ctx, midMountainParallax + 500, horizonY + 140, levelData.width, 0.8, '#3d3d42');
  ctx.restore();

  // Layer 0.75: Distant hills (rolling, softer shapes)
  const hillParallax = camera.x * 0.06;
  drawHillRange(ctx, hillParallax, horizonY + 200, levelData.width, '#333338');

  // Distant horizon haze (between mountains and trees)
  const hazeGradient = ctx.createLinearGradient(0, 200, 0, groundLevel);
  hazeGradient.addColorStop(0, 'rgba(60, 60, 65, 0.4)');
  hazeGradient.addColorStop(1, 'rgba(50, 50, 55, 0)');
  ctx.fillStyle = hazeGradient;
  ctx.fillRect(-500, 200, levelData.width + 1000, groundLevel - 200);

  // Layer 1: Very distant treeline (on horizon) - with blur
  ctx.save();
  ctx.filter = 'blur(3px)';
  ctx.fillStyle = '#2d2d2d';
  const parallax1 = camera.x * 0.05;
  const horizon1 = groundLevel - 80;
  drawTreeline(ctx, parallax1, horizon1, 400, 0.4, levelData.width);
  ctx.restore();

  // Layer 2: Distant trees - slight blur
  ctx.save();
  ctx.filter = 'blur(1.5px)';
  ctx.fillStyle = '#242424';
  const parallax2 = camera.x * 0.12;
  const horizon2 = groundLevel - 40;
  drawTreeline(ctx, parallax2, horizon2, 300, 0.55, levelData.width);
  ctx.restore();

  // Time for sway animation
  const time = performance.now() * 0.001;

  // Layer 3: Mid-ground trees - no blur, subtle sway
  ctx.fillStyle = '#181818';
  const parallax3 = camera.x * 0.25;
  const horizon3 = groundLevel;
  for (let i = 0; i < levelData.width / 200 + 4; i++) {
    const x = i * 200 - parallax3 % 200 - 100;
    const heightVar = 0.7 + ((i * 7) % 10) / 30;
    // Each tree sways at slightly different phase and speed
    const sway = Math.sin(time * 0.8 + i * 1.3) * 3 + Math.sin(time * 1.2 + i * 0.7) * 1.5;
    drawGroundedTree(ctx, x, horizon3, heightVar, sway);
  }

  // Layer 4: Near trees - sharp, nearly black, more pronounced sway
  ctx.fillStyle = '#0c0c0c';
  const parallax4 = camera.x * 0.4;
  const horizon4 = groundLevel + 40;
  for (let i = 0; i < levelData.width / 280 + 3; i++) {
    const x = i * 280 - parallax4 % 280 - 140 + 60;
    const heightVar = 0.5 + ((i * 13) % 10) / 40;
    // Near trees sway more noticeably
    const sway = Math.sin(time * 0.6 + i * 1.7) * 5 + Math.sin(time * 1.1 + i * 0.9) * 2;
    drawGroundedTree(ctx, x, horizon4, heightVar, sway);
  }

  // Ground fog layer
  const fogGradient = ctx.createLinearGradient(0, groundLevel - 100, 0, groundLevel + 100);
  fogGradient.addColorStop(0, 'rgba(50, 50, 55, 0)');
  fogGradient.addColorStop(0.4, 'rgba(45, 45, 50, 0.3)');
  fogGradient.addColorStop(1, 'rgba(40, 40, 45, 0.6)');
  ctx.fillStyle = fogGradient;
  ctx.fillRect(-500, groundLevel - 100, levelData.width + 1000, 250);

  // Spider webs between trees - at fixed world positions
  renderSpiderWebs(ctx, levelData.width);
}

// Draw a continuous treeline silhouette for distant layers
function drawTreeline(
  ctx: CanvasRenderingContext2D,
  parallaxOffset: number,
  groundY: number,
  spacing: number,
  scale: number,
  levelWidth: number
): void {
  ctx.beginPath();

  // Start at bottom left - fill solid to ground
  ctx.moveTo(-500, groundY + 200);
  ctx.lineTo(-500, groundY);

  // Draw jagged pine treeline across the screen
  for (let i = 0; i < levelWidth / spacing + 5; i++) {
    const baseX = i * spacing - parallaxOffset % spacing - spacing;
    const treeHeight = (100 + ((i * 17) % 60)) * scale;
    const treeWidth = (25 + ((i * 11) % 20)) * scale;

    // Pine tree shape - pointed top
    ctx.lineTo(baseX - treeWidth, groundY);
    ctx.lineTo(baseX - treeWidth * 0.6, groundY - treeHeight * 0.3);
    ctx.lineTo(baseX - treeWidth * 0.8, groundY - treeHeight * 0.3);
    ctx.lineTo(baseX - treeWidth * 0.4, groundY - treeHeight * 0.6);
    ctx.lineTo(baseX - treeWidth * 0.5, groundY - treeHeight * 0.6);
    ctx.lineTo(baseX, groundY - treeHeight); // Peak
    ctx.lineTo(baseX + treeWidth * 0.5, groundY - treeHeight * 0.6);
    ctx.lineTo(baseX + treeWidth * 0.4, groundY - treeHeight * 0.6);
    ctx.lineTo(baseX + treeWidth * 0.8, groundY - treeHeight * 0.3);
    ctx.lineTo(baseX + treeWidth * 0.6, groundY - treeHeight * 0.3);
    ctx.lineTo(baseX + treeWidth, groundY);
  }

  // Close at bottom right
  ctx.lineTo(levelWidth + 500, groundY);
  ctx.lineTo(levelWidth + 500, groundY + 200);
  ctx.closePath();
  ctx.fill();
}

// Draw a realistic mountain range with smooth, natural curves
function drawMountainRange(
  ctx: CanvasRenderingContext2D,
  parallaxOffset: number,
  baseY: number,
  levelWidth: number,
  scale: number,
  color: string
): void {
  ctx.fillStyle = color;
  ctx.beginPath();

  // Start at bottom left
  ctx.moveTo(-500, baseY + 300);

  // Create a continuous smooth mountain silhouette using noise-like variation
  const points: { x: number; y: number }[] = [];
  const segmentWidth = 20; // Small segments for smooth curves

  for (let x = -500; x < levelWidth + 1000; x += segmentWidth) {
    // Use multiple sine waves at different frequencies for natural look
    const adjustedX = (x + parallaxOffset) * 0.01;

    // Combine multiple waves for organic mountain shape
    const wave1 = Math.sin(adjustedX * 0.3) * 80 * scale; // Large slow waves
    const wave2 = Math.sin(adjustedX * 0.7 + 1.5) * 50 * scale; // Medium waves
    const wave3 = Math.sin(adjustedX * 1.5 + 3.0) * 25 * scale; // Smaller detail
    const wave4 = Math.sin(adjustedX * 2.5 + 0.5) * 15 * scale; // Fine detail

    // Create peaks at certain intervals
    const peakFactor = Math.pow(Math.sin(adjustedX * 0.15 + 2.0), 2) * 60 * scale;

    const height = 100 * scale + wave1 + wave2 + wave3 + wave4 + peakFactor;

    points.push({ x, y: baseY - Math.max(20 * scale, height) });
  }

  // Draw smooth curve through all points
  ctx.moveTo(points[0].x, baseY + 300);
  ctx.lineTo(points[0].x, points[0].y);

  // Use bezier curves for smoothness
  for (let i = 1; i < points.length - 1; i++) {
    const xc = (points[i].x + points[i + 1].x) / 2;
    const yc = (points[i].y + points[i + 1].y) / 2;
    ctx.quadraticCurveTo(points[i].x, points[i].y, xc, yc);
  }

  // Last point
  const last = points[points.length - 1];
  ctx.lineTo(last.x, last.y);

  // Close path at bottom
  ctx.lineTo(levelWidth + 500, baseY + 300);
  ctx.closePath();
  ctx.fill();
}

// Draw rolling hills with very smooth, gentle curves
function drawHillRange(
  ctx: CanvasRenderingContext2D,
  parallaxOffset: number,
  baseY: number,
  levelWidth: number,
  color: string
): void {
  ctx.fillStyle = color;
  ctx.beginPath();

  // Create smooth rolling hills using sine waves
  const points: { x: number; y: number }[] = [];
  const segmentWidth = 15;

  for (let x = -500; x < levelWidth + 1000; x += segmentWidth) {
    const adjustedX = (x + parallaxOffset) * 0.008;

    // Gentle rolling waves
    const wave1 = Math.sin(adjustedX * 0.5) * 40;
    const wave2 = Math.sin(adjustedX * 1.2 + 2.0) * 25;
    const wave3 = Math.sin(adjustedX * 2.0 + 1.0) * 10;

    const height = 30 + wave1 + wave2 + wave3;

    points.push({ x, y: baseY - Math.max(10, height) });
  }

  // Draw smooth curve
  ctx.moveTo(points[0].x, baseY + 200);
  ctx.lineTo(points[0].x, points[0].y);

  for (let i = 1; i < points.length - 1; i++) {
    const xc = (points[i].x + points[i + 1].x) / 2;
    const yc = (points[i].y + points[i + 1].y) / 2;
    ctx.quadraticCurveTo(points[i].x, points[i].y, xc, yc);
  }

  const last = points[points.length - 1];
  ctx.lineTo(last.x, last.y);

  // Close path
  ctx.lineTo(levelWidth + 500, baseY + 200);
  ctx.closePath();
  ctx.fill();
}

// Draw a single pine tree anchored to the ground with sway
function drawGroundedTree(
  ctx: CanvasRenderingContext2D,
  x: number,
  groundY: number,
  scale: number,
  swayAmount: number = 0
): void {
  const treeHeight = 280 * scale;
  const baseWidth = 80 * scale;
  const trunkWidth = 12 * scale;
  const trunkHeight = 40 * scale;

  // Sway increases toward the top of the tree
  const sway100 = swayAmount; // Full sway at top
  const sway75 = swayAmount * 0.7;
  const sway50 = swayAmount * 0.45;
  const sway25 = swayAmount * 0.2;

  // Trunk - visible at bottom, connects to ground (slight lean)
  ctx.save();
  ctx.translate(x, groundY);
  ctx.transform(1, 0, swayAmount * 0.002, 1, 0, 0); // Subtle skew
  ctx.fillRect(-trunkWidth / 2, -trunkHeight, trunkWidth, trunkHeight + 10);
  ctx.restore();

  // Pine tree silhouette - layered triangular shape with sway
  ctx.beginPath();
  ctx.moveTo(x + sway100, groundY - treeHeight); // Top peak

  // Right side - layered branches
  ctx.lineTo(x + baseWidth * 0.25 + sway75, groundY - treeHeight * 0.75);
  ctx.lineTo(x + baseWidth * 0.15 + sway75, groundY - treeHeight * 0.75);
  ctx.lineTo(x + baseWidth * 0.45 + sway50, groundY - treeHeight * 0.5);
  ctx.lineTo(x + baseWidth * 0.3 + sway50, groundY - treeHeight * 0.5);
  ctx.lineTo(x + baseWidth * 0.65 + sway25, groundY - treeHeight * 0.25);
  ctx.lineTo(x + baseWidth * 0.45 + sway25, groundY - treeHeight * 0.25);
  ctx.lineTo(x + baseWidth, groundY - trunkHeight); // Bottom right

  // Bottom - across trunk
  ctx.lineTo(x + trunkWidth / 2, groundY - trunkHeight);
  ctx.lineTo(x + trunkWidth / 2, groundY);
  ctx.lineTo(x - trunkWidth / 2, groundY);
  ctx.lineTo(x - trunkWidth / 2, groundY - trunkHeight);

  // Left side - layered branches (mirror with sway)
  ctx.lineTo(x - baseWidth, groundY - trunkHeight);
  ctx.lineTo(x - baseWidth * 0.45 + sway25, groundY - treeHeight * 0.25);
  ctx.lineTo(x - baseWidth * 0.65 + sway25, groundY - treeHeight * 0.25);
  ctx.lineTo(x - baseWidth * 0.3 + sway50, groundY - treeHeight * 0.5);
  ctx.lineTo(x - baseWidth * 0.45 + sway50, groundY - treeHeight * 0.5);
  ctx.lineTo(x - baseWidth * 0.15 + sway75, groundY - treeHeight * 0.75);
  ctx.lineTo(x - baseWidth * 0.25 + sway75, groundY - treeHeight * 0.75);

  ctx.closePath();
  ctx.fill();
}

// Render spider webs at fixed world positions
function renderSpiderWebs(ctx: CanvasRenderingContext2D, levelWidth: number): void {
  ctx.strokeStyle = 'rgba(120, 120, 125, 0.3)';
  ctx.lineWidth = 1;

  // Place webs at specific intervals
  const webPositions = [
    { x: 600, y: 420, size: 60 },
    { x: 1400, y: 380, size: 50 },
    { x: 2200, y: 440, size: 55 },
    { x: 3000, y: 400, size: 45 },
    { x: 3600, y: 430, size: 50 },
  ];

  for (const web of webPositions) {
    if (web.x < levelWidth) {
      drawSpiderWeb(ctx, web.x, web.y, web.size);
    }
  }
}

// Draw a single spider web
function drawSpiderWeb(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  size: number
): void {
  const spokes = 8;
  const rings = 4;

  ctx.save();
  ctx.translate(x, y);

  // Draw spokes (radial lines)
  for (let i = 0; i < spokes; i++) {
    const angle = (i / spokes) * Math.PI * 2;
    ctx.beginPath();
    ctx.moveTo(0, 0);
    ctx.lineTo(Math.cos(angle) * size, Math.sin(angle) * size);
    ctx.stroke();
  }

  // Draw concentric rings (spiral)
  for (let ring = 1; ring <= rings; ring++) {
    const ringRadius = (ring / rings) * size;
    ctx.beginPath();
    for (let i = 0; i <= spokes; i++) {
      const angle = (i / spokes) * Math.PI * 2;
      // Add slight irregularity to make it look natural
      const wobble = Math.sin(i * 3 + ring * 2) * 3;
      const px = Math.cos(angle) * (ringRadius + wobble);
      const py = Math.sin(angle) * (ringRadius + wobble);
      if (i === 0) {
        ctx.moveTo(px, py);
      } else {
        ctx.lineTo(px, py);
      }
    }
    ctx.stroke();
  }

  // Add anchor threads going to edges (top corners)
  ctx.beginPath();
  ctx.moveTo(0, 0);
  ctx.quadraticCurveTo(-size * 0.5, -size * 1.2, -size * 1.5, -size * 1.5);
  ctx.stroke();

  ctx.beginPath();
  ctx.moveTo(0, 0);
  ctx.quadraticCurveTo(size * 0.5, -size * 1.2, size * 1.5, -size * 1.5);
  ctx.stroke();

  ctx.restore();
}

// Render sparse foreground grass - fixed in world space
function renderForeground(
  ctx: CanvasRenderingContext2D,
  camera: Camera,
  levelData: LevelData
): void {
  // Minimal grass - only occasional tufts for atmosphere
  ctx.fillStyle = '#000000';

  // Very sparse grass tufts at wide intervals
  for (let i = 0; i < levelData.width / 250; i++) {
    const x = i * 250 + 100;
    const seed = (i * 31337) % 100000;
    // Only draw at some positions
    if (seed % 2 === 0) {
      drawGrassTuft(ctx, x, 598, 18 + ((seed * 7) % 10), seed);
    }
  }
}

// Draw a tuft of grass blades
function drawGrassTuft(
  ctx: CanvasRenderingContext2D,
  x: number,
  groundY: number,
  height: number,
  seed: number
): void {
  const bladeCount = 5 + (seed % 4);
  const spread = 25;

  for (let i = 0; i < bladeCount; i++) {
    const bladeSeed = seed + i * 777;
    const bladeX = x + ((bladeSeed * 13) % spread) - spread / 2;
    const bladeHeight = height * (0.6 + ((bladeSeed * 17) % 40) / 100);
    const lean = ((bladeSeed * 23) % 20 - 10) * 0.02;
    const curve = ((bladeSeed * 29) % 10 - 5) * 0.5;

    ctx.beginPath();
    ctx.moveTo(bladeX - 2, groundY);
    ctx.quadraticCurveTo(
      bladeX + curve + lean * bladeHeight,
      groundY - bladeHeight * 0.6,
      bladeX + lean * bladeHeight * 2,
      groundY - bladeHeight
    );
    ctx.quadraticCurveTo(
      bladeX + curve + lean * bladeHeight,
      groundY - bladeHeight * 0.6,
      bladeX + 2,
      groundY
    );
    ctx.closePath();
    ctx.fill();
  }
}



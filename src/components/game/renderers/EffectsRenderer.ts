// Post-processing effects renderer (film grain, fog, vignette)

import { GameState, LevelData } from '../../../types/game';
import { CANVAS_WIDTH, CANVAS_HEIGHT } from '../../../game/constants';

// Pre-generate noise texture for film grain
let noiseCanvas: HTMLCanvasElement | null = null;
let noiseCtx: CanvasRenderingContext2D | null = null;

// Weather system - transitions between rain, snow, and sunny
type WeatherType = 'rain' | 'snow' | 'sunny';

// Weather cycle order
const weatherCycle: WeatherType[] = ['rain', 'snow', 'sunny'];

interface WeatherState {
  current: WeatherType;
  intensity: number; // 0-1, current weather intensity
  transitionProgress: number; // 0-1, progress of transition
  isTransitioning: boolean;
  nextWeather: WeatherType;
  lastTransitionTime: number;
  transitionDuration: number; // ms
  weatherDuration: number; // ms until next transition
  brightness: number; // 0-1, environment brightness (higher for sunny)
}

const weatherState: WeatherState = {
  current: 'rain',
  intensity: 1,
  transitionProgress: 0,
  isTransitioning: false,
  nextWeather: 'snow',
  lastTransitionTime: 0,
  transitionDuration: 8000, // 8 seconds to transition
  weatherDuration: 45000, // 45 seconds per weather type
  brightness: 0, // Start dark (rain)
};

// Get target brightness for each weather type
function getWeatherBrightness(weather: WeatherType): number {
  switch (weather) {
    case 'sunny': return 0.25; // Noticeably brighter
    case 'snow': return 0.08; // Slightly brighter than rain
    case 'rain': return 0; // Darkest
    default: return 0;
  }
}

// Export weather state for audio system
export function getCurrentWeather(): { type: WeatherType; intensity: number; brightness: number } {
  return {
    type: weatherState.current,
    intensity: weatherState.intensity,
    brightness: weatherState.brightness,
  };
}

// Update weather transitions
function updateWeather(): void {
  const now = performance.now();

  if (!weatherState.lastTransitionTime) {
    weatherState.lastTransitionTime = now;
  }

  const timeSinceLastTransition = now - weatherState.lastTransitionTime;

  if (!weatherState.isTransitioning) {
    // Check if it's time to start transitioning
    if (timeSinceLastTransition > weatherState.weatherDuration) {
      weatherState.isTransitioning = true;
      // Get next weather in cycle
      const currentIndex = weatherCycle.indexOf(weatherState.current);
      const nextIndex = (currentIndex + 1) % weatherCycle.length;
      weatherState.nextWeather = weatherCycle[nextIndex];
      weatherState.transitionProgress = 0;
    }
  } else {
    // Update transition progress
    weatherState.transitionProgress = Math.min(1,
      (timeSinceLastTransition - weatherState.weatherDuration) / weatherState.transitionDuration
    );

    // Calculate intensity based on transition
    // Current weather fades out, then new weather fades in
    if (weatherState.transitionProgress < 0.5) {
      // Fading out current weather
      weatherState.intensity = 1 - (weatherState.transitionProgress * 2);
    } else {
      // Fading in new weather
      weatherState.intensity = (weatherState.transitionProgress - 0.5) * 2;
    }

    // Smoothly interpolate brightness between weather types
    const currentBrightness = getWeatherBrightness(weatherState.current);
    const nextBrightness = getWeatherBrightness(weatherState.nextWeather);
    weatherState.brightness = currentBrightness + (nextBrightness - currentBrightness) * weatherState.transitionProgress;

    // Complete transition
    if (weatherState.transitionProgress >= 1) {
      weatherState.current = weatherState.nextWeather;
      weatherState.isTransitioning = false;
      weatherState.intensity = 1;
      weatherState.brightness = getWeatherBrightness(weatherState.current);
      weatherState.lastTransitionTime = now;
    }
  }
}

// Snowflake particle
interface Snowflake {
  x: number;
  y: number;
  size: number;
  speed: number;
  wobbleSpeed: number;
  wobbleAmount: number;
  opacity: number;
  rotation: number;
  rotationSpeed: number;
}

const snowflakes: Snowflake[] = [];
let snowInitialized = false;

function initSnow(): void {
  for (let i = 0; i < 200; i++) {
    snowflakes.push(createSnowflake(Math.random() * CANVAS_HEIGHT));
  }
  snowInitialized = true;
}

function createSnowflake(startY: number = -10): Snowflake {
  return {
    x: Math.random() * (CANVAS_WIDTH + 100) - 50,
    y: startY,
    size: 2 + Math.random() * 4,
    speed: 1 + Math.random() * 2, // Slower than rain
    wobbleSpeed: 0.5 + Math.random() * 1.5,
    wobbleAmount: 20 + Math.random() * 30,
    opacity: 0.3 + Math.random() * 0.4,
    rotation: Math.random() * Math.PI * 2,
    rotationSpeed: (Math.random() - 0.5) * 0.02,
  };
}

// Lightning bolt segment for realistic rendering
interface LightningSegment {
  x1: number;
  y1: number;
  x2: number;
  y2: number;
  width: number;
  brightness: number;
  children: LightningSegment[];
}

// Lightning state - controlled by audio system via global event
interface LightningState {
  active: boolean;
  startTime: number;
  intensity: number;
  duration: number;
  flickerPattern: number[];
  bolts: LightningSegment[];
}

let lightningState: LightningState = {
  active: false,
  startTime: 0,
  intensity: 0,
  duration: 0,
  flickerPattern: [],
  bolts: [],
};

// Generate a branching lightning bolt recursively
function generateLightningBolt(
  x1: number,
  y1: number,
  x2: number,
  y2: number,
  width: number,
  brightness: number,
  depth: number = 0
): LightningSegment {
  const segment: LightningSegment = {
    x1,
    y1,
    x2,
    y2,
    width,
    brightness,
    children: [],
  };

  // Calculate segment length
  const dx = x2 - x1;
  const dy = y2 - y1;
  const length = Math.sqrt(dx * dx + dy * dy);

  // If segment is long enough, add jitter points and potentially branch
  if (length > 30 && depth < 6) {
    const midX = (x1 + x2) / 2 + (Math.random() - 0.5) * length * 0.4;
    const midY = (y1 + y2) / 2 + (Math.random() - 0.5) * length * 0.15;

    // Create two segments from the split
    const child1 = generateLightningBolt(x1, y1, midX, midY, width, brightness, depth + 1);
    const child2 = generateLightningBolt(midX, midY, x2, y2, width * 0.9, brightness * 0.95, depth + 1);

    segment.children.push(child1, child2);

    // Random chance to create a branch
    if (Math.random() < 0.35 && depth < 4) {
      const branchAngle = (Math.random() - 0.5) * Math.PI * 0.6;
      const branchLength = length * (0.3 + Math.random() * 0.4);
      const angle = Math.atan2(dy, dx) + branchAngle;

      const branchEndX = midX + Math.cos(angle) * branchLength;
      const branchEndY = midY + Math.sin(angle) * branchLength;

      const branch = generateLightningBolt(
        midX,
        midY,
        branchEndX,
        branchEndY,
        width * 0.5,
        brightness * 0.7,
        depth + 2
      );
      segment.children.push(branch);
    }
  }

  return segment;
}

// Global function to trigger lightning from audio system
export function triggerLightning(): void {
  const now = performance.now();

  // Generate random flicker pattern for realistic lightning
  const flickerCount = 2 + Math.floor(Math.random() * 3);
  const flickerPattern: number[] = [];
  let totalDuration = 0;

  for (let i = 0; i < flickerCount; i++) {
    // Each flicker: [flash duration, dark duration]
    const flashDuration = 50 + Math.random() * 100;
    const darkDuration = i < flickerCount - 1 ? 30 + Math.random() * 80 : 0;
    flickerPattern.push(flashDuration, darkDuration);
    totalDuration += flashDuration + darkDuration;
  }

  // Generate 1-3 lightning bolts from random sky positions
  const bolts: LightningSegment[] = [];
  const boltCount = 1 + Math.floor(Math.random() * 2);

  for (let i = 0; i < boltCount; i++) {
    const startX = CANVAS_WIDTH * (0.2 + Math.random() * 0.6);
    const startY = -10;
    const endX = startX + (Math.random() - 0.5) * 200;
    const endY = CANVAS_HEIGHT * (0.4 + Math.random() * 0.3);

    bolts.push(generateLightningBolt(startX, startY, endX, endY, 3, 1));
  }

  lightningState = {
    active: true,
    startTime: now,
    intensity: 0.6 + Math.random() * 0.4,
    duration: totalDuration + 200, // Extra time for fade out
    flickerPattern,
    bolts,
  };
}

// Expose trigger function globally for audio system
if (typeof window !== 'undefined') {
  (window as unknown as { triggerLightning: () => void }).triggerLightning = triggerLightning;
}

function initNoiseCanvas(): void {
  noiseCanvas = document.createElement('canvas');
  noiseCanvas.width = 256;
  noiseCanvas.height = 256;
  noiseCtx = noiseCanvas.getContext('2d');

  if (noiseCtx) {
    const imageData = noiseCtx.createImageData(256, 256);
    for (let i = 0; i < imageData.data.length; i += 4) {
      const value = Math.random() * 255;
      imageData.data[i] = value;
      imageData.data[i + 1] = value;
      imageData.data[i + 2] = value;
      imageData.data[i + 3] = 255;
    }
    noiseCtx.putImageData(imageData, 0, 0);
  }
}

export function renderEffects(
  ctx: CanvasRenderingContext2D,
  gameState: GameState,
  levelData: LevelData
): void {
  // Initialize noise canvas if needed
  if (!noiseCanvas) {
    initNoiseCanvas();
  }

  // Render fog layers
  const fogEffect = levelData.ambientEffects.find((e) => e.type === 'fog');
  if (fogEffect) {
    renderFog(ctx, fogEffect.intensity, gameState.camera.x);
  }

  // Render floating particles
  const particleEffect = levelData.ambientEffects.find((e) => e.type === 'particles');
  if (particleEffect) {
    renderParticles(ctx, particleEffect.intensity);
  }

  // Film grain overlay - much stronger for Limbo look
  renderFilmGrain(ctx, 0.18);

  // Vignette effect - very heavy dark edges
  renderVignette(ctx, 0.95);

  // Scanlines (subtle)
  renderScanlines(ctx, 0.04);

  // Additional atmosphere - light rays
  renderLightRays(ctx);

  // Falling leaves
  renderFallingLeaves(ctx);

  // Weather effect (rain or snow with transitions)
  renderWeather(ctx);

  // Lightning flash effect (synced with thunder audio)
  renderLightning(ctx);

  // Death fade effect
  if (gameState.player.isDead) {
    renderDeathEffect(ctx);
  }
}

function renderFog(
  ctx: CanvasRenderingContext2D,
  intensity: number,
  cameraX: number
): void {
  // Fog as horizontal gradient bands - no moving shapes
  // Creates atmospheric depth without distracting movement

  // Upper atmosphere haze
  const upperHaze = ctx.createLinearGradient(0, 100, 0, 400);
  upperHaze.addColorStop(0, `rgba(70, 70, 75, ${intensity * 0.15})`);
  upperHaze.addColorStop(1, 'rgba(60, 60, 65, 0)');
  ctx.fillStyle = upperHaze;
  ctx.fillRect(0, 100, CANVAS_WIDTH, 300);

  // Mid-level atmospheric haze
  const midHaze = ctx.createLinearGradient(0, 350, 0, 550);
  midHaze.addColorStop(0, 'rgba(65, 65, 70, 0)');
  midHaze.addColorStop(0.5, `rgba(60, 60, 65, ${intensity * 0.2})`);
  midHaze.addColorStop(1, 'rgba(55, 55, 60, 0)');
  ctx.fillStyle = midHaze;
  ctx.fillRect(0, 350, CANVAS_WIDTH, 200);

  // Ground mist - static gradient, no wobble
  const mistGradient = ctx.createLinearGradient(0, CANVAS_HEIGHT - 180, 0, CANVAS_HEIGHT);
  mistGradient.addColorStop(0, 'rgba(55, 55, 60, 0)');
  mistGradient.addColorStop(0.3, `rgba(50, 50, 55, ${intensity * 0.25})`);
  mistGradient.addColorStop(0.7, `rgba(48, 48, 52, ${intensity * 0.4})`);
  mistGradient.addColorStop(1, `rgba(45, 45, 50, ${intensity * 0.5})`);
  ctx.fillStyle = mistGradient;
  ctx.fillRect(0, CANVAS_HEIGHT - 180, CANVAS_WIDTH, 180);
}

function renderParticles(ctx: CanvasRenderingContext2D, intensity: number): void {
  const time = performance.now();
  const particleCount = Math.floor(100 * intensity);  // More particles

  for (let i = 0; i < particleCount; i++) {
    // Use deterministic random based on index
    const seed = i * 12345;
    const x = ((seed * 9301 + 49297) % 233280) / 233280;
    const y = ((seed * 7919 + 21013) % 179424) / 179424;
    const speed = 0.0001 + (((seed * 3571) % 1000) / 1000) * 0.0002;
    const size = 1 + (((seed * 8887) % 1000) / 1000) * 3;
    const brightness = 100 + (((seed * 4567) % 1000) / 1000) * 80;  // Variable brightness

    const particleX = (x * CANVAS_WIDTH + time * speed * 30) % CANVAS_WIDTH;
    const particleY = (y * CANVAS_HEIGHT + Math.sin(time * speed * 0.5 + i) * 50) % CANVAS_HEIGHT;

    // Brighter, more visible particles like dust/spores
    const alpha = 0.3 + (((seed * 2345) % 1000) / 1000) * 0.5;
    ctx.fillStyle = `rgba(${brightness}, ${brightness}, ${brightness + 10}, ${alpha})`;

    ctx.beginPath();
    ctx.arc(particleX, particleY, size, 0, Math.PI * 2);
    ctx.fill();
  }

  // Add some larger floating dust motes
  for (let i = 0; i < 15; i++) {
    const seed = i * 54321;
    const x = ((seed * 7654 + 12345) % 233280) / 233280;
    const y = ((seed * 3456 + 78901) % 179424) / 179424;
    const speed = 0.00005 + (((seed * 2222) % 1000) / 1000) * 0.0001;

    const particleX = (x * CANVAS_WIDTH + time * speed * 20) % CANVAS_WIDTH;
    const particleY = (y * CANVAS_HEIGHT * 0.7 + Math.sin(time * speed * 0.3 + i) * 80) % (CANVAS_HEIGHT * 0.7);

    // Large glowing dust motes
    const gradient = ctx.createRadialGradient(particleX, particleY, 0, particleX, particleY, 8);
    gradient.addColorStop(0, 'rgba(150, 150, 155, 0.4)');
    gradient.addColorStop(1, 'rgba(150, 150, 155, 0)');
    ctx.fillStyle = gradient;
    ctx.beginPath();
    ctx.arc(particleX, particleY, 8, 0, Math.PI * 2);
    ctx.fill();
  }
}

function renderFilmGrain(ctx: CanvasRenderingContext2D, intensity: number): void {
  if (!noiseCanvas) return;

  ctx.save();
  ctx.globalAlpha = intensity;
  ctx.globalCompositeOperation = 'overlay';

  // Tile the noise texture
  const offsetX = Math.random() * 256;
  const offsetY = Math.random() * 256;

  for (let x = -offsetX; x < CANVAS_WIDTH; x += 256) {
    for (let y = -offsetY; y < CANVAS_HEIGHT; y += 256) {
      ctx.drawImage(noiseCanvas, x, y);
    }
  }

  ctx.restore();
}

function renderVignette(ctx: CanvasRenderingContext2D, intensity: number): void {
  // Heavy vignette like Limbo - very dark edges
  const gradient = ctx.createRadialGradient(
    CANVAS_WIDTH / 2,
    CANVAS_HEIGHT / 2,
    CANVAS_HEIGHT * 0.2,  // Smaller clear center
    CANVAS_WIDTH / 2,
    CANVAS_HEIGHT / 2,
    CANVAS_WIDTH * 0.7  // Closer edge
  );

  gradient.addColorStop(0, 'rgba(0, 0, 0, 0)');
  gradient.addColorStop(0.3, 'rgba(0, 0, 0, 0.1)');
  gradient.addColorStop(0.6, `rgba(0, 0, 0, ${intensity * 0.5})`);
  gradient.addColorStop(0.8, `rgba(0, 0, 0, ${intensity * 0.8})`);
  gradient.addColorStop(1, `rgba(0, 0, 0, ${intensity})`);

  ctx.fillStyle = gradient;
  ctx.fillRect(0, 0, CANVAS_WIDTH, CANVAS_HEIGHT);

  // Additional corner darkening
  const cornerSize = 300;

  // Top-left corner
  const tlGradient = ctx.createRadialGradient(0, 0, 0, 0, 0, cornerSize);
  tlGradient.addColorStop(0, 'rgba(0, 0, 0, 0.9)');
  tlGradient.addColorStop(1, 'rgba(0, 0, 0, 0)');
  ctx.fillStyle = tlGradient;
  ctx.fillRect(0, 0, cornerSize, cornerSize);

  // Top-right corner
  const trGradient = ctx.createRadialGradient(CANVAS_WIDTH, 0, 0, CANVAS_WIDTH, 0, cornerSize);
  trGradient.addColorStop(0, 'rgba(0, 0, 0, 0.9)');
  trGradient.addColorStop(1, 'rgba(0, 0, 0, 0)');
  ctx.fillStyle = trGradient;
  ctx.fillRect(CANVAS_WIDTH - cornerSize, 0, cornerSize, cornerSize);

  // Bottom-left corner
  const blGradient = ctx.createRadialGradient(0, CANVAS_HEIGHT, 0, 0, CANVAS_HEIGHT, cornerSize);
  blGradient.addColorStop(0, 'rgba(0, 0, 0, 0.9)');
  blGradient.addColorStop(1, 'rgba(0, 0, 0, 0)');
  ctx.fillStyle = blGradient;
  ctx.fillRect(0, CANVAS_HEIGHT - cornerSize, cornerSize, cornerSize);

  // Bottom-right corner
  const brGradient = ctx.createRadialGradient(CANVAS_WIDTH, CANVAS_HEIGHT, 0, CANVAS_WIDTH, CANVAS_HEIGHT, cornerSize);
  brGradient.addColorStop(0, 'rgba(0, 0, 0, 0.9)');
  brGradient.addColorStop(1, 'rgba(0, 0, 0, 0)');
  ctx.fillStyle = brGradient;
  ctx.fillRect(CANVAS_WIDTH - cornerSize, CANVAS_HEIGHT - cornerSize, cornerSize, cornerSize);
}

function renderScanlines(ctx: CanvasRenderingContext2D, intensity: number): void {
  ctx.fillStyle = `rgba(0, 0, 0, ${intensity})`;

  for (let y = 0; y < CANVAS_HEIGHT; y += 4) {
    ctx.fillRect(0, y, CANVAS_WIDTH, 1);
  }
}

function renderDeathEffect(ctx: CanvasRenderingContext2D): void {
  // Red tint that fades in
  const time = performance.now();
  const fadeIn = Math.min(1, (time % 2000) / 1000);

  ctx.fillStyle = `rgba(20, 0, 0, ${fadeIn * 0.5})`;
  ctx.fillRect(0, 0, CANVAS_WIDTH, CANVAS_HEIGHT);

  // Blur effect (simulated with semi-transparent overlay)
  ctx.fillStyle = `rgba(10, 10, 10, ${fadeIn * 0.3})`;
  ctx.fillRect(0, 0, CANVAS_WIDTH, CANVAS_HEIGHT);
}

function renderLightRays(ctx: CanvasRenderingContext2D): void {
  const time = performance.now() * 0.0005;

  ctx.save();

  // Soft, diffuse light patches - like hazy light through forest canopy
  // Not defined beams, just subtle brighter areas

  const hazePatches = [
    { x: 300, y: 150, size: 250, intensity: 0.025 },
    { x: 650, y: 200, size: 300, intensity: 0.03 },
    { x: 1000, y: 180, size: 280, intensity: 0.025 },
    { x: 450, y: 350, size: 200, intensity: 0.02 },
    { x: 850, y: 320, size: 220, intensity: 0.02 },
  ];

  for (let i = 0; i < hazePatches.length; i++) {
    const patch = hazePatches[i];

    // Very slow drift
    const driftX = Math.sin(time * 0.3 + i * 1.5) * 20;
    const driftY = Math.sin(time * 0.2 + i * 2.1) * 10;

    // Subtle breathing
    const breathe = 0.8 + Math.sin(time * 0.4 + i) * 0.2;
    const alpha = patch.intensity * breathe;

    // Soft radial gradient - very diffuse
    const gradient = ctx.createRadialGradient(
      patch.x + driftX, patch.y + driftY, 0,
      patch.x + driftX, patch.y + driftY, patch.size
    );
    gradient.addColorStop(0, `rgba(120, 120, 125, ${alpha})`);
    gradient.addColorStop(0.4, `rgba(100, 100, 105, ${alpha * 0.5})`);
    gradient.addColorStop(0.7, `rgba(80, 80, 85, ${alpha * 0.2})`);
    gradient.addColorStop(1, 'rgba(60, 60, 65, 0)');

    ctx.fillStyle = gradient;
    ctx.beginPath();
    ctx.arc(patch.x + driftX, patch.y + driftY, patch.size, 0, Math.PI * 2);
    ctx.fill();
  }

  // Very faint vertical light suggestion - barely visible
  for (let i = 0; i < 3; i++) {
    const seed = i * 5555;
    const x = 250 + i * 400 + ((seed * 1234) % 100);
    const wobble = Math.sin(time * 0.2 + i * 2) * 10;

    // Extremely subtle vertical gradient
    const rayGradient = ctx.createLinearGradient(x + wobble, 0, x + wobble, CANVAS_HEIGHT * 0.6);
    rayGradient.addColorStop(0, 'rgba(100, 100, 105, 0.03)');
    rayGradient.addColorStop(0.5, 'rgba(90, 90, 95, 0.015)');
    rayGradient.addColorStop(1, 'rgba(80, 80, 85, 0)');

    ctx.fillStyle = rayGradient;
    ctx.beginPath();
    ctx.moveTo(x + wobble - 60, 0);
    ctx.lineTo(x + wobble + 60, 0);
    ctx.lineTo(x + wobble + 100, CANVAS_HEIGHT * 0.6);
    ctx.lineTo(x + wobble - 100, CANVAS_HEIGHT * 0.6);
    ctx.closePath();
    ctx.fill();
  }

  ctx.restore();
}

function renderFallingLeaves(ctx: CanvasRenderingContext2D): void {
  const time = performance.now();
  const leafCount = 8; // Sparse - just a few leaves

  ctx.fillStyle = 'rgba(30, 30, 32, 0.6)';

  for (let i = 0; i < leafCount; i++) {
    const seed = i * 54321;

    // Deterministic starting position
    const startX = ((seed * 1234) % CANVAS_WIDTH);
    const swaySpeed = 0.001 + ((seed * 3) % 5) * 0.0003;
    const swayAmount = 30 + ((seed * 11) % 20);

    // Calculate current position based on time
    const cycleTime = 15000 + ((seed * 13) % 5000); // 15-20 second fall cycle
    const progress = (time + seed * 100) % cycleTime / cycleTime;

    const x = startX + Math.sin(time * swaySpeed + seed) * swayAmount;
    const y = progress * (CANVAS_HEIGHT + 50) - 25;

    // Rotation based on sway
    const rotation = Math.sin(time * swaySpeed * 2 + seed) * 0.5;

    // Draw simple leaf shape
    ctx.save();
    ctx.translate(x, y);
    ctx.rotate(rotation);

    // Leaf silhouette
    ctx.beginPath();
    ctx.ellipse(0, 0, 4, 8, 0, 0, Math.PI * 2);
    ctx.fill();

    // Stem
    ctx.strokeStyle = 'rgba(30, 30, 32, 0.6)';
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(0, 8);
    ctx.lineTo(0, 12);
    ctx.stroke();

    ctx.restore();
  }
}

// Rain droplet and splash particle system
interface RainDrop {
  x: number;
  y: number;
  speed: number;
  length: number;
  opacity: number;
}

interface RainSplash {
  x: number;
  y: number;
  life: number;
  maxLife: number;
  particles: { dx: number; dy: number; size: number }[];
}

const rainDrops: RainDrop[] = [];
const rainSplashes: RainSplash[] = [];
let rainInitialized = false;

function initRain(): void {
  // Create initial rain drops
  for (let i = 0; i < 150; i++) {
    rainDrops.push(createRainDrop(Math.random() * CANVAS_HEIGHT));
  }
  rainInitialized = true;
}

function createRainDrop(startY: number = -10): RainDrop {
  return {
    x: Math.random() * (CANVAS_WIDTH + 100) - 50,
    y: startY,
    speed: 8 + Math.random() * 6, // Variable fall speed
    length: 10 + Math.random() * 15, // Drop length
    opacity: 0.1 + Math.random() * 0.2, // Subtle opacity
  };
}

function createSplash(x: number, y: number): void {
  const particleCount = 3 + Math.floor(Math.random() * 3);
  const particles: { dx: number; dy: number; size: number }[] = [];

  for (let i = 0; i < particleCount; i++) {
    const angle = -Math.PI / 2 + (Math.random() - 0.5) * Math.PI * 0.8;
    const speed = 1 + Math.random() * 2;
    particles.push({
      dx: Math.cos(angle) * speed,
      dy: Math.sin(angle) * speed,
      size: 1 + Math.random() * 1.5,
    });
  }

  rainSplashes.push({
    x,
    y,
    life: 1,
    maxLife: 1,
    particles,
  });
}

function renderRain(ctx: CanvasRenderingContext2D, intensity: number = 1): void {
  if (!rainInitialized) {
    initRain();
  }

  if (intensity <= 0) return;

  const groundY = CANVAS_HEIGHT - 50; // Ground level for splashes
  const windAngle = 0.15; // Slight wind angle

  ctx.save();

  // Update and render rain drops
  ctx.strokeStyle = 'rgba(180, 180, 185, 0.3)';
  ctx.lineCap = 'round';

  for (let i = 0; i < rainDrops.length; i++) {
    const drop = rainDrops[i];

    // Update position
    drop.y += drop.speed;
    drop.x += drop.speed * windAngle; // Wind effect

    // Check if hit ground
    if (drop.y > groundY) {
      // Create splash
      if (Math.random() < 0.3 * intensity) { // Fewer splashes at lower intensity
        createSplash(drop.x, groundY);
      }
      // Reset drop
      rainDrops[i] = createRainDrop();
      continue;
    }

    // Render drop as a line with intensity-based opacity
    ctx.globalAlpha = drop.opacity * intensity;
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(drop.x, drop.y);
    ctx.lineTo(
      drop.x + drop.length * windAngle,
      drop.y + drop.length
    );
    ctx.stroke();
  }

  // Update and render splashes
  ctx.globalAlpha = 1;
  ctx.fillStyle = 'rgba(180, 180, 185, 0.4)';

  for (let i = rainSplashes.length - 1; i >= 0; i--) {
    const splash = rainSplashes[i];

    // Update life
    splash.life -= 0.08;

    if (splash.life <= 0) {
      rainSplashes.splice(i, 1);
      continue;
    }

    // Render splash particles
    const alpha = splash.life * 0.5;
    ctx.fillStyle = `rgba(180, 180, 185, ${alpha})`;

    for (const p of splash.particles) {
      const progress = 1 - splash.life;
      const px = splash.x + p.dx * progress * 8;
      const py = splash.y + p.dy * progress * 8 + progress * progress * 4; // Gravity

      ctx.beginPath();
      ctx.arc(px, py, p.size * splash.life, 0, Math.PI * 2);
      ctx.fill();
    }

    // Render ripple ring on ground
    const rippleSize = (1 - splash.life) * 8;
    ctx.strokeStyle = `rgba(180, 180, 185, ${alpha * 0.5})`;
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.ellipse(splash.x, splash.y + 2, rippleSize, rippleSize * 0.3, 0, 0, Math.PI * 2);
    ctx.stroke();
  }

  ctx.restore();
}

// Render snow particles
function renderSnow(ctx: CanvasRenderingContext2D, intensity: number): void {
  if (!snowInitialized) {
    initSnow();
  }

  if (intensity <= 0) return;

  const time = performance.now() * 0.001;
  const groundY = CANVAS_HEIGHT - 50;

  ctx.save();

  // Update and render snowflakes
  for (let i = 0; i < snowflakes.length; i++) {
    const flake = snowflakes[i];

    // Update position with gentle wobble
    flake.y += flake.speed;
    flake.x += Math.sin(time * flake.wobbleSpeed + i) * 0.5;
    flake.rotation += flake.rotationSpeed;

    // Reset if off screen
    if (flake.y > groundY + 20) {
      snowflakes[i] = createSnowflake(-10);
      continue;
    }

    // Render snowflake with intensity-based opacity
    const alpha = flake.opacity * intensity;
    ctx.fillStyle = `rgba(220, 225, 235, ${alpha})`;

    ctx.save();
    ctx.translate(flake.x, flake.y);
    ctx.rotate(flake.rotation);

    // Draw snowflake shape (simple circle with slight glow)
    ctx.beginPath();
    ctx.arc(0, 0, flake.size, 0, Math.PI * 2);
    ctx.fill();

    // Small highlight
    ctx.fillStyle = `rgba(255, 255, 255, ${alpha * 0.5})`;
    ctx.beginPath();
    ctx.arc(-flake.size * 0.2, -flake.size * 0.2, flake.size * 0.3, 0, Math.PI * 2);
    ctx.fill();

    ctx.restore();
  }

  // Render snow accumulation effect at ground level (subtle white mist)
  const snowMist = ctx.createLinearGradient(0, groundY - 30, 0, groundY + 20);
  snowMist.addColorStop(0, `rgba(200, 205, 215, 0)`);
  snowMist.addColorStop(0.5, `rgba(180, 185, 195, ${0.1 * intensity})`);
  snowMist.addColorStop(1, `rgba(160, 165, 175, ${0.15 * intensity})`);
  ctx.fillStyle = snowMist;
  ctx.fillRect(0, groundY - 30, CANVAS_WIDTH, 70);

  ctx.restore();
}

// Render weather (rain or snow based on current weather state)
// Render sunny weather effects (light rays, warmth)
function renderSunny(ctx: CanvasRenderingContext2D, intensity: number): void {
  if (intensity <= 0) return;

  const time = performance.now() * 0.0003;

  ctx.save();

  // Subtle warm light rays from upper area
  ctx.globalCompositeOperation = 'lighter';

  // Create diagonal sun rays
  for (let i = 0; i < 5; i++) {
    const rayX = 200 + i * 250 + Math.sin(time + i * 0.7) * 30;
    const rayWidth = 80 + Math.sin(time * 0.5 + i) * 20;

    const rayGradient = ctx.createLinearGradient(rayX, 0, rayX + rayWidth, CANVAS_HEIGHT * 0.7);
    rayGradient.addColorStop(0, `rgba(255, 250, 230, ${0.03 * intensity})`);
    rayGradient.addColorStop(0.3, `rgba(255, 245, 220, ${0.02 * intensity})`);
    rayGradient.addColorStop(1, 'rgba(255, 240, 200, 0)');

    ctx.fillStyle = rayGradient;
    ctx.beginPath();
    ctx.moveTo(rayX - rayWidth, 0);
    ctx.lineTo(rayX + rayWidth, 0);
    ctx.lineTo(rayX + rayWidth * 2.5, CANVAS_HEIGHT * 0.7);
    ctx.lineTo(rayX - rayWidth * 0.5, CANVAS_HEIGHT * 0.7);
    ctx.closePath();
    ctx.fill();
  }

  // Floating dust motes in sunlight
  for (let i = 0; i < 30; i++) {
    const seed = i * 7777;
    const x = ((seed * 1234) % CANVAS_WIDTH);
    const baseY = ((seed * 5678) % (CANVAS_HEIGHT * 0.6));
    const floatY = baseY + Math.sin(time * 2 + i * 0.5) * 15;
    const floatX = x + Math.sin(time * 1.5 + i * 0.3) * 10;
    const size = 1.5 + ((seed * 111) % 100) / 50;
    const alpha = (0.3 + Math.sin(time * 3 + i) * 0.2) * intensity;

    ctx.fillStyle = `rgba(255, 250, 230, ${alpha})`;
    ctx.beginPath();
    ctx.arc(floatX, floatY, size, 0, Math.PI * 2);
    ctx.fill();
  }

  ctx.restore();
}

// Apply brightness overlay based on weather
function renderBrightnessOverlay(ctx: CanvasRenderingContext2D): void {
  const brightness = weatherState.brightness;
  if (brightness <= 0) return;

  ctx.save();

  // Lighten the entire scene subtly
  ctx.globalCompositeOperation = 'lighter';

  // Overall brightness boost
  ctx.fillStyle = `rgba(180, 175, 165, ${brightness * 0.15})`;
  ctx.fillRect(0, 0, CANVAS_WIDTH, CANVAS_HEIGHT);

  // Slightly warm tint for sunny
  if (weatherState.current === 'sunny' || weatherState.nextWeather === 'sunny') {
    const sunnyAmount = weatherState.current === 'sunny' ? weatherState.intensity :
      (weatherState.nextWeather === 'sunny' && weatherState.transitionProgress > 0.5 ?
        weatherState.intensity : 0);

    if (sunnyAmount > 0) {
      ctx.fillStyle = `rgba(255, 245, 220, ${sunnyAmount * 0.05})`;
      ctx.fillRect(0, 0, CANVAS_WIDTH, CANVAS_HEIGHT);
    }
  }

  ctx.restore();
}

function renderWeather(ctx: CanvasRenderingContext2D): void {
  updateWeather();

  const { current, intensity, isTransitioning, transitionProgress } = weatherState;

  // Render precipitation based on weather type
  if (isTransitioning) {
    // During transition, render both with appropriate intensities
    if (transitionProgress < 0.5) {
      // Still showing current weather, fading out
      if (current === 'rain') {
        renderRain(ctx, intensity);
      } else if (current === 'snow') {
        renderSnow(ctx, intensity);
      } else if (current === 'sunny') {
        renderSunny(ctx, intensity);
      }
    } else {
      // Showing next weather, fading in
      if (weatherState.nextWeather === 'rain') {
        renderRain(ctx, intensity);
      } else if (weatherState.nextWeather === 'snow') {
        renderSnow(ctx, intensity);
      } else if (weatherState.nextWeather === 'sunny') {
        renderSunny(ctx, intensity);
      }
    }
  } else {
    // Normal rendering
    if (current === 'rain') {
      renderRain(ctx, intensity);
    } else if (current === 'snow') {
      renderSnow(ctx, intensity);
    } else if (current === 'sunny') {
      renderSunny(ctx, intensity);
    }
  }

  // Apply brightness overlay for visibility changes
  renderBrightnessOverlay(ctx);
}

// Recursively draw lightning bolt segments
function drawLightningSegment(
  ctx: CanvasRenderingContext2D,
  segment: LightningSegment,
  intensity: number
): void {
  // If this segment has children, draw them instead (recursive subdivision)
  if (segment.children.length > 0) {
    for (const child of segment.children) {
      drawLightningSegment(ctx, child, intensity);
    }
    return;
  }

  const alpha = segment.brightness * intensity;

  // Draw outer glow (wide, dim)
  ctx.strokeStyle = `rgba(150, 170, 255, ${alpha * 0.3})`;
  ctx.lineWidth = segment.width * 6;
  ctx.lineCap = 'round';
  ctx.beginPath();
  ctx.moveTo(segment.x1, segment.y1);
  ctx.lineTo(segment.x2, segment.y2);
  ctx.stroke();

  // Draw middle glow
  ctx.strokeStyle = `rgba(200, 210, 255, ${alpha * 0.5})`;
  ctx.lineWidth = segment.width * 3;
  ctx.beginPath();
  ctx.moveTo(segment.x1, segment.y1);
  ctx.lineTo(segment.x2, segment.y2);
  ctx.stroke();

  // Draw core (bright white)
  ctx.strokeStyle = `rgba(255, 255, 255, ${alpha})`;
  ctx.lineWidth = segment.width;
  ctx.beginPath();
  ctx.moveTo(segment.x1, segment.y1);
  ctx.lineTo(segment.x2, segment.y2);
  ctx.stroke();
}

function renderLightning(ctx: CanvasRenderingContext2D): void {
  if (!lightningState.active) return;

  const now = performance.now();
  const elapsed = now - lightningState.startTime;

  // Check if lightning effect is over
  if (elapsed > lightningState.duration) {
    lightningState.active = false;
    return;
  }

  // Calculate current flash intensity based on flicker pattern
  let currentIntensity = 0;
  let timeAccum = 0;

  for (let i = 0; i < lightningState.flickerPattern.length; i += 2) {
    const flashDuration = lightningState.flickerPattern[i];
    const darkDuration = lightningState.flickerPattern[i + 1] || 0;

    if (elapsed < timeAccum + flashDuration) {
      // We're in a flash phase
      const flashProgress = (elapsed - timeAccum) / flashDuration;
      // Quick attack, slower decay within each flash
      currentIntensity = lightningState.intensity * (1 - flashProgress * 0.5);
      break;
    }
    timeAccum += flashDuration;

    if (elapsed < timeAccum + darkDuration) {
      // We're in a dark phase between flickers
      currentIntensity = 0;
      break;
    }
    timeAccum += darkDuration;
  }

  // After all flickers, fade out
  const totalFlickerTime = lightningState.flickerPattern.reduce((a, b) => a + b, 0);
  if (elapsed > totalFlickerTime) {
    const fadeProgress = (elapsed - totalFlickerTime) / 200; // 200ms fade out
    currentIntensity = lightningState.intensity * 0.3 * (1 - fadeProgress);
  }

  if (currentIntensity <= 0) return;

  ctx.save();

  // Main flash - bright white/blue overlay across sky
  ctx.globalCompositeOperation = 'lighter';

  // Sky illumination gradient (brighter at top)
  const skyGradient = ctx.createLinearGradient(0, 0, 0, CANVAS_HEIGHT);
  skyGradient.addColorStop(0, `rgba(200, 210, 255, ${currentIntensity * 0.5})`);
  skyGradient.addColorStop(0.3, `rgba(180, 190, 255, ${currentIntensity * 0.3})`);
  skyGradient.addColorStop(0.6, `rgba(150, 160, 200, ${currentIntensity * 0.1})`);
  skyGradient.addColorStop(1, 'rgba(100, 110, 150, 0)');
  ctx.fillStyle = skyGradient;
  ctx.fillRect(0, 0, CANVAS_WIDTH, CANVAS_HEIGHT);

  // Draw lightning bolts
  for (const bolt of lightningState.bolts) {
    drawLightningSegment(ctx, bolt, currentIntensity);

    // Add glow around the bolt origin
    const glowGradient = ctx.createRadialGradient(
      bolt.x1, bolt.y1, 0,
      bolt.x1, bolt.y1, 150
    );
    glowGradient.addColorStop(0, `rgba(255, 255, 255, ${currentIntensity * 0.4})`);
    glowGradient.addColorStop(0.3, `rgba(200, 210, 255, ${currentIntensity * 0.2})`);
    glowGradient.addColorStop(1, 'rgba(150, 160, 255, 0)');
    ctx.fillStyle = glowGradient;
    ctx.beginPath();
    ctx.arc(bolt.x1, bolt.y1, 150, 0, Math.PI * 2);
    ctx.fill();
  }

  // Subtle ambient flash across the whole scene
  ctx.fillStyle = `rgba(180, 190, 220, ${currentIntensity * 0.15})`;
  ctx.fillRect(0, 0, CANVAS_WIDTH, CANVAS_HEIGHT);

  ctx.restore();
}

// Game constants and configuration

import { GameConfig } from '../types/game';

export const GAME_CONFIG: GameConfig = {
  gravity: 0.8,
  playerSpeed: 5,
  playerJumpForce: 15,
  friction: 0.85,
  maxFallSpeed: 18,
};

export const CANVAS_WIDTH = 1280;
export const CANVAS_HEIGHT = 720;

export const PLAYER_WIDTH = 30;
export const PLAYER_HEIGHT = 50;

// Physics constants
export const GROUND_FRICTION = 0.8;
export const AIR_FRICTION = 0.95;
export const PUSH_SPEED = 2;

// Rope physics constants (constraint-based swing)
export const ROPE_GRAB_DISTANCE = 60;
export const ROPE_SWING_ACCEL = 0.15;      // How fast player can pump the swing
export const ROPE_AIR_RESISTANCE = 0.99;   // Subtle damping per frame
export const ROPE_MAX_SWING_SPEED = 8;     // Cap on horizontal velocity while swinging

// Animation timing (in frames)
export const ANIMATION_SPEEDS = {
  idle: 12,
  walking: 8,
  running: 6,
  jumping: 1,
  falling: 1,
  pushing: 10,
  dying: 4,
};

// Colors for the silhouette style - high contrast like Limbo
export const COLORS = {
  background: '#3a3a3a',  // Lighter gray background for contrast
  fog: 'rgba(80, 80, 85, 0.7)',  // Brighter, more visible fog
  player: '#000000',  // Pure black silhouette
  platform: '#000000',  // Pure black platforms
  hazard: '#000000',  // Pure black hazards
  foreground: '#000000',  // Pure black foreground
  accent: '#1a1a1a',  // Subtle accent
  highlight: '#4a4a4a',  // Brighter highlight
};

// Key bindings
export const KEY_BINDINGS = {
  left: ['ArrowLeft', 'KeyA'],
  right: ['ArrowRight', 'KeyD'],
  jump: ['ArrowUp', 'KeyW', 'Space'],
  action: ['KeyE', 'ShiftLeft', 'ShiftRight'],
};

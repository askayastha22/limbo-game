// Core game types for Limbo-style game

export interface Vector2D {
  x: number;
  y: number;
}

export interface Rectangle {
  x: number;
  y: number;
  width: number;
  height: number;
}

export interface Player {
  position: Vector2D;
  velocity: Vector2D;
  width: number;
  height: number;
  isGrounded: boolean;
  isJumping: boolean;
  isDead: boolean;
  isGrabbing: boolean;
  isOnRope: boolean;
  attachedRopeId: string | null;
  ropeGrabCooldown: number;
  isOnLadder: boolean;
  attachedLadderId: string | null;
  ladderGrabCooldown: number;
  facingRight: boolean;
  animationState: PlayerAnimationState;
}

export type PlayerAnimationState =
  | 'idle'
  | 'walking'
  | 'running'
  | 'jumping'
  | 'falling'
  | 'grabbing'
  | 'pushing'
  | 'swinging'
  | 'climbing'
  | 'dying';

export interface Platform {
  id: string;
  x: number;
  y: number;
  width: number;
  height: number;
  type: 'solid' | 'one-way' | 'moving' | 'crumbling';
  movingConfig?: {
    startX: number;
    endX: number;
    startY: number;
    endY: number;
    speed: number;
    currentDirection: 1 | -1;
  };
}

export interface Hazard {
  id: string;
  x: number;
  y: number;
  width: number;
  height: number;
  type: 'spike' | 'saw' | 'water' | 'bearTrap' | 'crusher';
  isActive: boolean;
  animationPhase?: number;
}

export interface PushableObject {
  id: string;
  x: number;
  y: number;
  width: number;
  height: number;
  type: 'box' | 'boulder' | 'log';
  velocity: Vector2D;
  isBeingPushed: boolean;
}

export interface Switch {
  id: string;
  x: number;
  y: number;
  width: number;
  height: number;
  type: 'lever' | 'button' | 'pressurePlate';
  isActivated: boolean;
  targetIds: string[];
}

export interface Rope {
  id: string;
  anchorX: number;
  anchorY: number;
  length: number;
  angle: number;
  angularVelocity: number;
}

export interface Ladder {
  id: string;
  x: number;
  y: number;
  width: number;
  height: number;
  rungSpacing: number;
}

export interface Checkpoint {
  id: string;
  x: number;
  y: number;
  width: number;
  height: number;
  isActivated: boolean;
}

export interface LevelData {
  id: string;
  name: string;
  width: number;
  height: number;
  playerStart: Vector2D;
  platforms: Platform[];
  hazards: Hazard[];
  pushableObjects: PushableObject[];
  switches: Switch[];
  ropes: Rope[];
  ladders: Ladder[];
  checkpoints: Checkpoint[];
  exitZone: Rectangle;
  ambientEffects: AmbientEffect[];
}

export interface AmbientEffect {
  type: 'fog' | 'particles' | 'rain' | 'mist';
  intensity: number;
  config?: Record<string, unknown>;
}

export interface GameState {
  isPlaying: boolean;
  isPaused: boolean;
  currentLevel: number;
  player: Player;
  camera: Camera;
  lastCheckpoint: Vector2D | null;
  deathCount: number;
  levelData: LevelData | null;
}

export interface Camera {
  x: number;
  y: number;
  zoom: number;
  shake: number;
}

export interface InputState {
  left: boolean;
  right: boolean;
  jump: boolean;
  action: boolean;
}

export interface GameConfig {
  gravity: number;
  playerSpeed: number;
  playerJumpForce: number;
  friction: number;
  maxFallSpeed: number;
}

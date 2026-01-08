// Physics engine for the game

import {
  Player,
  Platform,
  PushableObject,
  InputState,
  Vector2D,
  LevelData,
} from '../types/game';
import { GAME_CONFIG, GROUND_FRICTION, AIR_FRICTION, PUSH_SPEED } from './constants';
import {
  checkPlatformCollision,
  checkPushableCollision,
  clamp,
  CollisionResult,
} from '../utils/collision';

export function updatePlayerPhysics(
  player: Player,
  input: InputState,
  levelData: LevelData,
  deltaTime: number
): Player {
  if (player.isDead) return player;

  const dt = deltaTime / 16.67; // Normalize to 60fps
  let newPlayer = { ...player };
  const prevPosition = { ...player.position };

  // Horizontal movement
  let targetVelX = 0;
  if (input.left) {
    targetVelX = -GAME_CONFIG.playerSpeed;
    newPlayer.facingRight = false;
  }
  if (input.right) {
    targetVelX = GAME_CONFIG.playerSpeed;
    newPlayer.facingRight = true;
  }

  // Apply acceleration
  const acceleration = newPlayer.isGrounded ? 0.3 : 0.15;
  newPlayer.velocity.x += (targetVelX - newPlayer.velocity.x) * acceleration * dt;

  // Apply friction
  const friction = newPlayer.isGrounded ? GROUND_FRICTION : AIR_FRICTION;
  if (Math.abs(targetVelX) < 0.1) {
    newPlayer.velocity.x *= Math.pow(friction, dt);
  }

  // Jumping
  if (input.jump && newPlayer.isGrounded && !newPlayer.isJumping) {
    newPlayer.velocity.y = -GAME_CONFIG.playerJumpForce;
    newPlayer.isJumping = true;
    newPlayer.isGrounded = false;
  }

  // Release jump for variable height
  if (!input.jump && newPlayer.velocity.y < -GAME_CONFIG.playerJumpForce * 0.5) {
    newPlayer.velocity.y = -GAME_CONFIG.playerJumpForce * 0.5;
  }

  // Apply gravity
  newPlayer.velocity.y += GAME_CONFIG.gravity * dt;
  newPlayer.velocity.y = clamp(newPlayer.velocity.y, -GAME_CONFIG.maxFallSpeed, GAME_CONFIG.maxFallSpeed);

  // Update position
  newPlayer.position.x += newPlayer.velocity.x * dt;
  newPlayer.position.y += newPlayer.velocity.y * dt;

  // Reset grounded state (will be set by collision detection)
  newPlayer.isGrounded = false;

  // Check platform collisions
  for (const platform of levelData.platforms) {
    const collision = checkPlatformCollision(newPlayer, platform, prevPosition);
    if (collision.collides) {
      newPlayer = resolveCollision(newPlayer, collision, platform);
    }
  }

  // Check pushable object collisions
  for (const pushable of levelData.pushableObjects) {
    const collision = checkPushableCollision(newPlayer, pushable, prevPosition);
    if (collision.collides) {
      if (collision.direction === 'top') {
        // Land on top of the pushable object
        newPlayer.position.y = pushable.y - newPlayer.height;
        newPlayer.velocity.y = 0;
        newPlayer.isGrounded = true;
        newPlayer.isJumping = false;
      } else if (collision.direction === 'bottom') {
        // Hit head on bottom of pushable
        newPlayer.position.y = pushable.y + pushable.height;
        newPlayer.velocity.y = 0;
      } else if (collision.direction === 'right') {
        // Colliding from the left side of the pushable (player's right edge hits pushable's left edge)
        newPlayer.position.x = pushable.x - newPlayer.width;
        newPlayer.velocity.x = 0;
        // Can push the object if holding action
        if (input.action) {
          newPlayer.isGrabbing = true;
        }
      } else if (collision.direction === 'left') {
        // Colliding from the right side of the pushable (player's left edge hits pushable's right edge)
        newPlayer.position.x = pushable.x + pushable.width;
        newPlayer.velocity.x = 0;
        // Can push the object if holding action
        if (input.action) {
          newPlayer.isGrabbing = true;
        }
      }
    }
  }

  // Update animation state
  newPlayer.animationState = getAnimationState(newPlayer, input);

  // Reset jump flag when grounded
  if (newPlayer.isGrounded) {
    newPlayer.isJumping = false;
  }

  return newPlayer;
}

function resolveCollision(
  player: Player,
  collision: CollisionResult,
  platform: Platform
): Player {
  const newPlayer = { ...player };

  switch (collision.direction) {
    case 'top':
      newPlayer.position.y = platform.y - player.height;
      newPlayer.velocity.y = 0;
      newPlayer.isGrounded = true;
      newPlayer.isJumping = false;
      break;
    case 'bottom':
      newPlayer.position.y = platform.y + platform.height;
      newPlayer.velocity.y = 0;
      break;
    case 'left':
      newPlayer.position.x = platform.x + platform.width;
      newPlayer.velocity.x = 0;
      break;
    case 'right':
      newPlayer.position.x = platform.x - player.width;
      newPlayer.velocity.x = 0;
      break;
  }

  return newPlayer;
}

function getAnimationState(
  player: Player,
  input: InputState
): Player['animationState'] {
  if (player.isDead) return 'dying';
  if (player.isGrabbing) return 'pushing';
  if (!player.isGrounded) {
    return player.velocity.y < 0 ? 'jumping' : 'falling';
  }
  if (Math.abs(player.velocity.x) > 0.5) {
    return Math.abs(player.velocity.x) > GAME_CONFIG.playerSpeed * 0.8 ? 'running' : 'walking';
  }
  return 'idle';
}

export function updatePushablePhysics(
  pushables: PushableObject[],
  player: Player,
  platforms: Platform[],
  input: InputState,
  deltaTime: number
): PushableObject[] {
  const dt = deltaTime / 16.67;

  return pushables.map((pushable) => {
    const newPushable = { ...pushable };

    // Check if player is pushing this object
    const playerRight = player.position.x + player.width;
    const playerBottom = player.position.y + player.height;
    const pushableRight = pushable.x + pushable.width;

    const isNearX =
      (Math.abs(playerRight - pushable.x) < 10) ||
      (Math.abs(player.position.x - pushableRight) < 10);
    const isOverlappingY =
      playerBottom > pushable.y + 10 &&
      player.position.y < pushable.y + pushable.height - 10;

    if (isNearX && isOverlappingY && input.action && player.isGrounded) {
      newPushable.isBeingPushed = true;

      if (input.right && Math.abs(playerRight - pushable.x) < 10) {
        newPushable.velocity.x = PUSH_SPEED;
      } else if (input.left && Math.abs(player.position.x - pushableRight) < 10) {
        newPushable.velocity.x = -PUSH_SPEED;
      }
    } else {
      newPushable.isBeingPushed = false;
      newPushable.velocity.x *= 0.8;
    }

    // Apply gravity to pushables
    newPushable.velocity.y += GAME_CONFIG.gravity * dt;
    newPushable.velocity.y = clamp(newPushable.velocity.y, -20, 20);

    // Update position
    newPushable.x += newPushable.velocity.x * dt;
    newPushable.y += newPushable.velocity.y * dt;

    // Check platform collisions for pushables
    for (const platform of platforms) {
      if (
        newPushable.x < platform.x + platform.width &&
        newPushable.x + newPushable.width > platform.x &&
        newPushable.y < platform.y + platform.height &&
        newPushable.y + newPushable.height > platform.y
      ) {
        // Simple collision resolution
        const overlapTop = newPushable.y + newPushable.height - platform.y;
        const overlapLeft = newPushable.x + newPushable.width - platform.x;
        const overlapRight = platform.x + platform.width - newPushable.x;

        if (overlapTop < overlapLeft && overlapTop < overlapRight) {
          newPushable.y = platform.y - newPushable.height;
          newPushable.velocity.y = 0;
        } else if (overlapLeft < overlapRight) {
          newPushable.x = platform.x - newPushable.width;
          newPushable.velocity.x = 0;
        } else {
          newPushable.x = platform.x + platform.width;
          newPushable.velocity.x = 0;
        }
      }
    }

    return newPushable;
  });
}

export function updateMovingPlatforms(
  platforms: Platform[],
  deltaTime: number
): Platform[] {
  const dt = deltaTime / 16.67;

  return platforms.map((platform) => {
    if (platform.type !== 'moving' || !platform.movingConfig) {
      return platform;
    }

    const config = platform.movingConfig;
    const newPlatform = { ...platform, movingConfig: { ...config } };

    // Move horizontally
    if (config.startX !== config.endX) {
      newPlatform.x += config.speed * config.currentDirection * dt;

      if (newPlatform.x >= config.endX) {
        newPlatform.x = config.endX;
        newPlatform.movingConfig!.currentDirection = -1;
      } else if (newPlatform.x <= config.startX) {
        newPlatform.x = config.startX;
        newPlatform.movingConfig!.currentDirection = 1;
      }
    }

    // Move vertically
    if (config.startY !== config.endY) {
      newPlatform.y += config.speed * config.currentDirection * dt;

      if (newPlatform.y >= config.endY) {
        newPlatform.y = config.endY;
        newPlatform.movingConfig!.currentDirection = -1;
      } else if (newPlatform.y <= config.startY) {
        newPlatform.y = config.startY;
        newPlatform.movingConfig!.currentDirection = 1;
      }
    }

    return newPlatform;
  });
}

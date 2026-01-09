// Physics engine for the game

import {
  Player,
  Platform,
  PushableObject,
  InputState,
  Vector2D,
  LevelData,
  Rope,
} from '../types/game';
import {
  GAME_CONFIG,
  GROUND_FRICTION,
  AIR_FRICTION,
  PUSH_SPEED,
  ROPE_GRAVITY,
  ROPE_DAMPING,
  ROPE_SWING_FORCE,
  ROPE_JUMP_BOOST,
} from './constants';
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

  // If on rope, skip normal physics (handled separately in updateRopePhysics)
  if (player.isOnRope) {
    return player;
  }

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

// Rope physics - pendulum simulation
export function updateRopePhysics(
  rope: Rope,
  player: Player,
  input: InputState,
  deltaTime: number
): { rope: Rope; player: Player } {
  if (!player.isOnRope || player.attachedRopeId !== rope.id) {
    return { rope, player };
  }

  const dt = deltaTime / 16.67;
  const newRope = { ...rope };
  let newPlayer = { ...player };

  // Pendulum physics
  // Angular acceleration from gravity: α = -(g/L) * sin(θ)
  const angularAcceleration = -ROPE_GRAVITY * Math.sin(newRope.angle);

  // Player input affects swing
  if (input.left) {
    newRope.angularVelocity -= ROPE_SWING_FORCE * dt;
    newPlayer.facingRight = false;
  }
  if (input.right) {
    newRope.angularVelocity += ROPE_SWING_FORCE * dt;
    newPlayer.facingRight = true;
  }

  // Update angular velocity and apply damping
  newRope.angularVelocity += angularAcceleration * dt;
  newRope.angularVelocity *= Math.pow(ROPE_DAMPING, dt);

  // Update angle
  newRope.angle += newRope.angularVelocity * dt;

  // Clamp angle to prevent full rotations
  newRope.angle = clamp(newRope.angle, -Math.PI * 0.45, Math.PI * 0.45);

  // Calculate player position at end of rope
  const playerX = newRope.anchorX + Math.sin(newRope.angle) * newRope.length;
  const playerY = newRope.anchorY + Math.cos(newRope.angle) * newRope.length;

  // Update player position (center player on rope end)
  newPlayer.position.x = playerX - newPlayer.width / 2;
  newPlayer.position.y = playerY - newPlayer.height / 2;

  // Store velocity for when player releases (tangent to swing)
  const tangentVelX = newRope.angularVelocity * newRope.length * Math.cos(newRope.angle);
  const tangentVelY = -newRope.angularVelocity * newRope.length * Math.sin(newRope.angle);
  newPlayer.velocity.x = tangentVelX;
  newPlayer.velocity.y = tangentVelY;

  // Update animation state
  newPlayer.animationState = 'swinging';
  newPlayer.isGrounded = false;
  newPlayer.isJumping = false;

  return { rope: newRope, player: newPlayer };
}

// Check if player can grab a rope and handle attachment
export function checkRopeGrab(
  player: Player,
  ropes: Rope[],
  input: InputState,
  grabDistance: number
): { player: Player; ropes: Rope[] } {
  // If already on rope, check for jump release
  if (player.isOnRope) {
    if (input.jump) {
      // Release from rope with boosted velocity
      const newPlayer = { ...player };
      newPlayer.isOnRope = false;
      newPlayer.attachedRopeId = null;
      newPlayer.velocity.x *= ROPE_JUMP_BOOST;
      newPlayer.velocity.y = Math.min(newPlayer.velocity.y, -GAME_CONFIG.playerJumpForce * 0.8);
      newPlayer.isJumping = true;
      newPlayer.animationState = 'jumping';
      return { player: newPlayer, ropes };
    }
    return { player, ropes };
  }

  // Check for rope grab (action button while in air or jumping)
  // Allow grab if pressing action and either not grounded OR moving upward (jumping)
  const isInAir = !player.isGrounded || player.velocity.y < 0;
  if (!input.action || !isInAir) {
    return { player, ropes };
  }

  const playerCenterX = player.position.x + player.width / 2;
  const playerCenterY = player.position.y + player.height / 2;

  for (const rope of ropes) {
    // Calculate rope end position
    const ropeEndX = rope.anchorX + Math.sin(rope.angle) * rope.length;
    const ropeEndY = rope.anchorY + Math.cos(rope.angle) * rope.length;

    // Check distance to rope LINE (not just end point)
    // Find closest point on rope to player
    const ropeVecX = ropeEndX - rope.anchorX;
    const ropeVecY = ropeEndY - rope.anchorY;
    const playerToAnchorX = playerCenterX - rope.anchorX;
    const playerToAnchorY = playerCenterY - rope.anchorY;

    // Project player position onto rope line
    const ropeLen = rope.length;
    const dot = (playerToAnchorX * ropeVecX + playerToAnchorY * ropeVecY) / (ropeLen * ropeLen);
    const t = clamp(dot, 0.3, 1); // Only grab lower 70% of rope (not near anchor)

    const closestX = rope.anchorX + ropeVecX * t;
    const closestY = rope.anchorY + ropeVecY * t;

    const dx = playerCenterX - closestX;
    const dy = playerCenterY - closestY;
    const distance = Math.sqrt(dx * dx + dy * dy);

    if (distance < grabDistance) {
      // Attach to rope
      const newPlayer = { ...player };
      newPlayer.isOnRope = true;
      newPlayer.attachedRopeId = rope.id;
      newPlayer.isGrounded = false;
      newPlayer.isJumping = false;
      newPlayer.animationState = 'swinging';

      // Transfer player momentum to rope
      const momentumToAngular = player.velocity.x * 0.01;
      const newRopes = ropes.map((r) => {
        if (r.id === rope.id) {
          return {
            ...r,
            angularVelocity: r.angularVelocity + momentumToAngular,
          };
        }
        return r;
      });

      return { player: newPlayer, ropes: newRopes };
    }
  }

  return { player, ropes };
}

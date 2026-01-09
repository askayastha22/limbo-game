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
  ROPE_SWING_ACCEL,
  ROPE_AIR_RESISTANCE,
  ROPE_MAX_SWING_SPEED,
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

// Rope physics - constraint-based swing
// Based on best practices: treat rope as circular constraint, apply world gravity,
// use tangent force for player input, natural momentum on release
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

  // Get player center position
  let playerCenterX = newPlayer.position.x + newPlayer.width / 2;
  let playerCenterY = newPlayer.position.y + newPlayer.height / 2;

  // Step 1: Apply world gravity to velocity
  newPlayer.velocity.y += GAME_CONFIG.gravity * dt * 0.8; // Slightly reduced for better feel

  // Step 2: Apply player input as tangent force (perpendicular to rope)
  // Calculate current rope direction
  const ropeVecX = playerCenterX - rope.anchorX;
  const ropeVecY = playerCenterY - rope.anchorY;
  const ropeLen = Math.sqrt(ropeVecX * ropeVecX + ropeVecY * ropeVecY);

  if (ropeLen > 0) {
    // Tangent direction (perpendicular to rope, pointing right when rope hangs down)
    const tangentX = ropeVecY / ropeLen;
    const tangentY = -ropeVecX / ropeLen;

    // Apply swing force in tangent direction based on input
    if (input.left) {
      newPlayer.velocity.x -= tangentX * ROPE_SWING_ACCEL * dt;
      newPlayer.velocity.y -= tangentY * ROPE_SWING_ACCEL * dt;
      newPlayer.facingRight = false;
    }
    if (input.right) {
      newPlayer.velocity.x += tangentX * ROPE_SWING_ACCEL * dt;
      newPlayer.velocity.y += tangentY * ROPE_SWING_ACCEL * dt;
      newPlayer.facingRight = true;
    }
  }

  // Step 3: Apply air resistance
  newPlayer.velocity.x *= ROPE_AIR_RESISTANCE;
  newPlayer.velocity.y *= ROPE_AIR_RESISTANCE;

  // Cap maximum swing speed
  newPlayer.velocity.x = clamp(newPlayer.velocity.x, -ROPE_MAX_SWING_SPEED, ROPE_MAX_SWING_SPEED);

  // Step 4: Update position based on velocity
  playerCenterX += newPlayer.velocity.x * dt;
  playerCenterY += newPlayer.velocity.y * dt;

  // Step 5: Soft rope constraint with elasticity
  // Calculate new distance from anchor
  const newRopeVecX = playerCenterX - rope.anchorX;
  const newRopeVecY = playerCenterY - rope.anchorY;
  const newDist = Math.sqrt(newRopeVecX * newRopeVecX + newRopeVecY * newRopeVecY);

  if (newDist > 0) {
    const radialX = newRopeVecX / newDist;
    const radialY = newRopeVecY / newDist;

    if (newDist > rope.length) {
      // Rope is taut - apply soft spring force instead of hard constraint
      const overstretch = newDist - rope.length;
      const springStrength = 0.3; // How quickly rope pulls back (0.3 = soft, 1.0 = rigid)
      const dampening = 0.8; // Reduce radial velocity when taut

      // Apply spring force pulling player back toward rope length
      const pullForce = overstretch * springStrength;
      playerCenterX -= radialX * pullForce;
      playerCenterY -= radialY * pullForce;

      // Dampen outward radial velocity (but don't eliminate it completely)
      const radialVel = newPlayer.velocity.x * radialX + newPlayer.velocity.y * radialY;
      if (radialVel > 0) {
        newPlayer.velocity.x -= radialVel * radialX * dampening;
        newPlayer.velocity.y -= radialVel * radialY * dampening;
      }

      // Hard limit - never let player go too far beyond rope length
      const maxStretch = rope.length * 1.05;
      if (newDist > maxStretch) {
        playerCenterX = rope.anchorX + radialX * maxStretch;
        playerCenterY = rope.anchorY + radialY * maxStretch;
      }
    } else if (newDist < rope.length * 0.95) {
      // Rope has slack - apply very gentle pull to encourage full extension
      // This makes the rope feel more natural as it tends toward full length
      const slack = rope.length - newDist;
      const gentlePull = slack * 0.02;
      newPlayer.velocity.x += radialX * gentlePull;
      newPlayer.velocity.y += radialY * gentlePull;
    }
  }

  // Step 6: Update rope angle based on player position (for rendering)
  const finalRopeVecX = playerCenterX - rope.anchorX;
  const finalRopeVecY = playerCenterY - rope.anchorY;
  newRope.angle = Math.atan2(finalRopeVecX, finalRopeVecY);

  // Store angular velocity for rendering (approximate from position change)
  newRope.angularVelocity = newPlayer.velocity.x * 0.01;

  // Update player position from center
  newPlayer.position.x = playerCenterX - newPlayer.width / 2;
  newPlayer.position.y = playerCenterY - newPlayer.height / 2;

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
    // Decrease cooldown
    const cooldown = Math.max(0, player.ropeGrabCooldown - 1);

    // Only allow release after cooldown expires (prevents accidental immediate release)
    if (input.jump && cooldown === 0) {
      // Release from rope - keep natural momentum, just add a small upward boost
      const newPlayer = { ...player };
      newPlayer.isOnRope = false;
      newPlayer.attachedRopeId = null;
      newPlayer.ropeGrabCooldown = 0;
      // Add a small jump impulse (not a multiplier) for controlled release
      newPlayer.velocity.y = Math.min(newPlayer.velocity.y - 5, -3);
      newPlayer.isJumping = true;
      newPlayer.animationState = 'jumping';
      return { player: newPlayer, ropes };
    }
    // Update cooldown even if not releasing
    if (cooldown !== player.ropeGrabCooldown) {
      return { player: { ...player, ropeGrabCooldown: cooldown }, ropes };
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
      // Set cooldown to prevent immediate release (15 frames = ~250ms at 60fps)
      newPlayer.ropeGrabCooldown = 15;

      // Keep player's current velocity - the constraint-based physics will handle it naturally
      // No artificial momentum transfer needed

      return { player: newPlayer, ropes };
    }
  }

  return { player, ropes };
}

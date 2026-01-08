// Collision detection utilities

import { Rectangle, Vector2D, Platform, Hazard, PushableObject, Player } from '../types/game';

export function rectIntersect(a: Rectangle, b: Rectangle): boolean {
  return (
    a.x < b.x + b.width &&
    a.x + a.width > b.x &&
    a.y < b.y + b.height &&
    a.y + a.height > b.y
  );
}

export function pointInRect(point: Vector2D, rect: Rectangle): boolean {
  return (
    point.x >= rect.x &&
    point.x <= rect.x + rect.width &&
    point.y >= rect.y &&
    point.y <= rect.y + rect.height
  );
}

export function getPlayerRect(player: Player): Rectangle {
  return {
    x: player.position.x,
    y: player.position.y,
    width: player.width,
    height: player.height,
  };
}

export interface CollisionResult {
  collides: boolean;
  direction: 'top' | 'bottom' | 'left' | 'right' | null;
  overlap: number;
  entity: Platform | Hazard | PushableObject | null;
}

export function checkPlatformCollision(
  player: Player,
  platform: Platform,
  prevPosition: Vector2D
): CollisionResult {
  const playerRect = getPlayerRect(player);
  const platformRect: Rectangle = {
    x: platform.x,
    y: platform.y,
    width: platform.width,
    height: platform.height,
  };

  if (!rectIntersect(playerRect, platformRect)) {
    return { collides: false, direction: null, overlap: 0, entity: null };
  }

  // Calculate overlaps
  const overlapLeft = playerRect.x + playerRect.width - platformRect.x;
  const overlapRight = platformRect.x + platformRect.width - playerRect.x;
  const overlapTop = playerRect.y + playerRect.height - platformRect.y;
  const overlapBottom = platformRect.y + platformRect.height - playerRect.y;

  // Find minimum overlap
  const minOverlapX = Math.min(overlapLeft, overlapRight);
  const minOverlapY = Math.min(overlapTop, overlapBottom);

  // For one-way platforms, only collide from above
  if (platform.type === 'one-way') {
    const wasAbove = prevPosition.y + player.height <= platform.y + 5;
    if (wasAbove && player.velocity.y >= 0) {
      return { collides: true, direction: 'top', overlap: overlapTop, entity: platform };
    }
    return { collides: false, direction: null, overlap: 0, entity: null };
  }

  // Determine collision direction based on minimum overlap
  if (minOverlapX < minOverlapY) {
    if (overlapLeft < overlapRight) {
      return { collides: true, direction: 'right', overlap: overlapLeft, entity: platform };
    } else {
      return { collides: true, direction: 'left', overlap: overlapRight, entity: platform };
    }
  } else {
    if (overlapTop < overlapBottom) {
      return { collides: true, direction: 'top', overlap: overlapTop, entity: platform };
    } else {
      return { collides: true, direction: 'bottom', overlap: overlapBottom, entity: platform };
    }
  }
}

export function checkHazardCollision(player: Player, hazard: Hazard): boolean {
  if (!hazard.isActive) return false;

  const playerRect = getPlayerRect(player);
  const hazardRect: Rectangle = {
    x: hazard.x,
    y: hazard.y,
    width: hazard.width,
    height: hazard.height,
  };

  // Make hazard hitbox slightly smaller for fairness
  const shrinkFactor = 0.2;
  const shrunkHazardRect: Rectangle = {
    x: hazardRect.x + hazardRect.width * shrinkFactor,
    y: hazardRect.y + hazardRect.height * shrinkFactor,
    width: hazardRect.width * (1 - shrinkFactor * 2),
    height: hazardRect.height * (1 - shrinkFactor * 2),
  };

  return rectIntersect(playerRect, shrunkHazardRect);
}

export function checkPushableCollision(
  player: Player,
  pushable: PushableObject,
  prevPosition: Vector2D
): CollisionResult {
  const playerRect = getPlayerRect(player);
  const pushableRect: Rectangle = {
    x: pushable.x,
    y: pushable.y,
    width: pushable.width,
    height: pushable.height,
  };

  if (!rectIntersect(playerRect, pushableRect)) {
    return { collides: false, direction: null, overlap: 0, entity: null };
  }

  // Calculate overlaps
  const overlapLeft = playerRect.x + playerRect.width - pushableRect.x;
  const overlapRight = pushableRect.x + pushableRect.width - playerRect.x;
  const overlapTop = playerRect.y + playerRect.height - pushableRect.y;
  const overlapBottom = pushableRect.y + pushableRect.height - playerRect.y;

  const minOverlapX = Math.min(overlapLeft, overlapRight);
  const minOverlapY = Math.min(overlapTop, overlapBottom);

  // Check if player was above (for landing on top)
  const wasAbove = prevPosition.y + player.height <= pushable.y + 5;

  if (wasAbove && player.velocity.y >= 0) {
    return { collides: true, direction: 'top', overlap: overlapTop, entity: pushable };
  }

  if (minOverlapX < minOverlapY) {
    if (overlapLeft < overlapRight) {
      return { collides: true, direction: 'right', overlap: overlapLeft, entity: pushable };
    } else {
      return { collides: true, direction: 'left', overlap: overlapRight, entity: pushable };
    }
  } else {
    if (overlapTop < overlapBottom) {
      return { collides: true, direction: 'top', overlap: overlapTop, entity: pushable };
    } else {
      return { collides: true, direction: 'bottom', overlap: overlapBottom, entity: pushable };
    }
  }
}

export function getDistance(a: Vector2D, b: Vector2D): number {
  const dx = b.x - a.x;
  const dy = b.y - a.y;
  return Math.sqrt(dx * dx + dy * dy);
}

export function clamp(value: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, value));
}

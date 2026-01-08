// Player rendering - Limbo-style pure silhouette
// Simple, iconic shadow figure with glowing eyes

import { Player } from '../../../types/game';

let animTime = 0;
let walkCycle = 0;
let wasGrounded = false;
let wasDead = false;

// Dust particle system for landing effect
interface DustParticle {
  x: number;
  y: number;
  vx: number;
  vy: number;
  life: number;
  maxLife: number;
  size: number;
}

const dustParticles: DustParticle[] = [];

// Ragdoll physics system
interface RagdollPart {
  x: number;
  y: number;
  vx: number;
  vy: number;
  angle: number;
  angularVel: number;
  length: number;
  width: number;
}

interface RagdollState {
  active: boolean;
  time: number;
  settled: boolean;
  groundY: number;
  // Body parts
  head: RagdollPart;
  torso: RagdollPart;
  upperArmL: RagdollPart;
  lowerArmL: RagdollPart;
  upperArmR: RagdollPart;
  lowerArmR: RagdollPart;
  upperLegL: RagdollPart;
  lowerLegL: RagdollPart;
  upperLegR: RagdollPart;
  lowerLegR: RagdollPart;
}

let ragdoll: RagdollState | null = null;

function initRagdoll(facingRight: boolean, velocityX: number, velocityY: number): void {
  const dir = facingRight ? 1 : -1;
  const impactForce = Math.abs(velocityX) * 0.02 + Math.abs(velocityY) * 0.015;

  ragdoll = {
    active: true,
    time: 0,
    settled: false,
    groundY: 0, // Will be set relative to feet position
    // Head starts at top
    head: {
      x: 0, y: -26,
      vx: velocityX * 0.03 + (Math.random() - 0.5) * 2,
      vy: velocityY * 0.02 - 1,
      angle: (Math.random() - 0.5) * 0.3,
      angularVel: (Math.random() - 0.5) * 0.15 + dir * impactForce * 0.1,
      length: 8, width: 7
    },
    // Torso
    torso: {
      x: 0, y: -11,
      vx: velocityX * 0.02,
      vy: velocityY * 0.015,
      angle: (Math.random() - 0.5) * 0.2,
      angularVel: (Math.random() - 0.5) * 0.08 + dir * impactForce * 0.05,
      length: 14, width: 4
    },
    // Left arm
    upperArmL: {
      x: -2, y: -16,
      vx: velocityX * 0.025 - 1 - Math.random() * 2,
      vy: velocityY * 0.01 - Math.random(),
      angle: -0.3 + (Math.random() - 0.5) * 0.5,
      angularVel: -0.1 - Math.random() * 0.2,
      length: 6, width: 1.5
    },
    lowerArmL: {
      x: -4, y: -12,
      vx: velocityX * 0.03 - 1.5 - Math.random() * 2,
      vy: velocityY * 0.01,
      angle: -0.5 + (Math.random() - 0.5) * 0.5,
      angularVel: -0.15 - Math.random() * 0.25,
      length: 5, width: 1.2
    },
    // Right arm
    upperArmR: {
      x: 2, y: -16,
      vx: velocityX * 0.025 + 1 + Math.random() * 2,
      vy: velocityY * 0.01 - Math.random(),
      angle: 0.3 + (Math.random() - 0.5) * 0.5,
      angularVel: 0.1 + Math.random() * 0.2,
      length: 6, width: 1.5
    },
    lowerArmR: {
      x: 4, y: -12,
      vx: velocityX * 0.03 + 1.5 + Math.random() * 2,
      vy: velocityY * 0.01,
      angle: 0.5 + (Math.random() - 0.5) * 0.5,
      angularVel: 0.15 + Math.random() * 0.25,
      length: 5, width: 1.2
    },
    // Left leg
    upperLegL: {
      x: -1, y: -4,
      vx: velocityX * 0.015 - 0.5 - Math.random(),
      vy: velocityY * 0.02 + 1,
      angle: -0.2 + (Math.random() - 0.5) * 0.3,
      angularVel: -0.05 - Math.random() * 0.1,
      length: 8, width: 2.5
    },
    lowerLegL: {
      x: -2, y: 4,
      vx: velocityX * 0.02 - 0.8,
      vy: velocityY * 0.025 + 1.5,
      angle: -0.1 + (Math.random() - 0.5) * 0.4,
      angularVel: -0.08 - Math.random() * 0.15,
      length: 7, width: 2
    },
    // Right leg
    upperLegR: {
      x: 1, y: -4,
      vx: velocityX * 0.015 + 0.5 + Math.random(),
      vy: velocityY * 0.02 + 1,
      angle: 0.2 + (Math.random() - 0.5) * 0.3,
      angularVel: 0.05 + Math.random() * 0.1,
      length: 8, width: 2.5
    },
    lowerLegR: {
      x: 2, y: 4,
      vx: velocityX * 0.02 + 0.8,
      vy: velocityY * 0.025 + 1.5,
      angle: 0.1 + (Math.random() - 0.5) * 0.4,
      angularVel: 0.08 + Math.random() * 0.15,
      length: 7, width: 2
    },
  };
}

function updateRagdoll(): void {
  if (!ragdoll || ragdoll.settled) return;

  ragdoll.time += 0.016;

  const gravity = 0.4;
  const friction = 0.92;
  const angularFriction = 0.88;
  const groundY = ragdoll.groundY;
  const bounciness = 0.3;

  // Update all parts
  const parts = [
    ragdoll.head, ragdoll.torso,
    ragdoll.upperArmL, ragdoll.lowerArmL,
    ragdoll.upperArmR, ragdoll.lowerArmR,
    ragdoll.upperLegL, ragdoll.lowerLegL,
    ragdoll.upperLegR, ragdoll.lowerLegR
  ];

  let allSettled = true;

  for (const part of parts) {
    // Apply gravity
    part.vy += gravity;

    // Apply velocity
    part.x += part.vx;
    part.y += part.vy;
    part.angle += part.angularVel;

    // Ground collision
    if (part.y > groundY - 2) {
      part.y = groundY - 2;
      if (part.vy > 0.5) {
        part.vy *= -bounciness;
        part.angularVel *= 0.7;
      } else {
        part.vy = 0;
      }
      part.vx *= friction;
      part.angularVel *= angularFriction;
    }

    // Apply friction
    part.vx *= 0.99;
    part.angularVel *= 0.98;

    // Check if settled
    if (Math.abs(part.vx) > 0.1 || Math.abs(part.vy) > 0.1 || Math.abs(part.angularVel) > 0.02) {
      allSettled = false;
    }
  }

  // Apply joint constraints (loosely connect parts)
  applyJointConstraint(ragdoll.head, ragdoll.torso, 8, 0.3);
  applyJointConstraint(ragdoll.upperArmL, ragdoll.torso, 4, 0.25);
  applyJointConstraint(ragdoll.lowerArmL, ragdoll.upperArmL, 5, 0.2);
  applyJointConstraint(ragdoll.upperArmR, ragdoll.torso, 4, 0.25);
  applyJointConstraint(ragdoll.lowerArmR, ragdoll.upperArmR, 5, 0.2);
  applyJointConstraint(ragdoll.upperLegL, ragdoll.torso, 6, 0.3);
  applyJointConstraint(ragdoll.lowerLegL, ragdoll.upperLegL, 7, 0.25);
  applyJointConstraint(ragdoll.upperLegR, ragdoll.torso, 6, 0.3);
  applyJointConstraint(ragdoll.lowerLegR, ragdoll.upperLegR, 7, 0.25);

  // Mark as settled after some time or when all parts stop moving
  if (ragdoll.time > 3 || (allSettled && ragdoll.time > 0.5)) {
    ragdoll.settled = true;
  }
}

function applyJointConstraint(partA: RagdollPart, partB: RagdollPart, maxDist: number, strength: number): void {
  const dx = partA.x - partB.x;
  const dy = partA.y - partB.y;
  const dist = Math.sqrt(dx * dx + dy * dy);

  if (dist > maxDist) {
    const correction = (dist - maxDist) * strength;
    const nx = dx / dist;
    const ny = dy / dist;

    partA.x -= nx * correction;
    partA.y -= ny * correction;
    partA.vx -= nx * correction * 0.5;
    partA.vy -= ny * correction * 0.5;
  }
}

export function renderPlayer(ctx: CanvasRenderingContext2D, player: Player): void {
  const { position, width, height, facingRight, animationState, isDead, velocity, isGrounded } = player;

  animTime += 0.016;

  // Walk cycle advances based on actual movement
  if (animationState === 'walking' || animationState === 'running') {
    const speed = animationState === 'running' ? 0.15 : 0.005; // Walking 80% slower
    walkCycle += speed;
  }

  // Detect landing - spawn dust particles
  if (isGrounded && !wasGrounded && !isDead) {
    spawnLandingDust(position.x + width / 2, position.y + height);
  }
  wasGrounded = isGrounded;

  // Detect death transition - initialize ragdoll
  if (isDead && !wasDead) {
    const vel = velocity || { x: 0, y: 0 };
    initRagdoll(facingRight, vel.x, vel.y);
  }
  // Reset ragdoll when player respawns
  if (!isDead && wasDead) {
    ragdoll = null;
  }
  wasDead = isDead;

  // Update ragdoll physics
  if (isDead && ragdoll) {
    updateRagdoll();
  }

  // Update and render dust particles
  updateAndRenderDust(ctx);

  ctx.save();

  // Position at feet (bottom center of character)
  const footY = position.y + height;
  const centerX = position.x + width / 2;

  ctx.translate(centerX, footY);

  if (!facingRight) {
    ctx.scale(-1, 1);
  }

  // Scale based on height (character is ~40 units tall in local coords)
  const scale = height / 40;
  ctx.scale(scale, scale);

  if (isDead) {
    renderRagdoll(ctx);
  } else {
    renderCharacter(ctx, animationState, velocity || { x: 0, y: 0 });
  }

  ctx.restore();
}

function spawnLandingDust(x: number, y: number): void {
  const particleCount = 6;
  for (let i = 0; i < particleCount; i++) {
    const angle = Math.PI + (Math.random() - 0.5) * Math.PI * 0.8; // Spread upward and outward
    const speed = 1 + Math.random() * 2;
    dustParticles.push({
      x,
      y: y - 2,
      vx: Math.cos(angle) * speed * (i < particleCount / 2 ? -1 : 1),
      vy: -Math.random() * 1.5 - 0.5,
      life: 1,
      maxLife: 1,
      size: 2 + Math.random() * 3,
    });
  }
}

function updateAndRenderDust(ctx: CanvasRenderingContext2D): void {
  for (let i = dustParticles.length - 1; i >= 0; i--) {
    const p = dustParticles[i];

    p.x += p.vx;
    p.y += p.vy;
    p.vy += 0.05;
    p.vx *= 0.98;
    p.life -= 0.03;

    if (p.life <= 0) {
      dustParticles.splice(i, 1);
      continue;
    }

    const alpha = p.life * 0.5;
    ctx.fillStyle = `rgba(60, 60, 65, ${alpha})`;
    ctx.beginPath();
    ctx.arc(p.x, p.y, p.size * p.life, 0, Math.PI * 2);
    ctx.fill();
  }
}

function renderCharacter(ctx: CanvasRenderingContext2D, state: string, velocity: { x: number; y: number }): void {
  // All coordinates relative to feet at (0, 0)
  // Y goes up (negative), X goes right (positive when facing right)

  ctx.fillStyle = '#000000';
  ctx.strokeStyle = '#000000';
  ctx.lineCap = 'round';
  ctx.lineJoin = 'round';

  // Get pose based on state
  const pose = getPose(state, velocity);

  // Draw back leg
  drawLeg(ctx, pose.backLeg, true);

  // Draw back arm
  drawArm(ctx, pose.backArm, true);

  // Draw body (torso) - simple tapered shape
  ctx.beginPath();
  ctx.moveTo(-3, -18); // neck left
  ctx.lineTo(-4, -8);  // waist left
  ctx.lineTo(-2, -4);  // hip left
  ctx.lineTo(2, -4);   // hip right
  ctx.lineTo(4, -8);   // waist right
  ctx.lineTo(3, -18);  // neck right
  ctx.closePath();
  ctx.fill();

  // Draw head - large oval (childlike)
  const headY = -26 + pose.headBob;
  ctx.beginPath();
  ctx.ellipse(0, headY, 7, 8, 0, 0, Math.PI * 2);
  ctx.fill();

  // Draw eyes - iconic glowing dots
  ctx.fillStyle = '#ffffff';
  ctx.shadowColor = '#ffffff';
  ctx.shadowBlur = 6;

  const eyeY = headY + 1 + Math.min(0.5, Math.max(-0.5, velocity.y * 0.004));
  const lookX = Math.min(0.8, Math.max(-0.8, velocity.x * 0.008));

  ctx.beginPath();
  ctx.arc(-2.5 + lookX, eyeY, 1.3, 0, Math.PI * 2);
  ctx.fill();
  ctx.beginPath();
  ctx.arc(2.5 + lookX, eyeY, 1.3, 0, Math.PI * 2);
  ctx.fill();

  ctx.shadowBlur = 0;
  ctx.fillStyle = '#000000';

  // Draw front leg
  drawLeg(ctx, pose.frontLeg, false);

  // Draw front arm
  drawArm(ctx, pose.frontArm, false);
}

interface LegPose {
  hipX: number;
  hipY: number;
  kneeX: number;
  kneeY: number;
  footX: number;
  footY: number;
}

interface ArmPose {
  shoulderX: number;
  shoulderY: number;
  elbowX: number;
  elbowY: number;
  handX: number;
  handY: number;
}

interface CharacterPose {
  frontLeg: LegPose;
  backLeg: LegPose;
  frontArm: ArmPose;
  backArm: ArmPose;
  headBob: number;
}

function getPose(state: string, velocity: { x: number; y: number }): CharacterPose {
  const t = walkCycle;

  // Default standing pose
  let pose: CharacterPose = {
    frontLeg: { hipX: 1, hipY: -4, kneeX: 1, kneeY: 8, footX: 2, footY: 0 },
    backLeg: { hipX: -1, hipY: -4, kneeX: -1, kneeY: 8, footX: 0, footY: 0 },
    frontArm: { shoulderX: 2, shoulderY: -16, elbowX: 3, elbowY: -10, handX: 2, handY: -6 },
    backArm: { shoulderX: -2, shoulderY: -16, elbowX: -3, elbowY: -10, handX: -2, handY: -6 },
    headBob: 0,
  };

  switch (state) {
    case 'idle': {
      const breath = Math.sin(animTime * 2) * 0.3;
      pose.headBob = breath;
      break;
    }

    case 'walking':
    case 'running': {
      const isRunning = state === 'running';
      const stride = isRunning ? 5 : 2; // Walking has tiny stride
      const stepHeight = isRunning ? 4 : 0.8; // Barely lift feet when walking
      const bounce = isRunning ? 1 : 0.2; // Almost no bounce when walking

      // Smooth walk cycle using sin
      const phase = Math.sin(t);
      const phase2 = Math.cos(t);
      const absPhase = Math.abs(phase);

      // Body bob - very subtle when walking
      pose.headBob = -absPhase * bounce;

      // Front leg - gentle stride
      const frontFootX = 1 + phase * stride;
      const frontKneeX = 1 + phase * (stride * 0.4);
      const frontLift = Math.max(0, -phase2);
      const frontFootY = frontLift * stepHeight;
      const frontKneeY = 7 - frontLift * 1.5;

      pose.frontLeg = {
        hipX: 1,
        hipY: -4,
        kneeX: frontKneeX,
        kneeY: frontKneeY,
        footX: frontFootX,
        footY: frontFootY,
      };

      // Back leg - opposite phase
      const backFootX = -1 - phase * stride;
      const backKneeX = -1 - phase * (stride * 0.4);
      const backLift = Math.max(0, phase2);
      const backFootY = backLift * stepHeight;
      const backKneeY = 7 - backLift * 1.5;

      pose.backLeg = {
        hipX: -1,
        hipY: -4,
        kneeX: backKneeX,
        kneeY: backKneeY,
        footX: backFootX,
        footY: backFootY,
      };

      // Arms - subtle swing when walking, more when running
      const armSwing = isRunning ? 3 : 1;
      pose.frontArm = {
        shoulderX: 2,
        shoulderY: -16,
        elbowX: 2 - phase * armSwing * 0.5,
        elbowY: -11 + absPhase * 0.3,
        handX: 1 - phase * armSwing,
        handY: -7 + absPhase * 0.5,
      };

      pose.backArm = {
        shoulderX: -2,
        shoulderY: -16,
        elbowX: -2 + phase * armSwing * 0.5,
        elbowY: -11 + absPhase * 0.3,
        handX: -1 + phase * armSwing,
        handY: -7 + absPhase * 0.5,
      };
      break;
    }

    case 'jumping': {
      // Legs tucked up
      pose.frontLeg = { hipX: 2, hipY: -4, kneeX: 4, kneeY: 2, footX: 2, footY: 4 };
      pose.backLeg = { hipX: -1, hipY: -4, kneeX: -2, kneeY: 3, footX: -3, footY: 5 };
      // Arms up
      pose.frontArm = { shoulderX: 2, shoulderY: -16, elbowX: 5, elbowY: -20, handX: 4, handY: -24 };
      pose.backArm = { shoulderX: -2, shoulderY: -16, elbowX: -5, elbowY: -20, handX: -4, handY: -24 };
      pose.headBob = -1;
      break;
    }

    case 'falling': {
      // Legs dangling
      pose.frontLeg = { hipX: 2, hipY: -4, kneeX: 3, kneeY: 6, footX: 4, footY: 2 };
      pose.backLeg = { hipX: -2, hipY: -4, kneeX: -3, kneeY: 5, footX: -2, footY: 1 };
      // Arms out for balance
      pose.frontArm = { shoulderX: 2, shoulderY: -16, elbowX: 7, elbowY: -14, handX: 10, handY: -12 };
      pose.backArm = { shoulderX: -2, shoulderY: -16, elbowX: -7, elbowY: -14, handX: -10, handY: -12 };
      break;
    }

    case 'pushing': {
      // Leaning forward, pushing
      pose.frontLeg = { hipX: 3, hipY: -4, kneeX: 5, kneeY: 4, footX: 4, footY: 0 };
      pose.backLeg = { hipX: -3, hipY: -4, kneeX: -5, kneeY: 6, footX: -6, footY: 0 };
      pose.frontArm = { shoulderX: 3, shoulderY: -15, elbowX: 8, elbowY: -13, handX: 11, handY: -11 };
      pose.backArm = { shoulderX: 2, shoulderY: -15, elbowX: 7, elbowY: -12, handX: 10, handY: -10 };
      break;
    }
  }

  return pose;
}

function drawLeg(ctx: CanvasRenderingContext2D, leg: LegPose, isBack: boolean): void {
  ctx.save();
  if (isBack) ctx.globalAlpha = 0.7;

  const thickness = isBack ? 2.5 : 3;
  ctx.lineWidth = thickness;

  // Draw leg as two segments
  ctx.beginPath();
  ctx.moveTo(leg.hipX, leg.hipY);
  ctx.lineTo(leg.kneeX, leg.kneeY);
  ctx.stroke();

  ctx.lineWidth = thickness * 0.8;
  ctx.beginPath();
  ctx.moveTo(leg.kneeX, leg.kneeY);
  ctx.lineTo(leg.footX, leg.footY);
  ctx.stroke();

  // Foot - small oval
  ctx.beginPath();
  ctx.ellipse(leg.footX + 1.5, leg.footY, 2.5, 1, 0, 0, Math.PI * 2);
  ctx.fill();

  ctx.restore();
}

function drawArm(ctx: CanvasRenderingContext2D, arm: ArmPose, isBack: boolean): void {
  ctx.save();
  if (isBack) ctx.globalAlpha = 0.7;

  const thickness = isBack ? 1.5 : 2;
  ctx.lineWidth = thickness;

  // Draw arm as single curved line
  ctx.beginPath();
  ctx.moveTo(arm.shoulderX, arm.shoulderY);
  ctx.quadraticCurveTo(arm.elbowX, arm.elbowY, arm.handX, arm.handY);
  ctx.stroke();

  // Small hand circle
  ctx.beginPath();
  ctx.arc(arm.handX, arm.handY, isBack ? 1 : 1.2, 0, Math.PI * 2);
  ctx.fill();

  ctx.restore();
}

function renderRagdoll(ctx: CanvasRenderingContext2D): void {
  if (!ragdoll) return;

  ctx.fillStyle = '#000000';
  ctx.strokeStyle = '#000000';
  ctx.lineCap = 'round';
  ctx.lineJoin = 'round';

  // Draw back limbs first (with transparency)
  ctx.globalAlpha = 0.7;

  // Back arm
  drawRagdollLimb(ctx, ragdoll.upperArmL, ragdoll.lowerArmL, 1.5, 1.2);

  // Back leg
  drawRagdollLimb(ctx, ragdoll.upperLegL, ragdoll.lowerLegL, 2.5, 2);

  ctx.globalAlpha = 1;

  // Draw torso
  ctx.save();
  ctx.translate(ragdoll.torso.x, ragdoll.torso.y);
  ctx.rotate(ragdoll.torso.angle);
  ctx.beginPath();
  ctx.moveTo(-3, -7); // neck
  ctx.lineTo(-4, 0);  // waist
  ctx.lineTo(-2, 4);  // hip
  ctx.lineTo(2, 4);
  ctx.lineTo(4, 0);
  ctx.lineTo(3, -7);
  ctx.closePath();
  ctx.fill();
  ctx.restore();

  // Draw head
  ctx.save();
  ctx.translate(ragdoll.head.x, ragdoll.head.y);
  ctx.rotate(ragdoll.head.angle);
  ctx.beginPath();
  ctx.ellipse(0, 0, 7, 8, 0, 0, Math.PI * 2);
  ctx.fill();

  // Dead eyes - X marks or closed
  ctx.strokeStyle = '#333333';
  ctx.lineWidth = 1.5;
  // Left eye X
  ctx.beginPath();
  ctx.moveTo(-4, -1);
  ctx.lineTo(-1, 2);
  ctx.moveTo(-1, -1);
  ctx.lineTo(-4, 2);
  ctx.stroke();
  // Right eye X
  ctx.beginPath();
  ctx.moveTo(1, -1);
  ctx.lineTo(4, 2);
  ctx.moveTo(4, -1);
  ctx.lineTo(1, 2);
  ctx.stroke();
  ctx.restore();

  // Draw front limbs
  // Front arm
  drawRagdollLimb(ctx, ragdoll.upperArmR, ragdoll.lowerArmR, 2, 1.5);

  // Front leg
  drawRagdollLimb(ctx, ragdoll.upperLegR, ragdoll.lowerLegR, 3, 2.5);
}

function drawRagdollLimb(
  ctx: CanvasRenderingContext2D,
  upper: RagdollPart,
  lower: RagdollPart,
  upperWidth: number,
  lowerWidth: number
): void {
  // Draw upper segment
  ctx.save();
  ctx.translate(upper.x, upper.y);
  ctx.rotate(upper.angle);
  ctx.lineWidth = upperWidth;
  ctx.beginPath();
  ctx.moveTo(0, 0);
  ctx.lineTo(0, upper.length);
  ctx.stroke();
  ctx.restore();

  // Draw lower segment
  ctx.save();
  ctx.translate(lower.x, lower.y);
  ctx.rotate(lower.angle);
  ctx.lineWidth = lowerWidth;
  ctx.beginPath();
  ctx.moveTo(0, 0);
  ctx.lineTo(0, lower.length);
  ctx.stroke();

  // Foot/hand at end
  ctx.beginPath();
  ctx.ellipse(0, lower.length, lowerWidth * 0.8, lowerWidth * 0.4, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.restore();
}

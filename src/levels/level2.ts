// Level 2 - The Factory (Introducing mechanical puzzles)

import { LevelData } from '../types/game';

export const level2: LevelData = {
  id: 'level-2',
  name: 'The Abandoned Factory',
  width: 5000,
  height: 720,
  playerStart: { x: 100, y: 500 },

  platforms: [
    // Ground level
    { id: 'ground-1', x: 0, y: 620, width: 600, height: 100, type: 'solid' },
    { id: 'ground-2', x: 800, y: 620, width: 500, height: 100, type: 'solid' },
    { id: 'ground-3', x: 1500, y: 620, width: 400, height: 100, type: 'solid' },
    { id: 'ground-4', x: 2100, y: 620, width: 600, height: 100, type: 'solid' },
    { id: 'ground-5', x: 2900, y: 620, width: 500, height: 100, type: 'solid' },
    { id: 'ground-6', x: 3600, y: 620, width: 800, height: 100, type: 'solid' },
    { id: 'ground-7', x: 4500, y: 620, width: 500, height: 100, type: 'solid' },

    // Industrial platforms
    { id: 'ind-plat-1', x: 200, y: 520, width: 200, height: 25, type: 'solid' },
    { id: 'ind-plat-2', x: 450, y: 420, width: 150, height: 25, type: 'solid' },

    // Conveyor section
    { id: 'conv-1', x: 650, y: 580, width: 150, height: 40, type: 'solid' },

    // Vertical climbing section
    { id: 'v-plat-1', x: 900, y: 520, width: 80, height: 20, type: 'solid' },
    { id: 'v-plat-2', x: 1000, y: 420, width: 80, height: 20, type: 'solid' },
    { id: 'v-plat-3', x: 900, y: 320, width: 80, height: 20, type: 'solid' },
    { id: 'v-plat-4', x: 1000, y: 220, width: 120, height: 20, type: 'solid' },

    // Upper walkway
    { id: 'walkway-1', x: 1100, y: 220, width: 400, height: 20, type: 'solid' },
    { id: 'walkway-2', x: 1550, y: 220, width: 200, height: 20, type: 'solid' },

    // Moving platforms
    {
      id: 'moving-2',
      x: 1500,
      y: 400,
      width: 100,
      height: 20,
      type: 'moving',
      movingConfig: {
        startX: 1500,
        endX: 1500,
        startY: 400,
        endY: 220,
        speed: 2,
        currentDirection: 1,
      },
    },
    {
      id: 'moving-3',
      x: 2700,
      y: 500,
      width: 120,
      height: 20,
      type: 'moving',
      movingConfig: {
        startX: 2700,
        endX: 2850,
        startY: 500,
        endY: 500,
        speed: 1.5,
        currentDirection: 1,
      },
    },

    // Crusher area platforms
    { id: 'crush-plat-1', x: 2200, y: 520, width: 100, height: 20, type: 'solid' },
    { id: 'crush-plat-2', x: 2350, y: 520, width: 100, height: 20, type: 'solid' },
    { id: 'crush-plat-3', x: 2500, y: 520, width: 100, height: 20, type: 'solid' },

    // Pressure plate section
    { id: 'pp-plat-1', x: 3000, y: 520, width: 150, height: 20, type: 'solid' },
    { id: 'pp-plat-2', x: 3200, y: 450, width: 120, height: 20, type: 'solid' },
    { id: 'pp-plat-3', x: 3350, y: 380, width: 100, height: 20, type: 'one-way' },

    // Final section
    { id: 'final-1', x: 4000, y: 500, width: 100, height: 20, type: 'solid' },
    { id: 'final-2', x: 4200, y: 420, width: 120, height: 20, type: 'solid' },
    { id: 'final-3', x: 4400, y: 340, width: 150, height: 20, type: 'solid' },
    { id: 'final-4', x: 4600, y: 260, width: 200, height: 20, type: 'solid' },
  ],

  hazards: [
    // Pit hazards
    { id: 'pit-1', x: 600, y: 650, width: 200, height: 70, type: 'water', isActive: true },
    { id: 'pit-2', x: 1300, y: 650, width: 200, height: 70, type: 'water', isActive: true },

    // Saw blades
    {
      id: 'saw-2',
      x: 1200,
      y: 185,
      width: 50,
      height: 50,
      type: 'saw',
      isActive: true,
      animationPhase: 0,
    },
    {
      id: 'saw-3',
      x: 1400,
      y: 185,
      width: 50,
      height: 50,
      type: 'saw',
      isActive: true,
      animationPhase: 0.5,
    },

    // Crushers
    {
      id: 'crusher-1',
      x: 2200,
      y: 300,
      width: 80,
      height: 200,
      type: 'crusher',
      isActive: true,
      animationPhase: 0,
    },
    {
      id: 'crusher-2',
      x: 2350,
      y: 300,
      width: 80,
      height: 200,
      type: 'crusher',
      isActive: true,
      animationPhase: 0.5,
    },
    {
      id: 'crusher-3',
      x: 2500,
      y: 300,
      width: 80,
      height: 200,
      type: 'crusher',
      isActive: true,
      animationPhase: 1,
    },

    // Spikes
    { id: 'spike-5', x: 3700, y: 600, width: 100, height: 20, type: 'spike', isActive: true },
    { id: 'spike-6', x: 3850, y: 600, width: 100, height: 20, type: 'spike', isActive: true },
    { id: 'spike-7', x: 4100, y: 600, width: 80, height: 20, type: 'spike', isActive: true },
  ],

  pushableObjects: [
    // Box to trigger pressure plate
    {
      id: 'box-3',
      x: 2950,
      y: 570,
      width: 50,
      height: 50,
      type: 'box',
      velocity: { x: 0, y: 0 },
      isBeingPushed: false,
    },
    // Box for climbing
    {
      id: 'box-4',
      x: 3650,
      y: 570,
      width: 50,
      height: 50,
      type: 'box',
      velocity: { x: 0, y: 0 },
      isBeingPushed: false,
    },
    // Heavy boulder
    {
      id: 'boulder-2',
      x: 850,
      y: 560,
      width: 70,
      height: 70,
      type: 'boulder',
      velocity: { x: 0, y: 0 },
      isBeingPushed: false,
    },
  ],

  switches: [
    // Button to stop crushers temporarily
    {
      id: 'switch-2',
      x: 2150,
      y: 595,
      width: 50,
      height: 25,
      type: 'button',
      isActivated: false,
      targetIds: ['crusher-1', 'crusher-2', 'crusher-3'],
    },
    // Pressure plate for gate
    {
      id: 'switch-3',
      x: 3050,
      y: 590,
      width: 80,
      height: 10,
      type: 'pressurePlate',
      isActivated: false,
      targetIds: ['saw-2', 'saw-3'],
    },
  ],

  ropes: [
    // Rope over first pit
    { id: 'rope-2', anchorX: 700, anchorY: 300, length: 250, angle: 0.3, angularVelocity: 0 },
  ],

  checkpoints: [
    { id: 'cp-4', x: 1050, y: 570, width: 40, height: 50, isActivated: false },
    { id: 'cp-5', x: 1750, y: 170, width: 40, height: 50, isActivated: false },
    { id: 'cp-6', x: 2650, y: 570, width: 40, height: 50, isActivated: false },
    { id: 'cp-7', x: 3550, y: 570, width: 40, height: 50, isActivated: false },
  ],

  exitZone: { x: 4700, y: 210, width: 100, height: 50 },

  ambientEffects: [
    { type: 'fog', intensity: 0.3 },
    { type: 'particles', intensity: 0.15, config: { type: 'dust' } },
  ],
};

// Level 1 - The Forest (Tutorial level introducing basic mechanics)

import { LevelData } from '../types/game';

export const level1: LevelData = {
  id: 'level-1',
  name: 'The Dark Forest',
  width: 4000,
  height: 720,
  playerStart: { x: 100, y: 500 },

  platforms: [
    // Ground platforms
    { id: 'ground-1', x: 0, y: 620, width: 800, height: 100, type: 'solid' },
    { id: 'ground-2', x: 900, y: 620, width: 400, height: 100, type: 'solid' },
    { id: 'ground-3', x: 1400, y: 620, width: 600, height: 100, type: 'solid' },
    { id: 'ground-4', x: 2100, y: 620, width: 300, height: 100, type: 'solid' },
    { id: 'ground-5', x: 2500, y: 620, width: 800, height: 100, type: 'solid' },
    { id: 'ground-6', x: 3400, y: 620, width: 600, height: 100, type: 'solid' },

    // Elevated platforms
    { id: 'plat-1', x: 350, y: 500, width: 150, height: 20, type: 'solid' },
    { id: 'plat-2', x: 550, y: 420, width: 100, height: 20, type: 'one-way' },
    { id: 'plat-3', x: 700, y: 350, width: 100, height: 20, type: 'solid' },

    // Stepping stones over water
    { id: 'stone-1', x: 820, y: 580, width: 60, height: 40, type: 'solid' },

    // After first gap
    { id: 'plat-4', x: 1000, y: 520, width: 120, height: 20, type: 'solid' },
    { id: 'plat-5', x: 1150, y: 450, width: 100, height: 20, type: 'one-way' },
    { id: 'plat-6', x: 1300, y: 380, width: 80, height: 20, type: 'solid' },

    // Moving platform section
    {
      id: 'moving-1',
      x: 2000,
      y: 500,
      width: 100,
      height: 20,
      type: 'moving',
      movingConfig: {
        startX: 2000,
        endX: 2100,
        startY: 500,
        endY: 500,
        speed: 1.5,
        currentDirection: 1,
      },
    },

    // Higher platforms for puzzle area
    { id: 'plat-7', x: 2600, y: 520, width: 150, height: 20, type: 'solid' },
    { id: 'plat-8', x: 2800, y: 450, width: 120, height: 20, type: 'solid' },
    { id: 'plat-9', x: 3000, y: 380, width: 100, height: 20, type: 'one-way' },

    // Platform to reach rope
    { id: 'rope-plat', x: 1720, y: 480, width: 80, height: 20, type: 'solid' },

    // Final section platforms
    { id: 'plat-10', x: 3500, y: 500, width: 100, height: 20, type: 'solid' },
    { id: 'plat-11', x: 3700, y: 420, width: 120, height: 20, type: 'solid' },
    { id: 'plat-12', x: 3850, y: 350, width: 150, height: 20, type: 'solid' },
  ],

  hazards: [
    // Water hazard in first gap
    { id: 'water-1', x: 800, y: 650, width: 100, height: 70, type: 'water', isActive: true },

    // Spikes
    { id: 'spike-1', x: 1200, y: 600, width: 80, height: 20, type: 'spike', isActive: true },
    { id: 'spike-2', x: 1700, y: 600, width: 100, height: 20, type: 'spike', isActive: true },

    // Bear trap
    { id: 'trap-1', x: 1500, y: 595, width: 40, height: 25, type: 'bearTrap', isActive: true },

    // Saw blade
    {
      id: 'saw-1',
      x: 2700,
      y: 590,
      width: 50,
      height: 50,
      type: 'saw',
      isActive: true,
      animationPhase: 0,
    },

    // More spikes in later section
    { id: 'spike-3', x: 3100, y: 600, width: 60, height: 20, type: 'spike', isActive: true },
    { id: 'spike-4', x: 3200, y: 600, width: 60, height: 20, type: 'spike', isActive: true },
  ],

  pushableObjects: [
    // Box for first puzzle (to reach higher platform)
    {
      id: 'box-1',
      x: 500,
      y: 570,
      width: 50,
      height: 50,
      type: 'box',
      velocity: { x: 0, y: 0 },
      isBeingPushed: false,
    },
    // Box to cover spikes
    {
      id: 'box-2',
      x: 1100,
      y: 570,
      width: 50,
      height: 50,
      type: 'box',
      velocity: { x: 0, y: 0 },
      isBeingPushed: false,
    },
    // Boulder for puzzle
    {
      id: 'boulder-1',
      x: 2550,
      y: 560,
      width: 60,
      height: 60,
      type: 'boulder',
      velocity: { x: 0, y: 0 },
      isBeingPushed: false,
    },
  ],

  switches: [
    // Switch to disable saw blade
    {
      id: 'switch-1',
      x: 2650,
      y: 595,
      width: 40,
      height: 25,
      type: 'lever',
      isActivated: false,
      targetIds: ['saw-1'],
    },
  ],

  ropes: [
    // Rope to swing over gap (extended length to be reachable from rope-plat)
    { id: 'rope-1', anchorX: 1850, anchorY: 150, length: 280, angle: 0, angularVelocity: 0 },
  ],

  checkpoints: [
    { id: 'cp-1', x: 950, y: 570, width: 40, height: 50, isActivated: false },
    { id: 'cp-2', x: 2150, y: 570, width: 40, height: 50, isActivated: false },
    { id: 'cp-3', x: 3450, y: 570, width: 40, height: 50, isActivated: false },
  ],

  exitZone: { x: 3900, y: 300, width: 100, height: 50 },

  ambientEffects: [
    { type: 'fog', intensity: 0.4 },
    { type: 'particles', intensity: 0.2 },
  ],
};

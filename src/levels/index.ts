// Level exports

import { LevelData } from '../types/game';
import { level1 } from './level1';
import { level2 } from './level2';

export const levels: LevelData[] = [level1, level2];

export function getLevelById(id: string): LevelData | undefined {
  return levels.find((level) => level.id === id);
}

export function getLevelByIndex(index: number): LevelData | undefined {
  return levels[index];
}

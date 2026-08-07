export type SpawnableMinionKind = 'normal' | 'elite';

export interface MonsterSpawnProfile {
  maxActiveMinions: number;
  normalWeight: number;
  eliteWeight: number;
}

const BASE_ACTIVE_MINIONS = 6;
const ACTIVE_MINIONS_PER_MAP_LEVEL = 2;
const MAX_ACTIVE_MINIONS = 30;
const STARTING_ELITE_WEIGHT = 0.1;
const ELITE_WEIGHT_PER_MAP_LEVEL = 0.05;
const MAX_ELITE_WEIGHT = 0.4;

export function getMonsterSpawnProfile(mapLevel: number): MonsterSpawnProfile {
  const normalizedMapLevel = Math.max(1, Math.floor(mapLevel));
  const maxActiveMinions = Math.min(
    MAX_ACTIVE_MINIONS,
    BASE_ACTIVE_MINIONS + normalizedMapLevel * ACTIVE_MINIONS_PER_MAP_LEVEL,
  );
  const eliteWeight = normalizedMapLevel < 2
    ? 0
    : Math.min(
      MAX_ELITE_WEIGHT,
      STARTING_ELITE_WEIGHT + (normalizedMapLevel - 2) * ELITE_WEIGHT_PER_MAP_LEVEL,
    );
  return {
    maxActiveMinions,
    normalWeight: 1 - eliteWeight,
    eliteWeight,
  };
}

export function canSpawnMinion(mapLevel: number, activeMinions: number) {
  return activeMinions < getMonsterSpawnProfile(mapLevel).maxActiveMinions;
}

export function rollMinionKind(
  mapLevel: number,
  randomValue = Math.random(),
): SpawnableMinionKind {
  const { eliteWeight } = getMonsterSpawnProfile(mapLevel);
  const roll = Math.min(0.999999, Math.max(0, randomValue));
  return roll < eliteWeight ? 'elite' : 'normal';
}

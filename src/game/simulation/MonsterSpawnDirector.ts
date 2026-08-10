export type SpawnableMinionKind = 'normal' | 'elite';

export interface MonsterSpawnProfile {
  maxActiveMinions: number;
  maxTotalMinionSpawns: number;
  spawnIntervalMs: number;
  maxActiveProjectiles: number;
  maxActiveFoods: number;
  normalWeight: number;
  eliteWeight: number;
}

export interface MonsterSpawnDirectorState {
  mapLevel: number;
  spawnedMinions: number;
}

const STARTING_ACTIVE_MINIONS = 10;
const ACTIVE_MINIONS_PER_MAP_LEVEL = 2;
const MAX_ACTIVE_MINIONS = 30;
const STARTING_TOTAL_MINION_SPAWNS = 30;
const TOTAL_MINION_SPAWNS_PER_MAP_LEVEL = 10;
const MAX_TOTAL_MINION_SPAWNS = 120;
const STARTING_SPAWN_INTERVAL_MS = 3000;
const SPAWN_INTERVAL_REDUCTION_PER_MAP_LEVEL_MS = 140;
const MIN_SPAWN_INTERVAL_MS = 1200;
const MAX_ACTIVE_PROJECTILES = 180;
const MAX_ACTIVE_FOODS = 16;
const STARTING_ELITE_WEIGHT = 0.1;
const ELITE_WEIGHT_PER_MAP_LEVEL = 0.05;
const MAX_ELITE_WEIGHT = 0.4;

export function getMonsterSpawnProfile(mapLevel: number): MonsterSpawnProfile {
  const normalizedMapLevel = Math.max(1, Math.floor(mapLevel));
  const maxActiveMinions = Math.min(
    MAX_ACTIVE_MINIONS,
    STARTING_ACTIVE_MINIONS
      + (normalizedMapLevel - 1) * ACTIVE_MINIONS_PER_MAP_LEVEL,
  );
  const maxTotalMinionSpawns = Math.min(
    MAX_TOTAL_MINION_SPAWNS,
    STARTING_TOTAL_MINION_SPAWNS
      + (normalizedMapLevel - 1) * TOTAL_MINION_SPAWNS_PER_MAP_LEVEL,
  );
  const eliteWeight = normalizedMapLevel < 2
    ? 0
    : Math.min(
      MAX_ELITE_WEIGHT,
      STARTING_ELITE_WEIGHT + (normalizedMapLevel - 2) * ELITE_WEIGHT_PER_MAP_LEVEL,
    );
  return {
    maxActiveMinions,
    maxTotalMinionSpawns,
    spawnIntervalMs: Math.max(
      MIN_SPAWN_INTERVAL_MS,
      STARTING_SPAWN_INTERVAL_MS
        - (normalizedMapLevel - 1) * SPAWN_INTERVAL_REDUCTION_PER_MAP_LEVEL_MS,
    ),
    maxActiveProjectiles: MAX_ACTIVE_PROJECTILES,
    maxActiveFoods: MAX_ACTIVE_FOODS,
    normalWeight: 1 - eliteWeight,
    eliteWeight,
  };
}

export class MonsterSpawnDirector {
  readonly state: MonsterSpawnDirectorState = {
    mapLevel: 1,
    spawnedMinions: 0,
  };

  reset(mapLevel = 1) {
    this.state.mapLevel = Math.max(1, Math.floor(mapLevel));
    this.state.spawnedMinions = 0;
  }

  syncMapLevel(mapLevel: number) {
    const normalizedMapLevel = Math.max(1, Math.floor(mapLevel));
    if (normalizedMapLevel === this.state.mapLevel) return false;
    this.reset(normalizedMapLevel);
    return true;
  }

  canActivateMinion(activeMinions: number) {
    return activeMinions < getMonsterSpawnProfile(this.state.mapLevel).maxActiveMinions;
  }

  canCreateMinion(activeMinions: number) {
    const profile = getMonsterSpawnProfile(this.state.mapLevel);
    return (
      this.canActivateMinion(activeMinions) &&
      this.state.spawnedMinions < profile.maxTotalMinionSpawns
    );
  }

  recordMinionSpawn() {
    this.state.spawnedMinions += 1;
  }
}

export function rollMinionKind(
  mapLevel: number,
  randomValue = Math.random(),
): SpawnableMinionKind {
  const { eliteWeight } = getMonsterSpawnProfile(mapLevel);
  const roll = Math.min(0.999999, Math.max(0, randomValue));
  return roll < eliteWeight ? 'elite' : 'normal';
}

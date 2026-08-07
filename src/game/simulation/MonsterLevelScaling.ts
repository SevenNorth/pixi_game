export interface WeightedMonsterLevel {
  level: number;
  weight: number;
}

export interface MonsterLevelModifiers {
  hpMultiplier: number;
  speedMultiplier: number;
  damageBonus: number;
}

export function getMonsterLevelDistribution(mapLevel: number): WeightedMonsterLevel[] {
  const normalizedMapLevel = Math.max(1, Math.floor(mapLevel));
  if (normalizedMapLevel === 1) {
    return [
      { level: 1, weight: 0.85 },
      { level: 2, weight: 0.15 },
    ];
  }
  return [
    { level: normalizedMapLevel - 1, weight: 0.3 },
    { level: normalizedMapLevel, weight: 0.55 },
    { level: normalizedMapLevel + 1, weight: 0.15 },
  ];
}

export function rollMonsterLevel(mapLevel: number, randomValue = Math.random()) {
  const distribution = getMonsterLevelDistribution(mapLevel);
  let cursor = Math.min(0.999999, Math.max(0, randomValue));
  for (const candidate of distribution) {
    cursor -= candidate.weight;
    if (cursor < 0) return candidate.level;
  }
  return distribution[distribution.length - 1].level;
}

export function getMonsterLevelModifiers(level: number): MonsterLevelModifiers {
  const offset = Math.max(0, Math.floor(level) - 1);
  return {
    hpMultiplier: 1 + offset * 0.28,
    speedMultiplier: Math.min(1.35, 1 + offset * 0.04),
    damageBonus: Math.floor(offset / 4) * 0.5,
  };
}

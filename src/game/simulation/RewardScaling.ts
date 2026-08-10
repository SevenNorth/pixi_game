export type RewardTier = 1 | 2 | 3 | 4 | 5;

export interface RewardProfile {
  mapTier: RewardTier;
  effectiveTier: RewardTier;
  playerExperienceMultiplier: number;
  highQualityChanceMultiplier: number;
}

export function getRewardProfile(playerLevel: number, mapLevel: number): RewardProfile {
  const levelDifference = Math.floor(playerLevel) - Math.floor(mapLevel);
  const mapTier = getMapRewardTier(mapLevel);
  if (levelDifference <= -2) {
    return {
      mapTier,
      effectiveTier: clampRewardTier(mapTier + 1),
      playerExperienceMultiplier: 1.3,
      highQualityChanceMultiplier: 1.2,
    };
  }
  if (levelDifference <= 1) {
    return {
      mapTier,
      effectiveTier: mapTier,
      playerExperienceMultiplier: 1,
      highQualityChanceMultiplier: 1,
    };
  }
  if (levelDifference === 2) {
    return {
      mapTier,
      effectiveTier: clampRewardTier(mapTier - 1),
      playerExperienceMultiplier: 0.7,
      highQualityChanceMultiplier: 0.7,
    };
  }
  if (levelDifference === 3) {
    return {
      mapTier,
      effectiveTier: clampRewardTier(mapTier - 1),
      playerExperienceMultiplier: 0.45,
      highQualityChanceMultiplier: 0.4,
    };
  }
  return {
    mapTier,
    effectiveTier: clampRewardTier(mapTier - 2),
    playerExperienceMultiplier: 0.25,
    highQualityChanceMultiplier: 0.15,
  };
}

export function scalePlayerExperience(baseExperience: number, multiplier: number) {
  return Math.round(Math.max(0, baseExperience) * Math.max(0, multiplier) * 100) / 100;
}

export function getEliteCoreDropChance(profile: RewardProfile) {
  const tierChance = 0.2 + (profile.effectiveTier - 1) * 0.04;
  return Math.min(0.5, Math.max(0.02, tierChance * profile.highQualityChanceMultiplier));
}

export function rollEliteCoreDrop(profile: RewardProfile, roll: number) {
  return Math.max(0, Math.min(1, roll)) < getEliteCoreDropChance(profile);
}

export function getMapRewardTier(mapLevel: number): RewardTier {
  return clampRewardTier(Math.ceil(Math.max(1, mapLevel) / 2));
}

function clampRewardTier(tier: number): RewardTier {
  return Math.min(5, Math.max(1, Math.floor(tier))) as RewardTier;
}

import type { EnemyKind } from '../content/enemies/enemyDefinitions';
import type { RewardProfile } from './RewardScaling';

export type ShieldPickupKind = 'shield-shard' | 'shield-core';

export interface ShieldDropRolls {
  drop: number;
  quality: number;
}

const shieldRecovery: Record<ShieldPickupKind, number> = {
  'shield-shard': 0.5,
  'shield-core': 1,
};

export function getShieldRecovery(kind: ShieldPickupKind) {
  return shieldRecovery[kind];
}

export function rollShieldDrop(
  enemyKind: EnemyKind,
  rewardProfile: RewardProfile,
  rolls: ShieldDropRolls,
): ShieldPickupKind | null {
  if (enemyKind === 'boss') return null;
  const baseDropChance = enemyKind === 'elite' ? 0.2 : enemyKind === 'normal' ? 0.045 : 0;
  const tierBonus = (rewardProfile.effectiveTier - 1) * (enemyKind === 'elite' ? 0.025 : 0.012);
  const dropChance = clamp01(
    (baseDropChance + tierBonus) * rewardProfile.highQualityChanceMultiplier,
  );
  if (clampRoll(rolls.drop) >= dropChance) return null;

  const coreChance = clamp01(
    (0.12 + (rewardProfile.effectiveTier - 1) * 0.1)
      * rewardProfile.highQualityChanceMultiplier,
  );
  return clampRoll(rolls.quality) < coreChance ? 'shield-core' : 'shield-shard';
}

function clampRoll(value: number) {
  return Math.max(0, Math.min(0.999999, value));
}

function clamp01(value: number) {
  return Math.max(0, Math.min(1, value));
}

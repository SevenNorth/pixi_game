import type { EnemyKind } from '../content/enemies/enemyDefinitions';
import type { FoodKey } from './FoodRecovery';
import type { RewardProfile } from './RewardScaling';

const SMALL_RECOVERY_FOODS: readonly FoodKey[] = ['apple', 'banana'];
const LARGE_RECOVERY_FOODS: readonly FoodKey[] = ['bread', 'cheese', 'strawberry'];

export interface FoodDropRates {
  dropChance: number;
  largeRecoveryChance: number;
}

export interface FoodDropRolls {
  drop: number;
  quality: number;
  item: number;
}

export function getFoodDropRates(
  enemyKind: EnemyKind,
  rewardProfile: RewardProfile,
): FoodDropRates {
  if (enemyKind === 'boss') return { dropChance: 0, largeRecoveryChance: 0 };
  const baseDropChance = enemyKind === 'elite' ? 0.38 : enemyKind === 'normal' ? 0.1 : 0;
  const tierBonus = (rewardProfile.effectiveTier - 1) * (enemyKind === 'elite' ? 0.035 : 0.02);
  return {
    dropChance: clamp01(
      (baseDropChance + tierBonus) * Math.max(0, rewardProfile.highQualityChanceMultiplier),
    ),
    largeRecoveryChance: clamp01(
      (0.18 + (rewardProfile.effectiveTier - 1) * 0.12)
        * rewardProfile.highQualityChanceMultiplier,
    ),
  };
}

export function rollFoodDrop(
  enemyKind: EnemyKind,
  rewardProfile: RewardProfile,
  rolls: FoodDropRolls,
): FoodKey | null {
  const rates = getFoodDropRates(enemyKind, rewardProfile);
  if (clampRoll(rolls.drop) >= rates.dropChance) return null;
  const pool = clampRoll(rolls.quality) < rates.largeRecoveryChance
    ? LARGE_RECOVERY_FOODS
    : SMALL_RECOVERY_FOODS;
  const index = Math.min(pool.length - 1, Math.floor(clampRoll(rolls.item) * pool.length));
  return pool[index];
}

function clampRoll(value: number) {
  return Math.max(0, Math.min(0.999999, value));
}

function clamp01(value: number) {
  return Math.max(0, Math.min(1, value));
}

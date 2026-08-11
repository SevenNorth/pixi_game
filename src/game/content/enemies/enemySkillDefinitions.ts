import type { EnemySkillKind } from './enemyDefinitions';

export interface EnemySkillBalance {
  damageMultiplier: number;
  warningMultiplier: number;
  cooldownMultiplier: number;
}

export const enemySkillDefinitions: Record<EnemySkillKind, EnemySkillBalance> = {
  'aimed-shot': {
    damageMultiplier: 1,
    warningMultiplier: 0.9,
    cooldownMultiplier: 0.9,
  },
  'radial-burst': {
    damageMultiplier: 0.8,
    warningMultiplier: 1.15,
    cooldownMultiplier: 1.1,
  },
  'spread-shot': {
    damageMultiplier: 0.75,
    warningMultiplier: 1.3,
    cooldownMultiplier: 1.25,
  },
};

export function getEnemySkillBalance(kind: EnemySkillKind) {
  return enemySkillDefinitions[kind];
}

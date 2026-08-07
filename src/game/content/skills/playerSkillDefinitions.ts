import type { SkillDefinition } from '../../simulation/SkillSystem';

export type PlayerSkillId = 'lightning-bolt' | 'thunder-dash' | 'storm-shield';
export type PlayerSkillIcon = 'lightning' | 'dash' | 'shield';

export type PlayerSkillEffect =
  | {
      type: 'projectile';
      speed: number;
      splashRadius: number;
      splashDamageMultiplier: number;
    }
  | { type: 'dash' }
  | { type: 'shield'; basePoints: number; pointsPerLevel: number };

export interface PlayerSkillDefinition {
  id: PlayerSkillId;
  icon: PlayerSkillIcon;
  maxLevel: number;
  base: SkillDefinition;
  damageMultiplierPerLevel: number;
  rangePerLevel: number;
  cooldownReductionPerLevel: number;
  effect: PlayerSkillEffect;
}

export const playerSkillDefinitions: Record<PlayerSkillId, PlayerSkillDefinition> = {
  'lightning-bolt': {
    id: 'lightning-bolt',
    icon: 'lightning',
    maxLevel: 3,
    base: {
      id: 'lightning-bolt',
      cooldownMs: 3000,
      windupMs: 180,
      castMs: 80,
      recoveryMs: 160,
      range: 620,
      damageMultiplier: 1.8,
      fixedDamage: 0,
      targeting: 'direction',
    },
    damageMultiplierPerLevel: 0.45,
    rangePerLevel: 50,
    cooldownReductionPerLevel: 180,
    effect: {
      type: 'projectile',
      speed: 560,
      splashRadius: 72,
      splashDamageMultiplier: 0.5,
    },
  },
  'thunder-dash': {
    id: 'thunder-dash',
    icon: 'dash',
    maxLevel: 3,
    base: {
      id: 'thunder-dash',
      cooldownMs: 4800,
      windupMs: 90,
      castMs: 100,
      recoveryMs: 180,
      range: 150,
      damageMultiplier: 0,
      fixedDamage: 0,
      targeting: 'dash',
    },
    damageMultiplierPerLevel: 0,
    rangePerLevel: 30,
    cooldownReductionPerLevel: 250,
    effect: { type: 'dash' },
  },
  'storm-shield': {
    id: 'storm-shield',
    icon: 'shield',
    maxLevel: 3,
    base: {
      id: 'storm-shield',
      cooldownMs: 8000,
      windupMs: 240,
      castMs: 100,
      recoveryMs: 220,
      range: 0,
      damageMultiplier: 0,
      fixedDamage: 0,
      targeting: 'area',
    },
    damageMultiplierPerLevel: 0,
    rangePerLevel: 0,
    cooldownReductionPerLevel: 400,
    effect: { type: 'shield', basePoints: 1, pointsPerLevel: 1 },
  },
};

export function getPlayerSkillDefinition(
  skillId: PlayerSkillId,
  level: number,
  cooldownMultiplier = 1,
): SkillDefinition {
  const definition = playerSkillDefinitions[skillId];
  const normalizedLevel = Math.min(definition.maxLevel, Math.max(1, Math.floor(level)));
  const levelOffset = normalizedLevel - 1;
  return {
    ...definition.base,
    cooldownMs: Math.max(
      250,
      (definition.base.cooldownMs - definition.cooldownReductionPerLevel * levelOffset)
        * Math.max(0.5, cooldownMultiplier),
    ),
    range: definition.base.range + definition.rangePerLevel * levelOffset,
    damageMultiplier: definition.base.damageMultiplier
      + definition.damageMultiplierPerLevel * levelOffset,
  };
}

export function getShieldPoints(skillId: PlayerSkillId, level: number) {
  const effect = playerSkillDefinitions[skillId].effect;
  if (effect.type !== 'shield') return 0;
  return effect.basePoints + effect.pointsPerLevel * (Math.max(1, level) - 1);
}

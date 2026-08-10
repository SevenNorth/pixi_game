import type { SkillDefinition } from '../../simulation/SkillSystem';

export type PlayerSkillId = 'lightning-bolt' | 'thunder-dash' | 'storm-shield';
export type PlayerSkillIcon = 'lightning' | 'dash' | 'shield';

export type PlayerSkillEffect =
  | {
      type: 'projectile';
      speed: number;
      splashRadius: number;
      splashRadiusPerLevel: number;
      splashDamageMultiplier: number;
      splashDamageMultiplierPerLevel: number;
    }
  | {
      type: 'dash';
      invulnerabilityMsByLevel: readonly [number, number, number];
      pathDamageMultiplierByLevel: readonly [number, number, number];
      pathRadius: number;
    }
  | {
      type: 'shield';
      basePoints: number;
      pointsPerLevel: number;
      protectionMsByLevel: readonly [number, number, number];
      damageTakenMultiplierByLevel: readonly [number, number, number];
    };

export type ResolvedPlayerSkillEffect =
  | {
      type: 'projectile';
      speed: number;
      splashRadius: number;
      splashDamageMultiplier: number;
    }
  | {
      type: 'dash';
      invulnerabilityMs: number;
      pathDamageMultiplier: number;
      pathRadius: number;
    }
  | {
      type: 'shield';
      points: number;
      protectionMs: number;
      damageTakenMultiplier: number;
    };

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
      splashRadiusPerLevel: 18,
      splashDamageMultiplier: 0.5,
      splashDamageMultiplierPerLevel: 0.15,
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
    effect: {
      type: 'dash',
      invulnerabilityMsByLevel: [0, 320, 520],
      pathDamageMultiplierByLevel: [0, 0, 0.8],
      pathRadius: 38,
    },
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
    effect: {
      type: 'shield',
      basePoints: 1,
      pointsPerLevel: 1,
      protectionMsByLevel: [0, 0, 1600],
      damageTakenMultiplierByLevel: [1, 1, 0.5],
    },
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
  const effect = getPlayerSkillEffect(skillId, level);
  return effect.type === 'shield' ? effect.points : 0;
}

export function getPlayerSkillEffect(
  skillId: PlayerSkillId,
  level: number,
): ResolvedPlayerSkillEffect {
  const definition = playerSkillDefinitions[skillId];
  const normalizedLevel = Math.min(definition.maxLevel, Math.max(1, Math.floor(level)));
  const levelOffset = normalizedLevel - 1;
  const effect = definition.effect;
  if (effect.type === 'projectile') {
    return {
      type: 'projectile',
      speed: effect.speed,
      splashRadius: effect.splashRadius + effect.splashRadiusPerLevel * levelOffset,
      splashDamageMultiplier: effect.splashDamageMultiplier
        + effect.splashDamageMultiplierPerLevel * levelOffset,
    };
  }
  if (effect.type === 'dash') {
    return {
      type: 'dash',
      invulnerabilityMs: effect.invulnerabilityMsByLevel[levelOffset],
      pathDamageMultiplier: effect.pathDamageMultiplierByLevel[levelOffset],
      pathRadius: effect.pathRadius,
    };
  }
  return {
    type: 'shield',
    points: effect.basePoints + effect.pointsPerLevel * levelOffset,
    protectionMs: effect.protectionMsByLevel[levelOffset],
    damageTakenMultiplier: effect.damageTakenMultiplierByLevel[levelOffset],
  };
}

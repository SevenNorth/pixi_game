import type { SkillDefinition } from '../../simulation/SkillSystem';

export type PlayerSkillId =
  | 'lightning-bolt'
  | 'thunder-dash'
  | 'storm-shield'
  | 'thunder-strike'
  | 'chain-lightning'
  | 'static-field';
export type PlayerSkillIcon = 'lightning' | 'dash' | 'shield' | 'strike' | 'chain' | 'field';

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
    }
  | {
      type: 'delayed-area';
      delayMs: number;
      radius: number;
      radiusPerLevel: number;
      strikeCountByLevel: readonly [number, number, number];
      strikeIntervalMs: number;
    }
  | {
      type: 'chain';
      jumpsByLevel: readonly [number, number, number];
      jumpRange: number;
      jumpRangePerLevel: number;
      retainedDamageByLevel: readonly [number, number, number];
    }
  | {
      type: 'field';
      radius: number;
      radiusPerLevel: number;
      durationMs: number;
      durationPerLevelMs: number;
      tickIntervalMs: number;
      slowMultiplierByLevel: readonly [number, number, number];
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
    }
  | {
      type: 'delayed-area';
      delayMs: number;
      radius: number;
      strikeCount: number;
      strikeIntervalMs: number;
    }
  | {
      type: 'chain';
      jumps: number;
      jumpRange: number;
      retainedDamage: number;
    }
  | {
      type: 'field';
      radius: number;
      durationMs: number;
      tickIntervalMs: number;
      slowMultiplier: number;
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
      cooldownMs: 3200,
      windupMs: 180,
      castMs: 80,
      recoveryMs: 160,
      range: 620,
      damageMultiplier: 1.7,
      fixedDamage: 0,
      targeting: 'direction',
    },
    damageMultiplierPerLevel: 0.4,
    rangePerLevel: 50,
    cooldownReductionPerLevel: 180,
    effect: {
      type: 'projectile',
      speed: 560,
      splashRadius: 72,
      splashRadiusPerLevel: 18,
      splashDamageMultiplier: 0.45,
      splashDamageMultiplierPerLevel: 0.15,
    },
  },
  'thunder-dash': {
    id: 'thunder-dash',
    icon: 'dash',
    maxLevel: 3,
    base: {
      id: 'thunder-dash',
      cooldownMs: 4500,
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
      invulnerabilityMsByLevel: [0, 360, 560],
      pathDamageMultiplierByLevel: [0, 0, 0.9],
      pathRadius: 38,
    },
  },
  'storm-shield': {
    id: 'storm-shield',
    icon: 'shield',
    maxLevel: 3,
    base: {
      id: 'storm-shield',
      cooldownMs: 9000,
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
    cooldownReductionPerLevel: 450,
    effect: {
      type: 'shield',
      basePoints: 1,
      pointsPerLevel: 0.5,
      protectionMsByLevel: [0, 700, 1500],
      damageTakenMultiplierByLevel: [1, 0.8, 0.55],
    },
  },
  'thunder-strike': {
    id: 'thunder-strike',
    icon: 'strike',
    maxLevel: 3,
    base: {
      id: 'thunder-strike',
      cooldownMs: 6200,
      windupMs: 220,
      castMs: 100,
      recoveryMs: 220,
      range: 520,
      damageMultiplier: 2.2,
      fixedDamage: 0,
      targeting: 'nearest',
    },
    damageMultiplierPerLevel: 0.45,
    rangePerLevel: 45,
    cooldownReductionPerLevel: 300,
    effect: {
      type: 'delayed-area',
      delayMs: 520,
      radius: 88,
      radiusPerLevel: 16,
      strikeCountByLevel: [1, 1, 2],
      strikeIntervalMs: 260,
    },
  },
  'chain-lightning': {
    id: 'chain-lightning',
    icon: 'chain',
    maxLevel: 3,
    base: {
      id: 'chain-lightning',
      cooldownMs: 5000,
      windupMs: 160,
      castMs: 100,
      recoveryMs: 180,
      range: 540,
      damageMultiplier: 1.45,
      fixedDamage: 0,
      targeting: 'nearest',
    },
    damageMultiplierPerLevel: 0.3,
    rangePerLevel: 40,
    cooldownReductionPerLevel: 240,
    effect: {
      type: 'chain',
      jumpsByLevel: [3, 4, 5],
      jumpRange: 190,
      jumpRangePerLevel: 25,
      retainedDamageByLevel: [0.7, 0.76, 0.82],
    },
  },
  'static-field': {
    id: 'static-field',
    icon: 'field',
    maxLevel: 3,
    base: {
      id: 'static-field',
      cooldownMs: 9000,
      windupMs: 260,
      castMs: 120,
      recoveryMs: 220,
      range: 0,
      damageMultiplier: 0.65,
      fixedDamage: 0,
      targeting: 'area',
    },
    damageMultiplierPerLevel: 0.15,
    rangePerLevel: 0,
    cooldownReductionPerLevel: 400,
    effect: {
      type: 'field',
      radius: 125,
      radiusPerLevel: 20,
      durationMs: 3600,
      durationPerLevelMs: 600,
      tickIntervalMs: 600,
      slowMultiplierByLevel: [0.82, 0.72, 0.62],
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
  if (effect.type === 'shield') return {
    type: 'shield',
    points: effect.basePoints + effect.pointsPerLevel * levelOffset,
    protectionMs: effect.protectionMsByLevel[levelOffset],
    damageTakenMultiplier: effect.damageTakenMultiplierByLevel[levelOffset],
  };
  if (effect.type === 'delayed-area') return {
    type: 'delayed-area',
    delayMs: effect.delayMs,
    radius: effect.radius + effect.radiusPerLevel * levelOffset,
    strikeCount: effect.strikeCountByLevel[levelOffset],
    strikeIntervalMs: effect.strikeIntervalMs,
  };
  if (effect.type === 'chain') return {
    type: 'chain',
    jumps: effect.jumpsByLevel[levelOffset],
    jumpRange: effect.jumpRange + effect.jumpRangePerLevel * levelOffset,
    retainedDamage: effect.retainedDamageByLevel[levelOffset],
  };
  return {
    type: 'field',
    radius: effect.radius + effect.radiusPerLevel * levelOffset,
    durationMs: effect.durationMs + effect.durationPerLevelMs * levelOffset,
    tickIntervalMs: effect.tickIntervalMs,
    slowMultiplier: effect.slowMultiplierByLevel[levelOffset],
  };
}

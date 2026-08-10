export type EnemyKind = 'normal' | 'elite' | 'boss';
export type EnemySkillKind = 'aimed-shot' | 'radial-burst' | 'spread-shot';
export type BossVariant = 'dragon-black' | 'dragon-green';

export interface EnemyDefinition {
  kind: EnemyKind;
  maxHp: number;
  contactDamage: number;
  projectileDamage: number;
  skillDamage: number;
  speed: number;
  experience: number;
  preferredRange: number;
  attackCooldownMs: number;
  skillCooldownMs: number;
  skillKinds: readonly EnemySkillKind[];
  warningMs: number;
  sizeMultiplier: number;
  patrolRadius: number;
  patrolReachDistance: number;
  aggroEnterDistance: number;
  aggroExitDistance: number;
  maxChaseDistance: number;
}

export interface BossCombatVariantDefinition {
  id: BossVariant;
  phaseOneSkills: readonly EnemySkillKind[];
  phaseTwoSkills: readonly EnemySkillKind[];
}

export const ELITE_SECOND_SKILL_LEVEL = 4;
export const BOSS_PHASE_TWO_HP_RATIO = 0.5;
export const BOSS_PHASE_TRANSITION_INVULNERABILITY_MS = 700;
export const BOSS_PHASE_TWO_ATTACK_COOLDOWN_MULTIPLIER = 0.78;
export const BOSS_PHASE_TWO_SKILL_COOLDOWN_MULTIPLIER = 0.75;
export const BOSS_PHASE_TWO_SPEED_MULTIPLIER = 1.12;

export const bossCombatVariants: Record<BossVariant, BossCombatVariantDefinition> = {
  'dragon-black': {
    id: 'dragon-black',
    phaseOneSkills: ['aimed-shot', 'radial-burst'],
    phaseTwoSkills: ['aimed-shot', 'spread-shot', 'aimed-shot', 'radial-burst'],
  },
  'dragon-green': {
    id: 'dragon-green',
    phaseOneSkills: ['radial-burst', 'aimed-shot'],
    phaseTwoSkills: ['radial-burst', 'spread-shot', 'radial-burst', 'aimed-shot'],
  },
};

export const enemyDefinitions: Record<EnemyKind, EnemyDefinition> = {
  normal: {
    kind: 'normal',
    maxHp: 2,
    contactDamage: 1,
    projectileDamage: 0,
    skillDamage: 0,
    speed: 98,
    experience: 1,
    preferredRange: 0,
    attackCooldownMs: 0,
    skillCooldownMs: 0,
    skillKinds: [],
    warningMs: 0,
    sizeMultiplier: 1,
    patrolRadius: 160,
    patrolReachDistance: 14,
    aggroEnterDistance: 320,
    aggroExitDistance: 440,
    maxChaseDistance: 600,
  },
  elite: {
    kind: 'elite',
    maxHp: 6,
    contactDamage: 1,
    projectileDamage: 0.5,
    skillDamage: 1,
    speed: 82,
    experience: 4,
    preferredRange: 240,
    attackCooldownMs: 2100,
    skillCooldownMs: 4200,
    skillKinds: ['aimed-shot'],
    warningMs: 480,
    sizeMultiplier: 2,
    patrolRadius: 240,
    patrolReachDistance: 20,
    aggroEnterDistance: 420,
    aggroExitDistance: 560,
    maxChaseDistance: 760,
  },
  boss: {
    kind: 'boss',
    maxHp: 42,
    contactDamage: 1,
    projectileDamage: 0.5,
    skillDamage: 1.5,
    speed: 58,
    experience: 12,
    preferredRange: 300,
    attackCooldownMs: 1300,
    skillCooldownMs: 3600,
    skillKinds: ['radial-burst', 'aimed-shot'],
    warningMs: 720,
    sizeMultiplier: 3.5,
    patrolRadius: 320,
    patrolReachDistance: 28,
    aggroEnterDistance: 560,
    aggroExitDistance: 720,
    maxChaseDistance: 960,
  },
};

export function getEnemyDefinition(kind: EnemyKind) {
  return enemyDefinitions[kind];
}

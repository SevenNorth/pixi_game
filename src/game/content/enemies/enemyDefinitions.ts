export type EnemyKind = 'normal' | 'elite' | 'boss';
export type EnemySkillKind = 'aimed-shot' | 'radial-burst';

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

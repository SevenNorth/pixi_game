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
  },
  elite: {
    kind: 'elite',
    maxHp: 6,
    contactDamage: 1,
    projectileDamage: 0.5,
    skillDamage: 1,
    speed: 112,
    experience: 4,
    preferredRange: 240,
    attackCooldownMs: 2100,
    skillCooldownMs: 4200,
    skillKinds: ['aimed-shot'],
    warningMs: 480,
  },
  boss: {
    kind: 'boss',
    maxHp: 42,
    contactDamage: 1,
    projectileDamage: 0.5,
    skillDamage: 1.5,
    speed: 76,
    experience: 12,
    preferredRange: 300,
    attackCooldownMs: 1300,
    skillCooldownMs: 3600,
    skillKinds: ['radial-burst', 'aimed-shot'],
    warningMs: 720,
  },
};

export function getEnemyDefinition(kind: EnemyKind) {
  return enemyDefinitions[kind];
}

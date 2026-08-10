import {
  BOSS_PHASE_TRANSITION_INVULNERABILITY_MS,
  BOSS_PHASE_TWO_ATTACK_COOLDOWN_MULTIPLIER,
  BOSS_PHASE_TWO_HP_RATIO,
  BOSS_PHASE_TWO_SKILL_COOLDOWN_MULTIPLIER,
  BOSS_PHASE_TWO_SPEED_MULTIPLIER,
  bossCombatVariants,
  ELITE_SECOND_SKILL_LEVEL,
  getEnemyDefinition,
} from '../content/enemies/enemyDefinitions';
import type {
  BossVariant,
  EnemyKind,
  EnemySkillKind,
} from '../content/enemies/enemyDefinitions';
import { getMonsterLevelModifiers } from './MonsterLevelScaling';

export type MonsterAggroState = 'idle' | 'chasing' | 'returning';
export type BossCombatPhase = 1 | 2;

export interface MonsterCombatState {
  level: number;
  hp: number;
  maxHp: number;
  contactDamage: number;
  projectileDamage: number;
  skillDamage: number;
  speed: number;
  experience: number;
  aggro: MonsterAggroState;
  homeX: number;
  homeY: number;
  patrolTargetX: number;
  patrolTargetY: number;
  patrolTargetActive: boolean;
  patrolPauseUntil: number;
  kind: EnemyKind;
  bossVariant?: BossVariant;
  bossPhase: BossCombatPhase;
  invulnerableUntil: number;
  nextAttackAt: number;
  nextSkillAt: number;
  skillSequence: number;
  activeSkill?: {
    kind: EnemySkillKind;
    endsAt: number;
    directionX: number;
    directionY: number;
  };
}

export interface MonsterDamageResult {
  applied: boolean;
  damage: number;
  remainingHp: number;
  defeated: boolean;
  phaseChanged: boolean;
}

export function createMonsterCombatState(
  level = 1,
  homeX = 0,
  homeY = 0,
  kind: EnemyKind = 'normal',
  now = 0,
  bossVariant?: BossVariant,
): MonsterCombatState {
  const normalizedLevel = Math.max(1, Math.floor(level));
  const definition = getEnemyDefinition(kind);
  const modifiers = getMonsterLevelModifiers(normalizedLevel);
  const maxHp = Math.max(1, Math.round(definition.maxHp * modifiers.hpMultiplier));
  return {
    level: normalizedLevel,
    hp: maxHp,
    maxHp,
    contactDamage: definition.contactDamage + modifiers.damageBonus,
    projectileDamage: definition.projectileDamage > 0
      ? definition.projectileDamage + modifiers.damageBonus
      : 0,
    skillDamage: definition.skillDamage > 0
      ? definition.skillDamage + modifiers.damageBonus
      : 0,
    speed: definition.speed * modifiers.speedMultiplier,
    experience: definition.experience * normalizedLevel,
    aggro: 'idle',
    homeX,
    homeY,
    patrolTargetX: homeX,
    patrolTargetY: homeY,
    patrolTargetActive: false,
    patrolPauseUntil: 0,
    kind,
    bossVariant,
    bossPhase: 1,
    invulnerableUntil: 0,
    nextAttackAt: now + definition.attackCooldownMs,
    nextSkillAt: now + definition.skillCooldownMs,
    skillSequence: 0,
  };
}

export function getEnemySkillKind(state: MonsterCombatState): EnemySkillKind | undefined {
  const skillKinds = getEnemySkillKinds(state);
  if (skillKinds.length === 0) return undefined;
  return skillKinds[state.skillSequence % skillKinds.length];
}

export function getEnemyAttackCooldownMs(state: MonsterCombatState) {
  const baseCooldown = getEnemyDefinition(state.kind).attackCooldownMs;
  return state.kind === 'boss' && state.bossPhase === 2
    ? baseCooldown * BOSS_PHASE_TWO_ATTACK_COOLDOWN_MULTIPLIER
    : baseCooldown;
}

export function getEnemySkillCooldownMs(state: MonsterCombatState) {
  const baseCooldown = getEnemyDefinition(state.kind).skillCooldownMs;
  return state.kind === 'boss' && state.bossPhase === 2
    ? baseCooldown * BOSS_PHASE_TWO_SKILL_COOLDOWN_MULTIPLIER
    : baseCooldown;
}

export function startEnemySkill(
  state: MonsterCombatState,
  kind: EnemySkillKind,
  directionX: number,
  directionY: number,
  now: number,
) {
  const definition = getEnemyDefinition(state.kind);
  state.activeSkill = {
    kind,
    endsAt: now + definition.warningMs,
    directionX,
    directionY,
  };
  state.skillSequence += 1;
}

export function finishEnemySkill(state: MonsterCombatState, now: number) {
  state.activeSkill = undefined;
  state.nextSkillAt = now + getEnemySkillCooldownMs(state);
}

export function setMonsterPatrolTarget(
  state: MonsterCombatState,
  targetX: number,
  targetY: number,
  pauseUntil: number,
) {
  state.patrolTargetX = targetX;
  state.patrolTargetY = targetY;
  state.patrolTargetActive = true;
  state.patrolPauseUntil = pauseUntil;
}

export function pauseMonsterPatrol(state: MonsterCombatState, pauseUntil: number) {
  state.patrolTargetActive = false;
  state.patrolPauseUntil = pauseUntil;
}

export function relocateMonsterCombatState(
  state: MonsterCombatState,
  homeX: number,
  homeY: number,
  now: number,
) {
  state.aggro = 'idle';
  state.homeX = homeX;
  state.homeY = homeY;
  state.patrolTargetX = homeX;
  state.patrolTargetY = homeY;
  state.patrolTargetActive = false;
  state.patrolPauseUntil = now;
  state.activeSkill = undefined;
  state.nextAttackAt = now + getEnemyAttackCooldownMs(state);
  state.nextSkillAt = now + getEnemySkillCooldownMs(state);
}

export function applyMonsterDamage(
  state: MonsterCombatState,
  amount: number,
  now: number,
): MonsterDamageResult {
  if (now < state.invulnerableUntil) {
    return {
      applied: false,
      damage: 0,
      remainingHp: state.hp,
      defeated: false,
      phaseChanged: false,
    };
  }
  const previousHp = state.hp;
  const damage = Math.max(0, amount);
  state.hp = Math.max(0, state.hp - damage);
  const phaseChanged = enterBossPhaseTwoIfNeeded(state, now);
  const appliedDamage = previousHp - state.hp;
  return {
    applied: appliedDamage > 0,
    damage: appliedDamage,
    remainingHp: state.hp,
    defeated: state.hp <= 0 && !phaseChanged,
    phaseChanged,
  };
}

function getEnemySkillKinds(state: MonsterCombatState): readonly EnemySkillKind[] {
  const definition = getEnemyDefinition(state.kind);
  if (state.kind === 'elite' && state.level >= ELITE_SECOND_SKILL_LEVEL) {
    return ['aimed-shot', 'radial-burst'];
  }
  if (state.kind !== 'boss') return definition.skillKinds;
  const variant = bossCombatVariants[state.bossVariant ?? 'dragon-black'];
  return state.bossPhase === 2 ? variant.phaseTwoSkills : variant.phaseOneSkills;
}

function enterBossPhaseTwoIfNeeded(state: MonsterCombatState, now: number) {
  if (
    state.kind !== 'boss'
    || state.bossPhase !== 1
    || state.hp > state.maxHp * BOSS_PHASE_TWO_HP_RATIO
  ) return false;

  state.hp = Math.max(state.hp, Math.ceil(state.maxHp * BOSS_PHASE_TWO_HP_RATIO));
  state.bossPhase = 2;
  state.invulnerableUntil = now + BOSS_PHASE_TRANSITION_INVULNERABILITY_MS;
  state.activeSkill = undefined;
  state.speed *= BOSS_PHASE_TWO_SPEED_MULTIPLIER;
  state.nextAttackAt = state.invulnerableUntil + getEnemyAttackCooldownMs(state) * 0.35;
  state.nextSkillAt = state.invulnerableUntil + getEnemySkillCooldownMs(state) * 0.45;
  return true;
}

export function updateMonsterAggro(
  state: MonsterCombatState,
  playerDistance: number,
  homeDistance: number,
) {
  const definition = getEnemyDefinition(state.kind);
  if (state.aggro === 'returning') return state.aggro;

  if (state.aggro === 'idle' && playerDistance <= definition.aggroEnterDistance) {
    state.aggro = 'chasing';
  } else if (
    state.aggro === 'chasing' &&
    (playerDistance >= definition.aggroExitDistance || homeDistance >= definition.maxChaseDistance)
  ) {
    state.aggro = 'returning';
  }
  return state.aggro;
}

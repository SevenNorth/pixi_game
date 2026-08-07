import { getEnemyDefinition } from '../content/enemies/enemyDefinitions';
import type { EnemyKind, EnemySkillKind } from '../content/enemies/enemyDefinitions';
import { getMonsterLevelModifiers } from './MonsterLevelScaling';

export type MonsterAggroState = 'idle' | 'chasing' | 'returning';

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
  damage: number;
  remainingHp: number;
  defeated: boolean;
}

export function createMonsterCombatState(
  level = 1,
  homeX = 0,
  homeY = 0,
  kind: EnemyKind = 'normal',
  now = 0,
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
    nextAttackAt: now + definition.attackCooldownMs,
    nextSkillAt: now + definition.skillCooldownMs,
    skillSequence: 0,
  };
}

export function getEnemySkillKind(state: MonsterCombatState): EnemySkillKind | undefined {
  const definition = getEnemyDefinition(state.kind);
  if (definition.skillKinds.length === 0) return undefined;
  return definition.skillKinds[state.skillSequence % definition.skillKinds.length];
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
  state.nextSkillAt = now + getEnemyDefinition(state.kind).skillCooldownMs;
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

export function applyMonsterDamage(state: MonsterCombatState, amount: number): MonsterDamageResult {
  const damage = Math.max(0, amount);
  state.hp = Math.max(0, state.hp - damage);
  return {
    damage,
    remainingHp: state.hp,
    defeated: state.hp <= 0,
  };
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

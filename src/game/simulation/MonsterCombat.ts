export type MonsterAggroState = 'idle' | 'chasing' | 'returning';

export interface MonsterCombatState {
  level: number;
  hp: number;
  maxHp: number;
  attack: number;
  speed: number;
  experience: number;
  aggro: MonsterAggroState;
  homeX: number;
  homeY: number;
  patrolTargetX: number;
  patrolTargetY: number;
  patrolTargetActive: boolean;
  patrolPauseUntil: number;
}

export interface MonsterDamageResult {
  damage: number;
  remainingHp: number;
  defeated: boolean;
}

export const MONSTER_AGGRO_ENTER_DISTANCE = 320;
export const MONSTER_AGGRO_EXIT_DISTANCE = 440;
export const MONSTER_PATROL_RADIUS = 160;
export const MONSTER_PATROL_REACH_DISTANCE = 14;
export const MONSTER_MAX_CHASE_DISTANCE = 600;

export function createMonsterCombatState(level = 1, homeX = 0, homeY = 0): MonsterCombatState {
  const normalizedLevel = Math.max(1, Math.floor(level));
  const maxHp = normalizedLevel + 1;
  return {
    level: normalizedLevel,
    hp: maxHp,
    maxHp,
    attack: 1,
    speed: 98,
    experience: normalizedLevel,
    aggro: 'idle',
    homeX,
    homeY,
    patrolTargetX: homeX,
    patrolTargetY: homeY,
    patrolTargetActive: false,
    patrolPauseUntil: 0,
  };
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
  const damage = Math.max(0, Math.floor(amount));
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
  if (state.aggro === 'returning') return state.aggro;

  if (state.aggro === 'idle' && playerDistance <= MONSTER_AGGRO_ENTER_DISTANCE) {
    state.aggro = 'chasing';
  } else if (
    state.aggro === 'chasing' &&
    (playerDistance >= MONSTER_AGGRO_EXIT_DISTANCE || homeDistance >= MONSTER_MAX_CHASE_DISTANCE)
  ) {
    state.aggro = 'returning';
  }
  return state.aggro;
}

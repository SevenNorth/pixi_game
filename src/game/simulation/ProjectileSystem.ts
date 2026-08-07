export type Faction = 'player' | 'enemy';

export interface ProjectileState {
  id: string;
  ownerId: string;
  faction: Faction;
  damage: number;
  velocityX: number;
  velocityY: number;
  remainingDistance: number;
  collisionEnabledAt: number;
}

export type ProjectileConfig = ProjectileState;

export function createProjectileState(config: ProjectileConfig): ProjectileState {
  return {
    ...config,
    damage: Math.max(0, Math.round(config.damage)),
    remainingDistance: Math.max(0, config.remainingDistance),
  };
}

export function advanceProjectileDistance(state: ProjectileState, deltaMs: number) {
  const speed = Math.hypot(state.velocityX, state.velocityY);
  state.remainingDistance = Math.max(
    0,
    state.remainingDistance - speed * (Math.max(0, deltaMs) / 1000),
  );
  return state.remainingDistance > 0;
}

export function canProjectileHit(state: ProjectileState, targetFaction: Faction) {
  return state.faction !== targetFaction && state.damage > 0;
}

export function isProjectileCollisionEnabled(state: ProjectileState, now: number) {
  return now >= state.collisionEnabledAt;
}

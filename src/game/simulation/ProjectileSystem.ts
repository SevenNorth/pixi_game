export type Faction = 'player' | 'enemy';

export interface ProjectileSplashImpact {
  type: 'splash';
  radius: number;
  damageMultiplier: number;
}

export interface ProjectileState {
  id: string;
  ownerId: string;
  faction: Faction;
  damage: number;
  velocityX: number;
  velocityY: number;
  remainingDistance: number;
  collisionEnabledAt: number;
  impact?: ProjectileSplashImpact;
  pierceRemaining?: number;
  hitTargetIds?: string[];
}

export type ProjectileConfig = ProjectileState;

export function createProjectileState(config: ProjectileConfig): ProjectileState {
  return {
    ...config,
    damage: Math.max(0, config.damage),
    remainingDistance: Math.max(0, config.remainingDistance),
    pierceRemaining: Math.max(0, Math.floor(config.pierceRemaining ?? 0)),
    hitTargetIds: [...(config.hitTargetIds ?? [])],
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

export function hasProjectileHitTarget(state: ProjectileState, targetId: string) {
  return state.hitTargetIds?.includes(targetId) ?? false;
}

export function recordProjectileTargetHit(state: ProjectileState, targetId: string) {
  if (hasProjectileHitTarget(state, targetId)) return false;
  (state.hitTargetIds ??= []).push(targetId);
  return true;
}

export function consumeProjectilePierce(state: ProjectileState) {
  const remaining = Math.max(0, state.pierceRemaining ?? 0);
  if (remaining <= 0) return false;
  state.pierceRemaining = remaining - 1;
  return true;
}

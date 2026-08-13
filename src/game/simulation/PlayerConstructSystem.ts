export interface ConstructPoint { x: number; y: number }

export interface OrbitState {
  id: string; count: number; radius: number; damage: number; endsAt: number;
  hitCooldownMs: number; angularSpeed: number;
}
export interface MovingOrbState extends ConstructPoint {
  id: string; velocityX: number; velocityY: number; radius: number; damage: number;
  endsAt: number; nextTickAt: number; tickIntervalMs: number;
}
export interface VortexState extends ConstructPoint {
  id: string; radius: number; damage: number; pullSpeed: number; endsAt: number;
  nextTickAt: number; tickIntervalMs: number;
}
export interface TurretState extends ConstructPoint {
  id: string; damage: number; range: number; endsAt: number; nextAttackAt: number;
  attackIntervalMs: number;
}
export type ConstructEvent =
  | { type: 'orb-tick'; state: MovingOrbState }
  | { type: 'vortex-tick'; state: VortexState }
  | { type: 'turret-ready'; state: TurretState }
  | { type: 'expired'; constructId: string };

export class PlayerConstructSystem {
  private orbits: OrbitState[] = [];
  private orbs: MovingOrbState[] = [];
  private vortexes: VortexState[] = [];
  private turrets: TurretState[] = [];
  private orbitHits = new Map<string, number>();
  private nextId = 1;
  private lastUpdatedAt = 0;

  reset(now = 0) {
    this.orbits = []; this.orbs = []; this.vortexes = []; this.turrets = [];
    this.orbitHits.clear(); this.nextId = 1; this.lastUpdatedAt = now;
  }

  createOrbit(config: Omit<OrbitState, 'id' | 'endsAt' | 'angularSpeed'> & { now: number; durationMs: number }) {
    const state: OrbitState = { id: `orbit-${this.nextId++}`, count: config.count, radius: config.radius,
      damage: config.damage, endsAt: config.now + config.durationMs, hitCooldownMs: config.hitCooldownMs,
      angularSpeed: 0.0022 };
    this.orbits.push(state); return state;
  }

  createMovingOrb(config: Omit<MovingOrbState, 'id' | 'endsAt' | 'nextTickAt'> & { now: number; durationMs: number }) {
    const state: MovingOrbState = { ...config, id: `orb-${this.nextId++}`,
      endsAt: config.now + config.durationMs, nextTickAt: config.now };
    this.orbs.push(state); return state;
  }

  createVortex(config: Omit<VortexState, 'id' | 'endsAt' | 'nextTickAt'> & { now: number; durationMs: number }) {
    const state: VortexState = { ...config, id: `vortex-${this.nextId++}`,
      endsAt: config.now + config.durationMs, nextTickAt: config.now };
    this.vortexes.push(state); return state;
  }

  createTurrets(config: Omit<TurretState, 'id' | 'endsAt' | 'nextAttackAt'> & { now: number; durationMs: number; count: number }) {
    const states = Array.from({ length: config.count }, (_, index) => {
      const angle = config.count === 1 ? 0 : Math.PI * 2 * index / config.count;
      const state: TurretState = { id: `turret-${this.nextId++}`,
        x: config.x + Math.cos(angle) * (config.count === 1 ? 0 : 42),
        y: config.y + Math.sin(angle) * (config.count === 1 ? 0 : 42), damage: config.damage,
        range: config.range, endsAt: config.now + config.durationMs,
        nextAttackAt: config.now, attackIntervalMs: config.attackIntervalMs };
      this.turrets.push(state); return state;
    });
    return states;
  }

  update(now: number) {
    const events: ConstructEvent[] = [];
    const deltaSeconds = Math.max(0, Math.min(50, now - this.lastUpdatedAt)) / 1000;
    this.lastUpdatedAt = now;
    this.orbs.forEach(orb => {
      orb.x += orb.velocityX * deltaSeconds; orb.y += orb.velocityY * deltaSeconds;
      while (orb.nextTickAt <= orb.endsAt && now >= orb.nextTickAt) {
        events.push({ type: 'orb-tick', state: { ...orb } }); orb.nextTickAt += orb.tickIntervalMs;
      }
    });
    this.vortexes.forEach(vortex => {
      while (vortex.nextTickAt <= vortex.endsAt && now >= vortex.nextTickAt) {
        events.push({ type: 'vortex-tick', state: { ...vortex } }); vortex.nextTickAt += vortex.tickIntervalMs;
      }
    });
    this.turrets.forEach(turret => {
      if (now >= turret.nextAttackAt && now < turret.endsAt) {
        events.push({ type: 'turret-ready', state: { ...turret } });
        turret.nextAttackAt = now + turret.attackIntervalMs;
      }
    });
    const expiredIds = [
      ...this.orbits.filter(item => now >= item.endsAt).map(item => item.id),
      ...this.orbs.filter(item => now >= item.endsAt).map(item => item.id),
      ...this.vortexes.filter(item => now >= item.endsAt).map(item => item.id),
      ...this.turrets.filter(item => now >= item.endsAt).map(item => item.id),
    ];
    expiredIds.forEach(constructId => events.push({ type: 'expired', constructId }));
    this.orbits = this.orbits.filter(item => now < item.endsAt);
    this.orbs = this.orbs.filter(item => now < item.endsAt);
    this.vortexes = this.vortexes.filter(item => now < item.endsAt);
    this.turrets = this.turrets.filter(item => now < item.endsAt);
    return events;
  }

  canOrbitHit(orbitId: string, targetId: string, now: number, cooldownMs: number) {
    const key = `${orbitId}:${targetId}`; const readyAt = this.orbitHits.get(key) ?? 0;
    if (now < readyAt) return false; this.orbitHits.set(key, now + cooldownMs); return true;
  }

  getOrbitPoints(player: ConstructPoint, now: number) {
    return this.orbits.flatMap(orbit => Array.from({ length: orbit.count }, (_, orbitIndex) => {
      const angle = now * orbit.angularSpeed + Math.PI * 2 * orbitIndex / orbit.count;
      return {
        orbit,
        orbitIndex,
        x: player.x + Math.cos(angle) * orbit.radius,
        y: player.y + Math.sin(angle) * orbit.radius,
      };
    }));
  }
  getOrbs() { return this.orbs as readonly MovingOrbState[]; }
  getVortexes() { return this.vortexes as readonly VortexState[]; }
  getTurrets() { return this.turrets as readonly TurretState[]; }
}

export type FoodKey = 'apple' | 'banana' | 'bread' | 'chess' | 'strawberry';
export type ActiveEffectId = 'haste' | 'rapidFire' | 'xpBoost';

export interface ActiveEffectView {
  id: ActiveEffectId;
  stacks: number;
  remainingMs: number;
}

interface FoodEffectDefinition {
  id?: ActiveEffectId;
  durationMs?: number;
  maxStacks?: number;
  restoreHp?: number;
  restoreShield?: number;
}

interface ActiveEffect {
  id: ActiveEffectId;
  stacks: number;
  expiresAt: number;
  maxStacks: number;
}

const definitions: Record<FoodKey, FoodEffectDefinition> = {
  apple: { restoreHp: 1 },
  banana: { id: 'haste', durationMs: 6000, maxStacks: 2 },
  bread: { restoreShield: 1 },
  chess: { id: 'rapidFire', durationMs: 6000, maxStacks: 2 },
  strawberry: { id: 'xpBoost', durationMs: 8000, maxStacks: 2 },
};

export class FoodEffectSystem {
  private active: ActiveEffect[] = [];

  reset() {
    this.active = [];
  }

  consume(foodKey: FoodKey, now: number) {
    const definition = definitions[foodKey];
    if (definition.id && definition.durationMs) {
      const existing = this.active.find(effect => effect.id === definition.id);
      if (existing) {
        existing.stacks = Math.min(existing.maxStacks, existing.stacks + 1);
        existing.expiresAt = now + definition.durationMs;
      } else {
        this.active.push({
          id: definition.id,
          stacks: 1,
          expiresAt: now + definition.durationMs,
          maxStacks: definition.maxStacks ?? 1,
        });
      }
    }

    return {
      restoreHp: definition.restoreHp ?? 0,
      restoreShield: definition.restoreShield ?? 0,
    };
  }

  update(now: number) {
    this.active = this.active.filter(effect => effect.expiresAt > now);
  }

  getActive(now: number): ActiveEffectView[] {
    return this.active.map(effect => ({
      id: effect.id,
      stacks: effect.stacks,
      remainingMs: Math.max(0, effect.expiresAt - now),
    }));
  }

  getMoveSpeed(baseSpeed: number) {
    return baseSpeed * (1 + this.getStacks('haste') * 0.2);
  }

  getAttackCooldown(baseCooldown: number) {
    return baseCooldown / (1 + this.getStacks('rapidFire') * 0.25);
  }

  getExperienceGain(baseExperience: number) {
    return baseExperience * (1 + this.getStacks('xpBoost') * 0.5);
  }

  private getStacks(id: ActiveEffectId) {
    return this.active.find(effect => effect.id === id)?.stacks ?? 0;
  }
}

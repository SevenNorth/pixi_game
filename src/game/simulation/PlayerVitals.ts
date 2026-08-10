export interface PlayerVitalsState {
  hp: number;
  maxHp: number;
  shield: number;
  maxShield: number;
  invulnerableUntil: number;
  protectedUntil: number;
  damageTakenMultiplier: number;
}

export interface DamageResult {
  applied: boolean;
  hpLost: number;
  shieldLost: number;
  defeated: boolean;
}

const DEFAULT_MAX_HP = 3;
const DEFAULT_MAX_SHIELD = 3;
export const PLAYER_INVULNERABILITY_MS = combatBalance.player.invulnerabilityMs;

export class PlayerVitals {
  readonly state: PlayerVitalsState = {
    hp: DEFAULT_MAX_HP,
    maxHp: DEFAULT_MAX_HP,
    shield: 0,
    maxShield: DEFAULT_MAX_SHIELD,
    invulnerableUntil: 0,
    protectedUntil: 0,
    damageTakenMultiplier: 1,
  };

  reset() {
    this.state.hp = DEFAULT_MAX_HP;
    this.state.maxHp = DEFAULT_MAX_HP;
    this.state.shield = 0;
    this.state.maxShield = DEFAULT_MAX_SHIELD;
    this.state.invulnerableUntil = 0;
    this.state.protectedUntil = 0;
    this.state.damageTakenMultiplier = 1;
  }

  increaseMaxHp(amount: number, healAmount = amount) {
    this.state.maxHp += Math.max(0, amount);
    this.state.hp = Math.min(this.state.maxHp, this.state.hp + Math.max(0, healAmount));
  }

  restoreHp(amount: number) {
    const previousHp = this.state.hp;
    this.state.hp = Math.min(this.state.maxHp, this.state.hp + Math.max(0, amount));
    return this.state.hp - previousHp;
  }

  restoreShield(amount: number) {
    this.state.shield = Math.min(this.state.maxShield, this.state.shield + Math.max(0, amount));
  }

  adjustMaxShield(amount: number) {
    this.state.maxShield = Math.max(0, this.state.maxShield + amount);
    this.state.shield = Math.min(this.state.shield, this.state.maxShield);
  }

  grantInvulnerability(durationMs: number, now: number) {
    this.state.invulnerableUntil = Math.max(
      this.state.invulnerableUntil,
      now + Math.max(0, durationMs),
    );
  }

  grantDamageProtection(damageTakenMultiplier: number, durationMs: number, now: number) {
    const normalizedMultiplier = Math.max(0, Math.min(1, damageTakenMultiplier));
    const protectedUntil = now + Math.max(0, durationMs);
    if (
      now >= this.state.protectedUntil
      || normalizedMultiplier <= this.state.damageTakenMultiplier
    ) {
      this.state.damageTakenMultiplier = normalizedMultiplier;
    }
    this.state.protectedUntil = Math.max(this.state.protectedUntil, protectedUntil);
  }

  takeDamage(amount: number, now: number): DamageResult {
    if (amount <= 0 || now < this.state.invulnerableUntil || this.state.hp <= 0) {
      return { applied: false, hpLost: 0, shieldLost: 0, defeated: this.state.hp <= 0 };
    }

    const resolvedAmount = now < this.state.protectedUntil
      ? amount * this.state.damageTakenMultiplier
      : amount;
    const shieldLost = Math.min(this.state.shield, resolvedAmount);
    this.state.shield -= shieldLost;
    const hpLost = Math.min(this.state.hp, resolvedAmount - shieldLost);
    this.state.hp -= hpLost;
    this.state.invulnerableUntil = now + PLAYER_INVULNERABILITY_MS;

    return {
      applied: true,
      hpLost,
      shieldLost,
      defeated: this.state.hp <= 0,
    };
  }
}
import { combatBalance } from '../content/combatBalance';

export const RAPID_CASTING_DURATION_MS = 2200;
export const EMERGENCY_CAPACITOR_HP_RATIO = 0.35;
export const EMERGENCY_CAPACITOR_COOLDOWN_MS = 30000;

export class PlayerPassiveTriggerSystem {
  private rapidCastingUntil = 0;
  private emergencyCapacitorReadyAt = 0;

  reset() {
    this.rapidCastingUntil = 0;
    this.emergencyCapacitorReadyAt = 0;
  }

  triggerRapidCasting(now: number, enabled: boolean) {
    if (!enabled) return false;
    this.rapidCastingUntil = Math.max(this.rapidCastingUntil, now + RAPID_CASTING_DURATION_MS);
    return true;
  }

  getAttackIntervalMultiplier(now: number, configuredMultiplier: number) {
    return now < this.rapidCastingUntil
      ? Math.max(0.55, Math.min(1, configuredMultiplier))
      : 1;
  }

  resolveEmergencyCapacitor(
    previousHpRatio: number,
    currentHpRatio: number,
    shieldPoints: number,
    now: number,
  ) {
    const crossedThreshold = previousHpRatio > EMERGENCY_CAPACITOR_HP_RATIO
      && currentHpRatio <= EMERGENCY_CAPACITOR_HP_RATIO;
    if (!crossedThreshold || shieldPoints <= 0 || now < this.emergencyCapacitorReadyAt) return 0;
    this.emergencyCapacitorReadyAt = now + EMERGENCY_CAPACITOR_COOLDOWN_MS;
    return shieldPoints;
  }
}

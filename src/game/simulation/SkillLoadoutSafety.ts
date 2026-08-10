import type { EnemyKind } from '../content/enemies/enemyDefinitions';
import type { MonsterAggroState } from './MonsterCombat';

export interface SkillLoadoutThreat {
  kind: EnemyKind;
  aggro: MonsterAggroState;
  distance: number;
  safeDistance: number;
}

export interface SkillLoadoutSafetyContext {
  threats: readonly SkillLoadoutThreat[];
  hasEnemyProjectiles: boolean;
}

export function isSkillLoadoutSafe(context: SkillLoadoutSafetyContext) {
  if (context.hasEnemyProjectiles) return false;
  return context.threats.every(threat => (
    threat.kind !== 'boss'
    && threat.aggro !== 'chasing'
    && threat.distance > threat.safeDistance
  ));
}

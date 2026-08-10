import { combatBalance } from '../content/combatBalance';

export function attackForLevel(level: number) {
  const levelOffset = Math.floor(
    Math.max(0, level - 1) / combatBalance.player.attackIncreaseEveryLevels,
  );
  return combatBalance.player.startingAttack
    + levelOffset * combatBalance.player.attackIncreaseAmount;
}

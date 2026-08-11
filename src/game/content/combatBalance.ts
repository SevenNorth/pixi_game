/** Central tuning values for the moment-to-moment combat loop. */
export const combatBalance = {
  player: {
    baseMoveSpeed: 180,
    basicAttackIntervalMs: 500,
    autoAttackRange: 520,
    startingAttack: 1,
    attackIncreaseEveryLevels: 2,
    attackIncreaseAmount: 1,
    invulnerabilityMs: 1000,
  },
  enemyProjectiles: {
    normalSpeed: 250,
    bossSpeed: 300,
  },
  monsterContact: {
    minimumSeparation: 48,
    separationScale: 0.35,
  },
  targets: {
    normalBasicHits: [2, 4],
    eliteDurationSeconds: [6, 10],
    bossDurationSeconds: [45, 75],
  },
} as const;

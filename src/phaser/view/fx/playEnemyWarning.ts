import Phaser from 'phaser';
import type { EnemySkillKind } from '../../../game/content/enemies/enemyDefinitions';

export function playEnemyWarning(
  scene: Phaser.Scene,
  x: number,
  y: number,
  skill: EnemySkillKind,
  directionX: number,
  directionY: number,
) {
  const warning = scene.add.graphics({ x, y }).setDepth(1).setBlendMode(Phaser.BlendModes.ADD);
  if (skill === 'radial-burst') {
    warning.lineStyle(4, 0xffb52e, 0.8);
    warning.strokeCircle(0, 0, 96);
    warning.lineStyle(2, 0xff5a5a, 0.75);
    for (let index = 0; index < 8; index += 1) {
      const angle = (Math.PI * 2 * index) / 8;
      warning.lineBetween(
        Math.cos(angle) * 40,
        Math.sin(angle) * 40,
        Math.cos(angle) * 96,
        Math.sin(angle) * 96,
      );
    }
  } else {
    warning.lineStyle(12, 0xff4f63, 0.3);
    warning.lineBetween(0, 0, directionX * 620, directionY * 620);
    warning.lineStyle(3, 0xffb52e, 0.95);
    warning.lineBetween(0, 0, directionX * 620, directionY * 620);
  }
  scene.tweens.add({
    targets: warning,
    alpha: 0.3,
    duration: 160,
    yoyo: true,
    repeat: -1,
  });
  return warning;
}

export function playEnemySkillImpact(
  scene: Phaser.Scene,
  x: number,
  y: number,
  radius: number,
  color = 0xff8654,
) {
  const impact = scene.add.graphics({ x, y }).setDepth(3).setBlendMode(Phaser.BlendModes.ADD);
  impact.fillStyle(color, 0.22);
  impact.fillCircle(0, 0, radius * 0.42);
  impact.lineStyle(5, color, 0.9);
  impact.strokeCircle(0, 0, radius);
  scene.tweens.add({
    targets: impact,
    scale: 1.12,
    alpha: 0,
    duration: 260,
    onComplete: () => impact.destroy(),
  });
}

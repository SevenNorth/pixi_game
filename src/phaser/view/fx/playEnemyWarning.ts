import Phaser from 'phaser';
import type {
  BossVariant,
  EnemySkillKind,
} from '../../../game/content/enemies/enemyDefinitions';

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
  } else if (skill === 'spread-shot') {
    warning.lineStyle(10, 0xff4f63, 0.2);
    [-24, -12, 0, 12, 24].forEach(offset => {
      const direction = rotateDirection(directionX, directionY, Phaser.Math.DegToRad(offset));
      warning.lineBetween(0, 0, direction.x * 540, direction.y * 540);
    });
    warning.lineStyle(3, 0xffd45c, 0.9);
    [-24, 24].forEach(offset => {
      const direction = rotateDirection(directionX, directionY, Phaser.Math.DegToRad(offset));
      warning.lineBetween(0, 0, direction.x * 540, direction.y * 540);
    });
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

export function playBossPhaseTransition(
  scene: Phaser.Scene,
  boss: Phaser.Physics.Arcade.Sprite,
  variant: BossVariant,
) {
  const color = variant === 'dragon-black' ? 0xb767ff : 0x70e56f;
  const ring = scene.add.graphics({ x: boss.x, y: boss.y })
    .setDepth(3)
    .setBlendMode(Phaser.BlendModes.ADD);
  ring.lineStyle(7, color, 0.95);
  ring.strokeCircle(0, 0, boss.displayWidth * 0.42);
  scene.tweens.add({
    targets: ring,
    scale: 1.8,
    alpha: 0,
    duration: 700,
    onComplete: () => ring.destroy(),
  });
  boss.setTint(0xffffff);
  scene.tweens.add({
    targets: boss,
    alpha: 0.35,
    duration: 90,
    yoyo: true,
    repeat: 3,
    onComplete: () => {
      if (!boss.active) return;
      boss.setAlpha(1);
      boss.setTint(color);
    },
  });
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

function rotateDirection(x: number, y: number, angle: number) {
  const cosine = Math.cos(angle);
  const sine = Math.sin(angle);
  return {
    x: x * cosine - y * sine,
    y: x * sine + y * cosine,
  };
}

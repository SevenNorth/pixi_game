import Phaser from 'phaser';
import type { EnemyKind } from '../../../game/content/enemies/enemyDefinitions';

const TEXTURE_KEYS: Record<Exclude<EnemyKind, 'normal'>, string> = {
  elite: 'enemy-elite-procedural',
  boss: 'enemy-boss-procedural',
};

export function ensureEnemyTexture(scene: Phaser.Scene, kind: EnemyKind) {
  if (kind === 'normal') return 'monster';
  const key = TEXTURE_KEYS[kind];
  if (scene.textures.exists(key)) return key;

  const size = kind === 'boss' ? 88 : 64;
  const graphics = scene.make.graphics({ x: 0, y: 0 });
  if (kind === 'elite') {
    graphics.fillStyle(0x6f35d9, 1);
    graphics.fillTriangle(size / 2, 4, size - 8, size / 2, size / 2, size - 6);
    graphics.fillStyle(0xb27cff, 1);
    graphics.fillCircle(size / 2, size / 2, 16);
    graphics.fillStyle(0xe9dcff, 1);
    graphics.fillCircle(size / 2, size / 2, 7);
    graphics.lineStyle(4, 0xf0c85a, 1);
    graphics.strokeTriangle(size / 2, 4, size - 8, size / 2, size / 2, size - 6);
  } else {
    graphics.fillStyle(0x8e253d, 1);
    graphics.fillCircle(size / 2, size / 2, 30);
    graphics.fillStyle(0xd84756, 1);
    graphics.fillCircle(size / 2, size / 2 - 5, 20);
    graphics.fillStyle(0xffc15c, 1);
    graphics.fillCircle(size / 2 - 11, size / 2 - 8, 5);
    graphics.fillCircle(size / 2 + 11, size / 2 - 8, 5);
    graphics.fillStyle(0x3b1224, 1);
    graphics.fillCircle(size / 2 - 11, size / 2 - 8, 2);
    graphics.fillCircle(size / 2 + 11, size / 2 - 8, 2);
    graphics.lineStyle(6, 0xffe07a, 1);
    graphics.strokeCircle(size / 2, size / 2, 31);
  }
  graphics.generateTexture(key, size, size);
  graphics.destroy();
  return key;
}

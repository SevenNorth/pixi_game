import Phaser from 'phaser';
import type { WorldObstacleKind } from '../../../game/simulation/InfiniteWorld';

const OBSTACLE_TEXTURE_KEYS: Record<WorldObstacleKind, string> = {
  wall: 'world-wall-procedural',
  bush: 'world-bush-procedural',
};

export function ensureObstacleTexture(scene: Phaser.Scene, kind: WorldObstacleKind) {
  const textureKey = OBSTACLE_TEXTURE_KEYS[kind];
  if (scene.textures.exists(textureKey)) return textureKey;
  const graphics = scene.make.graphics({ x: 0, y: 0 });
  if (kind === 'wall') {
    graphics.fillStyle(0x70442c, 1);
    graphics.fillRoundedRect(1, 5, 62, 56, 7);
    graphics.fillStyle(0x9a6540, 1);
    graphics.fillRoundedRect(5, 7, 54, 18, 6);
    graphics.lineStyle(3, 0x4c2d22, 0.9);
    graphics.lineBetween(3, 34, 61, 34);
    graphics.lineBetween(22, 6, 22, 34);
    graphics.lineBetween(43, 34, 43, 60);
  } else {
    graphics.fillStyle(0x174d35, 0.96);
    graphics.fillCircle(19, 35, 18);
    graphics.fillCircle(35, 23, 21);
    graphics.fillCircle(49, 38, 17);
    graphics.fillStyle(0x348557, 0.96);
    graphics.fillCircle(24, 27, 11);
    graphics.fillCircle(43, 34, 12);
    graphics.fillStyle(0x79b85d, 0.85);
    graphics.fillCircle(35, 18, 6);
  }
  graphics.generateTexture(textureKey, 64, 64);
  graphics.destroy();
  return textureKey;
}

import Phaser from 'phaser';

const OBSTACLE_TEXTURE_KEY = 'world-obstacle-procedural';

export function ensureObstacleTexture(scene: Phaser.Scene) {
  if (scene.textures.exists(OBSTACLE_TEXTURE_KEY)) return OBSTACLE_TEXTURE_KEY;
  const graphics = scene.make.graphics({ x: 0, y: 0 });
  graphics.fillStyle(0x244b53, 1);
  graphics.fillRoundedRect(4, 8, 88, 56, 12);
  graphics.fillStyle(0x36727a, 1);
  graphics.fillRoundedRect(12, 14, 68, 35, 10);
  graphics.fillStyle(0x5ea0a0, 0.65);
  graphics.fillTriangle(18, 22, 42, 12, 52, 34);
  graphics.lineStyle(3, 0x17373f, 0.8);
  graphics.strokeRoundedRect(4, 8, 88, 56, 12);
  graphics.generateTexture(OBSTACLE_TEXTURE_KEY, 96, 72);
  graphics.destroy();
  return OBSTACLE_TEXTURE_KEY;
}

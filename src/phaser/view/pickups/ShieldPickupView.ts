import Phaser from 'phaser';
import type { ShieldPickupKind } from '../../../game/simulation/ShieldDropSystem';

export function ensureShieldPickupTexture(scene: Phaser.Scene, kind: ShieldPickupKind) {
  if (scene.textures.exists(kind)) return kind;
  const graphics = scene.add.graphics();
  const core = kind === 'shield-core';
  const color = core ? 0x8ff7ff : 0x42bfe8;
  graphics.fillStyle(0x071f32, 0.9);
  graphics.fillCircle(20, 20, core ? 18 : 15);
  graphics.lineStyle(core ? 3 : 2, color, 0.95);
  graphics.strokeCircle(20, 20, core ? 17 : 14);
  graphics.fillStyle(color, core ? 0.95 : 0.78);
  graphics.fillPoints([
    new Phaser.Geom.Point(20, 8),
    new Phaser.Geom.Point(31, 13),
    new Phaser.Geom.Point(29, 25),
    new Phaser.Geom.Point(20, 33),
    new Phaser.Geom.Point(11, 25),
    new Phaser.Geom.Point(9, 13),
  ], true);
  graphics.fillStyle(0xe8feff, core ? 0.8 : 0.45);
  graphics.fillTriangle(20, 11, 27, 15, 20, 27);
  graphics.generateTexture(kind, 40, 40);
  graphics.destroy();
  return kind;
}

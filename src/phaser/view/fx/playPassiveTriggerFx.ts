import Phaser from 'phaser';

export function playRapidCastingFx(scene: Phaser.Scene, x: number, y: number) {
  const ring = scene.add.graphics({ x, y }).setDepth(4).setBlendMode(Phaser.BlendModes.ADD);
  ring.lineStyle(3, 0xffef7a, 0.9);
  ring.strokeCircle(0, 0, 25);
  ring.lineStyle(2, 0x71e8ff, 0.8);
  ring.strokeCircle(0, 0, 18);
  scene.tweens.add({
    targets: ring,
    scale: 1.55,
    alpha: 0,
    duration: 300,
    ease: 'Quad.Out',
    onComplete: () => ring.destroy(),
  });
}

export function playPierceHitFx(scene: Phaser.Scene, x: number, y: number) {
  const flash = scene.add.graphics({ x, y }).setDepth(4).setBlendMode(Phaser.BlendModes.ADD);
  flash.lineStyle(3, 0xb9f7ff, 0.9);
  flash.lineBetween(-14, 0, 14, 0);
  flash.lineBetween(0, -8, 0, 8);
  scene.tweens.add({
    targets: flash,
    scale: 1.4,
    alpha: 0,
    duration: 180,
    onComplete: () => flash.destroy(),
  });
}

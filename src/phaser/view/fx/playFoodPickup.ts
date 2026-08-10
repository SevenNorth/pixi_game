import Phaser from 'phaser';

export function playFoodPickup(
  scene: Phaser.Scene,
  x: number,
  y: number,
  restoredHp: number,
) {
  const color = restoredHp >= 2 ? 0xffd45c : 0xff6f8a;
  const ring = scene.add.graphics({ x, y }).setDepth(4).setBlendMode(Phaser.BlendModes.ADD);
  ring.fillStyle(color, 0.22);
  ring.fillCircle(0, 0, 14);
  ring.lineStyle(3, color, 0.95);
  ring.strokeCircle(0, 0, 22);
  const label = scene.add.text(x, y - 24, `+${restoredHp}`, {
    color: restoredHp >= 2 ? '#fff0a8' : '#ffd3dc',
    fontFamily: 'Trebuchet MS, Arial, sans-serif',
    fontSize: '18px',
    fontStyle: 'bold',
    stroke: '#10232c',
    strokeThickness: 4,
  }).setOrigin(0.5).setDepth(5);

  scene.tweens.add({
    targets: ring,
    scale: 1.55,
    alpha: 0,
    duration: 280,
    ease: 'Quad.Out',
    onComplete: () => ring.destroy(),
  });
  scene.tweens.add({
    targets: label,
    y: y - 52,
    alpha: 0,
    duration: 620,
    ease: 'Cubic.Out',
    onComplete: () => label.destroy(),
  });
}

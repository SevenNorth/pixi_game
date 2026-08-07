import Phaser from 'phaser';

export function playMonsterHit(scene: Phaser.Scene, monster: Phaser.Physics.Arcade.Sprite) {
  monster.setTintFill(0xffffff);
  scene.time.delayedCall(70, () => {
    if (monster.active) monster.clearTint();
  });

  const impact = scene.add.graphics({ x: monster.x, y: monster.y });
  impact.setDepth(4);
  impact.setBlendMode(Phaser.BlendModes.ADD);
  impact.fillStyle(0xf4ffff, 1);
  impact.fillCircle(0, 0, 4);
  impact.lineStyle(3, 0x4ebcff, 0.95);
  for (let index = 0; index < 6; index += 1) {
    const angle = (Math.PI * 2 * index) / 6 + Phaser.Math.FloatBetween(-0.2, 0.2);
    const inner = Phaser.Math.Between(4, 7);
    const outer = Phaser.Math.Between(13, 21);
    impact.beginPath();
    impact.moveTo(Math.cos(angle) * inner, Math.sin(angle) * inner);
    impact.lineTo(Math.cos(angle) * outer, Math.sin(angle) * outer);
    impact.strokePath();
  }

  scene.tweens.add({
    targets: impact,
    scale: 1.35,
    alpha: 0,
    duration: 150,
    ease: 'Quad.Out',
    onComplete: () => impact.destroy(),
  });
}


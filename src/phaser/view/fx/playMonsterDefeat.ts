import Phaser from 'phaser';

export function playMonsterDefeat(scene: Phaser.Scene, monster: Phaser.Physics.Arcade.Sprite) {
  const body = monster.body as Phaser.Physics.Arcade.Body;
  body.stop();
  body.enable = false;
  monster.anims.stop();
  monster.setTintFill(0xffffff);
  monster.setDepth(3);

  const burst = scene.add.graphics({ x: monster.x, y: monster.y });
  burst.setDepth(4);
  burst.setBlendMode(Phaser.BlendModes.ADD);
  burst.lineStyle(5, 0x168cff, 0.45);
  burst.strokeCircle(0, 0, 18);
  burst.lineStyle(2, 0xeaffff, 1);
  burst.strokeCircle(0, 0, 12);

  for (let index = 0; index < 8; index += 1) {
    const angle = (Math.PI * 2 * index) / 8 + Phaser.Math.FloatBetween(-0.16, 0.16);
    const inner = Phaser.Math.Between(12, 18);
    const outer = Phaser.Math.Between(26, 38);
    burst.beginPath();
    burst.moveTo(Math.cos(angle) * inner, Math.sin(angle) * inner);
    burst.lineTo(Math.cos(angle) * outer, Math.sin(angle) * outer);
    burst.strokePath();
  }

  scene.cameras.main.shake(70, 0.0025);
  scene.tweens.add({
    targets: burst,
    scale: 1.7,
    alpha: 0,
    duration: 220,
    ease: 'Quad.Out',
    onComplete: () => burst.destroy(),
  });
  scene.tweens.add({
    targets: monster,
    scaleX: 1.3,
    scaleY: 0.7,
    alpha: 0,
    duration: 170,
    ease: 'Cubic.Out',
    onComplete: () => monster.destroy(),
  });
}

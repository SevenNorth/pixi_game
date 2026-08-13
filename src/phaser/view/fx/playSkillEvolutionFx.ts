import Phaser from 'phaser';

export function playSkillEvolutionFx(scene: Phaser.Scene, x: number, y: number) {
  const burst = scene.add.graphics({ x, y })
    .setDepth(6)
    .setBlendMode(Phaser.BlendModes.ADD);
  burst.fillStyle(0xfff3b0, 0.24);
  burst.fillCircle(0, 0, 34);
  burst.lineStyle(5, 0xffd24a, 0.95);
  burst.strokeCircle(0, 0, 38);
  burst.lineStyle(2, 0xbdefff, 0.92);
  for (let index = 0; index < 12; index += 1) {
    const angle = Math.PI * 2 * index / 12;
    burst.lineBetween(
      Math.cos(angle) * 42,
      Math.sin(angle) * 42,
      Math.cos(angle) * 76,
      Math.sin(angle) * 76,
    );
  }
  scene.tweens.add({
    targets: burst,
    scale: 1.65,
    alpha: 0,
    duration: 620,
    ease: 'Cubic.easeOut',
    onComplete: () => burst.destroy(),
  });
  scene.cameras.main.flash(160, 255, 226, 104, false);
}

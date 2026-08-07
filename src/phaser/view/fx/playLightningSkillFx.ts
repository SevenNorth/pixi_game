import Phaser from 'phaser';

export function playLightningSkillCast(
  scene: Phaser.Scene,
  x: number,
  y: number,
  direction: Phaser.Types.Math.Vector2Like,
) {
  const flash = scene.add.graphics({ x, y }).setDepth(3).setBlendMode(Phaser.BlendModes.ADD);
  flash.lineStyle(4, 0x70ecff, 0.95);
  flash.strokeCircle(0, 0, 25);

  const directionAngle = Math.atan2(direction.y ?? 0, direction.x ?? 1);
  for (let index = 0; index < 7; index += 1) {
    const angle = directionAngle + Phaser.Math.FloatBetween(-0.85, 0.85);
    const inner = Phaser.Math.Between(24, 30);
    const outer = Phaser.Math.Between(38, 52);
    flash.lineStyle(index % 2 === 0 ? 3 : 2, 0xd9fbff, 0.9);
    flash.lineBetween(
      Math.cos(angle) * inner,
      Math.sin(angle) * inner,
      Math.cos(angle) * outer,
      Math.sin(angle) * outer,
    );
  }

  scene.tweens.add({
    targets: flash,
    scale: 1.45,
    alpha: 0,
    duration: 220,
    ease: 'Quad.easeOut',
    onComplete: () => flash.destroy(),
  });
}

export function playLightningSkillImpact(scene: Phaser.Scene, x: number, y: number, radius: number) {
  const impact = scene.add.graphics({ x, y }).setDepth(3).setBlendMode(Phaser.BlendModes.ADD);
  impact.fillStyle(0xa8f5ff, 0.32);
  impact.fillCircle(0, 0, Math.max(12, radius * 0.24));
  impact.lineStyle(4, 0x53dcff, 0.9);
  impact.strokeCircle(0, 0, radius);

  for (let index = 0; index < 10; index += 1) {
    const angle = (Math.PI * 2 * index) / 10 + Phaser.Math.FloatBetween(-0.14, 0.14);
    const inner = radius * Phaser.Math.FloatBetween(0.25, 0.45);
    const outer = radius * Phaser.Math.FloatBetween(0.72, 1);
    impact.lineStyle(index % 3 === 0 ? 3 : 2, 0xe9fdff, 0.9);
    impact.lineBetween(
      Math.cos(angle) * inner,
      Math.sin(angle) * inner,
      Math.cos(angle) * outer,
      Math.sin(angle) * outer,
    );
  }

  impact.setScale(0.45);
  scene.tweens.add({
    targets: impact,
    scale: 1,
    alpha: 0,
    duration: 250,
    ease: 'Quad.easeOut',
    onComplete: () => impact.destroy(),
  });
}

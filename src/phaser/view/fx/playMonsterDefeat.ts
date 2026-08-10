import Phaser from 'phaser';

export interface MonsterDefeatOptions {
  durationMs?: number;
  color?: number;
  onComplete?: () => void;
}

export function playMonsterDefeat(
  scene: Phaser.Scene,
  monster: Phaser.Physics.Arcade.Sprite,
  options: MonsterDefeatOptions = {},
) {
  const durationMs = options.durationMs ?? 220;
  const color = options.color ?? 0x168cff;
  const effectScale = Phaser.Math.Clamp(monster.displayWidth / 64, 1, 2.8);
  const startScaleX = monster.scaleX;
  const startScaleY = monster.scaleY;
  const body = monster.body as Phaser.Physics.Arcade.Body;
  body.stop();
  body.enable = false;
  monster.anims.stop();
  monster.setTintFill(0xffffff);
  monster.setDepth(3);

  const burst = scene.add.graphics({ x: monster.x, y: monster.y });
  burst.setDepth(4);
  burst.setBlendMode(Phaser.BlendModes.ADD);
  burst.lineStyle(5, color, 0.45);
  burst.strokeCircle(0, 0, 18 * effectScale);
  burst.lineStyle(2, 0xeaffff, 1);
  burst.strokeCircle(0, 0, 12 * effectScale);

  for (let index = 0; index < 8; index += 1) {
    const angle = (Math.PI * 2 * index) / 8 + Phaser.Math.FloatBetween(-0.16, 0.16);
    const inner = Phaser.Math.Between(12, 18) * effectScale;
    const outer = Phaser.Math.Between(26, 38) * effectScale;
    burst.beginPath();
    burst.moveTo(Math.cos(angle) * inner, Math.sin(angle) * inner);
    burst.lineTo(Math.cos(angle) * outer, Math.sin(angle) * outer);
    burst.strokePath();
  }

  scene.cameras.main.shake(Math.min(180, durationMs * 0.32), 0.0025 * effectScale);
  scene.tweens.add({
    targets: burst,
    scale: 1.7,
    alpha: 0,
    duration: durationMs,
    ease: 'Quad.Out',
    onComplete: () => {
      burst.destroy();
      options.onComplete?.();
    },
  });
  scene.tweens.add({
    targets: monster,
    scaleX: startScaleX * 1.3,
    scaleY: startScaleY * 0.7,
    alpha: 0,
    duration: durationMs * 0.78,
    ease: 'Cubic.Out',
    onComplete: () => monster.destroy(),
  });
}

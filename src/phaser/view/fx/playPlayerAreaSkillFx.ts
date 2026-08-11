import Phaser from 'phaser';

export function playThunderStrikeWarning(
  scene: Phaser.Scene,
  x: number,
  y: number,
  radius: number,
  delayMs: number,
) {
  const warning = scene.add.graphics({ x, y }).setDepth(2).setBlendMode(Phaser.BlendModes.ADD);
  warning.fillStyle(0x70dfff, 0.1);
  warning.fillCircle(0, 0, radius);
  warning.lineStyle(3, 0xb8f6ff, 0.9);
  warning.strokeCircle(0, 0, radius);
  warning.lineBetween(-radius * 0.55, 0, radius * 0.55, 0);
  warning.lineBetween(0, -radius * 0.55, 0, radius * 0.55);
  scene.tweens.add({
    targets: warning,
    scale: 0.88,
    alpha: 0.35,
    duration: Math.max(120, delayMs),
    ease: 'Quad.In',
    onComplete: () => warning.destroy(),
  });
}

export function playThunderStrikeImpact(
  scene: Phaser.Scene,
  x: number,
  y: number,
  radius: number,
) {
  const impact = scene.add.graphics({ x, y }).setDepth(4).setBlendMode(Phaser.BlendModes.ADD);
  impact.lineStyle(8, 0xe8feff, 0.95);
  impact.lineBetween(0, -radius * 1.8, 0, radius * 0.2);
  impact.fillStyle(0x76deff, 0.3);
  impact.fillCircle(0, 0, radius * 0.7);
  impact.lineStyle(4, 0xbdf8ff, 0.95);
  impact.strokeCircle(0, 0, radius);
  scene.tweens.add({
    targets: impact,
    scale: 1.18,
    alpha: 0,
    duration: 300,
    ease: 'Quad.Out',
    onComplete: () => impact.destroy(),
  });
}

export function playChainLightning(
  scene: Phaser.Scene,
  points: readonly { x: number; y: number }[],
) {
  if (points.length < 2) return;
  const lightning = scene.add.graphics().setDepth(4).setBlendMode(Phaser.BlendModes.ADD);
  lightning.lineStyle(7, 0x5ed9ff, 0.32);
  drawLightningPath(lightning, points);
  lightning.lineStyle(3, 0xe7fdff, 0.95);
  drawLightningPath(lightning, points);
  scene.tweens.add({
    targets: lightning,
    alpha: 0,
    duration: 240,
    ease: 'Quad.Out',
    onComplete: () => lightning.destroy(),
  });
}

export function createStaticFieldView(
  scene: Phaser.Scene,
  x: number,
  y: number,
  radius: number,
) {
  const field = scene.add.graphics({ x, y }).setDepth(1).setBlendMode(Phaser.BlendModes.ADD);
  field.fillStyle(0x3bbfd5, 0.1);
  field.fillCircle(0, 0, radius);
  field.lineStyle(3, 0x74eaff, 0.7);
  field.strokeCircle(0, 0, radius);
  field.lineStyle(1, 0xbdf8ff, 0.45);
  field.strokeCircle(0, 0, radius * 0.68);
  scene.tweens.add({
    targets: field,
    alpha: 0.58,
    duration: 420,
    yoyo: true,
    repeat: -1,
    ease: 'Sine.InOut',
  });
  field.once(Phaser.GameObjects.Events.DESTROY, () => scene.tweens.killTweensOf(field));
  return field;
}

function drawLightningPath(
  graphics: Phaser.GameObjects.Graphics,
  points: readonly { x: number; y: number }[],
) {
  graphics.beginPath();
  graphics.moveTo(points[0].x, points[0].y);
  for (let index = 1; index < points.length; index += 1) {
    const previous = points[index - 1];
    const point = points[index];
    const midX = (previous.x + point.x) / 2 + (index % 2 === 0 ? -7 : 7);
    const midY = (previous.y + point.y) / 2 + (index % 2 === 0 ? 6 : -6);
    graphics.lineTo(midX, midY);
    graphics.lineTo(point.x, point.y);
  }
  graphics.strokePath();
}

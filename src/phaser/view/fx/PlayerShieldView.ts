import Phaser from 'phaser';

export interface PlayerShieldView {
  graphics: Phaser.GameObjects.Graphics;
  elapsedMs: number;
}

export function createPlayerShieldView(scene: Phaser.Scene): PlayerShieldView {
  const graphics = scene.add.graphics()
    .setDepth(2.5)
    .setBlendMode(Phaser.BlendModes.ADD)
    .setVisible(false);
  return { graphics, elapsedMs: 0 };
}

export function updatePlayerShieldView(
  view: PlayerShieldView,
  x: number,
  y: number,
  shield: number,
  maxShield: number,
  deltaMs: number,
) {
  if (shield <= 0 || maxShield <= 0) {
    view.graphics.setVisible(false);
    return;
  }

  view.elapsedMs += Math.max(0, deltaMs);
  const ratio = Phaser.Math.Clamp(shield / maxShield, 0, 1);
  const pulse = (Math.sin(view.elapsedMs / 180) + 1) * 0.5;
  const radius = 30 + pulse * 1.5;
  const graphics = view.graphics;
  graphics.setVisible(true).setPosition(x, y).clear();
  graphics.fillStyle(0x55d8ff, 0.05 + ratio * 0.08);
  graphics.fillCircle(0, 0, radius);
  graphics.lineStyle(2 + ratio, 0x7ee8ff, 0.42 + ratio * 0.34);
  graphics.strokeCircle(0, 0, radius);
  graphics.lineStyle(2, 0xd8f9ff, 0.34 + pulse * 0.18);
  for (let index = 0; index < 3; index += 1) {
    const start = -Math.PI / 2 + index * (Math.PI * 2 / 3) + view.elapsedMs / 2400;
    graphics.beginPath();
    graphics.arc(0, 0, radius + 4, start, start + 0.48);
    graphics.strokePath();
  }
}

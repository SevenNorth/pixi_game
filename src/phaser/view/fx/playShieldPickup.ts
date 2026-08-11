import Phaser from 'phaser';
import { t } from '../../../i18n';

export function playShieldPickup(
  scene: Phaser.Scene,
  x: number,
  y: number,
  restoredShield: number,
) {
  const ring = scene.add.graphics({ x, y }).setDepth(4).setBlendMode(Phaser.BlendModes.ADD);
  ring.fillStyle(0x55dfff, 0.2);
  ring.fillCircle(0, 0, 15);
  ring.lineStyle(3, 0x91f4ff, 0.95);
  ring.strokeCircle(0, 0, 23);
  const label = scene.add.text(x, y - 24, t('shieldPickupValue', { points: restoredShield }), {
    color: '#bff9ff',
    fontFamily: 'Trebuchet MS, Arial, sans-serif',
    fontSize: '18px',
    fontStyle: 'bold',
    stroke: '#10232c',
    strokeThickness: 4,
  }).setOrigin(0.5).setDepth(5);

  scene.tweens.add({
    targets: ring,
    scale: 1.65,
    alpha: 0,
    duration: 320,
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

import Phaser from 'phaser';

export type ConstructViewKind = 'orbit' | 'orb' | 'vortex' | 'turret';

export function createConstructView(
  scene: Phaser.Scene,
  kind: ConstructViewKind,
  x: number,
  y: number,
  radius = 20,
) {
  const view = scene.add.graphics({ x, y }).setDepth(kind === 'vortex' ? 1 : 3)
    .setBlendMode(Phaser.BlendModes.ADD);
  if (kind === 'orbit') {
    view.fillStyle(0xd6fbff, 0.95); view.fillCircle(0, 0, 8);
    view.lineStyle(3, 0x51dfff, 0.9); view.strokeCircle(0, 0, 12);
  } else if (kind === 'orb') {
    view.fillStyle(0x3dcfff, 0.22); view.fillCircle(0, 0, radius);
    view.fillStyle(0xe9feff, 0.9); view.fillCircle(0, 0, radius * 0.25);
    view.lineStyle(3, 0x75e8ff, 0.85); view.strokeCircle(0, 0, radius);
  } else if (kind === 'vortex') {
    view.fillStyle(0x8057d9, 0.13); view.fillCircle(0, 0, radius);
    view.lineStyle(4, 0xc187ff, 0.75); view.strokeCircle(0, 0, radius);
    view.lineStyle(2, 0x69dcff, 0.65); view.strokeCircle(0, 0, radius * 0.58);
  } else {
    view.fillStyle(0x153b51, 0.95); view.fillRect(-13, -10, 26, 20);
    view.lineStyle(3, 0x7aeaff, 0.95); view.strokeRect(-13, -10, 26, 20);
    view.lineBetween(0, -10, 0, -22); view.fillCircle(0, -24, 4);
  }
  scene.tweens.add({ targets: view, alpha: 0.65, duration: 340, yoyo: true, repeat: -1 });
  view.once(Phaser.GameObjects.Events.DESTROY, () => scene.tweens.killTweensOf(view));
  return view;
}

export function playTurretShot(
  scene: Phaser.Scene,
  from: { x: number; y: number },
  to: { x: number; y: number },
) {
  const line = scene.add.graphics().setDepth(4).setBlendMode(Phaser.BlendModes.ADD);
  line.lineStyle(5, 0x57dfff, 0.35); line.lineBetween(from.x, from.y, to.x, to.y);
  line.lineStyle(2, 0xf0ffff, 0.95); line.lineBetween(from.x, from.y, to.x, to.y);
  scene.tweens.add({ targets: line, alpha: 0, duration: 150, onComplete: () => line.destroy() });
}

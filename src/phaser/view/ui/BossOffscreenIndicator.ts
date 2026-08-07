import Phaser from 'phaser';

export interface BossOffscreenIndicator {
  container: Phaser.GameObjects.Container;
}

const EDGE_MARGIN = 52;

export function createBossOffscreenIndicator(scene: Phaser.Scene): BossOffscreenIndicator {
  const backing = scene.add.graphics();
  backing.fillStyle(0x14242c, 0.88);
  backing.fillCircle(0, 0, 21);
  backing.lineStyle(2, 0xffa83d, 1);
  backing.strokeCircle(0, 0, 21);

  const arrow = scene.add.graphics();
  arrow.fillStyle(0xffa83d, 1);
  arrow.fillTriangle(0, -15, -9, 7, 9, 7);

  const label = scene.add.text(0, 27, 'BOSS', {
    color: '#fff3b0',
    fontFamily: 'Arial, sans-serif',
    fontSize: '12px',
    fontStyle: 'bold',
    stroke: '#1e3340',
    strokeThickness: 3,
  }).setOrigin(0.5);

  const container = scene.add.container(0, 0, [backing, arrow, label]);
  container.setDepth(20).setScrollFactor(0).setVisible(false);
  container.setData('arrow', arrow);
  return { container };
}

export function updateBossOffscreenIndicator(
  indicator: BossOffscreenIndicator,
  camera: Phaser.Cameras.Scene2D.Camera,
  boss?: Phaser.GameObjects.Sprite,
) {
  if (
    !boss ||
    !boss.active ||
    Phaser.Geom.Intersects.RectangleToRectangle(camera.worldView, boss.getBounds())
  ) {
    indicator.container.setVisible(false);
    return;
  }

  const directionX = boss.x - camera.midPoint.x;
  const directionY = boss.y - camera.midPoint.y;
  const length = Math.hypot(directionX, directionY) || 1;
  const normalizedX = directionX / length;
  const normalizedY = directionY / length;
  const halfWidth = Math.max(1, camera.width / 2 - EDGE_MARGIN);
  const halfHeight = Math.max(1, camera.height / 2 - EDGE_MARGIN - 18);
  const edgeScale = Math.min(
    halfWidth / Math.max(0.0001, Math.abs(normalizedX)),
    halfHeight / Math.max(0.0001, Math.abs(normalizedY)),
  );
  indicator.container.setPosition(
    camera.width / 2 + normalizedX * edgeScale,
    camera.height / 2 + normalizedY * edgeScale,
  );
  const arrow = indicator.container.getData('arrow') as Phaser.GameObjects.Graphics;
  arrow.setRotation(Math.atan2(normalizedY, normalizedX) + Math.PI / 2);
  indicator.container.setVisible(true);
}

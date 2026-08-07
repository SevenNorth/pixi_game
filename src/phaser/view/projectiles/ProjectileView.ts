import Phaser from 'phaser';
import {
  advanceProjectileDistance,
  isProjectileCollisionEnabled,
} from '../../../game/simulation/ProjectileSystem';
import type { Faction, ProjectileState } from '../../../game/simulation/ProjectileSystem';

export const PROJECTILE_VISUAL_LENGTH = 64;
const PROJECTILE_THICKNESS = 20;

export interface ProjectileView extends Phaser.GameObjects.Zone {
  lightning: Phaser.GameObjects.Graphics;
  projectile: ProjectileState;
  directionX: number;
  directionY: number;
  flickerElapsed: number;
  launched: boolean;
}

export function createProjectileView(
  scene: Phaser.Scene,
  group: Phaser.Physics.Arcade.Group,
  projectile: ProjectileState,
  x: number,
  y: number,
) {
  const speed = Math.hypot(projectile.velocityX, projectile.velocityY);
  const direction = speed > 0
    ? { x: projectile.velocityX / speed, y: projectile.velocityY / speed }
    : { x: 0, y: 1 };
  const bodyWidth = Math.abs(direction.x) * PROJECTILE_VISUAL_LENGTH + PROJECTILE_THICKNESS;
  const bodyHeight = Math.abs(direction.y) * PROJECTILE_VISUAL_LENGTH + PROJECTILE_THICKNESS;
  const lightning = scene.add.graphics();
  const view = scene.add.zone(x, y, bodyWidth, bodyHeight) as ProjectileView;
  scene.physics.add.existing(view);
  group.add(view);

  view.lightning = lightning;
  view.projectile = projectile;
  view.directionX = direction.x;
  view.directionY = direction.y;
  view.flickerElapsed = 0;
  view.launched = false;
  view.setData('projectileId', projectile.id);
  lightning.setPosition(view.x, view.y).setDepth(1);
  view.once(Phaser.GameObjects.Events.DESTROY, () => lightning.destroy());

  const body = view.body as Phaser.Physics.Arcade.Body;
  body.setAllowGravity(false);
  body.setSize(bodyWidth, bodyHeight);
  body.setOffset(0, 0);
  body.setVelocity(0, 0);
  drawLightning(view);
  return view;
}

export function updateProjectileView(view: ProjectileView, now: number, delta: number) {
  const body = view.body as Phaser.Physics.Arcade.Body;
  if (!view.launched && isProjectileCollisionEnabled(view.projectile, now)) {
    body.setVelocity(view.projectile.velocityX, view.projectile.velocityY);
    view.launched = true;
  }
  if (view.launched) advanceProjectileDistance(view.projectile, Math.min(delta, 50));

  view.flickerElapsed += delta;
  if (view.flickerElapsed >= 70) {
    view.flickerElapsed = 0;
    drawLightning(view);
  }
  return view.projectile.remainingDistance > 0;
}

export function syncProjectileVisual(view: ProjectileView) {
  view.lightning.setPosition(view.x, view.y);
}

function drawLightning(view: ProjectileView) {
  const { lightning, directionX, directionY } = view;
  const perpendicularX = -directionY;
  const perpendicularY = directionX;
  const points: Phaser.Math.Vector2[] = [
    new Phaser.Math.Vector2(
      -directionX * PROJECTILE_VISUAL_LENGTH / 2,
      -directionY * PROJECTILE_VISUAL_LENGTH / 2,
    ),
  ];
  const segments = 6;
  for (let index = 1; index < segments; index += 1) {
    const distance = -PROJECTILE_VISUAL_LENGTH / 2
      + (PROJECTILE_VISUAL_LENGTH / segments) * index;
    const jitter = Phaser.Math.Between(-7, 7);
    points.push(new Phaser.Math.Vector2(
      directionX * distance + perpendicularX * jitter,
      directionY * distance + perpendicularY * jitter,
    ));
  }
  points.push(new Phaser.Math.Vector2(
    directionX * PROJECTILE_VISUAL_LENGTH / 2,
    directionY * PROJECTILE_VISUAL_LENGTH / 2,
  ));

  lightning.clear();
  const colors = getFactionColors(view.projectile.faction);
  strokeLightning(lightning, points, 7, colors.outer, 0.42);
  strokeLightning(lightning, points, 4, colors.middle, 0.9);
  strokeLightning(lightning, points, 2, 0xf4ffff, 1);
}

function getFactionColors(faction: Faction) {
  return faction === 'player'
    ? { outer: 0x1677ff, middle: 0x4ebcff }
    : { outer: 0xff3158, middle: 0xff8a5b };
}

function strokeLightning(
  graphics: Phaser.GameObjects.Graphics,
  points: Phaser.Math.Vector2[],
  width: number,
  color: number,
  alpha: number,
) {
  graphics.lineStyle(width, color, alpha);
  graphics.beginPath();
  graphics.moveTo(points[0].x, points[0].y);
  for (let index = 1; index < points.length; index += 1) {
    graphics.lineTo(points[index].x, points[index].y);
  }
  graphics.strokePath();
}

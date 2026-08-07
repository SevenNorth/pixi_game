import Phaser from 'phaser';
import {
  advanceProjectileDistance,
  isProjectileCollisionEnabled,
} from '../../../game/simulation/ProjectileSystem';
import type { Faction, ProjectileState } from '../../../game/simulation/ProjectileSystem';

export type ProjectileVisualStyle = 'basic-lightning' | 'skill-lightning';

const PROJECTILE_STYLES = {
  'basic-lightning': {
    length: 64,
    thickness: 20,
    segments: 6,
    jitter: 7,
    widths: [7, 4, 2] as const,
    colors: [0x1677ff, 0x4ebcff, 0xf4ffff] as const,
    alphas: [0.42, 0.9, 1] as const,
  },
  'skill-lightning': {
    length: 88,
    thickness: 34,
    segments: 8,
    jitter: 10,
    widths: [13, 8, 3] as const,
    colors: [0x1b9cff, 0x65e7ff, 0xffffff] as const,
    alphas: [0.5, 0.96, 1] as const,
  },
} as const;

export const PROJECTILE_VISUAL_LENGTH = PROJECTILE_STYLES['basic-lightning'].length;

export interface ProjectileView extends Phaser.GameObjects.Zone {
  lightning: Phaser.GameObjects.Graphics;
  projectile: ProjectileState;
  directionX: number;
  directionY: number;
  flickerElapsed: number;
  launched: boolean;
  visualStyle: ProjectileVisualStyle;
}

export function getProjectileVisualLength(style: ProjectileVisualStyle) {
  return PROJECTILE_STYLES[style].length;
}

export function createProjectileView(
  scene: Phaser.Scene,
  group: Phaser.Physics.Arcade.Group,
  projectile: ProjectileState,
  x: number,
  y: number,
  visualStyle: ProjectileVisualStyle = 'basic-lightning',
) {
  const speed = Math.hypot(projectile.velocityX, projectile.velocityY);
  const direction = speed > 0
    ? { x: projectile.velocityX / speed, y: projectile.velocityY / speed }
    : { x: 0, y: 1 };
  const style = PROJECTILE_STYLES[visualStyle];
  const bodyWidth = Math.abs(direction.x) * style.length + style.thickness;
  const bodyHeight = Math.abs(direction.y) * style.length + style.thickness;
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
  view.visualStyle = visualStyle;
  view.setData('projectileId', projectile.id);
  lightning.setPosition(view.x, view.y).setDepth(1);
  if (visualStyle === 'skill-lightning') lightning.setBlendMode(Phaser.BlendModes.ADD);
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
  const style = PROJECTILE_STYLES[view.visualStyle];
  const perpendicularX = -directionY;
  const perpendicularY = directionX;
  const points: Phaser.Math.Vector2[] = [
    new Phaser.Math.Vector2(
      -directionX * style.length / 2,
      -directionY * style.length / 2,
    ),
  ];
  const segments = style.segments;
  for (let index = 1; index < segments; index += 1) {
    const distance = -style.length / 2 + (style.length / segments) * index;
    const jitter = Phaser.Math.Between(-style.jitter, style.jitter);
    points.push(new Phaser.Math.Vector2(
      directionX * distance + perpendicularX * jitter,
      directionY * distance + perpendicularY * jitter,
    ));
  }
  points.push(new Phaser.Math.Vector2(
    directionX * style.length / 2,
    directionY * style.length / 2,
  ));

  lightning.clear();
  if (view.visualStyle === 'skill-lightning') {
    strokeLightning(lightning, points, style.widths[0], style.colors[0], style.alphas[0]);
    strokeLightning(lightning, points, style.widths[1], style.colors[1], style.alphas[1]);
    strokeLightning(lightning, points, style.widths[2], style.colors[2], style.alphas[2]);
    return;
  }

  const colors = getFactionColors(view.projectile.faction);
  strokeLightning(lightning, points, style.widths[0], colors.outer, style.alphas[0]);
  strokeLightning(lightning, points, style.widths[1], colors.middle, style.alphas[1]);
  strokeLightning(lightning, points, style.widths[2], style.colors[2], style.alphas[2]);
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

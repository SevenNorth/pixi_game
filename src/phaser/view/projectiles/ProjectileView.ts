import Phaser from 'phaser';
import {
  advanceProjectileDistance,
  isProjectileCollisionEnabled,
} from '../../../game/simulation/ProjectileSystem';
import type { Faction, ProjectileState } from '../../../game/simulation/ProjectileSystem';

export type ProjectileVisualStyle =
  | 'basic-lightning'
  | 'skill-lightning'
  | 'evolved-lance'
  | 'enemy-skill'
  | 'enemy-ghost'
  | 'enemy-ember'
  | 'enemy-void'
  | 'enemy-venom';

const PROJECTILE_STYLES = {
  'basic-lightning': {
    shape: 'lightning',
    length: 64,
    thickness: 20,
    segments: 6,
    jitter: 7,
    widths: [7, 4, 2] as const,
    colors: [0x1677ff, 0x4ebcff, 0xf4ffff] as const,
    alphas: [0.42, 0.9, 1] as const,
  },
  'skill-lightning': {
    shape: 'lightning',
    length: 88,
    thickness: 34,
    segments: 8,
    jitter: 10,
    widths: [13, 8, 3] as const,
    colors: [0x1b9cff, 0x65e7ff, 0xffffff] as const,
    alphas: [0.5, 0.96, 1] as const,
  },
  'evolved-lance': {
    shape: 'lightning',
    length: 112,
    thickness: 42,
    segments: 10,
    jitter: 7,
    widths: [17, 10, 4] as const,
    colors: [0x8b5cff, 0xffd24a, 0xffffff] as const,
    alphas: [0.55, 0.98, 1] as const,
  },
  'enemy-skill': {
    shape: 'lightning',
    length: 76,
    thickness: 28,
    segments: 7,
    jitter: 8,
    widths: [10, 6, 3] as const,
    colors: [0xff3158, 0xff8a5b, 0xfff3cf] as const,
    alphas: [0.55, 0.95, 1] as const,
  },
  'enemy-ghost': {
    shape: 'orb',
    length: 30,
    thickness: 24,
    segments: 5,
    jitter: 4,
    widths: [8, 5, 2] as const,
    colors: [0x7b8cff, 0xc4d0ff, 0xffffff] as const,
    alphas: [0.45, 0.9, 1] as const,
  },
  'enemy-ember': {
    shape: 'shard',
    length: 42,
    thickness: 20,
    segments: 5,
    jitter: 4,
    widths: [8, 5, 2] as const,
    colors: [0xff4e2e, 0xffaa32, 0xfff1a8] as const,
    alphas: [0.5, 0.95, 1] as const,
  },
  'enemy-void': {
    shape: 'orb',
    length: 38,
    thickness: 30,
    segments: 5,
    jitter: 4,
    widths: [9, 5, 2] as const,
    colors: [0x6b239f, 0xd34fff, 0xffd9ff] as const,
    alphas: [0.5, 0.95, 1] as const,
  },
  'enemy-venom': {
    shape: 'orb',
    length: 34,
    thickness: 26,
    segments: 5,
    jitter: 4,
    widths: [8, 5, 2] as const,
    colors: [0x157f43, 0x67db58, 0xeaff9d] as const,
    alphas: [0.5, 0.95, 1] as const,
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
  if (visualStyle !== 'basic-lightning') lightning.setBlendMode(Phaser.BlendModes.ADD);
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
  if (style.shape === 'orb') {
    drawOrb(lightning, directionX, directionY, style);
    return;
  }
  if (style.shape === 'shard') {
    drawShard(lightning, directionX, directionY, style);
    return;
  }
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
  if (view.visualStyle !== 'basic-lightning') {
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

function drawOrb(
  graphics: Phaser.GameObjects.Graphics,
  directionX: number,
  directionY: number,
  style: ProjectileShapeStyle,
) {
  const radius = style.thickness / 2;
  graphics.clear();
  graphics.fillStyle(style.colors[0], style.alphas[0]);
  graphics.fillCircle(-directionX * radius * 0.45, -directionY * radius * 0.45, radius);
  graphics.fillStyle(style.colors[1], style.alphas[1]);
  graphics.fillCircle(0, 0, radius * 0.68);
  graphics.fillStyle(style.colors[2], style.alphas[2]);
  graphics.fillCircle(directionX * 2, directionY * 2, radius * 0.28);
}

function drawShard(
  graphics: Phaser.GameObjects.Graphics,
  directionX: number,
  directionY: number,
  style: ProjectileShapeStyle,
) {
  const perpendicularX = -directionY;
  const perpendicularY = directionX;
  const halfLength = style.length / 2;
  const halfWidth = style.thickness / 2;
  graphics.clear();
  graphics.fillStyle(style.colors[0], style.alphas[0]);
  graphics.fillTriangle(
    directionX * halfLength,
    directionY * halfLength,
    -directionX * halfLength + perpendicularX * halfWidth,
    -directionY * halfLength + perpendicularY * halfWidth,
    -directionX * halfLength - perpendicularX * halfWidth,
    -directionY * halfLength - perpendicularY * halfWidth,
  );
  graphics.lineStyle(3, style.colors[1], style.alphas[1]);
  graphics.lineBetween(
    -directionX * halfLength,
    -directionY * halfLength,
    directionX * halfLength,
    directionY * halfLength,
  );
}

interface ProjectileShapeStyle {
  length: number;
  thickness: number;
  colors: readonly [number, number, number];
  alphas: readonly [number, number, number];
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

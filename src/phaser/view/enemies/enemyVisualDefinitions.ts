import Phaser from 'phaser';
import type { ProjectileVisualStyle } from '../projectiles/ProjectileView';

export type EnemyVisualSource = 'ghost' | 'monster' | 'monster2' | 'monster3';

export interface EnemyVisualDefinition {
  id: string;
  source: EnemyVisualSource;
  textureKey: string;
  animationPrefix: string;
  frameWidth: number;
  frameHeight: number;
  displayWidth: number;
  displayHeight: number;
  projectileStyle: ProjectileVisualStyle;
  directionFrames: Record<'down' | 'left' | 'right' | 'up', number[]>;
}

export interface BossVisualDefinition {
  id: 'dragon-black' | 'dragon-green';
  textureKey: 'boss-dragon-black' | 'boss-dragon-green';
}

const directions = ['down', 'left', 'right', 'up'] as const;

function createFourByFourVisual(
  id: string,
  source: EnemyVisualSource,
  frameWidth: number,
  frameHeight: number,
  displayWidth: number,
  displayHeight: number,
  projectileStyle: ProjectileVisualStyle,
): EnemyVisualDefinition {
  return {
    id,
    source,
    textureKey: `enemy-${source}`,
    animationPrefix: `enemy-${id}`,
    frameWidth,
    frameHeight,
    displayWidth,
    displayHeight,
    projectileStyle,
    directionFrames: Object.fromEntries(directions.map((direction, row) => [
      direction,
      Array.from({ length: 4 }, (_, column) => row * 4 + column),
    ])) as EnemyVisualDefinition['directionFrames'],
  };
}

const monster3Visuals = Array.from({ length: 8 }, (_, index): EnemyVisualDefinition => {
  const groupColumn = (index % 4) * 3;
  const groupRow = index < 4 ? 0 : 4;
  return {
    id: `monster3-${index + 1}`,
    source: 'monster3',
    textureKey: 'enemy-monster3',
    animationPrefix: `enemy-monster3-${index + 1}`,
    frameWidth: 48,
    frameHeight: 48,
    displayWidth: 48,
    displayHeight: 48,
    projectileStyle: 'enemy-venom',
    directionFrames: Object.fromEntries(directions.map((direction, row) => [
      direction,
      Array.from({ length: 3 }, (_, frame) => (groupRow + row) * 12 + groupColumn + frame),
    ])) as EnemyVisualDefinition['directionFrames'],
  };
});

export const enemyVisualDefinitions: EnemyVisualDefinition[] = [
  createFourByFourVisual('ghost', 'ghost', 48, 64, 48, 64, 'enemy-ghost'),
  createFourByFourVisual('monster', 'monster', 48, 48, 48, 48, 'enemy-ember'),
  createFourByFourVisual('monster2', 'monster2', 64, 64, 52, 52, 'enemy-void'),
  ...monster3Visuals,
];

export function getRandomEnemyVisual() {
  const source = Phaser.Utils.Array.GetRandom<EnemyVisualSource>([
    'ghost',
    'monster',
    'monster2',
    'monster3',
  ]);
  return Phaser.Utils.Array.GetRandom(
    enemyVisualDefinitions.filter(definition => definition.source === source),
  );
}

const bossVisualDefinitions: BossVisualDefinition[] = [
  { id: 'dragon-black', textureKey: 'boss-dragon-black' },
  { id: 'dragon-green', textureKey: 'boss-dragon-green' },
];

export function getRandomBossVisual() {
  return Phaser.Utils.Array.GetRandom(bossVisualDefinitions);
}

export function createEnemyAnimations(scene: Phaser.Scene) {
  enemyVisualDefinitions.forEach(definition => {
    directions.forEach(direction => {
      const key = `${definition.animationPrefix}-${direction}`;
      if (scene.anims.exists(key)) return;
      scene.anims.create({
        key,
        frames: definition.directionFrames[direction].map(frame => ({
          key: definition.textureKey,
          frame,
        })),
        frameRate: 10,
        repeat: -1,
      });
    });
  });
}

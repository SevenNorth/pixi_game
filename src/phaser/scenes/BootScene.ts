import Phaser from 'phaser';
import { assets } from '../assets/manifest';
import { initDomHud, setAssetUrls } from '../ui/domHud';
import { createEnemyAnimations } from '../view/enemies/enemyVisualDefinitions';

export class BootScene extends Phaser.Scene {
  constructor() {
    super('BootScene');
  }

  preload() {
    const root = document.getElementById('game-ui');
    setAssetUrls(assets);
    if (root && !root.querySelector('.hud')) {
      initDomHud(root);
    }
    this.load.spritesheet('player', assets.player, { frameWidth: 48, frameHeight: 48 });
    this.load.spritesheet('enemy-ghost', assets.ghost, { frameWidth: 48, frameHeight: 64 });
    this.load.spritesheet('enemy-monster', assets.monster, { frameWidth: 48, frameHeight: 48 });
    this.load.spritesheet('enemy-monster2', assets.monster2, { frameWidth: 64, frameHeight: 64 });
    this.load.spritesheet('enemy-monster3', assets.monster3, { frameWidth: 48, frameHeight: 48 });
    this.load.image('start', assets.start);
    this.load.image('gameover', assets.gameover);
    this.load.image('restart', assets.restart);
    this.load.image('apple', assets.apple);
    this.load.image('banana', assets.banana);
    this.load.image('bread', assets.bread);
    this.load.image('cheese', assets.cheese);
    this.load.image('strawberry', assets.strawberry);
  }

  create() {
    this.createAnimations();
    createEnemyAnimations(this);
    this.scene.start('MenuScene');
  }

  private createAnimations() {
    const directions = [
      ['down', 0, 3],
      ['left', 4, 7],
      ['right', 8, 11],
      ['up', 12, 15],
    ] as const;
    for (const [name, start, end] of directions) {
      this.anims.create({
        key: `player-${name}`,
        frames: this.anims.generateFrameNumbers('player', { start, end }),
        frameRate: 12,
        repeat: -1,
      });
    }
  }
}

import Phaser from 'phaser';
import { assets } from '../assets/manifest';
import { initDomHud, setAssetUrls } from '../ui/domHud';

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
    this.load.spritesheet('monster', assets.monster, { frameWidth: 48, frameHeight: 64 });
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
      this.anims.create({
        key: `monster-${name}`,
        frames: this.anims.generateFrameNumbers('monster', { start, end }),
        frameRate: 12,
        repeat: -1,
      });
    }
  }
}

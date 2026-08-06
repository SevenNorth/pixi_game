import Phaser from 'phaser';
import { hideHud, showMenu } from '../ui/domHud';

export class MenuScene extends Phaser.Scene {
  constructor() {
    super('MenuScene');
  }

  create() {
    hideHud();
    showMenu('Arrow keys / WASD to move. Space to attack. P to pause.', true, false);
    window.addEventListener('start-game', this.startGame, { once: true });
  }

  private startGame = () => {
    this.scene.start('GameScene');
  };
}

import Phaser from 'phaser';
import { t } from '../../i18n';
import { hideHud, showMenu } from '../ui/domHud';

export class MenuScene extends Phaser.Scene {
  constructor() {
    super('MenuScene');
  }

  create() {
    hideHud();
    showMenu(t('controls'), true, false);
    window.addEventListener('start-game', this.startGame, { once: true });
  }

  private startGame = () => {
    this.scene.start('GameScene');
  };
}

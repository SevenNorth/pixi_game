import './index.less';
import Phaser from 'phaser';
import { BootScene } from './phaser/scenes/BootScene';
import { MenuScene } from './phaser/scenes/MenuScene';
import { GameScene } from './phaser/scenes/GameScene';

const root = document.getElementById('root');

if (!root) {
  throw new Error('Missing #root element');
}

new Phaser.Game({
  type: Phaser.AUTO,
  parent: root,
  backgroundColor: '#1099bb',
  physics: {
    default: 'arcade',
    arcade: {
      debug: false,
    },
  },
  scale: {
    mode: Phaser.Scale.RESIZE,
    autoCenter: Phaser.Scale.CENTER_BOTH,
    width: window.innerWidth,
    height: window.innerHeight,
  },
  scene: [BootScene, MenuScene, GameScene],
});

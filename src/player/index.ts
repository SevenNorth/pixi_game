import { Sprite, Assets, Application } from 'pixi.js';
import { keyboard } from '../utils/keyboard.js';
import SpriteUtilities from '../utils/SpriteUtilities.js';

interface ISprite extends Sprite {
  playAnimation: (sequenceArray: number[]) => void;
  show: (frameNumber: number) => number;
  fps: number;
}

class Player {
  app: Application;
  states: {
    down: number;
    left: number;
    right: number;
    up: number;
    walkDown: number[];
    walkLeft: number[];
    walkRight: number[];
    walkUp: number[];
  };
  sprite!: ISprite;
  vx: number;
  vy: number;
  x: number;
  y: number;
  speed: number;

  constructor(app: Application) {
    this.app = app;
    this.states = {
      down: 0,
      left: 4,
      right: 8,
      up: 12,
      walkDown: [0, 3],
      walkLeft: [4, 7],
      walkRight: [8, 11],
      walkUp: [12, 15],
    };
    this.vx = 0;
    this.vy = 0;
    this.speed = 3;
    this.x = 500;
    this.y = 500;
    this.init();
  }

  async init() {
    const imgUrl = 'http://sevennorth.lovinghlx.cn/game-source/pikaqiu.png';
    await Assets.load(imgUrl);
    const su = new SpriteUtilities();
    const frames = su.filmstrip(imgUrl, 48, 48);
    this.sprite = su.sprite(frames) as ISprite;
    this.sprite.fps = 24;
    this.sprite.x = 500;
    this.sprite.y = 500;
    this.app.stage.addChild(this.sprite);
    this.bindKeyEvent();
  }

  bindKeyEvent() {
    const left = keyboard(37),
      up = keyboard(38),
      right = keyboard(39),
      down = keyboard(40);

    //左箭头键 按下
    left.press = () => {
      //播放精灵的 walkLeft 动画序列并设置精灵的速度
      this.sprite.playAnimation(this.states.walkLeft);
      this.vx = -this.speed;
      this.vy = 0;
    };
    //左箭头键 释放
    left.release = () => {
      //如果左箭头已被释放，右箭头未按下，并且精灵没有垂直移动，
      //则将 vx 设置为0来停止精灵移动，然后显示精灵的静态状态 left
      if (!right.isDown && this.vy === 0) {
        this.vx = 0;
        this.sprite.show(this.states.left);
      }
    };
    //其余的箭头键遵循相同的格式
    //Up
    up.press = () => {
      this.sprite.playAnimation(this.states.walkUp);
      this.vy = -this.speed;
      this.vx = 0;
    };
    up.release = () => {
      if (!down.isDown && this.vx === 0) {
        this.vy = 0;
        this.sprite.show(this.states.up);
      }
    };
    //Right
    right.press = () => {
      this.sprite.playAnimation(this.states.walkRight);
      this.vx = this.speed;
      this.vy = 0;
    };
    right.release = () => {
      if (!left.isDown && this.vy === 0) {
        this.vx = 0;
        this.sprite.show(this.states.right);
      }
    };
    //Down
    down.press = () => {
      this.sprite.playAnimation(this.states.walkDown);
      this.vy = this.speed;
      this.vx = 0;
    };
    down.release = () => {
      if (!up.isDown && this.vx === 0) {
        this.vy = 0;
        this.sprite.show(this.states.down);
      }
    };
  }

  move(p: Player) {
    if (p.sprite) {
      p.sprite.x += p.vx ?? 0;
      p.sprite.y += p.vy ?? 0;
      p.x += p.vx ?? 0;
      p.y += p.vy ?? 0;
    }
  }
}

export default Player;

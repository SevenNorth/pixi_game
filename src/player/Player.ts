import { ISprite } from '@/types';
import { Assets, Application } from 'pixi.js';
import { keyboard } from '../utils/keyboard.js';
import SpriteUtilities from '../utils/SpriteUtilities.js';
import Bullet from '../bullet/Bullet';
import _ from 'lodash';

interface PropsType {
  app: Application;
  x: number;
  y: number;
  size: {
    width: number;
    height: number;
  };
  max: {
    x: number;
    y: number;
  };
  gameState: {
    playing: boolean;
    score: number;
  };
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
  size: {
    width: number;
    height: number;
  };
  face!: 'up' | 'right' | 'down' | 'left';
  max!: {
    x: number;
    y: number;
  };
  gameState: {
    playing: boolean;
    score: number;
  };

  constructor(props: PropsType) {
    this.app = props.app;
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
    this.x = props.x;
    this.y = props.y;
    this.size = props.size;
    this.max = props.max;
    this.face = 'down';
    this.gameState = props.gameState;
    this.init();
  }

  async init() {
    const imgUrl = 'http://sevennorth.lovinghlx.cn/game-source/pikaqiu.png';
    await Assets.load(imgUrl);
    const su = new SpriteUtilities();
    const frames = su.filmstrip(imgUrl, this.size.width, this.size.height);
    this.sprite = su.sprite(frames) as ISprite;
    this.sprite.fps = 12;
    this.sprite.x = this.x;
    this.sprite.y = this.y;
    this.app.stage.addChild(this.sprite);
    this.sprite.playAnimation(this.states.walkDown);
    this.bindKeyEvent();
  }

  bindKeyEvent() {
    const left = keyboard(37),
      up = keyboard(38),
      right = keyboard(39),
      down = keyboard(40),
      space = keyboard(32);

    //左箭头键 按下
    left.press = () => {
      if (!this.gameState.playing) return;
      //播放精灵的 walkLeft 动画序列并设置精灵的速度
      this.sprite.playAnimation(this.states.walkLeft);
      this.vx = -this.speed;
      this.vy = 0;
      this.face = 'left';
    };
    //左箭头键 释放
    left.release = () => {
      if (!this.gameState.playing) return;
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
      if (!this.gameState.playing) return;
      this.sprite.playAnimation(this.states.walkUp);
      this.vy = -this.speed;
      this.vx = 0;
      this.face = 'up';
    };
    up.release = () => {
      if (!this.gameState.playing) return;
      if (!down.isDown && this.vx === 0) {
        this.vy = 0;
        this.sprite.show(this.states.up);
      }
    };
    //Right
    right.press = () => {
      if (!this.gameState.playing) return;
      this.sprite.playAnimation(this.states.walkRight);
      this.vx = this.speed;
      this.vy = 0;
      this.face = 'right';
    };
    right.release = () => {
      if (!this.gameState.playing) return;
      if (!left.isDown && this.vy === 0) {
        this.vx = 0;
        this.sprite.show(this.states.right);
      }
    };
    //Down
    down.press = () => {
      if (!this.gameState.playing) return;
      this.sprite.playAnimation(this.states.walkDown);
      this.vy = this.speed;
      this.vx = 0;
      this.face = 'down';
    };
    down.release = () => {
      if (!this.gameState.playing) return;
      if (!up.isDown && this.vx === 0) {
        this.vy = 0;
        this.sprite.show(this.states.down);
      }
    };
    // Space
    space.press = _.throttle(() => {
      if (!this.gameState.playing) return;
      const bullet = new Bullet({
        app: this.app,
        face: this.face,
        positon: {
          x: this.x,
          y: this.y,
        },
      });
    }, 500);
    space.release = () => {
      //
    };
  }

  move() {
    if (this.sprite && this.gameState.playing) {
      let next_X = this.x + (this.vx ?? 0);
      let next_y = this.y + (this.vy ?? 0);
      if (next_X < 0) {
        next_X = 0;
      }
      if (next_X > this.max.x) {
        next_X = this.max.x;
      }
      if (next_y < 0) {
        next_y = 0;
      }
      if (next_y > this.max.y) {
        next_y = this.max.y;
      }
      this.x = next_X;
      this.y = next_y;
      this.sprite.x = next_X;
      this.sprite.y = next_y;
    }
  }
}

export default Player;

import { Application, Assets, Container } from 'pixi.js';
import _ from 'lodash';
import Player from '@/player/Player';
import SpriteUtilities from '../utils/SpriteUtilities.js';
import { ISprite } from '@/types';

interface PropsType {
  app: Application;
  width: number;
  height: number;
  target: Player;
  size: {
    width: number;
    height: number;
  };
}

class Monster {
  app: Application;
  sprite!: ISprite;
  vx: number;
  vy: number;
  x: number;
  y: number;
  speed: number;
  target: Player;
  size!: {
    width: number;
    height: number;
  };
  states!: {
    down: number;
    left: number;
    right: number;
    up: number;
    walkDown: number[];
    walkLeft: number[];
    walkRight: number[];
    walkUp: number[];
  };

  constructor(props: PropsType) {
    this.app = props.app;
    this.target = props.target;
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
    this.speed = 1;
    this.x = _.random(0, props.width);
    this.y = _.random(0, props.height);
    this.size = props.size;
    this.init();
  }

  async init() {
    // eslint-disable-next-line @typescript-eslint/no-var-requires
    const imgUrl = require('../assets/ghost.png');
    await Assets.load(imgUrl);
    const su = new SpriteUtilities();
    const frames = su.filmstrip(imgUrl, this.size.width, this.size.height);
    this.sprite = su.sprite(frames) as ISprite;
    this.sprite.fps = 12;
    this.sprite.x = this.x;
    this.sprite.y = this.y;
    (this.app.stage.getChildByName('monsters') as Container)?.addChild(this.sprite);
    this.sprite.playAnimation(this.states.walkDown);
  }

  getDirection() {
    const { x: tx, y: ty } = this.target;
    const { x: mx, y: my } = this;
    // direction
    let d_x = 1,
      d_y = 1;
    if (tx - mx > 0) {
      d_x = 1;
    } else if (tx - mx < 0) {
      d_x = -1;
    } else {
      d_x = 0;
    }
    if (ty - my > 0) {
      d_y = 1;
    } else if (ty - my < 0) {
      d_y = -1;
    } else {
      d_y = 0;
    }

    return {
      d_x,
      d_y,
    };
  }

  move() {
    if (this.sprite && this.target) {
      const { d_x, d_y } = this.getDirection();
      this.x += d_x * this.speed;
      this.y += d_y * this.speed;
      this.sprite.x += d_x * this.speed;
      this.sprite.y += d_y * this.speed;
    }
  }
}

export default Monster;

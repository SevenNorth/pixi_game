import { Sprite, Texture, Application } from 'pixi.js';
import _ from 'lodash';
import Player from '@/player/Player';

interface PropsType {
  app: Application;
  width: number;
  height: number;
  target: Player;
}

class Monster {
  app: Application;
  sprite!: Sprite;
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

  constructor(props: PropsType) {
    this.app = props.app;
    this.target = props.target;
    this.vx = 0;
    this.vy = 0;
    this.speed = 1;
    this.x = _.random(0, props.width);
    this.y = _.random(0, props.height);
    this.init();
  }

  async init() {
    // eslint-disable-next-line @typescript-eslint/no-var-requires
    const imgUrl = require('../assets/monster_ghost.gif');
    const texture = Texture.from(imgUrl);
    this.size = {
      width: texture.width,
      height: texture.height,
    };
    this.sprite = new Sprite(texture);
    this.sprite.x = this.x;
    this.sprite.y = this.y;
    this.app.stage.addChild(this.sprite);
  }

  getDirection(target: Player, self: Monster) {
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
      const { d_x, d_y } = this.getDirection(this.target, this);
      this.x += d_x * this.speed;
      this.y += d_y * this.speed;
      this.sprite.x += d_x * this.speed;
      this.sprite.y += d_y * this.speed;
    }
  }
}

export default Monster;

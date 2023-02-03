import { Application, Assets, Container, Rectangle } from 'pixi.js';
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
  endGame: () => void;
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
  endGame: () => void;
  id: string;

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
    this.speed = Math.E;
    const position = this.getMonsterInitPosition(props.width, props.height);
    this.x = position.x;
    this.y = position.y;
    this.size = props.size;
    this.endGame = props.endGame;
    this.id = _.uniqueId('monster-');
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
    this.sprite.customId = this.id;
    (this.app.stage.getChildByName('monsters') as Container)?.addChild(this.sprite);
    this.sprite.playAnimation(this.states.walkDown);
  }

  getMonsterInitPosition(
    width: number,
    height: number,
  ): {
    x: number;
    y: number;
  } {
    const safeDistance = 100;
    const x =
      Math.random() > 0.5
        ? _.random(0, this.target.x - safeDistance)
        : _.random(this.target.x + safeDistance, width);
    const y =
      Math.random() > 0.5
        ? _.random(0, this.target.y - safeDistance)
        : _.random(this.target.y + safeDistance, height);

    return {
      x,
      y,
    };
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

  hitTestRectangle(targetBounds: Rectangle, compareBounds: Rectangle): boolean {
    let isCatched = false;
    const { x, y, width, height } = targetBounds;
    const { x: c_x, y: c_y, width: c_width, height: c_height } = compareBounds;

    const t_center = {
      x: x + width / 2,
      y: y + height / 2,
    };
    const c_center = {
      x: c_x + c_width / 2,
      y: c_y + c_height / 2,
    };

    const safeDistance =
      ((_.min([width, height]) as number) + (_.min([c_width, c_height]) as number)) / 5;

    const d = Math.sqrt(
      Math.pow(c_center.x - t_center.x, 2) + Math.pow(c_center.y - t_center.y, 2),
    );

    if (d < safeDistance) {
      isCatched = true;
    }

    return isCatched;
  }

  move() {
    if (this.sprite && this.target) {
      const targetBounds = this.target.sprite.getBounds();
      const compareBounds = this.sprite.getBounds();
      const isCatched = this.hitTestRectangle(targetBounds, compareBounds);
      if (isCatched) {
        this.endGame();
        return;
      }
      const { d_x, d_y } = this.getDirection();
      this.x += d_x * this.speed;
      this.y += d_y * this.speed;
      this.sprite.x += d_x * this.speed;
      this.sprite.y += d_y * this.speed;
    }
  }
}

export default Monster;

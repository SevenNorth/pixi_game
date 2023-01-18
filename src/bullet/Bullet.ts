import { Application, Assets, Container, Rectangle } from 'pixi.js';
import _ from 'lodash';
import SpriteUtilities from '../utils/SpriteUtilities.js';
import { ISprite } from '@/types';

interface PropsType {
  app: Application;
  face: 'up' | 'right' | 'down' | 'left';
  positon: {
    x: number;
    y: number;
  };
  beatMonster: (monsterId: string) => void;
}

class Bullet {
  app: Application;
  sprite!: ISprite;
  dx: number;
  dy: number;
  x: number;
  y: number;
  origin_x: number;
  origin_y: number;
  speed: number;
  states!: {
    angle: number; // 旋转角度
    fly: number[];
    flyDistance: number;
  };
  beatMonster: (monsterId: string) => void;

  constructor(props: PropsType) {
    this.app = props.app;
    let angle = 0;
    this.dx = 0;
    this.dy = 1;
    this.x = props.positon.x;
    this.y = props.positon.y;
    switch (props.face) {
      case 'down':
        angle = 90;
        this.dx = 0;
        this.dy = 1;
        this.x = props.positon.x + 32;
        break;
      case 'left':
        angle = 0;
        this.dx = -1;
        this.dy = 0;
        this.x = props.positon.x - 64;
        break;
      case 'right':
        angle = 180;
        this.dx = 1;
        this.dy = 0;
        this.x = props.positon.x + 128;
        this.y = props.positon.y + 32;
        break;
      case 'up':
        angle = 270;
        this.dx = 0;
        this.dy = -1;
        this.y = props.positon.y + 32;
        break;
      default:
        break;
    }
    this.origin_x = this.x;
    this.origin_y = this.y;
    this.states = {
      angle,
      fly: [0, 3],
      flyDistance: 500,
    };
    this.speed = 5;
    this.beatMonster = props.beatMonster;
    this.init();
  }

  async init() {
    // eslint-disable-next-line @typescript-eslint/no-var-requires
    const imgUrl = require('../assets/bullet.png');
    await Assets.load(imgUrl);
    const su = new SpriteUtilities();
    const frames = su.filmstrip(imgUrl, 128, 32);
    this.sprite = su.sprite(frames) as ISprite;
    this.sprite.fps = 12;
    this.sprite.x = this.x;
    this.sprite.y = this.y;
    this.sprite.angle = this.states.angle;
    (this.app.stage.getChildByName('bullets') as Container)?.addChild(this.sprite);
    this.sprite.playAnimation(this.states.fly);
    this.app.ticker.add(this.fly, this);
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
      ((_.min([width, height]) as number) + (_.min([c_width, c_height]) as number)) / 4;

    const d = Math.sqrt(
      Math.pow(c_center.x - t_center.x, 2) + Math.pow(c_center.y - t_center.y, 2),
    );

    if (d < safeDistance) {
      isCatched = true;
    }

    return isCatched;
  }

  flyEnd(): boolean {
    let flyEnd = false;
    if (Math.abs(this.x - this.origin_x) > this.states.flyDistance) {
      flyEnd = true;
    }
    if (Math.abs(this.y - this.origin_y) > this.states.flyDistance) {
      flyEnd = true;
    }
    return flyEnd;
  }

  findBeatMonster(): string | undefined {
    let monsterId = undefined;
    const monsters = (this.app.stage.getChildByName('monsters').children || []) as ISprite[];
    for (let index = 0; index < monsters.length; index++) {
      const monster = monsters[index];
      const targetBounds = monster.getBounds();
      const compareBounds = this.sprite.getBounds();
      const isCatched = this.hitTestRectangle(targetBounds, compareBounds);
      if (isCatched) {
        monsterId = monster.customId;
        break;
      }
    }
    return monsterId;
  }

  destoryBullet() {
    this.app.ticker.remove(this.fly, this);
    this.sprite.removeFromParent();
    this.sprite.destroy();
  }

  fly() {
    if (this.sprite) {
      const flyEnd = this.flyEnd();
      if (flyEnd) {
        this.destoryBullet();
        return;
      }
      const beatMonsterId = this.findBeatMonster();
      if (beatMonsterId) {
        this.beatMonster(beatMonsterId);
        this.destoryBullet();
        return;
      }
      this.x += this.dx * this.speed;
      this.y += this.dy * this.speed;
      this.sprite.x += this.dx * this.speed;
      this.sprite.y += this.dy * this.speed;
    }
  }
}

export default Bullet;

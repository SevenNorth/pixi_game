import { Sprite, Assets, Application } from 'pixi.js';
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

  constructor(props: PropsType) {
    this.app = props.app;
    this.target = props.target;
    this.vx = 0;
    this.vy = 0;
    this.speed = 3;
    this.x = _.random(0, props.width);
    this.y = _.random(0, props.height);
    this.init();
  }

  async init() {
    // eslint-disable-next-line @typescript-eslint/no-var-requires
    const imgUrl = require('../assets/monster_ghost.gif');
    const texture = await Assets.load(imgUrl);
    console.log('🚀-fjf : texture', texture);
    // this.sprite = new Sprite(texture);
    this.sprite = Sprite.from(imgUrl);
    this.sprite.x = this.x;
    this.sprite.y = this.y;
    this.app.stage.addChild(this.sprite);
  }

  move(m: Monster) {
    if (m.sprite && m.target) {
      const { x: tx, y: ty } = m.target;
      const { x: mx, y: my } = m;
      let vx = 1,
        vy = 1;
      if (tx - mx > 0) {
        vx = 1;
      } else {
        vx = -1;
      }
      if (ty - my > 0) {
        vy = 1;
      } else {
        vy = -1;
      }
      m.x += vx * m.speed;
      m.y += vy * m.speed;
      m.sprite.x = vx * m.speed;
      m.sprite.y = vy * m.speed;
    }
  }
}

export default Monster;

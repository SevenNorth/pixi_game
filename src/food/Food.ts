import { Application, Rectangle, Sprite } from 'pixi.js';
import _ from 'lodash';
import Player from '@/player/Player';

interface PropsType {
  target: Player;
  width: number;
  height: number;
}

const foodList = [
  {
    value: 1,
    url: require('../assets/apple.png'),
  },
  {
    value: 1,
    url: require('../assets/bananer.png'),
  },
  {
    value: 1,
    url: require('../assets/bread.png'),
  },
  {
    value: 1,
    url: require('../assets/chess.png'),
  },
  {
    value: 1,
    url: require('../assets/strawberry.png'),
  },
];

class Food {
  sprite!: Sprite;
  target: Player;
  value: number;

  constructor(props: PropsType) {
    this.target = props.target;
    const food = foodList[_.random(4)];
    this.sprite = Sprite.from(food.url);
    this.value = food.value;
    this.sprite.x = _.random(0, props.width);
    this.sprite.y = _.random(0, props.width);
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
}

export default Food;

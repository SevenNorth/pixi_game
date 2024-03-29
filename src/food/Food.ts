import { Rectangle, Sprite } from 'pixi.js';
import _ from 'lodash';
import Player from '@/player/Player';

interface PropsType {
  target: Player;
  width: number;
  height: number;
  eatFood: (foodId: string) => void;
  destoryFood: (foodId: string) => void;
}

const foodList = [
  {
    value: 1,
    url: require('../assets/apple.png'),
  },
  {
    value: 2,
    url: require('../assets/bananer.png'),
  },
  {
    value: 3,
    url: require('../assets/bread.png'),
  },
  {
    value: 4,
    url: require('../assets/chess.png'),
  },
  {
    value: 5,
    url: require('../assets/strawberry.png'),
  },
];

class Food {
  sprite!: Sprite;
  target: Player;
  value: number;
  id: string;
  eatFood: (foodId: string) => void;
  destoryFood: (foodId: string) => void;
  createdAt: number;
  during: number;

  constructor(props: PropsType) {
    this.target = props.target;
    this.eatFood = props.eatFood;
    this.destoryFood = props.destoryFood;
    this.id = _.uniqueId('food-');
    const food = foodList[_.random(4)];
    this.sprite = Sprite.from(food.url);
    this.value = food.value;
    this.sprite.x = _.random(50, props.width - 50);
    this.sprite.y = _.random(50, props.height - 50);
    this.createdAt = Date.now();
    this.during = (10 - food.value) * 1000; // 分值越高存在时间越短
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

  update() {
    if (this.sprite && this.target) {
      if (Date.now() - this.createdAt > this.during) {
        this.destoryFood(this.id);
        return;
      }
      const targetBounds = this.target.sprite.getBounds();
      const compareBounds = this.sprite.getBounds();
      const isCatched = this.hitTestRectangle(targetBounds, compareBounds);
      if (isCatched) {
        this.eatFood(this.id);
      }
    }
  }
}

export default Food;

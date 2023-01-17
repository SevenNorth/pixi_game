import './index.less';
import { Application, Container, Prepare } from 'pixi.js';
import Player from './player/Player';
import Monster from './monster/Monster';
import createSimpleSprite from './utils/createSimpleSprite';
import _ from 'lodash';
import Food from './food/Food';
const main = () => {
  let monsterCreator: string | number | NodeJS.Timer | undefined;
  let foodCreator: string | number | NodeJS.Timer | undefined;
  let monsterList: Monster[] = [];
  const gameState = {
    playing: false,
    score: 0,
  };
  // 搭建场景
  const root = document.getElementById('root');
  const width = root?.clientWidth ?? 1600,
    height = root?.clientHeight ?? 800;
  const app = new Application({
    width,
    height,
    background: '#1099bb',
    antialias: true,
    resolution: 1,
  });
  root?.appendChild(app.view as unknown as Document);
  const monstersGroup = new Container();
  monstersGroup.name = 'monsters';
  monstersGroup.visible = false;

  const foodsGroup = new Container();
  foodsGroup.name = 'foods';
  foodsGroup.visible = false;

  const bulletsGroup = new Container();
  bulletsGroup.name = 'bullets';
  bulletsGroup.visible = false;

  const operateGroup = new Container();
  operateGroup.name = 'operate';
  operateGroup.visible = true;

  const person = new Player({
    app,
    x: width / 2,
    y: height / 2,
    size: {
      width: 48,
      height: 48,
    },
    // person定位锚点在左上角
    max: {
      x: width - 48,
      y: height - 48,
    },
    gameState,
  });

  const createMonster = () => {
    return new Monster({
      width,
      height,
      app,
      target: person,
      size: {
        width: 48,
        height: 64,
      },
      endGame,
    });
  };

  const createFood = () => {
    return new Food({
      target: person,
      width,
      height,
    });
  };

  const startGame = () => {
    operateGroup.visible = false;
    monstersGroup.visible = true;
    foodsGroup.visible = true;
    gameState.playing = true;
    root && (root.style.cursor = 'none');
    app.ticker.add(person.move, person);
    const monster = createMonster();
    app.ticker.add(monster.move, monster);
    monsterList.push(monster);
    if (monsterCreator) {
      clearInterval(monsterCreator);
    }
    monsterCreator = setInterval(() => {
      const monster = createMonster();
      monsterList.push(monster);
      app.ticker.add(monster.move, monster);
    }, 3000);
    if (foodCreator) {
      clearInterval(foodCreator);
    }
    foodCreator = setInterval(() => {
      const food = createFood();
      foodsGroup.addChild(food.sprite);
      // app.ticker.add(monster.move, monster);
    }, 5000);
  };

  const endGame = () => {
    root && (root.style.cursor = 'pointer');
    operateGroup.visible = true;
    startBtn.visible = false;
    overLabel.visible = true;
    restartBtn.visible = true;
    gameState.playing = false;
    clearInterval(monsterCreator);
    _.each(monsterList, m => {
      app.ticker.remove(m.move, m);
    });
    person.speed = 0;
    person.vx = 0;
    person.vy = 0;
    app.ticker.remove(person.move, person);
  };

  const restartGame = () => {
    person.x = width / 2;
    person.y = height / 2;
    person.speed = 3;
    person.sprite.x = width / 2;
    person.sprite.y = height / 2;
    person.sprite.playAnimation(person.states.walkDown);
    gameState.score = 0;
    gameState.playing = true;
    operateGroup.visible = false;
    root && (root.style.cursor = 'none');
    _.each(monsterList, m => {
      m.sprite.removeFromParent();
      m.sprite.destroy();
    });
    monsterList = [];
    startGame();
  };

  // 添加开始按钮
  const startBtn = createSimpleSprite({
    url: require('./assets/start.png'),
    name: 'startBtn',
  });
  startBtn.x = width / 2 - 96 - 30;
  startBtn.y = height / 2 - 73;
  startBtn.onclick = startGame;
  startBtn.visible = true;
  operateGroup.addChild(startBtn);
  // 添加游戏结束Label
  const overLabel = createSimpleSprite({
    url: require('./assets/gameover.png'),
    name: 'gameOver',
  });
  overLabel.x = width / 2 - 175;
  overLabel.y = height / 2 - 60;
  overLabel.scale = { x: 1.3, y: 1.3 };
  overLabel.visible = false;
  operateGroup.addChild(overLabel);
  // restart
  const restartBtn = createSimpleSprite({
    url: require('./assets/restart.png'),
    name: 'restartbtn',
  });
  restartBtn.x = width / 2 + 100;
  restartBtn.y = height / 2 - 60;
  restartBtn.visible = false;
  restartBtn.onclick = restartGame;
  operateGroup.addChild(restartBtn);

  // 添加各个分组
  app.stage.addChild(monstersGroup);
  app.stage.addChild(bulletsGroup);
  app.stage.addChild(operateGroup);
  app.stage.addChild(foodsGroup);
};
window.addEventListener('load', () => main());
export default main;

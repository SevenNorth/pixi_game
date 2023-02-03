import './index.less';
import { Application, Container, Ticker, Text } from 'pixi.js';
import Player from './player/Player';
import Monster from './monster/Monster';
import createSimpleSprite from './utils/createSimpleSprite';
import _ from 'lodash';
import Food from './food/Food';
const main = () => {
  let monsterCreator: string | number | NodeJS.Timer | undefined;
  let foodCreator: string | number | NodeJS.Timer | undefined;
  let monsterList: Monster[] = [];
  let foodList: Food[] = [];
  const gameState = {
    playing: false,
    score: 0,
    killed: 0,
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

  const beatMonster = (monsterId: string) => {
    const monster = _.find(monsterList, m => m.id === monsterId);
    if (monster) {
      app.ticker.remove(monster.move, monster);
      gameState.killed += 1;
      killedText.text = `KILLED: ${gameState.killed}`;
      monster.sprite.removeFromParent();
      monster.sprite.destroy();
      monsterList = _.filter(monsterList, m => m.id !== monster.id);
    }
  };

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
    beatMonster,
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
      eatFood,
      destoryFood,
    });
  };

  const startGame = () => {
    operateGroup.visible = false;
    restartBtn.visible = false;
    monstersGroup.visible = true;
    foodsGroup.visible = true;
    gameState.playing = true;
    scoreText.visible = true;
    killedText.visible = true;
    bulletsGroup.visible = true;
    scoreText.text = `SCORE: ${gameState.score}`;
    killedText.text = `KILLED: ${gameState.killed}`;
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
      foodList.push(food);
      app.ticker.add(food.update, food);
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
    clearInterval(foodCreator);
    _.each(monsterList, m => {
      app.ticker.remove(m.move, m);
    });
    _.each(foodList, f => {
      app.ticker.remove(f.update, f);
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
    gameState.killed = 0;
    gameState.playing = true;
    operateGroup.visible = false;
    root && (root.style.cursor = 'none');
    _.each(monsterList, m => {
      m.sprite.removeFromParent();
      m.sprite.destroy();
    });
    monsterList = [];
    _.each(foodList, f => {
      f.sprite.removeFromParent();
      f.sprite.destroy();
    });
    foodList = [];
    startGame();
  };

  const destoryFood = (foodId: string) => {
    const food = _.find(foodList, f => f.id === foodId);
    if (food) {
      app.ticker.remove(food.update, food);
      food.sprite.removeFromParent();
      food.sprite.destroy();
      foodList = _.filter(foodList, f => f.id !== food.id);
    }
  };

  const eatFood = (foodId: string) => {
    const eatenFood = _.find(foodList, f => f.id === foodId);
    if (eatenFood) {
      app.ticker.remove(eatenFood.update, eatenFood);
      gameState.score += eatenFood.value;
      scoreText.text = `SCORE: ${gameState.score}`;
      eatenFood.sprite.removeFromParent();
      eatenFood.sprite.destroy();
      foodList = _.filter(foodList, f => f.id !== eatenFood.id);
    }
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

  // 计分板
  const scoreText = new Text('SCORE: 0', {
    fontFamily: 'Arial',
    fontSize: 48,
    fill: 0xf1aa10,
    align: 'center',
  });
  scoreText.visible = false;
  app.stage.addChild(scoreText);
  const killedText = new Text('KILLED: 0', {
    fontFamily: 'Arial',
    fontSize: 48,
    fill: 0xf1aa10,
    align: 'center',
  });
  killedText.y = 60;
  killedText.visible = false;
  app.stage.addChild(killedText);

  // 添加各个分组
  app.stage.addChild(monstersGroup);
  app.stage.addChild(bulletsGroup);
  app.stage.addChild(operateGroup);
  app.stage.addChild(foodsGroup);

  window.addEventListener(
    'keydown',
    e => {
      if (e.keyCode === 82 && restartBtn.visible && operateGroup.visible) {
        restartGame();
      }
      if (e.keyCode === 83 && !startBtn.visible && !operateGroup.visible) {
        if (gameState.playing) {
          gameState.playing = false;
          app.ticker.stop();
        } else {
          gameState.playing = true;
          app.ticker.start();
        }
      }
    },
    false,
  );
};
window.addEventListener('load', () => main());
export default main;

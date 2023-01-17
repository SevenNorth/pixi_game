import './index.less';
import { Application, Container } from 'pixi.js';
import Player from './player/Player';
import Monster from './monster/Monster';
import createSimpleSprite from './utils/createSimpleSprite';
const main = () => {
  const gameState = {
    palying: false,
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
  });

  const startGame = () => {
    operateGroup.visible = false;
    monstersGroup.visible = true;
    root && (root.style.cursor = 'none');
    app.ticker.add(person.move, person);
    const monster = new Monster({
      width,
      height,
      app,
      target: person,
      size: {
        width: 48,
        height: 64,
      },
    });
    app.ticker.add(monster.move, monster);
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
  operateGroup.addChild(restartBtn);

  // 添加各个分组
  app.stage.addChild(monstersGroup);
  app.stage.addChild(bulletsGroup);
  app.stage.addChild(operateGroup);
};
main();
export default main;

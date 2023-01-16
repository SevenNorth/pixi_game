import './index.less';
import init from './functions/init';
import Player from './player/Player';
import Monster from './monster/Monster';
const main = (): void => {
  const root = document.getElementById('root');
  const width = root?.clientWidth ?? 1600,
    height = root?.clientHeight ?? 800;
  const app = init({
    width,
    height,
    background: '#1099bb',
    antialias: true,
    resolution: 1,
  });
  root?.appendChild(app.view as unknown as Document);
  const person = new Player({
    app,
    x: width / 2,
    y: height / 2,
    size: {
      width: 48,
      height: 48,
    },
  });
  app.ticker.add(() => person.move(person));
  const monster = new Monster({
    width,
    height,
    app,
    target: person,
  });
  app.ticker.add(() => monster.move(monster));
};
main();
export default main;

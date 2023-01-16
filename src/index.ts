import './index.less';
import init from './functions/init';
import Player from './player';
const main = (): void => {
  const root = document.getElementById('root');
  const width = root?.clientWidth,
    height = root?.clientHeight;
  const app = init({
    width,
    height,
    background: '#1099bb',
    antialias: true,
    resolution: 1,
  });
  root?.appendChild(app.view as unknown as Document);
  const p1 = new Player(app);
  app.ticker.add(() => p1.move(p1));
};
main();
export default main;

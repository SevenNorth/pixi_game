import './index.less';
import init from './functions/init';
const main = (): void => {
    const root = document.getElementById('root');
    const width = root?.clientWidth, height = root?.clientHeight;
    const app = init({
        width,
        height,
        background: '#1099bb',
    });
    console.log("🚀-fjf : app", app)
    root?.appendChild(app.view as unknown as Document)
}
main();
export default main;
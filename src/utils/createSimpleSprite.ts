import { Sprite, Texture } from 'pixi.js';
interface PropsType {
  url: string;
  name: string;
  positon?: {
    x: number;
    y: number;
  };
}

export default (props: PropsType) => {
  const { url, name } = props;
  // const texture = Texture.from(url);
  // const sp = new Sprite(texture);
  const sp = Sprite.from(url);
  sp.name = name;
  sp.interactive = true;
  return sp;
};

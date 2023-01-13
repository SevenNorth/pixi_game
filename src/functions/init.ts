import { Application, IApplicationOptions, ICanvas } from 'pixi.js';

export default (params: IApplicationOptions): Application<ICanvas> => {
  const app = new Application(params);
  return app;
};

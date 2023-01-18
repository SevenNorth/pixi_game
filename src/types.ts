import { Sprite } from 'pixi.js';

export interface ISprite extends Sprite {
  playAnimation: (sequenceArray: number[]) => void;
  show: (frameNumber: number) => number;
  fps: number;
  customId?: string;
}

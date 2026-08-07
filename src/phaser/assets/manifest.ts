import apple from '../../assets/apple.png';
import banana from '../../assets/bananer.png';
import bread from '../../assets/bread.png';
import cheese from '../../assets/chess.png';
import gameover from '../../assets/gameover.png';
import ghost from '../../assets/ghost.png';
import pikaqiu from '../../assets/pikaqiu.png';
import restart from '../../assets/restart.png';
import start from '../../assets/start.png';
import strawberry from '../../assets/strawberry.png';

export const assets = {
  player: pikaqiu,
  monster: ghost,
  start,
  gameover,
  restart,
  apple,
  banana,
  bread,
  cheese,
  strawberry,
} as const;

export const foodKeys = ['apple', 'banana', 'bread', 'cheese', 'strawberry'] as const;

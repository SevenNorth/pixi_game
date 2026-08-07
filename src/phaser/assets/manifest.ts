import apple from '../../assets/apple.png';
import banana from '../../assets/bananer.png';
import bread from '../../assets/bread.png';
import cheese from '../../assets/chess.png';
import dragonBlack from '../../assets/dragon_black.png';
import dragonGreen from '../../assets/dragon_green.png';
import gameover from '../../assets/gameover.png';
import ghost from '../../assets/ghost.png';
import monster from '../../assets/monster.png';
import monster2 from '../../assets/monster2.png';
import monster3 from '../../assets/monster3.png';
import pikaqiu from '../../assets/pikaqiu.png';
import restart from '../../assets/restart.png';
import start from '../../assets/start.png';
import strawberry from '../../assets/strawberry.png';

export const assets = {
  player: pikaqiu,
  ghost,
  monster,
  monster2,
  monster3,
  dragonBlack,
  dragonGreen,
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

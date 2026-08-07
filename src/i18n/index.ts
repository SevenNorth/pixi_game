const messages = {
  'zh-CN': {
    hp: '生命',
    shield: '护盾',
    level: '等级 {level}',
    score: '分数：{score}',
    killed: '击杀：{killed}',
    experience: '经验',
    experienceValue: '经验 {experience} / {next}',
    startGame: '开始游戏',
    restartGame: '重新开始',
    controls: '方向键 / WASD 移动，空格攻击，P 暂停。',
    levelUp: '升级！',
    maxHpAdded: '最大生命值 +{amount}',
    gameOver: '游戏结束｜分数：{score}｜击杀：{killed}',
  },
  en: {
    hp: 'HP',
    shield: 'SHIELD',
    level: 'LV {level}',
    score: 'SCORE: {score}',
    killed: 'KILLED: {killed}',
    experience: 'Experience',
    experienceValue: 'XP {experience} / {next}',
    startGame: 'Start game',
    restartGame: 'Restart game',
    controls: 'Arrow keys / WASD to move. Space to attack. P to pause.',
    levelUp: 'LEVEL UP!',
    maxHpAdded: 'MAX HP +{amount}',
    gameOver: 'GAME OVER | SCORE: {score} | KILLED: {killed}',
  },
} as const;

export type Locale = keyof typeof messages;
export type MessageKey = keyof (typeof messages)['zh-CN'];

export const locale: Locale = new URLSearchParams(window.location.search).get('lang') === 'en' ? 'en' : 'zh-CN';

document.documentElement.lang = locale;

export function t(key: MessageKey, values: Record<string, string | number> = {}) {
  return Object.entries(values).reduce(
    (text, [name, value]) => text.replaceAll(`{${name}}`, String(value)),
    messages[locale][key] as string,
  );
}

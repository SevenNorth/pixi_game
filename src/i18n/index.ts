const messages = {
  'zh-CN': {
    hp: '生命',
    shield: '护盾',
    level: '等级 {level}',
    mapLevel: '地图等级 {level}',
    killed: '击杀：{killed}',
    experience: '经验',
    experienceValue: '经验 {experience} / {next}',
    mapExperience: '地图经验',
    mapExperienceValue: '地图经验 {experience} / {next}',
    mapBossReady: '地图经验已满 · Boss 即将出现',
    mapBossActive: 'Boss 挑战中',
    startGame: '开始游戏',
    restartGame: '重新开始',
    controls: '方向键 / WASD 移动，空格攻击，J/K/L 或 1/2/3 释放技能，P 暂停。',
    emptySkill: '未装备',
    lightningBolt: '雷电弹',
    thunderDash: '电光冲刺',
    stormShield: '雷霆护盾',
    passiveAttackBoost: '攻击强化',
    passiveShieldCapacity: '护盾扩容',
    passiveMoveSpeed: '移动强化',
    passiveCooldownReduction: '冷却缩减',
    levelUp: '升级！',
    maxHpAdded: '最大生命值 +{amount}',
    gameOver: '游戏结束｜击杀：{killed}',
  },
  en: {
    hp: 'HP',
    shield: 'SHIELD',
    level: 'LV {level}',
    mapLevel: 'MAP LV {level}',
    killed: 'KILLED: {killed}',
    experience: 'Experience',
    experienceValue: 'XP {experience} / {next}',
    mapExperience: 'Map experience',
    mapExperienceValue: 'MAP XP {experience} / {next}',
    mapBossReady: 'MAP XP FULL · BOSS INCOMING',
    mapBossActive: 'BOSS ACTIVE',
    startGame: 'Start game',
    restartGame: 'Restart game',
    controls: 'Move with arrows / WASD. Space attacks. J/K/L or 1/2/3 use skills. P pauses.',
    emptySkill: 'Empty',
    lightningBolt: 'Lightning Bolt',
    thunderDash: 'Thunder Dash',
    stormShield: 'Storm Shield',
    passiveAttackBoost: 'Attack Boost',
    passiveShieldCapacity: 'Shield Capacity',
    passiveMoveSpeed: 'Move Speed',
    passiveCooldownReduction: 'Cooldown Reduction',
    levelUp: 'LEVEL UP!',
    maxHpAdded: 'MAX HP +{amount}',
    gameOver: 'GAME OVER | KILLED: {killed}',
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

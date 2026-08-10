import { foodKeys } from '../assets/manifest';
import { t } from '../../i18n';
import type { MessageKey } from '../../i18n';
import type { PassiveSkillId } from '../../game/content/skills/passiveSkillDefinitions';
import type { PlayerSkillId } from '../../game/content/skills/playerSkillDefinitions';
import type { PassiveSkillSlot } from '../../game/simulation/PlayerPassiveSystem';
import type { PlayerSkillSlotState } from '../../game/simulation/PlayerSkillSystem';
import type { MapProgressionStatus } from '../../game/simulation/MapProgression';
import type {
  ActiveSkillRewardCandidate,
  PassiveSkillRewardCandidate,
  RewardCandidate,
  RewardChoice,
  RewardSource,
} from '../../game/simulation/RewardChoiceSystem';
import {
  getPlayerSkillEffect,
  getPlayerSkillDefinition,
} from '../../game/content/skills/playerSkillDefinitions';
import { passiveSkillDefinitions } from '../../game/content/skills/passiveSkillDefinitions';
import type { LearnedPlayerSkill } from '../../game/simulation/PlayerSkillSystem';

let root: HTMLElement;
let hud: HTMLElement;
let menu: HTMLElement;
let message: HTMLElement;
let killed: HTMLElement;
let hpPips: HTMLElement;
let shieldPips: HTMLElement;
let level: HTMLElement;
let mapLevel: HTMLElement;
let experienceBar: HTMLElement;
let experienceLabel: HTMLElement;
let mapExperienceBar: HTMLElement;
let mapExperienceLabel: HTMLElement;
let levelUp: HTMLElement;
let skillDock: HTMLElement;
let activeSkillSlots: HTMLElement[];
let passiveSkillSlots: HTMLElement[];
let passiveSkillSlotsRoot: HTMLElement;
let rewardChoice: HTMLElement;
let rewardChoiceSource: HTMLElement;
let rewardChoicePending: HTMLElement;
let rewardChoiceOptions: HTMLElement;
let levelUpTimer: number | undefined;
let noticeActive = false;
const noticeQueue: Array<{ kicker: string; title: string }> = [];

export function initDomHud(container: HTMLElement) {
  root = container;
  root.insertAdjacentHTML('beforeend', `
    <div class="hud" aria-live="polite">
      <div class="vitals">
        <div class="vital-row">
          <span class="vital-label">${t('hp')}</span>
          <span id="hp-pips" class="vital-pips"></span>
        </div>
        <div class="vital-row">
          <span class="vital-label">${t('shield')}</span>
          <span id="shield-pips" class="vital-pips"></span>
        </div>
      </div>
      <div class="hud-counters">
        <div id="level" class="hud-stat">${t('level', { level: 1 })}</div>
        <div id="killed" class="hud-stat">${t('killed', { killed: 0 })}</div>
      </div>
      <div class="experience-track" aria-label="${t('experience')}">
        <span id="experience-bar" class="experience-bar"></span>
      </div>
      <div id="experience-label" class="experience-label">${t('experienceValue', { experience: 0, next: 3 })}</div>
      <div class="map-progress">
        <div id="map-level" class="hud-stat map-level">${t('mapLevel', { level: 1 })}</div>
        <div class="experience-track map-experience-track" aria-label="${t('mapExperience')}">
          <span id="map-experience-bar" class="experience-bar map-experience-bar"></span>
        </div>
        <div id="map-experience-label" class="experience-label map-experience-label">${t('mapExperienceValue', { experience: 0, next: 12 })}</div>
      </div>
    </div>
    <div id="game-menu" class="game-menu">
      <div class="menu-actions">
        <button id="start-game" class="image-button" type="button" aria-label="${t('startGame')}"></button>
        <button id="restart-game" class="image-button restart-button" type="button" aria-label="${t('restartGame')}"></button>
      </div>
      <div id="menu-message" class="menu-message">${t('controls')}</div>
    </div>
    <div id="level-up" class="level-up" hidden>
      <div class="level-up-panel">
        <div class="level-up-kicker">${t('levelUp')}</div>
        <div id="level-up-title" class="level-up-title">${t('maxHpAdded', { amount: 1 })}</div>
      </div>
    </div>
    <div id="reward-choice" class="reward-choice" role="dialog" aria-modal="true" aria-labelledby="reward-choice-title" hidden>
      <div class="reward-choice-panel">
        <div class="reward-choice-header">
          <div>
            <div id="reward-choice-source" class="reward-choice-source"></div>
            <div id="reward-choice-title" class="reward-choice-title">${t('rewardChoiceTitle')}</div>
          </div>
          <div id="reward-choice-pending" class="reward-choice-pending"></div>
        </div>
        <div id="reward-choice-options" class="reward-choice-options"></div>
      </div>
    </div>
    <div id="skill-dock" class="skill-dock" hidden>
      <div id="passive-skill-slots" class="passive-skill-slots" aria-label="Passive skills">
        ${Array.from({ length: 4 }, () => `
          <div class="passive-skill-slot" data-empty="true">
            <span class="passive-skill-icon"></span>
            <span class="passive-skill-level"></span>
          </div>
        `).join('')}
      </div>
      <div id="active-skill-slots" class="active-skill-slots">
        ${['Q/1', 'E/2', 'R/3'].map(shortcut => `
          <div class="active-skill-slot" data-empty="true" data-phase="ready">
            <span class="skill-cooldown-mask"></span>
            <span class="skill-icon"></span>
            <span class="skill-level"></span>
            <span class="skill-shortcut">${shortcut}</span>
            <span class="skill-cooldown"></span>
          </div>
        `).join('')}
      </div>
    </div>
  `);
  hud = root.querySelector('.hud') as HTMLElement;
  menu = root.querySelector('#game-menu') as HTMLElement;
  message = root.querySelector('#menu-message') as HTMLElement;
  killed = root.querySelector('#killed') as HTMLElement;
  hpPips = root.querySelector('#hp-pips') as HTMLElement;
  shieldPips = root.querySelector('#shield-pips') as HTMLElement;
  level = root.querySelector('#level') as HTMLElement;
  mapLevel = root.querySelector('#map-level') as HTMLElement;
  experienceBar = root.querySelector('#experience-bar') as HTMLElement;
  experienceLabel = root.querySelector('#experience-label') as HTMLElement;
  mapExperienceBar = root.querySelector('#map-experience-bar') as HTMLElement;
  mapExperienceLabel = root.querySelector('#map-experience-label') as HTMLElement;
  levelUp = root.querySelector('#level-up') as HTMLElement;
  skillDock = root.querySelector('#skill-dock') as HTMLElement;
  activeSkillSlots = Array.from(root.querySelectorAll('.active-skill-slot'));
  passiveSkillSlots = Array.from(root.querySelectorAll('.passive-skill-slot'));
  passiveSkillSlotsRoot = root.querySelector('#passive-skill-slots') as HTMLElement;
  rewardChoice = root.querySelector('#reward-choice') as HTMLElement;
  rewardChoiceSource = root.querySelector('#reward-choice-source') as HTMLElement;
  rewardChoicePending = root.querySelector('#reward-choice-pending') as HTMLElement;
  rewardChoiceOptions = root.querySelector('#reward-choice-options') as HTMLElement;
  const startButton = root.querySelector('#start-game') as HTMLButtonElement;
  const restartButton = root.querySelector('#restart-game') as HTMLButtonElement;
  startButton.style.backgroundImage = `url(${getAssetUrl('start')})`;
  restartButton.style.backgroundImage = `url(${getAssetUrl('restart')})`;
  startButton.addEventListener('click', () => window.dispatchEvent(new Event('start-game')));
  restartButton.addEventListener('click', () => window.dispatchEvent(new Event('restart-game')));
  hideHud();
}

function getAssetUrl(key: string) {
  const url = (window as Window & { __GAME_ASSETS__?: Record<string, string> }).__GAME_ASSETS__?.[key];
  return url ?? '';
}

export function setAssetUrls(urls: Record<string, string>) {
  (window as Window & { __GAME_ASSETS__?: Record<string, string> }).__GAME_ASSETS__ = urls;
}

export function showMenu(text: string, canStart: boolean, canRestart: boolean) {
  menu.hidden = false;
  message.textContent = text;
  (root.querySelector('#start-game') as HTMLButtonElement).hidden = !canStart;
  (root.querySelector('#restart-game') as HTMLButtonElement).hidden = !canRestart;
}

export function hideMenu() {
  menu.hidden = true;
}

export function showLevelUp(levelNumber: number, levelsGained: number) {
  enqueueNotice(
    t('levelUp'),
    `${t('level', { level: levelNumber })} · ${t('maxHpAdded', { amount: levelsGained })}`,
  );
}

export function showBossAppeared(levelNumber: number) {
  enqueueNotice(t('bossAppeared'), t('bossChallenge', { level: levelNumber }));
}

export function showBossPhaseTwo() {
  enqueueNotice(t('bossPhaseTwo'), t('bossPhaseTwoDetail'));
}

export function showMapLevelUp(levelNumber: number) {
  enqueueNotice(t('mapLevelUp'), t('mapLevelReached', { level: levelNumber }));
}

export function hideLevelUp() {
  window.clearTimeout(levelUpTimer);
  noticeQueue.length = 0;
  noticeActive = false;
  levelUp.hidden = true;
}

const rewardSourceKeys: Record<RewardSource, MessageKey> = {
  'level-up': 'rewardSourceLevelUp',
  'elite-core': 'rewardSourceEliteCore',
  boss: 'rewardSourceBoss',
  'post-max': 'rewardSourcePostMax',
};

export function showRewardChoice(choice: RewardChoice, pendingCount: number) {
  rewardChoiceSource.textContent = t(rewardSourceKeys[choice.source]);
  (root.querySelector('#reward-choice-title') as HTMLElement).textContent = t('rewardChoiceTitle');
  rewardChoicePending.textContent = t('rewardChoicePending', { count: pendingCount });
  rewardChoiceOptions.replaceChildren(
    ...choice.candidates.map((candidate, index) => createRewardOption(candidate, index)),
  );
  rewardChoice.hidden = false;
  (rewardChoiceOptions.querySelector('.reward-option') as HTMLButtonElement | null)?.focus();
}

export function hideRewardChoice() {
  rewardChoice.hidden = true;
  rewardChoiceOptions.replaceChildren();
}

export function showActiveEquipChoice(
  candidate: ActiveSkillRewardCandidate,
  slots: Array<PlayerSkillSlotState | null>,
) {
  setRewardResolutionHeader(
    'rewardChooseActiveSlot',
    'rewardActiveSlotHint',
    t(playerSkillNameKeys[candidate.skillId]),
  );
  const slotButtons = slots.map((slot, index) => createResolutionOption({
    key: String(index + 1),
    name: slot ? t(playerSkillNameKeys[slot.id]) : t('emptySkill'),
    detail: slot ? `Lv.${slot.level}` : '',
    action: 'equip-active',
    value: index,
  }));
  slotButtons.push(createResolutionOption({
    key: '0',
    name: t('rewardStoreSkill'),
    detail: t('rewardStoreSkillEffect'),
    action: 'store-active',
  }));
  rewardChoiceOptions.replaceChildren(...slotButtons);
  rewardChoice.hidden = false;
}

export function showPassiveReplacementChoice(
  candidate: PassiveSkillRewardCandidate,
  slots: Array<PassiveSkillSlot | null>,
  selectedSlot: number | null,
) {
  if (selectedSlot !== null) {
    const selected = slots[selectedSlot];
    showReplacementConfirmation(
      selected ? t(passiveSkillNameKeys[selected.id]) : t('emptySkill'),
      selected?.level ?? 0,
      'confirm-passive-replacement',
    );
    return;
  }
  setRewardResolutionHeader(
    'rewardChoosePassiveSlot',
    undefined,
    t(passiveSkillNameKeys[candidate.skillId]),
  );
  rewardChoiceOptions.replaceChildren(...slots.map((slot, index) => createResolutionOption({
    key: String(index + 1),
    name: slot ? t(passiveSkillNameKeys[slot.id]) : t('emptySkill'),
    detail: slot ? `Lv.${slot.level}` : '',
    action: 'select-passive-slot',
    value: index,
  })));
  rewardChoice.hidden = false;
}

export function showActiveForgetChoice(
  candidate: ActiveSkillRewardCandidate,
  learned: readonly LearnedPlayerSkill[],
  selectedSkillId: PlayerSkillId | null,
) {
  if (selectedSkillId) {
    const selected = learned.find(skill => skill.id === selectedSkillId);
    showReplacementConfirmation(
      selected ? t(playerSkillNameKeys[selected.id]) : t('emptySkill'),
      selected?.level ?? 0,
      'confirm-active-forget',
    );
    return;
  }
  setRewardResolutionHeader(
    'rewardChooseForgottenSkill',
    undefined,
    t(playerSkillNameKeys[candidate.skillId]),
  );
  rewardChoiceOptions.replaceChildren(...learned.map((skill, index) => createResolutionOption({
    key: String(index + 1),
    name: t(playerSkillNameKeys[skill.id]),
    detail: `Lv.${skill.level}`,
    action: 'select-active-forget',
    value: skill.id,
  })));
  rewardChoice.hidden = false;
}

interface ResolutionOption {
  key: string;
  name: string;
  detail: string;
  action: string;
  value?: number | string;
}

function setRewardResolutionHeader(
  titleKey: MessageKey,
  detailKey?: MessageKey,
  subject?: string,
) {
  rewardChoiceSource.textContent = subject ?? t('rewardUpgrade');
  rewardChoicePending.textContent = detailKey ? t(detailKey) : '';
  (root.querySelector('#reward-choice-title') as HTMLElement).textContent = t(titleKey);
}

function createResolutionOption(option: ResolutionOption) {
  const button = document.createElement('button');
  button.type = 'button';
  button.className = 'reward-option reward-resolution-option';
  button.innerHTML = `
    <span class="reward-option-key">${option.key}</span>
    <span class="reward-option-name">${option.name}</span>
    <span class="reward-option-effect">${option.detail}</span>
  `;
  button.addEventListener('click', () => dispatchRewardResolution(option.action, option.value));
  return button;
}

function showReplacementConfirmation(name: string, level: number, confirmAction: string) {
  setRewardResolutionHeader('rewardConfirmReplacement');
  const warning = document.createElement('div');
  warning.className = 'reward-replacement-confirmation';
  warning.innerHTML = `
    <div class="reward-replacement-warning">${t('rewardReplacementWarning', { name, level })}</div>
    <div class="reward-resolution-actions">
      <button class="reward-action reward-action-back" type="button">${t('rewardBack')}</button>
      <button class="reward-action reward-action-confirm" type="button">${t('rewardConfirmReplacement')}</button>
    </div>
    <div class="reward-option-hint">${t('rewardConfirmHint')}</div>
  `;
  (warning.querySelector('.reward-action-back') as HTMLButtonElement).addEventListener(
    'click',
    () => dispatchRewardResolution('back'),
  );
  (warning.querySelector('.reward-action-confirm') as HTMLButtonElement).addEventListener(
    'click',
    () => dispatchRewardResolution(confirmAction),
  );
  rewardChoiceOptions.replaceChildren(warning);
  rewardChoice.hidden = false;
  (warning.querySelector('.reward-action-confirm') as HTMLButtonElement).focus();
}

function dispatchRewardResolution(action: string, value?: number | string) {
  window.dispatchEvent(new CustomEvent('reward-resolution-action', {
    detail: { action, value },
  }));
}

function createRewardOption(candidate: RewardCandidate, index: number) {
  const key = index + 1;
  const button = document.createElement('button');
  button.type = 'button';
  button.className = 'reward-option';
  button.dataset.kind = candidate.kind;
  button.dataset.skill = candidate.kind === 'passive-slot' ? 'passive-slot' : candidate.skillId;
  button.innerHTML = `
    <span class="reward-option-key">${key}</span>
    <span class="reward-option-type">${t(
      candidate.operation === 'learn' ? 'rewardLearn' : 'rewardUpgrade',
    )}</span>
    <span class="reward-option-name">${getRewardCandidateName(candidate)}</span>
    <span class="reward-option-level">${t('rewardLevelChange', {
      current: candidate.currentLevel,
      next: candidate.nextLevel,
    })}</span>
    <span class="reward-option-effect">${getRewardCandidateEffect(candidate)}</span>
    <span class="reward-option-hint">${t('rewardKeyHint', { key })}</span>
  `;
  button.addEventListener('click', () => {
    window.dispatchEvent(new CustomEvent('reward-choice-selected', {
      detail: { candidateId: candidate.id },
    }));
  });
  return button;
}

function getRewardCandidateName(candidate: RewardCandidate) {
  if (candidate.kind === 'passive-slot') return t('passiveSlotExpansion');
  return candidate.kind === 'active-skill'
    ? t(playerSkillNameKeys[candidate.skillId])
    : t(passiveSkillNameKeys[candidate.skillId]);
}

function getRewardCandidateEffect(candidate: RewardCandidate) {
  if (candidate.kind === 'passive-slot') return t('passiveSlotExpansionEffect');
  if (candidate.kind === 'passive-skill') {
    const definition = passiveSkillDefinitions[candidate.skillId];
    const value = definition.valuePerLevel;
    if (definition.modifier === 'attack') return t('rewardAttackEffect', { value });
    if (definition.modifier === 'maxShield') {
      return t('rewardShieldCapacityEffect', { value });
    }
    if (definition.modifier === 'moveSpeed') {
      return t('rewardMoveSpeedEffect', { value: Math.round(value * 100) });
    }
    return t('rewardCooldownEffect', { value: Math.round(value * 100) });
  }

  const definition = getPlayerSkillDefinition(candidate.skillId, candidate.nextLevel);
  const effect = getPlayerSkillEffect(candidate.skillId, candidate.nextLevel);
  if (candidate.skillId === 'lightning-bolt') {
    if (effect.type !== 'projectile') return '';
    return t('rewardLightningEffect', {
      damage: definition.damageMultiplier.toFixed(2),
      range: definition.range,
      radius: effect.splashRadius,
      splash: Math.round(effect.splashDamageMultiplier * 100),
      cooldown: (definition.cooldownMs / 1000).toFixed(2),
    });
  }
  if (candidate.skillId === 'thunder-dash') {
    if (effect.type !== 'dash') return '';
    const invulnerability = effect.invulnerabilityMs > 0
      ? t('rewardDashInvulnerability', {
        duration: (effect.invulnerabilityMs / 1000).toFixed(2),
      })
      : '';
    const pathDamage = effect.pathDamageMultiplier > 0
      ? t('rewardDashPathDamage', {
        damage: Math.round(effect.pathDamageMultiplier * 100),
      })
      : '';
    return t('rewardDashEffect', {
      range: definition.range,
      cooldown: (definition.cooldownMs / 1000).toFixed(2),
      bonus: `${invulnerability}${pathDamage}`,
    });
  }
  if (effect.type !== 'shield') return '';
  const protection = effect.protectionMs > 0
    ? t('rewardShieldProtection', {
      duration: (effect.protectionMs / 1000).toFixed(1),
      reduction: Math.round((1 - effect.damageTakenMultiplier) * 100),
    })
    : '';
  return t('rewardShieldEffect', {
    points: effect.points,
    cooldown: (definition.cooldownMs / 1000).toFixed(2),
    bonus: protection,
  });
}

function enqueueNotice(kicker: string, title: string) {
  noticeQueue.push({ kicker, title });
  showNextNotice();
}

function showNextNotice() {
  if (noticeActive) return;
  const notice = noticeQueue.shift();
  if (!notice) return;
  noticeActive = true;
  (root.querySelector('.level-up-kicker') as HTMLElement).textContent = notice.kicker;
  (root.querySelector('#level-up-title') as HTMLElement).textContent = notice.title;
  levelUp.hidden = true;
  void levelUp.offsetWidth;
  levelUp.hidden = false;
  levelUpTimer = window.setTimeout(() => {
    levelUp.hidden = true;
    noticeActive = false;
    showNextNotice();
  }, 1800);
}

export function showHud() {
  hud.hidden = false;
  skillDock.hidden = false;
}

export function hideHud() {
  hud.hidden = true;
  skillDock.hidden = true;
}

export function updateHud(nextKilled: number) {
  killed.textContent = t('killed', { killed: nextKilled });
}

export function updateVitals(hp: number, maxHp: number, shield: number, maxShield: number) {
  renderPips(hpPips, hp, maxHp, 'hp');
  renderPips(shieldPips, shield, maxShield, 'shield');
}

export function updateProgression(
  levelNumber: number,
  experience: number,
  experienceToNext: number,
  maxLevel = Number.POSITIVE_INFINITY,
  postMaxKills = 0,
  postMaxKillsToNext = 0,
) {
  level.textContent = t('level', { level: levelNumber });
  const atMaxLevel = levelNumber >= maxLevel;
  const progress = atMaxLevel
    ? postMaxKillsToNext > 0 ? Math.min(1, postMaxKills / postMaxKillsToNext) : 0
    : experienceToNext > 0 ? Math.min(1, experience / experienceToNext) : 1;
  experienceBar.style.width = `${progress * 100}%`;
  experienceLabel.textContent = atMaxLevel
    ? t('postMaxProgressValue', { kills: postMaxKills, next: postMaxKillsToNext })
    : t('experienceValue', {
      experience: formatProgressValue(experience),
      next: formatProgressValue(experienceToNext),
    });
}

export function updateMapLevel(levelNumber: number) {
  mapLevel.textContent = t('mapLevel', { level: levelNumber });
}

export function updateMapProgression(
  levelNumber: number,
  experience: number,
  experienceToNext: number,
  status: MapProgressionStatus,
) {
  updateMapLevel(levelNumber);
  const progress = experienceToNext > 0 ? Math.min(1, experience / experienceToNext) : 1;
  mapExperienceBar.style.width = `${progress * 100}%`;
  mapExperienceLabel.textContent = status === 'boss-active'
    ? t('mapBossActive')
    : status === 'boss-ready'
      ? t('mapBossReady')
      : t('mapExperienceValue', {
        experience: formatProgressValue(experience),
        next: formatProgressValue(experienceToNext),
      });
}

const playerSkillNameKeys: Record<PlayerSkillId, MessageKey> = {
  'lightning-bolt': 'lightningBolt',
  'thunder-dash': 'thunderDash',
  'storm-shield': 'stormShield',
};

const passiveSkillNameKeys: Record<PassiveSkillId, MessageKey> = {
  'attack-boost': 'passiveAttackBoost',
  'shield-capacity': 'passiveShieldCapacity',
  'move-speed': 'passiveMoveSpeed',
  'cooldown-reduction': 'passiveCooldownReduction',
};

export function updateSkillSlots(slots: Array<PlayerSkillSlotState | null>) {
  activeSkillSlots.forEach((element, index) => {
    const slot = slots[index] ?? null;
    const level = element.querySelector('.skill-level') as HTMLElement;
    const cooldown = element.querySelector('.skill-cooldown') as HTMLElement;
    const mask = element.querySelector('.skill-cooldown-mask') as HTMLElement;
    element.dataset.empty = String(!slot);
    element.dataset.skill = slot?.id ?? '';
    element.dataset.phase = slot?.phase ?? 'ready';
    level.textContent = slot ? `Lv.${slot.level}` : '';
    const ratio = slot?.phase === 'cooldown' && slot.cooldownMs > 0
      ? Math.min(1, slot.remainingMs / slot.cooldownMs)
      : 0;
    mask.style.height = `${ratio * 100}%`;
    cooldown.textContent = slot?.phase === 'cooldown' && slot.remainingMs > 0
      ? (slot.remainingMs / 1000).toFixed(1)
      : '';
    element.title = slot ? t(playerSkillNameKeys[slot.id]) : t('emptySkill');
    element.setAttribute(
      'aria-label',
      slot ? `${t(playerSkillNameKeys[slot.id])} Lv.${slot.level}` : t('emptySkill'),
    );
  });
}

export function updatePassiveSkills(slots: Array<PassiveSkillSlot | null>) {
  ensurePassiveSkillSlotElements(slots.length);
  passiveSkillSlots.forEach((element, index) => {
    const slot = slots[index] ?? null;
    const level = element.querySelector('.passive-skill-level') as HTMLElement;
    element.dataset.empty = String(!slot);
    element.dataset.passive = slot?.id ?? '';
    level.textContent = slot ? String(slot.level) : '';
    element.setAttribute(
      'aria-label',
      slot ? `${t(passiveSkillNameKeys[slot.id])} Lv.${slot.level}` : t('emptySkill'),
    );
  });
}

function ensurePassiveSkillSlotElements(count: number) {
  while (passiveSkillSlots.length < count) {
    const element = document.createElement('div');
    element.className = 'passive-skill-slot';
    element.dataset.empty = 'true';
    element.innerHTML = `
      <span class="passive-skill-icon"></span>
      <span class="passive-skill-level"></span>
    `;
    passiveSkillSlotsRoot.append(element);
    passiveSkillSlots.push(element);
  }
  while (passiveSkillSlots.length > count) {
    passiveSkillSlots.pop()?.remove();
  }
}

function renderPips(container: HTMLElement, value: number, max: number, type: 'hp' | 'shield') {
  container.replaceChildren(
    ...Array.from({ length: max }, (_, index) => {
      const pip = document.createElement('span');
      pip.className = `vital-pip vital-pip-${type}`;
      const remaining = value - index;
      pip.dataset.fill = remaining >= 1 ? 'full' : remaining > 0 ? 'partial' : 'empty';
      return pip;
    }),
  );
  container.setAttribute('aria-label', `${type} ${formatPipValue(value)} of ${max}`);
}

function formatPipValue(value: number) {
  return Number.isInteger(value) ? String(value) : value.toFixed(1);
}

function formatProgressValue(value: number) {
  const rounded = Math.round((value + Number.EPSILON) * 100) / 100;
  return Number.isInteger(rounded)
    ? String(rounded)
    : rounded.toFixed(2).replace(/0+$/, '').replace(/\.$/, '');
}

export function getFoodKey(index: number) {
  return foodKeys[index];
}

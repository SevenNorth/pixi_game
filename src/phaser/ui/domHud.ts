import { foodKeys } from '../assets/manifest';
import { t } from '../../i18n';
import type { MessageKey } from '../../i18n';
import type { PassiveSkillId } from '../../game/content/skills/passiveSkillDefinitions';
import type { PlayerSkillId } from '../../game/content/skills/playerSkillDefinitions';
import type { PassiveSkillSlot } from '../../game/simulation/PlayerPassiveSystem';
import type { PlayerSkillSlotState } from '../../game/simulation/PlayerSkillSystem';

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
let levelUp: HTMLElement;
let skillDock: HTMLElement;
let activeSkillSlots: HTMLElement[];
let passiveSkillSlots: HTMLElement[];
let levelUpTimer: number | undefined;

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
        <div id="map-level" class="hud-stat map-level">${t('mapLevel', { level: 1 })}</div>
        <div id="level" class="hud-stat">${t('level', { level: 1 })}</div>
        <div id="killed" class="hud-stat">${t('killed', { killed: 0 })}</div>
      </div>
      <div class="experience-track" aria-label="${t('experience')}">
        <span id="experience-bar" class="experience-bar"></span>
      </div>
      <div id="experience-label" class="experience-label">${t('experienceValue', { experience: 0, next: 3 })}</div>
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
        ${['J/1', 'K/2', 'L/3'].map(shortcut => `
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
  levelUp = root.querySelector('#level-up') as HTMLElement;
  skillDock = root.querySelector('#skill-dock') as HTMLElement;
  activeSkillSlots = Array.from(root.querySelectorAll('.active-skill-slot'));
  passiveSkillSlots = Array.from(root.querySelectorAll('.passive-skill-slot'));
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
  window.clearTimeout(levelUpTimer);
  levelUp.hidden = false;
  (root.querySelector('#level-up-title') as HTMLElement).textContent =
    `${t('level', { level: levelNumber })} · ${t('maxHpAdded', { amount: levelsGained })}`;
  levelUpTimer = window.setTimeout(hideLevelUp, 1800);
}

export function hideLevelUp() {
  window.clearTimeout(levelUpTimer);
  levelUp.hidden = true;
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

export function updateProgression(levelNumber: number, experience: number, experienceToNext: number) {
  level.textContent = t('level', { level: levelNumber });
  const progress = experienceToNext > 0 ? Math.min(1, experience / experienceToNext) : 1;
  experienceBar.style.width = `${progress * 100}%`;
  experienceLabel.textContent = t('experienceValue', { experience, next: experienceToNext });
}

export function updateMapLevel(levelNumber: number) {
  mapLevel.textContent = t('mapLevel', { level: levelNumber });
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

function renderPips(container: HTMLElement, value: number, max: number, type: 'hp' | 'shield') {
  container.replaceChildren(
    ...Array.from({ length: max }, (_, index) => {
      const pip = document.createElement('span');
      pip.className = `vital-pip vital-pip-${type}`;
      pip.dataset.active = String(index < value);
      return pip;
    }),
  );
  container.setAttribute('aria-label', `${type} ${value} of ${max}`);
}

export function getFoodKey(index: number) {
  return foodKeys[index];
}

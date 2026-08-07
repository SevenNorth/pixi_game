import { foodKeys } from '../assets/manifest';
import { t } from '../../i18n';

let root: HTMLElement;
let hud: HTMLElement;
let menu: HTMLElement;
let message: HTMLElement;
let killed: HTMLElement;
let hpPips: HTMLElement;
let shieldPips: HTMLElement;
let level: HTMLElement;
let experienceBar: HTMLElement;
let experienceLabel: HTMLElement;
let levelUp: HTMLElement;
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
  `);
  hud = root.querySelector('.hud') as HTMLElement;
  menu = root.querySelector('#game-menu') as HTMLElement;
  message = root.querySelector('#menu-message') as HTMLElement;
  killed = root.querySelector('#killed') as HTMLElement;
  hpPips = root.querySelector('#hp-pips') as HTMLElement;
  shieldPips = root.querySelector('#shield-pips') as HTMLElement;
  level = root.querySelector('#level') as HTMLElement;
  experienceBar = root.querySelector('#experience-bar') as HTMLElement;
  experienceLabel = root.querySelector('#experience-label') as HTMLElement;
  levelUp = root.querySelector('#level-up') as HTMLElement;
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
}

export function hideHud() {
  hud.hidden = true;
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

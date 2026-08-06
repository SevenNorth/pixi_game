import { foodKeys } from '../assets/manifest';

let root: HTMLElement;
let hud: HTMLElement;
let menu: HTMLElement;
let message: HTMLElement;
let score: HTMLElement;
let killed: HTMLElement;

export function initDomHud(container: HTMLElement) {
  root = container;
  root.insertAdjacentHTML('beforeend', `
    <div class="hud" aria-live="polite">
      <div id="score" class="hud-stat">SCORE: 0</div>
      <div id="killed" class="hud-stat">KILLED: 0</div>
    </div>
    <div id="game-menu" class="game-menu">
      <div class="menu-actions">
        <button id="start-game" class="image-button" type="button" aria-label="Start game"></button>
        <button id="restart-game" class="image-button restart-button" type="button" aria-label="Restart game"></button>
      </div>
      <div id="menu-message" class="menu-message">Arrow keys / WASD to move. Space to attack. P to pause.</div>
    </div>
  `);
  hud = root.querySelector('.hud') as HTMLElement;
  menu = root.querySelector('#game-menu') as HTMLElement;
  message = root.querySelector('#menu-message') as HTMLElement;
  score = root.querySelector('#score') as HTMLElement;
  killed = root.querySelector('#killed') as HTMLElement;
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

export function showHud() {
  hud.hidden = false;
}

export function hideHud() {
  hud.hidden = true;
}

export function updateHud(nextScore: number, nextKilled: number) {
  score.textContent = `SCORE: ${nextScore}`;
  killed.textContent = `KILLED: ${nextKilled}`;
}

export function getFoodKey(index: number) {
  return foodKeys[index];
}

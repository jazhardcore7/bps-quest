// Level-up moment: a short celebratory overlay with a CSS-only burst.
// Triggered only by a level increase in AppState for the same signed-in user
// (the first profile load after sign-in sets the baseline and never fires).
// Non-modal: it never takes focus. Dismiss by click/tap, Escape, or after a few
// seconds. Screen readers get the message through the shared status region.
import { AppState } from '../state/index.js';
import { icon } from './icons.js';
import { escapeHtml } from './escape.js';
import { announce } from './hud.js';

const AUTO_HIDE_MS = 4000;
const RAYS = 12;

let lastIdentity = null;
let lastLevel = null;
let overlayEl = null;
let hideTimer = null;
let escHandler = null;
let initialized = false;

function identityOf(state) {
  return (state && state.player && state.player.email) || null;
}

function onStateChange(state) {
  const id = identityOf(state);
  const level = state && state.player ? state.player.level : null;

  if (!id) {
    lastIdentity = null;
    lastLevel = null;
    return;
  }
  if (id !== lastIdentity) {
    lastIdentity = id;
    lastLevel = level;
    return;
  }
  if (typeof level === 'number' && typeof lastLevel === 'number' && level > lastLevel) {
    showLevelUp(level, state.player.title);
  }
  lastLevel = level;
}

export function hideLevelUp() {
  if (hideTimer) {
    clearTimeout(hideTimer);
    hideTimer = null;
  }
  if (escHandler) {
    window.removeEventListener('keydown', escHandler, true);
    escHandler = null;
  }
  if (overlayEl) {
    overlayEl.remove();
    overlayEl = null;
  }
}

/**
 * Shows the level-up overlay on the stage.
 * @param {number} level
 * @param {string} [title]
 */
export function showLevelUp(level, title) {
  const stage = document.getElementById('stage');
  if (!stage) return;
  hideLevelUp();

  let rays = '';
  for (let i = 0; i < RAYS; i++) {
    rays += '<span class="levelup-ray" style="--i:' + i + '"></span>';
  }

  const el = document.createElement('div');
  el.className = 'levelup-overlay';
  el.setAttribute('aria-hidden', 'true'); // announced via the status region instead
  el.innerHTML = '' +
    '<div class="levelup-burst">' + rays + '</div>' +
    '<div class="levelup-card">' +
      '<span class="levelup-star">' + icon('starFilled', { size: 'l' }) + '</span>' +
      '<div class="levelup-kicker">Naik Level!</div>' +
      '<div class="levelup-level">Level ' + escapeHtml(String(level)) + '</div>' +
      (title ? '<div class="levelup-title">' + escapeHtml(String(title)) + '</div>' : '') +
      '<div class="levelup-hint">Ketuk untuk lanjut</div>' +
    '</div>';

  el.addEventListener('click', hideLevelUp);
  stage.appendChild(el);
  overlayEl = el;

  // Escape closes this overlay first, without also closing an open info panel.
  escHandler = (e) => {
    if (e.key === 'Escape' && overlayEl) {
      e.stopPropagation();
      e.preventDefault();
      hideLevelUp();
    }
  };
  window.addEventListener('keydown', escHandler, true);

  hideTimer = setTimeout(hideLevelUp, AUTO_HIDE_MS);
  announce('Selamat! Kamu naik ke Level ' + level + '.');
}

/** Subscribes once to AppState. Call at app start. */
export function initLevelUp() {
  if (initialized) return;
  initialized = true;
  lastIdentity = identityOf(AppState);
  lastLevel = AppState.player ? AppState.player.level : null;
  AppState.subscribe(onStateChange);
}

export default { initLevelUp, showLevelUp, hideLevelUp };

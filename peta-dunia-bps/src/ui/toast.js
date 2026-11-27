// Toast element builder (presentation only). Used by showToast() in hud.js.
// Kept free of Firebase imports so the component sheet can render it.
import { icon } from './icons.js';

export const TOAST_DEFAULT_MS = 3000;

const XP_PATTERN = /^\+\s?(\d+)\s?XP$/i;

/**
 * Builds a toast element. Text is set with textContent (never innerHTML).
 * A message like "+20 XP" gets the gold coin variant.
 * @param {string} message
 * @returns {HTMLDivElement}
 */
export function buildToastEl(message) {
  const text = String(message);
  const toast = document.createElement('div');
  toast.className = 'bps-toast';
  toast.setAttribute('role', 'status');
  toast.setAttribute('aria-live', 'polite');

  if (XP_PATTERN.test(text.trim())) {
    toast.classList.add('bps-toast--xp');
    const coin = document.createElement('span');
    coin.className = 'bps-toast__coin';
    coin.innerHTML = icon('coin', { size: 'l' }); // static, trusted markup
    toast.appendChild(coin);
  }

  const label = document.createElement('span');
  label.className = 'bps-toast__text';
  label.textContent = text;
  toast.appendChild(label);
  return toast;
}

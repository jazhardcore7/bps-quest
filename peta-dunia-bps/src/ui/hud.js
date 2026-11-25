// Reusable HUD components, icons, and toast notifications
import { logout } from '../firebase/auth.js';
import { buildToastEl, TOAST_DEFAULT_MS } from './toast.js';
import { icon } from './icons.js';
import { escapeHtml } from './escape.js';

let toastTimeout = null;

// Kept for compatibility (same keys as before); now token-colored inline SVG.
export const icons = {
  lock: icon('lock', { size: 's' }),
  star: icon('starFilled', { size: 's' }),
  backArrow: icon('arrowLeft'),
  avatar: '',
  logout: icon('logout'),
  trophy: icon('trophy')
};

const XP_SEGMENTS = 10;

function initialsOf(name) {
  // First letter of the first and last word that contain a letter.
  const letters = String(name || '')
    .split(/\s+/)
    .map((w) => (w.match(/\p{L}/u) || [''])[0])
    .filter(Boolean);
  if (letters.length === 0) return 'P';
  const last = letters.length > 1 ? letters[letters.length - 1] : '';
  return (letters[0] + last).toUpperCase();
}

// Global delegation for HUD button clicks (logout & leaderboard)
if (typeof document !== 'undefined') {
  document.addEventListener('click', async (e) => {
    const trophyBtn = e.target.closest('#hud-trophy-btn');
    if (trophyBtn) {
      e.preventDefault();
      window.location.hash = '#/leaderboard';
      return;
    }

    const logoutBtn = e.target.closest('#hud-logout-btn');
    if (logoutBtn) {
      e.preventDefault();
      try {
        await logout();
        window.location.hash = '#/login';
      } catch (err) {
        console.error('Logout error:', err);
      }
    }
  });
}

export function renderRightCard(state) {
  const player = (state && state.player) || {
    displayName: 'Pegawai BPS',
    level: 1,
    title: 'Explorer',
    xp: 0,
    xpToNext: 500
  };
  const percent = Math.min(100, Math.max(0, Math.round((player.xp / player.xpToNext) * 100)));
  const filled = Math.min(XP_SEGMENTS, Math.floor(percent / (100 / XP_SEGMENTS)));
  const rawName = player.displayName || 'Pegawai BPS';
  const name = escapeHtml(rawName);
  const title = escapeHtml(String(player.title || ''));
  const level = escapeHtml(String(player.level));
  const xp = escapeHtml(String(player.xp));
  const xpToNext = escapeHtml(String(player.xpToNext));
  const initials = escapeHtml(initialsOf(rawName));

  let cells = '';
  for (let i = 0; i < XP_SEGMENTS; i++) {
    cells += '<span class="hud-xp-cell' + (i < filled ? ' is-filled' : '') + '"></span>';
  }

  return '' +
    '<div class="hud-card hud-right-card" role="group" aria-label="Informasi Pemain">' +
      '<div class="hud-avatar-wrap" aria-hidden="true">' +
        '<span class="hud-avatar-initials">' + initials + '</span>' +
      '</div>' +
      '<div class="hud-player-info">' +
        '<div class="hud-player-name" title="' + name + '">' + name + '</div>' +
        '<div class="hud-player-level">Level ' + level + ' · ' + title + '</div>' +
        '<div class="hud-xp-row">' +
          '<div class="hud-progress-track" role="progressbar" aria-label="XP menuju level berikutnya" ' +
            'aria-valuenow="' + xp + '" aria-valuemin="0" aria-valuemax="' + xpToNext + '" ' +
            'aria-valuetext="' + xp + ' dari ' + xpToNext + ' XP">' +
            cells +
          '</div>' +
          '<span class="hud-xp-text" aria-hidden="true">' + xp + ' / ' + xpToNext + ' XP</span>' +
        '</div>' +
      '</div>' +
      '<button type="button" class="btn btn--secondary btn--icon hud-action-btn hud-trophy-btn" id="hud-trophy-btn" title="Papan Peringkat" aria-label="Papan Peringkat">' +
        icon('trophy') +
      '</button>' +
      '<button type="button" class="btn btn--secondary btn--icon hud-action-btn hud-logout-btn" id="hud-logout-btn" title="Keluar dari akun" aria-label="Keluar dari akun">' +
        icon('logout') +
      '</button>' +
    '</div>';
}

export function renderLeftCard(options = {}) {
  const hasBack = Boolean(options.hasBack);
  const title = options.title || 'Peta Dunia BPS';
  const subtitle = options.subtitle || 'Jelajahi seluruh pulau unit kerja di BPS';

  const backBtnHtml = hasBack
    ? '<button type="button" class="btn btn--secondary btn--icon hud-back-btn" id="hud-back-button" aria-label="Kembali">' +
        icon('arrowLeft') +
      '</button>'
    : '<span class="hud-emblem" aria-hidden="true">' + icon('map', { size: 'l' }) + '</span>';

  return '' +
    '<div class="hud-card hud-left-card' + (hasBack ? ' has-back' : '') + '">' +
      backBtnHtml +
      '<div class="hud-title-wrap">' +
        '<h1 class="hud-title">' + escapeHtml(title) + '</h1>' +
        '<div class="hud-subtitle">' + escapeHtml(subtitle) + '</div>' +
      '</div>' +
    '</div>';
}

export function bindLeftCardEvents(container, onBack) {
  const backBtn = container.querySelector('#hud-back-button');
  if (backBtn) {
    backBtn.addEventListener('click', (e) => {
      e.preventDefault();
      if (typeof onBack === 'function') {
        onBack();
      } else {
        window.history.back();
      }
    });
  }
}

// Persistent screen-reader live region outside #stage, so it survives screen
// re-renders and announces reliably (a freshly inserted region often does not).
export function announce(message) {
  let live = document.getElementById('bps-live-status');
  if (!live) {
    live = document.createElement('div');
    live.id = 'bps-live-status';
    live.className = 'visually-hidden';
    live.setAttribute('role', 'status');
    live.setAttribute('aria-live', 'polite');
    live.setAttribute('aria-atomic', 'true');
    document.body.appendChild(live);
  }
  live.textContent = '';
  // Next frame so repeated identical messages are still announced.
  requestAnimationFrame(() => { live.textContent = String(message); });
}

export function showToast(message, duration = TOAST_DEFAULT_MS) {
  const stage = document.getElementById('stage');
  if (!stage) return;

  const existing = stage.querySelector('.bps-toast');
  if (existing) {
    existing.remove();
  }
  if (toastTimeout) {
    clearTimeout(toastTimeout);
    toastTimeout = null;
  }

  const toast = buildToastEl(message);
  // The visible toast is presentation; the live region does the announcing.
  toast.removeAttribute('role');
  toast.removeAttribute('aria-live');
  toast.setAttribute('aria-hidden', 'true');
  stage.appendChild(toast);
  announce(message);

  void toast.offsetWidth;
  toast.classList.add('visible');

  toastTimeout = setTimeout(() => {
    toast.classList.remove('visible');
    setTimeout(() => {
      if (toast.parentNode) {
        toast.parentNode.removeChild(toast);
      }
    }, 300);
  }, duration);
}

export const Hud = {
  icons,
  renderRightCard,
  renderLeftCard,
  bindLeftCardEvents,
  showToast
};

export default Hud;

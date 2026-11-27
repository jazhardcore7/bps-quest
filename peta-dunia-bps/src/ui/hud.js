// Reusable HUD components, icons, and toast notifications
import { logout } from '../firebase/auth.js';
import { isHeadRole, isSuperAdminRole } from '../config.js';
import { escapeHtml } from './escape.js';
import { buildToastEl, TOAST_DEFAULT_MS } from './toast.js';

let toastTimeout = null;

export const icons = {
  lock: '<svg width="13" height="13" viewBox="0 0 24 24" fill="#FFFFFF" class="icon-lock" aria-hidden="true"><path d="M18 8h-1V6c0-2.76-2.24-5-5-5S7 3.24 7 6v2H6c-1.1 0-2 .9-2 2v10c0 1.1.9 2 2 2h12c1.1 0 2-.9 2-2V10c0-1.1-.9-2-2-2zm-6 9c-1.1 0-2-.9-2-2s.9-2 2-2 2 .9 2 2-.9 2-2 2zm3.1-9H8.9V6c0-1.71 1.39-3.1 3.1-3.1 1.71 0 3.1 1.39 3.1 3.1v2z"/></svg>',
  star: '<svg width="14" height="14" viewBox="0 0 24 24" fill="#FFD24A" class="icon-star" aria-hidden="true"><path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z"/></svg>',
  backArrow: '<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#FFFFFF" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M19 12H5M12 19l-7-7 7-7"/></svg>',
  avatar: '<svg width="40" height="40" viewBox="0 0 40 40" class="hud-avatar-svg" aria-hidden="true">' +
    '<circle cx="20" cy="20" r="20" fill="#FFD9B0"/>' +
    '<path d="M12 15 C12 9 28 9 28 15 C26 12 23 11 20 11 C17 11 14 12 12 15 Z" fill="#3B2A20"/>' +
    '<circle cx="20" cy="17" r="7" fill="#F2B583"/>' +
    '<path d="M14 14 C16 12 24 12 26 14 C25 13 23 12.5 20 12.5 C17 12.5 15 13 14 14 Z" fill="#3B2A20"/>' +
    '<path d="M8 38 C8 29 14 26 20 26 C26 26 32 29 32 38 Z" fill="#2E86DE"/>' +
    '</svg>',
  logout: '<svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"></path><polyline points="16 17 21 12 16 7"></polyline><line x1="21" y1="12" x2="9" y2="12"></line></svg>',
  trophy: '<svg width="16" height="16" viewBox="0 0 24 24" fill="#FFD24A" class="icon-trophy" aria-hidden="true"><path d="M19 5h-2V3H7v2H5c-1.1 0-2 .9-2 2v1c0 2.55 1.92 4.63 4.39 4.94.63 1.5 1.98 2.63 3.61 2.96V19H7v2h10v-2h-4v-3.1c1.63-.33 2.98-1.46 3.61-2.96C19.08 12.63 21 10.55 21 8V7c0-1.1-.9-2-2-2zM5 8V7h2v3.82C5.84 10.4 5 9.3 5 8zm14 0c0 1.3-.84 2.4-2 2.82V7h2v1z"/></svg>'
};

// Global delegation for HUD button clicks (manage, leaderboard, logout)
if (typeof document !== 'undefined') {
  document.addEventListener('click', async (e) => {
    const manageBtn = e.target.closest('#hud-manage-btn');
    if (manageBtn) {
      e.preventDefault();
      window.location.hash = '#/manage';
      return;
    }

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
    role: 'employee',
    active: true,
    level: 1,
    title: 'Pegawai',
    xp: 0,
    xpToNext: 500
  };
  const percent = Math.min(100, Math.max(0, Math.round((player.xp / player.xpToNext) * 100)));
  const name = escapeHtml(player.displayName || 'Pegawai BPS');
  const title = escapeHtml(player.title || 'Pegawai');
  const canManage = Boolean(
    state &&
    state.user &&
    player.active !== false &&
    (isHeadRole(player.role) || isSuperAdminRole(player.role))
  );
  const manageBtnHtml = canManage
    ? '<button type="button" class="hud-manage-btn" id="hud-manage-btn" title="Pusat Pengelolaan" aria-label="Kelola">Kelola</button>'
    : '';

  const level = escapeHtml(String(player.level));
  const xp = escapeHtml(String(player.xp));
  const xpToNext = escapeHtml(String(player.xpToNext));

  return '' +
    '<div class="hud-card hud-right-card hud-v2" aria-label="Informasi Pemain">' +
      '<div class="hud-avatar-wrap">' +
        icons.avatar +
      '</div>' +
      '<div class="hud-player-info">' +
        '<div class="hud-player-name" title="' + name + '">' +
          name +
        '</div>' +
        '<div class="hud-player-level">' +
          '<span class="hud-level-text">Level ' + level + '</span>' +
          '<span class="hud-role-chip" title="' + title + '">' + title + '</span>' +
        '</div>' +
        '<div class="hud-xp-row">' +
          '<div class="hud-progress-track" role="progressbar" aria-label="XP menuju level berikutnya" ' +
            'aria-valuenow="' + xp + '" aria-valuemin="0" aria-valuemax="' + xpToNext + '" ' +
            'aria-valuetext="' + xp + ' dari ' + xpToNext + ' XP">' +
            '<div class="hud-progress-fill" style="width: ' + percent + '%;"></div>' +
          '</div>' +
          '<div class="hud-xp-text">' + xp + ' / ' + xpToNext + ' XP</div>' +
        '</div>' +
      '</div>' +
      '<div class="hud-actions">' +
        manageBtnHtml +
        '<button type="button" class="hud-action-btn hud-trophy-btn" id="hud-trophy-btn" title="Papan Peringkat" aria-label="Papan Peringkat">' +
          icons.trophy +
        '</button>' +
        '<button type="button" class="hud-action-btn hud-logout-btn" id="hud-logout-btn" title="Keluar dari akun" aria-label="Keluar dari akun">' +
          icons.logout +
        '</button>' +
      '</div>' +
    '</div>';
}

export function renderLeftCard(options = {}) {
  const hasBack = Boolean(options.hasBack);
  const title = escapeHtml(options.title || 'Peta Dunia BPS');
  const subtitle = escapeHtml(options.subtitle || 'Jelajahi seluruh pulau unit kerja di BPS');

  const backBtnHtml = hasBack
    ? '<button type="button" class="hud-back-btn" id="hud-back-button" aria-label="Kembali">' +
        icons.backArrow +
      '</button>'
    : '';

  return '' +
    '<div class="hud-card hud-left-card hud-v2' + (hasBack ? ' has-back' : '') + '">' +
      backBtnHtml +
      '<div class="hud-title-wrap">' +
        '<h1 class="hud-title">' + title + '</h1>' +
        '<div class="hud-subtitle">' + subtitle + '</div>' +
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

// First letter of the first and last word that contain a letter (leaderboard avatars).
export function initialsOf(name) {
  const letters = String(name || '')
    .split(/\s+/)
    .map((w) => (w.match(/\p{L}/u) || [''])[0])
    .filter(Boolean);
  if (letters.length === 0) return 'P';
  const last = letters.length > 1 ? letters[letters.length - 1] : '';
  return (letters[0] + last).toUpperCase();
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

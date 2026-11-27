// Screen 4: Leaderboard Screen (#/leaderboard)
import { AppState } from '../state/index.js';
import { Hud, initialsOf } from '../ui/hud.js';
import { icon } from '../ui/icons.js';
import { escapeHtml } from '../ui/escape.js';
import { weekKeyJakarta, monthKeyJakarta } from '../config.js';
import { auth } from '../firebase/client.js';
import { Router } from '../router.js';
import {
  fetchLeaderboard,
  sortLeaderboardUsers,
  filterUsersByUnit
} from '../firebase/leaderboard.js';

let unsubscribeState = null;

// Unit label shared by the ranked rows and the pinned "Kamu" row.
function unitLabel(unit) {
  return unit === 'biro-sdm' ? 'Biro SDM' : (unit === 'biro-umum' ? 'Biro Umum' : (unit || 'BPS'));
}

// XP fields for the pinned row, read from the user's own profile. Weekly and
// monthly XP from an earlier week or month count as 0, as in the queries.
function ownPeriodStats(userDoc) {
  const u = userDoc || {};
  const now = new Date();
  return {
    xp: u.xp,
    xpWeek: u.weekKey === weekKeyJakarta(now) ? u.xpWeek : 0,
    xpMonth: u.monthKey === monthKeyJakarta(now) ? u.xpMonth : 0
  };
}

// Small decorative illustration for the empty state: an island with a flag.
const EMPTY_ILLUSTRATION = '' +
  '<svg class="empty-illustration" viewBox="0 0 160 100" width="160" height="100" aria-hidden="true" focusable="false">' +
    '<ellipse cx="80" cy="78" rx="74" ry="18" fill="var(--ocean-shallow)"/>' +
    '<ellipse cx="80" cy="74" rx="58" ry="14" fill="var(--sand)" stroke="var(--ink)" stroke-width="3"/>' +
    '<ellipse cx="80" cy="70" rx="40" ry="9" fill="var(--grass)" stroke="var(--ink)" stroke-width="2.5"/>' +
    '<path d="M80 68V22" stroke="var(--ink)" stroke-width="3" stroke-linecap="round"/>' +
    '<path d="M82 22h30l-8 9 8 9H82z" fill="var(--gold)" stroke="var(--ink)" stroke-width="2.5" stroke-linejoin="round"/>' +
    '<circle cx="56" cy="64" r="7" fill="var(--tree)" stroke="var(--ink)" stroke-width="2"/>' +
  '</svg>';

export const LeaderboardScreen = {
  container: null,
  activeTab: 'all-time',
  activeUnitFilter: 'Semua',
  isLoading: false,
  error: null,
  users: [],

  mount(container) {
    this.container = container;
    this.activeTab = 'all-time';
    this.activeUnitFilter = 'Semua';
    this.isLoading = false;
    this.error = null;
    this.users = [];

    this.render();
    this.loadData();

    unsubscribeState = AppState.subscribe(() => {
      this.updateHud();
      // If current user row is pinned, update it
      this.renderList();
    });
  },

  unmount() {
    if (typeof unsubscribeState === 'function') {
      unsubscribeState();
      unsubscribeState = null;
    }
    if (this.container) {
      this.container.innerHTML = '';
    }
  },

  updateHud() {
    if (!this.container) return;
    const rightWrapper = this.container.querySelector('.hud-right-wrapper');
    if (rightWrapper) {
      rightWrapper.innerHTML = Hud.renderRightCard(AppState);
    }
  },

  async loadData(forceReload = false) {
    this.isLoading = true;
    this.error = null;
    this.renderList();

    try {
      const data = await fetchLeaderboard(this.activeTab, forceReload);
      this.users = data;
    } catch (err) {
      console.error('Failed to load leaderboard:', err);
      this.error = 'Gagal memuat papan peringkat. Silakan coba lagi.';
      this.users = [];
    } finally {
      this.isLoading = false;
      this.renderList();
    }
  },

  render() {
    if (!this.container) return;

    let html = '<div class="screen screen-leaderboard">';

    // Left HUD Card with back button
    html += '<div class="hud-left-wrapper">';
    html += Hud.renderLeftCard({
      title: 'Papan Peringkat',
      subtitle: 'Peringkat pegawai berdasarkan perolehan XP',
      hasBack: true
    });
    html += '</div>';

    // Right HUD Card
    html += '<div class="hud-right-wrapper">';
    html += Hud.renderRightCard(AppState);
    html += '</div>';

    // Main Leaderboard Card
    const tab = (id, label) =>
      '<button type="button" class="segmented__btn lb-tab-btn' + (this.activeTab === id ? ' is-active' : '') + '" data-tab="' + id + '" role="tab" aria-selected="' + (this.activeTab === id) + '">' + label + '</button>';
    const chip = (unit) =>
      '<button type="button" class="chip lb-chip-btn' + (this.activeUnitFilter === unit ? ' is-active' : '') + '" data-unit="' + unit + '" aria-pressed="' + (this.activeUnitFilter === unit) + '">' +
        icon('check', { size: 's' }) + unit +
      '</button>';

    html += '' +
      '<div class="leaderboard-card-container">' +
        '<div class="leaderboard-card" role="region" aria-label="Tabel Papan Peringkat">' +
          '<div class="leaderboard-card-header">' +
            '<div class="segmented leaderboard-tabs" role="tablist" aria-label="Periode">' +
              tab('all-time', 'Sepanjang Waktu') + tab('weekly', 'Mingguan') + tab('monthly', 'Bulanan') +
            '</div>' +
            '<div class="leaderboard-filters-row">' +
              '<div class="leaderboard-chips-group" role="group" aria-label="Filter Unit Kerja">' +
                '<span class="lb-filter-label">Unit:</span>' +
                chip('Semua') + chip('Biro SDM') +
              '</div>' +
            '</div>' +
            '<button type="button" class="btn btn--secondary lb-refresh-btn" id="lb-refresh-btn" title="Segarkan data" aria-label="Segarkan data">' +
              icon('refresh') + '<span>Segarkan</span>' +
            '</button>' +
          '</div>' +
          '<div class="leaderboard-body">' +
            '<div class="leaderboard-podium-wrap" id="leaderboard-podium-wrap" aria-label="Tiga besar"></div>' +
            '<div class="leaderboard-list-col">' +
              '<div class="leaderboard-list-wrap" id="leaderboard-list-wrap">' +
                // Populated dynamically by renderList()
              '</div>' +
              '<div class="leaderboard-pinned-wrap" id="leaderboard-pinned-wrap" style="display: none;">' +
                // Pinned row for current user if outside visible list
              '</div>' +
            '</div>' +
          '</div>' +
        '</div>' +
      '</div>';

    html += '</div>';

    this.container.innerHTML = html;
    this.bindEvents();
  },

  bindEvents() {
    if (!this.container) return;

    // Back button
    Hud.bindLeftCardEvents(this.container, () => {
      if (window.history.length > 1) {
        window.history.back();
      } else {
        window.location.hash = Router.getPreviousHash();
      }
    });

    // Tab buttons
    const tabBtns = this.container.querySelectorAll('.lb-tab-btn');
    tabBtns.forEach((btn) => {
      btn.addEventListener('click', (e) => {
        e.preventDefault();
        const tab = btn.getAttribute('data-tab');
        if (tab && tab !== this.activeTab) {
          this.activeTab = tab;
          tabBtns.forEach((b) => {
            b.classList.remove('is-active');
            b.setAttribute('aria-selected', 'false');
          });
          btn.classList.add('is-active');
          btn.setAttribute('aria-selected', 'true');
          this.loadData();
        }
      });
    });

    // Refresh button
    const refreshBtn = this.container.querySelector('#lb-refresh-btn');
    if (refreshBtn) {
      refreshBtn.addEventListener('click', (e) => {
        e.preventDefault();
        this.loadData(true);
      });
    }

    // Filter chips
    const chipBtns = this.container.querySelectorAll('.lb-chip-btn');
    chipBtns.forEach((btn) => {
      btn.addEventListener('click', (e) => {
        e.preventDefault();
        const unit = btn.getAttribute('data-unit');
        if (unit && unit !== this.activeUnitFilter) {
          this.activeUnitFilter = unit;
          chipBtns.forEach((b) => {
            b.classList.remove('is-active');
            b.setAttribute('aria-pressed', 'false');
          });
          btn.classList.add('is-active');
          btn.setAttribute('aria-pressed', 'true');
          this.renderList();
        }
      });
    });
  },

  getPeriodXp(user) {
    if (!user) return 0;
    if (this.activeTab === 'weekly') {
      return typeof user.xpWeek === 'number' ? user.xpWeek : 0;
    }
    if (this.activeTab === 'monthly') {
      return typeof user.xpMonth === 'number' ? user.xpMonth : 0;
    }
    return typeof user.xp === 'number' ? user.xp : 0;
  },

  renderList() {
    if (!this.container) return;
    const listWrap = this.container.querySelector('#leaderboard-list-wrap');
    const pinnedWrap = this.container.querySelector('#leaderboard-pinned-wrap');
    const podiumWrap = this.container.querySelector('#leaderboard-podium-wrap');
    const body = this.container.querySelector('.leaderboard-body');
    const refreshBtn = this.container.querySelector('#lb-refresh-btn');
    if (!listWrap) return;

    // Refresh button spinner state (presentation only)
    if (refreshBtn) {
      refreshBtn.setAttribute('aria-busy', String(Boolean(this.isLoading)));
      refreshBtn.classList.toggle('is-busy', Boolean(this.isLoading));
    }
    const setPodium = (html) => {
      if (podiumWrap) podiumWrap.innerHTML = html;
      if (body) body.classList.toggle('has-podium', Boolean(html));
    };

    if (this.isLoading) {
      setPodium('');
      listWrap.innerHTML = '<div class="leaderboard-loading">' + icon('spinner', { className: 'spin' }) + 'Memuat papan peringkat...</div>';
      if (pinnedWrap) pinnedWrap.style.display = 'none';
      return;
    }

    if (this.error) {
      setPodium('');
      listWrap.innerHTML = '<div class="leaderboard-empty-state is-error">' + icon('alert', { size: 'l' }) +
        '<div class="empty-text">' + escapeHtml(this.error) + '</div></div>';
      if (pinnedWrap) pinnedWrap.style.display = 'none';
      return;
    }

    // Filter and sort users
    const filtered = filterUsersByUnit(this.users, this.activeUnitFilter);
    const sorted = sortLeaderboardUsers(filtered, this.activeTab);

    // Filter only users who have earned XP in this period
    const activeScorers = sorted.filter((u) => this.getPeriodXp(u) > 0);

    if (activeScorers.length === 0) {
      setPodium('');
      listWrap.innerHTML = '' +
        '<div class="leaderboard-empty-state">' +
          EMPTY_ILLUSTRATION +
          '<div class="empty-text">Belum ada XP periode ini. Selesaikan quest untuk masuk papan peringkat!</div>' +
        '</div>';
      if (pinnedWrap) pinnedWrap.style.display = 'none';
      return;
    }

    const currentUid = auth.currentUser ? auth.currentUser.uid : null;
    let currentUserInList = false;


    // Podium: ranks 1-3 in DOM (reading) order; CSS order shows them as 2-1-3
    const VISUAL_ORDER = [1, 0, 2]; // flex order for rank 1, 2, 3
    let podiumHtml = '<ol class="lb-podium" aria-label="Tiga besar">';
    for (let idx = 0; idx < 3; idx++) {
      const p = VISUAL_ORDER[idx];
      const rank = idx + 1;
      const u = activeScorers[idx];
      if (!u) {
        podiumHtml += '<li class="lb-podium-slot rank-' + rank + ' is-empty" aria-hidden="true" style="order:' + p + '">' +
          '<div class="lb-podium-step"><span class="lb-podium-num">' + rank + '</span></div></li>';
        continue;
      }
      const isCurrentUser = Boolean(currentUid && u.uid === currentUid);
      if (isCurrentUser) currentUserInList = true;
      const name = escapeHtml(u.displayName || 'Pegawai BPS');
      podiumHtml += '' +
        '<li class="lb-podium-slot rank-' + rank + (isCurrentUser ? ' is-current-user' : '') + '" style="order:' + p + '">' +
          '<div class="lb-podium-person">' +
            '<span class="lb-avatar lb-avatar--lg" aria-hidden="true">' + escapeHtml(initialsOf(u.displayName || 'Pegawai BPS')) +
              '<span class="rank-medal rank-' + rank + '">' + rank + '</span>' +
            '</span>' +
            '<span class="lb-podium-name" title="' + name + '">' + name + '</span>' +
            (isCurrentUser ? '<span class="lb-you-tag">Kamu</span>' : '') +
            '<span class="xp-badge">' + icon('coin') + '+' + this.getPeriodXp(u) + ' XP</span>' +
            '<span class="visually-hidden">Peringkat ' + rank + ', Level ' + (typeof u.level === 'number' ? u.level : 1) + ', ' + escapeHtml(unitLabel(u.unit)) + '</span>' +
          '</div>' +
          '<div class="lb-podium-step" aria-hidden="true"><span class="lb-podium-num">' + rank + '</span></div>' +
        '</li>';
    }
    podiumHtml += '</ol>';
    setPodium(podiumHtml);

    // List: rank 4 and below
    let rowsHtml = '<ol class="leaderboard-table" start="4">';
    activeScorers.forEach((u, idx) => {
      const rank = idx + 1;
      if (rank <= 3) return;
      const isCurrentUser = Boolean(currentUid && u.uid === currentUid);
      if (isCurrentUser) currentUserInList = true;
      rowsHtml += this.renderRowHtml({
        rank: String(rank),
        name: u.displayName || 'Pegawai BPS',
        unit: unitLabel(u.unit),
        level: typeof u.level === 'number' ? u.level : 1,
        xp: this.getPeriodXp(u),
        isCurrentUser,
        tag: 'li'
      });
    });
    rowsHtml += '</ol>';
    listWrap.innerHTML = activeScorers.length > 3
      ? rowsHtml
      : '<div class="leaderboard-list-note">' + icon('trophy') + 'Baru ' + activeScorers.length + ' pegawai di papan peringkat periode ini.</div>';

    // Check if current user should be pinned at the bottom
    if (pinnedWrap) {
      if (currentUid && !currentUserInList && AppState.player) {
        const player = AppState.player;

        // Determine if user has a rank in the broader unfiltered/all list
        let myOverallRank = '-';
        const rankIdx = sortLeaderboardUsers(this.users, this.activeTab).findIndex((u) => u.uid === currentUid);
        if (rankIdx !== -1) {
          myOverallRank = String(rankIdx + 1);
        }

        pinnedWrap.style.display = 'block';
        pinnedWrap.innerHTML = this.renderRowHtml({
          rank: myOverallRank,
          name: player.displayName || 'Pegawai BPS',
          unit: unitLabel(player.unit) + ' · Di luar daftar terlihat',
          level: player.level || 1,
          xp: this.getPeriodXp(ownPeriodStats(AppState.user)),
          isCurrentUser: true,
          pinned: true,
          tag: 'div'
        });
      } else {
        pinnedWrap.style.display = 'none';
        pinnedWrap.innerHTML = '';
      }
    }
  },

  // One leaderboard row. All text values are escaped here.
  renderRowHtml(row) {
    const name = escapeHtml(row.name);
    const tag = row.tag || 'div';
    return '' +
      '<' + tag + ' class="' + (row.pinned ? 'leaderboard-pinned-row' : 'leaderboard-row') + (row.isCurrentUser ? ' is-current-user' : '') + '">' +
        '<div class="lb-col-rank"><span class="rank-medal" aria-label="Peringkat ' + escapeHtml(row.rank) + '">' + escapeHtml(row.rank) + '</span></div>' +
        '<div class="lb-col-avatar"><span class="lb-avatar" aria-hidden="true">' + escapeHtml(initialsOf(row.name)) + '</span></div>' +
        '<div class="lb-col-user">' +
          '<div class="lb-user-name" title="' + name + '"><span class="lb-user-name-text">' + name + '</span>' +
            (row.isCurrentUser ? '<span class="lb-you-tag">Kamu</span>' : '') + '</div>' +
          '<div class="lb-user-unit">' + escapeHtml(row.unit) + '</div>' +
        '</div>' +
        '<div class="lb-col-level"><span class="tag lb-level-chip">Level ' + escapeHtml(String(row.level)) + '</span></div>' +
        '<div class="lb-col-xp"><span class="xp-badge lb-xp-badge">' + icon('coin') + '+' + escapeHtml(String(row.xp)) + ' XP</span></div>' +
      '</' + tag + '>';
  }
};

export default LeaderboardScreen;

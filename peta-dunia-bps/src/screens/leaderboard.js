// Screen 4: Leaderboard Screen (#/leaderboard)
import { AppState } from '../state/index.js';
import { Hud, icons } from '../ui/hud.js';
import { auth } from '../firebase/client.js';
import { Router } from '../router.js';
import {
  fetchLeaderboard,
  sortLeaderboardUsers,
  filterUsersByUnit
} from '../firebase/leaderboard.js';

let unsubscribeState = null;

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
    html += '' +
      '<div class="leaderboard-card-container">' +
        '<div class="leaderboard-card" role="region" aria-label="Tabel Papan Peringkat">' +
          '<div class="leaderboard-card-header">' +
            '<div class="leaderboard-tabs" role="tablist">' +
              '<button type="button" class="lb-tab-btn' + (this.activeTab === 'all-time' ? ' is-active' : '') + '" data-tab="all-time" role="tab" aria-selected="' + (this.activeTab === 'all-time') + '">Sepanjang Waktu</button>' +
              '<button type="button" class="lb-tab-btn' + (this.activeTab === 'weekly' ? ' is-active' : '') + '" data-tab="weekly" role="tab" aria-selected="' + (this.activeTab === 'weekly') + '">Mingguan</button>' +
              '<button type="button" class="lb-tab-btn' + (this.activeTab === 'monthly' ? ' is-active' : '') + '" data-tab="monthly" role="tab" aria-selected="' + (this.activeTab === 'monthly') + '">Bulanan</button>' +
            '</div>' +
            '<button type="button" class="lb-refresh-btn" id="lb-refresh-btn" title="Segarkan data" aria-label="Segarkan data">' +
              '<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><polyline points="23 4 23 10 17 10"></polyline><polyline points="1 20 1 14 7 14"></polyline><path d="M3.51 9a9 9 0 0 1 14.85-3.36L23 10M1 14l4.64 4.36A9 9 0 0 0 20.49 15"></path></svg>' +
              '<span>Segarkan</span>' +
            '</button>' +
          '</div>' +
          '<div class="leaderboard-filters-row">' +
            '<div class="leaderboard-chips-group" role="group" aria-label="Filter Unit Kerja">' +
              '<span class="lb-filter-label">Filter Unit:</span>' +
              '<button type="button" class="lb-chip-btn' + (this.activeUnitFilter === 'Semua' ? ' is-active' : '') + '" data-unit="Semua">Semua</button>' +
              '<button type="button" class="lb-chip-btn' + (this.activeUnitFilter === 'Biro SDM' ? ' is-active' : '') + '" data-unit="Biro SDM">Biro SDM</button>' +
            '</div>' +
          '</div>' +
          '<div class="leaderboard-list-wrap" id="leaderboard-list-wrap">' +
            // Populated dynamically by renderList()
          '</div>' +
          '<div class="leaderboard-pinned-wrap" id="leaderboard-pinned-wrap" style="display: none;">' +
            // Pinned row for current user if outside visible list
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
          chipBtns.forEach((b) => b.classList.remove('is-active'));
          btn.classList.add('is-active');
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
    if (!listWrap) return;

    if (this.isLoading) {
      listWrap.innerHTML = '<div class="leaderboard-loading">Memuat papan peringkat...</div>';
      if (pinnedWrap) pinnedWrap.style.display = 'none';
      return;
    }

    if (this.error) {
      listWrap.innerHTML = '<div class="leaderboard-empty-state" style="color: #EF4444;">' + this.error + '</div>';
      if (pinnedWrap) pinnedWrap.style.display = 'none';
      return;
    }

    // Filter and sort users
    const filtered = filterUsersByUnit(this.users, this.activeUnitFilter);
    const sorted = sortLeaderboardUsers(filtered, this.activeTab);

    // Filter only users who have earned XP in this period
    const activeScorers = sorted.filter((u) => this.getPeriodXp(u) > 0);

    if (activeScorers.length === 0) {
      listWrap.innerHTML = '' +
        '<div class="leaderboard-empty-state">' +
          '<div class="empty-icon" aria-hidden="true">&#127942;</div>' +
          '<div class="empty-text">Belum ada XP periode ini. Selesaikan quest untuk masuk papan peringkat!</div>' +
        '</div>';
      if (pinnedWrap) pinnedWrap.style.display = 'none';
      return;
    }

    const currentUid = auth.currentUser ? auth.currentUser.uid : null;
    let currentUserInList = false;

    let rowsHtml = '<div class="leaderboard-table">';
    activeScorers.forEach((u, idx) => {
      const rank = idx + 1;
      const isCurrentUser = Boolean(currentUid && u.uid === currentUid);
      if (isCurrentUser) currentUserInList = true;

      const periodXp = this.getPeriodXp(u);
      const level = typeof u.level === 'number' ? u.level : 1;
      const unitLabel = u.unit === 'biro-sdm' ? 'Biro SDM' : (u.unit === 'biro-umum' ? 'Biro Umum' : (u.unit || 'BPS'));

      let rankBadgeHtml = '';
      if (rank === 1) {
        rankBadgeHtml = '<span class="rank-badge rank-1" aria-label="Peringkat 1">&#129351; 1</span>';
      } else if (rank === 2) {
        rankBadgeHtml = '<span class="rank-badge rank-2" aria-label="Peringkat 2">&#129352; 2</span>';
      } else if (rank === 3) {
        rankBadgeHtml = '<span class="rank-badge rank-3" aria-label="Peringkat 3">&#129353; 3</span>';
      } else {
        rankBadgeHtml = '<span class="rank-badge rank-num">' + rank + '</span>';
      }

      rowsHtml += '' +
        '<div class="leaderboard-row' + (isCurrentUser ? ' is-current-user' : '') + '">' +
          '<div class="lb-col-rank">' + rankBadgeHtml + '</div>' +
          '<div class="lb-col-avatar">' + icons.avatar + '</div>' +
          '<div class="lb-col-user">' +
            '<div class="lb-user-name">' + (u.displayName || 'Pegawai BPS') + (isCurrentUser ? ' <span class="lb-you-tag">(Kamu)</span>' : '') + '</div>' +
            '<div class="lb-user-unit">' + unitLabel + '</div>' +
          '</div>' +
          '<div class="lb-col-level">' +
            '<span class="lb-level-chip">Level ' + level + '</span>' +
          '</div>' +
          '<div class="lb-col-xp">' +
            '<span class="lb-xp-badge">+' + periodXp + ' XP</span>' +
          '</div>' +
        '</div>';
    });
    rowsHtml += '</div>';

    listWrap.innerHTML = rowsHtml;

    // Check if current user should be pinned at the bottom
    if (pinnedWrap) {
      if (currentUid && !currentUserInList && AppState.player) {
        const player = AppState.player;
        const myPeriodXp = this.getPeriodXp(player);
        const myLevel = player.level || 1;
        const myUnit = player.unit === 'biro-sdm' ? 'Biro SDM' : (player.unit === 'biro-umum' ? 'Biro Umum' : (player.unit || 'BPS'));

        // Determine if user has a rank in the broader unfiltered/all list
        let myOverallRank = '-';
        const rankIdx = sortLeaderboardUsers(this.users, this.activeTab).findIndex((u) => u.uid === currentUid);
        if (rankIdx !== -1) {
          myOverallRank = String(rankIdx + 1);
        }

        pinnedWrap.style.display = 'block';
        pinnedWrap.innerHTML = '' +
          '<div class="leaderboard-pinned-row is-current-user">' +
            '<div class="lb-col-rank"><span class="rank-badge rank-num">' + myOverallRank + '</span></div>' +
            '<div class="lb-col-avatar">' + icons.avatar + '</div>' +
            '<div class="lb-col-user">' +
              '<div class="lb-user-name">' + (player.displayName || 'Pegawai BPS') + ' <span class="lb-you-tag">(Kamu)</span></div>' +
              '<div class="lb-user-unit">' + myUnit + ' · Di luar daftar terlihat</div>' +
            '</div>' +
            '<div class="lb-col-level"><span class="lb-level-chip">Level ' + myLevel + '</span></div>' +
            '<div class="lb-col-xp"><span class="lb-xp-badge">+' + myPeriodXp + ' XP</span></div>' +
          '</div>';
      } else {
        pinnedWrap.style.display = 'none';
        pinnedWrap.innerHTML = '';
      }
    }
  }
};

export default LeaderboardScreen;

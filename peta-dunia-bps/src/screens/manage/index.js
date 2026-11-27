// Screen 5: Management Center (#/manage)
import { AppState } from '../../state/index.js';
import { getRoleLabel, isHeadRole, isSuperAdminRole } from '../../config.js';
import { loadUnits, getCachedUnits } from '../../firebase/units.js';
import { Hud } from '../../ui/hud.js';
import { escapeHtml } from '../../ui/escape.js';
import { renderQuestsTab } from './quests.js';
import { renderTeamTab } from './team.js';
import { renderContentTab } from './content.js';
import { renderAccountsTab } from './accounts.js';
import { renderStructureTab } from './structure.js';

let unsubscribeState = null;

export function openConfirmDialog(parentEl, message, confirmLabel = 'Ya, Lanjutkan') {
  return new Promise((resolve) => {
    const existing = parentEl.querySelector('.manage-confirm-backdrop');
    if (existing) existing.remove();

    const backdrop = document.createElement('div');
    backdrop.className = 'manage-confirm-backdrop';
    backdrop.setAttribute('role', 'dialog');
    backdrop.setAttribute('aria-modal', 'true');
    backdrop.setAttribute('aria-label', 'Konfirmasi Tindakan');

    backdrop.innerHTML = '' +
      '<div class="manage-confirm-box">' +
        '<p class="manage-confirm-msg">' + escapeHtml(message) + '</p>' +
        '<div class="manage-confirm-actions">' +
          '<button type="button" class="manage-btn manage-btn-secondary" id="mc-cancel">Batal</button>' +
          '<button type="button" class="manage-btn manage-btn-danger" id="mc-ok">' + escapeHtml(confirmLabel) + '</button>' +
        '</div>' +
      '</div>';

    parentEl.appendChild(backdrop);

    const cancelBtn = backdrop.querySelector('#mc-cancel');
    const okBtn = backdrop.querySelector('#mc-ok');

    const cleanup = (result) => {
      window.removeEventListener('keydown', onKeyDown);
      backdrop.remove();
      resolve(result);
    };

    const onKeyDown = (e) => {
      if (e.key === 'Escape') {
        e.preventDefault();
        cleanup(false);
      }
    };

    window.addEventListener('keydown', onKeyDown);
    cancelBtn.addEventListener('click', () => cleanup(false));
    okBtn.addEventListener('click', () => cleanup(true));
    backdrop.addEventListener('click', (e) => {
      if (e.target === backdrop) cleanup(false);
    });
    okBtn.focus();
  });
}

export const ManageScreen = {
  mount(container) {
    this.container = container;
    this.mounted = true;
    this.activeTab = 'quests';
    this.units = getCachedUnits();

    const role = AppState.player.role;
    if (!AppState.user || AppState.player.active === false || (!isHeadRole(role) && !isSuperAdminRole(role))) {
      window.location.hash = '#/world';
      return;
    }

    this.render();

    loadUnits().then((units) => {
      if (!this.mounted || !this.container) return;
      this.units = units;
      this.renderTabBody();
    });

    unsubscribeState = AppState.subscribe(() => {
      const currRole = AppState.player.role;
      if (!AppState.user || AppState.player.active === false || (!isHeadRole(currRole) && !isSuperAdminRole(currRole))) {
        window.location.hash = '#/world';
        return;
      }
      this.updateHud();
    });
  },

  unmount() {
    this.mounted = false;
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

  getTabs() {
    const isSuper = isSuperAdminRole(AppState.player.role);
    const tabs = [
      { id: 'quests', label: 'Quest' },
      { id: 'team', label: 'Tim Saya' },
      { id: 'content', label: 'Konten Unit' }
    ];
    if (isSuper) {
      tabs.push({ id: 'accounts', label: 'Akun' });
      tabs.push({ id: 'structure', label: 'Struktur' });
    }
    return tabs;
  },

  render() {
    const unitObj = this.units.find((u) => u.id === AppState.player.unit);
    const unitLabel = unitObj ? (unitObj.shortName || unitObj.name) : AppState.player.unit;
    const tabs = this.getTabs();

    if (!tabs.some((t) => t.id === this.activeTab)) {
      this.activeTab = 'quests';
    }

    const tabsHtml = tabs.map((tab) => (
      '<button type="button" class="lb-tab-btn manage-tab-btn' +
      (this.activeTab === tab.id ? ' is-active' : '') +
      '" data-tab="' + escapeHtml(tab.id) + '" role="tab" aria-selected="' +
      (this.activeTab === tab.id ? 'true' : 'false') + '">' +
      escapeHtml(tab.label) +
      '</button>'
    )).join('');

    this.container.innerHTML = '' +
      '<div class="screen screen-manage">' +
        '<div class="hud-left-wrapper">' +
          Hud.renderLeftCard({
            title: 'Pusat Pengelolaan',
            subtitle: `${getRoleLabel(AppState.player.role)} · ${unitLabel}`,
            hasBack: true
          }) +
        '</div>' +
        '<div class="hud-right-wrapper">' +
          Hud.renderRightCard(AppState) +
        '</div>' +
        '<div class="manage-card-container">' +
          '<div class="manage-card">' +
            '<div class="manage-tabs-bar" role="tablist" aria-label="Menu Pengelolaan">' +
              tabsHtml +
            '</div>' +
            '<div class="manage-tab-body" id="manage-tab-body" role="tabpanel"></div>' +
          '</div>' +
        '</div>' +
      '</div>';

    Hud.bindLeftCardEvents(this.container, () => {
      window.location.hash = '#/world';
    });

    const tabBtns = this.container.querySelectorAll('.manage-tab-btn');
    for (let i = 0; i < tabBtns.length; i++) {
      tabBtns[i].addEventListener('click', (e) => {
        const nextTab = e.currentTarget.getAttribute('data-tab');
        if (nextTab && nextTab !== this.activeTab) {
          this.activeTab = nextTab;
          this.updateTabButtons();
          this.renderTabBody();
        }
      });
    }

    this.renderTabBody();
  },

  updateTabButtons() {
    const tabBtns = this.container.querySelectorAll('.manage-tab-btn');
    for (let i = 0; i < tabBtns.length; i++) {
      const btn = tabBtns[i];
      const isSelected = btn.getAttribute('data-tab') === this.activeTab;
      btn.classList.toggle('is-active', isSelected);
      btn.setAttribute('aria-selected', isSelected ? 'true' : 'false');
    }
  },

  renderTabBody() {
    const bodyEl = this.container ? this.container.querySelector('#manage-tab-body') : null;
    if (!bodyEl) return;

    const ctx = {
      screenEl: this.container,
      getUnits: () => this.units,
      setUnits: (units) => {
        this.units = units;
      },
      confirm: (msg, label) => openConfirmDialog(this.container, msg, label)
    };

    switch (this.activeTab) {
      case 'quests':
        renderQuestsTab(bodyEl, ctx);
        break;
      case 'team':
        renderTeamTab(bodyEl, ctx);
        break;
      case 'content':
        renderContentTab(bodyEl, ctx);
        break;
      case 'accounts':
        if (isSuperAdminRole(AppState.player.role)) {
          renderAccountsTab(bodyEl, ctx);
        }
        break;
      case 'structure':
        if (isSuperAdminRole(AppState.player.role)) {
          renderStructureTab(bodyEl, ctx);
        }
        break;
      default:
        renderQuestsTab(bodyEl, ctx);
    }
  }
};

export default ManageScreen;

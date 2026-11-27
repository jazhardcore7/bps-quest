// Screen 2: Data-driven Island Screen (#/island/<islandId>)
import { AppState } from '../state/index.js';
import { BpsData } from '../data/index.js';
import { toUnitId } from '../config.js';
import { loadUnits, getCachedUnits, deriveIslandTiles } from '../firebase/units.js';
import { Hud } from '../ui/hud.js';
import { openInfoPanel } from '../ui/panel.js';
import { escapeHtml } from '../ui/escape.js';
import { renderBigIslandSVG } from '../ui/island-art.js';

let unsubscribeState = null;

export const IslandScreen = {
  mount(container, params = {}) {
    this.container = container;
    this.islandId = params.islandId || 'sestama';
    this.mounted = true;
    this.units = getCachedUnits();

    this.render();

    loadUnits().then((units) => {
      if (!this.mounted || !this.container) return;
      this.units = units;
      this.render();
    });

    unsubscribeState = AppState.subscribe(() => {
      this.updateTiles();
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
    const hudRightContainer = this.container.querySelector('.hud-right-wrapper');
    if (hudRightContainer) {
      hudRightContainer.innerHTML = Hud.renderRightCard(AppState);
    }
  },

  updateTiles() {
    if (!this.container) return;
    const currentUnitId = toUnitId(AppState.currentUnit);
    const tiles = this.container.querySelectorAll('.biro-tile');

    for (let i = 0; i < tiles.length; i++) {
      const tile = tiles[i];
      const unitId = tile.getAttribute('data-id');
      const label = tile.getAttribute('data-label') || unitId;
      const isCurrent = (unitId === currentUnitId);
      const pillText = tile.querySelector('.biro-pill-text');

      if (pillText) {
        pillText.textContent = isCurrent ? (label + ' · Biro Anda') : label;
      }

      if (isCurrent) {
        tile.classList.add('is-current-unit');
      } else {
        tile.classList.remove('is-current-unit');
      }
    }
  },

  render() {
    const islandMeta = BpsData.islands.find((item) => item.id === this.islandId) || {
      id: this.islandId,
      label: this.islandId,
      blockColor: 'var(--color-sestama-block)',
      pillColor: 'var(--pill-fix-sestama)'
    };

    const { rootUnit, tiles } = deriveIslandTiles(this.units, this.islandId);
    const currentUnitId = toUnitId(AppState.currentUnit);

    let html = '<div class="screen screen-island">';

    // Left HUD Card with Back Button & unit count
    html += '<div class="hud-left-wrapper">';
    html += Hud.renderLeftCard({
      title: islandMeta.label,
      subtitle: `${islandMeta.label} · ${tiles.length} unit`,
      hasBack: true
    });
    html += '</div>';

    // Right HUD Card
    html += '<div class="hud-right-wrapper">';
    html += Hud.renderRightCard(AppState);
    html += '</div>';

    // Large Island Oval (rect: 70, 110, 820, 420)
    html += '<div class="island-main-oval" style="left: 70px; top: 110px; width: 820px; height: 420px;" role="region" aria-label="Pulau ' + escapeHtml(islandMeta.label) + '">';
    html += renderBigIslandSVG(this.islandId, 820, 420);
    html += '<div class="biro-tiles-grid">';

    for (let i = 0; i < tiles.length; i++) {
      const unit = tiles[i];
      const isRoot = Boolean(rootUnit && unit.id === rootUnit.id);
      html += this.renderUnitTileHtml(unit, currentUnitId, islandMeta, isRoot);
    }

    html += '</div>'; // .biro-tiles-grid
    html += '</div>'; // .island-main-oval
    html += '</div>'; // .screen-island

    this.container.innerHTML = html;
    this.bindEvents();
  },

  renderUnitTileHtml(unit, currentUnitId, islandMeta, isRoot) {
    const label = unit.shortName || unit.name || unit.id;
    const fullName = unit.name || label;
    const isCurrent = (unit.id === currentUnitId);
    const isOfficeUnit = (unit.id === 'biro-sdm');

    // Roof color only (the Office grammar keeps walls pastel)
    let roofColor = 'var(--color-biro-block)';
    if (isRoot) {
      roofColor = islandMeta.blockColor || 'var(--color-sestama-block)';
    } else if (isOfficeUnit) {
      roofColor = 'var(--color-sestama-block)';
    }

    const displayText = isCurrent ? (label + ' · Biro Anda') : label;

    return '' +
      '<button type="button" class="biro-tile tile-v2' +
        (isCurrent ? ' is-current-unit' : '') +
        (isRoot ? ' is-island-root' : '') +
        (isOfficeUnit ? ' is-office-unit' : '') + '" ' +
        'data-id="' + escapeHtml(unit.id) + '" ' +
        'data-label="' + escapeHtml(label) + '" ' +
        'title="' + escapeHtml(fullName) + '" ' +
        'aria-label="' + escapeHtml(displayText) + '">' +
        '<div class="biro-building-block" style="--tile-roof: ' + escapeHtml(roofColor) + ';">' +
          '<div class="biro-building-roof"></div>' +
          '<div class="biro-windows">' +
            '<span class="b-win"></span><span class="b-win"></span>' +
            '<span class="b-win"></span><span class="b-win"></span>' +
          '</div>' +
          '<div class="biro-door"></div>' +
        '</div>' +
        '<div class="biro-pill">' +
          '<span class="biro-pill-text">' + escapeHtml(displayText) + '</span>' +
        '</div>' +
      '</button>';
  },

  bindEvents() {
    Hud.bindLeftCardEvents(this.container, () => {
      window.location.hash = '#/world';
    });

    const tiles = this.container.querySelectorAll('.biro-tile');
    for (let i = 0; i < tiles.length; i++) {
      tiles[i].addEventListener('click', function (e) {
        e.preventDefault();
        const unitId = this.getAttribute('data-id');
        if (unitId === 'biro-sdm') {
          window.location.hash = '#/office';
        } else if (unitId) {
          openInfoPanel(unitId);
        }
      });
    }
  }
};

export default IslandScreen;

// Screen 2: Island "Sekretariat Utama" (#/island)
(function (window) {
  'use strict';

  var unsubscribeState = null;

  var IslandScreen = {
    mount: function (container) {
      this.container = container;
      this.render();

      var self = this;
      unsubscribeState = window.AppState.subscribe(function () {
        self.updateTiles();
        self.updateHud();
      });
    },

    unmount: function () {
      if (typeof unsubscribeState === 'function') {
        unsubscribeState();
        unsubscribeState = null;
      }
      if (this.container) {
        this.container.innerHTML = '';
      }
    },

    updateHud: function () {
      var hudRightContainer = this.container.querySelector('.hud-right-wrapper');
      if (hudRightContainer) {
        hudRightContainer.innerHTML = window.Hud.renderRightCard(window.AppState);
      }
    },

    // Updates the biro tiles dynamically when AppState.currentUnit changes
    updateTiles: function () {
      var currentUnit = window.AppState.currentUnit;
      var tiles = this.container.querySelectorAll('.biro-tile');

      for (var i = 0; i < tiles.length; i++) {
        var tile = tiles[i];
        var name = tile.getAttribute('data-name');
        var isCurrent = (name === currentUnit);
        var isSdm = (name === 'Biro SDM');

        var block = tile.querySelector('.biro-building-block');
        var pill = tile.querySelector('.biro-pill');
        var pillText = tile.querySelector('.biro-pill-text');

        // Dynamic border: gold if currentUnit or Biro SDM
        if (isCurrent || isSdm) {
          block.style.borderColor = '#FFD24A';
        } else {
          block.style.borderColor = '#FFFFFF';
        }

        // Dynamic pill text: append "· Biro Anda" if matches currentUnit
        if (pillText) {
          if (isCurrent) {
            pillText.textContent = name + ' · Biro Anda';
          } else {
            pillText.textContent = name;
          }
        }

        if (isCurrent) {
          tile.classList.add('is-current-unit');
        } else {
          tile.classList.remove('is-current-unit');
        }
      }
    },

    render: function () {
      var html = '<div class="screen screen-island">';

      // Left HUD Card with Back Button
      html += '<div class="hud-left-wrapper">';
      html += window.Hud.renderLeftCard({
        title: 'Sekretariat Utama',
        subtitle: 'Sekretariat Utama · 7 biro',
        hasBack: true
      });
      html += '</div>';

      // Right HUD Card
      html += '<div class="hud-right-wrapper">';
      html += window.Hud.renderRightCard(window.AppState);
      html += '</div>';

      // Large Island Oval (rect: 70, 110, 820, 420)
      html += '<div class="island-main-oval" style="left: 70px; top: 110px; width: 820px; height: 420px;" role="region" aria-label="Pulau Sekretariat Utama">';

      // Biro tiles flex container
      html += '<div class="biro-tiles-layout">';

      var biros = window.BpsData.biros;
      var currentUnit = window.AppState.currentUnit;

      // Row 1: 4 biro tiles
      html += '<div class="biro-row biro-row-1">';
      for (var i = 0; i < 4 && i < biros.length; i++) {
        html += this.renderBiroTileHtml(biros[i], currentUnit);
      }
      html += '</div>';

      // Row 2: 3 biro tiles
      html += '<div class="biro-row biro-row-2">';
      for (var j = 4; j < biros.length; j++) {
        html += this.renderBiroTileHtml(biros[j], currentUnit);
      }
      html += '</div>';

      html += '</div>'; // .biro-tiles-layout
      html += '</div>'; // .island-main-oval
      html += '</div>'; // .screen-island

      this.container.innerHTML = html;
      this.bindEvents();
    },

    renderBiroTileHtml: function (biro, currentUnit) {
      var name = biro.name;
      var isCurrent = (name === currentUnit);
      var isSdm = (name === 'Biro SDM');

      // Biro SDM: block #4CB8A0, border #FFD24A, pill #1F8A70
      // Others: block #6FA8DC, border #FFFFFF, pill #1C4FA0
      // If matches currentUnit: border #FFD24A, pill text "<name> · Biro Anda"
      var blockColor = isSdm ? '#4CB8A0' : '#6FA8DC';
      var borderColor = (isCurrent || isSdm) ? '#FFD24A' : '#FFFFFF';
      var pillColor = isSdm ? '#1F8A70' : '#1C4FA0';
      var displayText = isCurrent ? (name + ' · Biro Anda') : name;

      return '' +
        '<button type="button" class="biro-tile' + (isCurrent ? ' is-current-unit' : '') + '" ' +
          'data-id="' + biro.id + '" ' +
          'data-name="' + name + '" ' +
          'aria-label="' + displayText + '">' +
          // Building block: 62x70
          '<div class="biro-building-block" style="background-color: ' + blockColor + '; border-color: ' + borderColor + ';">' +
            '<div class="biro-building-roof"></div>' +
            '<div class="biro-windows">' +
              '<span class="b-win"></span><span class="b-win"></span>' +
              '<span class="b-win"></span><span class="b-win"></span>' +
            '</div>' +
            '<div class="biro-door"></div>' +
          '</div>' +
          // Pill below
          '<div class="biro-pill" style="background-color: ' + pillColor + ';">' +
            '<span class="biro-pill-text">' + displayText + '</span>' +
          '</div>' +
        '</button>';
    },

    bindEvents: function () {
      var self = this;

      // Bind HUD back button
      window.Hud.bindLeftCardEvents(this.container, function () {
        window.location.hash = '#/world';
      });

      // Bind Biro tile clicks
      var tiles = this.container.querySelectorAll('.biro-tile');
      for (var i = 0; i < tiles.length; i++) {
        tiles[i].addEventListener('click', function (e) {
          e.preventDefault();
          var name = this.getAttribute('data-name');
          if (name === 'Biro SDM') {
            window.location.hash = '#/office';
          } else {
            window.Hud.showToast('Peta kantor belum tersedia di prototype', 2000);
          }
        });
      }
    }
  };

  window.IslandScreen = IslandScreen;
})(window);


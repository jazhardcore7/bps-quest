// Screen 1: World Map (#/world)
(function (window) {
  'use strict';

  var unsubscribeState = null;

  var WorldScreen = {
    mount: function (container) {
      this.container = container;
      this.render();

      // Subscribe to state updates (e.g., player XP or level changes)
      var self = this;
      unsubscribeState = window.AppState.subscribe(function () {
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

    render: function () {
      var html = '<div class="screen screen-world">';

      // Left HUD Card
      html += '<div class="hud-left-wrapper">';
      html += window.Hud.renderLeftCard({
        title: 'Peta Dunia BPS',
        subtitle: 'Jelajahi seluruh pulau unit kerja di BPS',
        hasBack: false
      });
      html += '</div>';

      // Right HUD Card
      html += '<div class="hud-right-wrapper">';
      html += window.Hud.renderRightCard(window.AppState);
      html += '</div>';

      // Islands Container
      html += '<div class="world-islands" role="region" aria-label="Daftar Pulau Unit Kerja">';

      var islands = window.BpsData.islands;
      for (var i = 0; i < islands.length; i++) {
        var island = islands[i];
        var left = island.rect[0];
        var top = island.rect[1];
        var width = island.rect[2];
        var height = island.rect[3];

        var iconHtml = '';
        if (island.locked) {
          iconHtml = window.Hud.icons.lock;
        } else if (island.star) {
          iconHtml = window.Hud.icons.star;
        }

        html += '' +
          '<button type="button" class="world-island' + (island.locked ? ' is-locked' : ' is-unlocked') + '" ' +
            'id="island-' + island.id + '" ' +
            'data-id="' + island.id + '" ' +
            'style="left:' + left + 'px; top:' + top + 'px; width:' + width + 'px; height:' + height + 'px;" ' +
            'aria-label="' + island.label + (island.locked ? ' (Terkunci)' : '') + '">' +
            // Building block
            '<div class="island-building" style="background-color: ' + island.blockColor + ';">' +
              '<div class="building-roof-accent"></div>' +
              '<div class="building-windows">' +
                '<span class="window-pane"></span><span class="window-pane"></span>' +
                '<span class="window-pane"></span><span class="window-pane"></span>' +
              '</div>' +
              '<div class="building-door"></div>' +
            '</div>' +
            // Label pill
            '<div class="island-pill" style="background-color: ' + island.pillColor + ';">' +
              '<span class="island-pill-label">' + island.label + '</span>' +
              (iconHtml ? '<span class="island-pill-icon">' + iconHtml + '</span>' : '') +
            '</div>' +
          '</button>';
      }

      html += '</div>'; // .world-islands
      html += '</div>'; // .screen-world

      this.container.innerHTML = html;
      this.bindEvents();
    },

    bindEvents: function () {
      var self = this;
      var islandButtons = this.container.querySelectorAll('.world-island');

      for (var i = 0; i < islandButtons.length; i++) {
        islandButtons[i].addEventListener('click', function (e) {
          e.preventDefault();
          var islandId = this.getAttribute('data-id');

          if (islandId === 'sestama') {
            window.location.hash = '#/island';
          } else {
            window.Hud.showToast('Pulau ini segera hadir', 2000);
          }
        });
      }
    }
  };

  window.WorldScreen = WorldScreen;
})(window);


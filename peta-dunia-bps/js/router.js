// Hash router managing screen transitions and browser history
(function (window) {
  'use strict';

  var routes = {
    '#/world': window.WorldScreen,
    '#/island': window.IslandScreen,
    '#/office': window.OfficeScreen
  };

  var currentScreen = null;
  var stageContainer = null;

  var Router = {
    init: function () {
      stageContainer = document.getElementById('stage');
      if (!stageContainer) {
        console.error('#stage element not found!');
        return;
      }

      var self = this;
      window.addEventListener('hashchange', function () {
        self.handleRoute();
      });

      // Initial route handle
      if (!window.location.hash || !routes[window.location.hash]) {
        window.location.hash = '#/world';
      } else {
        this.handleRoute();
      }
    },

    handleRoute: function () {
      var hash = window.location.hash;
      if (!routes[hash]) {
        // Fallback to #/world if unknown route
        window.location.hash = '#/world';
        return;
      }

      var nextScreen = routes[hash];

      // Unmount previous screen
      if (currentScreen && typeof currentScreen.unmount === 'function') {
        currentScreen.unmount();
      }

      // Clear container and mount next screen
      if (stageContainer) {
        stageContainer.innerHTML = '';
        currentScreen = nextScreen;
        if (currentScreen && typeof currentScreen.mount === 'function') {
          currentScreen.mount(stageContainer);
        }
      }
    }
  };

  window.Router = Router;
})(window);


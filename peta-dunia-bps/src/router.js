// Hash router managing screen transitions and browser history
import WorldScreen from './screens/world.js';
import IslandScreen from './screens/island.js';
import OfficeScreen from './screens/office.js';

const routes = {
  '#/world': WorldScreen,
  '#/island': IslandScreen,
  '#/office': OfficeScreen
};

let currentScreen = null;
let stageContainer = null;

export const Router = {
  init() {
    stageContainer = document.getElementById('stage');
    if (!stageContainer) {
      console.error('#stage element not found!');
      return;
    }

    window.addEventListener('hashchange', () => {
      this.handleRoute();
    });

    if (!window.location.hash || !routes[window.location.hash]) {
      window.location.hash = '#/world';
    } else {
      this.handleRoute();
    }
  },

  handleRoute() {
    const hash = window.location.hash;
    if (!routes[hash]) {
      window.location.hash = '#/world';
      return;
    }

    const nextScreen = routes[hash];

    if (currentScreen && typeof currentScreen.unmount === 'function') {
      currentScreen.unmount();
    }

    if (stageContainer) {
      stageContainer.innerHTML = '';
      currentScreen = nextScreen;
      if (currentScreen && typeof currentScreen.mount === 'function') {
        currentScreen.mount(stageContainer);
      }
    }
  }
};

export default Router;

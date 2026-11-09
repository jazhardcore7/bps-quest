// Hash router managing screen transitions, browser history, and authentication route guards
import WorldScreen from './screens/world.js';
import IslandScreen from './screens/island.js';
import OfficeScreen from './screens/office.js';
import LoginScreen from './screens/login.js';
import { onAuthChanged } from './firebase/auth.js';
import { AppState } from './state/index.js';

const routes = {
  '#/login': LoginScreen,
  '#/world': WorldScreen,
  '#/island': IslandScreen,
  '#/office': OfficeScreen
};

let currentScreen = null;
let stageContainer = null;
let isAuthInitialized = false;
let currentUser = null;

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

    // Subscribe to auth state changes to guard routes
    onAuthChanged((user, profile) => {
      currentUser = user && profile ? user : null;
      const wasUninitialized = !isAuthInitialized;
      isAuthInitialized = true;

      const currentHash = window.location.hash;

      if (!currentUser) {
        // Not signed in: redirect any route to #/login
        if (currentHash !== '#/login') {
          window.location.hash = '#/login';
        } else {
          this.handleRoute();
        }
      } else {
        // Signed in: redirect away from #/login to #/world
        if (currentHash === '#/login' || !currentHash || !routes[currentHash]) {
          window.location.hash = '#/world';
        } else {
          this.handleRoute();
        }
      }
    });
  },

  handleRoute() {
    if (!isAuthInitialized) {
      return;
    }

    let hash = window.location.hash || '#/world';

    // Route guard: every route except #/login requires a signed-in user
    if (!currentUser && hash !== '#/login') {
      window.location.hash = '#/login';
      return;
    }

    // Authenticated user on #/login redirects to #/world
    if (currentUser && hash === '#/login') {
      window.location.hash = '#/world';
      return;
    }

    if (!routes[hash]) {
      window.location.hash = currentUser ? '#/world' : '#/login';
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

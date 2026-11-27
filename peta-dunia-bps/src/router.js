// Hash router managing screen transitions, browser history, and route guards
import WorldScreen from './screens/world.js';
import IslandScreen from './screens/island.js';
import OfficeScreen from './screens/office.js';
import LoginScreen from './screens/login.js';
import LeaderboardScreen from './screens/leaderboard.js';
import ManageScreen from './screens/manage/index.js';
import { BpsData } from './data/index.js';
import { onAuthChanged } from './firebase/auth.js';
import { AppState } from './state/index.js';
import { isHeadRole, isSuperAdminRole } from './config.js';

const VALID_ISLAND_IDS = new Set(BpsData.islands.map((i) => i.id));

const staticRoutes = {
  '#/login': LoginScreen,
  '#/world': WorldScreen,
  '#/office': OfficeScreen,
  '#/leaderboard': LeaderboardScreen,
  '#/manage': ManageScreen
};

function resolveRoute(hash) {
  if (!hash) return null;
  if (hash === '#/island') {
    return { screen: IslandScreen, params: { islandId: 'sestama' }, canonical: '#/island/sestama' };
  }
  if (hash.startsWith('#/island/')) {
    const islandId = hash.slice('#/island/'.length).trim();
    if (VALID_ISLAND_IDS.has(islandId)) {
      return { screen: IslandScreen, params: { islandId }, canonical: hash };
    }
    return null;
  }
  if (staticRoutes[hash]) {
    return { screen: staticRoutes[hash], params: {}, canonical: hash };
  }
  return null;
}

function canAccessManage() {
  if (!AppState.user || AppState.player.active === false) return false;
  return isHeadRole(AppState.player.role) || isSuperAdminRole(AppState.player.role);
}

let currentScreen = null;
let stageContainer = null;
let isAuthInitialized = false;
let currentUser = null;
let previousHash = null;
let currentHash = null;

export const Router = {
  getPreviousHash() {
    return previousHash || '#/world';
  },

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
      isAuthInitialized = true;

      const hash = window.location.hash;

      if (!currentUser) {
        if (hash !== '#/login') {
          window.location.hash = '#/login';
        } else {
          this.handleRoute();
        }
      } else {
        if (hash === '#/login' || !hash || !resolveRoute(hash)) {
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

    const hash = window.location.hash || '#/world';

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

    const match = resolveRoute(hash);
    if (!match) {
      window.location.hash = currentUser ? '#/world' : '#/login';
      return;
    }

    // Management center guard: employees redirect to #/world
    if (hash === '#/manage' && !canAccessManage()) {
      window.location.hash = '#/world';
      return;
    }

    if (currentHash && currentHash !== hash) {
      previousHash = currentHash;
    }
    currentHash = hash;

    if (currentScreen && typeof currentScreen.unmount === 'function') {
      currentScreen.unmount();
    }

    if (stageContainer) {
      stageContainer.innerHTML = '';
      currentScreen = match.screen;
      if (currentScreen && typeof currentScreen.mount === 'function') {
        currentScreen.mount(stageContainer, match.params);
      }
    }
  }
};

export default Router;

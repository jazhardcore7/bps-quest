// Application state management with pub/sub observer pattern
import { calculateLevel, XP_PER_LEVEL } from '../config.js';

function normalizeUnit(unit) {
  if (!unit) return '';
  return String(unit).toLowerCase().replace(/[\s\-_]+/g, '');
}

const subscribers = [];

export const AppState = {
  user: null, // Full Firestore user document (or null if logged out)
  player: {
    displayName: 'Pegawai BPS',
    email: '',
    role: 'employee',
    level: 1,
    title: 'Explorer',
    xp: 0,
    xpToNext: XP_PER_LEVEL,
    avatarId: 'default'
  },
  currentUnit: '',

  subscribe(fn) {
    if (typeof fn === 'function') {
      subscribers.push(fn);
    }
    return () => {
      const idx = subscribers.indexOf(fn);
      if (idx !== -1) {
        subscribers.splice(idx, 1);
      }
    };
  },

  setUserProfile(userDoc) {
    this.user = userDoc;
    if (userDoc) {
      this.currentUnit = userDoc.unit || '';
      const xp = typeof userDoc.xp === 'number' ? userDoc.xp : 0;
      const level = calculateLevel(xp);
      this.player = {
        displayName: userDoc.displayName || 'Pegawai BPS',
        email: userDoc.email || '',
        role: userDoc.role || 'employee',
        level,
        title: userDoc.role === 'admin' ? 'Administrator' : 'Explorer',
        xp,
        xpToNext: level * XP_PER_LEVEL,
        avatarId: userDoc.avatarId || 'default'
      };
    } else {
      this.clearUser();
      return;
    }
    this.notify();
  },

  clearUser() {
    this.user = null;
    this.currentUnit = '';
    this.player = {
      displayName: '',
      email: '',
      role: 'employee',
      level: 1,
      title: 'Explorer',
      xp: 0,
      xpToNext: XP_PER_LEVEL,
      avatarId: 'default'
    };
    this.notify();
  },

  setCurrentUnit(unit) {
    // DEV-only local override, NEVER written to Firestore or localStorage
    if (this.currentUnit !== unit) {
      this.currentUnit = unit;
      this.notify();
    }
  },

  canStartQuest(buildingUnit) {
    if (!this.currentUnit || !buildingUnit) return false;
    return normalizeUnit(this.currentUnit) === normalizeUnit(buildingUnit);
  },

  notify() {
    for (let i = 0; i < subscribers.length; i++) {
      try {
        subscribers[i](this);
      } catch (e) {
        console.error('State subscriber error:', e);
      }
    }
  }
};

export default AppState;

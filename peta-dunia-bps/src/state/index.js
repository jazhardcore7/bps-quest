// Application state management with pub/sub observer pattern
const STORAGE_KEY = 'bps_current_unit';
const DEFAULT_UNIT = 'Biro SDM';

function loadPersistedUnit() {
  try {
    if (typeof window !== 'undefined' && typeof window.localStorage !== 'undefined') {
      const stored = window.localStorage.getItem(STORAGE_KEY);
      if (stored === 'Biro SDM' || stored === 'Biro Umum') {
        return stored;
      }
    }
  } catch (e) {
    console.warn('localStorage read error:', e);
  }
  return DEFAULT_UNIT;
}

function savePersistedUnit(unit) {
  try {
    if (typeof window !== 'undefined' && typeof window.localStorage !== 'undefined') {
      window.localStorage.setItem(STORAGE_KEY, unit);
    }
  } catch (e) {
    console.warn('localStorage write error:', e);
  }
}

const subscribers = [];

export const AppState = {
  player: {
    name: 'Pegawai Demo',
    level: 1,
    title: 'Explorer',
    xp: 120,
    xpToNext: 500
  },
  currentUnit: loadPersistedUnit(),

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

  setCurrentUnit(unit) {
    if (this.currentUnit !== unit) {
      this.currentUnit = unit;
      savePersistedUnit(unit);
      this.notify();
    }
  },

  canStartQuest(buildingUnit) {
    return this.currentUnit === buildingUnit;
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


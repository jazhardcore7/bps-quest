// Application state management with pub/sub observer pattern
import {
  calculateLevel,
  XP_PER_LEVEL,
  getRoleLabel,
  isHeadRole,
  isSuperAdminRole
} from '../config.js';
import bpsStructure from '../data/bps-structure.json' with { type: 'json' };

const STATIC_UNITS_BY_ID = new Map(bpsStructure.units.map((u) => [u.id, u]));

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
    unit: '',
    unitPath: [],
    role: 'employee',
    active: true,
    jabatan: '',
    level: 1,
    title: 'Pegawai',
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
      const role = userDoc.role || 'employee';
      this.player = {
        displayName: userDoc.displayName || 'Pegawai BPS',
        email: userDoc.email || '',
        unit: userDoc.unit || '',
        unitPath: Array.isArray(userDoc.unitPath) ? userDoc.unitPath : [],
        role,
        active: userDoc.active !== false,
        jabatan: userDoc.jabatan || '',
        level,
        title: getRoleLabel(role),
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
      unit: '',
      unitPath: [],
      role: 'employee',
      active: true,
      jabatan: '',
      level: 1,
      title: 'Pegawai',
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

  canManageUnit(unitId) {
    if (!this.user || !unitId || this.player.active === false) return false;
    const role = this.player.role;
    if (isSuperAdminRole(role)) return true;
    if (!isHeadRole(role)) return false;

    const myUnit = this.player.unit;
    if (!myUnit) return false;
    if (unitId === myUnit) return true;

    const target = STATIC_UNITS_BY_ID.get(unitId);
    return Boolean(target && Array.isArray(target.ancestorIds) && target.ancestorIds.includes(myUnit));
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

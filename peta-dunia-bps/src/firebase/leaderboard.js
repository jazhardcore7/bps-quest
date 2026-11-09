// Leaderboard query service with 60s in-memory caching and client-side tie-breaking
import {
  collection,
  query,
  where,
  orderBy,
  limit,
  getDocs
} from 'firebase/firestore';
import { weekKeyJakarta, monthKeyJakarta, toUnitId } from '../config.js';

let _db = null;
async function getFirestoreDb() {
  if (!_db) {
    const client = await import('./client.js');
    _db = client.db;
  }
  return _db;
}

const CACHE_TTL_MS = 60 * 1000; // 60 seconds in-memory cache

const cache = {
  'all-time': { data: null, timestamp: 0 },
  'weekly': { data: null, timestamp: 0 },
  'monthly': { data: null, timestamp: 0 }
};

/**
 * Fetches up to 60 users for the requested leaderboard tab.
 * Caches in memory for 60 seconds unless forceReload is true.
 *
 * @param {'all-time' | 'weekly' | 'monthly'} tabKey
 * @param {boolean} forceReload
 * @returns {Promise<Array<Object>>}
 */
export async function fetchLeaderboard(tabKey = 'all-time', forceReload = false) {
  const now = Date.now();
  const cached = cache[tabKey];

  if (!forceReload && cached && cached.data && (now - cached.timestamp < CACHE_TTL_MS)) {
    return cached.data;
  }

  const db = await getFirestoreDb();
  const usersRef = collection(db, 'users');
  let q;

  if (tabKey === 'weekly') {
    const currWeekKey = weekKeyJakarta(new Date());
    q = query(
      usersRef,
      where('weekKey', '==', currWeekKey),
      orderBy('xpWeek', 'desc'),
      limit(60)
    );
  } else if (tabKey === 'monthly') {
    const currMonthKey = monthKeyJakarta(new Date());
    q = query(
      usersRef,
      where('monthKey', '==', currMonthKey),
      orderBy('xpMonth', 'desc'),
      limit(60)
    );
  } else {
    // 'all-time'
    q = query(
      usersRef,
      orderBy('xp', 'desc'),
      limit(60)
    );
  }

  const snap = await getDocs(q);
  const users = [];

  snap.forEach((docSnap) => {
    users.push({
      uid: docSnap.id,
      ...docSnap.data()
    });
  });

  cache[tabKey] = {
    data: users,
    timestamp: now
  };

  return users;
}

/**
 * Clears the in-memory cache for a tab or all tabs.
 */
export function clearLeaderboardCache(tabKey) {
  if (tabKey && cache[tabKey]) {
    cache[tabKey] = { data: null, timestamp: 0 };
  } else {
    Object.keys(cache).forEach((k) => {
      cache[k] = { data: null, timestamp: 0 };
    });
  }
}

/**
 * Sorts users according to rules:
 * 1. Primary: Period XP descending.
 * 2. Secondary: Total cumulative XP descending.
 * 3. Tertiary: Display Name alphabetically.
 *
 * @param {Array<Object>} users
 * @param {'all-time' | 'weekly' | 'monthly'} periodType
 * @returns {Array<Object>}
 */
export function sortLeaderboardUsers(users, periodType = 'all-time') {
  return [...users].sort((a, b) => {
    let aPeriodXp = 0;
    let bPeriodXp = 0;

    if (periodType === 'weekly') {
      aPeriodXp = typeof a.xpWeek === 'number' ? a.xpWeek : 0;
      bPeriodXp = typeof b.xpWeek === 'number' ? b.xpWeek : 0;
    } else if (periodType === 'monthly') {
      aPeriodXp = typeof a.xpMonth === 'number' ? a.xpMonth : 0;
      bPeriodXp = typeof b.xpMonth === 'number' ? b.xpMonth : 0;
    } else {
      aPeriodXp = typeof a.xp === 'number' ? a.xp : 0;
      bPeriodXp = typeof b.xp === 'number' ? b.xp : 0;
    }

    // 1. Period XP
    if (bPeriodXp !== aPeriodXp) {
      return bPeriodXp - aPeriodXp;
    }

    // 2. Total all-time XP
    const aTotalXp = typeof a.xp === 'number' ? a.xp : 0;
    const bTotalXp = typeof b.xp === 'number' ? b.xp : 0;
    if (bTotalXp !== aTotalXp) {
      return bTotalXp - aTotalXp;
    }

    // 3. Display Name
    const nameA = a.displayName || '';
    const nameB = b.displayName || '';
    return nameA.localeCompare(nameB, 'id', { sensitivity: 'base' });
  });
}

/**
 * Filters users by unit on client side.
 *
 * @param {Array<Object>} users
 * @param {'Semua' | 'Biro SDM'} unitFilter
 * @returns {Array<Object>}
 */
export function filterUsersByUnit(users, unitFilter = 'Semua') {
  if (!unitFilter || unitFilter === 'Semua') {
    return users;
  }
  const targetUnitId = toUnitId(unitFilter);
  return users.filter((u) => toUnitId(u.unit) === targetUnitId);
}

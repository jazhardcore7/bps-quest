// Quest management and batched claim service
import {
  collection,
  doc,
  getDoc,
  getDocs,
  query,
  where,
  writeBatch,
  serverTimestamp
} from 'firebase/firestore';
import { db, auth } from './client.js';
import {
  calculateLevel,
  weekKeyJakarta,
  monthKeyJakarta,
  dailyPeriodKeyJakarta,
  toUnitId
} from '../config.js';

/**
 * Fetches unit data from Firestore (name, description, level).
 */
export async function fetchUnitData(unitIdentifier) {
  const unitId = toUnitId(unitIdentifier);
  try {
    const snap = await getDoc(doc(db, 'units', unitId));
    if (snap.exists()) {
      return snap.data();
    }
  } catch (err) {
    console.warn(`Failed to fetch unit data for '${unitId}':`, err);
  }
  return null;
}

/**
 * Fetches active quests for the given unit.
 */
export async function fetchUnitQuests(unitIdentifier) {
  const unitId = toUnitId(unitIdentifier);
  try {
    const q = query(
      collection(db, 'quests'),
      where('unitId', '==', unitId),
      where('active', '==', true)
    );
    const snap = await getDocs(q);
    const quests = [];
    snap.forEach((d) => {
      quests.push({ id: d.id, ...d.data() });
    });
    return quests;
  } catch (err) {
    console.warn(`Failed to fetch quests for unit '${unitId}':`, err);
    return [];
  }
}

/**
 * Fetches user completions for the given unit.
 */
export async function fetchUserCompletions(uid, unitIdentifier) {
  const unitId = toUnitId(unitIdentifier);
  if (!uid || !unitId) return [];

  try {
    const q = query(
      collection(db, 'completions'),
      where('uid', '==', uid),
      where('unitId', '==', unitId)
    );
    const snap = await getDocs(q);
    const completions = [];
    snap.forEach((d) => {
      completions.push({ id: d.id, ...d.data() });
    });
    return completions;
  } catch (err) {
    console.warn(`Failed to fetch completions for user '${uid}':`, err);
    return [];
  }
}

/**
 * Claims a quest via an atomic batched write:
 * 1. Creates completions/{uid}_{questId}_{periodKey}
 * 2. Updates users/{uid} progression (xp, level, weekKey, xpWeek, monthKey, xpMonth, lastCompletionId)
 */
export async function claimQuest(quest) {
  const user = auth.currentUser;
  if (!user) {
    throw new Error('Pengguna belum masuk.');
  }

  const now = new Date();
  const periodKey = quest.type === 'daily' ? dailyPeriodKeyJakarta(now) : 'once';
  const completionId = `${user.uid}_${quest.id}_${periodKey}`;

  // 1. Fetch current user document
  const userRef = doc(db, 'users', user.uid);
  const userSnap = await getDoc(userRef);
  if (!userSnap.exists()) {
    throw new Error('Dokumen pengguna tidak ditemukan.');
  }

  const userData = userSnap.data();

  // 2. Check if completion already exists for this period
  const compRef = doc(db, 'completions', completionId);
  const compSnap = await getDoc(compRef);
  if (compSnap.exists()) {
    throw new Error('Quest sudah diselesaikan pada periode ini.');
  }

  // 3. Compute new progression
  const oldXp = typeof userData.xp === 'number' ? userData.xp : 0;
  const newXp = oldXp + quest.xp;
  const oldLevel = calculateLevel(oldXp);
  const newLevel = calculateLevel(newXp);

  const currWeekKey = weekKeyJakarta(now);
  const currMonthKey = monthKeyJakarta(now);

  const newXpWeek = (userData.weekKey === currWeekKey ? (userData.xpWeek || 0) : 0) + quest.xp;
  const newXpMonth = (userData.monthKey === currMonthKey ? (userData.xpMonth || 0) : 0) + quest.xp;

  // 4. Atomic Batched Write
  const batch = writeBatch(db);

  batch.set(compRef, {
    uid: user.uid,
    questId: quest.id,
    unitId: quest.unitId,
    xp: quest.xp,
    periodKey,
    createdAt: serverTimestamp()
  });

  batch.update(userRef, {
    xp: newXp,
    level: newLevel,
    weekKey: currWeekKey,
    xpWeek: newXpWeek,
    monthKey: currMonthKey,
    xpMonth: newXpMonth,
    lastCompletionId: completionId
  });

  await batch.commit();

  return {
    success: true,
    xp: quest.xp,
    newXp,
    oldLevel,
    newLevel,
    levelUp: newLevel > oldLevel,
    periodKey
  };
}

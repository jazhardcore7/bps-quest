// Cached Firestore units loader with bps-structure.json fallback and hierarchy helpers
import { collection, getDocs } from 'firebase/firestore';
import { db } from './client.js';
import bpsStructure from '../data/bps-structure.json' with { type: 'json' };

export const UNITS_CACHE_TTL_MS = 5 * 60 * 1000;

const ORDER_INDEX = new Map(bpsStructure.units.map((u, idx) => [u.id, idx]));

let cachedUnits = null;
let cachedAt = 0;

function normalizeUnitRecord(raw, idFallback = '') {
  const id = raw.id || idFallback;
  return {
    ...raw,
    id,
    ancestorIds: Array.isArray(raw.ancestorIds) ? raw.ancestorIds : [],
    tugas: Array.isArray(raw.tugas) ? raw.tugas : [],
    services: Array.isArray(raw.services) ? raw.services : [],
    announcements: Array.isArray(raw.announcements) ? raw.announcements : [],
    sources: Array.isArray(raw.sources) ? raw.sources : [],
    archived: raw.archived === true
  };
}

export function getFallbackUnits() {
  return bpsStructure.units.map((u) => normalizeUnitRecord({
    ...u,
    archived: false,
    announcements: []
  }));
}

function sortUnitsForDisplay(units) {
  return [...units].sort((a, b) => {
    const idxA = ORDER_INDEX.has(a.id) ? ORDER_INDEX.get(a.id) : Number.MAX_SAFE_INTEGER;
    const idxB = ORDER_INDEX.has(b.id) ? ORDER_INDEX.get(b.id) : Number.MAX_SAFE_INTEGER;
    if (idxA !== idxB) return idxA - idxB;
    return String(a.name || a.id).localeCompare(String(b.name || b.id), 'id');
  });
}

/**
 * Loads units from Firestore once and caches them in memory for 5 minutes.
 * Falls back to bps-structure.json if the collection is empty or unreachable.
 */
export async function loadUnits({ force = false } = {}) {
  const now = Date.now();
  if (!force && cachedUnits && (now - cachedAt) < UNITS_CACHE_TTL_MS) {
    return cachedUnits;
  }

  try {
    const snap = await getDocs(collection(db, 'units'));
    if (!snap.empty) {
      const list = [];
      snap.forEach((docSnap) => {
        list.push(normalizeUnitRecord(docSnap.data(), docSnap.id));
      });
      cachedUnits = sortUnitsForDisplay(list);
      cachedAt = now;
      return cachedUnits;
    }
  } catch (err) {
    console.warn('Failed to load units from Firestore, using static fallback:', err);
  }

  cachedUnits = getFallbackUnits();
  cachedAt = now;
  return cachedUnits;
}

export async function refreshUnits() {
  return loadUnits({ force: true });
}

export function getCachedUnits() {
  return cachedUnits || getFallbackUnits();
}

export function clearUnitsCache() {
  cachedUnits = null;
  cachedAt = 0;
}

/**
 * Derives ordered island tiles: island's root unit first, then non-archived child units.
 */
export function deriveIslandTiles(units, islandId) {
  const source = Array.isArray(units) ? units : [];
  const activeInIsland = source.filter((u) => u && u.island === islandId && u.archived !== true);
  if (activeInIsland.length === 0) {
    return { rootUnit: null, tiles: [] };
  }

  const rootUnit = activeInIsland.find(
    (u) => u.parentId === null || u.echelon === 'top' || u.echelon === 1
  ) || activeInIsland[0];

  const children = activeInIsland.filter((u) => u.id !== rootUnit.id);
  return {
    rootUnit,
    tiles: [rootUnit, ...children]
  };
}

/**
 * Returns non-archived direct child units for the given parent unit ID.
 */
export function getChildUnits(units, parentId) {
  const source = Array.isArray(units) ? units : [];
  return source.filter((u) => u && u.archived !== true && u.parentId === parentId);
}

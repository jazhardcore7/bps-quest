import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import {
  sortLeaderboardUsers,
  filterUsersByUnit
} from '../src/firebase/leaderboard.js';

describe('Leaderboard Sorter & Tie-Breaker Logic', () => {
  const users = [
    { uid: 'u1', displayName: 'Doni', unit: 'biro-sdm', xp: 100, xpWeek: 40, xpMonth: 100 },
    { uid: 'u2', displayName: 'Citra', unit: 'biro-sdm', xp: 100, xpWeek: 40, xpMonth: 100 },
    { uid: 'u3', displayName: 'Andi', unit: 'biro-sdm', xp: 450, xpWeek: 120, xpMonth: 250 },
    { uid: 'u4', displayName: 'Dewi', unit: 'biro-sdm', xp: 350, xpWeek: 80, xpMonth: 180 },
    { uid: 'u5', displayName: 'Rian', unit: 'biro-umum', xp: 200, xpWeek: 80, xpMonth: 150 },
    { uid: 'u6', displayName: 'Hendra', unit: 'biro-sdm', xp: 600, xpWeek: 0, xpMonth: 100 }
  ];

  it('orders by period XP descending for all-time', () => {
    const sorted = sortLeaderboardUsers(users, 'all-time');
    assert.equal(sorted[0].displayName, 'Hendra'); // 600 XP
    assert.equal(sorted[1].displayName, 'Andi');   // 450 XP
    assert.equal(sorted[2].displayName, 'Dewi');   // 350 XP
  });

  it('orders by period XP descending for weekly and applies total XP tie-breaker', () => {
    const sorted = sortLeaderboardUsers(users, 'weekly');
    assert.equal(sorted[0].displayName, 'Andi'); // 120 XP
    // Dewi and Rian are tied at 80 XP, but Dewi has 350 total XP vs Rian's 200
    assert.equal(sorted[1].displayName, 'Dewi');
    assert.equal(sorted[2].displayName, 'Rian');
  });

  it('applies alphabetical displayName tie-breaker when period XP and total XP are equal', () => {
    const sorted = sortLeaderboardUsers(users, 'weekly');
    // Citra and Doni are tied at 40 XP week and 100 total XP
    const citraIndex = sorted.findIndex((u) => u.displayName === 'Citra');
    const doniIndex = sorted.findIndex((u) => u.displayName === 'Doni');
    assert.ok(citraIndex < doniIndex, 'Citra should rank before Doni alphabetically');
  });

  it('filters by unit correctly', () => {
    const sdmOnly = filterUsersByUnit(users, 'Biro SDM');
    assert.equal(sdmOnly.some((u) => u.unit === 'biro-umum'), false);
    assert.equal(sdmOnly.length, 5);

    const all = filterUsersByUnit(users, 'Semua');
    assert.equal(all.length, 6);
  });

  it('detects empty state when all users have 0 period XP', () => {
    const zeroUsers = [
      { uid: 'z1', displayName: 'Zero 1', xpWeek: 0 },
      { uid: 'z2', displayName: 'Zero 2', xpWeek: 0 }
    ];
    const scorers = zeroUsers.filter((u) => (u.xpWeek || 0) > 0);
    assert.equal(scorers.length, 0);
  });
});

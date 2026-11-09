import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { XP_PER_LEVEL, calculateLevel, weekKeyJakarta, monthKeyJakarta } from '../src/config.js';

describe('Level and XP calculation', () => {
  it('defines XP_PER_LEVEL as 500', () => {
    assert.equal(XP_PER_LEVEL, 500);
  });

  it('calculates level correctly from XP (floor(xp / 500) + 1)', () => {
    assert.equal(calculateLevel(0), 1);
    assert.equal(calculateLevel(120), 1);
    assert.equal(calculateLevel(499), 1);
    assert.equal(calculateLevel(500), 2);
    assert.equal(calculateLevel(750), 2);
    assert.equal(calculateLevel(999), 2);
    assert.equal(calculateLevel(1000), 3);
    assert.equal(calculateLevel(1250), 3);
  });

  it('handles negative or nullish XP gracefully by defaulting to level 1', () => {
    assert.equal(calculateLevel(null), 1);
    assert.equal(calculateLevel(undefined), 1);
    assert.equal(calculateLevel(-50), 1);
  });
});

describe('Jakarta ISO Week Key (Monday-start, format YYYY-Www in Asia/Jakarta UTC+7)', () => {
  it('correctly handles Sunday night right before midnight', () => {
    // 2026-11-08 23:59:59 UTC+7 is 2026-11-08 16:59:59 UTC (Sunday of Week 45)
    const sundayNight = new Date('2026-11-08T16:59:59.000Z');
    assert.equal(weekKeyJakarta(sundayNight), '2026-W45');
  });

  it('rolls over to next week on Monday 00:00:01 in Jakarta', () => {
    // 2026-11-09 00:00:01 UTC+7 is 2026-11-08 17:00:01 UTC (Monday of Week 46)
    const mondayMorning = new Date('2026-11-08T17:00:01.000Z');
    assert.equal(weekKeyJakarta(mondayMorning), '2026-W46');
  });

  it('evaluates mid-week correctly', () => {
    // Wednesday 2026-11-11 12:00:00 UTC+7
    const wednesday = new Date('2026-11-11T05:00:00.000Z');
    assert.equal(weekKeyJakarta(wednesday), '2026-W46');
  });
});

describe('Jakarta Month Key (format YYYY-MM in Asia/Jakarta UTC+7)', () => {
  it('correctly handles Sunday-night month boundary right before midnight', () => {
    // 2026-05-31 23:59:59 UTC+7 is 2026-05-31 16:59:59 UTC (May)
    const mayEnd = new Date('2026-05-31T16:59:59.000Z');
    assert.equal(monthKeyJakarta(mayEnd), '2026-05');
  });

  it('rolls over to next month at 00:00:01 in Jakarta', () => {
    // 2026-06-01 00:00:01 UTC+7 is 2026-05-31 17:00:01 UTC (June)
    const juneStart = new Date('2026-05-31T17:00:01.000Z');
    assert.equal(monthKeyJakarta(juneStart), '2026-06');
  });

  it('handles year-end transition in Jakarta', () => {
    // 2026-12-31 23:59:59 UTC+7 is 2026-12-31 16:59:59 UTC
    const yearEnd = new Date('2026-12-31T16:59:59.000Z');
    assert.equal(monthKeyJakarta(yearEnd), '2026-12');

    // 2027-01-01 00:00:01 UTC+7 is 2026-12-31 17:00:01 UTC
    const yearStart = new Date('2026-12-31T17:00:01.000Z');
    assert.equal(monthKeyJakarta(yearStart), '2027-01');
  });
});

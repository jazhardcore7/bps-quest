import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import {
  XP_PER_LEVEL,
  calculateLevel,
  weekKeyJakarta,
  monthKeyJakarta,
  dailyPeriodKeyJakarta,
  toUnitId,
  UNIT_IDS,
  normalizeDisplayName
} from '../src/config.js';

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

describe('Unit ID Mappings', () => {
  it('maps Biro SDM and biro-sdm to biro-sdm', () => {
    assert.equal(toUnitId('Biro SDM'), 'biro-sdm');
    assert.equal(toUnitId('biro-sdm'), 'biro-sdm');
    assert.equal(toUnitId('Biro Umum'), 'biro-umum');
    assert.equal(UNIT_IDS.BIRO_SDM, 'biro-sdm');
  });

  it('handles empty or nullish unit strings', () => {
    assert.equal(toUnitId(''), '');
    assert.equal(toUnitId(null), '');
  });
});

describe('Display name normalization (must satisfy firestore.rules: 1-60 chars, no < or >)', () => {
  const RULE_PATTERN = /^[^<>]+$/;

  it('keeps a normal name and collapses extra whitespace', () => {
    assert.equal(normalizeDisplayName('Budi Santoso', 'budi@bps.go.id'), 'Budi Santoso');
    assert.equal(normalizeDisplayName('  Budi \t  Santoso\n ', 'budi@bps.go.id'), 'Budi Santoso');
  });

  it('removes < and > from HTML input', () => {
    const name = normalizeDisplayName('<img src=x onerror=alert(1)>', 'budi@bps.go.id');
    assert.equal(name, 'img src=x onerror=alert(1)');
    assert.match(name, RULE_PATTERN);
  });

  it('cuts names longer than 60 characters to 60', () => {
    const name = normalizeDisplayName('A'.repeat(61), 'budi@bps.go.id');
    assert.equal(name.length, 60);
    assert.equal(normalizeDisplayName('B'.repeat(200), 'budi@bps.go.id').length, 60);
  });

  it('falls back to the email local part, then to "Pegawai", for empty input', () => {
    assert.equal(normalizeDisplayName('', 'budi.santoso@bps.go.id'), 'budi.santoso');
    assert.equal(normalizeDisplayName('   ', 'budi@bps.go.id'), 'budi');
    assert.equal(normalizeDisplayName('<>', 'budi@bps.go.id'), 'budi');
    assert.equal(normalizeDisplayName(null, '<b>@bps.go.id'), 'b');
    assert.equal(normalizeDisplayName(undefined, '<>@bps.go.id'), 'Pegawai');
    assert.equal(normalizeDisplayName('', undefined), 'Pegawai');
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

describe('Jakarta Daily Period Key (format YYYY-MM-DD in Asia/Jakarta UTC+7)', () => {
  it('correctly handles day before midnight in Jakarta', () => {
    // 2026-11-08 23:59:59 UTC+7 is 2026-11-08 16:59:59 UTC
    const beforeMidnight = new Date('2026-11-08T16:59:59.000Z');
    assert.equal(dailyPeriodKeyJakarta(beforeMidnight), '2026-11-08');
  });

  it('rolls over to next day at 00:00:01 in Jakarta', () => {
    // 2026-11-09 00:00:01 UTC+7 is 2026-11-08 17:00:01 UTC
    const afterMidnight = new Date('2026-11-08T17:00:01.000Z');
    assert.equal(dailyPeriodKeyJakarta(afterMidnight), '2026-11-09');
  });

  it('matches YYYY-MM-DD format regex', () => {
    const todayKey = dailyPeriodKeyJakarta(new Date());
    assert.match(todayKey, /^\d{4}-\d{2}-\d{2}$/);
  });
});

import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

// Provide dummy Firebase config env vars so modules importing ./client.js load cleanly in Node tests.
process.env.VITE_FIREBASE_API_KEY = process.env.VITE_FIREBASE_API_KEY || 'test-api-key';
process.env.VITE_FIREBASE_PROJECT_ID = process.env.VITE_FIREBASE_PROJECT_ID || 'demo-bps';
process.env.VITE_FIREBASE_STORAGE_BUCKET = process.env.VITE_FIREBASE_STORAGE_BUCKET || 'demo-bps.appspot.com';
process.env.VITE_FIREBASE_MESSAGING_SENDER_ID = process.env.VITE_FIREBASE_MESSAGING_SENDER_ID || '123456789';
process.env.VITE_FIREBASE_APP_ID = process.env.VITE_FIREBASE_APP_ID || '1:123456789:web:abcdef';
process.env.VITE_USE_EMULATORS = 'true';

const { AppState } = await import('../src/state/index.js');
const { deriveIslandTiles, getChildUnits, getFallbackUnits } = await import('../src/firebase/units.js');
const {
  validateQuestInput,
  validateContentInput,
  validateAllowlistInput,
  validateUnitStructureInput,
  createAnnouncementItem
} = await import('../src/firebase/manage.js');

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const bpsStructure = JSON.parse(
  fs.readFileSync(path.resolve(__dirname, '../src/data/bps-structure.json'), 'utf8')
);

describe('AppState.canManageUnit scope resolution', () => {
  it('denies logged-out or inactive users', () => {
    AppState.clearUser();
    assert.equal(AppState.canManageUnit('biro-sdm'), false);

    AppState.setUserProfile({
      displayName: 'Nonaktif',
      email: 'nonaktif@bps.go.id',
      unit: 'biro-sdm',
      role: 'head_e2',
      active: false,
      xp: 0
    });
    assert.equal(AppState.canManageUnit('biro-sdm'), false);
  });

  it('denies plain employees for all units', () => {
    AppState.setUserProfile({
      displayName: 'Budi',
      email: 'budi@bps.go.id',
      unit: 'biro-sdm',
      role: 'employee',
      active: true,
      xp: 0
    });
    assert.equal(AppState.canManageUnit('biro-sdm'), false);
    assert.equal(AppState.canManageUnit('sestama'), false);
  });

  it('limits head_e2 to own unit and descendants', () => {
    AppState.setUserProfile({
      displayName: 'Karo SDM',
      email: 'karo.sdm@bps.go.id',
      unit: 'biro-sdm',
      role: 'head_e2',
      active: true,
      xp: 0
    });
    assert.equal(AppState.canManageUnit('biro-sdm'), true);
    assert.equal(AppState.canManageUnit('biro-umum'), false);
    assert.equal(AppState.canManageUnit('sestama'), false);
    assert.equal(AppState.canManageUnit('dir-harga'), false);
  });

  it('allows head_e1 on sestama to manage sestama and its biros, but not other deputies', () => {
    AppState.setUserProfile({
      displayName: 'Sestama',
      email: 'sestama@bps.go.id',
      unit: 'sestama',
      role: 'head_e1',
      active: true,
      xp: 0
    });
    assert.equal(AppState.canManageUnit('sestama'), true);
    assert.equal(AppState.canManageUnit('biro-sdm'), true);
    assert.equal(AppState.canManageUnit('biro-umum'), true);
    assert.equal(AppState.canManageUnit('dir-harga'), false);
    assert.equal(AppState.canManageUnit('bps-pusat'), false);
  });

  it('allows head_top on bps-pusat to manage bps-pusat and all descendants', () => {
    AppState.setUserProfile({
      displayName: 'Kepala BPS',
      email: 'kepala@bps.go.id',
      unit: 'bps-pusat',
      role: 'head_top',
      active: true,
      xp: 0
    });
    assert.equal(AppState.canManageUnit('bps-pusat'), true);
    assert.equal(AppState.canManageUnit('sestama'), true);
    assert.equal(AppState.canManageUnit('biro-sdm'), true);
    assert.equal(AppState.canManageUnit('dir-harga'), true);
  });

  it('allows super_admin and legacy admin alias to manage every unit including dynamically added ones', () => {
    for (const role of ['super_admin', 'admin']) {
      AppState.setUserProfile({
        displayName: 'Admin',
        email: 'admin@bps.go.id',
        unit: 'biro-sdm',
        role,
        active: true,
        xp: 0
      });
      assert.equal(AppState.canManageUnit('dir-harga'), true);
      assert.equal(AppState.canManageUnit('unit-baru', []), true);
    }
  });
});

describe('Quest form validation (XP caps and quiz rules)', () => {
  it('enforces XP cap 100 for heads and 500 for super_admin', () => {
    const base = { unitId: 'biro-sdm', title: 'Presensi Harian', description: 'Isi presensi', type: 'daily', xp: 100, active: true };
    assert.equal(validateQuestInput(base, { isSuperAdmin: false }).valid, true);
    assert.equal(validateQuestInput({ ...base, xp: 101 }, { isSuperAdmin: false }).valid, false);
    assert.equal(validateQuestInput({ ...base, xp: 0 }, { isSuperAdmin: false }).valid, false);

    assert.equal(validateQuestInput({ ...base, xp: 500 }, { isSuperAdmin: true }).valid, true);
    assert.equal(validateQuestInput({ ...base, xp: 501 }, { isSuperAdmin: true }).valid, false);
  });

  it('validates title and description length bounds', () => {
    assert.equal(validateQuestInput({ unitId: 'biro-sdm', title: 'AB', description: '', type: 'daily', xp: 10 }, {}).valid, false);
    assert.equal(validateQuestInput({ unitId: 'biro-sdm', title: 'A'.repeat(81), description: '', type: 'daily', xp: 10 }, {}).valid, false);
    assert.equal(validateQuestInput({ unitId: 'biro-sdm', title: 'Judul Valid', description: 'D'.repeat(301), type: 'daily', xp: 10 }, {}).valid, false);
  });

  it('validates checkpoint quiz structure (question, 2-4 options, correctIndex)', () => {
    const validCheckpoint = {
      unitId: 'biro-sdm',
      title: 'Kuis Struktur',
      description: 'Uji pemahaman',
      type: 'checkpoint',
      xp: 50,
      quiz: {
        question: 'Apa nama induk Biro SDM?',
        options: ['Sekretariat Utama', 'Inspektorat Utama'],
        correctIndex: 0
      }
    };
    assert.equal(validateQuestInput(validCheckpoint, {}).valid, true);

    assert.equal(validateQuestInput({
      ...validCheckpoint,
      quiz: { question: 'Q', options: ['A', 'B'], correctIndex: 0 }
    }, {}).valid, false);

    assert.equal(validateQuestInput({
      ...validCheckpoint,
      quiz: { question: 'Pertanyaan valid', options: ['Satu saja'], correctIndex: 0 }
    }, {}).valid, false);

    assert.equal(validateQuestInput({
      ...validCheckpoint,
      quiz: { question: 'Pertanyaan valid', options: ['A', 'B'], correctIndex: 2 }
    }, {}).valid, false);
  });
});

describe('Island tile derivation and child units', () => {
  it('places island root unit first, skips archived units, and preserves children', () => {
    const units = getFallbackUnits().map((u) => (
      u.id === 'biro-umum' ? { ...u, archived: true } : u
    ));
    const { rootUnit, tiles } = deriveIslandTiles(units, 'sestama');
    assert.equal(rootUnit.id, 'sestama');
    assert.equal(tiles[0].id, 'sestama');
    assert.equal(tiles.some((u) => u.id === 'biro-umum'), false);
    assert.equal(tiles.some((u) => u.id === 'biro-sdm'), true);
    assert.equal(tiles.some((u) => u.id === 'pusdiklat'), true);
  });

  it('derives direct non-archived child units accurately', () => {
    const children = getChildUnits(bpsStructure.units, 'deputi-distribusi-jasa');
    assert.deepEqual(children.map((u) => u.id), ['dir-distribusi', 'dir-harga', 'dir-jasa']);
  });
});

describe('Content, allowlist, and structure input validation', () => {
  it('enforces unit content field limits (400, 6x200, 8x120, 5x240)', () => {
    assert.equal(validateContentInput({
      summary: 'S'.repeat(400),
      tugas: Array(6).fill('T'.repeat(200)),
      services: Array(8).fill('L'.repeat(120)),
      announcements: Array.from({ length: 5 }, (_, i) => createAnnouncementItem('Info ' + i, 'uid1'))
    }).valid, true);

    assert.equal(validateContentInput({ summary: 'S'.repeat(401), tugas: [], services: [], announcements: [] }).valid, false);
    assert.equal(validateContentInput({ summary: 'ok', tugas: Array(7).fill('t'), services: [], announcements: [] }).valid, false);
    assert.equal(validateContentInput({ summary: 'ok', tugas: ['T'.repeat(201)], services: [], announcements: [] }).valid, false);
    assert.equal(validateContentInput({ summary: 'ok', tugas: [], services: Array(9).fill('s'), announcements: [] }).valid, false);
    assert.equal(validateContentInput({ summary: 'ok', tugas: [], services: ['L'.repeat(121)], announcements: [] }).valid, false);
    assert.equal(validateContentInput({
      summary: 'ok',
      tugas: [],
      services: [],
      announcements: Array.from({ length: 6 }, (_, i) => createAnnouncementItem('Info ' + i, 'uid1'))
    }).valid, false);
    assert.equal(validateContentInput({
      summary: 'ok',
      tugas: [],
      services: [],
      announcements: [createAnnouncementItem('A'.repeat(241), 'uid1')]
    }).valid, false);
  });

  it('validates allowlist and new unit structure inputs', () => {
    assert.equal(validateAllowlistInput({
      email: 'Pegawai@bps.go.id',
      displayName: 'Pegawai Satu',
      unit: 'biro-sdm',
      role: 'employee',
      jabatan: 'Statistisi',
      active: true
    }).valid, true);

    assert.equal(validateAllowlistInput({
      email: 'invalid-email',
      displayName: 'A',
      unit: 'biro-sdm',
      role: 'employee'
    }).valid, false);

    assert.equal(validateUnitStructureInput({
      id: 'dir-baru',
      parentId: 'deputi-mis',
      type: 'direktorat',
      name: 'Direktorat Baru',
      shortName: 'Dit. Baru',
      headTitle: 'Direktur',
      island: 'mis'
    }, { isCreate: true }).valid, true);

    assert.equal(validateUnitStructureInput({
      id: 'BAD ID',
      parentId: 'deputi-mis',
      type: 'direktorat',
      name: 'Direktorat Baru',
      shortName: 'Dit. Baru',
      headTitle: 'Direktur',
      island: 'mis'
    }, { isCreate: true }).valid, false);
  });
});

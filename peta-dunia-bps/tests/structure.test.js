import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const DATA_PATH = path.resolve(__dirname, '../src/data/bps-structure.json');
const dataset = JSON.parse(fs.readFileSync(DATA_PATH, 'utf8'));

const EXPECTED_ISLANDS = {
  'bps-pusat': 'pimpinan',
  sestama: 'sestama',
  'biro-perencanaan-kerja-sama': 'sestama',
  'biro-keuangan-bmn': 'sestama',
  'biro-sdm': 'sestama',
  'biro-hukum-organisasi': 'sestama',
  'biro-umum': 'sestama',
  pusdiklat: 'sestama',
  'deputi-mis': 'mis',
  'dir-metodologi-sains-data': 'mis',
  'dir-diseminasi-pemberdayaan-evaluasi': 'mis',
  'dir-sistem-informasi': 'mis',
  'deputi-sosial': 'sosial',
  'dir-kependudukan-ketenagakerjaan': 'sosial',
  'dir-kesejahteraan-rakyat': 'sosial',
  'dir-ketahanan-sosial': 'sosial',
  'deputi-produksi': 'produksi',
  'dir-sumber-daya-hayati': 'produksi',
  'dir-sumber-daya-mineral-konstruksi': 'produksi',
  'dir-industri': 'produksi',
  'deputi-distribusi-jasa': 'distribusi-jasa',
  'dir-distribusi': 'distribusi-jasa',
  'dir-harga': 'distribusi-jasa',
  'dir-jasa': 'distribusi-jasa',
  'deputi-neraca': 'neraca',
  'dir-neraca-produksi': 'neraca',
  'dir-neraca-pengeluaran': 'neraca',
  'dir-analisis-neraca-satelit': 'neraca',
  itama: 'itama',
  'inspektorat-1': 'itama',
  'inspektorat-2': 'itama',
  'inspektorat-3': 'itama',
  'itama-bagian-umum': 'itama'
};

const VALID_TYPES = new Set([
  'root',
  'sekretariat',
  'deputi',
  'inspektorat-utama',
  'biro',
  'direktorat',
  'inspektorat',
  'bagian',
  'pusat'
]);

const VALID_ECHELONS = new Set(['top', 1, 2, null]);

function collectStrings(value, pathLabel, out = []) {
  if (typeof value === 'string') {
    out.push({ path: pathLabel, value });
  } else if (Array.isArray(value)) {
    value.forEach((item, idx) => collectStrings(item, `${pathLabel}[${idx}]`, out));
  } else if (value && typeof value === 'object') {
    for (const [k, v] of Object.entries(value)) {
      collectStrings(v, `${pathLabel}.${k}`, out);
    }
  }
  return out;
}

describe('BPS RI Pusat structure dataset (src/data/bps-structure.json)', () => {
  it('has top-level version, generatedAt, and non-empty units array', () => {
    assert.equal(typeof dataset.version, 'string');
    assert.ok(dataset.version.length > 0);
    assert.equal(typeof dataset.generatedAt, 'string');
    assert.ok(!Number.isNaN(Date.parse(dataset.generatedAt)), 'generatedAt must be a valid ISO timestamp');
    assert.ok(Array.isArray(dataset.units));
    assert.ok(dataset.units.length > 0);
  });

  it('has unique unit IDs and valid types/echelons', () => {
    const seen = new Set();
    for (const unit of dataset.units) {
      assert.equal(typeof unit.id, 'string');
      assert.ok(unit.id.length > 0);
      assert.ok(!seen.has(unit.id), `Duplicate unit id: ${unit.id}`);
      seen.add(unit.id);

      assert.ok(VALID_TYPES.has(unit.type), `Invalid type "${unit.type}" for ${unit.id}`);
      assert.ok(VALID_ECHELONS.has(unit.echelon), `Invalid echelon "${unit.echelon}" for ${unit.id}`);
    }
  });

  it('has valid parentId references and exact root-to-parent ancestorIds', () => {
    const byId = new Map(dataset.units.map((u) => [u.id, u]));
    const roots = dataset.units.filter((u) => u.parentId === null);
    assert.equal(roots.length, 1, 'Expected exactly one root unit');
    assert.equal(roots[0].id, 'bps-pusat');

    for (const unit of dataset.units) {
      if (unit.parentId !== null) {
        assert.ok(byId.has(unit.parentId), `Missing parentId "${unit.parentId}" for ${unit.id}`);
      }

      const expectedAncestors = [];
      let cursor = unit.parentId;
      const visited = new Set([unit.id]);
      while (cursor !== null) {
        assert.ok(!visited.has(cursor), `Cycle detected at ${cursor} for ${unit.id}`);
        visited.add(cursor);
        const parent = byId.get(cursor);
        assert.ok(parent, `Missing ancestor "${cursor}" for ${unit.id}`);
        expectedAncestors.unshift(cursor);
        cursor = parent.parentId;
      }

      assert.deepEqual(
        unit.ancestorIds,
        expectedAncestors,
        `ancestorIds mismatch for ${unit.id}`
      );
    }
  });

  it('matches the expected unit IDs and island layout', () => {
    const actualLayout = Object.fromEntries(dataset.units.map((u) => [u.id, u.island]));
    assert.deepEqual(actualLayout, EXPECTED_ISLANDS);

    const byId = new Map(dataset.units.map((u) => [u.id, u]));
    assert.equal(byId.get('bps-pusat').headTitle, 'Kepala BPS');
    assert.equal(byId.get('bps-pusat').echelon, 'top');
    assert.equal(byId.get('sestama').headTitle, 'Sekretaris Utama');
    assert.equal(byId.get('sestama').echelon, 1);
    assert.equal(byId.get('sestama').parentId, 'bps-pusat');
    assert.equal(byId.get('itama').headTitle, 'Inspektur Utama');
    assert.equal(byId.get('itama').echelon, 1);
    assert.equal(byId.get('itama').parentId, 'bps-pusat');
    assert.equal(byId.get('pusdiklat').headTitle, 'Kepala Pusat');
    assert.equal(byId.get('pusdiklat').echelon, 2);
    assert.equal(byId.get('pusdiklat').parentId, 'bps-pusat');
    assert.equal(byId.get('itama-bagian-umum').headTitle, 'Kepala Bagian');
    assert.equal(byId.get('itama-bagian-umum').echelon, null);
    assert.equal(byId.get('itama-bagian-umum').parentId, 'itama');

    for (const unit of dataset.units) {
      if (unit.type === 'deputi') {
        assert.equal(unit.headTitle, 'Deputi');
        assert.equal(unit.echelon, 1);
        assert.equal(unit.parentId, 'bps-pusat');
      } else if (unit.type === 'biro') {
        assert.equal(unit.headTitle, 'Kepala Biro');
        assert.equal(unit.echelon, 2);
        assert.equal(unit.parentId, 'sestama');
      } else if (unit.type === 'direktorat') {
        assert.equal(unit.headTitle, 'Direktur');
        assert.equal(unit.echelon, 2);
      } else if (unit.type === 'inspektorat') {
        assert.equal(unit.headTitle, 'Inspektur');
        assert.equal(unit.echelon, 2);
        assert.equal(unit.parentId, 'itama');
      }
    }
  });

  it('contains no square brackets "[" or "]" in any text field', () => {
    const strings = collectStrings(dataset, 'dataset');
    for (const { path: fieldPath, value } of strings) {
      assert.ok(
        !value.includes('[') && !value.includes(']'),
        `Found forbidden bracket in ${fieldPath}: ${value}`
      );
    }
  });

  it('enforces summary, tugas, and services constraints', () => {
    for (const unit of dataset.units) {
      assert.equal(typeof unit.summary, 'string');
      assert.ok(unit.summary.trim().length > 0, `Empty summary for ${unit.id}`);
      assert.ok(
        unit.summary.length <= 400,
        `Summary exceeds 400 chars (${unit.summary.length}) for ${unit.id}`
      );

      assert.ok(Array.isArray(unit.tugas), `tugas must be array for ${unit.id}`);
      assert.ok(
        unit.tugas.length <= 6,
        `tugas exceeds 6 items (${unit.tugas.length}) for ${unit.id}`
      );
      for (const [idx, item] of unit.tugas.entries()) {
        assert.equal(typeof item, 'string');
        assert.ok(item.trim().length > 0, `Empty tugas[${idx}] for ${unit.id}`);
        assert.ok(
          item.length <= 200,
          `tugas[${idx}] exceeds 200 chars (${item.length}) for ${unit.id}`
        );
      }

      assert.ok(Array.isArray(unit.services), `services must be array for ${unit.id}`);
      for (const svc of unit.services) {
        assert.equal(typeof svc, 'string');
        assert.ok(svc.trim().length > 0);
      }
    }
  });

  it('requires sources for verified units and exact fallback for unverified units', () => {
    const byId = new Map(dataset.units.map((u) => [u.id, u]));

    for (const unit of dataset.units) {
      assert.equal(typeof unit.verified, 'boolean');
      assert.ok(Array.isArray(unit.sources));

      if (unit.verified) {
        assert.ok(unit.sources.length >= 1, `Verified unit ${unit.id} must have at least one source`);
        for (const src of unit.sources) {
          assert.equal(typeof src.title, 'string');
          assert.ok(src.title.trim().length > 0);
          assert.equal(typeof src.url, 'string');
          assert.match(src.url, /^https?:\/\//);
          assert.equal(typeof src.accessedAt, 'string');
          assert.match(src.accessedAt, /^\d{4}-\d{2}-\d{2}$/);
        }
      } else {
        const parent = byId.get(unit.parentId);
        assert.ok(parent, `Unverified unit ${unit.id} must have a valid parent`);
        assert.equal(unit.tugas.length, 0, `Unverified unit ${unit.id} must have empty tugas`);
        assert.equal(
          unit.summary,
          `Bagian dari ${parent.name}. Profil lengkap akan dilengkapi bersama unit terkait.`
        );
      }
    }
  });
});

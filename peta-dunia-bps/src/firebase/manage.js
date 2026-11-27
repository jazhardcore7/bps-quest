// Management Center Firestore CRUD, validation helpers, and Indonesian error mapping
import {
  collection,
  doc,
  getDocs,
  setDoc,
  updateDoc,
  deleteDoc,
  addDoc,
  query,
  where,
  orderBy,
  limit,
  serverTimestamp,
  deleteField
} from 'firebase/firestore';
import { db } from './client.js';
import {
  QUEST_XP_MAX_HEAD,
  QUEST_XP_MAX_ADMIN,
  ROLES,
  isSuperAdminRole,
  dailyPeriodKeyJakarta
} from '../config.js';
import { refreshUnits } from './units.js';

export const ALLOWED_ROLES = [
  ROLES.EMPLOYEE,
  ROLES.HEAD_E2,
  ROLES.HEAD_E1,
  ROLES.HEAD_TOP,
  ROLES.SUPER_ADMIN,
  'admin'
];

export const VALID_UNIT_TYPES = [
  'root',
  'sekretariat',
  'deputi',
  'inspektorat-utama',
  'biro',
  'direktorat',
  'inspektorat',
  'bagian',
  'pusat'
];

export const VALID_ISLANDS = [
  'pimpinan',
  'sestama',
  'mis',
  'sosial',
  'produksi',
  'distribusi-jasa',
  'neraca',
  'itama'
];

export function mapFirestoreError(err) {
  console.error('Manage Firestore error:', err);
  const code = (err && err.code) || '';
  switch (code) {
    case 'permission-denied':
      return 'Anda tidak memiliki izin untuk melakukan tindakan ini.';
    case 'unauthenticated':
      return 'Sesi Anda telah berakhir. Silakan masuk kembali.';
    case 'not-found':
      return 'Data yang diminta tidak ditemukan.';
    case 'already-exists':
      return 'Data dengan ID tersebut sudah ada.';
    case 'failed-precondition':
      return 'Prasyarat data atau indeks Firestore belum siap.';
    case 'invalid-argument':
      return 'Format data yang dikirim tidak valid.';
    case 'unavailable':
    case 'deadline-exceeded':
    case 'auth/network-request-failed':
      return 'Koneksi ke server bermasalah. Silakan coba beberapa saat lagi.';
    default:
      return 'Terjadi kesalahan saat memproses data. Silakan coba lagi.';
  }
}

export function validateQuestInput(input, { isSuperAdmin = false } = {}) {
  const errors = [];
  const maxXp = isSuperAdmin ? QUEST_XP_MAX_ADMIN : QUEST_XP_MAX_HEAD;

  const unitId = String(input.unitId || '').trim();
  const title = String(input.title || '').trim();
  const description = String(input.description || '').trim();
  const type = String(input.type || 'daily');
  const xp = Number(input.xp);
  const active = input.active !== false;

  if (!unitId) errors.push('Unit kerja wajib dipilih.');
  if (title.length < 3 || title.length > 80) {
    errors.push('Judul quest harus 3 sampai 80 karakter.');
  }
  if (description.length > 300) {
    errors.push('Deskripsi quest maksimal 300 karakter.');
  }
  if (type !== 'daily' && type !== 'checkpoint') {
    errors.push('Tipe quest harus Harian (daily) atau Checkpoint.');
  }
  if (!Number.isInteger(xp) || xp < 1 || xp > maxXp) {
    errors.push(`XP harus berupa bilangan bulat antara 1 dan ${maxXp}.`);
  }

  let quiz = null;
  if (type === 'checkpoint') {
    const rawQuiz = input.quiz || {};
    const question = String(rawQuiz.question || '').trim();
    const rawOptions = Array.isArray(rawQuiz.options) ? rawQuiz.options : [];
    const options = rawOptions.map((o) => String(o || '').trim()).filter((o) => o.length > 0);
    const correctIndex = Number(rawQuiz.correctIndex);

    if (question.length < 3 || question.length > 200) {
      errors.push('Pertanyaan kuis harus 3 sampai 200 karakter.');
    }
    if (options.length < 2 || options.length > 4) {
      errors.push('Kuis harus memiliki 2 sampai 4 pilihan jawaban yang terisi.');
    }
    for (let i = 0; i < options.length; i++) {
      if (options[i].length > 100) {
        errors.push(`Opsi jawaban ${i + 1} maksimal 100 karakter.`);
      }
    }
    if (!Number.isInteger(correctIndex) || correctIndex < 0 || correctIndex >= options.length) {
      errors.push('Pilih jawaban benar yang sesuai dengan daftar opsi.');
    }
    quiz = { question, options, correctIndex };
  }

  return {
    valid: errors.length === 0,
    errors,
    data: {
      unitId,
      title,
      description,
      type,
      xp,
      active,
      ...(quiz ? { quiz } : {})
    }
  };
}

export function validateContentInput(input) {
  const errors = [];
  const summary = String(input.summary || '').trim();
  const tugas = Array.isArray(input.tugas)
    ? input.tugas.map((s) => String(s || '').trim()).filter(Boolean)
    : [];
  const services = Array.isArray(input.services)
    ? input.services.map((s) => String(s || '').trim()).filter(Boolean)
    : [];
  const announcements = Array.isArray(input.announcements) ? input.announcements : [];

  if (summary.length > 400) {
    errors.push('Ringkasan unit maksimal 400 karakter.');
  }
  if (tugas.length > 6) {
    errors.push('Daftar tugas maksimal 6 butir.');
  }
  tugas.forEach((item, idx) => {
    if (item.length > 200) {
      errors.push(`Butir tugas ke-${idx + 1} maksimal 200 karakter.`);
    }
  });
  if (services.length > 8) {
    errors.push('Daftar layanan maksimal 8 butir.');
  }
  services.forEach((item, idx) => {
    if (item.length > 120) {
      errors.push(`Layanan ke-${idx + 1} maksimal 120 karakter.`);
    }
  });
  if (announcements.length > 5) {
    errors.push('Pengumuman maksimal 5 item.');
  }
  announcements.forEach((ann, idx) => {
    const text = String((ann && ann.text) || '').trim();
    if (!text || text.length > 240) {
      errors.push(`Teks pengumuman ke-${idx + 1} harus 1 sampai 240 karakter.`);
    }
  });

  return {
    valid: errors.length === 0,
    errors,
    data: { summary, tugas, services, announcements }
  };
}

export function validateAllowlistInput(input) {
  const errors = [];
  const email = String(input.email || '').trim().toLowerCase();
  const displayName = String(input.displayName || '').trim();
  const unit = String(input.unit || '').trim();
  const role = String(input.role || 'employee').trim();
  const jabatan = String(input.jabatan || '').trim();
  const active = input.active !== false;

  if (!/^[^@\s]+@[^@\s]+$/.test(email)) {
    errors.push('Format alamat email tidak valid.');
  }
  if (displayName.length < 1 || displayName.length > 60 || /[<>]/.test(displayName)) {
    errors.push('Nama tampilan harus 1 sampai 60 karakter tanpa tanda < atau >.');
  }
  if (!unit) {
    errors.push('Unit kerja wajib dipilih.');
  }
  if (!ALLOWED_ROLES.includes(role)) {
    errors.push('Role tidak dikenali.');
  }
  if (jabatan.length > 80) {
    errors.push('Jabatan maksimal 80 karakter.');
  }

  return {
    valid: errors.length === 0,
    errors,
    data: {
      email,
      displayName,
      unit,
      role,
      active,
      ...(jabatan ? { jabatan } : {})
    }
  };
}

export function validateUnitStructureInput(input, { isCreate = false } = {}) {
  const errors = [];
  const id = String(input.id || '').trim().toLowerCase();
  const name = String(input.name || '').trim();
  const shortName = String(input.shortName || '').trim();
  const headTitle = String(input.headTitle || '').trim();
  const island = String(input.island || '').trim();
  const type = String(input.type || '').trim();
  const parentId = input.parentId === null || input.parentId === '' ? null : String(input.parentId).trim();
  const archived = input.archived === true;

  if (isCreate && (!id || !/^[a-z0-9][a-z0-9-]{1,48}$/.test(id))) {
    errors.push('ID unit baru harus huruf kecil/angka/tanda hubung (2-49 karakter).');
  }
  if (!name) errors.push('Nama lengkap unit wajib diisi.');
  if (!shortName) errors.push('Nama singkat unit wajib diisi.');
  if (!headTitle) errors.push('Sebutan pimpinan unit wajib diisi.');
  if (!VALID_ISLANDS.includes(island)) errors.push('Pulau unit tidak valid.');
  if (isCreate && !VALID_UNIT_TYPES.includes(type)) errors.push('Tipe unit tidak valid.');
  if (isCreate && !parentId) errors.push('Unit induk wajib dipilih.');

  return {
    valid: errors.length === 0,
    errors,
    data: { id, name, shortName, headTitle, island, type, parentId, archived }
  };
}

export function createAnnouncementItem(text, createdBy) {
  const cleanText = String(text || '').trim();
  const now = new Date();
  return {
    id: `ann-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
    text: cleanText,
    createdAt: dailyPeriodKeyJakarta(now),
    createdBy: String(createdBy || 'admin')
  };
}

export async function fetchAllQuests() {
  const snap = await getDocs(collection(db, 'quests'));
  const list = [];
  snap.forEach((docSnap) => {
    list.push({ id: docSnap.id, ...docSnap.data() });
  });
  return list.sort((a, b) => String(a.title || '').localeCompare(String(b.title || ''), 'id'));
}

export async function saveQuest({ questId = null, formInput, uid, isSuperAdmin }) {
  const validation = validateQuestInput(formInput, { isSuperAdmin });
  if (!validation.valid) {
    throw new Error(validation.errors[0]);
  }

  const basePayload = {
    ...validation.data,
    updatedBy: uid,
    updatedAt: serverTimestamp()
  };

  if (questId) {
    const updatePayload = { ...basePayload };
    if (validation.data.type === 'daily') {
      updatePayload.quiz = deleteField();
    }
    await updateDoc(doc(db, 'quests', questId), updatePayload);
    return questId;
  }

  const docRef = await addDoc(collection(db, 'quests'), {
    ...basePayload,
    createdBy: uid,
    createdAt: serverTimestamp()
  });
  return docRef.id;
}

export async function setQuestActive(questId, active, uid) {
  await updateDoc(doc(db, 'quests', questId), {
    active: Boolean(active),
    updatedBy: uid,
    updatedAt: serverTimestamp()
  });
}

export async function deleteQuestById(questId) {
  await deleteDoc(doc(db, 'quests', questId));
}

export async function fetchTeamMembers({ role, unitId }) {
  const usersCol = collection(db, 'users');
  let q;
  if (isSuperAdminRole(role)) {
    q = query(usersCol, orderBy('xp', 'desc'), limit(200));
  } else {
    q = query(
      usersCol,
      where('unitPath', 'array-contains', unitId),
      orderBy('xp', 'desc'),
      limit(200)
    );
  }
  const snap = await getDocs(q);
  const users = [];
  snap.forEach((docSnap) => {
    users.push({ uid: docSnap.id, ...docSnap.data() });
  });
  return users;
}

export async function saveUnitContent(unitId, formInput, uid) {
  const validation = validateContentInput(formInput);
  if (!validation.valid) {
    throw new Error(validation.errors[0]);
  }
  await updateDoc(doc(db, 'units', unitId), {
    summary: validation.data.summary,
    tugas: validation.data.tugas,
    services: validation.data.services,
    announcements: validation.data.announcements,
    updatedBy: uid,
    updatedAt: serverTimestamp()
  });
  return refreshUnits();
}

export async function fetchAccountsAndAllowlist() {
  const [allowSnap, usersSnap] = await Promise.all([
    getDocs(collection(db, 'allowedEmails')),
    getDocs(collection(db, 'users'))
  ]);

  const usersByEmail = new Map();
  usersSnap.forEach((d) => {
    const data = d.data();
    const email = String(data.email || '').toLowerCase();
    if (email) {
      usersByEmail.set(email, { uid: d.id, ...data });
    }
  });

  const rows = [];
  allowSnap.forEach((d) => {
    const data = d.data();
    const email = String(data.email || d.id).toLowerCase();
    const profile = usersByEmail.get(email) || null;
    rows.push({
      email,
      allowlist: {
        email,
        displayName: data.displayName || '',
        unit: data.unit || '',
        role: data.role || 'employee',
        jabatan: data.jabatan || '',
        active: data.active !== false
      },
      profile
    });
  });

  rows.sort((a, b) => a.email.localeCompare(b.email));
  return rows;
}

export async function saveAccountEntry({
  formInput,
  units,
  existingProfile = null,
  currentUid = null
}) {
  const validation = validateAllowlistInput(formInput);
  if (!validation.valid) {
    throw new Error(validation.errors[0]);
  }

  const data = validation.data;
  const allowPayload = {
    email: data.email,
    displayName: data.displayName,
    unit: data.unit,
    role: data.role,
    active: data.active,
    jabatan: data.jabatan || ''
  };

  await setDoc(doc(db, 'allowedEmails', data.email), allowPayload, { merge: true });

  if (existingProfile && existingProfile.uid) {
    const unitObj = (units || []).find((u) => u.id === data.unit);
    const unitPath = unitObj && Array.isArray(unitObj.ancestorIds)
      ? [...unitObj.ancestorIds, data.unit]
      : [data.unit];

    const isSelf = currentUid && existingProfile.uid === currentUid;
    const profileUpdates = {
      displayName: data.displayName,
      unit: data.unit,
      unitPath,
      jabatan: data.jabatan || ''
    };
    if (!isSelf) {
      profileUpdates.role = data.role;
      profileUpdates.active = data.active;
    }
    await updateDoc(doc(db, 'users', existingProfile.uid), profileUpdates);
  }
}

export async function toggleAccountActive({ entry, units, currentUid }) {
  const nextActive = !entry.allowlist.active;
  const isSelf = currentUid && entry.profile && entry.profile.uid === currentUid;
  if (isSelf) {
    throw new Error('Tidak dapat mengubah status aktif akun sendiri.');
  }

  await updateDoc(doc(db, 'allowedEmails', entry.email), {
    active: nextActive
  });

  if (entry.profile && entry.profile.uid) {
    await updateDoc(doc(db, 'users', entry.profile.uid), {
      active: nextActive
    });
  }
  return nextActive;
}

export async function updateUnitStructure(unitId, formInput, uid) {
  const validation = validateUnitStructureInput({ ...formInput, id: unitId }, { isCreate: false });
  if (!validation.valid) {
    throw new Error(validation.errors[0]);
  }
  const { name, shortName, headTitle, island, archived } = validation.data;
  await updateDoc(doc(db, 'units', unitId), {
    name,
    shortName,
    headTitle,
    island,
    archived,
    updatedBy: uid,
    updatedAt: serverTimestamp()
  });
  return refreshUnits();
}

export async function createNewUnit(formInput, units, uid) {
  const validation = validateUnitStructureInput(formInput, { isCreate: true });
  if (!validation.valid) {
    throw new Error(validation.errors[0]);
  }
  const { id, name, shortName, headTitle, island, type, parentId } = validation.data;
  if ((units || []).some((u) => u.id === id)) {
    throw new Error('ID unit sudah terdaftar.');
  }
  const parent = (units || []).find((u) => u.id === parentId);
  if (!parent) {
    throw new Error('Unit induk tidak ditemukan.');
  }

  const ancestorIds = [...(Array.isArray(parent.ancestorIds) ? parent.ancestorIds : []), parent.id];
  const echelon = type === 'deputi' || type === 'sekretariat' || type === 'inspektorat-utama'
    ? 1
    : (type === 'bagian' ? null : 2);

  await setDoc(doc(db, 'units', id), {
    id,
    name,
    shortName,
    type,
    parentId: parent.id,
    ancestorIds,
    island,
    headTitle,
    echelon,
    summary: `Bagian dari ${parent.name}. Profil lengkap akan dilengkapi bersama unit terkait.`,
    tugas: [],
    services: [],
    announcements: [],
    verified: false,
    sources: [],
    archived: false,
    updatedBy: uid,
    updatedAt: serverTimestamp()
  });

  return refreshUnits();
}

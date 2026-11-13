// Stockage local : toutes les données restent dans le téléphone (localStorage de l'app installée).
// Rien n'est jamais envoyé sur Internet.

const KEY = 'lune:v1';
const DAY_KEY = /^\d{4}-\d{2}-\d{2}$/;

export const DEFAULT_SETTINGS = {
  onboarded: false,
  cycleLength: 28,
  periodLength: 5,
  lutealLength: 14,
  goal: 'track',
  contraception: 'none',
  showFertility: true,
  theme: 'auto',
  pinHash: null,
  pinSalt: null,
  pillTime: '21:00',
  lastBackup: null,
  backupSnoozedAt: null,
  createdAt: null,
};

const NUM_RANGES = { cycleLength: [15, 60], periodLength: [1, 10], lutealLength: [10, 16] };
const ENUMS = {
  goal: ['track', 'conceive', 'avoid'],
  contraception: ['none', 'pill', 'iud_h', 'iud_cu', 'implant', 'ring', 'condom', 'other'],
  theme: ['auto', 'light', 'dark'],
};
const DAY_ENUMS = {
  flow: ['spotting', 'light', 'medium', 'heavy'],
  mucus: ['dry', 'sticky', 'creamy', 'watery', 'eggwhite'],
  sex: ['protected', 'unprotected'],
  ovuTest: ['positive', 'negative'],
  pregTest: ['positive', 'negative'],
};

export function loadState() {
  const state = { version: 1, settings: { ...DEFAULT_SETTINGS }, days: {} };
  let raw = null;
  try {
    raw = JSON.parse(localStorage.getItem(KEY) || 'null');
  } catch (e) {
    console.error('Lecture impossible', e);
  }
  if (raw && typeof raw === 'object') {
    Object.assign(state.settings, sanitizeSettings(raw.settings));
    state.days = sanitizeDays(raw.days);
  }
  return state;
}

export function saveState(state) {
  try {
    localStorage.setItem(KEY, JSON.stringify(state));
    return true;
  } catch (e) {
    console.error('Enregistrement impossible', e);
    return false;
  }
}

function isEmpty(v) {
  return v == null || v === '' || v === false || (Array.isArray(v) && v.length === 0) || Number.isNaN(v);
}

/** Fusionne `patch` dans la journée `key` et supprime les champs vides. */
export function setDay(state, key, patch) {
  const next = { ...(state.days[key] || {}), ...patch };
  for (const k of Object.keys(next)) if (isEmpty(next[k])) delete next[k];
  if (Object.keys(next).length) state.days[key] = next;
  else delete state.days[key];
}

export function clearDay(state, key) {
  delete state.days[key];
}

export function wipe() {
  localStorage.removeItem(KEY);
}

const validDate = (v) => typeof v === 'string' && !Number.isNaN(Date.parse(v));

// Vérifie le type de chaque réglage (protège contre une sauvegarde abîmée ou modifiée).
function sanitizeSettings(s) {
  if (!s || typeof s !== 'object') return {};
  const out = {};
  for (const k of Object.keys(DEFAULT_SETTINGS)) {
    if (!(k in s)) continue;
    const v = s[k];
    if (k in NUM_RANGES) {
      const n = Math.round(Number(v));
      if (Number.isFinite(n)) out[k] = Math.min(NUM_RANGES[k][1], Math.max(NUM_RANGES[k][0], n));
    } else if (k in ENUMS) {
      if (ENUMS[k].includes(v)) out[k] = v;
    } else if (k === 'pillTime') {
      if (typeof v === 'string' && /^\d{2}:\d{2}$/.test(v)) out[k] = v;
    } else if (k === 'lastBackup' || k === 'backupSnoozedAt' || k === 'createdAt') {
      if (v === null || validDate(v)) out[k] = v;
    } else if (k === 'pinHash' || k === 'pinSalt') {
      if (v === null || (typeof v === 'string' && /^[0-9a-f]+$/.test(v))) out[k] = v;
    } else if (typeof DEFAULT_SETTINGS[k] === 'boolean') {
      out[k] = !!v;
    }
  }
  return out;
}

// Ne garde que des valeurs du bon type pour une journée.
function sanitizeEntry(v) {
  const o = {};
  for (const [f, x] of Object.entries(v)) {
    if (f === 'moods' || f === 'symptoms') {
      if (Array.isArray(x)) {
        const arr = [...new Set(x.filter((s) => typeof s === 'string' && /^[a-z_]{1,30}$/.test(s)))];
        if (arr.length) o[f] = arr;
      }
    } else if (f in DAY_ENUMS) {
      if (DAY_ENUMS[f].includes(x)) o[f] = x;
    } else if (f === 'temp' || f === 'weight' || f === 'energy') {
      const n = Number(String(x).replace(',', '.'));
      if (x !== null && x !== '' && Number.isFinite(n)) o[f] = n;
    } else if (f === 'pill') {
      if (x === true) o[f] = true;
    } else if (f === 'note') {
      if (typeof x === 'string' && x.trim()) o[f] = x.slice(0, 2000);
    }
  }
  return o;
}

function sanitizeDays(days) {
  const out = {};
  if (!days || typeof days !== 'object' || Array.isArray(days)) return out;
  for (const [k, v] of Object.entries(days)) {
    if (!DAY_KEY.test(k) || !v || typeof v !== 'object' || Array.isArray(v)) continue;
    const e = sanitizeEntry(v);
    if (Object.keys(e).length) out[k] = e;
  }
  return out;
}

// ---------- Sauvegarde ----------

export function exportBackup(state) {
  const { pinHash, pinSalt, ...settings } = state.settings;
  return JSON.stringify(
    { app: 'lune', format: 1, exportedAt: new Date().toISOString(), settings, days: state.days },
    null,
    2,
  );
}

/** Renvoie { settings, days } ou lève une erreur lisible. */
export function parseBackup(text) {
  let data;
  try {
    data = JSON.parse(text);
  } catch {
    throw new Error("Ce fichier n'est pas une sauvegarde valide.");
  }
  if (!data || typeof data !== 'object' || data.app !== 'lune' || typeof data.days !== 'object') {
    throw new Error("Ce fichier ne provient pas de Lune.");
  }
  const settings = sanitizeSettings(data.settings);
  delete settings.pinHash;
  delete settings.pinSalt;
  return { settings, days: sanitizeDays(data.days) };
}

export function exportCSV(state, cycleDayOf, lbl = (field, v) => v) {
  const cols = ['date', 'jour_du_cycle', 'flux', 'humeurs', 'symptomes', 'energie', 'glaire', 'rapport', 'test_ovulation', 'test_grossesse', 'pilule', 'temperature', 'poids', 'note'];
  const q = (v) => {
    const s = String(v ?? '');
    return /[;"\n\r]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
  };
  const num = (v) => (v == null ? '' : String(v).replace('.', ','));
  const rows = Object.keys(state.days)
    .sort()
    .map((k) => {
      const d = state.days[k];
      const one = (f) => (d[f] == null ? '' : lbl(f, d[f]));
      const many = (f) => (d[f] || []).map((v) => lbl(f, v)).join(', ');
      return [
        k, cycleDayOf(k) ?? '', one('flow'), many('moods'), many('symptoms'), one('energy'), one('mucus'), one('sex'),
        one('ovuTest'), one('pregTest'), d.pill ? 'oui' : '', num(d.temp), num(d.weight), d.note,
      ].map(q).join(';');
    });
  return '﻿' + [cols.join(';'), ...rows].join('\r\n');
}

// ---------- Fichiers (partage / téléchargement) ----------

/** Propose le fichier via la feuille de partage iOS, sinon le télécharge. */
let sharing = false;
export async function shareFile(filename, mime, text, { preferDownload = false } = {}) {
  if (sharing) return 'cancelled';
  const file = new File([text], filename, { type: mime });
  if (!preferDownload && navigator.canShare && navigator.canShare({ files: [file] })) {
    sharing = true;
    try {
      await navigator.share({ files: [file], title: filename });
      return 'shared';
    } catch (e) {
      if (e && (e.name === 'AbortError' || e.name === 'InvalidStateError')) return 'cancelled';
    } finally {
      sharing = false;
    }
  }
  downloadFile(filename, mime, text);
  return 'downloaded';
}

/** Vrai quand Lune est ouverte depuis l'icône de l'écran d'accueil. */
export const isStandalone = () =>
  (window.matchMedia && matchMedia('(display-mode: standalone)').matches) || navigator.standalone === true;

export function downloadFile(filename, mime, text) {
  const url = URL.createObjectURL(new Blob([text], { type: mime }));
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  a.rel = 'noopener';
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 30000);
}

// ---------- Code de verrouillage ----------

export function randomSalt() {
  const b = crypto.getRandomValues(new Uint8Array(16));
  return [...b].map((x) => x.toString(16).padStart(2, '0')).join('');
}

export async function hashPin(pin, salt) {
  const data = new TextEncoder().encode(`${salt}:${pin}`);
  const buf = await crypto.subtle.digest('SHA-256', data);
  return [...new Uint8Array(buf)].map((x) => x.toString(16).padStart(2, '0')).join('');
}

/** Demande à iOS de ne pas effacer les données de l'app (stockage persistant). */
export async function requestPersistence() {
  try {
    if (navigator.storage && navigator.storage.persist) return await navigator.storage.persist();
  } catch {}
  return false;
}

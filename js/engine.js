/**
 * Lune — moteur de cycle (logique pure).
 *
 * Module ES sans dépendance, sans accès au DOM. Toutes les fonctions sont
 * pures : elles ne modifient jamais leurs arguments et renvoient des objets neufs.
 *
 * Conventions
 * -----------
 * - Une date est une « clé » 'YYYY-MM-DD' représentant une date civile LOCALE.
 * - L'arithmétique de dates convertit la clé en un numéro de jour entier via
 *   l'horloge UTC (aucune heure locale en jeu) : elle est donc insensible aux
 *   changements d'heure (DST). On n'ajoute jamais 86 400 000 ms à une date locale.
 * - Les clés au format fixe se comparent correctement en ordre lexicographique
 *   ('2026-01-31' < '2026-02-01'), ce qui est utilisé pour les comparaisons simples.
 */

// ───────────────────────────── Constantes ─────────────────────────────

const DAY_MS = 86400000;
const KEY_RE = /^\d{4}-\d{2}-\d{2}$/;
/** Tolérance pour les comparaisons de températures (flottants). */
const EPS = 1e-9;

const DEFAULT_SETTINGS = Object.freeze({ cycleLength: 28, periodLength: 5, lutealLength: 14 });
const SETTING_LIMITS = Object.freeze({
  cycleLength: [15, 60],
  periodLength: [1, 10],
  lutealLength: [10, 16],
});

/**
 * Durée minimale d'un cycle plausible. Il n'y a volontairement PAS de borne haute :
 * les cycles longs (SOPK/SMOP, périménopause, post-partum…) sont réels et comptent.
 */
const VALID_CYCLE_MIN = 15;
/**
 * Un cycle terminé est « suspect » (règles intermédiaires peut-être non notées) s'il dépasse
 * à la fois SUSPECT_RATIO × la durée de référence ET référence + SUSPECT_MARGIN jours.
 * L'app pose alors la question au lieu de trancher (cf. Li et al. 2020, Clue).
 */
const SUSPECT_RATIO = 1.6;
const SUSPECT_MARGIN = 10;
/** Nombre de cycles récents servant à calculer la durée de référence (médiane). */
const REFERENCE_WINDOW = 12;
/** Poids, dans la moyenne, d'un cycle long confirmé par l'utilisatrice. */
const LONG_CYCLE_WEIGHT = 0.5;
/** Borne haute de la durée moyenne utilisée pour les prévisions. */
const AVG_CYCLE_MAX = 120;

/*
 * Modèle de prévision : bayésien conjugué Normale–Inverse-Gamma → loi de Student.
 * On part de la population (a priori), puis on fait de plus en plus confiance à l'historique.
 * Valeurs tirées de la littérature (cf. reports/Prédiction des cycles irréguliers.md) :
 *  - KAPPA ≈ σ²(intra) / τ²(inter) = 2,6² / 3,7² (Bull et al. 2019) → poids des données
 *    0,67 après 1 cycle, 0,86 après 3, 0,92 après 6 ;
 *  - ALPHA, BETA : variance a priori centrée sur ≈ 3,5² j², queues épaisses pour reconnaître
 *    vite une utilisatrice très variable.
 */
const PRIOR_KAPPA = 0.5;
const PRIOR_ALPHA = 3;
const PRIOR_BETA = 24.5;
/** Nombre de cycles récents utilisés par le modèle de prévision. */
const MODEL_WINDOW = 12;
/** Ovulation observée : incertitude sur la phase lutéale (jours) et degrés de liberté. */
const OBSERVED_SCALE = 2;
const OBSERVED_NU = 10;
/** Seuils de confiance sur la largeur (jours) de la plage à 80 %. */
const CONFIDENCE_HIGH_WIDTH = 6;
const CONFIDENCE_MEDIUM_WIDTH = 14;
/** Écart médian entre cycles consécutifs au-delà duquel la variabilité est élevée (Clue, Li 2020). */
const IRREGULAR_CLD = 9;
/** Seuils cliniques « à évoquer avec un·e professionnel·le » (guide SOPK 2023, ACOG, NHS). */
const CLINICAL_SHORT = 21;
const CLINICAL_LONG = 35;
const CLINICAL_VERY_LONG = 90;
const CLINICAL_MIN_PER_YEAR = 8;
const IRREGULAR_MODES = ['auto', 'on', 'off'];
/** Durée de règles au-delà de laquelle l'échantillon est ignoré (saisie aberrante). */
const MAX_PERIOD_SAMPLE = 10;
/** Nombre de cycles / règles récents pris en compte dans les moyennes. */
const STATS_WINDOW = 6;
/** En dessous de ce nombre d'échantillons, les réglages comptent comme un échantillon de plus. */
const MIN_HISTORY = 3;
/**
 * Écart max (jours) entre cycle le plus court et le plus long pour être « régulier ».
 * 9 jours = seuil FIGO 2018 quand l'âge est inconnu (l'ancien seuil de 7 jours étiquetait
 * à tort environ une utilisatrice ordinaire sur trois).
 */
const REGULAR_MAX_VARIATION = 9;
/** Écart max entre deux jours de flux d'une même période (1 jour vide toléré). */
const PERIOD_MERGE_GAP = 2;
/** Jour de cycle minimal pour une ovulation prédite. */
const MIN_OVULATION_DAY = 7;
/** Nombre de cycles futurs projetés. */
const FUTURE_CYCLES = 12;

const PERIOD_FLOWS = new Set(['light', 'medium', 'heavy']);

// ───────────────────────────── Utilitaires internes ─────────────────────────────

function pad(n, width = 2) {
  return String(n).padStart(width, '0');
}

/** Clé → numéro de jour entier (jours depuis 1970-01-01, calculé en UTC). */
function keyToDayNumber(key) {
  const [y, m, d] = String(key).split('-').map(Number);
  // setUTCFullYear évite le piège de Date.UTC qui transforme les années 0–99 en 19xx.
  const t = new Date(0);
  t.setUTCFullYear(y, m - 1, d);
  return Math.round(t.getTime() / DAY_MS);
}

/** Numéro de jour entier → clé. */
function dayNumberToKey(n) {
  const t = new Date(n * DAY_MS);
  return `${pad(t.getUTCFullYear(), 4)}-${pad(t.getUTCMonth() + 1)}-${pad(t.getUTCDate())}`;
}

/** Normalise une clé (ex. '2026-1-5' → '2026-01-05', '2026-02-30' → '2026-03-02'). */
function normKey(key) {
  return dayNumberToKey(keyToDayNumber(key));
}

/** Vrai si `key` est une clé bien formée ET une date réelle. */
function isValidKey(key) {
  return typeof key === 'string' && KEY_RE.test(key) && normKey(key) === key;
}

/** Résout le paramètre `today` optionnel des fonctions publiques. */
function resolveToday(today) {
  return today == null ? todayKey() : normKey(today);
}

function clamp(v, min, max) {
  return Math.min(max, Math.max(min, v));
}

function round1(v) {
  return Math.round(v * 10) / 10;
}

function mean(values) {
  return values.reduce((s, v) => s + v, 0) / values.length;
}

function median(values) {
  const s = [...values].sort((a, b) => a - b);
  const m = Math.floor(s.length / 2);
  return s.length % 2 ? s[m] : (s[m - 1] + s[m]) / 2;
}

// ── Loi de Student (fonction de répartition via la fonction bêta incomplète) ──

function logGamma(z) {
  // Approximation de Lanczos (g = 7).
  const c = [0.99999999999980993, 676.5203681218851, -1259.1392167224028, 771.32342877765313,
    -176.61502916214059, 12.507343278686905, -0.13857109526572012, 9.9843695780195716e-6, 1.5056327351493116e-7];
  if (z < 0.5) return Math.log(Math.PI / Math.sin(Math.PI * z)) - logGamma(1 - z);
  const zz = z - 1;
  let x = c[0];
  for (let i = 1; i < 9; i++) x += c[i] / (zz + i);
  const t = zz + 7.5;
  return 0.5 * Math.log(2 * Math.PI) + (zz + 0.5) * Math.log(t) - t + Math.log(x);
}

function betaContinuedFraction(a, b, x) {
  const TINY = 1e-300;
  const qab = a + b;
  const qap = a + 1;
  const qam = a - 1;
  let c = 1;
  let d = 1 - (qab * x) / qap;
  if (Math.abs(d) < TINY) d = TINY;
  d = 1 / d;
  let h = d;
  for (let m = 1; m <= 300; m++) {
    const m2 = 2 * m;
    let aa = (m * (b - m) * x) / ((qam + m2) * (a + m2));
    d = 1 + aa * d;
    if (Math.abs(d) < TINY) d = TINY;
    c = 1 + aa / c;
    if (Math.abs(c) < TINY) c = TINY;
    d = 1 / d;
    h *= d * c;
    aa = (-(a + m) * (qab + m) * x) / ((a + m2) * (qap + m2));
    d = 1 + aa * d;
    if (Math.abs(d) < TINY) d = TINY;
    c = 1 + aa / c;
    if (Math.abs(c) < TINY) c = TINY;
    d = 1 / d;
    const del = d * c;
    h *= del;
    if (Math.abs(del - 1) < 3e-14) break;
  }
  return h;
}

/** Fonction bêta incomplète régularisée I_x(a, b). */
function regIncBeta(x, a, b) {
  if (x <= 0) return 0;
  if (x >= 1) return 1;
  const bt = Math.exp(logGamma(a + b) - logGamma(a) - logGamma(b) + a * Math.log(x) + b * Math.log(1 - x));
  return x < (a + 1) / (a + b + 2) ? (bt * betaContinuedFraction(a, b, x)) / a : 1 - (bt * betaContinuedFraction(b, a, 1 - x)) / b;
}

/** P(T ≤ t) pour une loi de Student à `nu` degrés de liberté. */
function studentCDF(t, nu) {
  const tail = 0.5 * regIncBeta(nu / (nu + t * t), nu / 2, 0.5);
  return t > 0 ? 1 - tail : tail;
}

/**
 * Loi discrète de la durée L du cycle en cours (jours entiers), sachant L ≥ minL
 * (« chaque jour sans règles est une information »). Renvoie [[L, probabilité], …].
 */
function lengthDistribution(center, scale, nu, minL) {
  const lo = Math.max(VALID_CYCLE_MIN, minL);
  const hi = Math.min(lo + 500, Math.max(Math.ceil(center + 10 * scale), lo + 90));
  const cdf = (x) => studentCDF((x - center) / scale, nu);
  const raw = [];
  let total = 0;
  let prev = cdf(lo - 0.5);
  for (let L = lo; L <= hi; L++) {
    const cur = cdf(L + 0.5);
    const p = Math.max(0, cur - prev);
    prev = cur;
    raw.push([L, p]);
    total += p;
  }
  if (!(total > 1e-12)) return raw.slice(0, 30).map(([L]) => [L, 1 / 30]); // très au-delà : plage plate
  return raw.map(([L, p]) => [L, p / total]);
}

function quantileOf(dist, q) {
  let acc = 0;
  for (const [L, p] of dist) {
    acc += p;
    if (acc >= q - 1e-9) return L;
  }
  return dist[dist.length - 1][0];
}

/** A posteriori Normale–Inverse-Gamma sur la durée du cycle, puis loi prédictive de Student. */
function cycleModel(countedCycles, settings) {
  const obs = countedCycles.slice(-MODEL_WINDOW).map((c) => c.length);
  const n = obs.length;
  const mu0 = settings.cycleLength;
  const xbar = n ? mean(obs) : mu0;
  const S = n ? obs.reduce((s, x) => s + (x - xbar) ** 2, 0) : 0;
  const kn = PRIOR_KAPPA + n;
  const an = PRIOR_ALPHA + n / 2;
  const bn = PRIOR_BETA + S / 2 + (PRIOR_KAPPA * n * (xbar - mu0) ** 2) / (2 * kn);
  return {
    n,
    mu: (PRIOR_KAPPA * mu0 + n * xbar) / kn,
    nu: 2 * an,
    scale: Math.sqrt((bn * (kn + 1)) / (an * kn)),
  };
}

/** Prévision des prochaines règles (plages à 50 % et 80 %, mise à jour chaque jour). */
function buildForecast(start, today, center, scale, nu) {
  const day = diffDays(start, today) + 1;
  const dist = lengthDistribution(center, scale, nu, day);
  const unconditional = lengthDistribution(center, scale, nu, VALID_CYCLE_MIN);
  const at = (d, q) => addDays(start, quantileOf(d, q));
  const width = quantileOf(dist, 0.9) - quantileOf(dist, 0.1);
  let p7 = 0;
  for (const [L, p] of dist) if (L <= day + 6) p7 += p;
  let confidence = 'low';
  if (width <= CONFIDENCE_HIGH_WIDTH) confidence = 'high';
  else if (width <= CONFIDENCE_MEDIUM_WIDTH) confidence = 'medium';
  return {
    mostLikely: at(dist, 0.5),
    from: at(dist, 0.1),
    to: at(dist, 0.9),
    from50: at(dist, 0.25),
    to50: at(dist, 0.75),
    usualTo: at(unconditional, 0.9),
    probNext7: Math.round(Math.min(1, p7) * 100) / 100,
    confidence,
  };
}

/** Écart-type de population (σ). */
function populationStdDev(values) {
  const m = mean(values);
  return Math.sqrt(mean(values.map((v) => (v - m) ** 2)));
}

/** Objet `days` sûr (jamais null). */
function asDays(days) {
  return days && typeof days === 'object' ? days : {};
}

/** Entrée d'un jour, ou null. */
function entryOf(days, key) {
  const e = Object.prototype.hasOwnProperty.call(days, key) ? days[key] : null;
  return e && typeof e === 'object' ? e : null;
}

/** Clés valides de `days`, triées par ordre chronologique. */
function sortedDayKeys(days) {
  return Object.keys(days).filter(isValidKey).sort();
}

/**
 * Réglages normalisés : valeurs absentes / non numériques → défauts,
 * arrondi à l'entier, puis bornage.
 */
function normalizeSettings(settings) {
  const src = settings && typeof settings === 'object' ? settings : {};
  const out = {};
  for (const name of Object.keys(DEFAULT_SETTINGS)) {
    const raw = src[name];
    const n = typeof raw === 'string' && raw.trim() !== '' ? Number(raw) : raw;
    const value = typeof n === 'number' && Number.isFinite(n) ? Math.round(n) : DEFAULT_SETTINGS[name];
    const [min, max] = SETTING_LIMITS[name];
    out[name] = clamp(value, min, max);
  }
  // Mode « cycles irréguliers » : 'auto' (selon la variabilité), 'on' ou 'off'.
  out.irregularMode = IRREGULAR_MODES.includes(src.irregularMode) ? src.irregularMode : 'auto';
  // Prévisions affichées (false : Lune ne montre que l'historique et les observations).
  out.showPredictions = src.showPredictions !== false;
  // Débuts de cycles longs confirmés par l'utilisatrice (« ce n'était pas un oubli »).
  out.longCycles = new Set(
    (Array.isArray(src.longCycles) ? src.longCycles : []).filter((k) => typeof k === 'string' && KEY_RE.test(k)).map(normKey),
  );
  return out;
}

/** Température d'une entrée (nombre, ou chaîne « 36,5 » / « 36.5 »), sinon null. */
function readTemp(entry) {
  if (!entry) return null;
  let v = entry.temp;
  if (typeof v === 'string' && v.trim() !== '') v = Number(v.replace(',', '.'));
  return typeof v === 'number' && Number.isFinite(v) && v > 0 ? v : null;
}

/** Valeur « significative » d'une entrée (pour `logged`). */
function isMeaningful(v) {
  if (v === null || v === undefined) return false;
  if (typeof v === 'string') return v.trim() !== '';
  if (Array.isArray(v)) return v.length > 0;
  if (typeof v === 'number') return !Number.isNaN(v);
  return true; // booléens (y compris `false`, ex. pilule non prise), objets…
}

function isLogged(entry) {
  return !!entry && Object.keys(entry).some((k) => isMeaningful(entry[k]));
}

/** Liste dédoublonnée des identifiants (chaînes non vides) d'un tableau. */
function uniqueIds(list) {
  if (!Array.isArray(list)) return [];
  return [...new Set(list.filter((x) => typeof x === 'string' && x !== ''))];
}

/** Map id → compte, triée par compte décroissant puis id croissant. */
function sortedCounts(map) {
  return [...map.entries()]
    .map(([id, count]) => ({ id, count }))
    .sort((a, b) => b.count - a.count || (a.id < b.id ? -1 : a.id > b.id ? 1 : 0));
}

function increment(map, id) {
  map.set(id, (map.get(id) || 0) + 1);
}

// ───────────────────────────── Dates (API publique) ─────────────────────────────

/** Date civile LOCALE d'un objet Date, sous forme de clé 'YYYY-MM-DD'. */
export function toKey(date) {
  return `${pad(date.getFullYear(), 4)}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`;
}

/** Clé du jour courant (heure locale). */
export function todayKey() {
  return toKey(new Date());
}

/** Clé → Date à minuit local. */
export function parseKey(key) {
  const [y, m, d] = String(key).split('-').map(Number);
  const date = new Date(2000, 0, 1);
  date.setFullYear(y, m - 1, d); // gère aussi les années 0–99
  date.setHours(0, 0, 0, 0);
  return date;
}

/** Ajoute `n` jours (négatif possible) à une clé. */
export function addDays(key, n) {
  return dayNumberToKey(keyToDayNumber(key) + Math.round(Number(n) || 0));
}

/** Nombre de jours de `a` à `b` (b − a). diffDays('2026-01-01','2026-01-03') === 2. */
export function diffDays(a, b) {
  return keyToDayNumber(b) - keyToDayNumber(a);
}

/** Toutes les clés de `from` à `to` inclus ; [] si to < from. */
export function rangeKeys(from, to) {
  const a = keyToDayNumber(from);
  const b = keyToDayNumber(to);
  const out = [];
  for (let n = a; n <= b; n++) out.push(dayNumberToKey(n));
  return out;
}

/** Vrai pour un flux de règles (light | medium | heavy). Le spotting n'en est PAS. */
export function isPeriodFlow(flow) {
  return PERIOD_FLOWS.has(flow);
}

// ───────────────────────────── Périodes & cycles ─────────────────────────────

/**
 * Regroupe les jours de flux en périodes de règles.
 * Deux jours de flux séparés d'au plus un jour vide (diffDays <= 2) appartiennent
 * à la même période. Le spotting ne crée ni ne prolonge une période.
 * @returns {{start: string, end: string, length: number}[]} ordre chronologique
 */
export function detectPeriods(days) {
  const src = asDays(days);
  const flowKeys = sortedDayKeys(src).filter((k) => {
    const e = entryOf(src, k);
    return !!e && isPeriodFlow(e.flow);
  });
  const periods = [];
  let start = null;
  let end = null;
  for (const key of flowKeys) {
    if (start !== null && diffDays(end, key) <= PERIOD_MERGE_GAP) {
      end = key;
    } else {
      if (start !== null) periods.push({ start, end, length: diffDays(start, end) + 1 });
      start = key;
      end = key;
    }
  }
  if (start !== null) periods.push({ start, end, length: diffDays(start, end) + 1 });
  return periods;
}

/**
 * Un cycle par paire de périodes consécutives (le cycle en cours n'est pas inclus).
 * @returns {{start, end, length, periodLength, valid}[]}
 */
export function computeCycles(periods) {
  const list = Array.isArray(periods) ? periods : [];
  const cycles = [];
  for (let i = 0; i + 1 < list.length; i++) {
    const cur = list[i];
    const next = list[i + 1];
    const length = diffDays(cur.start, next.start);
    cycles.push({
      start: cur.start,
      end: addDays(next.start, -1),
      length,
      periodLength: typeof cur.length === 'number' ? cur.length : diffDays(cur.start, cur.end) + 1,
      valid: length >= VALID_CYCLE_MIN,
    });
  }
  return cycles;
}

/**
 * Période « peut-être en cours » à la date `today` : la dernière période commencée
 * au plus tard `today` et dont le dernier jour de flux est assez récent pour
 * qu'un jour de flux saisi aujourd'hui la prolonge encore (diffDays(end, today) <= 2).
 * Sa durée n'est pas définitive : elle est exclue des échantillons de avgPeriod.
 */
function findOngoingPeriod(periods, today) {
  let latest = null;
  for (const p of periods) if (p.start <= today) latest = p;
  return latest && diffDays(latest.end, today) <= PERIOD_MERGE_GAP ? latest : null;
}

/** Durée au-delà de laquelle un cycle de durée `ref` paraît contenir des règles non notées. */
function suspectThreshold(ref) {
  return Math.max(Math.ceil(ref * SUSPECT_RATIO), ref + SUSPECT_MARGIN);
}

/**
 * Annote chaque cycle terminé :
 * - `suspect` : beaucoup plus long que d'habitude, pas encore confirmé → exclu des statistiques
 *   tant que l'utilisatrice n'a pas répondu ;
 * - `confirmedLong` : même situation, mais confirmé comme un vrai cycle long → compté (poids réduit) ;
 * - `expectedStart` : date vers laquelle des règles étaient attendues (pour poser la question) ;
 * - `counted` : utilisé dans les moyennes et l'écart.
 */
function annotateCycles(cycles, settings) {
  return cycles.map((c, i) => {
    const others = cycles
      .filter((o, j) => j !== i && o.valid)
      .slice(-REFERENCE_WINDOW)
      .map((o) => o.length);
    const ref = others.length >= 2 ? median(others) : settings.cycleLength;
    const looksSkipped = c.valid && c.length >= suspectThreshold(ref);
    const confirmed = settings.longCycles.has(c.start);
    return {
      ...c,
      suspect: looksSkipped && !confirmed,
      confirmedLong: looksSkipped && confirmed,
      expectedStart: looksSkipped ? addDays(c.start, Math.round(ref)) : null,
      counted: c.valid && !(looksSkipped && !confirmed),
    };
  });
}

function computeStats(days, settings, today) {
  const periods = detectPeriods(days);
  const cycles = annotateCycles(computeCycles(periods), settings);

  // ── Cycles ──
  const countedCycles = cycles.filter((c) => c.counted);
  const cycleCount = countedCycles.length;
  const recentCycles = countedCycles.slice(-STATS_WINDOW);
  const recent = recentCycles.map((c) => c.length);

  // Moyenne pondérée : un cycle long confirmé compte, mais moins qu'un cycle habituel.
  const samples = recentCycles.map((c) => ({ v: c.length, w: c.confirmedLong ? LONG_CYCLE_WEIGHT : 1 }));
  if (samples.length > 0 && samples.length < MIN_HISTORY) samples.push({ v: settings.cycleLength, w: 1 });
  const cycleMean =
    samples.length > 0 ? samples.reduce((s, x) => s + x.v * x.w, 0) / samples.reduce((s, x) => s + x.w, 0) : settings.cycleLength;
  const avgCycle = clamp(Math.round(cycleMean), SETTING_LIMITS.cycleLength[0], AVG_CYCLE_MAX);
  const avgCycleExact = round1(cycleMean);

  // Durée de référence (médiane des cycles habituels récents) pour repérer un oubli probable.
  const usual = countedCycles.filter((c) => !c.confirmedLong).slice(-REFERENCE_WINDOW).map((c) => c.length);
  const referenceCycle = usual.length >= 2 ? Math.round(median(usual)) : settings.cycleLength;

  const minCycle = recent.length > 0 ? Math.min(...recent) : null;
  const maxCycle = recent.length > 0 ? Math.max(...recent) : null;
  const variation = cycleCount >= 2 ? maxCycle - minCycle : null;
  const stdDev = cycleCount >= 2 ? round1(populationStdDev(recent)) : null;

  // Écart médian entre cycles consécutifs (indicateur robuste de variabilité, Li et al. 2020).
  const lastLengths = countedCycles.slice(-(STATS_WINDOW + 1)).map((c) => c.length);
  const diffs = [];
  for (let i = 1; i < lastLengths.length; i++) diffs.push(Math.abs(lastLengths[i] - lastLengths[i - 1]));
  const medianCLD = diffs.length ? median(diffs) : null;

  // Niveau 1 : variabilité élevée → affichage en plages (pas d'alerte).
  let regularity = 'unknown';
  if (cycleCount >= 2) {
    regularity = variation > REGULAR_MAX_VARIATION || (medianCLD !== null && medianCLD > IRREGULAR_CLD) ? 'irregular' : 'regular';
  }

  // Niveau 2 : motifs « à évoquer avec un·e professionnel·le » (jamais un diagnostic).
  const clinicalFlags = [];
  const last6 = countedCycles.slice(-STATS_WINDOW);
  if (last6.filter((c) => c.length < CLINICAL_SHORT).length >= 2) clinicalFlags.push('short');
  if (last6.filter((c) => c.length > CLINICAL_LONG).length >= 2) clinicalFlags.push('long');
  if (today && countedCycles.some((c) => c.length >= CLINICAL_VERY_LONG && diffDays(c.end, today) <= 365)) clinicalFlags.push('veryLong');
  const hasSuspect = cycles.some((c) => c.suspect);
  if (today && !hasSuspect && periods.length && diffDays(periods[0].start, today) >= 365) {
    const yearAgo = addDays(today, -365);
    const inLastYear = periods.filter((p) => p.start > yearAgo && p.start <= today).length;
    if (inLastYear < CLINICAL_MIN_PER_YEAR) clinicalFlags.push('infrequent');
  }

  let source = 'history';
  if (cycleCount === 0) source = 'settings';
  else if (cycleCount < MIN_HISTORY) source = 'blend';

  // ── Règles ──
  const ongoing = today ? findOngoingPeriod(periods, today) : null;
  const periodSamples = periods
    .filter((p) => p !== ongoing && p.length <= MAX_PERIOD_SAMPLE)
    .slice(-STATS_WINDOW)
    .map((p) => p.length);
  if (periodSamples.length > 0 && periodSamples.length < MIN_HISTORY) periodSamples.push(settings.periodLength);
  const periodMean = periodSamples.length > 0 ? mean(periodSamples) : settings.periodLength;
  const avgPeriod = clamp(Math.round(periodMean), SETTING_LIMITS.periodLength[0], SETTING_LIMITS.periodLength[1]);

  return {
    periods,
    cycles,
    cycleCount,
    avgCycle,
    avgCycleExact,
    avgPeriod,
    minCycle,
    maxCycle,
    variation,
    stdDev,
    regularity,
    source,
    referenceCycle,
    longestRecent: maxCycle,
    suspectCycles: cycles.filter((c) => c.suspect),
    medianCLD,
    clinicalFlags,
    model: cycleModel(countedCycles, settings),
  };
}

/**
 * Statistiques de cycle.
 *
 * `today` (optionnel, défaut : aujourd'hui) sert uniquement à écarter de avgPeriod
 * une période encore en cours (sa durée n'est pas connue : un seul jour saisi
 * ferait chuter la moyenne). Passer `null` pour désactiver cette exclusion.
 */
export function getStats(state, today = todayKey()) {
  return computeStats(
    asDays(state && state.days),
    normalizeSettings(state && state.settings),
    today == null ? null : normKey(today),
  );
}

// ───────────────────────────── Température (BBT) ─────────────────────────────

/**
 * Règle « 3 au-dessus de 6 » sur les relevés de [startKey, endKey].
 * Renvoie les relevés, l'ovulation (veille du 1er relevé haut) et la ligne de base.
 */
function analyzeBBT(days, startKey, endKey) {
  const src = asDays(days);
  const readings = [];
  for (const key of rangeKeys(startKey, endKey)) {
    const temp = readTemp(entryOf(src, key));
    if (temp !== null) readings.push({ key, temp });
  }
  for (let i = 6; i + 2 < readings.length; i++) {
    let base = -Infinity;
    for (let j = i - 6; j < i; j++) base = Math.max(base, readings[j].temp);
    const a = readings[i].temp;
    const b = readings[i + 1].temp;
    const c = readings[i + 2].temp;
    if (a > base + EPS && b > base + EPS && c > base + EPS && c >= base + 0.2 - EPS) {
      return { readings, ovulation: addDays(readings[i].key, -1), coverline: base };
    }
  }
  return { readings, ovulation: null, coverline: null };
}

/** Ovulation détectée par la courbe de température, ou null. */
export function detectBBTOvulation(days, startKey, endKey) {
  return analyzeBBT(days, startKey, endKey).ovulation;
}

/** Premier jour de test LH positif dans [from, to], ou null. */
function firstPositiveLH(days, from, to) {
  for (const key of rangeKeys(from, to)) {
    const e = entryOf(days, key);
    if (e && e.ovuTest === 'positive') return key;
  }
  return null;
}

/** Jour de cycle (1-based) de l'ovulation prédite pour une durée de cycle donnée. */
function predictedOvulationDay(cycleLength, lutealLength) {
  return Math.max(cycleLength - lutealLength, MIN_OVULATION_DAY);
}

/** Ovulation d'un cycle TERMINÉ : BBT, sinon 1er LH positif + 1, sinon prédiction. */
function completedCycleOvulation(days, cycle, lutealLength) {
  const bbt = detectBBTOvulation(days, cycle.start, cycle.end);
  if (bbt) return { ovulation: bbt, source: 'bbt' };
  const lh = firstPositiveLH(days, cycle.start, cycle.end);
  if (lh) return { ovulation: addDays(lh, 1), source: 'lh' };
  return {
    ovulation: addDays(cycle.start, predictedOvulationDay(cycle.length, lutealLength) - 1),
    source: 'predicted',
  };
}

// ───────────────────────────── Modèle & prédiction ─────────────────────────────

/**
 * Construit tout ce dont predict / calendarMap / symptomStats ont besoin.
 * @returns {{ days, settings, today, stats, pastPeriods, prediction, pastWindows: Map<string,{ovulation,source}> }}
 */
function buildModel(state, todayArg) {
  const today = resolveToday(todayArg);
  const days = asDays(state && state.days);
  const settings = normalizeSettings(state && state.settings);
  const stats = computeStats(days, settings, today);
  // Les périodes commençant après aujourd'hui sont ignorées pour la prédiction.
  const pastPeriods = stats.periods.filter((p) => p.start <= today);
  const pastWindows = new Map();

  if (pastPeriods.length === 0) {
    return { days, settings, today, stats, pastPeriods, pastWindows, prediction: { hasData: false, today, stats } };
  }

  const lutealLength = settings.lutealLength;
  // Durée attendue : moyenne a posteriori du modèle bayésien (la durée déclarée sert d'a priori).
  const cycleLength = clamp(Math.round(stats.model.mu), VALID_CYCLE_MIN, AVG_CYCLE_MAX);
  const periodLength = stats.avgPeriod;
  const ovuDay = predictedOvulationDay(cycleLength, lutealLength);
  // Mode « cycles irréguliers » : pas de fenêtre fertile calendaire ni de dates futures précises.
  const irregular = settings.irregularMode === 'on' || (settings.irregularMode === 'auto' && stats.regularity === 'irregular');
  const predictionsOn = settings.showPredictions;

  // ── Cycle en cours ──
  const period = pastPeriods[pastPeriods.length - 1];
  const start = period.start;
  const day = diffDays(start, today) + 1;
  const expectedEnd = addDays(start, periodLength - 1);
  const todayEntry = entryOf(days, today);
  const inPeriod = (!!todayEntry && isPeriodFlow(todayEntry.flow)) || (today >= start && today <= expectedEnd);
  const periodEnd = period.end > expectedEnd ? period.end : expectedEnd;

  let ovulation;
  let ovulationSource;
  const bbt = detectBBTOvulation(days, start, today);
  if (bbt) {
    ovulation = bbt;
    ovulationSource = 'bbt';
  } else {
    const lh = firstPositiveLH(days, start, today);
    if (lh) {
      ovulation = addDays(lh, 1);
      ovulationSource = 'lh';
    } else {
      ovulation = addDays(start, ovuDay - 1);
      ovulationSource = 'predicted';
    }
  }

  const rel = diffDays(ovulation, today); // position d'aujourd'hui par rapport à l'ovulation
  let phase;
  if (inPeriod) phase = 'menstrual';
  else if (rel >= -2 && rel <= 1) phase = 'ovulatory';
  else if (rel < -2) phase = 'follicular';
  else phase = 'luteal';

  let fertility = 'low';
  if (!inPeriod) {
    if (rel >= -2 && rel <= 0) fertility = 'peak';
    else if ((rel >= -5 && rel <= -3) || rel === 1) fertility = 'high';
  }
  // Ovulation seulement calculée alors que les cycles varient (ou prévisions masquées) :
  // impossible de situer la phase ou la fertilité, on le dit plutôt que de deviner.
  if (!inPeriod && ovulationSource === 'predicted' && (irregular || !predictionsOn)) {
    phase = 'unknown';
    fertility = 'unknown';
  }

  const current = {
    start,
    day,
    inPeriod,
    periodDay: inPeriod ? day : null,
    periodEnd,
    ovulation,
    ovulationSource,
    fertileStart: addDays(ovulation, -5),
    fertileEnd: addDays(ovulation, 1),
    phase,
    fertility,
  };

  // ── Prochaines règles & retard ──
  // Ovulation observée (BBT / LH) : la phase lutéale est stable → ovulation + luteal + 1.
  const originalNextStart =
    ovulationSource === 'bbt' || ovulationSource === 'lh'
      ? addDays(ovulation, lutealLength + 1)
      : addDays(start, cycleLength);
  const observed = ovulationSource === 'bbt' || ovulationSource === 'lh';
  // Plages de dates, recalculées chaque jour sachant que les règles ne sont pas encore arrivées.
  const forecast = observed
    ? buildForecast(start, today, diffDays(start, originalNextStart), OBSERVED_SCALE, OBSERVED_NU)
    : buildForecast(start, today, stats.model.mu, stats.model.scale, stats.model.nu);
  const late = today > originalNextStart;
  const daysLate = late ? diffDays(originalNextStart, today) : 0;
  // Dépassement : la date centrale de la loi mise à jour (et non plus « demain » chaque jour).
  const nextStart = late ? (forecast.mostLikely > today ? forecast.mostLikely : addDays(today, 1)) : originalNextStart;
  const next = { start: nextStart, end: addDays(nextStart, periodLength - 1) };

  // ── Cycles futurs ──
  const future = [];
  for (let k = 0; k < FUTURE_CYCLES; k++) {
    const periodStart = addDays(nextStart, k * cycleLength);
    const ovu = addDays(periodStart, ovuDay - 1);
    future.push({
      periodStart,
      periodEnd: addDays(periodStart, periodLength - 1),
      ovulation: ovu,
      fertileStart: addDays(ovu, -5),
      fertileEnd: addDays(ovu, 1),
    });
  }

  // ── Ovulations des cycles terminés (antérieurs au cycle en cours) ──
  for (const cycle of stats.cycles) {
    if (cycle.start >= start) continue;
    const w = completedCycleOvulation(days, cycle, lutealLength);
    // Cycle suspect (règles peut-être non notées) : pas d'ovulation calendaire inventée au milieu.
    if (cycle.suspect && w.source === 'predicted') continue;
    pastWindows.set(cycle.start, w);
  }

  // ── Cycle en cours anormalement long : règles peut-être non notées ? ──
  const askMissedPeriod = day > suspectThreshold(stats.referenceCycle) && !settings.longCycles.has(start);

  const prediction = {
    hasData: true,
    today,
    stats,
    cycleLength,
    periodLength,
    lutealLength,
    current,
    next,
    originalNextStart,
    daysUntilNext: diffDays(today, next.start),
    late,
    daysLate,
    stale: daysLate > cycleLength,
    // Plus long cycle récent compté (cycles longs confirmés inclus), ou null.
    longestRecent: stats.longestRecent,
    // { mostLikely, from, to (80 %), from50, to50 (50 %), usualTo, probNext7, confidence }
    forecast,
    // Dépasse la plage habituelle (90e centile de la loi non conditionnée).
    beyondUsual: today > forecast.usualTo,
    mode: { irregular, predictions: predictionsOn },
    // Vrai quand le cycle en cours dépasse nettement la durée habituelle sans confirmation :
    // l'app demande alors si des règles ont eu lieu vers `missedPeriodAround`.
    askMissedPeriod,
    missedPeriodAround: askMissedPeriod ? addDays(start, stats.referenceCycle) : null,
    future,
  };
  return { days, settings, today, stats, pastPeriods, pastWindows, prediction };
}

/** Prédiction complète à la date `today` (voir le contrat d'API). */
export function predict(state, today = todayKey()) {
  return buildModel(state, today).prediction;
}

/** Début du cycle (dernière période passée commencée au plus tard `key`), ou null. */
function cycleStartFor(model, key) {
  let found = null;
  for (const p of model.pastPeriods) {
    if (p.start <= key) found = p.start;
    else break;
  }
  return found;
}

/** Ovulation du cycle commençant à `cycleStart` (cycle terminé ou cycle en cours). */
function ovulationForCycle(model, cycleStart) {
  const p = model.prediction;
  if (cycleStart === p.current.start) return p.current.ovulation;
  const w = model.pastWindows.get(cycleStart);
  return w ? w.ovulation : null;
}

// ───────────────────────────── Calendrier ─────────────────────────────

/**
 * Carte jour par jour sur [fromKey, toKey] (voir le contrat d'API).
 * NB : le 3ᵉ paramètre s'appelle `endKey` ici pour ne pas masquer la fonction toKey().
 */
export function calendarMap(state, fromKey, endKey, today = todayKey()) {
  const model = buildModel(state, today);
  const { days, prediction: p } = model;
  const t = model.today;

  const predicted = new Set();
  const possible = new Set(); // plage à 80 % des prochaines règles (mode cycles irréguliers)
  const fertile = new Set();
  const ovulations = new Map(); // clé → source
  let starts = [];
  let firstStart = null;

  if (p.hasData) {
    firstStart = model.pastPeriods[0].start;

    const { irregular, predictions } = p.mode;
    // Dates futures précises seulement si les cycles sont assez réguliers et les prévisions affichées.
    const precise = predictions && !irregular;

    // (a) reste prévu des règles en cours ; (b) règles futures (ou plage possible si irréguliers).
    if (predictions && p.current.inPeriod) for (const k of rangeKeys(t, p.current.periodEnd)) predicted.add(k);
    if (precise) for (const f of p.future) for (const k of rangeKeys(f.periodStart, f.periodEnd)) predicted.add(k);
    if (predictions && irregular) for (const k of rangeKeys(p.forecast.from, p.forecast.to)) possible.add(k);

    // Fenêtres fertiles : cycles terminés, cycle en cours, cycles futurs. Hors mode précis,
    // seules les ovulations observées (température, test LH) sont affichées.
    const windows = [
      ...model.pastWindows.values(),
      { ovulation: p.current.ovulation, source: p.current.ovulationSource },
      ...(precise ? p.future.map((f) => ({ ovulation: f.ovulation, source: 'predicted' })) : []),
    ].filter((w) => precise || w.source !== 'predicted');
    for (const w of windows) {
      for (const k of rangeKeys(addDays(w.ovulation, -5), addDays(w.ovulation, 1))) fertile.add(k);
      if (!ovulations.has(w.ovulation)) ovulations.set(w.ovulation, w.source);
    }

    // Débuts de cycle : règles saisies (<= aujourd'hui) + règles futures prévues.
    starts = [...model.pastPeriods.map((pp) => pp.start), ...(precise ? p.future.map((f) => f.periodStart) : [])];
  }

  const map = {};
  let si = -1;
  for (const d of rangeKeys(fromKey, endKey)) {
    while (si + 1 < starts.length && starts[si + 1] <= d) si++;
    const e = entryOf(days, d);
    const period = !!e && isPeriodFlow(e.flow);
    const predictedPeriod = !period && predicted.has(d);
    const possiblePeriod = !period && !predictedPeriod && possible.has(d);
    const blocked = period || predictedPeriod || possiblePeriod || firstStart === null || d < firstStart;
    const isOvulation = !blocked && ovulations.has(d);
    map[d] = {
      period,
      spotting: !!e && e.flow === 'spotting',
      predictedPeriod,
      possiblePeriod,
      fertile: !blocked && fertile.has(d),
      ovulation: isOvulation,
      ovulationSource: isOvulation ? ovulations.get(d) : null,
      cycleDay: si >= 0 ? diffDays(starts[si], d) + 1 : null,
      logged: isLogged(e),
      isToday: d === t,
      isFuture: d > t,
    };
  }
  return map;
}

// ───────────────────────────── Courbe de température ─────────────────────────────

/** Points de température de [startKey, endKey], ovulation BBT et ligne de base. */
export function bbtChart(state, startKey, endKey) {
  const days = asDays(state && state.days);
  const a = analyzeBBT(days, startKey, endKey);
  return {
    points: a.readings.map((r) => ({ key: r.key, cycleDay: diffDays(startKey, r.key) + 1, temp: r.temp })),
    ovulation: a.ovulation,
    coverline: a.coverline,
  };
}

// ───────────────────────────── Symptômes ─────────────────────────────

/** Phase d'un jour passé (>= 1ʳᵉ règle, <= aujourd'hui), ou null. */
function phaseOfPastDay(model, key) {
  const p = model.prediction;
  if (!p.hasData || key > model.today) return null;
  const cycleStart = cycleStartFor(model, key);
  if (cycleStart === null) return null;
  const e = entryOf(model.days, key);
  const offset = diffDays(cycleStart, key);
  if ((e && isPeriodFlow(e.flow)) || offset < p.periodLength) return 'menstrual';
  const ovulation = ovulationForCycle(model, cycleStart);
  if (ovulation === null) return null;
  const rel = diffDays(ovulation, key);
  if (rel >= -2 && rel <= 1) return 'ovulatory';
  return rel < -2 ? 'follicular' : 'luteal';
}

/** Fréquence des symptômes et humeurs, au total et par phase du cycle. */
export function symptomStats(state, today = todayKey()) {
  const model = buildModel(state, today);
  const totalSymptoms = new Map();
  const totalMoods = new Map();
  const phases = {};
  for (const name of ['menstrual', 'follicular', 'ovulatory', 'luteal']) {
    phases[name] = { days: 0, symptoms: new Map(), moods: new Map() };
  }

  let daysLogged = 0;
  for (const key of sortedDayKeys(model.days)) {
    const e = entryOf(model.days, key);
    if (!e) continue;
    const symptoms = uniqueIds(e.symptoms);
    const moods = uniqueIds(e.moods);
    if (symptoms.length === 0 && moods.length === 0) continue;

    daysLogged++;
    symptoms.forEach((id) => increment(totalSymptoms, id));
    moods.forEach((id) => increment(totalMoods, id));

    const phase = phaseOfPastDay(model, key);
    if (phase) {
      const bucket = phases[phase];
      bucket.days++;
      symptoms.forEach((id) => increment(bucket.symptoms, id));
      moods.forEach((id) => increment(bucket.moods, id));
    }
  }

  const byPhase = {};
  for (const [name, bucket] of Object.entries(phases)) {
    byPhase[name] = { days: bucket.days, symptoms: sortedCounts(bucket.symptoms), moods: sortedCounts(bucket.moods) };
  }
  return { daysLogged, symptoms: sortedCounts(totalSymptoms), moods: sortedCounts(totalMoods), byPhase };
}

// ───────────────────────────── Export iCalendar ─────────────────────────────

/** Échappement des valeurs TEXT (RFC 5545 §3.3.11). */
function escapeText(value) {
  return String(value == null ? '' : value)
    .replace(/\\/g, '\\\\')
    .replace(/;/g, '\\;')
    .replace(/,/g, '\\,')
    .replace(/\r\n|\r|\n/g, '\\n');
}

/** Nombre d'octets UTF-8 d'un point de code (caractère issu de for…of). */
function utf8Length(ch) {
  const cp = ch.codePointAt(0);
  if (cp < 0x80) return 1;
  if (cp < 0x800) return 2;
  if (cp < 0x10000) return 3;
  return 4;
}

/**
 * Pliage des lignes > 75 octets (RFC 5545 §3.1) : CRLF + espace.
 * Le découpage se fait par point de code, donc jamais au milieu d'un caractère multi-octets.
 * Chaque ligne physique (espace de continuation compris) fait au plus 75 octets.
 */
function foldLine(line) {
  const LIMIT = 75;
  let out = '';
  let current = '';
  let bytes = 0;
  for (const ch of line) {
    const len = utf8Length(ch);
    if (bytes + len > LIMIT) {
      out += current + '\r\n';
      current = ' ';
      bytes = 1;
    }
    current += ch;
    bytes += len;
  }
  return out + current;
}

/** Durée iCalendar en minutes : heures si divisible par 60, sinon minutes ; '-' si négatif. */
function formatDuration(minutes) {
  const m = Math.round(Number(minutes) || 0);
  if (m === 0) return 'PT0M';
  const sign = m < 0 ? '-' : '';
  const abs = Math.abs(m);
  return abs % 60 === 0 ? `${sign}PT${abs / 60}H` : `${sign}PT${abs}M`;
}

function icsDate(key) {
  return normKey(key).replace(/-/g, '');
}

function icsTime(time) {
  const [h = 0, m = 0, s = 0] = String(time).split(':').map((x) => Number(x) || 0);
  return `${pad(h)}${pad(m)}${pad(s)}`;
}

function icsUtcStamp(date) {
  return date.toISOString().replace(/\.\d{3}/, '').replace(/[-:]/g, '');
}

/**
 * Construit un calendrier iCalendar (chaîne, fins de ligne CRLF).
 * events: [{ uid, title, description?, date, time?, durationMinutes?, rrule?, alarmMinutes? }]
 */
export function buildICS({ calName = 'Lune', events = [] } = {}) {
  const lines = [
    'BEGIN:VCALENDAR',
    'VERSION:2.0',
    'PRODID:-//Lune//Suivi de cycle//FR',
    'CALSCALE:GREGORIAN',
    'METHOD:PUBLISH',
    `X-WR-CALNAME:${escapeText(calName)}`,
  ];
  const stamp = icsUtcStamp(new Date());
  (Array.isArray(events) ? events : []).forEach((ev, index) => {
    const uid = String(ev.uid == null || ev.uid === '' ? `event-${index}` : ev.uid).replace(/[\r\n]/g, '');
    lines.push('BEGIN:VEVENT', `UID:${uid}@lune.app`, `DTSTAMP:${stamp}`);
    if (ev.time) {
      // Heure « flottante » : heure locale de l'appareil, sans Z ni TZID.
      const duration =
        typeof ev.durationMinutes === 'number' && Number.isFinite(ev.durationMinutes) && ev.durationMinutes > 0
          ? ev.durationMinutes
          : 15;
      lines.push(`DTSTART:${icsDate(ev.date)}T${icsTime(ev.time)}`, `DURATION:${formatDuration(duration)}`);
    } else {
      lines.push(`DTSTART;VALUE=DATE:${icsDate(ev.date)}`, `DTEND;VALUE=DATE:${icsDate(addDays(ev.date, 1))}`);
    }
    if (ev.rrule) lines.push(`RRULE:${String(ev.rrule).replace(/^RRULE:/i, '').replace(/[\r\n]/g, '')}`);
    lines.push(`SUMMARY:${escapeText(ev.title)}`);
    if (ev.description != null && ev.description !== '') lines.push(`DESCRIPTION:${escapeText(ev.description)}`);
    if (typeof ev.alarmMinutes === 'number' && Number.isFinite(ev.alarmMinutes)) {
      lines.push(
        'BEGIN:VALARM',
        'ACTION:DISPLAY',
        `DESCRIPTION:${escapeText(ev.title)}`,
        `TRIGGER:${formatDuration(ev.alarmMinutes)}`,
        'END:VALARM',
      );
    }
    lines.push('END:VEVENT');
  });
  lines.push('END:VCALENDAR');
  return lines.map(foldLine).join('\r\n') + '\r\n';
}

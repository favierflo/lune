// Lune — interface de l'application.
// Les calculs (prévisions, ovulation, statistiques) sont dans engine.js,
// le stockage dans store.js et les textes dans content.js.

import * as E from './engine.js';
import * as S from './store.js';
import * as C from './content.js';

// ---------------------------------------------------------------------------
// Utilitaires
// ---------------------------------------------------------------------------

const $ = (s, r = document) => r.querySelector(s);
const $$ = (s, r = document) => [...r.querySelectorAll(s)];
const esc = (s) => String(s ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]);
const pad = (n) => String(n).padStart(2, '0');
const clamp = (v, a, b) => Math.min(b, Math.max(a, v));

const viewEl = $('#view');
const tabbarEl = $('#tabbar');
const sheetRoot = $('#sheet-root');
const modalRoot = $('#modal-root');
const overlayRoot = $('#overlay-root');
const toastEl = $('#toast');

const dtf = (o) => new Intl.DateTimeFormat('fr-FR', o);
const F = {
  long: dtf({ weekday: 'long', day: 'numeric', month: 'long' }),
  short: dtf({ day: 'numeric', month: 'short' }),
  shortW: dtf({ weekday: 'short', day: 'numeric', month: 'short' }),
  monthYear: dtf({ month: 'long', year: 'numeric' }),
  full: dtf({ day: 'numeric', month: 'long', year: 'numeric' }),
  narrow: dtf({ weekday: 'narrow' }),
};
const cap = (s) => s.charAt(0).toUpperCase() + s.slice(1);
const fLong = (k) => cap(F.long.format(E.parseKey(k)));
const fShort = (k) => F.short.format(E.parseKey(k));
const fShortW = (k) => cap(F.shortW.format(E.parseKey(k)));
const fFull = (k) => F.full.format(E.parseKey(k));
function fRange(a, b) {
  const da = E.parseKey(a);
  const db = E.parseKey(b);
  if (da.getMonth() === db.getMonth()) return `${da.getDate()} – ${fShort(b)}`;
  return `${fShort(a)} – ${fShort(b)}`;
}
const nDays = (n) => `${n} ${Math.abs(n) > 1 ? 'jours' : 'jour'}`;
/** « entre le 3 et le 17 déc. » ou « entre le 28 nov. et le 4 déc. » */
function fBetween(a, b) {
  const da = E.parseKey(a);
  const db = E.parseKey(b);
  return da.getMonth() === db.getMonth() ? `entre le ${da.getDate()} et le ${fShort(b)}` : `entre le ${fShort(a)} et le ${fShort(b)}`;
}
const CONFIDENCE = { high: 'élevée', medium: 'moyenne', low: 'faible' };
function rel(n) {
  if (n === 0) return "aujourd'hui";
  if (n === 1) return 'demain';
  if (n === -1) return 'hier';
  return n > 0 ? `dans ${nDays(n)}` : `il y a ${nDays(-n)}`;
}
const num = (v, d) => (v == null || Number.isNaN(Number(v)) ? '' : Number(v).toFixed(d).replace('.', ','));
const parseNum = (s) => {
  const v = Number(String(s).trim().replace(',', '.'));
  return String(s).trim() === '' || Number.isNaN(v) ? null : v;
};

// ---------------------------------------------------------------------------
// Icônes
// ---------------------------------------------------------------------------

const svg = (d, w = 22, sw = 2) =>
  `<svg width="${w}" height="${w}" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="${sw}" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${d}</svg>`;
const MOON = 'M20 14.6A8.5 8.5 0 1 1 9.4 4a7 7 0 0 0 10.6 10.6z';
const I = {
  today: svg(`<path d="${MOON}"/>`, 26),
  calendar: svg('<rect x="3.5" y="5" width="17" height="15.5" rx="3.5"/><path d="M3.5 10h17M8 3v4M16 3v4"/>', 26),
  insights: svg('<path d="M5.5 20v-8M12 20V5M18.5 20v-5"/>', 26, 2.4),
  settings: svg('<path d="M4 7h9M17 7h3M4 17h3M11 17h9"/><circle cx="15" cy="7" r="2.2"/><circle cx="9" cy="17" r="2.2"/>', 26),
  plus: svg('<path d="M12 5v14M5 12h14"/>', 22, 2.4),
  chevL: svg('<path d="M15 5l-7 7 7 7"/>', 20, 2.4),
  chevR: svg('<path d="M9 5l7 7-7 7"/>', 20, 2.4),
  close: svg('<path d="M6 6l12 12M18 6L6 18"/>', 20, 2.4),
  drop: svg('<path d="M12 3c3.5 4.3 6 7.7 6 10.8a6 6 0 0 1-12 0C6 10.7 8.5 7.3 12 3z"/>', 20),
  edit: svg('<path d="M4 20h4L19 9l-4-4L4 16v4z"/><path d="M13.5 6.5l4 4"/>', 20),
  info: svg('<circle cx="12" cy="12" r="9"/><path d="M12 8v5M12 16.5v.01"/>', 20),
  lock: svg('<rect x="5" y="10.5" width="14" height="10" rx="2.5"/><path d="M8 10.5V8a4 4 0 0 1 8 0v2.5"/>', 20),
  leaf: svg('<path d="M5 19c0-8 5-13 14-14-1 9-6 14-14 14z"/><path d="M5 19l7-7"/>', 22),
  spark: svg('<path d="M12 3l1.8 5.4L19 10l-5.2 1.6L12 17l-1.8-5.4L5 10l5.2-1.6z"/>', 22),
  moon: svg(`<path d="${MOON}"/>`, 22),
  check: svg('<path d="M5 12.5l4.5 4.5L19 7.5"/>', 20, 2.6),
  download: svg('<path d="M12 4v11M7 10l5 5 5-5M5 20h14"/>', 20),
  bell: svg('<path d="M6 16v-5a6 6 0 0 1 12 0v5l1.5 2h-15z"/><path d="M10 20.5a2 2 0 0 0 4 0"/>', 20),
  heart: svg('<path d="M12 20s-7-4.5-7-10a4 4 0 0 1 7-2.6A4 4 0 0 1 19 10c0 5.5-7 10-7 10z"/>', 20),
  shield: svg('<path d="M12 3l7 3v5.5c0 4.5-3 8-7 9.5-4-1.5-7-5-7-9.5V6z"/><path d="M9 12l2 2 4-4"/>', 20),
};

const DROP_PATH = 'M12 2.5c3.6 4.4 6.2 7.9 6.2 11a6.2 6.2 0 0 1-12.4 0c0-3.1 2.6-6.6 6.2-11z';
function flowIcon(level) {
  if (level === 0) {
    return `<svg viewBox="0 0 30 30" aria-hidden="true"><g fill="currentColor"><circle cx="9" cy="17" r="2.3"/><circle cx="15" cy="11.5" r="2.3"/><circle cx="21" cy="17" r="2.3"/></g></svg>`;
  }
  const drops = {
    1: [[3, 4, 1]],
    2: [[0.64, 6.34, 0.78], [10.64, 6.34, 0.78]],
    3: [[-0.44, 9.1, 0.62], [7.56, 4.1, 0.62], [15.56, 9.1, 0.62]],
  }[level];
  return `<svg viewBox="0 0 30 30" aria-hidden="true">${drops
    .map(([x, y, s]) => `<path d="${DROP_PATH}" fill="currentColor" transform="translate(${x} ${y}) scale(${s})"/>`)
    .join('')}</svg>`;
}

const LOGO = `<img src="icons/apple-touch-icon.png" alt="" width="108" height="108">`;

// ---------------------------------------------------------------------------
// État
// ---------------------------------------------------------------------------

let state = S.loadState();
let pred = null;

const ui = {
  tab: 'today',
  calMonth: null,
  calSelected: null,
  calEdit: false,
  calAnim: '',
  sheetDay: null,
  ob: { step: 0, last: null, period: 5, cycle: 28, goal: 'track', contraception: 'none' },
};

const today = () => E.todayKey();
const showFert = () => state.settings.showFertility !== false;
/** Mode d'affichage calculé par le moteur (valeurs par défaut sans données). */
const mode = () => (pred && pred.mode) || { irregular: state.settings.irregularMode === 'on', predictions: state.settings.showPredictions !== false };
const hormonal = () => C.isHormonal(state.settings.contraception);

function refresh() {
  pred = E.predict(state, today());
}

function save() {
  if (!S.saveState(state)) toast("Impossible d'enregistrer : stockage plein ou indisponible.");
  refresh();
}

function commit() {
  save();
  renderView();
}

// ---------------------------------------------------------------------------
// Rendu principal
// ---------------------------------------------------------------------------

function applyTheme() {
  const th = state.settings.theme;
  const root = document.documentElement;
  if (th === 'light' || th === 'dark') root.dataset.theme = th;
  else delete root.dataset.theme;
  const metas = $$('meta[name="theme-color"]');
  if (th === 'light' || th === 'dark') {
    const bg = getComputedStyle(root).getPropertyValue('--bg').trim();
    metas.forEach((m) => (m.content = bg));
  } else {
    metas.forEach((m) => (m.content = m.media.includes('dark') ? '#141015' : '#FBF7F5'));
  }
}

function render() {
  applyTheme();
  if (!state.settings.onboarded) {
    tabbarEl.hidden = true;
    viewEl.innerHTML = '';
    renderOnboarding();
    return;
  }
  tabbarEl.hidden = false;
  renderTabbar();
  renderView();
}

const TABS = [
  { id: 'today', label: "Aujourd'hui", icon: I.today },
  { id: 'calendar', label: 'Calendrier', icon: I.calendar },
  { id: 'insights', label: 'Bilan', icon: I.insights },
  { id: 'settings', label: 'Réglages', icon: I.settings },
];

function renderTabbar() {
  tabbarEl.innerHTML = TABS.map(
    (t) =>
      `<button class="tab ${ui.tab === t.id ? 'on' : ''}" data-action="tab" data-tab="${t.id}" aria-label="${t.label}" ${ui.tab === t.id ? 'aria-current="page"' : ''}>${t.icon}<span>${t.label}</span></button>`,
  ).join('');
}

function renderView() {
  if (!state.settings.onboarded) return;
  const views = { today: viewToday, calendar: viewCalendar, insights: viewInsights, settings: viewSettings };
  try {
    viewEl.innerHTML = views[ui.tab]();
    if (ui.tab === 'calendar') bindCalendarSwipe();
  } catch (err) {
    // Filet de sécurité : une donnée inattendue ne doit jamais bloquer la navigation
    console.error(err);
    viewEl.innerHTML = `<header class="page-head"><div><h1>Oups</h1></div></header>
      <section class="card"><p class="muted">Cet écran n'a pas pu s'afficher. Tes données sont intactes : essaie un autre onglet, ou Réglages pour exporter une sauvegarde.</p></section>`;
  }
}

// ---------------------------------------------------------------------------
// Éléments communs
// ---------------------------------------------------------------------------

function dotClass(d) {
  const c = [];
  if (d.period) c.push('period');
  else if (d.predictedPeriod) c.push('predicted');
  else if (d.possiblePeriod) c.push('possible');
  else if (showFert() && d.ovulation) c.push('ovu');
  else if (showFert() && d.fertile) c.push('fertile');
  if (d.isToday) c.push('today');
  return c.join(' ');
}

function hasExtra(key) {
  const e = state.days[key];
  return !!e && Object.keys(e).some((f) => f !== 'flow');
}

function dotHTML(key, d) {
  const n = E.parseKey(key).getDate();
  return `<span class="dot ${dotClass(d)}">${n}${d.spotting ? '<i class="flag"></i>' : ''}${hasExtra(key) ? '<i class="logdot"></i>' : ''}</span>`;
}

function statusList(d) {
  const out = [];
  if (d.period) out.push(['Règles', 'period']);
  else if (d.predictedPeriod) out.push(['Règles prévues', 'period']);
  else if (d.possiblePeriod) out.push(['Règles possibles', 'period']);
  if (d.spotting) out.push(['Spotting', 'period']);
  if (showFert() && !d.period && !d.predictedPeriod && !d.possiblePeriod) {
    if (d.ovulation) {
      const src = { bbt: 'Ovulation (température)', mucus: 'Ovulation (glaire)', lh: 'Ovulation (test LH)' }[d.ovulationSource] || 'Ovulation estimée';
      out.push([src, 'fertile']);
    } else if (d.fertile) out.push(['Fenêtre fertile estimée', 'fertile']);
  }
  return out;
}

const label = (list, id) => list.find((x) => String(x.id) === String(id))?.label ?? id;
const MUCUS_DEFAULT_HINT = 'La glaire la plus fertile (aqueuse, blanc d’œuf) annonce l’ovulation : Lune repère le « jour pic » quand elle redevient moins fertile 3 jours de suite.';

function loggedChips(e) {
  if (!e) return '';
  const out = [];
  if (e.flow) out.push([e.flow === 'spotting' ? 'Spotting' : `Flux ${label(C.FLOW, e.flow).toLowerCase()}`, 'period']);
  (e.moods || []).forEach((m) => {
    const o = C.MOODS.find((x) => x.id === m);
    if (o) out.push([`${o.emoji} ${o.label}`, 'mood']);
  });
  (e.symptoms || []).forEach((s) => out.push([label(C.SYMPTOMS, s), 'sym']));
  if (e.energy) out.push([`Énergie ${label(C.ENERGY, e.energy).toLowerCase()}`, '']);
  if (e.mucus) out.push([e.mucus === 'nothing' ? 'Rien vu, rien senti' : `Glaire ${label(C.MUCUS, e.mucus).toLowerCase()}`, ['watery', 'eggwhite'].includes(e.mucus) ? 'fertile' : '']);
  if (e.sex) out.push([`Rapport ${label(C.SEX, e.sex).toLowerCase()}`, '']);
  if (e.ovuTest) out.push([`Test LH ${label(C.TESTS, e.ovuTest).toLowerCase()}`, e.ovuTest === 'positive' ? 'fertile' : '']);
  if (e.pregTest) out.push([`Test de grossesse ${label(C.TESTS, e.pregTest).toLowerCase()}`, '']);
  if (e.pill) out.push(['Pilule prise', '']);
  if (e.temp != null) out.push([`${num(e.temp, 2)} °C${e.tempExcluded ? ' (exclue)' : ''}`, '']);
  if (e.weight != null) out.push([`${num(e.weight, 1)} kg`, '']);
  if (e.note) out.push(['Note', '']);
  return out.map(([t, tone]) => `<span class="pill ${tone}">${esc(t)}</span>`).join('');
}

const disclaimer = () => `<p class="disclaimer">${C.DISCLAIMER}</p>`;

// ---------------------------------------------------------------------------
// Vue « Aujourd'hui »
// ---------------------------------------------------------------------------

function viewToday() {
  const t = today();
  const p = pred;
  const head = `
    <header class="page-head">
      <div><div class="eyebrow">${fLong(t)}</div><h1>Aujourd'hui</h1></div>
      <button class="icon-btn accent" data-action="open-day" data-key="${t}" aria-label="Noter ma journée">${I.plus}</button>
    </header>`;

  if (!p.hasData && p.waiting === 'postpartum') {
    const lam = p.breastfeeding
      ? '<p class="hint">L’allaitement ne protège d’une grossesse (environ 98 %) que si trois conditions sont réunies : pas de retour des règles, allaitement complet ou presque, bébé de moins de 6 mois.</p>'
      : '';
    return `${head}${weekStrip(t)}
      <div class="stack">
        <section class="card empty">
          <div class="ill">${I.heart.replace('width="20" height="20"', 'width="72" height="72"')}</div>
          <h2>Depuis ton accouchement</h2>
          <p>Accouchement le ${fFull(p.since)}. Lune attend le retour de tes règles pour reprendre ses prévisions.</p>
          <div class="hero-actions"><button class="btn btn-primary btn-block" data-action="period-today">${I.drop} Mes règles sont revenues</button></div>
        </section>
        <div class="notice period"><span class="ico">${I.info}</span><div><p><b>Une grossesse est possible avant les premières règles</b> : l’ovulation peut revenir avant elles.</p>${lam}</div></div>
        ${journalCard(t)}
      </div>${disclaimer()}`;
  }

  if (!p.hasData) {
    return `${head}${weekStrip(t)}
      <div class="stack">
        <section class="card empty">
          <div class="ill">${flowIcon(1)}</div>
          <h2>Commençons</h2>
          <p>Note le premier jour de tes règles : Lune calculera tes prochaines dates et ta fenêtre fertile.</p>
          <div class="hero-actions">
            <button class="btn btn-primary btn-block" data-action="period-today">${I.drop} Mes règles ont commencé aujourd'hui</button>
            <button class="btn btn-secondary btn-block" data-action="cal-edit">Choisir une date passée</button>
          </div>
        </section>
        ${journalCard(t)}
      </div>${disclaimer()}`;
  }

  return `${head}${weekStrip(t)}
    <div class="stack">
      ${notices(p, t)}
      ${heroCard(p, t)}
      ${state.settings.contraception === 'pill' ? pillCard(t) : ''}
      ${journalCard(t)}
      ${fertilityCard(p, t)}
      ${phaseCard(p)}
      ${upcomingCard(p, t)}
    </div>${disclaimer()}`;
}

function weekStrip(t) {
  const from = E.addDays(t, -3);
  const to = E.addDays(t, 3);
  const map = E.calendarMap(state, from, to, t);
  return `<div class="week">${E.rangeKeys(from, to)
    .map((k) => {
      const d = map[k];
      const wd = F.narrow.format(E.parseKey(k));
      return `<button class="week-day ${d.isToday ? 'is-today' : ''}" data-action="open-day" data-key="${k}" aria-label="${fLong(k)}"><span class="wd">${wd}</span>${dotHTML(k, d)}</button>`;
    })
    .join('')}</div>`;
}

// Seuils de cycle en cours, d'après les recommandations internationales (SOPK 2023, ACOG, NHS) :
// au-delà de 35 jours, note douce ; à partir de 90 jours, motif de consultation (après un test de grossesse).
const LONG_CYCLE_NOTE = 36;
const LONG_CYCLE_CONSULT = 90;
const PREG_TEST = ' Si une grossesse est possible, un test urinaire est généralement fiable dès le jour où les règles étaient attendues.';

/** Alertes en pause : contraception hormonale, post-partum/allaitement, test de grossesse positif. */
function alertsAllowed(p) {
  return !hormonal() && !p.stats.alertsPaused && !p.pregnancyPositive;
}

/** Première alerte détectée que l'utilisatrice n'a ni confirmée ni masquée. */
function pendingAlert(p) {
  if (!p.hasData || !alertsAllowed(p)) return null;
  const done = new Set([...(state.settings.alertsConfirmed || []), ...(state.settings.alertsDismissed || [])]);
  return p.stats.clinicalFlags.find((f) => CLINICAL_TEXT[f] && !done.has(f)) || null;
}

function missedQuestion(text, yesKey, noKey, noLabel) {
  return `<div class="notice"><span class="ico">${I.calendar.replace('width="26" height="26"', 'width="20" height="20"')}</span><div><p>${text}</p>
    <div class="notice-actions"><button data-action="missed-yes" data-key="${yesKey}">Oui, je les ajoute</button><button data-action="missed-no" data-key="${noKey}" style="color:var(--text-2)">${noLabel}</button></div></div></div>`;
}

function notices(p, t) {
  const out = [];
  const c = p.current;
  const preg = hormonal() ? '' : PREG_TEST;

  let asked = false;
  if (p.pregnancyPositive) {
    // Test de grossesse positif : pas d'alerte ni de message sur le cycle.
    out.push(`<div class="notice"><span class="ico">${I.heart}</span><div><p><b>Tu as noté un test de grossesse positif.</b> Lune met en pause ses alertes et ses messages sur le cycle. Pense à prendre rendez-vous avec un·e médecin, gynécologue ou sage-femme.</p></div></div>`);
  } else if (p.askMissedPeriod) {
    // Cycle en cours bien plus long que d'habitude : on demande, on ne suppose pas d'erreur.
    asked = true;
    out.push(missedQuestion(
      `Ton cycle en cours dure depuis ${nDays(c.day)}. As-tu eu des règles vers le ${fShort(p.missedPeriodAround)} sans les noter&nbsp;?`,
      p.missedPeriodAround, c.start, 'Non, pas de règles',
    ));
  } else if (!c.inPeriod && (p.mode.predictions ? (p.mode.irregular ? p.beyondUsual : p.late) : c.day >= LONG_CYCLE_CONSULT)) {
    // En mode cycles irréguliers, on ne parle de dépassement qu'au-delà de la plage habituelle.
    let msg;
    if (c.day >= LONG_CYCLE_CONSULT) {
      msg = `<b>Ton cycle dure depuis ${nDays(c.day)}.</b>${preg} Pas de règles pendant 3 mois ou plus est un motif pour en parler à un·e médecin, gynécologue ou sage-femme, qui pourra t’orienter.`;
    } else if (c.day >= LONG_CYCLE_NOTE) {
      msg = `<b>Ce cycle est plus long que tes cycles habituels</b> (jour ${c.day}).${preg}`;
    } else {
      msg = `<b>Tes règles ne sont pas encore arrivées</b> (jour ${c.day} du cycle). Stress, fatigue, voyage ou maladie peuvent décaler un cycle de quelques jours.${preg}`;
    }
    out.push(`<div class="notice period"><span class="ico">${I.info}</span><div><p>${msg}</p></div></div>`);
  }

  // Cycle terminé qui ressemble à deux cycles : on pose la question (le plus récent d'abord),
  // une seule question à la fois.
  const sus = p.stats.suspectCycles[p.stats.suspectCycles.length - 1];
  if (sus && !asked) {
    asked = true;
    out.push(missedQuestion(
      `Ton cycle du ${fShort(sus.start)} au ${fShort(sus.end)} a duré ${nDays(sus.length)}, bien plus que d’habitude. As-tu eu des règles vers le ${fShort(sus.expectedStart)} sans les noter&nbsp;?`,
      sus.expectedStart, sus.start, 'Non, c’était un cycle long',
    ));
  }

  // Alerte « à évoquer » : on demande d'abord de vérifier l'historique (comme Apple Santé).
  const alert = !asked && pendingAlert(p);
  if (alert) {
    out.push(`<div class="notice"><span class="ico">${I.info}</span><div><p><b>Lune a remarqué un point à vérifier.</b> ${CLINICAL_TEXT[alert]} Ton historique est-il complet&nbsp;?</p>
      <div class="notice-actions"><button data-action="alert-confirm" data-key="${alert}">Oui, il est complet</button><button data-action="cal-edit">Je corrige</button><button data-action="alert-dismiss" data-key="${alert}" style="color:var(--text-2)">Ne plus le signaler</button></div></div></div>`);
  }
  const logged = Object.keys(state.days).length;
  const ageOf = (iso) => (validDate(iso) ? E.diffDays(E.toKey(new Date(iso)), t) : Infinity);
  const last = validDate(state.settings.lastBackup) ? state.settings.lastBackup : null;
  const age = Math.min(ageOf(last), ageOf(state.settings.backupSnoozedAt));
  if (logged >= 14 && age > 30) {
    out.push(`<div class="notice"><span class="ico">${I.shield}</span><div><p>${last ? `Dernière sauvegarde ${rel(-ageOf(last))}.` : "Tes données n'ont jamais été sauvegardées."} Garde une copie en lieu sûr.</p><div class="notice-actions"><button data-action="export-backup">Sauvegarder</button><button data-action="dismiss-backup" style="color:var(--text-2)">Plus tard</button></div></div></div>`);
  }
  return out.join('');
}

// Arc de cercle : angles en degrés, 0 = en haut, sens horaire
function polar(cx, cy, r, a) {
  const t = ((a - 90) * Math.PI) / 180;
  return [cx + r * Math.cos(t), cy + r * Math.sin(t)];
}
function arc(cx, cy, r, a0, a1) {
  const [x0, y0] = polar(cx, cy, r, a0);
  const [x1, y1] = polar(cx, cy, r, a1);
  const large = a1 - a0 > 180 ? 1 : 0;
  return `M${x0.toFixed(2)} ${y0.toFixed(2)}A${r} ${r} 0 ${large} 1 ${x1.toFixed(2)} ${y1.toFixed(2)}`;
}

function ringSVG(p, t) {
  const c = p.current;
  const N = Math.max(2, p.late ? c.day : Math.max(E.diffDays(c.start, p.next.start), c.day));
  const end = E.addDays(c.start, N - 1);
  const cm = E.calendarMap(state, c.start, end, t);
  const ovuDay = E.diffDays(c.start, c.ovulation) + 1;
  const normalLen = E.diffDays(c.start, p.originalNextStart);
  // Couleurs de phase seulement si l'ovulation est observée ou prévisible (cycles réguliers).
  const guessPhases = c.ovulationSource !== 'predicted' || (p.mode.predictions && !p.mode.irregular);
  const cx = 150, cy = 150, r = 128;
  const per = 360 / N;
  const gap = Math.min(1.8, per * 0.25);
  let segs = '';
  for (let i = 0; i < N; i++) {
    const k = E.addDays(c.start, i);
    const d = cm[k] || {};
    let col;
    let op = 1;
    if (d.period || d.predictedPeriod) col = 'var(--period)';
    else if (showFert() && d.ovulation) col = 'var(--ovu)';
    else if (showFert() && d.fertile) { col = 'var(--fertile)'; op = 0.5; }
    else if (i >= normalLen || !guessPhases) col = 'var(--surface-3)';
    else col = i + 1 < ovuDay ? 'var(--follicular)' : 'var(--luteal)';
    if (k > t && (d.period || d.predictedPeriod || d.fertile || d.ovulation)) op *= 0.45;
    segs += `<path class="ring-seg" d="${arc(cx, cy, r, i * per + gap / 2, (i + 1) * per - gap / 2)}" style="stroke:${col};opacity:${op}"/>`;
  }
  const [mx, my] = polar(cx, cy, r, (c.day - 0.5) * per);
  const marker = `<circle cx="${mx.toFixed(2)}" cy="${my.toFixed(2)}" r="15" style="fill:var(--surface);stroke:var(--text);stroke-width:3.5"/>`;
  return `<svg viewBox="0 0 300 300" role="img" aria-label="Cycle : jour ${c.day} sur ${N}"><g fill="none" stroke-width="22">${segs}</g>${marker}</svg>`;
}

function heroCard(p, t) {
  const c = p.current;
  let lbl, big, sub, cls = '';
  if (c.inPeriod) {
    lbl = 'Règles';
    big = `<small>Jour </small>${c.periodDay}`;
    cls = 'period';
    sub = c.periodEnd > t ? `Fin estimée ${rel(E.diffDays(t, c.periodEnd))}` : 'Dernier jour estimé';
  } else if (!p.mode.predictions || (p.mode.irregular ? p.beyondUsual : p.late)) {
    // Prévisions masquées, ou cycle au-delà de l'attendu : formulation neutre, sans compteur de « retard ».
    lbl = 'Cycle en cours';
    big = `<small>Jour </small>${c.day}`;
    sub = p.longestRecent ? `Plus long cycle récent : ${p.longestRecent} j` : p.mode.predictions ? `Règles attendues vers le ${fShort(p.originalNextStart)}` : 'Prévisions masquées';
  } else if (p.mode.irregular) {
    // Cycles variables : une plage honnête plutôt qu'une date unique.
    lbl = 'Cycle en cours';
    big = `<small>Jour </small>${c.day}`;
    sub = `Règles probablement ${fBetween(p.forecast.from, p.forecast.to)}`;
  } else if (p.daysUntilNext === 0) {
    lbl = 'Règles prévues';
    big = `<span style="font-size:.62em">Aujourd'hui</span>`;
    cls = 'period';
    sub = `Jour ${c.day} du cycle`;
  } else if (showFert() && (c.fertility === 'high' || c.fertility === 'peak')) {
    lbl = t === c.ovulation ? 'Ovulation estimée' : 'Fenêtre fertile estimée';
    big = `<small>Jour </small>${c.day}`;
    cls = 'fertile';
    sub = `Règles ${rel(p.daysUntilNext)}`;
  } else {
    lbl = 'Règles dans';
    big = `${p.daysUntilNext}<small> ${p.daysUntilNext > 1 ? 'jours' : 'jour'}</small>`;
    sub = `Jour ${c.day} du cycle`;
  }

  const todayFlow = E.isPeriodFlow(state.days[t]?.flow);
  let action;
  if (todayFlow) action = `<button class="btn btn-secondary btn-block" data-action="cal-edit">${I.edit} Modifier les dates de règles</button>`;
  else if (c.inPeriod) action = `<button class="btn btn-primary btn-block" data-action="period-today">${I.drop} Noter mes règles aujourd'hui</button>`;
  else action = `<button class="btn btn-primary btn-block" data-action="period-today">${I.drop} Mes règles ont commencé</button>`;

  return `
    <section class="card hero">
      <div class="ring-wrap">
        ${ringSVG(p, t)}
        <div class="ring-center">
          <div class="ring-label">${lbl}</div>
          <div class="ring-big ${cls}">${big}</div>
          <div class="ring-sub">${sub}</div>
        </div>
      </div>
      ${showFert() && p.mode.predictions && !p.mode.irregular ? `<div class="legend"><span><i class="swatch period"></i>Règles</span><span><i class="swatch fertile"></i>Fertile</span><span><i class="swatch ovu"></i>Ovulation</span></div>` : ''}
      <div class="hero-actions">${action}</div>
    </section>`;
}

function pillCard(t) {
  const taken = !!state.days[t]?.pill;
  return `
    <section class="card card-tight">
      <div class="toggle-row">
        <div><h2>Pilule du jour</h2><p class="muted small">${taken ? 'Prise aujourd’hui ✓' : `Rappel prévu à ${esc(state.settings.pillTime)}`}</p></div>
        <button class="btn ${taken ? 'btn-secondary' : 'btn-dark'}" style="min-height:42px" data-action="pill-toggle">${taken ? 'Annuler' : 'Je l’ai prise'}</button>
      </div>
    </section>`;
}

function journalCard(t) {
  const chips = loggedChips(state.days[t]);
  return `
    <section class="card">
      <div class="card-head"><h2>Mon journal</h2><button class="card-link" data-action="open-day" data-key="${t}">${chips ? 'Modifier' : 'Noter'}</button></div>
      ${chips ? `<div class="logged-chips">${chips}</div>` : `<p class="muted small">Humeur, symptômes, température… Note ce que tu ressens aujourd'hui pour repérer tes tendances.</p>`}
    </section>`;
}

function upcomingWindow(p, t) {
  const c = p.current;
  if (c.fertileEnd >= t && !p.late) return { s: c.fertileStart, e: c.fertileEnd, o: c.ovulation, src: c.ovulationSource };
  const f = p.future[0];
  return { s: f.fertileStart, e: f.fertileEnd, o: f.ovulation, src: 'predicted' };
}

// Volontairement, cette carte n'affiche JAMAIS de niveau « faible » : une estimation calendaire
// ne permet pas de dire quand une grossesse est impossible (pas de « jours sûrs »).
const OVU_STATUS = { confirmed: 'Ovulation confirmée', probable: 'Ovulation probable' };
const OVU_SOURCE = { bbt: 'grâce à ta température', mucus: 'grâce à ta glaire (jour pic)', lh: 'd’après ton test LH' };

/** Résumé des signes observés pendant le cycle en cours (glaire, température, tests LH). */
function signalsList(p) {
  const s = p.current.signals;
  const rows = [];
  if (s.mucusPeak) rows.push(['Glaire', `jour pic le ${fShort(s.mucusPeak)}`]);
  else if (s.mucusPending) rows.push(['Glaire', `pic possible le ${fShort(s.mucusPending)}, confirmé si elle est moins fertile 3 jours de suite`]);
  else if (s.mucusOpen) rows.push(['Glaire', `fertile depuis le ${fShort(s.mucusOpen)}`]);
  const excl = s.tempExcluded ? ` · ${s.tempExcluded} relevé${s.tempExcluded > 1 ? 's' : ''} exclu${s.tempExcluded > 1 ? 's' : ''}` : '';
  if (s.tempShift) rows.push(['Température', `montée détectée le ${fShort(s.tempShift)}${s.tempRule !== 'main' ? ' (montée lente, règle d’exception)' : ''}${excl}`]);
  else if (s.tempReadings > 0) rows.push(['Température', `${s.tempReadings < 6 ? `${s.tempReadings} relevé${s.tempReadings > 1 ? 's' : ''} : il en faut au moins 6 avant la montée` : 'pas encore de montée'}${excl}`]);
  if (s.lhStatus) {
    const d = fShort(s.lhDate);
    const txt = {
      confirmed: `positif le ${d}, confirmé par un autre signe`,
      pending: `positif le ${d} : ovulation probable dans 1 à 2 jours`,
      alone: p.mode.irregular ? `positif le ${d} : pas retenu seul quand les cycles varient (faux pics fréquents)` : `positif le ${d}`,
      unconfirmed: `positif le ${d}, non confirmé par la température ou la glaire`,
      multiple: 'plusieurs pics : aucun n’est retenu sans confirmation par la température ou la glaire',
    }[s.lhStatus];
    rows.push(['Test LH', txt]);
  }
  if (!rows.length) return '';
  return `<div class="signals">${rows.map(([k, v]) => `<div class="sig-row"><span class="k">${k}</span><span class="v">${v}</span></div>`).join('')}</div>`;
}

function fertilityCard(p, t) {
  if (!showFert()) return '';
  const c = p.current;
  const goal = state.settings.goal;
  const observed = c.ovulationSource !== 'predicted';
  const signals = signalsList(p);
  const protect = goal === 'conceive' ? '' : `<p class="hint">${goal === 'avoid' ? '<b>Lune ne protège pas d’une grossesse.</b> ' : ''}Une grossesse reste possible à tout moment du cycle ; ces observations ne remplacent pas une contraception.</p>`;
  const card = (pill, line) => `
      <section class="card">
        <div class="card-head"><h2>Fertilité</h2>${pill}</div>
        ${line ? `<p class="muted small">${line}</p>` : ''}
        ${signals}
        ${protect}
      </section>`;

  // 1. Signes observés : ils priment toujours sur le calendrier.
  if (observed && c.ovulation <= t) {
    const conf = c.ovulationStatus === 'confirmed' ? ', confirmée par un second signe' : '';
    return card(`<span class="pill fertile">${OVU_STATUS[c.ovulationStatus] || 'Ovulation observée'}</span>`, `Ovulation vers le ${fShort(c.ovulation)}, repérée ${OVU_SOURCE[c.ovulationSource]}${conf}`);
  }
  if (observed) return card('<span class="pill fertile">Ovulation proche</span>', `Ton test LH annonce une ovulation probable vers le ${fShort(c.ovulation)}`);
  if (c.fertileObservedFrom) return card('<span class="pill fertile">Fenêtre ouverte</span>', `Ta glaire indique une période fertile depuis le ${fShort(c.fertileObservedFrom)}`);
  if (!p.mode.predictions) return signals ? card('<span class="pill">Observations</span>', '') : '';
  // 2. Cycles variables : pas de fenêtre calculée d'après le calendrier.
  if (p.mode.irregular) {
    return card('<span class="pill">Non estimée</span>', 'Tes cycles varient : Lune ne peut pas situer l’ovulation d’après le calendrier. Note ta glaire cervicale, tes tests d’ovulation (LH) ou ta température : Lune signalera l’ovulation quand elle sera observée.');
  }
  const w = upcomingWindow(p, t);
  const inWin = !p.late && t >= w.s && t <= w.e;
  const pill = inWin
    ? `<span class="pill fertile">${c.fertility === 'peak' ? 'Ovulation probable' : 'Fenêtre fertile estimée'}</span>`
    : '<span class="pill">Estimation</span>';
  let line;
  if (inWin) {
    const ovu = w.o === t ? "aujourd'hui" : w.o > t ? `vers le ${fShort(w.o)}` : `estimée le ${fShort(w.o)}`;
    // Pas de point final : les dates abrégées (« 7 déc. ») en ont déjà un.
    line = `Période où l’ovulation est statistiquement plus probable, jusqu’au ${fShort(w.e)} · ovulation ${ovu}`;
  } else if (c.ovulationSource !== 'predicted' && c.ovulation <= t && !p.late) {
    line = `Ovulation ${c.ovulationSource === 'bbt' ? 'repérée après coup grâce à ta température' : 'signalée par un test LH'}, vers le ${fShort(c.ovulation)}`;
  } else {
    line = `Prochaine fenêtre fertile estimée : ${fRange(w.s, w.e)}`;
  }
  const note = goal === 'conceive'
    ? 'Ces dates sont des estimations : l’ovulation peut survenir à un autre moment, surtout si tes cycles varient.'
    : `${goal === 'avoid' ? '<b>Lune ne protège pas d’une grossesse.</b> ' : ''}Ces dates sont calculées d’après le calendrier : elles ne disent pas quand une grossesse est impossible et ne remplacent pas une contraception.`;
  return `
    <section class="card">
      <div class="card-head"><h2>Fertilité</h2>${pill}</div>
      <p class="muted small">${line}</p>
      ${signals}
      <p class="hint">${note}</p>
    </section>`;
}

const PHASE_STYLE = {
  menstrual: ['var(--period-soft)', 'var(--period-ink)', I.drop],
  follicular: ['var(--follicular)', 'var(--sym-ink)', I.leaf],
  ovulatory: ['var(--fertile-soft)', 'var(--fertile-ink)', I.spark],
  luteal: ['var(--luteal)', 'var(--mood-ink)', I.moon],
};

function phaseCard(p) {
  const c = p.current;
  if (hormonal()) {
    return `
      <section class="card phase-card">
        <div class="phase-badge" style="background:var(--mood-soft);color:var(--mood-ink)">${I.shield}</div>
        <div><div class="eyebrow">Jour ${c.day} du cycle</div><h2>Contraception hormonale</h2>
        <p>Ta contraception met en pause le cycle naturel : les saignements sont généralement des « règles de privation » et il n'y a pas d'ovulation à prévoir.</p></div>
      </section>`;
  }
  if (c.phase === 'unknown') {
    return `
      <section class="card phase-card">
        <div class="phase-badge" style="background:var(--surface-2);color:var(--text-2)">${I.moon}</div>
        <div><div class="eyebrow">Jour ${c.day} du cycle</div><h2>Phase non estimée</h2>
        <p>${p.mode.predictions ? 'Tes cycles varient : Lune ne devine pas ta phase d’après le calendrier.' : 'Les prévisions sont masquées.'} La glaire, les tests d’ovulation et la température permettent de repérer l’ovulation quand elle a lieu.</p></div>
      </section>`;
  }
  const ph = p.late ? 'luteal' : c.phase;
  const info = C.PHASES[ph];
  const [bg, fg, ico] = PHASE_STYLE[ph];
  const tips = info.tips.map((x) => `<li>${esc(x)}</li>`).join('');
  return `
    <section class="card phase-card">
      <div class="phase-badge" style="background:${bg};color:${fg}">${ico}</div>
      <div><div class="eyebrow">Jour ${c.day} du cycle</div><h2>${info.title}</h2><p>${info.text}</p><ul class="tips">${tips}</ul></div>
    </section>`;
}

function kvRow(sw, k, v, sub) {
  return `<div class="kv-row"><i class="swatch ${sw}"></i><span class="k">${k}</span><span class="v">${v}${sub ? `<small>${sub}</small>` : ''}</span></div>`;
}

function upcomingCard(p, t) {
  if (!p.mode.predictions) return '';
  const f = p.forecast;
  const irregular = p.mode.irregular;
  const rows = [];
  if (!p.current.inPeriod || p.next.start > p.current.periodEnd) {
    if (irregular || p.late || f.confidence === 'low') {
      // Plage probable plutôt qu'une date unique.
      rows.push(kvRow(irregular ? 'possible' : 'period', 'Prochaines règles', cap(fBetween(f.from, f.to)), `date centrale : ${fShort(f.mostLikely)}`));
    } else {
      rows.push(kvRow('period', 'Prochaines règles', fShortW(p.next.start), `${rel(p.daysUntilNext)} · plage ${fRange(f.from, f.to)}`));
    }
    if (irregular || p.late) rows.push(kvRow('neutral', 'D’ici 7 jours', `${Math.round(f.probNext7 * 100)} %`, 'probabilité que les règles arrivent'));
  }
  if (showFert() && !irregular) {
    const w = upcomingWindow(p, t);
    if (w.e >= t) {
      rows.push(kvRow('fertile', 'Fenêtre fertile estimée', fRange(w.s, w.e), w.s > t ? rel(E.diffDays(t, w.s)) : 'en cours'));
      if (w.o >= t) rows.push(kvRow('ovu', 'Ovulation estimée', fShortW(w.o), rel(E.diffDays(t, w.o))));
    }
  }
  const f1 = p.future[1];
  if (f1 && !irregular) rows.push(kvRow('predicted', 'Règles suivantes', fShortW(f1.periodStart), rel(E.diffDays(t, f1.periodStart))));
  const fromOvu = p.current.ovulationSource !== 'predicted'
    ? ` Calculées d’après ton ovulation du ${fShort(p.current.ovulation)} et ta phase lutéale (${p.luteal.length} j).`
    : '';
  const foot = (irregular
    ? 'Tes cycles varient : Lune affiche la plage où tes règles arrivent environ 8 fois sur 10, recalculée chaque jour.'
    : `Confiance ${CONFIDENCE[f.confidence]} · la plage indique où tes règles arrivent environ 8 fois sur 10.`) + fromOvu;
  return `
    <section class="card">
      <div class="card-head"><h2>À venir</h2><button class="card-link" data-action="tab" data-tab="calendar">Calendrier</button></div>
      <div class="kv">${rows.join('')}</div>
      <p class="hint">${foot}</p>
    </section>`;
}

// ---------------------------------------------------------------------------
// Vue « Calendrier »
// ---------------------------------------------------------------------------

function monthShift(ym, delta) {
  let [y, m] = ym.split('-').map(Number);
  m += delta;
  while (m < 1) { m += 12; y--; }
  while (m > 12) { m -= 12; y++; }
  return `${y}-${pad(m)}`;
}

function viewCalendar() {
  const t = today();
  if (!ui.calMonth) ui.calMonth = t.slice(0, 7);
  if (!ui.calSelected) ui.calSelected = t;
  const first = `${ui.calMonth}-01`;
  const fd = E.parseKey(first);
  const dow = (fd.getDay() + 6) % 7;
  const dim = new Date(fd.getFullYear(), fd.getMonth() + 1, 0).getDate();
  const rows = Math.ceil((dow + dim) / 7);
  const gridStart = E.addDays(first, -dow);
  const gridEnd = E.addDays(gridStart, rows * 7 - 1);
  const map = E.calendarMap(state, gridStart, gridEnd, t);
  const isCurrent = ui.calMonth === t.slice(0, 7);

  const cells = E.rangeKeys(gridStart, gridEnd)
    .map((k) => {
      const d = map[k];
      const cls = ['cal-day'];
      if (k.slice(0, 7) !== ui.calMonth) cls.push('out');
      if (d.isFuture) cls.push('future');
      if (ui.calEdit) cls.push('edit');
      else if (k === ui.calSelected) cls.push('selected');
      return `<button class="${cls.join(' ')}" data-action="cal-day" data-key="${k}" aria-label="${fLong(k)}">${dotHTML(k, d)}</button>`;
    })
    .join('');

  const editBar = ui.calEdit
    ? `<div class="edit-bar"><span>Touche les jours de tes règles</span><button class="btn btn-primary" data-action="cal-edit-done">Terminé</button></div>`
    : '';

  const anim = ui.calAnim ? `anim-${ui.calAnim}` : '';
  ui.calAnim = '';

  return `
    <header class="page-head">
      <div><h1>Calendrier</h1></div>
      ${ui.calEdit ? '' : `<button class="icon-btn" data-action="cal-edit" aria-label="Modifier les dates de règles">${I.edit}</button>`}
    </header>
    ${editBar}
    <section class="card cal-card" id="cal-card">
      <div class="cal-head">
        <h2>${cap(F.monthYear.format(fd))}</h2>
        <div class="cal-nav">
          ${isCurrent ? '' : `<button class="pill" data-action="cal-today">Aujourd'hui</button>`}
          <button class="icon-btn flat" data-action="cal-prev" aria-label="Mois précédent">${I.chevL}</button>
          <button class="icon-btn flat" data-action="cal-next" aria-label="Mois suivant">${I.chevR}</button>
        </div>
      </div>
      <div class="cal-weekdays">${['L', 'M', 'M', 'J', 'V', 'S', 'D'].map((x) => `<span>${x}</span>`).join('')}</div>
      <div class="cal-grid ${anim}">${cells}</div>
      <div class="legend">
        <span><i class="swatch period"></i>Règles</span>
        ${mode().predictions ? (mode().irregular ? '<span><i class="swatch possible"></i>Règles possibles</span>' : '<span><i class="swatch predicted"></i>Prévues</span>') : ''}
        ${showFert() && mode().predictions && !mode().irregular ? '<span><i class="swatch fertile"></i>Fertile</span><span><i class="swatch ovu"></i>Ovulation</span>' : ''}
        ${showFert() && mode().irregular ? '<span><i class="swatch ovu"></i>Ovulation observée</span>' : ''}
      </div>
    </section>
    <div class="stack" style="margin-top:14px">${ui.calEdit ? editHelp() : dayCard(ui.calSelected, t)}</div>
    ${disclaimer()}`;
}

function editHelp() {
  return `<p class="muted small center" style="margin:4px 16px">Touche un jour pour l'ajouter ou le retirer de tes règles. Tu pourras préciser le flux dans le journal de chaque jour.</p>`;
}

function dayCard(key, t) {
  const d = E.calendarMap(state, key, key, t)[key];
  const pills = statusList(d).map(([txt, tone]) => `<span class="pill ${tone}">${txt}</span>`).join('');
  const chips = loggedChips(state.days[key]);
  const future = key > t;
  let fert = '';
  if (showFert() && !d.period && !d.predictedPeriod && (d.fertile || d.ovulation)) {
    fert = `<p class="muted small" style="margin-top:8px">${d.ovulation && d.ovulationSource !== 'predicted' ? 'Ovulation repérée grâce à tes observations.' : 'Période où l’ovulation est statistiquement plus probable (estimation).'}</p>`;
  }
  return `
    <section class="card day-card">
      <div class="card-head" style="margin-bottom:0">
        <div><h2>${key === t ? "Aujourd'hui" : fLong(key)}</h2>${d.cycleDay ? `<div class="small muted">Jour ${d.cycleDay} du cycle</div>` : ''}</div>
        ${future ? '' : `<button class="btn btn-secondary" style="min-height:40px;padding:0 16px;font-size:15px" data-action="open-day" data-key="${key}">${chips ? 'Modifier' : 'Noter'}</button>`}
      </div>
      ${pills ? `<div class="status">${pills}</div>` : ''}
      ${fert}
      ${chips ? `<div class="logged-chips" style="margin-top:12px">${chips}</div>` : ''}
      ${future && !pills ? '<p class="muted small" style="margin-top:8px">Aucune prévision particulière ce jour-là.</p>' : ''}
      ${future && pills ? '<p class="faint small" style="margin-top:8px">Prévision : elle s’affinera au fil de tes cycles.</p>' : ''}
    </section>`;
}

function bindCalendarSwipe() {
  const el = $('#cal-card');
  if (!el) return;
  let x0 = null;
  let y0 = null;
  el.addEventListener('touchstart', (e) => { x0 = e.touches[0].clientX; y0 = e.touches[0].clientY; }, { passive: true });
  el.addEventListener('touchend', (e) => {
    if (x0 == null) return;
    const dx = e.changedTouches[0].clientX - x0;
    const dy = e.changedTouches[0].clientY - y0;
    x0 = null;
    if (Math.abs(dx) > 50 && Math.abs(dx) > Math.abs(dy) * 1.5) changeMonth(dx < 0 ? 1 : -1);
  }, { passive: true });
}

function changeMonth(delta) {
  ui.calMonth = monthShift(ui.calMonth, delta);
  ui.calAnim = delta > 0 ? 'left' : 'right';
  renderView();
}

function togglePeriodDay(key) {
  const t = today();
  if (key > t) { toast('Tu ne peux pas noter de règles dans le futur.'); return; }
  const e = state.days[key] || {};
  S.setDay(state, key, { flow: E.isPeriodFlow(e.flow) ? null : 'medium' });
  commit();
}

// ---------------------------------------------------------------------------
// Feuille « journal du jour »
// ---------------------------------------------------------------------------

let sheetTimer = null;

function openDay(key) {
  clearTimeout(sheetTimer);
  flushNote();
  ui.sheetDay = key;
  document.documentElement.classList.add('noscroll');
  sheetRoot.innerHTML = `
    <div class="sheet-backdrop" data-action="close-sheet"></div>
    <div class="sheet" role="dialog" aria-modal="true" aria-label="Journal">
      <div class="sheet-head" id="sheet-head">${sheetHead(key)}</div>
      <div class="sheet-body" id="sheet-body">${sheetBody(key)}</div>
    </div>`;
  bindSheetDrag();
}

function refreshSheet() {
  const key = ui.sheetDay;
  if (!key) return;
  $('#sheet-head').innerHTML = sheetHead(key);
  const body = $('#sheet-body');
  const top = body.scrollTop;
  body.innerHTML = sheetBody(key);
  body.scrollTop = top;
}

function closeSheet() {
  const sheet = $('.sheet', sheetRoot);
  const back = $('.sheet-backdrop', sheetRoot);
  if (!sheet) return;
  flushNote();
  if (document.activeElement && sheet.contains(document.activeElement)) document.activeElement.blur();
  sheet.classList.add('closing');
  back?.classList.add('closing');
  ui.sheetDay = null;
  sheetTimer = setTimeout(() => {
    sheetRoot.innerHTML = '';
    document.documentElement.classList.remove('noscroll');
  }, 210);
  renderView();
}

function sheetSub(key) {
  const t = today();
  const d = E.calendarMap(state, key, key, t)[key];
  const parts = [];
  if (key === t) parts.push(fLong(key));
  if (d.cycleDay) parts.push(`Jour ${d.cycleDay} du cycle`);
  statusList(d).forEach(([s]) => parts.push(s));
  return parts.join(' · ');
}

function sheetHead(key) {
  const t = today();
  return `
    <div class="grabber"></div>
    <div class="sheet-title-row">
      <button class="icon-btn flat" data-action="sheet-nav" data-delta="-1" aria-label="Jour précédent">${I.chevL}</button>
      <div style="flex:1;min-width:0;text-align:center">
        <h2>${key === t ? "Aujourd'hui" : esc(fShortW(key))}</h2>
        <div class="small muted" id="sheet-sub" style="white-space:nowrap;overflow:hidden;text-overflow:ellipsis">${sheetSub(key)}</div>
      </div>
      <button class="icon-btn flat" data-action="sheet-nav" data-delta="1" aria-label="Jour suivant" ${key >= t ? 'disabled' : ''}>${I.chevR}</button>
    </div>`;
}

function chipGroup(field, options, mode, tone, e, render) {
  return options
    .map((o) => {
      const on = isOnValue(field, String(o.id), mode, e);
      const tn = typeof tone === 'function' ? tone(o) : tone;
      return `<button class="chip ${on ? 'on' : ''}" data-tone="${tn}" data-action="log" data-field="${field}" data-value="${o.id}" data-mode="${mode}" aria-pressed="${on}">${render ? render(o) : esc(o.label)}</button>`;
    })
    .join('');
}

function isOnValue(field, value, mode, e) {
  const v = e[field];
  if (mode === 'multi') return Array.isArray(v) && v.includes(value);
  if (mode === 'toggle') return !!v;
  return v != null && String(v) === value;
}

function sheetBody(key) {
  const t = today();
  const e = state.days[key] || {};
  if (key > t) {
    const d = E.calendarMap(state, key, key, t)[key];
    const pills = statusList(d).map(([txt, tone]) => `<span class="pill ${tone}">${txt}</span>`).join('');
    return `
      <section class="log-section">
        <h3>Ce jour est à venir</h3>
        ${pills ? `<div class="chips">${pills}</div>` : ''}
        <p class="hint">Tu pourras compléter ton journal le moment venu.</p>
      </section>`;
  }

  const flow = `
    <section class="log-section" data-group>
      <h3>Règles <span class="faint">Touche à nouveau pour effacer</span></h3>
      <div class="flow-grid">${C.FLOW.map((f) => {
        const on = e.flow === f.id;
        return `<button class="flow-opt ${on ? 'on' : ''}" data-action="log" data-field="flow" data-value="${f.id}" data-mode="single" aria-pressed="${on}">${flowIcon(f.level)}<span>${f.label}</span></button>`;
      }).join('')}</div>
    </section>`;

  const moods = `
    <section class="log-section" data-group>
      <h3>Humeur</h3>
      <div class="chips">${chipGroup('moods', C.MOODS, 'multi', 'mood', e, (o) => `<span class="em">${o.emoji}</span>${esc(o.label)}`)}</div>
    </section>`;

  const symptoms = `
    <section class="log-section" data-group>
      <h3>Symptômes</h3>
      <div class="chips">${chipGroup('symptoms', C.SYMPTOMS, 'multi', 'sym', e)}</div>
    </section>`;

  const energy = `
    <section class="log-section" data-group>
      <h3>Énergie</h3>
      <div class="chips">${chipGroup('energy', C.ENERGY, 'single', 'neutral', e)}</div>
    </section>`;

  const mucusHint = C.MUCUS.find((m) => m.id === e.mucus)?.hint;
  const mucus = `
    <section class="log-section" data-group>
      <h3>Glaire cervicale <span class="faint">Pertes</span></h3>
      <div class="chips">${chipGroup('mucus', C.MUCUS, 'single', (o) => (['watery', 'eggwhite'].includes(o.id) ? 'fertile' : 'neutral'), e)}</div>
      <p class="hint" id="mucus-hint">${mucusHint ? esc(mucusHint) : MUCUS_DEFAULT_HINT}</p>
    </section>`;

  const sex = `
    <section class="log-section" data-group>
      <h3>Rapport sexuel</h3>
      <div class="chips">${chipGroup('sex', C.SEX, 'single', 'neutral', e)}</div>
    </section>`;

  const tests = `
    <section class="log-section">
      <h3>Tests</h3>
      <div class="log-sub" style="margin-top:0">Test d'ovulation (LH)</div>
      <div class="chips" data-group>${chipGroup('ovuTest', C.TESTS, 'single', (o) => (o.id === 'positive' ? 'fertile' : 'neutral'), e)}</div>
      <div class="log-sub">Test de grossesse</div>
      <div class="chips" data-group>${chipGroup('pregTest', C.TESTS, 'single', 'neutral', e)}</div>
    </section>`;

  const pill = state.settings.contraception === 'pill'
    ? `<section class="log-section" data-group>
        <h3>Contraception</h3>
        <div class="chips">${chipGroup('pill', [{ id: 'true', label: 'Pilule prise' }], 'toggle', 'neutral', e, (o) => `${I.check}${o.label}`)}</div>
      </section>`
    : '';

  const temp = `
    <section class="log-section">
      <h3>Température basale <span class="faint">au réveil</span></h3>
      <div class="measure">
        <button class="icon-btn flat" data-action="measure-step" data-field="temp" data-step="-0.05" aria-label="Diminuer">−</button>
        <input id="in-temp" type="text" inputmode="decimal" autocomplete="off" placeholder="36,50" value="${num(e.temp, 2)}" data-input="temp" aria-label="Température en degrés">
        <span class="unit">°C</span>
        <button class="icon-btn flat" data-action="measure-step" data-field="temp" data-step="0.05" aria-label="Augmenter">+</button>
      </div>
      <p class="hint">Prends-la au réveil, avant de te lever, à la même heure chaque jour. Une hausse durable confirme l'ovulation.</p>
      <div class="log-sub">Relevé inhabituel ?</div>
      <div class="chips" data-group>${chipGroup('tempExcluded', C.TEMP_EXCLUDE, 'single', 'neutral', e)}</div>
      <p class="hint">Un relevé exclu reste visible mais n’est pas utilisé pour repérer l’ovulation.</p>
    </section>`;

  const weight = `
    <section class="log-section">
      <h3>Poids</h3>
      <div class="measure">
        <button class="icon-btn flat" data-action="measure-step" data-field="weight" data-step="-0.1" aria-label="Diminuer">−</button>
        <input id="in-weight" type="text" inputmode="decimal" autocomplete="off" placeholder="—" value="${num(e.weight, 1)}" data-input="weight" aria-label="Poids en kilogrammes">
        <span class="unit">kg</span>
        <button class="icon-btn flat" data-action="measure-step" data-field="weight" data-step="0.1" aria-label="Augmenter">+</button>
      </div>
    </section>`;

  const note = `
    <section class="log-section">
      <h3>Note</h3>
      <textarea class="note" id="in-note" data-input="note" placeholder="Comment te sens-tu ?" maxlength="2000">${esc(e.note || '')}</textarea>
    </section>`;

  return flow + moods + symptoms + energy + pill + mucus + sex + tests + temp + weight + note + `<div id="sheet-clear">${clearBtn(key, e)}</div>`;
}

const clearBtn = (key, e) =>
  Object.keys(e).length ? `<button class="btn btn-ghost btn-block" data-action="clear-day" data-key="${key}">Effacer cette journée</button>` : '';

function updateSheetAfterLog() {
  const key = ui.sheetDay;
  if (!key) return;
  const e = state.days[key] || {};
  $$('[data-action="log"]', sheetRoot).forEach((b) => {
    const on = isOnValue(b.dataset.field, b.dataset.value, b.dataset.mode, e);
    b.classList.toggle('on', on);
    b.setAttribute('aria-pressed', on);
  });
  const sub = $('#sheet-sub');
  if (sub) sub.textContent = sheetSub(key);
  const hint = $('#mucus-hint');
  if (hint) hint.textContent = C.MUCUS.find((m) => m.id === e.mucus)?.hint || MUCUS_DEFAULT_HINT;
  // Ne met à jour que l'emplacement du bouton : reconstruire la feuille fermerait le clavier
  const slot = $('#sheet-clear');
  if (slot && !!slot.firstElementChild !== !!Object.keys(e).length) slot.innerHTML = clearBtn(key, e);
}

function logValue(el) {
  const { field, value, mode } = el.dataset;
  const key = ui.sheetDay;
  if (!key) return;
  const e = state.days[key] || {};
  let v;
  if (mode === 'multi') {
    const set = new Set(e[field] || []);
    set.has(value) ? set.delete(value) : set.add(value);
    v = [...set];
  } else if (mode === 'toggle') {
    v = e[field] ? null : true;
  } else {
    const parsed = field === 'energy' ? Number(value) : value;
    v = e[field] === parsed ? null : parsed;
  }
  S.setDay(state, key, { [field]: v });
  save();
  updateSheetAfterLog();
  renderView();
}

const MEASURES = {
  temp: { min: 34, max: 42, digits: 2, def: 36.5 },
  weight: { min: 20, max: 300, digits: 1, def: 60 },
};

function lastValue(field, before) {
  const keys = Object.keys(state.days).filter((k) => k < before && state.days[k][field] != null).sort();
  return keys.length ? state.days[keys[keys.length - 1]][field] : null;
}

function setMeasure(field, v) {
  const key = ui.sheetDay;
  if (!key) return;
  S.setDay(state, key, { [field]: v });
  save();
  updateSheetAfterLog();
  renderView();
}

let noteTimer = null;
let pendingNote = null; // { key, value } en attente d'enregistrement

function flushNote() {
  clearTimeout(noteTimer);
  if (!pendingNote) return;
  const { key, value } = pendingNote;
  pendingNote = null;
  S.setDay(state, key, { note: value.trim() ? value : null });
  save();
  if (ui.sheetDay === key) updateSheetAfterLog();
}

const inputs = {
  temp: (el) => measureInput('temp', el),
  weight: (el) => measureInput('weight', el),
  note: (el) => {
    clearTimeout(noteTimer);
    if (!ui.sheetDay) return;
    pendingNote = { key: ui.sheetDay, value: el.value };
    noteTimer = setTimeout(() => {
      flushNote();
      renderView();
    }, 350);
  },
};

function measureInput(field, el) {
  const m = MEASURES[field];
  const v = parseNum(el.value);
  if (el.value.trim() === '') setMeasure(field, null);
  else if (v != null && v >= m.min && v <= m.max) setMeasure(field, Math.round(v * 100) / 100);
}

function measureStep(el) {
  const { field } = el.dataset;
  const step = Number(el.dataset.step);
  const m = MEASURES[field];
  const input = $(`#in-${field}`);
  const cur = parseNum(input.value) ?? lastValue(field, ui.sheetDay) ?? m.def;
  const next = clamp(Math.round((cur + (input.value.trim() === '' ? 0 : step)) * 100) / 100, m.min, m.max);
  input.value = num(next, m.digits);
  setMeasure(field, next);
}

function bindSheetDrag() {
  const head = $('#sheet-head');
  const sheet = $('.sheet', sheetRoot);
  if (!head || !sheet) return;
  let y0 = null;
  let dy = 0;
  head.addEventListener('touchstart', (e) => {
    if (e.target.closest('button')) return;
    y0 = e.touches[0].clientY;
    dy = 0;
    sheet.style.transition = 'none';
  }, { passive: true });
  head.addEventListener('touchmove', (e) => {
    if (y0 == null) return;
    dy = Math.max(0, e.touches[0].clientY - y0);
    sheet.style.transform = `translateY(${dy}px)`;
  }, { passive: true });
  head.addEventListener('touchend', () => {
    if (y0 == null) return;
    y0 = null;
    sheet.style.transition = 'transform .2s ease';
    if (dy > 110) {
      sheet.style.transform = 'translateY(100%)';
      setTimeout(closeSheet, 120);
    } else sheet.style.transform = '';
  });
}

// ---------------------------------------------------------------------------
// Vue « Bilan »
// ---------------------------------------------------------------------------

function viewInsights() {
  const t = today();
  const st = pred.stats || E.getStats(state);
  const head = `<header class="page-head"><div><h1>Bilan</h1></div></header>`;
  if (!st.periods.length) {
    return `${head}
      <section class="card empty">
        <div class="ill">${I.insights.replace('width="26" height="26"', 'width="72" height="72"')}</div>
        <h2>Pas encore de données</h2>
        <p>Note tes règles : tes statistiques apparaîtront ici dès ton premier cycle complet.</p>
      </section>${disclaimer()}`;
  }

  const regLabel = { unknown: 'À venir', regular: 'Réguliers', irregular: 'Variables' }[st.regularity];
  const regSub = st.variation == null ? 'Il faut 2 cycles complets' : `Écart de ${nDays(st.variation)}`;
  const tiles = `
    <div class="tiles">
      <div class="tile accent"><div class="t-label">Cycle moyen</div><div class="t-value">${st.avgCycle}<small>j</small></div><div class="t-sub">${st.source === 'settings' ? 'Valeur indiquée' : `Sur ${st.cycleCount} cycle${st.cycleCount > 1 ? 's' : ''}`}</div></div>
      <div class="tile"><div class="t-label">Règles</div><div class="t-value">${st.avgPeriod}<small>j</small></div><div class="t-sub">Durée moyenne</div></div>
      <div class="tile"><div class="t-label">Cycles</div><div class="t-value" style="font-size:24px;margin-top:8px">${regLabel}</div><div class="t-sub">${regSub}</div></div>
      <div class="tile"><div class="t-label">Suivi depuis</div><div class="t-value" style="font-size:24px;margin-top:8px">${fShort(st.periods[0].start)}</div><div class="t-sub">${st.periods.length} règles notées</div></div>
    </div>`;

  const irregular = st.regularity === 'irregular'
    ? `<div class="notice" style="margin-top:14px"><span class="ico">${I.info}</span><p>Tes cycles varient de ${nDays(st.variation)}. C'est fréquent${mode().irregular ? ' : Lune affiche donc des plages de dates plutôt qu’une date précise' : ''}.</p></div>`
    : '';

  return `${head}${tiles}${irregular}${clinicalCard(st)}
    ${cyclesSection(st, t)}
    ${precisionSection(st)}
    ${tempSection(t)}
    ${feelingsSection(t)}
    ${historySection(st, t)}
    ${disclaimer()}`;
}

// Motifs de consultation selon les recommandations internationales (guide SOPK 2023, ACOG, NHS).
// Formulés comme des motifs d'en parler, jamais comme un diagnostic.
const CLINICAL_TEXT = {
  short: 'Au moins 2 de tes 6 derniers cycles ont duré moins de 21 jours.',
  long: 'Au moins 2 de tes 6 derniers cycles ont duré plus de 35 jours.',
  veryLong: 'Un de tes cycles de l’année écoulée a duré 90 jours ou plus.',
  infrequent: 'Moins de 8 règles notées au cours des 12 derniers mois.',
  longPeriods: 'Au moins 2 de tes 6 dernières règles ont duré plus de 8 jours.',
  spotting: 'Des saignements entre les règles sont notés dans au moins 2 de tes 6 derniers cycles.',
  pain: 'Des douleurs intenses sont notées dans au moins 2 de tes 6 derniers cycles.',
};

function clinicalCard(st) {
  if (!pred.hasData || !alertsAllowed(pred)) {
    return st.alertsPaused && !hormonal()
      ? '<p class="muted small" style="margin:14px 6px 0">Les alertes sont en pause après un accouchement et pendant l’allaitement.</p>'
      : '';
  }
  const confirmed = new Set(state.settings.alertsConfirmed || []);
  const flags = (st.clinicalFlags || []).filter((f) => CLINICAL_TEXT[f] && confirmed.has(f));
  const waiting = pendingAlert(pred);
  if (!flags.length) {
    return waiting ? '<p class="muted small" style="margin:14px 6px 0">Un point est en attente de vérification sur l’écran Aujourd’hui.</p>' : '';
  }
  return `
    <section class="card" style="margin-top:14px">
      <div class="card-head"><h2>À évoquer avec un·e professionnel·le</h2></div>
      <ul class="tips">${flags.map((f) => `<li>${CLINICAL_TEXT[f]}</li>`).join('')}</ul>
      <p class="hint">Selon les recommandations internationales, ces situations méritent d’en parler à un·e médecin, gynécologue ou sage-femme. Ce n’est pas un diagnostic : les causes sont souvent bénignes (stress, sport intensif, changement de poids, arrêt récent d’une contraception…).</p>
      <button class="btn btn-secondary btn-block" style="margin-top:12px" data-action="open-report">${I.download} Préparer un résumé pour le rendez-vous</button>
    </section>`;
}

/** Précision mesurée sur l'historique : chaque cycle passé re-prédit à partir des précédents. */
function precisionSection(st) {
  const b = st.backtest;
  if (!b || b.n < 3) return '';
  const pct = (x) => `${Math.round(x * 100)} %`;
  const d1 = (v) => (Number.isInteger(v) ? String(v) : num(v, 1));
  const row = (k, m) => (m ? kvRow('neutral', k, `± ${d1(m.median)} j`, `${pct(m.within3)} à ± 3 jours`) : '');
  return `
    <h2 class="section-title">Précision de tes prévisions</h2>
    <section class="card">
      <div class="card-head" style="margin-bottom:6px"><h2>± ${d1(b.bayes.median)} ${b.bayes.median > 1 ? 'jours' : 'jour'}</h2><span class="pill">${b.n} cycles testés</span></div>
      <p class="muted small">Lune a refait ses prévisions pour chacun de tes cycles passés en n’utilisant que les cycles d’avant, puis les a comparées à la réalité. ${pct(b.bayes.within3)} étaient justes à ± 3 jours, et la plage annoncée contenait la vraie date ${pct(b.coverage)} du temps.</p>
      <div class="kv" style="margin-top:12px">${row('Méthode de Lune', b.bayes)}${row('Moyenne des 6 derniers', b.mean6)}${row('Médiane des 6 derniers', b.median6)}${row('Moyenne pondérée', b.weighted)}</div>
      ${b.calibration > 1 ? `<p class="hint">Tes cycles ont varié plus que prévu : Lune a élargi ses plages (×${num(b.calibration, 1)}) pour rester honnête.</p>` : ''}
      ${b.reliable ? '' : '<p class="hint">Indice encore peu parlant : il devient fiable à partir de 6 à 9 cycles.</p>'}
    </section>`;
}

function cyclesSection(st, t) {
  const rows = [];
  const p = pred;
  const done = st.cycles.slice(-8).reverse();
  const lens = done.map((c) => c.length);
  if (p.hasData) lens.push(p.current.day);
  const max = Math.max(35, ...lens);
  if (p.hasData) {
    const c = p.current;
    const lastP = st.periods[st.periods.length - 1];
    const per = lastP && lastP.start === c.start ? lastP.length : 0;
    rows.push(barRow('En cours', c.day, per, max, 'current', `${c.day} j`));
  }
  done.forEach((c) => rows.push(barRow(fShort(c.start), c.length, c.periodLength, max, c.counted ? '' : 'invalid', `${c.length} j${c.suspect ? ' ?' : ''}`)));
  return `
    <h2 class="section-title">Durée de mes cycles</h2>
    <section class="card">
      <div class="bars">${rows.join('')}</div>
      <div class="legend" style="justify-content:flex-start"><span><i class="swatch period"></i>Règles</span><span><i class="swatch" style="background:var(--luteal)"></i>Reste du cycle</span></div>
      ${st.cycles.length ? '' : '<p class="hint">Ton premier cycle sera complet au début de tes prochaines règles.</p>'}
    </section>`;
}

function barRow(lbl, len, per, max, cls, val) {
  const w = (len / max) * 100;
  const pw = len ? Math.min(100, (per / len) * 100) : 0;
  return `<div class="bar-row"><span class="b-label">${lbl}</span><div class="bar-track"><div class="bar-fill ${cls}" style="width:${w.toFixed(1)}%"><div class="bp" style="width:${pw.toFixed(1)}%"></div></div></div><span class="b-val">${val}</span></div>`;
}

function tempSection(t) {
  if (!pred.hasData) return '';
  const c = pred.current;
  const bc = E.bbtChart(state, c.start, t);
  if (bc.points.length + bc.excluded.length < 2) {
    return `
      <h2 class="section-title">Température basale</h2>
      <section class="card"><p class="muted small">Note ta température chaque matin dans ton journal : la courbe de ton cycle s'affichera ici et Lune repérera la hausse qui suit l'ovulation.</p></section>`;
  }
  return `
    <h2 class="section-title">Température basale · cycle en cours</h2>
    <section class="card">${tempChart(bc, pred.cycleLength)}
      ${bc.ovulation
        ? `<p class="hint">Hausse détectée${bc.rule !== 'main' ? ' (montée lente, règle d’exception)' : ''} : ovulation estimée le ${fShort(bc.ovulation)}</p>`
        : '<p class="hint">Après l’ovulation, la température monte d’environ 0,2 à 0,5 °C et reste haute jusqu’aux règles.</p>'}
      ${bc.excluded.length ? `<p class="hint">Les points gris sont des relevés exclus (alcool, fièvre, nuit courte…) : ils ne servent pas à repérer l’ovulation.</p>` : ''}
    </section>`;
}

function tempChart(bc, cycleLen) {
  const W = 340, H = 180, L = 34, R = 10, T = 14, B = 24;
  const pts = bc.points;
  const excl = bc.excluded || [];
  const temps = [...pts, ...excl].map((p) => p.temp);
  let lo = Math.min(...temps) - 0.1;
  let hi = Math.max(...temps) + 0.1;
  if (hi - lo < 0.5) { const m = (hi + lo) / 2; lo = m - 0.25; hi = m + 0.25; }
  const maxDay = Math.max(cycleLen, ...pts.map((p) => p.cycleDay));
  const x = (d) => L + ((d - 1) / Math.max(1, maxDay - 1)) * (W - L - R);
  const y = (v) => T + ((hi - v) / (hi - lo)) * (H - T - B);
  let g = '';
  for (let i = 0; i <= 3; i++) {
    const v = lo + ((hi - lo) * i) / 3;
    g += `<line x1="${L}" x2="${W - R}" y1="${y(v)}" y2="${y(v)}" style="stroke:var(--line)"/><text x="${L - 6}" y="${y(v) + 3}" text-anchor="end">${num(v, 1)}</text>`;
  }
  [1, 7, 14, 21, 28, 35, 42].filter((d) => d <= maxDay).forEach((d) => {
    g += `<text x="${x(d)}" y="${H - 6}" text-anchor="middle">J${d}</text>`;
  });
  if (bc.coverline != null) {
    g += `<line x1="${L}" x2="${W - R}" y1="${y(bc.coverline)}" y2="${y(bc.coverline)}" style="stroke:var(--fertile);stroke-dasharray:4 4;stroke-width:1.5"/>`;
  }
  if (bc.ovulation) {
    const od = pts.find((p) => p.key === bc.ovulation)?.cycleDay ?? E.diffDays(pts[0].key, bc.ovulation) + pts[0].cycleDay;
    g += `<line x1="${x(od)}" x2="${x(od)}" y1="${T}" y2="${H - B}" style="stroke:var(--fertile);stroke-width:1.5;stroke-dasharray:2 3"/><text x="${x(od) + 4}" y="${T + 8}" style="fill:var(--fertile-ink);font-weight:600">Ovulation</text>`;
  }
  const line = pts.map((p) => `${x(p.cycleDay).toFixed(1)},${y(p.temp).toFixed(1)}`).join(' ');
  const dots = pts.map((p) => `<circle cx="${x(p.cycleDay).toFixed(1)}" cy="${y(p.temp).toFixed(1)}" r="3.2" style="fill:var(--surface);stroke:var(--mood);stroke-width:2"/>`).join('');
  const exDots = excl.map((p) => `<circle cx="${x(p.cycleDay).toFixed(1)}" cy="${y(p.temp).toFixed(1)}" r="3.2" style="fill:var(--surface);stroke:var(--text-3);stroke-width:1.5;stroke-dasharray:2 1.5"/>`).join('');
  return `<svg class="chart" viewBox="0 0 ${W} ${H}" role="img" aria-label="Courbe de température">${g}<polyline points="${line}" style="fill:none;stroke:var(--mood);stroke-width:2;stroke-linejoin:round"/>${dots}${exDots}</svg>`;
}

function feelingsSection(t) {
  const ss = E.symptomStats(state, t);
  if (!ss.daysLogged) {
    return `
      <h2 class="section-title">Mes ressentis</h2>
      <section class="card"><p class="muted small">Note ton humeur et tes symptômes : Lune te montrera ce qui revient le plus souvent, et à quel moment du cycle.</p></section>`;
  }
  const items = [
    ...ss.symptoms.map((s) => ({ ...s, lbl: label(C.SYMPTOMS, s.id), tone: 'var(--sym)' })),
    ...ss.moods.map((m) => {
      const o = C.MOODS.find((x) => x.id === m.id);
      return { ...m, lbl: o ? `${o.emoji} ${o.label}` : m.id, tone: 'var(--mood)' };
    }),
  ].sort((a, b) => b.count - a.count).slice(0, 6);
  const max = Math.max(...items.map((i) => i.count), 1);
  const freq = items.map((i) => `
    <div class="freq-row"><div><div class="f-top"><span>${esc(i.lbl)}</span></div><div class="freq-track"><div class="freq-fill" style="width:${((i.count / max) * 100).toFixed(0)}%;background:${i.tone}"></div></div></div><span class="f-count">${i.count}×</span></div>`).join('');

  const order = ['menstrual', 'follicular', 'ovulatory', 'luteal'];
  const dotCol = { menstrual: 'var(--period)', follicular: 'var(--sym)', ovulatory: 'var(--fertile)', luteal: 'var(--mood)' };
  const phases = order
    .map((ph) => {
      const b = ss.byPhase?.[ph];
      if (!b || !b.days) return '';
      const top = [
        ...(b.symptoms || []).map((s) => ({ ...s, l: label(C.SYMPTOMS, s.id) })),
        ...(b.moods || []).map((m) => ({ ...m, l: label(C.MOODS, m.id) })),
      ].sort((a, c) => c.count - a.count).slice(0, 3);
      if (!top.length) return '';
      return `<div class="phase-line"><i class="pd" style="background:${dotCol[ph]}"></i><div><b>${C.PHASES[ph].name}</b><p>${top.map((x) => esc(x.l)).join(' · ')}</p></div></div>`;
    })
    .join('');

  return `
    <h2 class="section-title">Mes ressentis</h2>
    <section class="card"><div class="freq">${freq}</div><p class="hint">Sur ${nDays(ss.daysLogged)} renseignés.</p></section>
    ${phases && !hormonal() && !mode().irregular ? `<h2 class="section-title">Selon la phase du cycle</h2><section class="card" style="padding-top:6px;padding-bottom:6px">${phases}</section>` : ''}`;
}

function historySection(st, t) {
  const rows = [];
  if (pred.hasData) {
    rows.push(`<div class="history-row"><span>Depuis le ${fShort(pred.current.start)}</span><span class="h-len">en cours · ${nDays(pred.current.day)}</span></div>`);
  }
  const ovuOf = new Map((pred.pastOvulations || []).map((o) => [o.start, o]));
  const OVU_TAG = { confirmed: 'ovulation confirmée', probable: 'ovulation probable', notDetected: 'aucune montée de température détectée' };
  st.cycles.slice().reverse().forEach((c) => {
    const tags = [];
    if (c.suspect) tags.push('à confirmer (règles non notées ?)');
    else if (c.confirmedLong) tags.push('cycle long confirmé');
    const o = ovuOf.get(c.start);
    if (o && OVU_TAG[o.status]) tags.push(o.ovulation ? `${OVU_TAG[o.status]} le ${fShort(o.ovulation)}` : OVU_TAG[o.status]);
    rows.push(`<div class="history-row"><span>${fShort(c.start)} → ${fShort(c.end)}<br><span class="small muted">Règles : ${nDays(c.periodLength)}${tags.map((x) => ` · ${x}`).join('')}</span></span><span class="h-len">${nDays(c.length)}</span></div>`);
  });
  return `${lutealSection()}<h2 class="section-title">Historique</h2><section class="card" style="padding-top:6px;padding-bottom:6px"><div class="history">${rows.join('')}</div></section>`;
}

/** Phase lutéale apprise sur les cycles où l'ovulation a été observée. */
function lutealSection() {
  const l = pred.luteal;
  if (!pred.hasData || !l || !l.n) return '';
  const notes = [];
  if (l.repeatedShort) notes.push('Plusieurs phases lutéales de 10 jours ou moins : c’est un point à évoquer avec un·e professionnel·le si tu essaies de concevoir.');
  else if (l.lastShort) notes.push('Ta dernière phase lutéale a été courte (10 jours ou moins). C’est fréquent sur un cycle isolé et rarement répété : elle n’est pas prise en compte dans la moyenne.');
  return `
    <h2 class="section-title">Phase lutéale</h2>
    <section class="card">
      <div class="card-head" style="margin-bottom:6px"><h2>${l.length} jours</h2><span class="pill">${l.n} cycle${l.n > 1 ? 's' : ''} observé${l.n > 1 ? 's' : ''}</span></div>
      <p class="muted small">Durée entre ton ovulation et tes règles, apprise sur tes cycles où l’ovulation a été repérée (température, glaire ou test LH). Lune s’en sert pour annoncer tes règles une fois l’ovulation observée.</p>
      ${notes.map((n) => `<p class="hint">${n}</p>`).join('')}
    </section>`;
}

// ---------------------------------------------------------------------------
// Vue « Réglages »
// ---------------------------------------------------------------------------

const STEP_LIMITS = { cycleLength: [20, 45], periodLength: [2, 10], lutealLength: [10, 16] };

function stepper(field) {
  const v = state.settings[field];
  return `<div class="stepper"><button data-action="set-step" data-field="${field}" data-delta="-1" aria-label="Moins">−</button><output>${esc(v)} j</output><button data-action="set-step" data-field="${field}" data-delta="1" aria-label="Plus">+</button></div>`;
}

function toggle(name, on, aria) {
  return `<label class="switch"><input type="checkbox" role="switch" aria-label="${esc(aria)}" data-change="${name}" ${on ? 'checked' : ''}><span class="track"></span></label>`;
}

const validDate = (v) => typeof v === 'string' && !Number.isNaN(Date.parse(v));

function dateField(name, value, aria) {
  return `<span class="date-field"><input type="date" max="${today()}" value="${esc(value || '')}" data-change="${name}" aria-label="${esc(aria)}">${value ? `<button class="icon-btn flat" data-action="ctx-clear" data-field="${name.replace('ctx-', '')}" aria-label="Effacer la date">${I.close}</button>` : ''}</span>`;
}

/** Situation signalée par l'utilisatrice : adapte les prévisions, ne pose jamais de diagnostic. */
function situationSection(s) {
  const c = s.context || {};
  const reset = pred.stats?.context?.resetFrom;
  const since = reset ? ` Depuis le ${fShort(reset)}, Lune compte ${nDays(pred.stats.context.cyclesSinceReset).replace('jour', 'cycle')} pour ses prévisions.` : '';
  return `
    <h2 class="section-title">Ma situation</h2>
    <div class="list">
      <div class="row"><span class="label">SOPK (désormais SMOP)<small>Syndrome des ovaires polykystiques</small></span>${toggle('ctx-pcos', c.pcos, 'SOPK')}</div>
      <div class="row"><span class="label">Périménopause</span>${toggle('ctx-perimenopause', c.perimenopause, 'Périménopause')}</div>
      <div class="row"><span class="label">Sport intensif ou perte de poids</span>${toggle('ctx-sport', c.sport, 'Sport intensif ou perte de poids')}</div>
      <div class="row"><span class="label">Accouchement récent<small>${c.birthDate ? `Le ${fFull(c.birthDate)}` : 'Date de l’accouchement'}</small></span>${dateField('ctx-birthDate', c.birthDate, 'Date de l’accouchement')}</div>
      ${c.birthDate ? `<div class="row"><span class="label">J’allaite</span>${toggle('ctx-breastfeeding', c.breastfeeding, 'Allaitement')}</div>` : ''}
      <div class="row"><span class="label">Arrêt d’une contraception hormonale<small>${c.contraceptionStop ? `Le ${fFull(c.contraceptionStop)}` : 'Pilule, implant, stérilet hormonal…'}</small></span>${dateField('ctx-contraceptionStop', c.contraceptionStop, 'Date d’arrêt de la contraception')}</div>
    </div>
    <p class="list-foot">Ces informations restent sur ton téléphone et ne servent qu’à adapter les prévisions : plages plus larges et pas de fenêtre fertile calculée d’après le calendrier. Lune ne pose jamais de diagnostic. Après un accouchement ou l’arrêt d’une contraception, les cycles d’avant ne comptent plus.${since}</p>`;
}

function setContext(field, value) {
  const ctx = { ...(state.settings.context || {}), [field]: value };
  if (field === 'birthDate' && !value) ctx.breastfeeding = false;
  state.settings.context = ctx;
  commit();
}

function irregularStatus(s) {
  const m = s.irregularMode || 'auto';
  if (m === 'on') return 'Toujours activé';
  if (m === 'off') return 'Toujours désactivé';
  if (!mode().irregular) return 'Inactif en ce moment';
  return pred.stats?.regularity === 'irregular' ? 'Actif en ce moment : tes cycles varient' : 'Actif en ce moment : situation signalée';
}

function viewSettings() {
  const s = state.settings;
  const st = pred.stats || E.getStats(state);
  const t = today();
  const learn = st.source === 'history'
    ? `Tes prévisions s'appuient maintenant sur tes derniers cycles (moyenne : ${st.avgCycle} jours, règles : ${st.avgPeriod} jours).`
    : st.source === 'blend'
      ? `Lune combine ces valeurs avec tes ${st.cycleCount} premier${st.cycleCount > 1 ? 's' : ''} cycle${st.cycleCount > 1 ? 's' : ''} noté${st.cycleCount > 1 ? 's' : ''}. Elle s'adapte automatiquement.`
      : 'Ces valeurs servent de point de départ. Lune s’adapte automatiquement au fil des cycles notés.';

  const contraOpts = C.CONTRACEPTION.map((c) => `<option value="${c.id}" ${s.contraception === c.id ? 'selected' : ''}>${c.label}</option>`).join('');
  const goalNote = s.goal === 'avoid'
    ? "<p class='list-foot'>Important : Lune n'est pas une méthode de contraception. Ses dates sont des estimations et une grossesse reste possible, y compris en dehors de la fenêtre fertile estimée. Utilise une contraception adaptée.</p>"
    : '';

  return `
    <header class="page-head"><div><h1>Réglages</h1></div></header>

    <h2 class="section-title" style="margin-top:4px">Mon cycle</h2>
    <div class="list">
      <div class="row"><span class="label">Durée du cycle</span>${stepper('cycleLength')}</div>
      <div class="row"><span class="label">Durée des règles</span>${stepper('periodLength')}</div>
      <div class="row"><span class="label">Phase lutéale<small>De l'ovulation aux règles</small></span>${stepper('lutealLength')}</div>
    </div>
    <p class="list-foot">${learn}</p>

    <h2 class="section-title">Prévisions</h2>
    <div class="list">
      <div class="row"><span class="label">Afficher les prévisions<small>Prochaines règles et fenêtre fertile</small></span>${toggle('showPredictions', s.showPredictions !== false, 'Afficher les prévisions')}</div>
      <div class="row" style="flex-wrap:wrap"><span class="label">Mode cycles irréguliers<small>${irregularStatus(s)}</small></span>
        <div class="segmented" style="width:240px">${[['auto', 'Auto'], ['on', 'Activé'], ['off', 'Désactivé']].map(([id, l]) => `<button class="${(s.irregularMode || 'auto') === id ? 'on' : ''}" data-action="set-irregular" data-value="${id}">${l}</button>`).join('')}</div>
      </div>
    </div>
    <p class="list-foot">Quand les cycles varient beaucoup (SOPK — désormais appelé SMOP —, périménopause, après une grossesse ou l’arrêt d’une contraception…), une date précise serait trompeuse. Ce mode affiche une plage de dates probable, recalculée chaque jour, et ne calcule plus la fenêtre fertile d’après le calendrier : seule une ovulation observée (température, test LH) est signalée. En mode Auto, il s’active quand tes cycles varient de plus de 9 jours.</p>

    <h2 class="section-title">Mon objectif</h2>
    <div class="choice-list compact">
      ${C.GOALS.map((g) => `<button class="choice ${s.goal === g.id ? 'on' : ''}" data-action="set-goal" data-value="${g.id}"><span><b>${g.label}</b><small>${g.hint}</small></span><span class="radio"></span></button>`).join('')}
    </div>
    ${goalNote}

    <h2 class="section-title">Contraception & fertilité</h2>
    <div class="list">
      <div class="row"><span class="label">Contraception</span><select data-change="contraception" aria-label="Contraception">${contraOpts}</select></div>
      ${s.contraception === 'pill' ? `<div class="row"><span class="label">Heure de la pilule</span><input type="time" value="${esc(s.pillTime)}" data-change="pillTime" aria-label="Heure de la pilule"></div>` : ''}
      <div class="row"><span class="label">Afficher la fertilité<small>Fenêtre fertile et ovulation</small></span>${toggle('showFertility', showFert(), 'Afficher la fertilité')}</div>
    </div>
    ${hormonal() ? '<p class="list-foot">Avec une contraception hormonale, il n’y a généralement pas d’ovulation : les prévisions de fertilité ne s’appliquent pas.</p>' : ''}

    ${situationSection(s)}

    <h2 class="section-title">Rappels</h2>
    <div class="list">
      ${!mode().predictions ? '' : mode().irregular
        ? `<button class="row action" data-action="export-ics"><span class="label">Ajouter ma prochaine plage de règles au Calendrier<small>Cycles variables : une alerte au début de la plage probable</small></span>${I.bell}</button>`
        : `<button class="row action" data-action="export-ics"><span class="label">Ajouter mes prochaines dates au Calendrier<small>Règles${showFert() ? ' et fenêtres fertiles' : ''} des 6 prochains cycles, avec alertes</small></span>${I.bell}</button>`}
      ${s.contraception === 'pill' ? `<button class="row action" data-action="export-pill"><span class="label">Ajouter le rappel de pilule<small>Tous les jours à ${esc(s.pillTime)}</small></span>${I.bell}</button>` : ''}
    </div>
    <p class="list-foot">Sur iPhone, une app web ne peut pas programmer de notifications toute seule. Lune crée un fichier calendrier : ouvre-le puis choisis « Tout ajouter ». Le Calendrier t'enverra les alertes. Après un changement important, supprime les anciens événements avant de réimporter.</p>

    <h2 class="section-title">Confidentialité</h2>
    <div class="list">
      ${globalThis.crypto?.subtle
        ? `<div class="row"><span class="label">Code de verrouillage<small>Demandé à chaque ouverture</small></span>${toggle('pin', !!s.pinHash, 'Code de verrouillage')}</div>
           ${s.pinHash ? `<button class="row action neutral" data-action="change-pin"><span class="label">Modifier le code</span>${I.chevR}</button>` : ''}`
        : '<div class="row"><span class="label">Code de verrouillage<small>Disponible une fois l’app en ligne (adresse https)</small></span></div>'}
    </div>
    <p class="list-foot">Tes données restent uniquement sur cet appareil : pas de compte, pas de serveur, pas de publicité, pas de traceur.</p>

    <h2 class="section-title">Sauvegarde</h2>
    <div class="list">
      <button class="row action" data-action="export-backup"><span class="label">Exporter une sauvegarde<small>${validDate(s.lastBackup) ? `Dernière : ${fFull(E.toKey(new Date(s.lastBackup)))}` : 'Aucune sauvegarde pour l’instant'}</small></span>${I.download}</button>
      <button class="row action neutral" data-action="import-backup"><span class="label">Restaurer une sauvegarde</span>${I.chevR}</button>
      <button class="row action neutral" data-action="open-report"><span class="label">Résumé pour un rendez-vous (PDF)<small>12 derniers mois, à imprimer ou enregistrer</small></span>${I.chevR}</button>
      <button class="row action neutral" data-action="export-csv"><span class="label">Exporter en tableau (CSV)<small>Toutes les données, jour par jour</small></span>${I.chevR}</button>
    </div>
    <p class="list-foot">Supprimer l'app de l'écran d'accueil efface ses données. Range une sauvegarde dans Fichiers ou iCloud Drive de temps en temps.</p>

    <h2 class="section-title">Apparence</h2>
    <div class="list">
      <div class="row"><span class="label">Thème</span>
        <div class="segmented" style="width:210px">${[['auto', 'Auto'], ['light', 'Clair'], ['dark', 'Sombre']].map(([id, l]) => `<button class="${s.theme === id ? 'on' : ''}" data-action="set-theme" data-value="${id}">${l}</button>`).join('')}</div>
      </div>
    </div>

    <h2 class="section-title">Données</h2>
    <div class="list">
      <button class="row danger" data-action="wipe"><span class="label">Effacer toutes les données</span></button>
    </div>

    <section class="card center" style="margin-top:28px">
      <div class="logo" style="width:64px;height:64px;border-radius:16px;margin-bottom:12px">${LOGO}</div>
      <h2 class="round">Lune</h2>
      <p class="muted small">Version ${C.APP_VERSION} · ${Object.keys(state.days).length} jours notés</p>
    </section>
    ${disclaimer()}`;
}

// ---------------------------------------------------------------------------
// Exports (calendrier, sauvegarde, CSV)
// ---------------------------------------------------------------------------

async function exportICS() {
  if (!pred.hasData) { toast("Note d'abord tes règles pour obtenir des prévisions."); return; }
  const t = today();
  const events = [];
  if (pred.mode.irregular) {
    // Cycles variables : pas de dates précises sur 6 cycles, seulement la plage probable des prochaines règles.
    const f = pred.forecast;
    events.push({ uid: `possible-${f.from}`, title: 'Règles possibles (plage estimée)', description: `Règles probablement ${fBetween(f.from, f.to)} (Lune, cycles variables : estimation peu précise).`, date: f.from, alarmMinutes: -900 });
    await shareCalendar('lune-previsions.ics', E.buildICS({ calName: 'Lune', events }));
    return;
  }
  const c = pred.current;
  if (showFert() && !pred.late && c.fertileStart > t) {
    events.push({ uid: `fertile-${c.fertileStart}`, title: 'Début de la fenêtre fertile estimée', description: `Fenêtre fertile estimée du ${fShort(c.fertileStart)} au ${fShort(c.fertileEnd)} (Lune).`, date: c.fertileStart, alarmMinutes: 540 });
    events.push({ uid: `ovu-${c.ovulation}`, title: 'Ovulation estimée', description: 'Estimation Lune.', date: c.ovulation });
  }
  pred.future.slice(0, 6).forEach((f) => {
    events.push({ uid: `period-${f.periodStart}`, title: 'Règles prévues', description: 'Estimation Lune, basée sur tes cycles.', date: f.periodStart, alarmMinutes: -900 });
    if (showFert()) {
      events.push({ uid: `fertile-${f.fertileStart}`, title: 'Début de la fenêtre fertile estimée', description: `Fenêtre fertile estimée du ${fShort(f.fertileStart)} au ${fShort(f.fertileEnd)} (Lune).`, date: f.fertileStart, alarmMinutes: 540 });
      events.push({ uid: `ovu-${f.ovulation}`, title: 'Ovulation estimée', description: 'Estimation Lune.', date: f.ovulation });
    }
  });
  await shareCalendar('lune-previsions.ics', E.buildICS({ calName: 'Lune', events }));
}

async function exportPill() {
  const ics = E.buildICS({
    calName: 'Lune',
    events: [{ uid: 'pill-daily', title: 'Pilule', description: 'Rappel quotidien (Lune).', date: today(), time: state.settings.pillTime || '21:00', rrule: 'FREQ=DAILY', alarmMinutes: 0 }],
  });
  await shareCalendar('lune-rappel-pilule.ics', ics);
}

// Depuis l'icône de l'écran d'accueil, il n'y a pas de dossier Téléchargements :
// on passe par la feuille de partage d'iOS.
async function shareCalendar(filename, ics) {
  const res = await S.shareFile(filename, 'text/calendar', ics, { preferDownload: !S.isStandalone() });
  if (res === 'shared') toast('Enregistre le fichier dans Fichiers, puis ouvre-le pour l’ajouter au Calendrier.');
  else if (res === 'downloaded') toast('Fichier calendrier créé : ouvre-le puis « Tout ajouter ».');
}

async function exportBackup() {
  const res = await S.shareFile(`lune-sauvegarde-${today()}.json`, 'application/json', S.exportBackup(state));
  if (res === 'cancelled') return;
  state.settings.lastBackup = new Date().toISOString();
  commit();
  toast('Sauvegarde créée ✓');
}

async function exportCSV() {
  const keys = Object.keys(state.days).sort();
  if (!keys.length) { toast('Aucune donnée à exporter.'); return; }
  const map = E.calendarMap(state, keys[0], keys[keys.length - 1], today());
  const lists = { flow: C.FLOW, moods: C.MOODS, symptoms: C.SYMPTOMS, energy: C.ENERGY, mucus: C.MUCUS, sex: C.SEX, ovuTest: C.TESTS, pregTest: C.TESTS, tempExcluded: C.TEMP_EXCLUDE };
  const csv = S.exportCSV(state, (k) => map[k]?.cycleDay, (f, v) => (lists[f] ? label(lists[f], v) : v));
  await S.shareFile(`lune-export-${today()}.csv`, 'text/csv', csv);
}

async function importBackupFile(file) {
  try {
    const text = await file.text();
    const data = S.parseBackup(text);
    const n = Object.keys(data.days).length;
    const ok = await confirmDialog({
      title: 'Restaurer cette sauvegarde ?',
      text: `Elle contient ${nDays(n)} notés. Tes données actuelles seront remplacées.`,
      ok: 'Restaurer',
    });
    if (!ok) return;
    const { pinHash, pinSalt, theme } = state.settings;
    state.settings = { ...S.DEFAULT_SETTINGS, ...data.settings, onboarded: true, pinHash, pinSalt, theme };
    state.days = data.days;
    save();
    render();
    toast('Sauvegarde restaurée ✓');
  } catch (err) {
    toast(err.message || 'Import impossible.');
  }
}

// ---------------------------------------------------------------------------
// Accueil (premier lancement)
// ---------------------------------------------------------------------------

// ---------------------------------------------------------------------------
// Résumé imprimable pour un rendez-vous (12 derniers mois)
// ---------------------------------------------------------------------------

function openReport() {
  const st = pred.stats || E.getStats(state);
  if (!st.periods.length) { toast('Note d’abord tes règles.'); return; }
  const t = today();
  const from = E.addDays(t, -365);
  const s = state.settings;
  const ctx = s.context || {};
  const ovu = new Map((pred.pastOvulations || []).map((o) => [o.start, o]));
  const ovuText = (o) => {
    if (!o) return '—';
    if (o.status === 'confirmed') return `confirmée (${fShort(o.ovulation)})`;
    if (o.status === 'probable') return `probable (${fShort(o.ovulation)})`;
    if (o.status === 'notDetected') return 'non détectée (température)';
    return '—';
  };
  const cycles = st.cycles.filter((c) => c.end >= from);
  const rows = cycles.map((c) => `<tr><td>${fFull(c.start)}</td><td>${c.length} j${c.suspect ? ' (à vérifier)' : ''}</td><td>${c.periodLength} j</td><td>${ovuText(ovu.get(c.start))}</td></tr>`);
  if (pred.hasData) rows.push(`<tr><td>${fFull(pred.current.start)}</td><td>en cours (jour ${pred.current.day})</td><td>—</td><td>${pred.current.ovulationSource !== 'predicted' ? ovuText({ status: pred.current.ovulationStatus, ovulation: pred.current.ovulation }) : '—'}</td></tr>`);

  const situ = [
    ctx.pcos && 'SOPK (désormais SMOP)',
    ctx.perimenopause && 'périménopause',
    ctx.sport && 'sport intensif ou perte de poids',
    ctx.birthDate && `accouchement le ${fFull(ctx.birthDate)}${ctx.breastfeeding ? ', allaitement' : ''}`,
    ctx.contraceptionStop && `arrêt d’une contraception hormonale le ${fFull(ctx.contraceptionStop)}`,
  ].filter(Boolean);

  const counts = new Map();
  for (const [k, e] of Object.entries(state.days)) {
    if (k < from || k > t) continue;
    for (const id of e.symptoms || []) counts.set(id, (counts.get(id) || 0) + 1);
  }
  const topSym = [...counts.entries()].sort((a, b) => b[1] - a[1]).slice(0, 8);
  const flags = (st.clinicalFlags || []).filter((f) => CLINICAL_TEXT[f]);
  const recent = cycles.filter((c) => c.counted).map((c) => c.length);

  const kv = [
    ['Cycles complets (12 mois)', String(recent.length)],
    ['Durée des cycles', recent.length ? `${Math.min(...recent)} à ${Math.max(...recent)} j (moyenne ${num(recent.reduce((a, b) => a + b, 0) / recent.length, 1)} j)` : '—'],
    ['Durée moyenne des règles', `${st.avgPeriod} j`],
    ['Écart médian entre deux cycles', st.medianCLD == null ? '—' : `${num(st.medianCLD, 1)} j`],
    ['Contraception', label(C.CONTRACEPTION, s.contraception)],
    ['Situation signalée', situ.length ? situ.join(' · ') : 'aucune'],
  ];

  overlayRoot.innerHTML = `
    <div class="overlay report"><div class="report-inner">
      <div class="report-bar no-print">
        <button class="icon-btn flat" data-action="close-report" aria-label="Fermer">${I.close}</button>
        <button class="btn btn-dark" style="min-height:42px" data-action="print-report">${I.download} Imprimer ou enregistrer en PDF</button>
      </div>
      <h1>Résumé du cycle menstruel</h1>
      <p class="report-sub">Du ${fFull(from)} au ${fFull(t)} · généré par l’application Lune à partir de saisies personnelles</p>
      <h3>En bref</h3>
      <table class="report-table kv">${kv.map(([k, v]) => `<tr><th>${k}</th><td>${esc(v)}</td></tr>`).join('')}</table>
      <h3>Cycles</h3>
      <table class="report-table"><thead><tr><th>Début</th><th>Durée</th><th>Règles</th><th>Ovulation</th></tr></thead><tbody>${rows.join('') || '<tr><td colspan="4">Aucun cycle complet sur la période.</td></tr>'}</tbody></table>
      <h3>Points relevés (selon les recommandations internationales)</h3>
      ${flags.length ? `<ul>${flags.map((f) => `<li>${CLINICAL_TEXT[f]}</li>`).join('')}</ul>` : '<p>Aucun.</p>'}
      <h3>Symptômes les plus notés</h3>
      ${topSym.length ? `<ul>${topSym.map(([id, n]) => `<li>${esc(label(C.SYMPTOMS, id))} : ${nDays(n)}</li>`).join('')}</ul>` : '<p>Aucun symptôme noté.</p>'}
      <p class="report-foot">Document établi à partir des observations notées par l’utilisatrice. Les ovulations « confirmées » ou « probables » reposent sur la température, la glaire cervicale ou des tests urinaires, pas sur un examen médical. Ce document n’est pas un diagnostic.</p>
    </div></div>`;
  document.documentElement.classList.add('noscroll');
}

const OB_STEPS = ['welcome', 'last', 'period', 'cycle', 'goal', 'contra'];

function renderOnboarding() {
  const ob = ui.ob;
  const step = OB_STEPS[ob.step];
  const t = today();
  const progress = OB_STEPS.slice(1).map((_, i) => `<i class="${i < ob.step ? 'on' : ''}"></i>`).join('');
  let body = '';
  let foot = '';
  if (step === 'welcome') {
    body = `
      <div class="logo">${LOGO}</div>
      <h1 class="center">Bienvenue sur Lune</h1>
      <p class="center">Ton cycle, simplement. Quelques questions pour personnaliser tes prévisions.</p>
      <div class="promise">
        <div>${I.lock}<span><b>Privée par conception</b>Tes données restent sur ton téléphone. Aucun compte, aucun serveur.</span></div>
        <div>${I.spark}<span><b>Prévisions qui s'affinent</b>Règles, fenêtre fertile et ovulation, ajustées à chaque cycle.</span></div>
        <div>${I.heart}<span><b>À ton écoute</b>Humeur, symptômes, température : repère tes tendances.</span></div>
      </div>`;
    foot = `<button class="btn btn-primary btn-block" data-action="ob-next">Commencer</button>`;
  } else if (step === 'last') {
    body = `
      <h1>Quand ont commencé tes dernières règles ?</h1>
      <p>Le premier jour de saignement. Une date approximative suffit.</p>
      <label for="ob-date" class="log-sub" style="display:block;margin:0 4px 8px">Touche le champ pour choisir la date</label>
      <input type="date" class="date-input" id="ob-date" max="${t}" min="${E.addDays(t, -120)}" value="${ob.last || ''}" data-change="ob-date" data-input="ob-date" aria-label="Date des dernières règles">`;
    foot = `
      <button class="btn btn-primary btn-block" id="ob-continue" data-action="ob-next" ${ob.last ? '' : 'disabled'}>Continuer</button>
      <button class="btn btn-ghost btn-block" data-action="ob-skip-date">Je ne m'en souviens pas</button>`;
  } else if (step === 'period') {
    body = `
      <h1>Combien de jours durent tes règles ?</h1>
      <p>En moyenne, 3 à 7 jours.</p>
      <div class="big-stepper"><button data-action="ob-step" data-field="period" data-delta="-1" aria-label="Moins">${svg('<path d="M5 12h14"/>', 24, 2.4)}</button><output>${ob.period}<small>j</small></output><button data-action="ob-step" data-field="period" data-delta="1" aria-label="Plus">${I.plus}</button></div>`;
    foot = `<button class="btn btn-primary btn-block" data-action="ob-next">Continuer</button>`;
  } else if (step === 'cycle') {
    body = `
      <h1>Et la durée habituelle de ton cycle ?</h1>
      <p>Du premier jour des règles au premier jour des suivantes. Souvent entre 24 et 35 jours.</p>
      <div class="big-stepper"><button data-action="ob-step" data-field="cycle" data-delta="-1" aria-label="Moins">${svg('<path d="M5 12h14"/>', 24, 2.4)}</button><output>${ob.cycle}<small>j</small></output><button data-action="ob-step" data-field="cycle" data-delta="1" aria-label="Plus">${I.plus}</button></div>`;
    foot = `
      <button class="btn btn-primary btn-block" data-action="ob-next">Continuer</button>
      <button class="btn btn-ghost btn-block" data-action="ob-cycle-unknown">Je ne sais pas (28 jours)</button>`;
  } else if (step === 'goal') {
    body = `
      <h1>Qu'attends-tu de Lune ?</h1>
      <p>Tu pourras changer d'avis dans les réglages.</p>
      <div class="choice-list">${C.GOALS.map((g) => `<button class="choice ${ob.goal === g.id ? 'on' : ''}" data-action="ob-set" data-field="goal" data-value="${g.id}"><span><b>${g.label}</b><small>${g.hint}</small></span><span class="radio"></span></button>`).join('')}</div>`;
    foot = `<button class="btn btn-primary btn-block" data-action="ob-next">Continuer</button>`;
  } else if (step === 'contra') {
    body = `
      <h1>Utilises-tu une contraception ?</h1>
      <p>Une contraception hormonale bloque généralement l'ovulation : Lune adaptera ses prévisions.</p>
      <div class="choice-list compact">${C.CONTRACEPTION.map((c) => `<button class="choice ${ob.contraception === c.id ? 'on' : ''}" data-action="ob-set" data-field="contraception" data-value="${c.id}"><span><b>${c.label}</b></span><span class="radio"></span></button>`).join('')}</div>`;
    foot = `<button class="btn btn-primary btn-block" data-action="ob-finish">C'est parti</button>`;
  }
  overlayRoot.innerHTML = `
    <div class="overlay"><div class="overlay-inner">
      <div class="ob-top">
        ${ob.step > 0 ? `<button class="icon-btn flat" data-action="ob-back" aria-label="Retour">${I.chevL}</button>` : '<span style="width:40px"></span>'}
        ${ob.step > 0 ? `<div class="ob-progress">${progress}</div>` : '<span></span>'}
        <span style="width:40px"></span>
      </div>
      <div class="ob-body">${body}</div>
      <div class="ob-foot">${foot}</div>
    </div></div>`;
}

function finishOnboarding() {
  const ob = ui.ob;
  const t = today();
  Object.assign(state.settings, {
    onboarded: true,
    cycleLength: ob.cycle,
    periodLength: ob.period,
    goal: ob.goal,
    contraception: ob.contraception,
    showFertility: !C.isHormonal(ob.contraception),
    createdAt: new Date().toISOString(),
  });
  if (ob.last && ob.last <= t) {
    for (let i = 0; i < ob.period; i++) {
      const k = E.addDays(ob.last, i);
      if (k <= t) S.setDay(state, k, { flow: 'medium' });
    }
  }
  save();
  overlayRoot.innerHTML = '';
  S.requestPersistence();
  ui.tab = 'today';
  render();
  toast('Bienvenue ✨');
}

// ---------------------------------------------------------------------------
// Code de verrouillage
// ---------------------------------------------------------------------------

let pin = null; // { title, sub, entered, error, cancellable, forgot, onDone, onCancel, shake }

function openPin(ctx) {
  pin = { entered: '', error: '', shake: false, ...ctx };
  renderPin();
}

function closePin() {
  pin = null;
  overlayRoot.innerHTML = '';
  viewEl.inert = false;
  tabbarEl.inert = false;
  if (!ui.sheetDay) document.documentElement.classList.remove('noscroll');
}

function renderPin() {
  if (!pin) return;
  const dots = [0, 1, 2, 3].map((i) => `<i class="${i < pin.entered.length ? 'on' : ''}"></i>`).join('');
  const keys = ['1', '2', '3', '4', '5', '6', '7', '8', '9'];
  const pad = keys.map((k) => `<button data-action="pin-key" data-k="${k}">${k}</button>`).join('')
    + (pin.cancellable ? `<button class="blank small" style="font-size:15px;font-family:var(--font)" data-action="pin-cancel">Annuler</button>` : '<span class="blank"></span>')
    + `<button data-action="pin-key" data-k="0">0</button>`
    + `<button class="blank" data-action="pin-del" aria-label="Effacer">${svg('<path d="M9 6h10a2 2 0 0 1 2 2v8a2 2 0 0 1-2 2H9l-6-6z"/><path d="M12 10l4 4M16 10l-4 4"/>', 26)}</button>`;
  overlayRoot.innerHTML = `
    <div class="overlay lock"><div class="overlay-inner">
      <div class="logo" style="width:64px;height:64px;border-radius:16px;margin-bottom:18px">${LOGO}</div>
      <h1 class="round" style="font-size:24px;font-weight:700">${pin.title}</h1>
      <p class="muted" style="margin-top:4px">${pin.sub || ''}</p>
      <div class="pin-dots ${pin.shake ? 'shake' : ''}">${dots}</div>
      <div class="pin-error">${pin.error || ''}</div>
      <div class="pinpad">${pad}</div>
      ${pin.forgot ? '<button class="btn btn-ghost" style="margin-top:18px" data-action="pin-forgot">Code oublié ?</button>' : ''}
    </div></div>`;
  pin.shake = false;
}

async function pinPress(k) {
  if (!pin || pin.busy) return;
  if (pin.entered.length >= 4) return;
  pin.entered += k;
  pin.error = '';
  renderPin();
  if (pin.entered.length === 4) {
    pin.busy = true;
    const current = pin;
    let err;
    try {
      err = await current.onDone(current.entered);
    } catch (e) {
      console.error(e);
      err = 'Erreur, réessaie';
    } finally {
      current.busy = false;
    }
    if (err && pin === current) {
      pin.entered = '';
      pin.error = err;
      pin.shake = true;
      renderPin();
    }
  }
}

function lock() {
  if (!state.settings.pinHash || (pin && pin.isLock)) return;
  flushNote();
  if (ui.sheetDay) {
    sheetRoot.innerHTML = '';
    ui.sheetDay = null;
    document.documentElement.classList.remove('noscroll');
  }
  modalRoot.innerHTML = '';
  viewEl.inert = true;
  tabbarEl.inert = true;
  openPin({
    isLock: true,
    title: 'Lune est verrouillée',
    sub: 'Saisis ton code',
    forgot: true,
    onDone: async (code) => {
      const h = await S.hashPin(code, state.settings.pinSalt);
      if (h !== state.settings.pinHash) return 'Code incorrect';
      closePin();
      return null;
    },
  });
}

function startSetPin() {
  openPin({
    title: 'Choisis un code',
    sub: '4 chiffres, demandés à chaque ouverture',
    cancellable: true,
    onCancel: () => renderView(),
    onDone: async (first) => {
      openPin({
        title: 'Confirme ton code',
        sub: 'Saisis-le une seconde fois',
        cancellable: true,
        onCancel: () => renderView(),
        onDone: async (second) => {
          if (second !== first) return 'Les codes ne correspondent pas';
          const salt = S.randomSalt();
          state.settings.pinSalt = salt;
          state.settings.pinHash = await S.hashPin(second, salt);
          closePin();
          commit();
          toast('Code activé ✓');
          return null;
        },
      });
      return null;
    },
  });
}

function verifyPinThen(title, then) {
  openPin({
    title,
    sub: 'Saisis ton code actuel',
    cancellable: true,
    onCancel: () => renderView(),
    onDone: async (code) => {
      const h = await S.hashPin(code, state.settings.pinSalt);
      if (h !== state.settings.pinHash) return 'Code incorrect';
      closePin();
      then();
      return null;
    },
  });
}

// ---------------------------------------------------------------------------
// Fenêtre de confirmation et toast
// ---------------------------------------------------------------------------

function confirmDialog({ title, text, ok = 'Confirmer', cancel = 'Annuler', danger = false }) {
  return new Promise((resolve) => {
    modalRoot.innerHTML = `
      <div class="modal-backdrop"><div class="modal" role="alertdialog" aria-modal="true">
        <h2>${title}</h2><p>${text}</p>
        <div class="btn-row"><button class="btn btn-secondary" data-modal="cancel">${cancel}</button><button class="btn ${danger ? 'btn-danger' : 'btn-dark'}" data-modal="ok">${ok}</button></div>
      </div></div>`;
    modalRoot.onclick = (e) => {
      const b = e.target.closest('button[data-modal]');
      if (!b && !e.target.classList.contains('modal-backdrop')) return;
      modalRoot.onclick = null;
      modalRoot.innerHTML = '';
      resolve(!!b && b.dataset.modal === 'ok');
    };
  });
}

let toastTimer = null;
let toastFn = null;
function toast(msg, action) {
  clearTimeout(toastTimer);
  toastFn = action?.fn || null;
  toastEl.innerHTML = `${esc(msg)}${action ? `<button data-action="toast-action">${esc(action.label)}</button>` : ''}`;
  toastEl.classList.add('show');
  toastTimer = setTimeout(() => toastEl.classList.remove('show'), action ? 5000 : Math.max(2600, msg.length * 55));
}

// ---------------------------------------------------------------------------
// Actions (clics)
// ---------------------------------------------------------------------------

const actions = {
  tab: (el) => {
    const tab = el.dataset.tab;
    if (tab === 'calendar' && ui.tab !== 'calendar') { ui.calMonth = null; ui.calSelected = null; }
    ui.calEdit = false;
    ui.tab = tab;
    renderTabbar();
    renderView();
    window.scrollTo(0, 0);
  },
  'open-day': (el) => openDay(el.dataset.key),
  'close-sheet': () => closeSheet(),
  'sheet-nav': (el) => {
    const k = E.addDays(ui.sheetDay, Number(el.dataset.delta));
    if (k > today()) return;
    flushNote();
    ui.sheetDay = k;
    refreshSheet();
    $('#sheet-body').scrollTop = 0;
  },
  'period-today': () => {
    const t = today();
    S.setDay(state, t, { flow: 'medium' });
    commit();
    toast('Règles notées pour aujourd’hui', { label: 'Préciser', fn: () => openDay(t) });
  },
  'pill-toggle': () => {
    const t = today();
    S.setDay(state, t, { pill: state.days[t]?.pill ? null : true });
    commit();
  },
  log: (el) => logValue(el),
  'measure-step': (el) => measureStep(el),
  'clear-day': async (el) => {
    const ok = await confirmDialog({ title: 'Effacer cette journée ?', text: 'Toutes les informations notées ce jour-là seront supprimées.', ok: 'Effacer', danger: true });
    if (!ok) return;
    S.clearDay(state, el.dataset.key);
    save();
    refreshSheet();
    renderView();
  },

  'cal-prev': () => changeMonth(-1),
  'cal-next': () => changeMonth(1),
  'cal-today': () => { ui.calMonth = today().slice(0, 7); ui.calSelected = today(); renderView(); },
  'cal-day': (el) => {
    if (ui.calEdit) togglePeriodDay(el.dataset.key);
    else { ui.calSelected = el.dataset.key; renderView(); }
  },
  'cal-edit': () => {
    if (ui.tab !== 'calendar') { ui.calMonth = today().slice(0, 7); ui.calSelected = null; }
    ui.tab = 'calendar';
    ui.calEdit = true;
    ui.calMonth = ui.calMonth || today().slice(0, 7);
    renderTabbar();
    renderView();
    window.scrollTo(0, 0);
  },
  'cal-edit-done': () => { ui.calEdit = false; renderView(); },
  // Réponses aux questions « règles non notées ? »
  'missed-yes': (el) => {
    const k = el.dataset.key;
    ui.tab = 'calendar';
    ui.calEdit = true;
    ui.calMonth = k.slice(0, 7);
    ui.calSelected = null;
    renderTabbar();
    renderView();
    window.scrollTo(0, 0);
    toast('Touche les jours de règles à ajouter, puis « Terminé ».');
  },
  'missed-no': (el) => {
    const k = el.dataset.key;
    state.settings.longCycles = [...new Set([...(state.settings.longCycles || []), k])];
    commit();
    toast('C’est noté : ce cycle long est pris en compte.');
  },

  'set-step': (el) => {
    const f = el.dataset.field;
    const [a, b] = STEP_LIMITS[f];
    state.settings[f] = clamp(state.settings[f] + Number(el.dataset.delta), a, b);
    commit();
  },
  'set-goal': (el) => { state.settings.goal = el.dataset.value; commit(); },
  'set-theme': (el) => { state.settings.theme = el.dataset.value; save(); applyTheme(); renderView(); },
  'set-irregular': (el) => { state.settings.irregularMode = el.dataset.value; commit(); },
  'ctx-clear': (el) => setContext(el.dataset.field, null),
  'alert-confirm': (el) => {
    state.settings.alertsConfirmed = [...new Set([...(state.settings.alertsConfirmed || []), el.dataset.key])];
    commit();
    toast('Noté : tu retrouves ce point dans le Bilan.');
  },
  'alert-dismiss': (el) => {
    state.settings.alertsDismissed = [...new Set([...(state.settings.alertsDismissed || []), el.dataset.key])];
    commit();
  },
  'open-report': () => openReport(),
  'print-report': () => window.print(),
  'close-report': () => { overlayRoot.innerHTML = ''; document.documentElement.classList.remove('noscroll'); },
  'export-ics': () => exportICS(),
  'export-pill': () => exportPill(),
  'export-backup': () => exportBackup(),
  'dismiss-backup': () => { state.settings.backupSnoozedAt = new Date().toISOString(); commit(); },
  'import-backup': () => { const i = $('#import-input'); i.value = ''; i.click(); },
  'export-csv': () => exportCSV(),
  'change-pin': () => verifyPinThen('Modifier le code', startSetPin),
  wipe: async () => {
    const ok = await confirmDialog({
      title: 'Tout effacer ?',
      text: 'Toutes tes données seront définitivement supprimées de cet appareil. Pense à exporter une sauvegarde avant.',
      ok: 'Tout effacer',
      danger: true,
    });
    if (!ok) return;
    S.wipe();
    location.reload();
  },

  'ob-next': () => { ui.ob.step = Math.min(OB_STEPS.length - 1, ui.ob.step + 1); renderOnboarding(); },
  'ob-back': () => { ui.ob.step = Math.max(0, ui.ob.step - 1); renderOnboarding(); },
  'ob-skip-date': () => { ui.ob.last = null; ui.ob.step++; renderOnboarding(); },
  'ob-cycle-unknown': () => { ui.ob.cycle = 28; ui.ob.step++; renderOnboarding(); },
  'ob-step': (el) => {
    const f = el.dataset.field;
    const [a, b] = f === 'period' ? [2, 10] : [20, 45];
    ui.ob[f] = clamp(ui.ob[f] + Number(el.dataset.delta), a, b);
    renderOnboarding();
  },
  'ob-set': (el) => { ui.ob[el.dataset.field] = el.dataset.value; renderOnboarding(); },
  'ob-finish': () => finishOnboarding(),

  'pin-key': (el) => pinPress(el.dataset.k),
  'pin-del': () => { if (pin && !pin.busy) { pin.entered = pin.entered.slice(0, -1); renderPin(); } },
  'pin-cancel': () => { const cb = pin?.onCancel; closePin(); cb?.(); },
  'pin-forgot': async () => {
    const ok = await confirmDialog({
      title: 'Code oublié',
      text: 'Pour protéger ta vie privée, le code ne peut pas être récupéré. La seule solution est d’effacer toutes les données de Lune, puis de restaurer une sauvegarde si tu en as une.',
      ok: 'Tout effacer',
      danger: true,
    });
    if (!ok) return;
    S.wipe();
    location.reload();
  },
  'toast-action': () => { toastEl.classList.remove('show'); const fn = toastFn; toastFn = null; fn?.(); },
};

const changes = {
  'ob-date': (el) => {
    const t = today();
    let v = el.value || null;
    if (v && v > t) { v = t; el.value = t; }
    ui.ob.last = v;
    const btn = $('#ob-continue');
    if (btn) btn.disabled = !v;
  },
  contraception: (el) => {
    const was = hormonal();
    state.settings.contraception = el.value;
    const now = hormonal();
    if (now && !was) { state.settings.showFertility = false; toast('Fertilité masquée : elle ne s’applique pas sous contraception hormonale.'); }
    if (!now && was) {
      // Arrêt d'une contraception hormonale : les saignements d'avant ne décrivent pas le cycle naturel.
      state.settings.showFertility = true;
      state.settings.context = { ...(state.settings.context || {}), contraceptionStop: today() };
      toast('Arrêt noté : tes prochains cycles naturels repartent de zéro (modifiable dans « Ma situation »).');
    }
    commit();
  },
  pillTime: (el) => { if (el.value) { state.settings.pillTime = el.value; commit(); } },
  showFertility: (el) => { state.settings.showFertility = el.checked; commit(); },
  showPredictions: (el) => { state.settings.showPredictions = el.checked; commit(); },
  'ctx-pcos': (el) => setContext('pcos', el.checked),
  'ctx-perimenopause': (el) => setContext('perimenopause', el.checked),
  'ctx-sport': (el) => setContext('sport', el.checked),
  'ctx-breastfeeding': (el) => setContext('breastfeeding', el.checked),
  'ctx-birthDate': (el) => setContext('birthDate', el.value && el.value <= today() ? el.value : null),
  'ctx-contraceptionStop': (el) => setContext('contraceptionStop', el.value && el.value <= today() ? el.value : null),
  pin: (el) => {
    if (el.checked) startSetPin();
    else {
      el.checked = true;
      verifyPinThen('Désactiver le code', () => {
        state.settings.pinHash = null;
        state.settings.pinSalt = null;
        commit();
        toast('Code désactivé');
      });
    }
  },
};

document.addEventListener('click', (e) => {
  const el = e.target.closest('[data-action]');
  if (!el || el.disabled) return;
  const fn = actions[el.dataset.action];
  if (fn) {
    e.preventDefault();
    fn(el, e);
  }
});

document.addEventListener('change', (e) => {
  const el = e.target.closest('[data-change]');
  if (el && changes[el.dataset.change]) changes[el.dataset.change](el, e);
  if (e.target.matches('[data-input="temp"], [data-input="weight"]')) {
    const field = e.target.dataset.input;
    const v = parseNum(e.target.value);
    const m = MEASURES[field];
    if (e.target.value.trim() !== '' && (v == null || v < m.min || v > m.max)) {
      toast(field === 'temp' ? 'Température entre 34 et 42 °C' : 'Poids entre 20 et 300 kg');
      e.target.value = num(state.days[ui.sheetDay]?.[field], m.digits);
    } else if (v != null) e.target.value = num(v, m.digits);
  }
});

inputs['ob-date'] = (el) => changes['ob-date'](el);

document.addEventListener('input', (e) => {
  const el = e.target.closest('[data-input]');
  if (el && inputs[el.dataset.input]) inputs[el.dataset.input](el, e);
});

// Clavier iOS : garde le champ actif visible au-dessus du clavier dans la feuille
if (window.visualViewport) {
  const onVV = () => {
    const kb = Math.max(0, window.innerHeight - visualViewport.height - visualViewport.offsetTop);
    document.documentElement.style.setProperty('--kb', `${Math.round(kb)}px`);
  };
  visualViewport.addEventListener('resize', onVV);
  visualViewport.addEventListener('scroll', onVV);
}
document.addEventListener('focusin', (e) => {
  if (e.target.matches('.sheet input, .sheet textarea')) {
    setTimeout(() => e.target.scrollIntoView({ block: 'center', behavior: 'smooth' }), 300);
  }
});

$('#import-input').addEventListener('change', (e) => {
  const f = e.target.files?.[0];
  if (f) importBackupFile(f);
});

document.addEventListener('keydown', (e) => {
  if (pin && /^[0-9]$/.test(e.key)) pinPress(e.key);
  else if (pin && e.key === 'Backspace') actions['pin-del']();
  else if (e.key === 'Escape' && ui.sheetDay && !pin) closeSheet();
});

// Verrouillage quand l'app passe en arrière-plan, et mise à jour de la date au retour
document.addEventListener('visibilitychange', () => {
  if (document.hidden) {
    flushNote();
    if (state.settings.pinHash) lock();
  } else if (state.settings.onboarded) {
    refresh();
    renderView();
  }
});

// ---------------------------------------------------------------------------
// Mode hors ligne (service worker)
// ---------------------------------------------------------------------------

if ('serviceWorker' in navigator && !['localhost', '127.0.0.1', '[::1]'].includes(location.hostname)) {
  const hadController = !!navigator.serviceWorker.controller;
  navigator.serviceWorker.register('sw.js', { scope: './' }).catch((err) => console.warn('Service worker', err));
  navigator.serviceWorker.addEventListener('controllerchange', () => {
    if (hadController) toast('Nouvelle version installée', { label: 'Recharger', fn: () => location.reload() });
  });
}

// ---------------------------------------------------------------------------
// Démarrage
// ---------------------------------------------------------------------------

refresh();
if (state.settings.onboarded && state.settings.pinHash) lock();
render();
if (state.settings.onboarded) S.requestPersistence();

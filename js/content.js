// Textes et listes d'options affichés dans l'application.
// Tu peux modifier librement les libellés ici : ils ne changent pas les données déjà enregistrées.

export const APP_VERSION = '1.2.0';

export const FLOW = [
  { id: 'spotting', label: 'Spotting', level: 0 },
  { id: 'light', label: 'Léger', level: 1 },
  { id: 'medium', label: 'Moyen', level: 2 },
  { id: 'heavy', label: 'Abondant', level: 3 },
];

export const MOODS = [
  { id: 'happy', label: 'Joie', emoji: '😊' },
  { id: 'calm', label: 'Calme', emoji: '😌' },
  { id: 'sensitive', label: 'Sensibilité', emoji: '🥹' },
  { id: 'irritable', label: 'Irritabilité', emoji: '😤' },
  { id: 'anxious', label: 'Anxiété', emoji: '😰' },
  { id: 'sad', label: 'Tristesse', emoji: '😢' },
  { id: 'stressed', label: 'Stress', emoji: '😣' },
  { id: 'swings', label: "Sautes d'humeur", emoji: '🎢' },
  { id: 'libido', label: 'Libido en hausse', emoji: '🔥' },
];

export const SYMPTOMS = [
  { id: 'cramps', label: 'Crampes' },
  { id: 'headache', label: 'Maux de tête' },
  { id: 'bloating', label: 'Ballonnements' },
  { id: 'breasts', label: 'Seins sensibles' },
  { id: 'acne', label: 'Acné' },
  { id: 'fatigue', label: 'Fatigue' },
  { id: 'backache', label: 'Mal de dos' },
  { id: 'nausea', label: 'Nausées' },
  { id: 'cravings', label: 'Fringales' },
  { id: 'insomnia', label: 'Insomnie' },
  { id: 'digestion', label: 'Troubles digestifs' },
  { id: 'dizziness', label: 'Vertiges' },
  { id: 'ovupain', label: "Douleur d'ovulation" },
];

export const ENERGY = [
  { id: 1, label: 'Faible' },
  { id: 2, label: 'Normale' },
  { id: 3, label: 'Élevée' },
];

export const MUCUS = [
  { id: 'dry', label: 'Sèche', hint: 'Peu ou pas de glaire' },
  { id: 'sticky', label: 'Collante', hint: 'Épaisse, grumeleuse' },
  { id: 'creamy', label: 'Crémeuse', hint: 'Blanche, comme une lotion' },
  { id: 'watery', label: 'Aqueuse', hint: 'Fluide et humide' },
  { id: 'eggwhite', label: "Blanc d'œuf", hint: 'Filante et transparente : signe de fertilité' },
];

export const SEX = [
  { id: 'protected', label: 'Protégé' },
  { id: 'unprotected', label: 'Non protégé' },
];

export const TESTS = [
  { id: 'negative', label: 'Négatif' },
  { id: 'positive', label: 'Positif' },
];

// L'identifiant 'avoid' est conservé pour les données existantes, mais Lune ne promet jamais
// d'éviter une grossesse : ce n'est pas une méthode de contraception.
export const GOALS = [
  { id: 'track', label: 'Suivre mon cycle', hint: 'Prévoir mes règles et mieux me connaître' },
  { id: 'conceive', label: 'Essayer de concevoir', hint: 'Savoir quand l’ovulation est la plus probable (estimation)' },
  { id: 'avoid', label: 'Je ne cherche pas de grossesse', hint: 'Lune ne remplace pas une contraception' },
];

export const CONTRACEPTION = [
  { id: 'none', label: 'Aucune' },
  { id: 'pill', label: 'Pilule', hormonal: true },
  { id: 'iud_h', label: 'Stérilet hormonal', hormonal: true },
  { id: 'iud_cu', label: 'Stérilet au cuivre' },
  { id: 'implant', label: 'Implant', hormonal: true },
  { id: 'ring', label: 'Anneau ou patch', hormonal: true },
  { id: 'condom', label: 'Préservatif' },
  { id: 'other', label: 'Autre' },
];

export const isHormonal = (id) => !!CONTRACEPTION.find((c) => c.id === id)?.hormonal;

// Libellés de fertilité : jamais de « faible » ni de « jour sûr » (une estimation calendaire
// ne permet pas de savoir quand une grossesse est impossible).
export const FERTILITY = {
  low: { label: 'Estimation' },
  high: { label: 'Fenêtre fertile estimée' },
  peak: { label: 'Ovulation probable' },
};

export const PHASES = {
  menstrual: {
    name: 'Règles',
    title: 'Phase menstruelle',
    text: "La muqueuse de l'utérus s'élimine. Les hormones sont au plus bas : l'énergie peut l'être aussi.",
    tips: ['Une bouillotte soulage souvent les crampes', 'Pense à bien t’hydrater', 'Le mouvement doux (marche, yoga) peut aider'],
  },
  follicular: {
    name: 'Phase folliculaire',
    title: 'Phase folliculaire',
    text: "Les œstrogènes remontent et un ovule se prépare. L'énergie et la motivation reviennent souvent.",
    tips: ['Bon moment pour les nouveaux projets', 'Le corps récupère vite : idéal pour le sport'],
  },
  ovulatory: {
    name: 'Ovulation',
    title: "Période d'ovulation",
    text: "Pic de fertilité. La glaire devient plus fluide ; certaines personnes ressentent une petite douleur d'un côté du bas-ventre.",
    tips: ['La glaire « blanc d’œuf » signale les jours les plus fertiles', 'Un test d’ovulation (LH) affine la prévision'],
  },
  luteal: {
    name: 'Phase lutéale',
    title: 'Phase lutéale',
    text: 'La progestérone domine. Fatigue, fringales ou sensibilité peuvent apparaître à l’approche des règles (SPM).',
    tips: ['Privilégie le sommeil et les repas réguliers', 'Note tes symptômes pour repérer tes schémas'],
  },
};

export const DISCLAIMER =
  "Lune fournit des estimations à partir de tes données. Ce n'est ni une méthode de contraception, ni un avis médical. Consulte un·e professionnel·le de santé en cas de doute, de douleurs importantes ou de cycles très irréguliers.";

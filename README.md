<p align="center">
  <img src="icons/icon-192.png" alt="Icône de Lune" width="96" height="96">
</p>

<h1 align="center">Lune</h1>

<p align="center">
  <b>Suivi de cycle menstruel simple, élégant et privé.</b><br>
  Une app web à installer sur l'écran d'accueil de votre iPhone. Sans compte, sans serveur, sans publicité.
</p>

---

## En bref

- **Vos données restent sur votre téléphone.** Rien n'est envoyé sur Internet : pas de compte, pas de serveur, pas de traceur, pas de publicité.
- **Elle s'installe comme une vraie app.** Elle a son icône sur l'écran d'accueil, s'ouvre en plein écran et fonctionne hors ligne.
- **Gratuite et sans dépendance.** Elle est écrite en HTML, CSS et JavaScript, sans bibliothèque externe.
- **En français**, avec un mode sombre automatique.

> ⚠️ Lune donne des **estimations**. Ce n'est **ni une méthode de contraception, ni un avis médical** (voir [Limites](#limites-et-santé)).

---

## Sommaire

1. [Fonctionnalités](#fonctionnalités)
2. [Installer Lune sur iPhone](#installer-lune-sur-iphone)
3. [Premier lancement](#premier-lancement)
4. [Utiliser Lune au quotidien](#utiliser-lune-au-quotidien)
5. [Comment sont calculées les prévisions](#comment-sont-calculées-les-prévisions)
6. [Rappels](#rappels)
7. [Confidentialité et sauvegardes](#confidentialité-et-sauvegardes)
8. [Limites et santé](#limites-et-santé)
9. [Questions fréquentes](#questions-fréquentes)
10. [Pour les développeurs](#pour-les-développeurs)

---

## Fonctionnalités

| | |
|---|---|
| 🌙 **Aujourd'hui** | Un anneau montre où vous en êtes dans votre cycle : jour du cycle et règles dans X jours. Vous y trouvez aussi la fenêtre fertile estimée, la phase en cours avec des conseils, et les dates à venir. |
| 📝 **Journal du jour** | Flux des règles, humeur, symptômes, énergie, glaire cervicale, rapports, tests d'ovulation et de grossesse, prise de pilule, température basale, poids et notes libres. |
| 📅 **Calendrier** | Règles notées, règles prévues, fenêtre fertile et ovulation, mois par mois. Un mode « modifier » permet d'ajouter ou de retirer des jours de règles d'un simple toucher. |
| 📊 **Bilan** | Durée moyenne du cycle et des règles, régularité, historique de chaque cycle, courbe de température, et symptômes les plus fréquents selon la phase du cycle. |
| 🔮 **Prévisions honnêtes** | Une date accompagnée d'une plage probable et d'un niveau de confiance, recalculés chaque jour. Un mode « cycles irréguliers » affiche seulement une plage quand les cycles varient beaucoup. La température basale ou un test d'ovulation positif confirment l'ovulation. Les prévisions peuvent aussi être masquées. |
| 🔔 **Rappels** | Règles et fenêtres fertiles des 6 prochains cycles, et rappel quotidien de pilule, ajoutés à l'app Calendrier de l'iPhone. |
| 🔒 **Code de verrouillage** | Un code à 4 chiffres, demandé à l'ouverture et à chaque retour dans l'app. |
| 💾 **Sauvegarde** | Export et restauration de vos données dans un fichier, et export en tableau (CSV) pour un rendez-vous médical. |
| ✈️ **Hors ligne** | Une fois installée, Lune fonctionne sans connexion. |

---

## Installer Lune sur iPhone

Lune est une **app web** : on l'installe depuis Safari, sans passer par l'App Store.

1. Ouvrez l'adresse de l'app dans **Safari**. Elle est indiquée dans la colonne de droite de ce dépôt (section *About* ou *Deployments*).
2. Touchez **« Partager »**. Selon la disposition de vos onglets, ce bouton se trouve directement dans la barre, ou dans le menu **•••**.
3. Choisissez **« Sur l'écran d'accueil »**. S'il n'apparaît pas, touchez « Modifier les actions » en bas de la liste.
4. Vérifiez que **« Ouvrir comme app web »** est activé, puis touchez **« Ajouter »**.
5. **Ouvrez toujours Lune depuis son icône**, pas depuis Safari : l'app installée a son propre espace de stockage.

Ces étapes ont été écrites pour iOS 26. Sur d'autres systèmes ou navigateurs, cherchez une option du type « Installer l'application » ou « Ajouter à l'écran d'accueil ». Lune a été conçue et testée en priorité pour l'iPhone.

---

## Premier lancement

Lune vous pose 5 questions rapides, toutes modifiables ensuite dans **Réglages** :

1. **La date de début de vos dernières règles.** Une date approximative suffit, et vous pouvez répondre « Je ne m'en souviens pas ».
2. **La durée habituelle de vos règles**, entre 2 et 10 jours (5 par défaut).
3. **La durée habituelle de votre cycle**, entre 20 et 45 jours (28 par défaut).
4. **Votre objectif** : suivre votre cycle, essayer de concevoir, ou « je ne cherche pas de grossesse ». Dans ce dernier cas, Lune rappelle chaque jour qu'elle ne remplace pas une contraception.
5. **Votre contraception.** Avec une contraception hormonale, l'affichage de la fertilité est désactivé, car il n'y a généralement pas d'ovulation.

---

## Utiliser Lune au quotidien

### Quand vos règles commencent
Sur l'écran **Aujourd'hui**, touchez **« Mes règles ont commencé »**. Les jours suivants, touchez **« Noter mes règles aujourd'hui »** ou précisez le flux dans le journal.

Pour corriger des dates passées, allez dans **Calendrier**, touchez le crayon ✏️, puis touchez les jours concernés pour les ajouter ou les retirer. Terminez par **« Terminé »**.

### Noter votre journée
Touchez le bouton **+** en haut de l'écran, ou n'importe quel jour du calendrier. Tout s'enregistre instantanément ; touchez à nouveau une option pour l'effacer. Les flèches ‹ › permettent de passer d'un jour à l'autre.

- **Température basale** : prenez-la au réveil, avant de vous lever, à la même heure chaque jour. Si un relevé est perturbé (alcool, fièvre, nuit courte, heure décalée), indiquez-le sous « Relevé inhabituel ? » : il restera visible mais ne servira pas à repérer l'ovulation.
- **Glaire cervicale** : notez son aspect chaque jour, y compris « Sèche » ou « Rien vu, rien senti ». La glaire « aqueuse » ou « blanc d'œuf » annonce les jours les plus fertiles, et Lune repère le **jour pic**.
- **Test d'ovulation (LH)** : un test positif annonce une ovulation probable dans 1 à 2 jours.
- La carte **Fertilité** résume ce que vous avez observé pendant le cycle : glaire, température et tests LH.

### Lire l'écran « Aujourd'hui »
- **L'anneau** représente le cycle en cours : rose pour les règles, vert pour la fenêtre fertile, vert foncé pour l'ovulation. Le rond blanc indique aujourd'hui, et les jours à venir sont plus pâles.
- **Fertilité** : la carte indique la fenêtre fertile estimée, c'est-à-dire la période où l'ovulation est statistiquement plus probable. Lune n'affiche jamais de « jours sûrs » : une estimation calculée d'après le calendrier ne dit pas quand une grossesse est impossible.
- **Cycle qui s'allonge** : si vos règles n'arrivent pas à la date prévue, Lune affiche le jour du cycle en cours et votre plus long cycle récent, sans compteur de « retard ».
- **À venir** : prochaines règles (date la plus probable et plage où elles arrivent environ 8 fois sur 10), fenêtre fertile et ovulation estimée.

### Cycles irréguliers
Si vos cycles varient de plus de 9 jours, Lune passe automatiquement en **mode cycles irréguliers** (réglable dans **Réglages → Prévisions** : Auto, Activé ou Désactivé).
- Lune affiche une **plage probable** pour les prochaines règles (« entre le 24 nov. et le 10 déc. ») et la probabilité qu'elles arrivent dans les 7 jours.
- La fenêtre fertile n'est plus calculée d'après le calendrier : seule une ovulation **observée** (température, test LH) est signalée.
- Dans le calendrier, les jours possibles apparaissent en rose clair.

Vous pouvez aussi **masquer toutes les prévisions** (Réglages → Prévisions) : Lune ne montre alors que l'historique et vos observations.

### Ma situation
Dans **Réglages → Ma situation**, vous pouvez signaler plusieurs situations : SOPK (désormais SMOP), périménopause, sport intensif ou perte de poids, accouchement récent (avec ou sans allaitement), arrêt d'une contraception hormonale. Ces informations restent sur votre téléphone et Lune ne pose jamais de diagnostic.
- **Effet général** : Lune affiche des plages larges et ne calcule plus la fenêtre fertile d'après le calendrier.
- **Après un accouchement** : Lune ne prévoit rien avant le retour des règles. Elle rappelle qu'une grossesse est possible avant les premières règles et, si vous allaitez, à quelles conditions l'allaitement protège.
- **Après un accouchement ou l'arrêt d'une contraception** : les cycles d'avant ne comptent plus dans les prévisions, et le mode cycles irréguliers reste actif pendant 3 cycles. Si vous passez d'une contraception hormonale à « Aucune », la date d'arrêt est notée automatiquement.
- **Test de grossesse positif** : les alertes et les messages sur le cycle sont mis en pause.

### Bilan : précision et résumé pour un rendez-vous
- **Précision de vos prévisions** : Lune refait la prévision de chacun de vos cycles passés à partir des seuls cycles d'avant, puis la compare à la réalité.
  - Elle affiche l'erreur médiane, la part de prévisions justes à ± 3 jours, et la part de cas où la vraie date tombait dans la plage annoncée.
  - Elle compare sa méthode à trois autres : moyenne des 6 derniers cycles, médiane, moyenne pondérée.
  - Si ses plages se sont révélées trop étroites, elle les élargit automatiquement.
  - L'indice devient fiable à partir de 6 à 9 cycles.
- **Résumé pour un rendez-vous** (Réglages → Sauvegarde, ou depuis le Bilan) : une page des 12 derniers mois à imprimer ou à enregistrer en PDF. Elle contient les cycles et leur durée, les ovulations observées, les points relevés et les symptômes les plus notés.

### Bilan
Vos statistiques apparaissent après votre **premier cycle complet**, c'est-à-dire au début de vos règles suivantes. Elles deviennent plus fiables au bout de 3 cycles.

---

## Comment sont calculées les prévisions

Les calculs sont simples et transparents :

- **Durée du cycle et plage de dates** : Lune utilise un modèle bayésien simple. La durée que vous avez indiquée sert de point de départ. Plus vous notez de cycles, plus Lune se fie à votre historique (12 derniers cycles) : le poids de vos données passe de 67 % après 1 cycle à 92 % après 6. Le modèle donne une loi de probabilité (loi de Student), d'où viennent la date la plus probable et la plage à 80 %.
  - **Mise à jour quotidienne** : chaque jour sans règles, les dates déjà passées sont écartées et la plage est recalculée. Quand la date est dépassée, Lune n'annonce donc plus « demain » tous les jours.
  - **Niveau de confiance** : il est « élevé » si la plage fait 6 jours ou moins, « moyen » jusqu'à 14 jours, « faible » au-delà.
  - **Ovulation observée** (température ou test LH) : la plage se resserre autour de « ovulation + phase lutéale ».
- **Cycles longs** : ils sont gardés, car ils sont fréquents en cas de SOPK (désormais SMOP), de périménopause ou après un accouchement. Seuls les cycles de moins de 15 jours sont ignorés.
  - Si un cycle est nettement plus long que d'habitude (au moins 1,6 fois votre durée habituelle et au moins 10 jours de plus), Lune vous demande si des règles ont été oubliées.
  - Si vous répondez « Oui », vous ajoutez les jours oubliés dans le calendrier. Si vous confirmez que c'était un vrai cycle long, il compte dans les statistiques, avec un poids réduit de moitié dans la moyenne.
  - La même question est posée pour le cycle en cours quand il dépasse ce seuil.
- **Ovulation estimée** : on prend la durée du cycle moins la phase lutéale (14 jours par défaut, réglable entre 10 et 16). Pour un cycle de 28 jours, cela donne le jour 14.
- **Fenêtre fertile** : elle va de 5 jours avant l'ovulation jusqu'au lendemain de l'ovulation, soit 7 jours.
- **Signes du corps** : ils priment toujours sur le calendrier. Ce sont les règles de la méthode symptothermique (Sensiplan), réécrites à partir de leur description publiée.
  - **Température** : la règle principale demande 3 relevés plus hauts que les 6 précédents, le troisième dépassant leur maximum d'au moins 0,2 °C.
    - Deux exceptions couvrent les montées lentes. Dans la première, un 4ᵉ relevé reste haut alors que le 3ᵉ n'atteint pas + 0,2 °C. Dans la seconde, un relevé retombe mais le 4ᵉ atteint + 0,2 °C.
    - Les relevés exclus sont ignorés. Si les relevés sont trop espacés, Lune ne conclut rien.
    - Un cycle terminé, bien mesuré et sans montée est indiqué « aucune montée de température détectée ».
  - **Glaire** : elle reçoit un score de 0 (sèche) à 4 (aqueuse ou blanc d'œuf).
    - La première glaire au moins « collante » ouvre la fenêtre fertile.
    - Le **jour pic** est la glaire la plus fertile, suivie de 3 jours de glaire moins fertile. C'est l'estimation de l'ovulation.
    - Si une glaire très fertile revient, la recherche du pic recommence, ce qui arrive dans les cycles longs.
  - **Test LH** : l'ovulation est estimée au lendemain du premier test positif. Ce test est retenu seul seulement s'il n'y a qu'un épisode positif et si les cycles sont réguliers.
    - Si la température ou la glaire ne le confirment pas, si plusieurs pics apparaissent, ou si le mode cycles irréguliers est actif, le test reste « non confirmé » : les faux pics sont fréquents en cas de SOPK.
  - **Statut** : l'ovulation est **confirmée** quand la température et la glaire (ou un test LH) concordent, et **probable** avec un seul signe.
- **Phase lutéale personnelle** : c'est la durée entre l'ovulation et les règles. Lune l'apprend sur vos cycles où l'ovulation a été observée.
  - Elle part de 13 jours et compte pour 3 cycles tant que vous en avez peu, entre 9 et 17 jours.
  - Une phase courte isolée (10 jours ou moins) est signalée mais pas comptée.
  - Une fois l'ovulation observée, les prochaines règles sont annoncées à « ovulation + phase lutéale personnelle », avec une plage d'environ ± 2 à 3 jours.
- **Règles qui tardent** : si les règles n'arrivent pas à la date prévue, Lune décale les prévisions suivantes et affiche des messages gradués.
  - D'abord, elle rappelle qu'un cycle peut varier de quelques jours, et qu'un test de grossesse est généralement fiable dès le jour où les règles étaient attendues, si une grossesse est possible.
  - À partir de 36 jours, elle indique que le cycle est plus long que d'habitude.
  - À partir de 90 jours, elle suggère d'en parler à un·e professionnel·le de santé, comme le recommandent les guides internationaux.
- **Régularité** : les cycles sont dits « variables » si l'écart entre le plus court et le plus long de vos 6 derniers cycles dépasse 9 jours (seuil FIGO quand l'âge n'est pas connu), ou si l'écart médian entre deux cycles consécutifs dépasse 9 jours.
- **À évoquer avec un·e professionnel·le** : Lune relève ces cas, tirés des recommandations internationales, sans jamais poser de diagnostic :
  - au moins 2 des 6 derniers cycles de moins de 21 jours ;
  - au moins 2 des 6 derniers cycles de plus de 35 jours ;
  - un cycle de 90 jours ou plus dans l'année ;
  - moins de 8 règles en 12 mois ;
  - au moins 2 des 6 dernières règles de plus de 8 jours ;
  - des saignements entre les règles dans au moins 2 cycles ;
  - des « douleurs intenses » notées dans au moins 2 cycles.

  Comme dans Apple Santé, Lune vous demande d'abord si votre historique est complet. Le point n'apparaît dans le Bilan qu'après votre confirmation, et vous pouvez choisir de ne plus le voir. Les alertes sont en pause sous contraception hormonale, pendant l'allaitement, dans l'année qui suit un accouchement et après un test de grossesse positif.

---

## Rappels

Une app web sur iPhone ne peut pas programmer de notifications toute seule. Il lui faudrait un serveur, et Lune n'en a volontairement pas. Les rappels passent donc par **l'app Calendrier** :

1. Allez dans **Réglages → Rappels** et touchez **« Ajouter mes prochaines dates au Calendrier »**. Si vous prenez la pilule, touchez aussi **« Ajouter le rappel de pilule »**.
2. Lune crée un fichier calendrier (`.ics`). Ouvrez-le pour l'ajouter au Calendrier ; si la feuille de partage s'affiche, enregistrez-le d'abord dans **Fichiers**.
3. Calendrier vous préviendra la veille des règles prévues, au début de chaque fenêtre fertile, et chaque jour à l'heure de la pilule.

Les prévisions évoluent au fil des cycles : refaites l'export de temps en temps, en supprimant d'abord les anciens événements pour éviter les doublons.

---

## Confidentialité et sauvegardes

- **Aucune donnée ne quitte l'appareil.** Tout est enregistré dans le stockage local de l'app installée. Le site qui héberge Lune ne fait que distribuer le code, identique pour tout le monde, et ne voit jamais vos données.
- **Aucune requête externe** : pas de police web, pas de statistiques de visite, pas de bibliothèque chargée depuis Internet.
- **Le code de verrouillage** protège l'accès à l'app, mais les données ne sont pas chiffrées. Il ne peut pas être récupéré : en cas d'oubli, la seule solution est d'effacer les données de Lune.

### Pensez à sauvegarder
Vos données n'existent qu'à un seul endroit. Elles peuvent disparaître si vous supprimez l'icône de l'écran d'accueil, si vous changez de téléphone ou si iOS fait du ménage dans les données des sites web.

- **Exporter** : **Réglages → Sauvegarde → Exporter une sauvegarde**, puis rangez le fichier dans Fichiers ou sur iCloud Drive. Lune vous le rappelle tous les 30 jours.
- **Restaurer** : **Réglages → Sauvegarde → Restaurer une sauvegarde**.
- Le fichier contient des informations de santé : gardez-le pour vous.

---

## Limites et santé

- Les prévisions sont des **estimations** fondées sur vos cycles passés. Elles sont moins fiables si les cycles sont irréguliers, après l'arrêt d'une contraception, après une grossesse, pendant l'allaitement ou à l'approche de la ménopause.
- **Lune n'est pas une méthode de contraception** : ne comptez pas sur la fenêtre fertile pour éviter une grossesse.
- **Lune ne remplace pas un avis médical** et ne pose aucun diagnostic. Consultez un·e professionnel·le de santé en cas de cycles très irréguliers, d'absence de règles inhabituelle, de douleurs intenses, de saignements très abondants ou en dehors des règles, ou de tout symptôme qui vous inquiète.

---

## Questions fréquentes

**Quelqu'un peut-il voir mes données en ouvrant l'adresse de l'app ?**
Non. Chaque personne reçoit la même app, vide. Vos données ne sont que sur votre téléphone.

**Je change d'iPhone, comment garder mes données ?**
Exportez une sauvegarde sur l'ancien iPhone, transférez le fichier (AirDrop, iCloud Drive, e-mail), installez Lune sur le nouvel iPhone, puis restaurez la sauvegarde.

**Lune fonctionne-t-elle sans Internet ?**
Oui, après une première ouverture avec une connexion.

**Une mise à jour n'apparaît pas.**
Fermez complètement Lune puis rouvrez-la avec Internet, deux fois si besoin. Vos données ne sont pas touchées par les mises à jour.

**J'ai oublié mon code.**
Il ne peut pas être récupéré. Touchez « Code oublié ? » pour effacer les données de Lune, puis restaurez votre dernière sauvegarde si vous en avez une.

---

## Pour les développeurs

Lune est une application web statique, sans étape de compilation ni dépendance.

```
index.html             Point d'entrée
manifest.webmanifest   Nom, icônes et couleurs de l'app installée
sw.js                  Service worker : mise en cache pour le mode hors ligne
css/styles.css         Styles (couleurs, mode sombre)
js/app.js              Interface : écrans, journal, calendrier, bilan, réglages
js/engine.js           Moteur de calcul : cycles, prévisions, ovulation, statistiques, fichiers .ics
js/store.js            Stockage local, sauvegarde, export CSV, code de verrouillage
js/content.js          Textes et listes d'options (symptômes, humeurs…)
icons/                 Icônes de l'app
```

**Lancer en local.** Depuis le dossier qui contient `index.html` :

```bash
python -m http.server 8642
```

Ouvrez ensuite http://localhost:8642/. Le service worker est volontairement désactivé sur `localhost`.

**Héberger votre propre copie.** Lune fonctionne sur n'importe quel hébergement statique en HTTPS, par exemple GitHub Pages : faites un *fork* de ce dépôt, puis allez dans **Settings → Pages → Deploy from a branch**. Tous les chemins sont relatifs, l'app fonctionne donc aussi dans un sous-dossier.

**Publier une mise à jour.** Changez la constante `VERSION` en haut de `sw.js` (`lune-v1` → `lune-v2`…). Sans ce changement, les appareils garderont l'ancienne version en cache.

**Données.** Tout est enregistré dans `localStorage`, sous la clé `lune:v1`, sous la forme :

```js
{ settings: { cycleLength, periodLength, lutealLength, goal, contraception, … },
  days: { "AAAA-MM-JJ": { flow, symptoms, moods, energy, mucus, sex, ovuTest, pregTest, pill, temp, weight, note } } }
```

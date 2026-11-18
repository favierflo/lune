/* Lune — service worker : permet à l'app de fonctionner sans connexion.
 *
 * ATTENTION : À CHAQUE MISE À JOUR DE L'APP, CHANGEZ LA VERSION CI-DESSOUS
 *    (par exemple 'lune-v1' → 'lune-v2' → 'lune-v3'…), puis remettez
 *    les fichiers en ligne. C'est ce changement qui indique à l'iPhone
 *    qu'une nouvelle version existe : il la télécharge et efface l'ancienne.
 *    Gardez toujours le début « lune- ».
 *    (Vos données personnelles ne sont PAS dans ce cache : changer la
 *    version ne les efface pas.)
 */
const VERSION = 'lune-v5';

// Préfixe commun à tous les caches de Lune (sert au nettoyage des anciennes versions).
const CACHE_PREFIX = 'lune-';

// Fichiers enregistrés sur le téléphone dès l'installation (chemins relatifs).
const PRECACHE = [
  './',
  './index.html',
  './css/styles.css',
  './js/app.js',
  './js/engine.js',
  './js/store.js',
  './js/content.js',
  './manifest.webmanifest',
  './icons/apple-touch-icon.png',
  './icons/favicon-32.png',
  './icons/icon-192.png',
  './icons/icon-512.png',
  './icons/icon-maskable-512.png',
];

// Délai maximal d'attente du réseau pour l'ouverture d'une page (en millisecondes).
const NAVIGATION_TIMEOUT_MS = 3000;

const SHELL_URL = new URL('./index.html', self.location).href;
const SCOPE_URL = new URL('./', self.location).href;

/* ---------- Installation : mise en cache des fichiers ---------- */

self.addEventListener('install', (event) => {
  self.skipWaiting();
  event.waitUntil(precache());
});

async function precache() {
  const cache = await caches.open(VERSION);
  // `cache: 'reload'` contourne le cache HTTP du navigateur pour obtenir
  // vraiment la dernière version des fichiers.
  const requests = PRECACHE.map((url) => new Request(url, { cache: 'reload' }));
  try {
    await cache.addAll(requests);
  } catch (error) {
    // addAll est « tout ou rien » : si un seul fichier manque, rien n'est
    // enregistré. On réessaie fichier par fichier pour garder tout le reste.
    console.warn('[Lune] Précache groupé impossible, ajout fichier par fichier.', error);
    await Promise.all(
      requests.map(async (request) => {
        try {
          const response = await fetch(request);
          if (!isCacheable(response)) {
            throw new Error(`réponse HTTP ${response.status}`);
          }
          await cache.put(request, response);
        } catch (err) {
          console.warn(`[Lune] Fichier non mis en cache : ${request.url}`, err);
        }
      }),
    );
  }
}

/* ---------- Activation : suppression des anciennes versions ---------- */

self.addEventListener('activate', (event) => {
  event.waitUntil(
    (async () => {
      const names = await caches.keys();
      await Promise.all(
        names
          // On ne touche qu'aux caches de Lune : d'autres sites hébergés à la
          // même adresse (ex. vous.github.io) peuvent avoir les leurs.
          .filter((name) => name !== VERSION && name.startsWith(CACHE_PREFIX))
          .map((name) => caches.delete(name)),
      );
      await self.clients.claim();
    })(),
  );
});

/* ---------- Messages venant de l'app ---------- */

self.addEventListener('message', (event) => {
  if (event.data && event.data.type === 'SKIP_WAITING') {
    self.skipWaiting();
  }
});

/* ---------- Requêtes réseau ---------- */

self.addEventListener('fetch', (event) => {
  const { request } = event;
  if (request.method !== 'GET') return;

  const url = new URL(request.url);
  if (url.origin !== self.location.origin) return; // autres sites : on ne touche à rien
  if (!url.href.startsWith(SCOPE_URL)) return;     // hors du dossier de Lune

  if (request.mode === 'navigate') {
    event.respondWith(networkFirst(event));
  } else {
    event.respondWith(staleWhileRevalidate(event));
  }
});

// Pages : réseau d'abord (3 s max), sinon la copie enregistrée de l'app.
async function networkFirst(event) {
  const { request } = event;
  const cache = await caches.open(VERSION);

  const network = fetch(request).then(async (response) => {
    const keys = isShellUrl(request.url) ? [request, SHELL_URL] : [request];
    await store(cache, keys, response);
    return response;
  });
  // Même si on répond avec le cache, on laisse le téléchargement se terminer
  // pour que la copie enregistrée soit à jour la prochaine fois.
  event.waitUntil(network.catch(() => {}));

  try {
    const response = await withTimeout(network, NAVIGATION_TIMEOUT_MS);
    // Réponse normale, ou redirection que le navigateur suivra lui-même.
    if (response.ok || response.type === 'opaqueredirect') return response;
    // Erreur du serveur (404, 500…) : l'app enregistrée reste utilisable,
    // même si le site a été supprimé ou est en panne.
    const cached = await cachedShell(cache, request);
    return cached || response;
  } catch (error) {
    // Hors ligne ou réseau trop lent.
    const cached = await cachedShell(cache, request);
    if (cached) return cached;
    try {
      return await network; // rien en cache : on attend quand même le réseau
    } catch (err) {
      return offlinePage();
    }
  }
}

// Autres fichiers : réponse immédiate depuis le cache, mise à jour en arrière-plan.
async function staleWhileRevalidate(event) {
  const { request } = event;
  const cache = await caches.open(VERSION);
  const cached = await cache.match(request);

  const network = fetch(request).then(async (response) => {
    await store(cache, [request], response);
    return response;
  });

  if (cached) {
    event.waitUntil(network.catch(() => {}));
    return cached;
  }
  try {
    return await network;
  } catch (error) {
    return Response.error();
  }
}

/* ---------- Outils ---------- */

// On n'enregistre jamais une erreur (404, 500…) ni une réponse d'un autre site.
function isCacheable(response) {
  return Boolean(response) && response.ok && response.type === 'basic';
}

// Enregistre une copie de la réponse sous chaque clé (sans jamais faire échouer la requête).
async function store(cache, keys, response) {
  if (!isCacheable(response)) return;
  const copies = keys.map(() => response.clone());
  try {
    await Promise.all(keys.map((key, i) => cache.put(key, copies[i])));
  } catch (error) {
    console.warn('[Lune] Mise en cache impossible.', error);
  }
}

function isShellUrl(href) {
  const url = new URL(href);
  url.search = '';
  url.hash = '';
  return url.href === SCOPE_URL || url.href === SHELL_URL;
}

async function cachedShell(cache, request) {
  const response =
    (await cache.match(SHELL_URL)) ||
    (await cache.match(request, { ignoreSearch: true })) ||
    (await cache.match(SCOPE_URL));
  return response ? withoutRedirect(response) : undefined;
}

// Safari refuse d'afficher une page servie par le service worker si la réponse
// enregistrée provenait d'une redirection : on en refait une copie « propre ».
async function withoutRedirect(response) {
  if (!response.redirected) return response;
  const body = await response.blob();
  return new Response(body, {
    status: response.status,
    statusText: response.statusText,
    headers: response.headers,
  });
}

function withTimeout(promise, ms) {
  return new Promise((resolve, reject) => {
    const timer = setTimeout(() => reject(new Error('délai dépassé')), ms);
    promise.then(
      (value) => {
        clearTimeout(timer);
        resolve(value);
      },
      (error) => {
        clearTimeout(timer);
        reject(error);
      },
    );
  });
}

function offlinePage() {
  const html =
    '<!doctype html><html lang="fr"><head><meta charset="utf-8">' +
    '<meta name="viewport" content="width=device-width, initial-scale=1">' +
    '<title>Lune — hors ligne</title></head>' +
    '<body style="font-family:-apple-system,system-ui,sans-serif;background:#FBF7F5;' +
    'color:#4a3a40;display:flex;min-height:100vh;align-items:center;justify-content:center;' +
    'text-align:center;margin:0;padding:24px">' +
    '<div><p style="font-size:1.25rem;margin:0 0 8px">Lune n’est pas encore disponible hors ligne.</p>' +
    '<p style="margin:0">Connectez-vous à Internet une première fois, puis réessayez.</p></div>' +
    '</body></html>';
  return new Response(html, {
    status: 503,
    headers: { 'Content-Type': 'text/html; charset=utf-8' },
  });
}

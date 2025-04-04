// service-worker.js

const CACHE_NAME = 'mes-dispos-cache-v1'; // Changez 'v1' si vous modifiez les fichiers à cacher
const FILES_TO_CACHE = [
  '.', // Alias pour index.html à la racine
  'index.html',
  'manifest.json',
  'icons/icon-192x192.png',
  'icons/icon-512x512.png'
  // Ajoutez ici d'autres fichiers si vous en séparez (CSS, autres JS, etc.)
];

// Installation du Service Worker : Mise en cache des fichiers statiques
self.addEventListener('install', (event) => {
  console.log('[ServiceWorker] Install');
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then((cache) => {
        console.log('[ServiceWorker] Pre-caching offline page');
        return cache.addAll(FILES_TO_CACHE);
      })
      .then(() => {
        return self.skipWaiting(); // Force le nouveau SW à devenir actif immédiatement
      })
  );
});

// Activation du Service Worker : Nettoyage des anciens caches
self.addEventListener('activate', (event) => {
  console.log('[ServiceWorker] Activate');
  event.waitUntil(
    caches.keys().then((keyList) => {
      return Promise.all(keyList.map((key) => {
        if (key !== CACHE_NAME) {
          console.log('[ServiceWorker] Removing old cache', key);
          return caches.delete(key);
        }
      }));
    })
    .then(() => {
         return self.clients.claim(); // Prend le contrôle de la page immédiatement
    })
  );
});

// Événement Fetch : Intercepter les requêtes réseau
self.addEventListener('fetch', (event) => {
  console.log('[ServiceWorker] Fetch', event.request.url);
  // Stratégie "Cache d'abord, puis réseau"
  event.respondWith(
    caches.match(event.request) // Chercher dans le cache
      .then((response) => {
        if (response) {
          return response; // Retourner la réponse du cache si trouvée
        }
        // Si non trouvé dans le cache, faire la requête réseau
        return fetch(event.request)
          .then((networkResponse) => {
            // Optionnel : Mettre en cache la nouvelle ressource récupérée
            // Attention : Il faut cloner la réponse car elle ne peut être lue qu'une fois
             if (networkResponse && networkResponse.status === 200 && event.request.method === 'GET') {
                 // Ne mettons en cache que les requêtes GET réussies pour éviter les erreurs
                 let responseToCache = networkResponse.clone();
                 caches.open(CACHE_NAME)
                     .then(cache => {
                          // Ne mettez en cache que si ce n'est pas une API externe ou autre chose dynamique non désirée ici
                          // Pour cette app simple, on pourrait tout cacher, mais soyons prudents.
                          // Vérifions si l'URL demandée fait partie de nos fichiers essentiels ou non.
                          // Ici, on ne mettra pas en cache dynamiquement, seulement ce qui est dans FILES_TO_CACHE à l'install.
                          // cache.put(event.request, responseToCache); // Ligne pour mettre en cache dynamiquement (commentée pour l'instant)
                     });
             }
             return networkResponse; // Retourner la réponse du réseau
          })
          .catch(() => {
              // Gérer l'échec de la requête réseau (par exemple, afficher une page hors ligne générique)
              // Pour cette application simple, ne rien faire laissera le navigateur afficher son erreur standard.
              console.warn('[ServiceWorker] Network request failed, and not found in cache.');
          });
      })
  );
});
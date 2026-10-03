// ToolBOX – service worker (hors-ligne).
// Stratégie « réseau d'abord » : avec du réseau, on sert toujours la dernière version du site
// (et on la met en cache) ; sans réseau, on sert la copie en cache. Les appels /api/ ne sont jamais mis en cache.

const VERSION = "toolbox-v1";   // à changer si tu veux forcer le vidage de l'ancien cache
const FONTS = "toolbox-fonts";
const FONT_HOSTS = new Set(["fonts.googleapis.com", "fonts.gstatic.com"]);
const TIMEOUT = 4000;           // au-delà, on utilise la copie en cache (connexion très lente)

// Pages et fichiers préchargés à l'installation, pour que tout marche hors ligne dès la première visite.
// Ajoute ici les nouvelles pages (les autres pages visitées sont mises en cache automatiquement).
const PRECACHE = [
  "/", "/manifest.json",
  "/assets/outil.css", "/assets/ia.js", "/assets/consent.js", "/assets/pwa.js",
  "/icons/icon-192.png", "/icons/icon-512.png", "/icons/apple-touch-icon.png",
  "/calcul/pourcentage.html", "/calcul/tva.html", "/calcul/moyenne.html", "/calcul/regle-de-trois.html", "/calcul/age.html",
  "/argent/salaire.html", "/argent/salaire-horaire.html", "/argent/budget.html",
  "/etudes/moyenne-scolaire.html", "/etudes/note-necessaire.html", "/etudes/planning.html",
  "/informatique/alimentation-pc.html", "/informatique/stockage.html", "/informatique/comparaison-gpu.html",
  "/images/jpg-vers-png.html", "/images/compression.html", "/images/redimensionnement.html",
  "/ia/resumer-texte.html", "/ia/reformulateur.html", "/ia/generateur-titre.html", "/ia/generateur-idees.html",
  "/ia/generateur-description.html", "/ia/generateur-cv.html", "/ia/generateur-lettre.html", "/ia/generateur-bio.html",
  "/ia/generateur-prompt.html", "/ia/description-vinted.html",
  "/legal/mentions-legales.html", "/legal/confidentialite.html", "/legal/contact.html"
];

// Clé de cache : « /calcul/tva.html » et « /calcul/tva » sont la même page, sans paramètres d'URL.
const key = url => {
  const u = new URL(url, self.location.origin);
  let p = u.pathname.replace(/\.html$/, "").replace(/\/index$/, "/");
  return u.origin + (p || "/");
};

// Une réponse issue d'une redirection ne peut pas servir une navigation : on en recrée une « propre ».
const clean = r => new Response(r.body, { status: r.status, statusText: r.statusText, headers: r.headers });

const withTimeout = (p, ms) => Promise.race([p, new Promise((_, rej) => setTimeout(() => rej(new Error("timeout")), ms))]);

self.addEventListener("install", e => {
  e.waitUntil((async () => {
    const cache = await caches.open(VERSION);
    await Promise.all(PRECACHE.map(async path => {
      try {
        const r = await fetch(path, { cache: "reload" });
        if (r.ok) await cache.put(key(path), clean(r));
      } catch (err) { console.warn("Précache impossible :", path, err && err.message); }
    }));
    await self.skipWaiting();
  })());
});

self.addEventListener("activate", e => {
  e.waitUntil((async () => {
    const names = await caches.keys();
    await Promise.all(names.filter(n => n !== VERSION && n !== FONTS).map(n => caches.delete(n)));
    await self.clients.claim();
  })());
});

async function networkFirst(req) {
  const cache = await caches.open(VERSION);
  try {
    const res = await withTimeout(fetch(req), TIMEOUT);
    if (res.ok) cache.put(key(req.url), clean(res.clone()));
    return res;
  } catch (_) {
    const hit = await cache.match(key(req.url));
    if (hit) return hit;
    if (req.mode === "navigate") {
      const home = await cache.match(self.location.origin + "/");
      if (home) return home;
    }
    return Response.error();
  }
}

async function cacheFirst(req) {
  const cache = await caches.open(FONTS);
  const hit = await cache.match(req);
  if (hit) return hit;
  const res = await fetch(req);
  if (res.ok || res.type === "opaque") cache.put(req, res.clone());
  return res;
}

self.addEventListener("fetch", e => {
  const req = e.request;
  if (req.method !== "GET" || req.headers.has("range")) return;
  const url = new URL(req.url);
  if (url.origin !== self.location.origin) {
    if (FONT_HOSTS.has(url.hostname)) e.respondWith(cacheFirst(req));
    return;
  }
  if (url.pathname.startsWith("/api/")) return;
  e.respondWith(networkFirst(req));
});

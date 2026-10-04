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
  "/calcul/imc.html", "/calcul/jours-entre-dates.html", "/argent/devises.html", "/argent/frais-de-notaire.html",
  "/informatique/mot-de-passe.html", "/texte/compteur-de-mots.html",
  "/calcul/pourcentage.html", "/calcul/tva.html", "/calcul/moyenne.html", "/calcul/regle-de-trois.html", "/calcul/age.html",
  "/argent/salaire.html", "/argent/salaire-horaire.html", "/argent/budget.html",
  "/etudes/moyenne-scolaire.html", "/etudes/note-necessaire.html", "/etudes/planning.html",
  "/informatique/alimentation-pc.html", "/informatique/stockage.html", "/informatique/comparaison-gpu.html",
  "/images/jpg-vers-png.html", "/images/compression.html", "/images/redimensionnement.html",
  "/ia/resumer-texte.html", "/ia/reformulateur.html", "/ia/generateur-titre.html", "/ia/generateur-idees.html",
  "/ia/generateur-description.html", "/ia/generateur-cv.html", "/ia/generateur-lettre.html", "/ia/generateur-bio.html",
  "/ia/generateur-prompt.html", "/ia/description-vinted.html",
  "/nutrition/besoins-caloriques.html", "/nutrition/compteur-calories.html", "/nutrition/macronutriments.html",
  "/nutrition/besoin-en-eau.html", "/nutrition/objectif-poids.html", "/nutrition/rappels.html",
  "/cuisine/grammes-en-ml.html", "/cuisine/portions-recette.html", "/cuisine/temps-de-cuisson.html", "/cuisine/celsius-fahrenheit.html",
  "/voyage/distance-entre-villes.html", "/voyage/temps-de-trajet.html", "/voyage/fuseaux-horaires.html",
  "/temps/compte-a-rebours.html", "/temps/duree-entre-heures.html", "/temps/heures-en-minutes.html", "/temps/minutes-en-secondes.html",
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

// Notifications push (rappels d'eau, collations…) : le serveur envoie le titre et le texte.
self.addEventListener("push", e => {
  let d = {};
  try { d = e.data ? e.data.json() : {}; } catch (_) {}
  e.waitUntil(self.registration.showNotification(d.title || "ToolBOX", {
    body: d.body || "",
    icon: "/icons/blank-96.png",    // image transparente : sans elle, Chrome affiche une pastille grise avec un « T »
    badge: "/icons/badge-96.png",   // petite icône monochrome de la barre d'état (une icône pleine s'afficherait en carré blanc)
    tag: d.tag || undefined,
    data: { url: d.url || "/nutrition/rappels.html" }
  }));
});

self.addEventListener("notificationclick", e => {
  e.notification.close();
  const target = new URL((e.notification.data && e.notification.data.url) || "/", self.location.origin).href;
  e.waitUntil((async () => {
    const wins = await self.clients.matchAll({ type: "window", includeUncontrolled: true });
    for (const w of wins) {
      if ("focus" in w) { await w.focus(); if ("navigate" in w) { try { await w.navigate(target); } catch (_) {} } return; }
    }
    await self.clients.openWindow(target);
  })());
});

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

/* ToolBOX – mesure d'audience (Cloudflare Web Analytics : sans cookie, sans identifiant, sans empreinte numérique).
   Désactivée par défaut : tant que TOKEN est vide, rien n'est chargé et aucune requête n'est envoyée.
   Pour l'activer : colle ci-dessous le jeton (32 caractères) fourni par Cloudflare, dans
   Analytics et journaux > Web Analytics > ton site. Rien n'est envoyé si le navigateur demande « Ne pas me suivre ». */
(function () {
  const TOKEN = "f8fe73baed3b4ac2b4dd0b359f1e063f";

  if (!/^[0-9a-f]{32}$/.test(TOKEN)) return;
  if (location.hostname === "localhost" || location.hostname === "127.0.0.1" || navigator.doNotTrack === "1") return;
  // Opposition du visiteur (case à cocher dans la politique de confidentialité)
  try { if (localStorage.getItem("toolbox-no-stats") === "1") return; } catch (_) {}

  const s = document.createElement("script");
  s.defer = true;
  s.src = "https://static.cloudflareinsights.com/beacon.min.js";
  s.dataset.cfBeacon = JSON.stringify({ token: TOKEN });
  document.head.append(s);
})();

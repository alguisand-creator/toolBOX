/* ToolBOX – bannière de consentement aux cookies.
   Aucun traceur ni publicité ne doit être chargé tant que le visiteur n'a pas accepté :
   passe ton code par ToolConsent.onGrant(() => { ...charger le script publicitaire... }).
   Le choix est gardé dans localStorage ("toolbox-consent"). Lien « Cookies » : <a href="#" data-cookie-settings>. */
(function () {
  const KEY = "toolbox-consent";
  const src = document.currentScript && document.currentScript.src;
  const base = src ? src.replace(/assets\/consent\.js.*$/, "") : "/";

  let value = null;
  try { value = localStorage.getItem(KEY); } catch (_) {}
  if (value !== "granted" && value !== "denied") value = null;

  const listeners = [];
  window.ToolConsent = {
    get: () => value,
    onGrant(fn) { if (value === "granted") fn(); else listeners.push(fn); }
  };

  const css = `
#tb-consent{position:fixed;left:1rem;right:1rem;bottom:1rem;z-index:1000;max-width:34rem;margin:0 auto;padding:1.1rem 1.2rem;
  background:var(--surface,#fff);color:var(--ink,#15212b);border:2px solid var(--ink,#15212b);border-radius:14px;
  box-shadow:6px 6px 0 var(--accent,#ffc21a);font:400 .95rem/1.5 var(--body,system-ui,sans-serif)}
#tb-consent p{margin:0 0 .5rem}
#tb-consent .tb-t{font:800 1.1rem var(--display,inherit)}
#tb-consent a{color:inherit}
#tb-consent .tb-b{display:flex;gap:.6rem;margin-top:.8rem}
#tb-consent button{flex:1;font:600 1rem var(--body,inherit);color:var(--ink,#15212b);background:var(--bg,#eceff2);
  border:2px solid var(--ink,#15212b);border-radius:10px;padding:.6rem .8rem;cursor:pointer}
#tb-consent button:hover{background:var(--accent,#ffc21a);color:var(--accent-ink,#15212b)}
#tb-consent[hidden]{display:none}
@media (min-width:640px){#tb-consent{left:1.5rem;right:auto;margin:0}}`;
  const style = document.createElement("style"); style.textContent = css; document.head.append(style);

  const box = document.createElement("div");
  box.id = "tb-consent"; box.hidden = true;
  box.setAttribute("role", "dialog");
  box.setAttribute("aria-labelledby", "tb-c-t");
  box.setAttribute("aria-describedby", "tb-c-d");
  box.innerHTML =
    `<p class="tb-t" id="tb-c-t">Tes choix sur les cookies</p>` +
    `<p id="tb-c-d">Aucun cookie publicitaire ni de mesure d'audience n'est déposé sans ton accord. ` +
    `Tu peux accepter ou refuser, et changer d'avis à tout moment avec le lien « Cookies » en bas de page. ` +
    `<a href="${base}legal/confidentialite.html">En savoir plus</a></p>` +
    `<div class="tb-b"><button type="button" data-v="denied">Tout refuser</button><button type="button" data-v="granted">Tout accepter</button></div>`;
  document.body.append(box);

  function choose(v) {
    const prev = value;
    value = v;
    try { localStorage.setItem(KEY, v); } catch (_) {}
    box.hidden = true;
    if (v === "granted") listeners.splice(0).forEach(fn => fn());
    if (prev === "granted" && v === "denied") location.reload(); // décharge ce qui a déjà été chargé
    document.dispatchEvent(new CustomEvent("toolbox-consent", { detail: v }));
  }

  box.addEventListener("click", e => {
    const b = e.target.closest("button[data-v]");
    if (b) choose(b.dataset.v);
  });

  document.addEventListener("click", e => {
    if (!e.target.closest("[data-cookie-settings]")) return;
    e.preventDefault();
    box.hidden = false;
    box.querySelector("button").focus();
  });

  if (value === null) box.hidden = false;

  // Publicité et mesure d'audience : ces scripts ne font rien tant qu'aucun identifiant n'y est renseigné
  ["ads", "stats"].forEach(name => {
    const s = document.createElement("script");
    s.src = base + "assets/" + name + ".js";
    s.defer = true;
    document.head.append(s);
  });
})();

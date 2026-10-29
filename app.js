import { MATERIALS, CATEGORIES, daysTo, driedWeight } from "./materials.js";
import { fetchWeather, cachedWeather, searchPlaces, days, finishDate, rating, describe, icon, houseRiseNow, houseRH } from "./weather.js";
import { appMode, savedPlace, savePlace, placeFromDevice, refreshDevicePlace, whyFailed } from "./location.js";

const MODE = appMode();
// The portfolio builds share one photo folder between the web and mobile copies.
const ASSETS = window.SDH_ASSETS || "";
document.documentElement.dataset.mode = MODE;
const view = document.getElementById("view");
const store = {
  get(k, d) { try { const v = localStorage.getItem(k); return v == null ? d : JSON.parse(v); } catch { return d; } },
  set(k, v) { try { localStorage.setItem(k, JSON.stringify(v)); } catch {} },
};
const state = {
  loc: savedPlace(),
  locating: false, locError: null,
  target: store.get("sdh-target", 3),
  area: store.get("sdh-area", 36),
  weather: null, forecast: null, loading: false, error: null,
  q: "", cat: "All",
  credits: {},
};
const byId = Object.fromEntries(MATERIALS.map((m) => [m.id, m]));
const POPULAR = ["red-chilli", "turmeric", "moringa", "copra", "mango", "tomato", "curry-leaves", "salted-fish"];

/* ---------- helpers ---------- */
const esc = (s) => String(s ?? "").replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
const fmt = (v, d = 0) => (v == null || Number.isNaN(v) ? "–" : v.toLocaleString(undefined, { maximumFractionDigits: d, minimumFractionDigits: d }));
const range = (a) => (a[0] === a[1] ? `${a[0]}` : `${a[0]}–${a[1]}`);
const dayWord = (n) => (n === 1 ? "day" : "days");
function fmtDays(x) {
  if (x === 0) return "Already there";
  const h = Math.max(0.5, Math.ceil(x * 2) / 2);
  return `${h % 1 ? fmt(h, 1) : h} ${dayWord(h)}`;
}
function dateLabel(iso, long = false) {
  const d = new Date(iso + "T00:00");
  const today = new Date(); today.setHours(0, 0, 0, 0);
  const diff = Math.round((d - today) / 86400000);
  if (diff === 0) return "Today";
  if (diff === 1) return "Tomorrow";
  return d.toLocaleDateString(undefined, long ? { weekday: "short", day: "numeric", month: "short" } : { weekday: "short" });
}
const I = {
  pin: '<svg viewBox="0 0 24 24"><path d="M12 21s-7-6.2-7-11.5a7 7 0 0 1 14 0C19 14.8 12 21 12 21z"/><circle cx="12" cy="9.5" r="2.5"/></svg>',
  gps: '<svg viewBox="0 0 24 24"><circle cx="12" cy="12" r="3"/><circle cx="12" cy="12" r="7"/><path d="M12 2v3M12 19v3M2 12h3M19 12h3"/></svg>',
  search: '<svg viewBox="0 0 24 24"><circle cx="11" cy="11" r="6.5"/><path d="M20 20l-4.2-4.2"/></svg>',
  back: '<svg viewBox="0 0 24 24"><path d="M15 5l-7 7 7 7"/></svg>',
  info: '<svg viewBox="0 0 24 24"><circle cx="12" cy="12" r="9"/><path d="M12 11v5M12 8h.01"/></svg>',
  warn: '<svg viewBox="0 0 24 24"><path d="M12 3l9.5 17h-19z"/><path d="M12 10v4M12 17h.01"/></svg>',
  check: '<svg viewBox="0 0 24 24"><circle cx="12" cy="12" r="9"/><path d="M8 12.5l2.8 2.8L16 10"/></svg>',
  sun: '<svg viewBox="0 0 24 24"><circle cx="12" cy="12" r="4"/><path d="M12 2v2.5M12 19.5V22M2 12h2.5M19.5 12H22M4.9 4.9l1.8 1.8M17.3 17.3l1.8 1.8M4.9 19.1l1.8-1.8M17.3 6.7l1.8-1.8"/></svg>',
  knife: '<svg viewBox="0 0 24 24"><path d="M4 20L18 6a2.8 2.8 0 0 1 0 4L8 20z"/></svg>',
  tray: '<svg viewBox="0 0 24 24"><path d="M3 10h18M3 15h18M5 10v9M19 10v9"/><path d="M8 6c1-1.5 2-1.5 3 0s2 1.5 3 0"/></svg>',
  temp: '<svg viewBox="0 0 24 24"><path d="M10 14.5V5a2 2 0 0 1 4 0v9.5a4 4 0 1 1-4 0z"/></svg>',
  done: '<svg viewBox="0 0 24 24"><path d="M5 12.5l4.5 4.5L19 7.5"/></svg>',
  bag: '<svg viewBox="0 0 24 24"><path d="M6 8h12l-1.2 11.2a2 2 0 0 1-2 1.8H9.2a2 2 0 0 1-2-1.8z"/><path d="M9 8V6a3 3 0 0 1 6 0v2"/></svg>',
};
const img = (id, alt = "") => `<img src="${ASSETS}images/${id}.jpg" alt="${esc(alt)}" loading="lazy" decoding="async">`;

/* ---------- place ---------- */
const placeBtn = document.getElementById("placeBtn");
const sheet = document.getElementById("placeSheet");
function showPlace() {
  placeBtn.hidden = !state.loc;
  if (state.loc) document.getElementById("placeName").textContent = state.loc.name;
}
function setPlace(p) {
  state.loc = p; savePlace(p); state.locError = null;
  state.weather = null; state.forecast = null;
  showPlace(); if (sheet.open) sheet.close();
  if (!location.hash || location.hash === "#home") render(); else location.hash = "home";
  loadWeather(true);
}
async function locateDevice() {
  state.locating = true; state.locError = null; render();
  try { setPlace(await placeFromDevice()); }
  catch (e) { state.locError = whyFailed(e); }
  state.locating = false; render();
}
function bindPlaceSearch(input, list) {
  let t;
  input.addEventListener("input", () => {
    clearTimeout(t);
    const q = input.value.trim();
    if (q.length < 2) { list.innerHTML = ""; return; }
    t = setTimeout(async () => {
      try {
        const res = await searchPlaces(q);
        list.innerHTML = res.length
          ? res.map((p, i) => `<li><button type="button" data-i="${i}"><b>${esc(p.name)}</b><small>${esc(p.region)}</small></button></li>`).join("")
          : `<li class="msg">No place called “${esc(q)}”. Try the nearest town.</li>`;
        list.querySelectorAll("button").forEach((b) => b.addEventListener("click", () => setPlace({ ...res[+b.dataset.i], source: "typed" })));
      } catch { list.innerHTML = `<li class="msg">Searching needs an internet connection.</li>`; }
    }, 280);
  });
}
placeBtn.addEventListener("click", () => {
  document.getElementById("placeInput").value = ""; document.getElementById("placeList").innerHTML = "";
  sheet.showModal();
  if (MODE === "web") document.getElementById("placeInput").focus();
});
bindPlaceSearch(document.getElementById("placeInput"), document.getElementById("placeList"));
document.getElementById("placeGps").addEventListener("click", async (e) => {
  const b = e.currentTarget; const old = b.innerHTML; b.textContent = "Finding you…";
  try { setPlace(await placeFromDevice()); } catch (err) { b.innerHTML = old; document.getElementById("placeList").innerHTML = `<li class="msg">${esc(whyFailed(err))} Type your town instead.</li>`; }
  b.innerHTML = old;
});
sheet.addEventListener("click", (e) => { if (e.target === sheet) sheet.close(); });

/* ---------- weather ---------- */
async function loadWeather(force = false) {
  if (!state.loc || state.loading) return;
  if (!force && state.weather && Date.now() - state.weather.at < 30 * 60 * 1000) return;
  if (!state.weather) { const c = cachedWeather(state.loc); if (c) setWeather({ ...c, live: false }); }
  state.loading = true; state.error = null;
  if (!state.weather) render();
  try { setWeather(await fetchWeather(state.loc)); }
  catch (e) { state.error = navigator.onLine === false ? "You're offline." : "The weather service didn't answer."; }
  state.loading = false;
  // Only redraw pages that show weather, so typing in a search box is never interrupted.
  if (["home", "m"].includes(state.route?.path || "home")) render();
}
function setWeather(w) { state.weather = w; state.forecast = days(w); }

/* ---------- router ---------- */
function route() {
  const h = decodeURIComponent(location.hash.slice(1)) || "home";
  const [path, arg] = h.split("/");
  const tab = path === "m" ? "materials" : path;
  document.querySelectorAll(".tabs a").forEach((a) => (a.dataset.tab === tab ? a.setAttribute("aria-current", "page") : a.removeAttribute("aria-current")));
  state.route = { path, arg };
  render();
  window.scrollTo(0, 0);
}
function render() {
  const { path, arg } = state.route || { path: "home" };
  if (path === "materials") return renderMaterials();
  if (path === "m" && byId[arg]) return renderDetail(byId[arg]);
  if (path === "calc") return renderCalc(arg);
  if (path === "guide") { view.replaceChildren(document.getElementById("guide-tpl").content.cloneNode(true)); document.title = "Guide · Solar Dry House"; return; }
  if (!state.loc) return renderWelcome();
  renderHome();
}

/* ---------- welcome (no place yet) ---------- */
const houseArt = `<svg class="welcome-art" viewBox="0 0 260 150" aria-hidden="true">
  <circle cx="58" cy="40" r="20" fill="var(--amber)" opacity=".9"/>
  <path d="M40 128V84Q130 18 220 84V128Z" fill="var(--sheet)" stroke="var(--sky)" stroke-width="3" stroke-linejoin="round"/>
  <rect x="34" y="126" width="192" height="8" rx="4" fill="var(--ink)"/>
  <g fill="var(--amber-soft)" stroke="var(--amber)" stroke-width="2"><rect x="80" y="108" width="100" height="6" rx="3"/><rect x="80" y="92" width="100" height="6" rx="3"/></g>
  <g fill="var(--red)"><circle cx="96" cy="88" r="3.5"/><circle cx="108" cy="88" r="3.5"/><circle cx="120" cy="88" r="3.5"/></g>
  <g fill="var(--green)"><ellipse cx="146" cy="104" rx="6" ry="3"/><ellipse cx="160" cy="104" rx="6" ry="3"/></g>
</svg>`;
function renderWelcome() {
  document.title = "Solar Dry House";
  if (MODE === "mobile" && (state.locating || !state.locError)) {
    view.innerHTML = `<section class="welcome"><div class="welcome-in">
      <div class="pulse">${I.pin}</div>
      <h1>Finding your dry house</h1>
      <p class="lede">The app uses your phone's location to read the weather where you dry. Allow location when your phone asks.</p>
    </div></section>`;
    if (!state.locating) locateDevice();
    return;
  }
  view.innerHTML = `<section class="welcome"><div class="welcome-in">
    ${houseArt}
    <h1>Where is your dry house?</h1>
    <p class="lede">Drying depends on your sun and humidity. Tell us the town or village and we'll read its live weather and forecast.</p>
    ${state.locError ? `<p class="note warn" style="text-align:left">${I.warn}<span>${esc(state.locError)} Type your town instead.</span></p>` : ""}
    <form id="wForm" onsubmit="return false">
      <div class="search">${I.search}<input class="input" id="wInput" type="search" placeholder="Town or village, e.g. Coimbatore" autocomplete="off" aria-label="Town or village"></div>
      <ul class="places" id="wList"></ul>
      <button class="btn ghost" id="wGps" type="button">${I.gps}Use my current location</button>
    </form>
    <p class="fine">Your place is kept on this device only.</p>
  </div></section>`;
  bindPlaceSearch(document.getElementById("wInput"), document.getElementById("wList"));
  document.getElementById("wGps").addEventListener("click", locateDevice);
  if (MODE === "web") document.getElementById("wInput").focus({ preventScroll: true });
}

/* ---------- home ---------- */
function greeting() { const h = new Date().getHours(); return h < 12 ? "Good morning" : h < 17 ? "Good afternoon" : "Good evening"; }

function renderHome() {
  document.title = "Solar Dry House";
  const W = state.weather, F = state.forecast;
  if (!W) {
    view.innerHTML = `<section class="page"><div class="hello"><p class="greet">${greeting()}</p><h1>Reading the sky over ${esc(state.loc.name)}…</h1></div>
      ${state.error ? `<p class="note warn">${I.warn}<span>${esc(state.error)} <button class="link" id="retry">Try again</button></span></p>` : `<div class="hero cloudy" style="min-height:220px"></div>`}</section>`;
    document.getElementById("retry")?.addEventListener("click", () => loadWeather(true));
    return;
  }
  const c = W.data.current, today = F[0];
  const [desc, kind] = describe(c.weather_code);
  const rise = c.is_day ? houseRiseNow(c.shortwave_radiation) : 1;
  const inT = c.temperature_2m + rise, inRH = houseRH(c.relative_humidity_2m, rise);
  const r = rating(today.f);
  const skin = !c.is_day ? "night" : kind === "rain" || kind === "storm" ? "rainy" : kind === "cloud" ? "cloudy" : "sunny";
  const sunrise = (F[1] || today).sunrise?.slice(11, 16);
  const headline = !c.is_day ? "Drying starts again at sunrise" : r.key === "good" ? "A great day for drying" : r.key === "fair" ? "A fair day for drying" : "Slow drying today";
  const tip = !c.is_day ? `Keep the vents and door shut tonight. Sunrise is at ${sunrise || "6 am"}.`
    : inT > 62 ? "It's very hot inside. Open the vents and lay shade net over leaves, flowers and seeds."
    : c.shortwave_radiation < 200 ? "The sun is weak right now. Keep the door shut to hold the heat."
    : "Good sun. Keep the fans running and turn the trays at 1 pm.";
  const best = bestStart(F);

  view.innerHTML = `
    <section class="page">
      <div class="hello"><p class="greet">${greeting()}</p><h1>${headline}</h1></div>

      <div class="hero ${skin}">
        <div class="hero-top">
          ${icon(c.is_day ? kind : "cloud", 64)}
          <div><div class="hero-temp">${fmt(c.temperature_2m)}°</div></div>
          <div class="hero-cond">${esc(desc)}<small>Outside in ${esc(state.loc.name)} · ${c.relative_humidity_2m}% humidity</small></div>
          <div class="hero-right"><span class="badge ${r.key}"><span class="dot ${r.key}"></span>${r.label} today</span></div>
        </div>
        <div class="hero-stats" aria-label="Inside the dry house now, estimated">
          <div><span>Inside air</span><b class="${inT > 62 ? "hot" : ""}">${fmt(inT)}°C</b></div>
          <div><span>Inside humidity</span><b>${fmt(inRH)}%</b></div>
          <div><span>Sun today</span><b>${fmt(today.rad)} MJ</b></div>
        </div>
        <div class="hero-tip">${c.is_day ? I.sun : I.info}<span>${tip}</span></div>
      </div>

      <div style="display:grid;gap:10px">
        <div class="section-h"><h2>Next ${F.length} days</h2><span class="src">midday inside the house</span></div>
        <div class="days" role="list">
          ${F.map((d, i) => { const [dd, k] = describe(d.code); const rr = rating(d.f); return `
            <div class="dayc ${i === 0 ? "today" : ""}" role="listitem" title="${esc(dd)} · outside ${fmt(d.tmax)}° · humidity ${fmt(d.rh)}% · rain ${d.rain}%">
              <span class="d">${dateLabel(d.date)}</span>${icon(k, 30)}<span class="t">${fmt(d.house)}°</span><span class="s"><span class="dot ${rr.key}"></span>${rr.label === "Good drying" ? "Good" : rr.label}</span>
            </div>`; }).join("")}
        </div>
        <div class="legend-row"><span><span class="dot good"></span>Good</span><span><span class="dot fair"></span>Fair</span><span><span class="dot poor"></span>Slow</span><span class="src">Live from Open-Meteo · ${new Date(W.at).toLocaleTimeString([], { hour: "numeric", minute: "2-digit" })}${W.live ? "" : " · saved copy"} · <button class="link" id="refresh">Refresh</button></span></div>
      </div>

      <div class="tips">
        <div class="card best"><div class="ic">${I.sun}</div><div style="display:grid;gap:4px"><span class="tag">Best time to load</span><h3>${best.title}</h3><p>${best.body}</p></div></div>
        <a class="card" href="#materials" style="text-decoration:none;color:inherit"><span class="tag">${MATERIALS.length} materials</span><h3>What are you drying?</h3><p>Find how many days it takes to reach ${state.target}% and when it'll be ready with this week's weather.</p></a>
      </div>

      <div style="display:grid;gap:10px">
        <div class="section-h"><h2>Popular to dry</h2><a href="#materials">See all</a></div>
        <div class="rail">${POPULAR.map((id) => mcard(byId[id])).join("")}</div>
      </div>
    </section>`;
  document.getElementById("refresh")?.addEventListener("click", () => loadWeather(true));
}

function bestStart(F) {
  const h = new Date().getHours() >= 11 ? 1 : 0;
  let bestI = h, bestV = -1;
  for (let i = h; i < Math.min(F.length - 2, 4); i++) {
    const v = F[i].f + F[i + 1].f + F[i + 2].f;
    if (v > bestV + 0.15) { bestV = v; bestI = i; }
  }
  const slow = F.slice(bestI, bestI + 3).filter((d) => d.f < 0.55).length;
  return {
    title: `${dateLabel(F[bestI].date, true)} morning`,
    body: slow
      ? `The three days after that include ${slow} slow ${slow === 1 ? "day" : "days"}. Spread thin layers of quick-drying produce.`
      : `About ${fmt(bestV, 1)} full drying days in the next three. A good start for slow crops like turmeric or copra.`,
  };
}

/* ---------- materials ---------- */
function badgeFor(m, t) {
  const n = daysTo(m, t);
  if (n == null) return `<span class="badge none">Can't reach ${t}%</span>`;
  const cls = n <= 3 ? "good" : n <= 8 ? "fair" : "poor";
  return `<span class="badge ${cls}">${fmtDays(n)} to ${t}%</span>`;
}
function mcard(m) {
  return `<a class="mcard" href="#m/${m.id}"><div class="ph">${img(m.id, m.name)}</div><div class="mb"><h3>${esc(m.name)}</h3><p>${esc(m.aka.slice(0, 2).join(" · "))}</p>${badgeFor(m, state.target)}</div></a>`;
}
function matches(m, q) {
  if (!q) return true;
  const hay = [m.name, m.cat, ...m.aka].join(" ").toLowerCase();
  return q.toLowerCase().split(/\s+/).every((w) => hay.includes(w));
}
function renderMaterials() {
  document.title = "Materials · Solar Dry House";
  const targets = [3, 5, 8, 10];
  view.innerHTML = `
    <section class="page">
      <div class="page-head"><span class="eyebrow">Materials</span><h1>What can I dry?</h1>
        <p class="lede">${MATERIALS.length} materials that dry well in a solar dry house. Search by English or local name.</p></div>
      <div class="filters">
        <div class="search">${I.search}<input class="input" id="q" type="search" placeholder="Chilli, manjal, fish, leaves…" value="${esc(state.q)}" aria-label="Search materials"></div>
        <div class="chips" role="group" aria-label="Category">${["All", ...CATEGORIES].map((c) => `<button class="chip" data-cat="${esc(c)}" aria-pressed="${c === state.cat}">${esc(c)}</button>`).join("")}</div>
        <div class="filter-row">
          <label id="tl">Dry to moisture</label>
          <div class="seg" role="group" aria-labelledby="tl">${targets.map((v) => `<button data-t="${v}" aria-pressed="${v === state.target}">${v}%</button>`).join("")}</div>
          <span class="count" id="count"></span>
        </div>
      </div>
      <div class="mgrid" id="list"></div>
      <p class="fine">Days are clear, sunny days in a greenhouse-type dryer. “Can't reach” means the material holds more water than that even in hot, dry air — sugar and salt hold on to moisture.</p>
    </section>`;
  const draw = () => {
    const t = state.target;
    const list = MATERIALS.filter((m) => (state.cat === "All" || m.cat === state.cat) && matches(m, state.q)).sort((a, b) => a.name.localeCompare(b.name));
    const reach = list.filter((m) => daysTo(m, t) != null).length;
    document.getElementById("count").textContent = `${list.length} shown · ${reach} reach ${t}%`;
    document.getElementById("list").innerHTML = list.length ? list.map(mcard).join("") : `<p class="empty" style="grid-column:1/-1">Nothing matches “${esc(state.q)}”. Try a shorter word or a local name.</p>`;
  };
  if (!targets.includes(state.target)) state.target = 3;
  draw();
  document.getElementById("q").addEventListener("input", (e) => { state.q = e.target.value; draw(); });
  document.querySelectorAll("[data-cat]").forEach((b) => b.addEventListener("click", () => { state.cat = b.dataset.cat; document.querySelectorAll("[data-cat]").forEach((x) => x.setAttribute("aria-pressed", x === b)); draw(); }));
  document.querySelectorAll("[data-t]").forEach((b) => b.addEventListener("click", () => { state.target = +b.dataset.t; store.set("sdh-target", state.target); document.querySelectorAll("[data-t]").forEach((x) => x.setAttribute("aria-pressed", x === b)); draw(); }));
}

/* ---------- material detail ---------- */
function curveSVG(m, target) {
  const W = 480, H = 230, pl = 40, pr = 12, pt = 14, pb = 36;
  const tSafe = daysTo(m, m.ms), tT = daysTo(m, target);
  const span = Math.max(2, Math.ceil(Math.max(tSafe, tT ?? 0, m.d[1]) * 1.25));
  const db = (x) => x / (100 - x), wb = (X) => (100 * X) / (1 + X);
  const X0 = db(m.mi), Xe = db(m.me), k = Math.log((X0 - Xe) / (db(m.ms) - Xe)) / ((m.d[0] + m.d[1]) / 2);
  const yMax = Math.ceil(m.mi / 10) * 10;
  const x = (d) => pl + (d / span) * (W - pl - pr), y = (v) => pt + (1 - v / yMax) * (H - pt - pb);
  let path = "";
  for (let i = 0; i <= 80; i++) { const d = (span * i) / 80; path += `${i ? "L" : "M"}${x(d).toFixed(1)} ${y(wb(Xe + (X0 - Xe) * Math.exp(-k * d))).toFixed(1)}`; }
  const area = `${path}L${x(span)} ${y(0)}L${x(0)} ${y(0)}Z`;
  const step = span > 14 ? Math.ceil(span / 7) : span > 7 ? 2 : 1;
  const xt = []; for (let d = 0; d <= span; d += step) xt.push(d);
  const yt = []; for (let v = 0; v <= yMax; v += yMax > 50 ? 20 : 10) yt.push(v);
  const hline = (v, col, lab, pos) => v <= yMax ? `<line x1="${pl}" x2="${W - pr}" y1="${y(v)}" y2="${y(v)}" stroke="${col}" stroke-width="1.5" stroke-dasharray="4 4"/><text x="${pos === "left" ? pl + 6 : W - pr}" y="${pos === "below" && y(v) + 15 < H - pb - 2 ? y(v) + 15 : y(v) - 6}" text-anchor="${pos === "left" ? "start" : "end"}" style="fill:${col}">${lab}</text>` : "";
  const dot = (d, v, col) => (d == null || d > span ? "" : `<circle cx="${x(d)}" cy="${y(v)}" r="5" fill="${col}" stroke="var(--card)" stroke-width="2.5"/>`);
  return `<svg viewBox="0 0 ${W} ${H}" role="img" aria-label="Drying curve for ${esc(m.name)}: moisture falls from ${m.mi}% to ${m.ms}% in about ${fmtDays(tSafe)}.">
    <defs><linearGradient id="cg" x1="0" x2="0" y1="0" y2="1"><stop offset="0" stop-color="var(--sky)" stop-opacity=".22"/><stop offset="1" stop-color="var(--sky)" stop-opacity="0"/></linearGradient></defs>
    ${yt.map((v) => `<line x1="${pl}" x2="${W - pr}" y1="${y(v)}" y2="${y(v)}" stroke="var(--line)"/><text x="${pl - 8}" y="${y(v) + 4}" text-anchor="end">${v}%</text>`).join("")}
    ${xt.map((d) => `<text x="${x(d)}" y="${H - pb + 18}" text-anchor="middle">${d}</text>`).join("")}
    <text x="${(pl + W - pr) / 2}" y="${H - 2}" text-anchor="middle">sunny drying days</text>
    <path d="${area}" fill="url(#cg)"/>
    ${hline(m.ms, "var(--green)", `safe ${m.ms}%`, "above")}
    ${hline(m.me, "var(--red)", `lowest ${m.me}%`, "below")}
    ${target !== m.ms && target > m.me ? hline(target, "var(--amber)", `target ${target}%`, "left") : ""}
    <path d="${path}" fill="none" stroke="var(--sky)" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"/>
    ${dot(tSafe, m.ms, "var(--green)")}${dot(tT, target, "var(--amber)")}
  </svg>`;
}

function renderDetail(m) {
  document.title = `${m.name} · Solar Dry House`;
  const t = state.target, nT = daysTo(m, t), nS = daysTo(m, m.ms), F = state.forecast;
  const fS = F ? finishDate(nS, F) : null, fT = F && nT != null ? finishDate(nT, F) : null;
  const pct = (v) => Math.min(100, Math.max(0, ((v - 30) / 40) * 100));
  const cr = state.credits[m.id];
  let heat = "";
  if (F) {
    const next = F.slice(0, 5);
    const hot = next.filter((d) => d.house > m.t[1] + 2);
    const cool = next.filter((d) => d.house < m.t[0] - 5);
    heat = hot.length
      ? `<p class="note bad">${I.warn}<span>Too hot for ${esc(m.name.toLowerCase())} on ${hot.map((d) => `${dateLabel(d.date)} (about ${fmt(d.house)}°C)`).join(", ")}. Keep it under ${m.t[1]}°C: open the vents and lay shade net from 11 am to 2 pm.</span></p>`
      : cool.length >= 3
      ? `<p class="note info">${I.info}<span>Cooler, cloudier days ahead, so drying runs slower than the sunny-day figures. The dates below allow for it.</span></p>`
      : `<p class="note ok">${I.check}<span>This week's weather suits ${esc(m.name.toLowerCase())}. Midday inside the house should stay near ${range(m.t)}°C.</span></p>`;
  }
  const verdict = nT == null
    ? `<p class="note warn">${I.info}<span>${esc(m.name)} can't reach ${t}% in a solar dry house — it levels off near ${m.me}%. It's safe to store at ${m.ms}%.</span></p>`
    : nT > nS * 2.2 && t < m.ms ? `<p class="note info">${I.info}<span>Going from ${m.ms}% to ${t}% takes ${fmtDays(nT - nS)} more. Worth it for powders and long storage, but it costs weight, colour and aroma.</span></p>` : "";

  view.innerHTML = `
    <section class="page">
      <div class="dhero">${img(m.id, m.name)}
        <a class="back" href="#materials" aria-label="Back to materials">${I.back}</a>
        <div class="over"><span class="eyebrow">${esc(m.cat)}</span><h1>${esc(m.name)}</h1><p>${esc(m.aka.join(" · "))}</p></div>
      </div>
      <div class="keys">
        <div class="key"><span>Safe to store</span><b class="g">${range(m.d)} ${dayWord(m.d[1])}</b><small>${m.mi}% → ${m.ms}% moisture</small></div>
        <div class="key"><span>To ${t}% moisture</span>${nT == null ? `<b class="r">Not possible</b><small>lowest about ${m.me}%</small>` : `<b>${fmtDays(nT)}</b><small>sunny days</small>`}</div>
        <div class="key"><span>Air in the house</span><b>${range(m.t)}°C</b><small>open sun takes ${range(m.o)} days</small></div>
      </div>
      ${verdict}${heat}
      <div class="two">
        <div class="card chart"><h2>Drying curve</h2>${curveSVG(m, t)}
          <div class="legend"><span><i style="background:var(--sky)"></i>moisture</span><span><i style="background:var(--green)"></i>safe to store</span>${nT != null && t !== m.ms ? `<span><i style="background:var(--amber)"></i>your target</span>` : ""}<span><i style="background:var(--red)"></i>lowest possible</span></div>
        </div>
        <div style="display:grid;gap:16px;align-content:start">
          ${F ? `<div class="card plan"><span class="tag">With the ${esc(state.loc?.name || "")} forecast</span>
            <h2>${fS.startsTomorrow ? "Load tomorrow morning" : "Load this morning"}</h2>
            <div class="row"><span>Safe to store (${m.ms}%)</span><b>${fS.beyond ? "about " : ""}${dateLabel(fS.date, true)}</b></div>
            <div class="row"><span>Your target (${t}%)</span>${nT == null ? `<b class="no">Can't reach</b>` : `<b>${fT.beyond ? "about " : ""}${dateLabel(fT.date, true)}</b>`}</div>
          </div>` : `<div class="card"><p>${state.loc ? "Getting the forecast…" : `<a href="#home">Set your place</a> to see ready dates.`}</p></div>`}
          <div class="card"><span class="tag">Air temperature</span>
            <div class="therm" aria-label="Safe band ${range(m.t)}°C on a 30 to 70°C scale">
              <div class="bar"><i style="left:${pct(m.t[0])}%;width:${Math.max(pct(m.t[1]) - pct(m.t[0]), 2)}%"></i>${F ? `<u style="left:${pct(F[0].house)}%" title="Today inside ≈ ${fmt(F[0].house)}°C"></u>` : ""}</div>
              <div class="scale"><span>30</span><span>40</span><span>50</span><span>60</span><span>70°C</span></div>
            </div>
            <p>Keep ${range(m.t)}°C at tray height.${F ? ` Today's midday inside estimate is ${fmt(F[0].house)}°C (the line).` : ""}</p>
          </div>
        </div>
      </div>
      <div class="card">
        <h2>How to dry it</h2>
        <ul class="howto">
          <li><span class="ic">${I.knife}</span><div><h3>Prepare</h3><p>${esc(m.prep)}</p></div></li>
          <li><span class="ic">${I.tray}</span><div><h3>Load</h3><p>About ${m.load} kg per m² of tray, in one even layer.${m.tip ? ` ${esc(m.tip)}` : ""}</p></div></li>
          <li><span class="ic">${I.done}</span><div><h3>Done when</h3><p>${esc(m.done)}</p></div></li>
          <li><span class="ic">${I.bag}</span><div><h3>Store</h3><p>Cool fully, then pack airtight. Keeps about ${m.keep} months. 100 kg fresh gives about ${fmt(driedWeight(100, m.mi, m.ms))} kg${nT != null ? ` (${fmt(driedWeight(100, m.mi, t))} kg at ${t}%)` : ""}.</p></div></li>
        </ul>
      </div>
      <a class="btn" style="justify-self:start" href="#calc/${m.id}">Plan a batch of ${esc(m.name.toLowerCase())}</a>
      ${cr ? `<p class="credit">Photo: ${esc(cr.author)}, ${esc(cr.license)}, via <a href="${esc(cr.page)}" target="_blank" rel="noopener">Wikimedia Commons</a></p>` : ""}
    </section>`;
}

/* ---------- batch calculator ---------- */
function renderCalc(id) {
  document.title = "Plan a batch · Solar Dry House";
  const sel = byId[id] || byId["red-chilli"];
  view.innerHTML = `
    <section class="page">
      <div class="page-head"><span class="eyebrow">Plan a batch</span><h1>How much, how long</h1><p class="lede">Pick a material and the weight you'll load. See what you'll get back, whether it fits on your trays, and when it'll be ready.</p></div>
      <div class="calc">
        <form class="card form" id="cf" novalidate>
          <div class="picked"><img id="c-img" src="${ASSETS}images/${sel.id}.jpg" alt=""><div class="field" style="flex:1"><label for="c-m">Material</label>
            <select id="c-m">${CATEGORIES.map((c) => `<optgroup label="${esc(c)}">${MATERIALS.filter((m) => m.cat === c).map((m) => `<option value="${m.id}">${esc(m.name)}</option>`).join("")}</optgroup>`).join("")}</select></div></div>
          <div class="field"><label for="c-kg">Fresh weight (kg)</label><input id="c-kg" type="number" min="1" step="1" value="200" inputmode="decimal"></div>
          <div class="pair">
            <div class="field"><label for="c-mi">Start moisture %</label><input id="c-mi" type="number" min="5" max="97" step="1" inputmode="decimal"></div>
            <div class="field"><label for="c-mf">Target %</label><input id="c-mf" type="number" min="1" max="40" step="0.5" inputmode="decimal"></div>
          </div>
          <div class="field"><label for="c-area">Your tray area (m²)</label><input id="c-area" type="number" min="1" step="0.5" value="${state.area}" inputmode="decimal"><small>Floor length × width × tray tiers. A 3 × 6 m house with two tiers is about 36 m².</small></div>
        </form>
        <div style="display:grid;gap:12px;align-content:start" aria-live="polite">
          <div class="big">
            <div><span>Water to remove</span><b id="r-water">–</b><em id="r-water2"></em></div>
            <div><span>You'll get back</span><b id="r-dry">–</b><em id="r-ratio"></em></div>
            <div><span>Tray area needed</span><b id="r-area">–</b><em id="r-load"></em></div>
            <div><span>Drying time</span><b id="r-days">–</b><em id="r-ready"></em></div>
          </div>
          <div class="massbar" aria-hidden="true"><div class="w" id="bw"></div><div class="d" id="bd"></div></div>
          <p class="note" id="r-note"></p>
          <p class="formula">Dried weight = fresh × (100 − start %) ÷ (100 − target %). Water = fresh − dried.</p>
        </div>
      </div>
    </section>`;
  const $ = (s) => document.getElementById(s);
  $("c-m").value = sel.id;
  const setM = () => { const m = byId[$("c-m").value]; $("c-img").src = `${ASSETS}images/${m.id}.jpg`; $("c-mi").value = m.mi; $("c-mf").value = state.target > m.me ? state.target : m.ms; calc(); };
  const say = (cls, icn, text) => { const n = $("r-note"); n.className = `note ${cls}`; n.innerHTML = `${icn}<span>${esc(text)}</span>`; };
  const calc = () => {
    const m = byId[$("c-m").value];
    const kg = +$("c-kg").value, mi = +$("c-mi").value, mf = +$("c-mf").value, area = +$("c-area").value;
    if (!(kg > 0) || !(mi > 0) || !(mf > 0) || mf >= mi || mi >= 100) {
      ["r-water", "r-dry", "r-area", "r-days"].forEach((s) => ($(s).textContent = "–"));
      return say("warn", I.warn, "Enter a fresh weight above 0 and a target moisture lower than the start.");
    }
    if (area > 0) { state.area = area; store.set("sdh-area", area); }
    const dry = driedWeight(kg, mi, mf), water = kg - dry, need = kg / m.load;
    $("r-water").textContent = `${fmt(water)} kg`; $("r-water2").textContent = `${fmt((water / kg) * 100)}% of the fresh weight`;
    $("r-dry").textContent = `${fmt(dry, dry < 10 ? 1 : 0)} kg`; $("r-ratio").textContent = `${fmt(kg / dry, 1)} kg fresh for 1 kg dried`;
    $("r-area").textContent = `${fmt(need, 1)} m²`; $("r-load").textContent = `at ${m.load} kg per m²`;
    const n = daysTo({ ...m, mi }, mf);
    $("r-days").textContent = n == null ? "Not possible" : fmtDays(n);
    const f = n != null && state.forecast ? finishDate(n, state.forecast) : null;
    $("r-ready").textContent = n == null ? `levels off near ${m.me}%` : f ? `ready ${f.beyond ? "about " : ""}${dateLabel(f.date, true)}` : "sunny days";
    $("bw").style.width = `${(water / kg) * 100}%`; $("bw").textContent = `water ${fmt(water)} kg`;
    $("bd").style.width = `${(dry / kg) * 100}%`; $("bd").textContent = "dried";
    if (n == null) say("bad", I.warn, `${m.name} can't reach ${mf}% in a solar dry house. Try ${m.ms}% (safe to store) or anything above ${m.me}%.`);
    else if (area > 0 && need <= area) say("ok", I.check, `Fits in one batch, using ${fmt((need / area) * 100)}% of your ${fmt(area, 1)} m² of trays. Keep the air at ${range(m.t)}°C.`);
    else if (area > 0) { const b = Math.ceil(need / area); say("warn", I.warn, `Too much for one load: it needs ${fmt(need, 1)} m² and you have ${fmt(area, 1)} m². Split it into ${b} batches of about ${fmt(kg / b)} kg, or add a tray tier.`); }
    else say("warn", I.warn, "Enter your tray area to check whether the load fits.");
  };
  $("c-m").addEventListener("change", () => { history.replaceState(null, "", `#calc/${$("c-m").value}`); setM(); });
  ["c-kg", "c-mi", "c-mf", "c-area"].forEach((s) => $(s).addEventListener("input", calc));
  $("cf").addEventListener("submit", (e) => e.preventDefault());
  setM();
}

/* ---------- boot ---------- */
fetch(`${ASSETS}images/credits.json`).then((r) => r.json()).then((c) => { state.credits = c; if (state.route?.path === "m") render(); }).catch(() => {});
window.addEventListener("hashchange", route);
window.addEventListener("online", () => loadWeather(true));
showPlace();
route();
loadWeather();
if (MODE === "mobile" && state.loc) {
  refreshDevicePlace(state.loc).then((p) => { if (p) setPlace(p); });
}
if ("serviceWorker" in navigator && location.protocol !== "file:" && !window.SDH_NO_SW) navigator.serviceWorker.register("sw.js").catch(() => {});

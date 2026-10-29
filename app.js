import { MATERIALS, CATEGORIES, daysTo, driedWeight } from "./materials.js";
import { fetchWeather, cachedWeather, searchPlaces, days, finishDate, rating, describe, icon, houseRiseNow, houseRH } from "./weather.js";

const view = document.getElementById("view");
const store = {
  get(k, d) { try { const v = localStorage.getItem(k); return v == null ? d : JSON.parse(v); } catch { return d; } },
  set(k, v) { try { localStorage.setItem(k, JSON.stringify(v)); } catch {} },
};
const state = {
  loc: store.get("sdh-loc", { name: "Chennai", region: "Tamil Nadu, India", lat: 13.0827, lon: 80.2707 }),
  target: store.get("sdh-target", 3),
  area: store.get("sdh-area", 36),
  weather: null, forecast: null, loading: false, error: null,
  q: "", cat: "All", sort: "name",
};
const byId = Object.fromEntries(MATERIALS.map((m) => [m.id, m]));

const esc = (s) => String(s).replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
const fmt = (v, d = 0) => v == null || Number.isNaN(v) ? "–" : v.toLocaleString(undefined, { maximumFractionDigits: d, minimumFractionDigits: d });
const range = (a) => (a[0] === a[1] ? `${a[0]}` : `${a[0]}–${a[1]}`);
const halfUp = (x) => Math.max(0.5, Math.ceil(x * 2) / 2);
const dayWord = (n) => (n === 1 ? "day" : "days");
function fmtDays(x) {
  if (x === 0) return "Already there";
  const h = halfUp(x);
  return `${h % 1 ? fmt(h, 1) : h} ${dayWord(h)}`;
}
function dateLabel(iso, long = false) {
  const d = new Date(iso + "T00:00");
  const today = new Date(); today.setHours(0, 0, 0, 0);
  const diff = Math.round((d - today) / 86400000);
  if (diff === 0) return "Today";
  if (diff === 1) return "Tomorrow";
  return d.toLocaleDateString(undefined, long ? { weekday: "short", day: "numeric", month: "short" } : { weekday: "short", day: "numeric" });
}

/* ---------- weather ---------- */
async function loadWeather(force = false) {
  if (state.loading) return;
  if (!force && state.weather && Date.now() - state.weather.at < 30 * 60 * 1000) return;
  if (!state.weather) {
    const c = cachedWeather(state.loc);
    if (c) setWeather({ ...c, live: false });
  }
  state.loading = true; state.error = null; rerenderIf("today");
  try {
    setWeather(await fetchWeather(state.loc));
  } catch (e) {
    state.error = navigator.onLine === false ? "You're offline." : e.message || "Couldn't reach the weather service.";
  }
  state.loading = false;
  rerender();
}
function setWeather(w) { state.weather = w; state.forecast = days(w); }

/* ---------- router ---------- */
function route() {
  const h = decodeURIComponent(location.hash.slice(1)) || "today";
  const [path, arg] = h.split("/");
  const tab = path === "m" ? "materials" : path;
  document.querySelectorAll(".tabs a").forEach((a) => { if (a.dataset.tab === tab) a.setAttribute("aria-current", "page"); else a.removeAttribute("aria-current"); });
  state.route = { path, arg };
  render();
  window.scrollTo(0, 0);
}
function render() {
  const { path, arg } = state.route;
  if (path === "materials") return renderMaterials();
  if (path === "m" && byId[arg]) return renderDetail(byId[arg]);
  if (path === "calc") return renderCalc(arg);
  if (path === "guide") { view.replaceChildren(document.getElementById("guide-tpl").content.cloneNode(true)); document.title = "Guide · Solar Dry House"; return; }
  renderToday();
}
const rerender = () => render();
const rerenderIf = (p) => { if (state.route?.path === p || (p === "today" && !["materials", "m", "calc", "guide"].includes(state.route?.path))) render(); };

/* ---------- Today / weather ---------- */
function renderToday() {
  document.title = "Solar Dry House";
  const L = state.loc, W = state.weather, F = state.forecast;
  let nowHtml = "";
  if (W) {
    const c = W.data.current;
    const [desc, kind] = describe(c.weather_code);
    const rise = c.is_day ? houseRiseNow(c.shortwave_radiation) : 1;
    const inT = c.temperature_2m + rise, inRH = houseRH(c.relative_humidity_2m, rise);
    const r = rating(F[0].f);
    const advice = !c.is_day
      ? "Night: keep the vents and door shut. Drying restarts after sunrise."
      : inT > 62 ? "Very hot inside: open the vents and lay shade net over leaves, flowers and seeds."
      : c.shortwave_radiation < 200 ? "Weak sun right now: drying is slow, so keep the door shut to hold the heat."
      : "Good sun: keep the fans running and turn the trays at 1 pm.";
    nowHtml = `
      <div class="now">
        <div style="display:grid;gap:12px">
          <div class="now-main">${icon(kind, 54)}<div><div class="t">${fmt(c.temperature_2m)}°</div><div class="c">${desc} · outside</div></div></div>
          <div style="display:flex;gap:8px;flex-wrap:wrap;align-items:center"><span class="pill ${r.key}">${r.label} today</span><span class="muted" style="font-size:14px">Humidity ${c.relative_humidity_2m}% · Wind ${fmt(c.wind_speed_10m)} km/h · Sun ${fmt(c.shortwave_radiation)} W/m²</span></div>
        </div>
        <div style="display:grid;gap:10px">
          <div class="eyebrow">Inside the dry house now (estimate)</div>
          <div class="inside">
            <div class="${inT > 60 ? "hot" : ""}"><span>Air</span><b>${fmt(inT)} °C</b></div>
            <div><span>Humidity</span><b>${fmt(inRH)}%</b></div>
            <div><span>Today's sun</span><b>${fmt(F[0].rad)} MJ</b></div>
          </div>
          <p class="note ${inT > 62 ? "bad" : c.is_day ? "ok" : "info"}">${advice}</p>
        </div>
      </div>`;
  } else if (state.loading) {
    nowHtml = `<div class="now"><p class="muted">Getting live weather for ${esc(L.name)}…</p></div>`;
  }
  const err = state.error ? `<p class="note warn">${esc(state.error)} ${W ? `Showing the forecast saved ${new Date(W.at).toLocaleString()}.` : ""} <button class="btn link" id="retry">Try again</button></p>` : "";

  const strip = F ? `
    <div style="display:grid;gap:10px">
      <div style="display:flex;justify-content:space-between;align-items:baseline;gap:10px;flex-wrap:wrap"><h2>Drying forecast</h2><span class="src">Max temperature outside → estimated inside</span></div>
      <div class="forecast" role="list">
        ${F.map((d, i) => { const [desc, kind] = describe(d.code); const r = rating(d.f); return `
          <div class="day ${i === 0 ? "today" : ""}" role="listitem">
            <div style="display:flex;justify-content:space-between;align-items:center"><span class="d">${dateLabel(d.date)}</span>${icon(kind, 26)}</div>
            <span class="pill ${r.key}">${r.label}</span>
            <div class="r"><span>Outside</span><b>${fmt(d.tmax)}°</b></div>
            <div class="r"><span>Inside</span><b class="${d.house > 62 ? "hot" : ""}">${fmt(d.house)}°</b></div>
            <div class="r"><span>Humidity</span><b>${fmt(d.rh)}%</b></div>
            <div class="r"><span>Sun</span><b>${fmt(d.rad)} MJ</b></div>
            <div class="r"><span>Rain</span><b>${d.rain}%</b></div>
            <span class="src" style="font-size:12px">${desc}</span>
          </div>`; }).join("")}
      </div>
      <p class="src">Live from Open-Meteo · updated ${new Date(W.at).toLocaleTimeString([], { hour: "numeric", minute: "2-digit" })}${W.live ? "" : " (saved copy)"} · <button class="btn link" id="refresh">Refresh</button></p>
    </div>` : "";

  const best = F ? bestStart(F) : null;
  const bestHtml = best ? `<div class="card"><span class="tag">Best time to load</span><h3>${best.title}</h3><p>${best.body}</p></div>` : "";

  view.innerHTML = `
    <section class="page">
      <div class="loc">
        <h1>${esc(L.name)} <span>${esc(L.region || "")}</span></h1>
        <button class="btn link" id="chg" aria-expanded="false">Change place</button>
      </div>
      <div class="loc-search" id="ls" hidden>
        <div class="row">
          <input class="input" id="place" type="search" placeholder="Town or village name" autocomplete="off" aria-label="Search for a place">
          <button class="btn" id="geo" type="button">Use my location</button>
        </div>
        <ul class="places" id="places"></ul>
      </div>
      ${err}${nowHtml}${strip}
      <div class="grid-cards">
        ${bestHtml}
        <form class="card" id="qs"><span class="tag">Materials</span><h3>What are you drying?</h3>
          <input class="input" id="qsi" type="search" placeholder="Chilli, moringa, copra…" aria-label="Search materials">
          <p>${MATERIALS.length} materials with drying times to ${state.target}% and to safe storage.</p></form>
        <div class="card" id="install"><span class="tag">App</span><h3>Install on your phone</h3>
          <p id="install-text">${installText()}</p>
          <button class="btn primary" id="install-btn" ${deferredInstall ? "" : "hidden"}>Install app</button></div>
      </div>
    </section>`;

  bindToday();
}

function bestStart(F) {
  // Which of the next 4 days gives the most drying over a 3-day window?
  const h = new Date().getHours() >= 11 ? 1 : 0;
  let bestI = h, bestV = -1;
  for (let i = h; i < Math.min(F.length - 2, 4); i++) {
    const v = F[i].f + F[i + 1].f + F[i + 2].f;
    if (v > bestV + 0.15) { bestV = v; bestI = i; }
  }
  const poor = F.slice(bestI, bestI + 3).filter((d) => d.f < 0.55);
  return {
    title: `${dateLabel(F[bestI].date, true)} morning`,
    body: poor.length
      ? `The next 3 days include ${poor.length} slow ${poor.length === 1 ? "day" : "days"} (cloud or high humidity). Load thin layers of quick-drying material.`
      : `Sunny stretch ahead: about ${fmt(bestV, 1)} full drying days in the next 3. A good time for slow materials like turmeric, copra or areca.`,
  };
}

let deferredInstall = null;
window.addEventListener("beforeinstallprompt", (e) => { e.preventDefault(); deferredInstall = e; const b = document.getElementById("install-btn"); if (b) b.hidden = false; });
function installText() {
  if (matchMedia("(display-mode: standalone)").matches) return "Installed. It opens from your home screen and keeps the last forecast for offline use.";
  if (/iphone|ipad|ipod/i.test(navigator.userAgent)) return "In Safari, tap Share, then Add to Home Screen.";
  return deferredInstall ? "Add it to your home screen. It keeps working offline with the last forecast." : "In Chrome, open the menu and choose Add to Home screen or Install app.";
}

function bindToday() {
  const ls = document.getElementById("ls"), chg = document.getElementById("chg");
  chg.onclick = () => { ls.hidden = !ls.hidden; chg.setAttribute("aria-expanded", !ls.hidden); if (!ls.hidden) document.getElementById("place").focus(); };
  let t;
  document.getElementById("place").oninput = (e) => {
    clearTimeout(t);
    const q = e.target.value.trim();
    const list = document.getElementById("places");
    if (q.length < 2) { list.innerHTML = ""; return; }
    t = setTimeout(async () => {
      try {
        const res = await searchPlaces(q);
        list.innerHTML = res.length ? res.map((p, i) => `<li><button data-i="${i}">${esc(p.name)}<small>${esc(p.region)}</small></button></li>`).join("") : `<li class="muted" style="padding:10px 4px">No place called "${esc(q)}". Try the nearest town.</li>`;
        list.querySelectorAll("button").forEach((b) => (b.onclick = () => setLoc(res[+b.dataset.i])));
      } catch { list.innerHTML = `<li class="muted" style="padding:10px 4px">Place search needs an internet connection.</li>`; }
    }, 300);
  };
  document.getElementById("geo").onclick = (e) => {
    const b = e.currentTarget;
    if (!navigator.geolocation) { b.textContent = "Location not available"; return; }
    b.textContent = "Finding you…";
    navigator.geolocation.getCurrentPosition(
      (p) => setLoc({ name: "My location", region: `${p.coords.latitude.toFixed(2)}, ${p.coords.longitude.toFixed(2)}`, lat: p.coords.latitude, lon: p.coords.longitude }),
      () => { b.textContent = "Location blocked — search instead"; },
      { timeout: 10000, maximumAge: 600000 },
    );
  };
  const r = document.getElementById("retry"); if (r) r.onclick = () => loadWeather(true);
  const rf = document.getElementById("refresh"); if (rf) rf.onclick = () => loadWeather(true);
  document.getElementById("qs").onsubmit = (e) => { e.preventDefault(); state.q = document.getElementById("qsi").value.trim(); location.hash = "materials"; };
  const ib = document.getElementById("install-btn");
  if (ib) ib.onclick = async () => { if (!deferredInstall) return; deferredInstall.prompt(); await deferredInstall.userChoice; deferredInstall = null; ib.hidden = true; };
}
function setLoc(loc) {
  state.loc = loc; store.set("sdh-loc", loc);
  state.weather = null; state.forecast = null;
  render(); loadWeather(true);
}

/* ---------- Materials ---------- */
function matches(m, q) {
  if (!q) return true;
  const hay = [m.name, m.cat, ...m.aka].join(" ").toLowerCase();
  return q.toLowerCase().split(/\s+/).every((w) => hay.includes(w));
}
function readyLine(m, target) {
  const n = daysTo(m, target);
  if (n == null || !state.forecast) return "";
  const f = finishDate(n, state.forecast);
  return f ? `ready ${f.beyond ? "about " : ""}${dateLabel(f.date, true)}` : "";
}

function renderMaterials() {
  document.title = "Materials · Solar Dry House";
  view.innerHTML = `
    <section class="page">
      <div class="page-head">
        <h1>What can I dry?</h1>
        <p class="lede">${MATERIALS.length} materials that dry well in a solar dry house. Search by English or local name, set your target moisture, and see how many clear days each one takes.</p>
      </div>
      <div class="toolbar">
        <input class="input" id="q" type="search" placeholder="Search: chilli, manjal, fish, leaves…" value="${esc(state.q)}" aria-label="Search materials">
        <div class="chips" role="group" aria-label="Category">${["All", ...CATEGORIES].map((c) => `<button class="chip" data-cat="${esc(c)}" aria-pressed="${c === state.cat}">${esc(c)}</button>`).join("")}</div>
        <div class="target">
          <label for="tgt">Dry to</label>
          <input id="tgt" type="number" min="1" max="30" step="0.5" value="${state.target}" inputmode="decimal"><span>% moisture</span>
          <span style="display:flex;gap:6px;flex-wrap:wrap">${[3, 5, 8, 10].map((v) => `<button class="chip" data-t="${v}" aria-pressed="${v === state.target}">${v}%</button>`).join("")}</span>
        </div>
        <div class="sort"><span id="count" class="count"></span><span style="flex:1"></span><label for="sort">Sort</label>
          <select id="sort"><option value="name">A to Z</option><option value="fast">Fastest first</option><option value="cat">Category</option></select></div>
      </div>
      <div class="mlist" id="list"></div>
      <p class="fine">Days are clear sunny days in a greenhouse-type dryer. "Ready" dates use the live forecast for ${esc(state.loc.name)}. "Can't reach" means the material holds more water than that even in hot, dry air — see Guide → Questions.</p>
    </section>`;
  document.getElementById("sort").value = state.sort;
  const draw = () => {
    const t = state.target;
    let list = MATERIALS.filter((m) => (state.cat === "All" || m.cat === state.cat) && matches(m, state.q));
    const key = (m) => daysTo(m, t) ?? 1e9;
    if (state.sort === "fast") list = [...list].sort((a, b) => key(a) - key(b));
    else if (state.sort === "cat") list = [...list].sort((a, b) => CATEGORIES.indexOf(a.cat) - CATEGORIES.indexOf(b.cat) || a.name.localeCompare(b.name));
    else list = [...list].sort((a, b) => a.name.localeCompare(b.name));
    const reach = list.filter((m) => daysTo(m, t) != null).length;
    document.getElementById("count").textContent = `${list.length} shown · ${reach} can reach ${t}%`;
    document.getElementById("list").innerHTML = list.length ? list.map((m) => {
      const n = daysTo(m, t);
      const right = n == null
        ? `<span class="no">Can't reach ${t}%</span><small>lowest ≈ ${m.me}%</small>`
        : `<b>${fmtDays(n)}</b><small>${readyLine(m, t) || "clear days"}</small>`;
      return `<a class="mrow" href="#m/${m.id}"><span class="nm">${esc(m.name)}</span><span class="sub">${esc(m.aka.join(" · "))} · ${esc(m.cat)} · safe at ${m.ms}%</span><span class="dd">${right}</span></a>`;
    }).join("") : `<p class="empty">Nothing matches "${esc(state.q)}". Try a shorter word, a local name, or pick All.</p>`;
  };
  draw();
  document.getElementById("q").oninput = (e) => { state.q = e.target.value; draw(); };
  document.querySelectorAll("[data-cat]").forEach((b) => (b.onclick = () => { state.cat = b.dataset.cat; document.querySelectorAll("[data-cat]").forEach((x) => x.setAttribute("aria-pressed", x === b)); draw(); }));
  const setT = (v) => { if (!(v > 0 && v < 40)) return; state.target = v; store.set("sdh-target", v); document.querySelectorAll("[data-t]").forEach((x) => x.setAttribute("aria-pressed", +x.dataset.t === v)); draw(); };
  document.getElementById("tgt").oninput = (e) => setT(+e.target.value);
  document.querySelectorAll("[data-t]").forEach((b) => (b.onclick = () => { document.getElementById("tgt").value = b.dataset.t; setT(+b.dataset.t); }));
  document.getElementById("sort").onchange = (e) => { state.sort = e.target.value; draw(); };
}

/* ---------- Material detail ---------- */
function curveSVG(m, target) {
  const W = 480, H = 240, pl = 40, pr = 12, pt = 14, pb = 38;
  const tSafe = daysTo(m, m.ms), tT = daysTo(m, target);
  const span = Math.max(2, Math.ceil(Math.max(tSafe, tT ?? 0, m.d[1]) * 1.25));
  const db = (x) => x / (100 - x), wb = (X) => (100 * X) / (1 + X);
  const X0 = db(m.mi), Xe = db(m.me), k = Math.log((X0 - Xe) / (db(m.ms) - Xe)) / ((m.d[0] + m.d[1]) / 2);
  const yMax = Math.ceil(m.mi / 10) * 10;
  const x = (d) => pl + (d / span) * (W - pl - pr), y = (v) => pt + (1 - v / yMax) * (H - pt - pb);
  let path = "";
  for (let i = 0; i <= 80; i++) { const d = (span * i) / 80; path += `${i ? "L" : "M"}${x(d).toFixed(1)} ${y(wb(Xe + (X0 - Xe) * Math.exp(-k * d))).toFixed(1)}`; }
  const step = span > 14 ? Math.ceil(span / 7) : span > 7 ? 2 : 1;
  const xt = []; for (let d = 0; d <= span; d += step) xt.push(d);
  const yt = []; for (let v = 0; v <= yMax; v += yMax > 50 ? 20 : 10) yt.push(v);
  // Labels: safe on the right above its line, lowest on the right below, target on the left above.
  const hline = (v, col, dash, lab, pos) => v <= yMax ? `<line x1="${pl}" x2="${W - pr}" y1="${y(v)}" y2="${y(v)}" stroke="${col}" stroke-width="1.5" stroke-dasharray="${dash}"/><text x="${pos === "left" ? pl + 6 : W - pr}" y="${pos === "below" ? y(v) + 15 : y(v) - 5}" text-anchor="${pos === "left" ? "start" : "end"}" style="fill:${col}">${lab}</text>` : "";
  const dot = (d, v, col) => d == null || d > span ? "" : `<circle cx="${x(d)}" cy="${y(v)}" r="4.5" fill="${col}" stroke="var(--surface)" stroke-width="2"/>`;
  return `<svg viewBox="0 0 ${W} ${H}" role="img" aria-label="Drying curve for ${esc(m.name)}: moisture falls from ${m.mi}% to ${m.ms}% in about ${fmtDays(tSafe)}.">
    ${yt.map((v) => `<line x1="${pl}" x2="${W - pr}" y1="${y(v)}" y2="${y(v)}" stroke="var(--line)" stroke-width="1"/><text x="${pl - 6}" y="${y(v) + 4}" text-anchor="end">${v}%</text>`).join("")}
    ${xt.map((d) => `<text x="${x(d)}" y="${H - pb + 18}" text-anchor="middle">${d}</text>`).join("")}
    <text x="${(pl + W - pr) / 2}" y="${H - 4}" text-anchor="middle">clear drying days</text>
    ${hline(m.ms, "var(--green)", "5 4", `safe ${m.ms}%`, "above")}
    ${hline(m.me, "var(--heat)", "2 4", `lowest ${m.me}%`, "below")}
    ${target !== m.ms && target > m.me ? hline(target, "var(--sun)", "5 4", `target ${target}%`, "left") : ""}
    <path d="${path}" fill="none" stroke="var(--sky)" stroke-width="2.5" stroke-linejoin="round"/>
    ${dot(tSafe, m.ms, "var(--green)")}${dot(tT, target, "var(--sun)")}
  </svg>`;
}

function renderDetail(m) {
  document.title = `${m.name} · Solar Dry House`;
  const t = state.target, nT = daysTo(m, t), nS = daysTo(m, m.ms), F = state.forecast;
  const fS = F ? finishDate(nS, F) : null, fT = F && nT != null ? finishDate(nT, F) : null;
  const pct = (v) => Math.min(100, Math.max(0, ((v - 30) / 40) * 100));
  let heat = "";
  if (F) {
    const next = F.slice(0, 5);
    const hot = next.filter((d) => d.house > m.t[1] + 2);
    const cool = next.filter((d) => d.house < m.t[0] - 5);
    heat = hot.length
      ? `<p class="note bad">Too hot for ${esc(m.name.toLowerCase())} on ${hot.map((d) => `${dateLabel(d.date)} (≈${fmt(d.house)} °C)`).join(", ")}. Keep it under ${m.t[1]} °C: open vents and lay shade net from 11 am to 2 pm.</p>`
      : cool.length >= 3
      ? `<p class="note warn">The next days are cool or cloudy (inside ≈${fmt(cool[0].house)} °C). Drying will be slower than the clear-day figures; the dates below already allow for it.</p>`
      : `<p class="note ok">The forecast suits ${esc(m.name.toLowerCase())}: inside the house should stay near ${range(m.t)} °C at midday.</p>`;
  }
  const plan = F ? `
    <div class="card plan">
      <span class="tag">With the ${esc(state.loc.name)} forecast</span>
      <h3>${fS.startsTomorrow ? "Load tomorrow morning" : "Load this morning"}</h3>
      <div class="line"><span>Safe to store (${m.ms}%)</span><b>${fS.beyond ? "about " : ""}${dateLabel(fS.date, true)}</b></div>
      <div class="line"><span>Your target (${t}%)</span><b>${nT == null ? `can't reach` : `${fT.beyond ? "about " : ""}${dateLabel(fT.date, true)}`}</b></div>
      <div class="line"><span>Open sun, for comparison</span><b>${range(m.o)} days</b></div>
    </div>` : `<div class="card"><p>${state.loading ? "Getting the forecast…" : "Forecast dates appear once the weather loads."}</p></div>`;

  view.innerHTML = `
    <section class="page">
      <a class="btn link back" href="#materials">← All materials</a>
      <div class="detail-head">
        <span class="eyebrow">${esc(m.cat)}</span>
        <h1>${esc(m.name)}</h1>
        <p class="aka">${esc(m.aka.join(" · "))}</p>
      </div>
      <div class="stats">
        <div class="stat"><span>Fresh moisture</span><b>${m.mi}%</b></div>
        <div class="stat"><span>Safe to store at</span><b>${m.ms}%</b></div>
        <div class="stat"><span>To safe, clear days</span><b class="fast">${range(m.d)} ${dayWord(m.d[1])}</b></div>
        <div class="stat"><span>To ${t}%, clear days</span><b>${nT == null ? "not possible" : fmtDays(nT)}</b></div>
        <div class="stat"><span>Lowest possible</span><b>≈ ${m.me}%</b></div>
        <div class="stat"><span>Tray load</span><b>${m.load} kg/m²</b></div>
      </div>
      ${nT == null ? `<p class="note warn">${esc(m.name)} can't be dried to ${t}% in a solar dry house — it levels off near ${m.me}%. ${m.ms > t ? `It's safe to store at ${m.ms}%, which takes ${range(m.d)} clear days.` : ""}</p>` : nT > nS * 2.2 && t < m.ms ? `<p class="note info">Going from ${m.ms}% down to ${t}% takes ${fmtDays(nT - nS)} more. Only worth it for powders or long storage; it costs weight, colour and aroma.</p>` : ""}
      ${heat}
      <div class="two">
        <div class="chart">
          <h3>Drying curve</h3>
          ${curveSVG(m, t)}
          <div class="legend"><span><i style="background:var(--sky)"></i>moisture</span><span><i style="background:var(--green)"></i>safe storage</span>${nT != null && t !== m.ms ? `<span><i style="background:var(--sun)"></i>your target</span>` : ""}<span><i style="background:var(--heat)"></i>lowest reachable</span></div>
        </div>
        <div style="display:grid;gap:14px;align-content:start">
          ${plan}
          <div class="card">
            <span class="tag">Air temperature</span>
            <div class="therm" aria-label="Safe band ${range(m.t)} °C on a 30 to 70 °C scale">
              <div class="bar"><i style="left:${pct(m.t[0])}%;width:${Math.max(pct(m.t[1]) - pct(m.t[0]), 2)}%"></i>${F ? `<u style="left:${pct(F[0].house)}%" title="Today inside ≈ ${fmt(F[0].house)} °C"></u>` : ""}</div>
              <div class="scale"><span>30</span><span>40</span><span>50</span><span>60</span><span>70 °C</span></div>
            </div>
            <p>Keep ${range(m.t)} °C at tray height.${F ? ` Today's midday inside estimate: ${fmt(F[0].house)} °C (the line).` : ""}</p>
          </div>
        </div>
      </div>
      <div class="card">
        <dl class="facts">
          <dt>Prepare</dt><dd>${esc(m.prep)}</dd>
          <dt>Done when</dt><dd>${esc(m.done)}</dd>
          ${m.tip ? `<dt>Tip</dt><dd>${esc(m.tip)}</dd>` : ""}
          <dt>Keeps</dt><dd>${m.keep} months in airtight, moisture-proof bags</dd>
          <dt>Yield</dt><dd>100 kg fresh gives about ${fmt(driedWeight(100, m.mi, m.ms))} kg at ${m.ms}%${nT != null ? `, or ${fmt(driedWeight(100, m.mi, t))} kg at ${t}%` : ""}</dd>
        </dl>
      </div>
      <a class="btn primary" style="justify-self:start" href="#calc/${m.id}">Work out a batch of ${esc(m.name.toLowerCase())}</a>
    </section>`;
}

/* ---------- Calculator ---------- */
function renderCalc(id) {
  document.title = "Calculator · Solar Dry House";
  const sel = byId[id] || byId["red-chilli"];
  view.innerHTML = `
    <section class="page">
      <div class="page-head"><h1>Batch calculator</h1><p class="lede">How much water has to leave, what you'll get back, whether it fits on your trays, and when it'll be ready.</p></div>
      <div class="calc">
        <form class="card form" id="cf" novalidate>
          <div class="field"><label for="c-m">Material</label><select id="c-m">${CATEGORIES.map((c) => `<optgroup label="${esc(c)}">${MATERIALS.filter((m) => m.cat === c).map((m) => `<option value="${m.id}">${esc(m.name)}</option>`).join("")}</optgroup>`).join("")}</select></div>
          <div class="field"><label for="c-kg">Fresh weight (kg)</label><input id="c-kg" type="number" min="1" step="1" value="200" inputmode="decimal"></div>
          <div class="pair">
            <div class="field"><label for="c-mi">Start moisture %</label><input id="c-mi" type="number" min="5" max="97" step="1" inputmode="decimal"></div>
            <div class="field"><label for="c-mf">Target %</label><input id="c-mf" type="number" min="1" max="40" step="0.5" inputmode="decimal"></div>
          </div>
          <div class="field"><label for="c-area">Your tray area (m²)</label><input id="c-area" type="number" min="1" step="0.5" value="${state.area}" inputmode="decimal"><small>Floor length × width × tray tiers. A 3 × 6 m house with 2 tiers ≈ 36 m².</small></div>
        </form>
        <div style="display:grid;gap:12px;align-content:start" aria-live="polite">
          <div class="big">
            <div><span>Water to remove</span><b id="r-water">–</b><em id="r-water2"></em></div>
            <div><span>Dried product</span><b id="r-dry">–</b><em id="r-ratio"></em></div>
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
  const setM = () => { const m = byId[$("c-m").value]; $("c-mi").value = m.mi; $("c-mf").value = state.target > m.me ? state.target : m.ms; calc(); };
  const calc = () => {
    const m = byId[$("c-m").value];
    const kg = +$("c-kg").value, mi = +$("c-mi").value, mf = +$("c-mf").value, area = +$("c-area").value;
    const note = $("r-note");
    if (!(kg > 0) || !(mi > 0) || !(mf > 0) || mf >= mi || mi >= 100) {
      ["r-water", "r-dry", "r-area", "r-days"].forEach((s) => ($(s).textContent = "–"));
      note.className = "note warn"; note.textContent = "Enter a fresh weight above 0 and a target moisture lower than the start."; return;
    }
    if (area > 0) { state.area = area; store.set("sdh-area", area); }
    const dry = driedWeight(kg, mi, mf), water = kg - dry, need = kg / m.load;
    $("r-water").textContent = `${fmt(water)} kg`; $("r-water2").textContent = `${fmt((water / kg) * 100)}% of the fresh weight`;
    $("r-dry").textContent = `${fmt(dry, dry < 10 ? 1 : 0)} kg`; $("r-ratio").textContent = `${fmt(kg / dry, 1)} kg fresh per 1 kg dried`;
    $("r-area").textContent = `${fmt(need, 1)} m²`; $("r-load").textContent = `at ${m.load} kg/m²`;
    const adj = { ...m, mi };
    const n = daysTo(adj, mf);
    $("r-days").textContent = n == null ? "not possible" : fmtDays(n);
    const f = n != null && state.forecast ? finishDate(n, state.forecast) : null;
    $("r-ready").textContent = n == null ? `${m.name} levels off near ${m.me}%` : f ? `ready ${f.beyond ? "about " : ""}${dateLabel(f.date, true)} with the forecast` : "clear sunny days";
    $("bw").style.width = `${(water / kg) * 100}%`; $("bw").textContent = `water ${fmt(water)} kg`;
    $("bd").style.width = `${(dry / kg) * 100}%`; $("bd").textContent = "dried";
    if (n == null) { note.className = "note bad"; note.textContent = `${m.name} can't reach ${mf}% in a solar dry house. Try ${m.ms}% (safe to store) or anything above ${m.me}%.`; }
    else if (area > 0 && need <= area) { note.className = "note ok"; note.textContent = `Fits in one batch, using ${fmt((need / area) * 100)}% of your ${fmt(area, 1)} m² of trays. Keep the air at ${range(m.t)} °C.`; }
    else if (area > 0) { const b = Math.ceil(need / area); note.className = "note warn"; note.textContent = `Too much for one load: needs ${fmt(need, 1)} m², you have ${fmt(area, 1)} m². Split into ${b} batches of about ${fmt(kg / b)} kg, or add a tray tier.`; }
    else { note.className = "note warn"; note.textContent = "Enter your tray area to check whether the load fits."; }
  };
  $("c-m").onchange = () => { history.replaceState(null, "", `#calc/${$("c-m").value}`); setM(); };
  ["c-kg", "c-mi", "c-mf", "c-area"].forEach((s) => ($(s).oninput = calc));
  $("cf").onsubmit = (e) => e.preventDefault();
  setM();
}

/* ---------- boot ---------- */
window.addEventListener("hashchange", route);
window.addEventListener("online", () => loadWeather(true));
route();
loadWeather();
if ("serviceWorker" in navigator && location.protocol !== "file:") navigator.serviceWorker.register("sw.js").catch(() => {});

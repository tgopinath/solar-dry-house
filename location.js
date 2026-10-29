// Where the dry house is.
// Mobile app (installed, or opened on a phone): read the device location automatically.
// Web app (desktop browser): ask the person to type their town.
const KEY = "sdh-loc";

export function appMode() {
  const forced = document.documentElement.dataset.mode || new URLSearchParams(location.search).get("mode");
  if (forced === "mobile" || forced === "web") return forced;
  const installed = matchMedia("(display-mode: standalone)").matches || navigator.standalone === true;
  const phone = /Android|iPhone|iPad|iPod/i.test(navigator.userAgent);
  return installed || phone ? "mobile" : "web";
}

export function savedPlace() {
  try { return JSON.parse(localStorage.getItem(KEY)); } catch { return null; }
}
export function savePlace(p) {
  try { localStorage.setItem(KEY, JSON.stringify(p)); } catch {}
}

function position(timeout = 12000) {
  return new Promise((resolve, reject) => {
    if (!navigator.geolocation) return reject(new Error("unsupported"));
    navigator.geolocation.getCurrentPosition(resolve, reject, { enableHighAccuracy: false, timeout, maximumAge: 10 * 60 * 1000 });
  });
}

// Town name for coordinates (BigDataCloud's free client-side lookup, no key).
async function townFor(lat, lon) {
  try {
    const r = await fetch(`https://api.bigdatacloud.net/data/reverse-geocode-client?latitude=${lat}&longitude=${lon}&localityLanguage=en`);
    const j = await r.json();
    const name = j.city || j.locality || j.principalSubdivision;
    if (name) return { name, region: [j.principalSubdivision !== name ? j.principalSubdivision : "", j.countryName].filter(Boolean).join(", ") };
  } catch {}
  return { name: "Your location", region: `${lat.toFixed(2)}, ${lon.toFixed(2)}` };
}

export async function placeFromDevice() {
  const p = await position();
  const { latitude: lat, longitude: lon } = p.coords;
  return { ...(await townFor(lat, lon)), lat, lon, source: "gps", at: Date.now() };
}

// On every launch of the mobile app, refresh the place if the person has moved more than 3 km.
// Only runs when permission is already granted, so it never pops a prompt by surprise.
export async function refreshDevicePlace(current) {
  try {
    const perm = await navigator.permissions?.query({ name: "geolocation" });
    if (perm && perm.state !== "granted") return null;
    const next = await placeFromDevice();
    if (!current || km(current, next) > 3) return next;
  } catch {}
  return null;
}

export function km(a, b) {
  const R = 6371, d = Math.PI / 180;
  const x = Math.sin(((b.lat - a.lat) * d) / 2) ** 2 + Math.cos(a.lat * d) * Math.cos(b.lat * d) * Math.sin(((b.lon - a.lon) * d) / 2) ** 2;
  return 2 * R * Math.asin(Math.sqrt(x));
}

export function whyFailed(err) {
  if (err?.code === 1) return "Location permission was turned off.";
  if (err?.code === 3) return "Finding your location took too long.";
  if (err?.message === "unsupported") return "This device can't share its location.";
  return "Your location couldn't be found.";
}

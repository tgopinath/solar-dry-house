// Live weather from Open-Meteo (free, no key) and what it means inside the dry house.
const FORECAST = "https://api.open-meteo.com/v1/forecast";
const GEOCODE = "https://geocoding-api.open-meteo.com/v1/search";
const CACHE_KEY = "sdh-weather";

export async function fetchWeather(loc) {
  const q = new URLSearchParams({
    latitude: loc.lat, longitude: loc.lon, timezone: "auto", forecast_days: 16,
    current: "temperature_2m,relative_humidity_2m,cloud_cover,shortwave_radiation,weather_code,wind_speed_10m,is_day",
    daily: "weather_code,temperature_2m_max,temperature_2m_min,relative_humidity_2m_mean,shortwave_radiation_sum,precipitation_probability_max,cloud_cover_mean,sunrise,sunset",
  });
  try {
    const r = await fetch(`${FORECAST}?${q}`);
    if (!r.ok) throw new Error(`Weather service answered ${r.status}`);
    const data = await r.json();
    const out = { loc, at: Date.now(), data };
    try { localStorage.setItem(CACHE_KEY, JSON.stringify(out)); } catch {}
    return { ...out, live: true };
  } catch (err) {
    const cached = cachedWeather(loc);
    if (cached) return { ...cached, live: false, error: err.message };
    throw err;
  }
}

export function cachedWeather(loc) {
  try {
    const c = JSON.parse(localStorage.getItem(CACHE_KEY));
    if (c && Math.abs(c.loc.lat - loc.lat) < 0.01 && Math.abs(c.loc.lon - loc.lon) < 0.01) return c;
  } catch {}
  return null;
}

export async function searchPlaces(name) {
  const r = await fetch(`${GEOCODE}?${new URLSearchParams({ name, count: 6, language: "en" })}`);
  if (!r.ok) throw new Error("Place search failed");
  const j = await r.json();
  return (j.results || []).map((p) => ({
    name: p.name, region: [p.admin1, p.country].filter(Boolean).join(", "), lat: p.latitude, lon: p.longitude,
  }));
}

const clamp = (v, a, b) => Math.min(b, Math.max(a, v));

// Air in the house runs 15–25 °C above outside on a sunny day; the rise follows sunshine.
export const houseRise = (radMJ) => clamp(25 * (radMJ / 22), 3, 28);
export const houseRiseNow = (wm2) => clamp(25 * (wm2 / 850), 0, 28);
// Heating air by ~11 °C halves its relative humidity.
export const houseRH = (rh, rise) => clamp(rh * Math.pow(2, -rise / 11), 5, 100);

// How fast drying runs on a day compared with a clear reference day (1.0).
export function dayFactor(day) {
  const sun = Math.pow(clamp(day.rad / 20, 0, 1.4), 0.9);
  const humid = clamp(1 - 0.008 * (day.rh - 65), 0.6, 1.15);
  return clamp(sun * humid, 0.1, 1.3);
}

export function rating(f) {
  if (f >= 0.85) return { key: "good", label: "Good drying" };
  if (f >= 0.55) return { key: "fair", label: "Fair" };
  return { key: "poor", label: "Slow" };
}

export function days(w) {
  const d = w.data.daily;
  return d.time.map((t, i) => {
    const day = {
      date: t, code: d.weather_code[i], tmax: d.temperature_2m_max[i], tmin: d.temperature_2m_min[i],
      rh: d.relative_humidity_2m_mean[i], rad: d.shortwave_radiation_sum[i] ?? 0,
      rain: d.precipitation_probability_max[i] ?? 0, cloud: d.cloud_cover_mean[i] ?? 0,
      sunrise: d.sunrise[i], sunset: d.sunset[i],
    };
    day.rise = houseRise(day.rad);
    day.house = day.tmax + day.rise;
    day.houseRH = houseRH(day.rh * 0.7, day.rise);
    day.f = dayFactor(day);
    return day;
  }).filter((day) => day.tmax != null && day.rh != null);
}

// Walk the forecast until the clear-day equivalent is used up.
// Loading after 11 am starts counting from the next day.
export function finishDate(needDays, forecast, now = new Date()) {
  if (needDays == null) return null;
  if (needDays === 0) return { date: forecast[0].date, beyond: false, startsTomorrow: false };
  const startsTomorrow = now.getHours() >= 11;
  let left = needDays;
  const list = forecast.slice(startsTomorrow ? 1 : 0);
  for (const day of list) {
    left -= day.f;
    if (left <= 0) return { date: day.date, beyond: false, startsTomorrow };
  }
  const avg = list.reduce((s, x) => s + x.f, 0) / list.length || 1;
  const last = new Date(list[list.length - 1].date + "T00:00");
  last.setDate(last.getDate() + Math.ceil(left / avg));
  return { date: last.toISOString().slice(0, 10), beyond: true, startsTomorrow };
}

const WMO = {
  0: ["Clear sky", "sun"], 1: ["Mostly clear", "sun"], 2: ["Partly cloudy", "part"], 3: ["Overcast", "cloud"],
  45: ["Fog", "cloud"], 48: ["Fog", "cloud"], 51: ["Light drizzle", "rain"], 53: ["Drizzle", "rain"], 55: ["Heavy drizzle", "rain"],
  56: ["Freezing drizzle", "rain"], 57: ["Freezing drizzle", "rain"], 61: ["Light rain", "rain"], 63: ["Rain", "rain"], 65: ["Heavy rain", "rain"],
  66: ["Freezing rain", "rain"], 67: ["Freezing rain", "rain"], 71: ["Light snow", "cloud"], 73: ["Snow", "cloud"], 75: ["Heavy snow", "cloud"],
  77: ["Snow grains", "cloud"], 80: ["Rain showers", "rain"], 81: ["Rain showers", "rain"], 82: ["Heavy showers", "rain"],
  85: ["Snow showers", "cloud"], 86: ["Snow showers", "cloud"], 95: ["Thunderstorm", "storm"], 96: ["Thunderstorm, hail", "storm"], 99: ["Thunderstorm, hail", "storm"],
};
export const describe = (code) => WMO[code] || ["—", "cloud"];

export function icon(kind, size = 28) {
  const s = `width="${size}" height="${size}" viewBox="0 0 32 32" aria-hidden="true"`;
  const sun = `<circle cx="16" cy="16" r="6" fill="var(--sun)"/><g stroke="var(--sun)" stroke-width="2" stroke-linecap="round"><path d="M16 3v4M16 25v4M3 16h4M25 16h4M6.8 6.8l2.8 2.8M22.4 22.4l2.8 2.8M6.8 25.2l2.8-2.8M22.4 9.6l2.8-2.8"/></g>`;
  const cloud = (x = 0, y = 0) => `<path transform="translate(${x} ${y})" d="M9 25h14a5 5 0 0 0 0-10 7 7 0 0 0-13.4 1.6A4.2 4.2 0 0 0 9 25z" fill="var(--cloud)" stroke="var(--muted)" stroke-width="1.2"/>`;
  if (kind === "sun") return `<svg ${s}>${sun}</svg>`;
  if (kind === "part") return `<svg ${s}><g transform="translate(-4 -5) scale(.8)">${sun}</g>${cloud(2, 1)}</svg>`;
  if (kind === "rain") return `<svg ${s}>${cloud(0, -3)}<g stroke="var(--sky)" stroke-width="2" stroke-linecap="round"><path d="M12 26l-1 3M17 26l-1 3M22 26l-1 3"/></g></svg>`;
  if (kind === "storm") return `<svg ${s}>${cloud(0, -3)}<path d="M17 23l-3 5h3l-2 4" fill="none" stroke="var(--sun)" stroke-width="2" stroke-linejoin="round"/></svg>`;
  return `<svg ${s}>${cloud()}</svg>`;
}

#!/usr/bin/env node
// Builds the portfolio prototypes into ./prototype:
//   web/     the web app (asks for the place)
//   mobile/  the mobile app (reads the device location)
//   images/  photos shared by both
//   mobile.html, case-study.html, shots/
// node tools/build-prototype.mjs           build files
// node tools/build-prototype.mjs --shots   also capture screenshots with headless Chrome
import fs from "node:fs";
import path from "node:path";
import { spawn, execFileSync } from "node:child_process";

const ROOT = path.resolve(import.meta.dirname, "..");
const OUT = path.join(ROOT, "prototype");
const CHROME = "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome";
const APP_FILES = ["styles.css", "app.js", "materials.js", "weather.js", "location.js", "manifest.webmanifest", "icons"];
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

const cp = (src, dst) => fs.cpSync(src, dst, { recursive: true });
for (const d of ["web", "mobile", "images"]) fs.rmSync(path.join(OUT, d), { recursive: true, force: true });
fs.mkdirSync(OUT, { recursive: true });
cp(path.join(ROOT, "images"), path.join(OUT, "images"));

for (const mode of ["web", "mobile"]) {
  const dir = path.join(OUT, mode);
  fs.mkdirSync(dir, { recursive: true });
  for (const f of APP_FILES) cp(path.join(ROOT, f), path.join(dir, f));
  let html = fs.readFileSync(path.join(ROOT, "index.html"), "utf8");
  html = html.replace('<html lang="en">', `<html lang="en" data-mode="${mode}">`);
  html = html.replace('<script type="module" src="app.js"></script>', '<script>window.SDH_ASSETS = "../"; window.SDH_NO_SW = true;</script>\n<script type="module" src="app.js"></script>');
  html = html.replace("<title>Solar Dry House</title>", `<title>Solar Dry House ${mode === "web" ? "Web" : "Mobile"}</title>`);
  fs.writeFileSync(path.join(dir, "index.html"), html);
}
for (const f of fs.readdirSync(path.join(ROOT, "prototype-src"))) cp(path.join(ROOT, "prototype-src", f), path.join(OUT, f));
console.log("built web/, mobile/, images/ and pages");

if (process.argv.includes("--shots")) await shots();

async function shots() {
  const SHOTS = path.join(OUT, "shots");
  fs.mkdirSync(SHOTS, { recursive: true });
  const tmp = path.join(ROOT, ".shots-tmp"); fs.mkdirSync(tmp, { recursive: true });
  const port = 5700 + Math.floor(Math.random() * 200), dbg = port + 1000;
  const server = spawn("python3", ["-m", "http.server", String(port), "--bind", "127.0.0.1", "--directory", OUT], { stdio: "ignore" });
  const chrome = spawn(CHROME, ["--headless=new", "--disable-gpu", "--hide-scrollbars", `--remote-debugging-port=${dbg}`, `--user-data-dir=${tmp}/profile`, "about:blank"], { stdio: "ignore" });
  const PLACE = { name: "Coimbatore", lat: 11.0055, lon: 76.9661 };
  try {
    let ws;
    for (let i = 0; i < 60 && !ws; i++) {
      try { const p = (await (await fetch(`http://127.0.0.1:${dbg}/json`)).json()).find((t) => t.type === "page"); if (p) ws = new WebSocket(p.webSocketDebuggerUrl); } catch {}
      if (!ws) await sleep(250);
    }
    await new Promise((r, j) => { ws.onopen = r; ws.onerror = j; });
    let id = 0; const pending = {};
    ws.onmessage = (e) => { const m = JSON.parse(e.data); if (pending[m.id]) { pending[m.id](m); delete pending[m.id]; } };
    const send = (method, params = {}) => new Promise((r) => { const i = ++id; pending[i] = r; ws.send(JSON.stringify({ id: i, method, params })); });
    const origin = `http://127.0.0.1:${port}`;
    await send("Browser.grantPermissions", { origin, permissions: ["geolocation"] });
    await send("Emulation.setGeolocationOverride", { latitude: PLACE.lat, longitude: PLACE.lon, accuracy: 50 });
    await send("Emulation.setEmulatedMedia", { features: [{ name: "prefers-color-scheme", value: "light" }] });

    const grab = async (url, file, { wait = 5000, scrollY = 0 } = {}) => {
      await send("Page.navigate", { url: origin + url }); await sleep(wait);
      if (scrollY) { await send("Runtime.evaluate", { expression: `scrollTo(0,${scrollY})` }); await sleep(600); }
      const s = await send("Page.captureScreenshot", { format: "png" });
      const png = path.join(tmp, file + ".png");
      fs.writeFileSync(png, Buffer.from(s.result.data, "base64"));
      return png;
    };
    const jpg = (png, file, width) => execFileSync("sips", ["-s", "format", "jpeg", "-s", "formatOptions", "84", "--resampleWidth", String(width), png, "--out", path.join(SHOTS, file + ".jpg")], { stdio: "pipe" });

    // Mobile: 390 × 849 at 2x, saved 600 wide like the other portfolio phone shots.
    await send("Emulation.setDeviceMetricsOverride", { width: 390, height: 849, deviceScaleFactor: 2, mobile: true });
    await send("Runtime.evaluate", { expression: "localStorage.clear()" });
    jpg(await grab("/mobile/#home", "m-home", { wait: 7000 }), "m-home", 600); // first launch: location read from the device
    jpg(await grab("/mobile/#materials", "m-materials", { wait: 4000 }), "m-materials", 600);
    jpg(await grab("/mobile/#m/red-chilli", "m-detail", { wait: 4000 }), "m-detail", 600);
    jpg(await grab("/mobile/#m/turmeric", "m-curve", { wait: 4000, scrollY: 560 }), "m-curve", 600);
    jpg(await grab("/mobile/#calc/copra", "m-batch", { wait: 4000 }), "m-batch", 600);

    // Web: 1440 × 900.
    await send("Emulation.setDeviceMetricsOverride", { width: 1440, height: 900, deviceScaleFactor: 1, mobile: false });
    await send("Page.navigate", { url: origin + "/web/" }); await sleep(800);
    await send("Runtime.evaluate", { expression: "localStorage.clear()" });
    jpg(await grab("/web/?first=1#home", "w-welcome", { wait: 3000 }), "w-welcome", 1440);
    const q = encodeURIComponent(`${PLACE.name}|${PLACE.lat}|${PLACE.lon}`);
    jpg(await grab(`/web/?place=${q}#home`, "w-home", { wait: 6000 }), "w-home", 1440);
    jpg(await grab("/web/#materials", "w-materials", { wait: 4000 }), "w-materials", 1440);
    jpg(await grab("/web/#m/moringa", "w-detail", { wait: 4000 }), "w-detail", 1440);
    console.log("captured", fs.readdirSync(SHOTS).join(", "));
    ws.close();
  } finally {
    const exited = new Promise((r) => chrome.once("exit", r));
    chrome.kill(); server.kill();
    await Promise.race([exited, sleep(5000)]);
    fs.rmSync(tmp, { recursive: true, force: true, maxRetries: 5, retryDelay: 200 });
  }
}

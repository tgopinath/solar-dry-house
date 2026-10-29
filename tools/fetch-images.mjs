// Downloads one freely licensed photo per material from Wikipedia / Wikimedia Commons
// into images/, and writes images/credits.json with author and licence for each.
import { writeFile, readFile } from "node:fs/promises";
const UA = { "User-Agent": "SolarDryHouseApp/1.0 (gopinath.t@zohocorp.com)" };
const PICKS = {
  "red-chilli": ["Dried chili pepper", "Chili pepper"], turmeric: ["Turmeric"], ginger: ["Ginger"], "black-pepper": ["Black pepper"],
  cardamom: ["Cardamom"], "coriander-seed": ["Coriander seed", "Coriander"], garlic: ["Garlic"], tamarind: ["Tamarind"],
  "curry-leaves": ["Curry tree"], moringa: ["Moringa oleifera"], mint: ["Mentha"], "coriander-leaves": ["Coriander"],
  tulsi: ["Ocimum tenuiflorum"], neem: ["Azadirachta indica"], "fenugreek-leaves": ["Fenugreek"], rose: ["Rose"],
  marigold: ["Tagetes erecta", "Tagetes"], hibiscus: ["Hibiscus rosa-sinensis"], mango: ["Dried mango", "Mango"],
  banana: ["Banana chips", "Banana"], grapes: ["Raisin"], jackfruit: ["Jackfruit"], papaya: ["Papaya"], pineapple: ["Pineapple"],
  amla: ["Phyllanthus emblica"], sapota: ["Sapodilla"], figs: ["Common fig"], dates: ["Date palm"], apple: ["Dried apple", "Apple"],
  "citrus-peel": ["Zest (ingredient)", "Orange (fruit)"], "drumstick-pods": ["Drumstick (vegetable)", "Moringa oleifera"],
  tomato: ["Sun-dried tomato", "Tomato"], onion: ["Onion"], potato: ["Potato"], carrot: ["Carrot"], "bitter-gourd": ["Momordica charantia"],
  okra: ["Okra"], "cluster-beans": ["Guar"], mushroom: ["Agaricus bisporus"], tapioca: ["Cassava"], "green-peas": ["Pea"],
  paddy: ["Paddy (rice)", "Rice"], maize: ["Maize"], millets: ["Finger millet", "Millet"], pulses: ["Pulse (legume)", "Lentil"],
  sesame: ["Sesame"], copra: ["Copra"], groundnut: ["Peanut"], cashew: ["Cashew"], areca: ["Areca nut"], coffee: ["Coffee bean"],
  cocoa: ["Cocoa bean"], "salted-fish": ["Dried fish", "Stockfish"], anchovy: ["Anchovy"], prawns: ["Dried shrimp"],
  fodder: ["Hay"], azolla: ["Azolla"], "cow-dung": ["Cow dung", "Dung"],
};
const only = process.argv.slice(2);
const credits = JSON.parse(await readFile("images/credits.json", "utf8").catch(() => "{}"));
const strip = (h) => (h || "").replace(/<[^>]+>/g, "").replace(/\s+/g, " ").trim();
for (const [id, titles] of Object.entries(PICKS)) {
  if (only.length && !only.includes(id)) continue;
  if (!only.length && credits[id]) continue;
  let done = false;
  for (const t of titles) {
    const s = await fetch(`https://en.wikipedia.org/api/rest_v1/page/summary/${encodeURIComponent(t)}`, { headers: UA }).then((r) => r.ok ? r.json() : null).catch(() => null);
    const thumb = s?.thumbnail?.source; if (!thumb) continue;
    const file = decodeURIComponent(s.originalimage.source.split("?")[0].split("/").pop()).replace(/^\d+px-/, "");
    const meta = await fetch(`https://commons.wikimedia.org/w/api.php?action=query&format=json&prop=imageinfo&iiprop=extmetadata|url&iiurlwidth=800&titles=${encodeURIComponent("File:" + file)}`, { headers: UA }).then((r) => r.json()).catch(() => null);
    const page = meta && Object.values(meta.query.pages)[0];
    const info = page?.imageinfo?.[0];
    if (!info) { console.log(id, "not on Commons (likely non-free):", file); continue; }
    const m = info.extmetadata;
    const lic = m.LicenseShortName?.value || "";
    if (/fair use|non-free/i.test(lic)) continue;
    const url = info.thumburl || info.url;
    if (/\.svg/i.test(file)) continue;
    const buf = Buffer.from(await (await fetch(url, { headers: UA })).arrayBuffer());
    await writeFile(`images/${id}.jpg`, buf);
    credits[id] = { article: t, file, author: strip(m.Artist?.value) || "Unknown", license: lic, page: info.descriptionurl };
    console.log(id, "←", t, "|", file, "|", lic);
    done = true; break;
  }
  if (!done) console.log(id, "NO IMAGE");
}
await writeFile("images/credits.json", JSON.stringify(credits, null, 1));

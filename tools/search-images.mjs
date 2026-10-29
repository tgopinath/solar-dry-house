// Replace specific materials' photos with the best Commons photo for a search query.
import { writeFile, readFile } from "node:fs/promises";
const UA = { "User-Agent": "SolarDryHouseApp/1.0 (gopinath.t@zohocorp.com)" };
const Q = JSON.parse(process.argv[2]);
const credits = JSON.parse(await readFile("images/credits.json", "utf8"));
const strip = (h) => (h || "").replace(/<[^>]+>/g, "").replace(/\s+/g, " ").trim();
for (const [id, query] of Object.entries(Q)) {
  const api = `https://commons.wikimedia.org/w/api.php?action=query&format=json&generator=search&gsrnamespace=6&gsrlimit=12&gsrsearch=${encodeURIComponent(query + " filetype:bitmap")}&prop=imageinfo&iiprop=url|extmetadata|size&iiurlwidth=800`;
  const j = await fetch(api, { headers: UA }).then((r) => r.json()).catch(() => null);
  const pages = Object.values(j?.query?.pages || {}).sort((a, b) => a.index - b.index);
  const pick = pages.find((p) => {
    const i = p.imageinfo?.[0]; if (!i) return false;
    const lic = i.extmetadata?.LicenseShortName?.value || "";
    return /\.(jpe?g)$/i.test(p.title) && i.width >= 600 && i.width >= i.height * 0.8 && !/fair use|non-free/i.test(lic) && !/Köhler|Blanco|illustration|drawing/i.test(p.title);
  });
  if (!pick) { console.log(id, "NO MATCH for", query); continue; }
  const i = pick.imageinfo[0], m = i.extmetadata;
  await writeFile(`images/${id}.jpg`, Buffer.from(await (await fetch(i.thumburl, { headers: UA })).arrayBuffer()));
  credits[id] = { query, file: pick.title.replace(/^File:/, ""), author: strip(m.Artist?.value) || "Unknown", license: m.LicenseShortName?.value || "", page: i.descriptionurl };
  console.log(id, "←", pick.title, "|", credits[id].license);
}
await writeFile("images/credits.json", JSON.stringify(credits, null, 1));

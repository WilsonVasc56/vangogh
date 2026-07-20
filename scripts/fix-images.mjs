// Corrige imagens específicas buscando arquivos diretamente no Wikimedia Commons.
import { writeFileSync, readFileSync } from "node:fs";
import path from "node:path";

const UA = { "User-Agent": "VanGoghMuseumApp/1.0 (contato: dev@localhost)" };
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const root = process.cwd();

const targets = [
  { slug: "a-colheita", query: "Harvest at La Crau Montmajour Van Gogh" },
  { slug: "autorretrato-1889", query: "Van Gogh self-portrait September 1889 Orsay" },
  { slug: "la-berceuse", query: "La Berceuse Augustine Roulin Van Gogh" },
  { slug: "autorretrato-com-chapeu-de-palha", query: "Van Gogh Self-Portrait Straw Hat 1887 Metropolitan" },
];

async function api(params) {
  const url = "https://commons.wikimedia.org/w/api.php?action=query&format=json&" + params;
  for (let a = 1; a <= 5; a++) {
    const r = await fetch(url, { headers: UA });
    if (r.status === 429 || !r.headers.get("content-type")?.includes("json")) {
      await sleep(a * 4000);
      continue;
    }
    return r.json();
  }
  throw new Error("Commons API indisponível");
}

const imagesPath = path.join(root, "src/data/images.json");
const map = JSON.parse(readFileSync(imagesPath, "utf8"));

for (const { slug, query } of targets) {
  await sleep(1500);
  const search = await api(
    "list=search&srnamespace=6&srlimit=8&srsearch=" + encodeURIComponent(query)
  );
  const hits = search.query.search.map((s) => s.title);
  console.log(`\n${slug}: candidatos:`, hits.join(" | "));
  let done = false;
  for (const title of hits) {
    if (!/\.(jpe?g|png|tif|tiff)$/i.test(title)) continue;
    await sleep(1500);
    const ii = await api(
      "prop=imageinfo&iiprop=url&iiurlwidth=1400&titles=" + encodeURIComponent(title)
    );
    const page = Object.values(ii.query.pages)[0];
    const url = page?.imageinfo?.[0]?.thumburl ?? page?.imageinfo?.[0]?.url;
    if (!url) continue;
    const ext = (url.match(/\.(jpe?g|png)/i)?.[1] ?? "jpg").toLowerCase().replace("jpeg", "jpg");
    const res = await fetch(url, { headers: UA });
    if (!res.ok) { await sleep(3000); continue; }
    const file = `${slug}.${ext}`;
    writeFileSync(path.join(root, "public/artworks", file), Buffer.from(await res.arrayBuffer()));
    map[slug] = `/artworks/${file}`;
    console.log(`  escolhido: ${title}`);
    done = true;
    break;
  }
  if (!done) console.log(`  FALHA ${slug}`);
}

writeFileSync(imagesPath, JSON.stringify(map, null, 2));
console.log("\nimages.json atualizado");

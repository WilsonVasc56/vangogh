// Baixa as imagens das obras via API da Wikipedia (batch) -> Wikimedia Commons
// e gera src/data/images.json com o mapa slug -> caminho local.
import { readFileSync, writeFileSync, mkdirSync, existsSync } from "node:fs";
import path from "node:path";

const UA = { "User-Agent": "VanGoghMuseumApp/1.0 (contato: dev@localhost)" };
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

const root = process.cwd();
const src = readFileSync(path.join(root, "src/data/artworks.ts"), "utf8");

// Cada bloco começa em `slug:`; `arquivoCommons` (opcional) fixa o arquivo exato
// no Wikimedia Commons quando a obra não tem artigo próprio na Wikipedia.
const entries = src
  .split(/(?=\bslug:\s*")/)
  .slice(1)
  .map((block) => ({
    slug: block.match(/slug:\s*"([^"]+)"/)?.[1],
    wikiTitle: block.match(/wikiTitle:\s*"([^"]+)"/)?.[1],
    arquivoCommons: block.match(/arquivoCommons:\s*"([^"]+)"/)?.[1],
  }))
  .filter((entry) => entry.slug && entry.wikiTitle);
console.log(`${entries.length} obras encontradas`);

const outDir = path.join(root, "public/artworks");
mkdirSync(outDir, { recursive: true });

async function apiGet(params) {
  const url = "https://en.wikipedia.org/w/api.php?action=query&format=json&" + params;
  for (let attempt = 1; attempt <= 6; attempt++) {
    const res = await fetch(url, { headers: UA });
    if (res.status === 429 || !res.headers.get("content-type")?.includes("json")) {
      await sleep(attempt * 4000);
      continue;
    }
    return res.json();
  }
  throw new Error("API indisponível: " + params.slice(0, 60));
}

async function commonsFileUrl(fileName) {
  const url =
    "https://commons.wikimedia.org/w/api.php?action=query&format=json&prop=imageinfo&iiprop=url&iiurlwidth=1400&titles=" +
    encodeURIComponent("File:" + fileName);
  for (let attempt = 1; attempt <= 6; attempt++) {
    const res = await fetch(url, { headers: UA });
    if (res.status === 429 || !res.headers.get("content-type")?.includes("json")) {
      await sleep(attempt * 4000);
      continue;
    }
    const page = Object.values((await res.json()).query.pages)[0];
    return page?.imageinfo?.[0]?.thumburl ?? page?.imageinfo?.[0]?.url ?? null;
  }
  throw new Error("Commons indisponível: " + fileName);
}

// 1) Chamadas batch (a API aceita até 50 títulos por vez) para resolver as imagens
const byTitle = {};
const uniqueTitles = [...new Set(entries.filter((e) => !e.arquivoCommons).map((e) => e.wikiTitle))];
for (let start = 0; start < uniqueTitles.length; start += 50) {
  const json = await apiGet(
    "redirects=1&prop=pageimages&piprop=thumbnail%7Coriginal&pithumbsize=1400&titles=" +
      encodeURIComponent(uniqueTitles.slice(start, start + 50).join("|"))
  );
  const redirects = Object.fromEntries((json.query.redirects ?? []).map((r) => [r.to, r.from]));
  for (const page of Object.values(json.query.pages)) {
    if (page.missing !== undefined) continue;
    const url = page.thumbnail?.source ?? page.original?.source ?? null;
    byTitle[page.title] = url;
    if (redirects[page.title]) byTitle[redirects[page.title]] = url;
  }
  await sleep(1200);
}

// Fallback 1: título ausente/sem imagem -> busca full-text e tenta o 1º resultado
// Fallback 2: lista de imagens do artigo (prop=images) -> primeiro .jpg razoável
async function resolveImage(wikiTitle, slug) {
  if (byTitle[wikiTitle]) return byTitle[wikiTitle];
  await sleep(1200);
  const search = await apiGet(
    "list=search&srlimit=3&srsearch=" + encodeURIComponent(wikiTitle + " Van Gogh")
  );
  for (const hit of search.query.search) {
    await sleep(1200);
    const q = await apiGet(
      "prop=pageimages&piprop=thumbnail%7Coriginal&pithumbsize=1400&titles=" +
        encodeURIComponent(hit.title)
    );
    const page = Object.values(q.query.pages)[0];
    const url = page?.thumbnail?.source ?? page?.original?.source;
    if (url) {
      console.log(`  fallback busca: ${slug} -> '${hit.title}'`);
      return url;
    }
  }
  await sleep(1200);
  const imgs = await apiGet(
    "prop=images&imlimit=50&titles=" + encodeURIComponent(wikiTitle)
  );
  const page = Object.values(imgs.query.pages)[0];
  const candidate = (page?.images ?? [])
    .map((i) => i.title)
    .find((t) => /\.jpe?g$/i.test(t) && !/icon|logo|wikidata|commons|arrow|edit/i.test(t));
  if (candidate) {
    await sleep(1200);
    const ii = await apiGet(
      "prop=imageinfo&iiprop=url&iiurlwidth=1400&titles=" + encodeURIComponent(candidate)
    );
    const ip = Object.values(ii.query.pages)[0];
    const url = ip?.imageinfo?.[0]?.thumburl ?? ip?.imageinfo?.[0]?.url;
    if (url) {
      console.log(`  fallback arquivo: ${slug} -> '${candidate}'`);
      return url;
    }
  }
  return null;
}

// 2) Download sequencial com pausa e retry
const map = {};
const failures = [];
for (const { slug, wikiTitle, arquivoCommons } of entries) {
  const cached = ["jpg", "png", "webp"].find((ext) => existsSync(path.join(outDir, `${slug}.${ext}`)));
  if (cached) {
    map[slug] = `/artworks/${slug}.${cached}`;
    console.log(`cache ${slug}`);
    continue;
  }
  const url = arquivoCommons
    ? await commonsFileUrl(arquivoCommons)
    : await resolveImage(wikiTitle, slug);
  if (!url) {
    failures.push(slug);
    console.log(`FALHA ${slug} (sem imagem para '${wikiTitle}')`);
    continue;
  }
  const extMatch = url.match(/\.(jpe?g|png|webp)/i);
  const ext = extMatch ? extMatch[1].toLowerCase().replace("jpeg", "jpg") : "jpg";
  const file = `${slug}.${ext}`;
  const dest = path.join(outDir, file);

  if (existsSync(dest)) {
    map[slug] = `/artworks/${file}`;
    console.log(`cache ${slug}`);
    continue;
  }

  let ok = false;
  for (let attempt = 1; attempt <= 5; attempt++) {
    try {
      const img = await fetch(url, { headers: UA });
      if (img.status === 429) {
        await sleep(attempt * 6000);
        continue;
      }
      if (!img.ok) throw new Error(`HTTP ${img.status}`);
      writeFileSync(dest, Buffer.from(await img.arrayBuffer()));
      ok = true;
      break;
    } catch {
      // Falha de rede ou HTTP: espera progressiva antes da próxima tentativa.
      await sleep(attempt * 3000);
    }
  }
  if (ok) {
    map[slug] = `/artworks/${file}`;
    console.log(`ok    ${slug}`);
  } else {
    failures.push(slug);
    console.log(`FALHA ${slug} (download)`);
  }
  await sleep(400);
}

writeFileSync(path.join(root, "src/data/images.json"), JSON.stringify(map, null, 2));
console.log(`\nConcluído: ${Object.keys(map).length}/${entries.length} imagens`);
if (failures.length) console.log("Falhas:", failures.join(", "));

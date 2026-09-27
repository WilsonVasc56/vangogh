// Confere se cada título da Wikipedia existe e tem imagem principal.
// Uso: node scripts/check-titles.mjs
// Artigos usados como `wikiTitle` pelas obras acrescentadas para completar as
// salas. Obras sem artigo próprio usam `arquivoCommons` em artworks.ts.
const titles = [
  "Peasant Character Studies (Van Gogh series)",
  "Water Mill at Kollen Near Nuenen",
  "Still life paintings by Vincent van Gogh (Netherlands)",
  "Congregation Leaving the Reformed Church in Nuenen",
  "Cottages (Van Gogh series)",
  "Old Church Tower at Nuenen",
  "Peasant Woman Digging Up Potatoes",
  "Asnières (Van Gogh series)",
  "Wheat Fields",
  "Agostina Segatori",
  "Portraits of Vincent van Gogh",
  "Saintes-Maries (Van Gogh series)",
  "The Roulin Family",
  "Eugène Boch",
  "Van Gogh's Chair",
  "Cypresses (Metropolitan Museum of Art)",
  "Reaper (Van Gogh series)",
  "Copies by Vincent van Gogh",
  "Marguerite Gachet",
  "List of works by Vincent van Gogh",
  "Peasant Woman Against a Background of Wheat",
  "Farms near Auvers",
];

const r = await fetch(
  "https://en.wikipedia.org/w/api.php?action=query&format=json&redirects=1&prop=pageimages&piprop=thumbnail&pithumbsize=200&titles=" +
    encodeURIComponent(titles.join("|")),
  { headers: { "User-Agent": "VanGoghMuseumApp/1.0" } }
);
const j = await r.json();
for (const redirect of j.query.redirects ?? []) {
  console.log("REDIR", redirect.from, "->", redirect.to);
}
for (const p of Object.values(j.query.pages)) {
  console.log(
    p.missing !== undefined ? "MISS" : "OK  ",
    p.thumbnail ? "img" : "---",
    p.title,
    p.thumbnail ? p.thumbnail.source.split("/").at(-1) : ""
  );
}

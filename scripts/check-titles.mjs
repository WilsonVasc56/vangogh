const titles = [
  "Road with Cypress and Star",
  "L'Arlésienne (painting)",
  "The Zouave",
  "Saintes-Maries (Van Gogh series)",
  "Houses at Auvers",
  "Thatched Cottages and Houses",
  "Landscape with a Carriage and a Train",
  "Portrait of Adeline Ravoux",
  "Still Life: Vase with Pink Roses",
  "Blossoming Chestnut Branches",
  "Flowering Orchards",
  "Still Life: Vase with Oleanders",
  "The Roulin Family",
  "Cypresses (Van Gogh)",
  "The Sower (Van Gogh)",
  "Green Wheat Fields, Auvers",
  "Poppy Field (Van Gogh)",
  "Self-Portrait as a Painter",
  "Avenue of Poplars in Autumn",
  "The Pink Orchard",
  "Oleanders",
  "First Steps, after Millet",
];

const r = await fetch(
  "https://en.wikipedia.org/w/api.php?action=query&format=json&prop=pageimages&piprop=thumbnail&pithumbsize=200&titles=" +
    encodeURIComponent(titles.join("|")),
  { headers: { "User-Agent": "VanGoghMuseumApp/1.0" } }
);
const j = await r.json();
for (const p of Object.values(j.query.pages)) {
  console.log(
    p.missing !== undefined ? "MISS" : "OK  ",
    p.thumbnail ? "img" : "---",
    p.title
  );
}

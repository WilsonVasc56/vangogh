const qs = [
  "The Sower Van Gogh",
  "Cypresses Van Gogh painting",
  "Road with Cypress and Star",
  "Portrait of the Postman Joseph Roulin",
  "L'Arlésienne Van Gogh painting",
  "The Zouave Van Gogh",
  "Fishing Boats on the Beach at Saintes-Maries",
  "Thatched Cottages at Cordeville",
  "Landscape with Carriage and Train Van Gogh",
  "Portrait of Adeline Ravoux",
  "The Mulberry Tree Van Gogh",
  "Ward in the Hospital in Arles",
  "Self-Portrait as a Painter Van Gogh",
  "Avenue of Poplars in Autumn Van Gogh",
  "Poppy Field Van Gogh Auvers",
  "Farms near Auvers",
  "Green Wheat Field with Cypress",
  "First Steps after Millet Van Gogh",
  "Vase with Pink Roses Van Gogh",
  "Blossoming Chestnut Branches",
  "The Potato Peeler Van Gogh",
  "Two Cut Sunflowers Van Gogh",
  "View of Arles with Irises",
  "The Pink Peach Tree Van Gogh",
  "Oleanders Van Gogh",
  "Still Life with Quinces Van Gogh",
  "Skull Van Gogh painting",
  "Portrait of Armand Roulin",
  "The Bedroom Van Gogh second version",
  "Sunflowers Van Gogh Munich",
];

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

for (const q of qs) {
  const r = await fetch(
    "https://en.wikipedia.org/w/api.php?action=query&format=json&list=search&srlimit=2&srsearch=" +
      encodeURIComponent(q),
    { headers: { "User-Agent": "VanGoghMuseumApp/1.0" } }
  );
  if (r.status === 429) {
    console.log(q, "=> RATE LIMIT");
    await sleep(5000);
    continue;
  }
  const j = await r.json();
  const titles = (j.query?.search || []).map((s) => s.title).join(" | ");
  console.log(q, "=>", titles);
  await sleep(900);
}

/** Jardim do recuo leste: à esquerda ao olhar da primeira sala para a entrada. */
export type GardenPoint = [number, number, number];

export interface GardenInstance {
  position: GardenPoint;
  rotation: GardenPoint;
  scale: GardenPoint;
  color: string;
}

export interface GardenStem {
  start: GardenPoint;
  end: GardenPoint;
  radius: number;
}

// Mesmos limites para a base visual e para o colisor exportado pelo componente.
export const INTERIOR_GARDEN_BOUNDS = {
  minX: 2.64, maxX: 8.16, minZ: -1.44, maxZ: 7.32,
};
export const GARDEN_SURFACE_Y = 0.22;
export const GARDEN_COLORS = {
  stone: "#b8b2a3", gravel: "#cfc9b9", trim: "#454b43", stem: "#566345",
  leaves: ["#254b36", "#365e3e", "#497044", "#69834d", "#83945b"],
  pebbles: ["#d9d3c3", "#bcb7a8", "#eee6d4", "#a8aaa0"],
};

interface PlantSpec { x: number; z: number; height: number; spread: number; leaves: number }

// Folhagens baixas na frente; grandes touceiras em leque preenchem o fundo.
export const GARDEN_PLANTS: readonly PlantSpec[] = [
  { x: 3.35, z: -0.67, height: 0.72, spread: 0.42, leaves: 24 },
  { x: 4.55, z: -0.60, height: 0.95, spread: 0.51, leaves: 28 },
  { x: 5.85, z: -0.65, height: 0.80, spread: 0.49, leaves: 25 },
  { x: 7.30, z: -0.55, height: 1.10, spread: 0.55, leaves: 28 },
  { x: 3.75, z: 0.80, height: 2.60, spread: 0.74, leaves: 30 },
  { x: 5.40, z: 1.20, height: 3.45, spread: 0.86, leaves: 38 },
  { x: 7.00, z: 1.65, height: 2.95, spread: 0.77, leaves: 34 },
  { x: 4.05, z: 3.00, height: 3.25, spread: 0.88, leaves: 38 },
  { x: 6.20, z: 3.50, height: 3.85, spread: 0.94, leaves: 42 },
  { x: 7.30, z: 4.80, height: 2.80, spread: 0.55, leaves: 28 },
  { x: 3.55, z: 5.25, height: 2.90, spread: 0.60, leaves: 32 },
  { x: 5.25, z: 5.65, height: 3.60, spread: 0.85, leaves: 38 },
  { x: 6.85, z: 5.95, height: 2.65, spread: 0.65, leaves: 30 },
  { x: 4.95, z: 2.65, height: 1.45, spread: 0.60, leaves: 28 },
  { x: 6.90, z: 3.15, height: 1.60, spread: 0.62, leaves: 28 },
  { x: 3.50, z: 4.25, height: 1.30, spread: 0.45, leaves: 24 },
  { x: 5.65, z: 4.90, height: 1.55, spread: 0.58, leaves: 28 },
];

/** Semente local fixa: nada de variação entre renderizações ou visitas. */
function seededRandom(seed: number) {
  let state = seed >>> 0;
  return () => {
    state = (Math.imul(state, 1664525) + 1013904223) >>> 0;
    return state / 4294967296;
  };
}

export function createInteriorGardenLayout() {
  const random = seededRandom(18831885);
  const leaves: GardenInstance[] = [];
  const stems: GardenStem[] = [];
  const stones: GardenInstance[] = [];
  for (const plant of GARDEN_PLANTS) {
    for (let i = 0; i < plant.leaves; i += 1) {
      const angle = i * 2.399963 + random() * 0.35;
      const radius = plant.spread * (0.24 + random() * 0.30);
      const length = plant.height * (0.26 + random() * 0.16);
      const y = GARDEN_SURFACE_Y + plant.height * (0.27 + random() * 0.34);
      const end: GardenPoint = [plant.x + Math.sin(angle) * radius, y, plant.z + Math.cos(angle) * radius];
      stems.push({ start: [plant.x, GARDEN_SURFACE_Y, plant.z], end, radius: plant.height > 2 ? 0.014 : 0.007 });
      leaves.push({
        position: end,
        rotation: [0.3 + random() * 0.50, angle, (random() - 0.5) * 0.18],
        scale: [plant.spread * 0.82, length, plant.spread * 0.8],
        color: GARDEN_COLORS.leaves[i % GARDEN_COLORS.leaves.length],
      });
    }
  }
  const { minX, maxX, minZ, maxZ } = INTERIOR_GARDEN_BOUNDS;
  for (let i = 0; i < 1600; i += 1) {
    const size = 0.022 + random() * 0.039;
    stones.push({
      position: [minX + 0.20 + random() * (maxX - minX - 0.40), GARDEN_SURFACE_Y + size * 0.2,
        minZ + 0.20 + random() * (maxZ - minZ - 0.40)],
      rotation: [0, random() * Math.PI, 0],
      scale: [size * 1.4, size * 0.65, size],
      color: GARDEN_COLORS.pebbles[i % GARDEN_COLORS.pebbles.length],
    });
  }
  return { leaves, stems, stones };
}

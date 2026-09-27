/**
 * Bancos e policial de cada sala. As caixas saem das mesmas posições do visual,
 * para o par não divergir (ADR 0002).
 */

export interface FurnitureBox {
  minX: number;
  maxX: number;
  minZ: number;
  maxZ: number;
}

export interface PlacedFurniture {
  position: [number, number, number];
  rotationY: number;
}

/** Comprimento ao longo de Z e profundidade ao longo de X, com o banco em π/2. */
const BENCH_HALF_LENGTH = 1.6;
const BENCH_HALF_DEPTH = 0.36;
const BENCH_X = 4.15;
const GUARD_RADIUS = 0.38;
const GUARD_X = -2.5;
const GUARD_Z_OFFSET = 1.4;

interface RoomSpan {
  startZ: number;
  centerZ: number;
}

export function roomBenchPlacements(room: RoomSpan): PlacedFurniture[] {
  return [
    { position: [-BENCH_X, 0, room.centerZ], rotationY: Math.PI / 2 },
    { position: [BENCH_X, 0, room.centerZ], rotationY: Math.PI / 2 },
  ];
}

/** Na entrada de cada porta, do lado esquerdo (fora do vão de passagem), olhando para o fundo (−Z). */
export function roomGuardPlacement(room: RoomSpan): PlacedFurniture {
  return {
    position: [GUARD_X, 0, room.startZ - GUARD_Z_OFFSET],
    rotationY: Math.PI,
  };
}

export function roomFurnitureCollisionBoxes(room: RoomSpan): FurnitureBox[] {
  const benches = roomBenchPlacements(room).map(({ position: [x, , z] }) => ({
    minX: x - BENCH_HALF_DEPTH,
    maxX: x + BENCH_HALF_DEPTH,
    minZ: z - BENCH_HALF_LENGTH,
    maxZ: z + BENCH_HALF_LENGTH,
  }));
  const [x, , z] = roomGuardPlacement(room).position;
  return [
    ...benches,
    {
      minX: x - GUARD_RADIUS,
      maxX: x + GUARD_RADIUS,
      minZ: z - GUARD_RADIUS,
      maxZ: z + GUARD_RADIUS,
    },
  ];
}

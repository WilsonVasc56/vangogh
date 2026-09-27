/**
 * Constantes de geometria da cena. Fonte de verdade documentada em
 * docs/scene-coordinates.md — se mudar um valor aqui, atualize o documento.
 */

import type { PeriodId } from "@/data/periods";

export const ENTRANCE_DOOR_Z = 14.8;
export const BUILDING_PORTAL_Z = 8.55;
export const FIRST_ROOM_Z = -1.5;
export const ROOM_HALF_WIDTH = 8.5;
export const ROOM_HEIGHT = 6.5;
export const DOOR_HALF_WIDTH = 1.65;
export const BACK_WALL_OUTER_MARGIN = ROOM_HALF_WIDTH * 0.12;
export const BACK_WALL_DOOR_MARGIN = ROOM_HALF_WIDTH * 0.09;
export const BACK_WALL_ARTWORK_PITCH = 2.4;
export const BACK_WALL_ARTWORK_OFFSET = 0.27;
/** Z da primeira tela lateral, medido a partir do início da sala. */
export const SIDE_ARTWORK_FIRST_OFFSET = 2.7;
/** Distância entre telas consecutivas numa parede lateral. */
export const SIDE_ARTWORK_PITCH = 2.25;
/** Folga mínima entre a última tela lateral e a parede de fundo (vaso de canto e tour). */
export const SIDE_ARTWORK_END_CLEARANCE = 2.0;

/**
 * Comprimento de cada sala ao longo de −Z. Fixo e independente do número de
 * obras: acrescentar telas não desloca portas, bancos nem colisões.
 */
export const ROOM_LENGTHS = {
  nuenen: 12,
  paris: 13.5,
  arles: 24.75,
  "saint-remy": 15.75,
  auvers: 18,
} satisfies Record<PeriodId, number>;

/** Raio de colisão do visitante. */
export const PLAYER_RADIUS = 0.42;

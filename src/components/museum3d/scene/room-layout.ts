/**
 * Regras puras de distribuição das obras nas paredes de uma sala. Sem imports
 * de runtime, para ser testável por `node --test` (rooms.test.mjs).
 *
 * Regra: a parede de fundo recebe as últimas obras (cronologicamente) que
 * couberem nela; as paredes laterais recebem as restantes, em ordem, até a
 * capacidade da sala. Nenhuma obra se repete.
 */

export interface RoomLayoutConstants {
  ROOM_HALF_WIDTH: number;
  DOOR_HALF_WIDTH: number;
  BACK_WALL_OUTER_MARGIN: number;
  BACK_WALL_DOOR_MARGIN: number;
  BACK_WALL_ARTWORK_PITCH: number;
  SIDE_ARTWORK_FIRST_OFFSET: number;
  SIDE_ARTWORK_PITCH: number;
  SIDE_ARTWORK_END_CLEARANCE: number;
}

export interface RoomArtworkDistribution<T> {
  side: T[];
  back: T[];
  /** Obras que não couberam em nenhuma parede. Deve ficar vazio. */
  omitted: T[];
}

interface WallSegment {
  startX: number;
  endX: number;
}

function distributeAlongSegment(segment: WallSegment, pitch: number) {
  const width = segment.endX - segment.startX;
  const count = Math.max(1, Math.floor(width / pitch));
  const spacing = width / count;
  return Array.from({ length: count }, (_, index) => segment.startX + spacing * (index + 0.5));
}

/** Posições X das telas na parede de fundo. A última sala não tem porta. */
export function backWallPositions(last: boolean, c: RoomLayoutConstants): number[] {
  const outerLeft = -c.ROOM_HALF_WIDTH + c.BACK_WALL_OUTER_MARGIN;
  const outerRight = c.ROOM_HALF_WIDTH - c.BACK_WALL_OUTER_MARGIN;
  const doorEdge = c.DOOR_HALF_WIDTH + c.BACK_WALL_DOOR_MARGIN;
  const segments: WallSegment[] = last
    ? [{ startX: outerLeft, endX: outerRight }]
    : [
        { startX: outerLeft, endX: -doorEdge },
        { startX: doorEdge, endX: outerRight },
      ];
  return segments.flatMap((segment) => distributeAlongSegment(segment, c.BACK_WALL_ARTWORK_PITCH));
}

/** Quantas telas cabem em cada parede lateral sem invadir a folga do fundo. */
export function sideRowsPerWall(length: number, c: RoomLayoutConstants): number {
  const usable = length - c.SIDE_ARTWORK_FIRST_OFFSET - c.SIDE_ARTWORK_END_CLEARANCE;
  // Tolerância para erro de ponto flutuante quando a divisão é exata.
  return Math.max(0, Math.floor(usable / c.SIDE_ARTWORK_PITCH + 1e-9) + 1);
}

/** Capacidade somando as duas paredes laterais. */
export function sideArtworkCapacity(length: number, c: RoomLayoutConstants): number {
  return sideRowsPerWall(length, c) * 2;
}

/** Z da tela lateral de índice `index` (pares à esquerda, ímpares à direita). */
export function sideArtworkZ(startZ: number, index: number, c: RoomLayoutConstants): number {
  const row = Math.floor(index / 2);
  return startZ - c.SIDE_ARTWORK_FIRST_OFFSET - row * c.SIDE_ARTWORK_PITCH;
}

export function distributeRoomArtworks<T>(
  items: readonly T[],
  backSlotCount: number,
  sideCapacity: number,
): RoomArtworkDistribution<T> {
  const backCount = Math.min(items.length, backSlotCount);
  const beforeBack = items.slice(0, items.length - backCount);
  return {
    back: items.slice(items.length - backCount),
    side: beforeBack.slice(0, sideCapacity),
    omitted: beforeBack.slice(sideCapacity),
  };
}

/**
 * Impede que o visitante atravesse uma barreira perpendicular ao eixo Z quando
 * a passagem não estiver liberada. Mantém o visitante fora da margem da barreira
 * de forma idempotente e contínua, mesmo que continue pressionando a tecla.
 */
export function resolveBarrierZ(
  previousZ: number,
  desiredZ: number,
  boundaryZ: number,
  margin: number,
): number {
  if (previousZ >= boundaryZ) {
    return Math.max(desiredZ, boundaryZ + margin);
  }
  return Math.min(desiredZ, boundaryZ - margin);
}


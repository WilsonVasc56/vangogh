import * as THREE from "three";
import {
  BUILDING_PORTAL_Z,
  CORRIDOR_HALF_WIDTH,
  DOOR_HALF_WIDTH,
  ENTRANCE_DOOR_Z,
  FIRST_ROOM_Z,
  PLAYER_RADIUS,
  ROOM_HALF_WIDTH,
} from "./constants";
import { resolveBarrierZ, resolveExteriorMovement, resolveRoomDecorMovement } from "./collisions";
import { internalDoorBoundaries, rooms } from "./rooms";

export interface PlanarPosition {
  x: number;
  z: number;
}

/**
 * Resolve um passo do visitante contra limites, paredes, portas e mobília.
 * A posição devolvida é sempre alcançável; a câmera deriva dela.
 */
export function resolvePlayerStep(
  previous: PlanarPosition,
  step: PlanarPosition,
  entranceOpen: boolean,
  internalDoorsOpen: readonly boolean[],
): PlanarPosition {
  const previousX = previous.x;
  const previousZ = previous.z;
  const outside = previousZ > ENTRANCE_DOOR_Z;
  let nextX = THREE.MathUtils.clamp(
    previousX + step.x,
    outside ? -18 : -ROOM_HALF_WIDTH + 0.75,
    outside ? 18 : ROOM_HALF_WIDTH - 0.75,
  );
  let nextZ = THREE.MathUtils.clamp(previousZ + step.z, rooms.at(-1)!.endZ + 0.75, 42);

  const exteriorResolved = resolveExteriorMovement(previousX, previousZ, nextX, nextZ);
  nextX = exteriorResolved.x;
  nextZ = exteriorResolved.z;

  const entrancePassable = entranceOpen && Math.abs(nextX) < DOOR_HALF_WIDTH - 0.15;
  if (!entrancePassable) {
    nextZ = resolveBarrierZ(previousZ, nextZ, ENTRANCE_DOOR_Z, 0.35);
  }

  // Parede do prédio: passagem apenas pelo portal que leva ao corredor.
  const portalPassable = Math.abs(nextX) < CORRIDOR_HALF_WIDTH - PLAYER_RADIUS;
  if (!portalPassable) {
    nextZ = resolveBarrierZ(previousZ, nextZ, BUILDING_PORTAL_Z, PLAYER_RADIUS);
  }

  // Parede frontal de Nuenen: passagem apenas pelo vão do corredor de transição.
  const corridorEntrancePassable = Math.abs(nextX) < CORRIDOR_HALF_WIDTH - PLAYER_RADIUS;
  if (!corridorEntrancePassable) {
    nextZ = resolveBarrierZ(previousZ, nextZ, FIRST_ROOM_Z, PLAYER_RADIUS);
  }

  // Dentro do corredor, as paredes laterais mantêm o visitante no eixo central.
  if (nextZ < BUILDING_PORTAL_Z && nextZ > FIRST_ROOM_Z) {
    nextX = THREE.MathUtils.clamp(nextX, -CORRIDOR_HALF_WIDTH + PLAYER_RADIUS, CORRIDOR_HALF_WIDTH - PLAYER_RADIUS);
  }

  internalDoorBoundaries.forEach((boundary, index) => {
    const passable = internalDoorsOpen[index] && Math.abs(nextX) < DOOR_HALF_WIDTH - 0.15;
    if (!passable) {
      nextZ = resolveBarrierZ(previousZ, nextZ, boundary, 0.28);
    }
  });

  if (nextZ < FIRST_ROOM_Z) {
    const furnitureResolved = resolveRoomDecorMovement(previousX, previousZ, nextX, nextZ);
    nextX = furnitureResolved.x;
    nextZ = furnitureResolved.z;
  }

  return { x: nextX, z: nextZ };
}

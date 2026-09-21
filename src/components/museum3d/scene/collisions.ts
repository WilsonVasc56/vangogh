"use client";

import * as THREE from "three";
import { EXTERIOR_GARDEN_BOUNDS, EXTERIOR_TREE_TRUNKS } from "../exterior-landscape";
import { EXTERIOR_GLASS_SEGMENTS } from "../museum-exterior";
import { CAFE_COLLISION_BOXES } from "../museum-cafe";
import { FIRST_ROOM_Z, PLAYER_RADIUS } from "./constants";
import { rooms } from "./rooms";

/**
 * Colisões da cena: cada componente é dono dos seus volumes (ADR 0002) e este
 * módulo apenas agrega e resolve o movimento do visitante.
 */

interface CollisionBox {
  minX: number;
  maxX: number;
  minZ: number;
  maxZ: number;
}

interface CollisionEllipse {
  x: number;
  z: number;
  radiusX: number;
  radiusZ: number;
}

interface CollisionSegment {
  ax: number;
  az: number;
  bx: number;
  bz: number;
}

const exteriorBoxes: CollisionBox[] = [
  { minX: 8.2, maxX: 20, minZ: -0.9, maxZ: 8.9 },
  { minX: 7.5, maxX: 10.7, minZ: 7.55, maxZ: 7.8 },
  { minX: -2.4, maxX: -2.24, minZ: 12.32, maxZ: 14.12 },
  { minX: 2.24, maxX: 2.4, minZ: 12.32, maxZ: 14.12 },
  ...EXTERIOR_GARDEN_BOUNDS,
  { minX: -12.9, maxX: -10.1, minZ: 18.5, maxZ: 19.3 },
  { minX: 12.4, maxX: 15.2, minZ: 18.5, maxZ: 19.3 },
  { minX: -13.5, maxX: -11.5, minZ: 23.5, maxZ: 29.3 },
  { minX: -14.08, maxX: -13.92, minZ: 20.42, maxZ: 20.58 },
  { minX: 17.72, maxX: 17.88, minZ: 20.42, maxZ: 20.58 },
  // Café do átrio: balcão, mesas, vasos e clientes
  ...CAFE_COLLISION_BOXES,
];

const exteriorEllipses: CollisionEllipse[] = [
  { x: -8.8, z: 5.5, radiusX: 6.5, radiusZ: 5.8 },
  ...EXTERIOR_TREE_TRUNKS.map(({ x, z, radius }) => ({
    x,
    z,
    radiusX: radius,
    radiusZ: radius,
  })),
];

const glassWallSegments: CollisionSegment[] = [
  ...EXTERIOR_GLASS_SEGMENTS,
  // Fitas da fila: colidir com cada vão impede atravessá-las lateralmente.
  ...[2.1, 4.15].flatMap((x) => [
    { ax: x, az: 17.4, bx: x, bz: 20.6 },
  ]),
];

const roomDecorBoxes: CollisionBox[] = rooms.flatMap((room) => [
  // Vasos sobre pedestais
  { minX: -7.2, maxX: -6.1, minZ: room.startZ - 1.7, maxZ: room.startZ - 0.6 },
  { minX: 6.1, maxX: 7.2, minZ: room.endZ + 0.7, maxZ: room.endZ + 1.8 },
  // Banco central rotacionado em 90 graus
  { minX: -0.52, maxX: 0.52, minZ: room.centerZ - 1.85, maxZ: room.centerZ + 1.85 },
]);

function circleHitsBox(x: number, z: number, box: CollisionBox) {
  const closestX = THREE.MathUtils.clamp(x, box.minX, box.maxX);
  const closestZ = THREE.MathUtils.clamp(z, box.minZ, box.maxZ);
  const dx = x - closestX;
  const dz = z - closestZ;
  return dx * dx + dz * dz < PLAYER_RADIUS * PLAYER_RADIUS;
}

function circleHitsEllipse(x: number, z: number, ellipse: CollisionEllipse) {
  const nx = (x - ellipse.x) / (ellipse.radiusX + PLAYER_RADIUS);
  const nz = (z - ellipse.z) / (ellipse.radiusZ + PLAYER_RADIUS);
  return nx * nx + nz * nz < 1;
}

function circleHitsSegment(x: number, z: number, segment: CollisionSegment) {
  const abX = segment.bx - segment.ax;
  const abZ = segment.bz - segment.az;
  const lengthSquared = abX * abX + abZ * abZ;
  const projection = THREE.MathUtils.clamp(
    ((x - segment.ax) * abX + (z - segment.az) * abZ) / lengthSquared,
    0,
    1,
  );
  const closestX = segment.ax + abX * projection;
  const closestZ = segment.az + abZ * projection;
  const dx = x - closestX;
  const dz = z - closestZ;
  return dx * dx + dz * dz < PLAYER_RADIUS * PLAYER_RADIUS;
}

function collidesWithExterior(x: number, z: number) {
  // O exterior só interfere antes da primeira sala; dentro dela vale a planta interna.
  if (z < FIRST_ROOM_Z - 0.25) return false;
  return (
    exteriorBoxes.some((box) => circleHitsBox(x, z, box)) ||
    exteriorEllipses.some((ellipse) => circleHitsEllipse(x, z, ellipse)) ||
    glassWallSegments.some((segment) => circleHitsSegment(x, z, segment))
  );
}

function collidesWithRoomDecor(x: number, z: number) {
  return roomDecorBoxes.some((box) => circleHitsBox(x, z, box));
}

export function resolveExteriorMovement(
  previousX: number,
  previousZ: number,
  desiredX: number,
  desiredZ: number,
) {
  let x = desiredX;
  let z = previousZ;
  if (collidesWithExterior(x, z)) x = previousX;
  z = desiredZ;
  if (collidesWithExterior(x, z)) z = previousZ;
  return { x, z };
}

export function resolveRoomDecorMovement(
  previousX: number,
  previousZ: number,
  desiredX: number,
  desiredZ: number,
) {
  let x = desiredX;
  let z = previousZ;
  if (collidesWithRoomDecor(x, z)) x = previousX;
  z = desiredZ;
  if (collidesWithRoomDecor(x, z)) z = previousZ;
  return { x, z };
}

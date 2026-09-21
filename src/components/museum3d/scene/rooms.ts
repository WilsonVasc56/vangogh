"use client";

import { artworks, type Artwork } from "@/data/artworks";
import { periods, type PeriodId } from "@/data/periods";
import { MUSEUM_WALL_COLOR } from "../interior-materials";
import type { ArtworkSlot } from "../gallery-artwork";
import {
  BACK_WALL_ARTWORK_OFFSET,
  BACK_WALL_ARTWORK_PITCH,
  BACK_WALL_DOOR_MARGIN,
  BACK_WALL_OUTER_MARGIN,
  DOOR_HALF_WIDTH,
  FIRST_ROOM_Z,
  ROOM_HALF_WIDTH,
} from "./constants";

/**
 * Salas, estilos e distribuição das obras nas paredes. Extraído de
 * museum-scene.tsx para reduzir o tamanho daquele arquivo.
 */

export interface RoomConfig {
  id: PeriodId;
  name: string;
  years: string;
  startZ: number;
  endZ: number;
  centerZ: number;
  length: number;
  wallColor: string;
  floorColor: string;
  accent: string;
  items: Artwork[];
}

const roomStyles = [
  { wallColor: MUSEUM_WALL_COLOR, floorColor: "#cca97c", accent: "#b39772" },
  { wallColor: MUSEUM_WALL_COLOR, floorColor: "#cca97c", accent: "#78a3b8" },
  { wallColor: MUSEUM_WALL_COLOR, floorColor: "#cca97c", accent: "#e3a83f" },
  { wallColor: MUSEUM_WALL_COLOR, floorColor: "#cca97c", accent: "#6d98ab" },
  { wallColor: MUSEUM_WALL_COLOR, floorColor: "#cca97c", accent: "#94a75d" },
];

const roomOrder: PeriodId[] = ["nuenen", "paris", "arles", "saint-remy", "auvers"];

function createRooms(): RoomConfig[] {
  let cursor = FIRST_ROOM_Z;
  return roomOrder.map((id, index) => {
    const period = periods.find((item) => item.id === id)!;
    const items = artworks
      .filter((artwork) => artwork.periodo === id)
      .sort((a, b) => a.ano - b.ano);
    const rows = Math.ceil(items.length / 2);
    const length = Math.max(12, rows * 2.25 + 4.5);
    const startZ = cursor;
    const endZ = startZ - length;
    cursor = endZ;
    return {
      id,
      name: period.nome,
      years: period.anos,
      startZ,
      endZ,
      centerZ: (startZ + endZ) / 2,
      length,
      items,
      ...roomStyles[index],
    };
  });
}

export const rooms = createRooms();
export const internalDoorBoundaries = rooms.slice(0, -1).map((room) => room.endZ);

interface WallSegment {
  startX: number;
  endX: number;
}

function distributeArtworkPositions(segment: WallSegment) {
  const width = segment.endX - segment.startX;
  const count = Math.max(1, Math.floor(width / BACK_WALL_ARTWORK_PITCH));
  const spacing = width / count;
  return Array.from(
    { length: count },
    (_, index) => segment.startX + spacing * (index + 0.5),
  );
}

function createBackWallPositions(last: boolean) {
  const outerLeft = -ROOM_HALF_WIDTH + BACK_WALL_OUTER_MARGIN;
  const outerRight = ROOM_HALF_WIDTH - BACK_WALL_OUTER_MARGIN;
  const segments: WallSegment[] = last
    ? [{ startX: outerLeft, endX: outerRight }]
    : [
        {
          startX: outerLeft,
          endX: -DOOR_HALF_WIDTH - BACK_WALL_DOOR_MARGIN,
        },
        {
          startX: DOOR_HALF_WIDTH + BACK_WALL_DOOR_MARGIN,
          endX: outerRight,
        },
      ];

  return segments.flatMap(distributeArtworkPositions);
}

function getSideArtworkCount(room: RoomConfig) {
  const last = room.id === roomOrder.at(-1);
  return Math.max(0, room.items.length - createBackWallPositions(last).length);
}

function createArtworkSlots(): ArtworkSlot[] {
  return rooms.flatMap((room) => {
    const last = room.id === roomOrder.at(-1);
    const backWallPositions = createBackWallPositions(last);
    const sideArtworkCount = getSideArtworkCount(room);
    const sideSlots = room.items.slice(0, sideArtworkCount).map((artwork, index) => {
      const leftWall = index % 2 === 0;
      const row = Math.floor(index / 2);
      return {
        artwork,
        // Origem no piso; o componente pendura a tela na linha de olhar (1,55 m).
        position: [
          leftWall ? -ROOM_HALF_WIDTH + 0.28 : ROOM_HALF_WIDTH - 0.28,
          0,
          room.startZ - 2.7 - row * 2.25,
        ],
        rotation: [0, leftWall ? Math.PI / 2 : -Math.PI / 2, 0],
      } as ArtworkSlot;
    });
    const backSlots = room.items.slice(sideArtworkCount).map((artwork, index) => ({
      artwork,
      position: [
        backWallPositions[index],
        0,
        room.endZ + BACK_WALL_ARTWORK_OFFSET,
      ],
      rotation: [0, 0, 0],
    }) satisfies ArtworkSlot);

    return [...sideSlots, ...backSlots];
  });
}

export const artworkSlots = createArtworkSlots();

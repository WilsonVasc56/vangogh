"use client";

import { artworks, type Artwork } from "@/data/artworks";
import { periods, type PeriodId } from "@/data/periods";
import { MUSEUM_WALL_COLOR } from "../interior-materials";
import type { ArtworkSlot } from "../gallery-artwork";
import * as layoutConstants from "./constants";
import {
  backWallPositions,
  distributeRoomArtworks,
  sideArtworkCapacity,
  sideArtworkZ,
} from "./room-layout";

const {
  BACK_WALL_ARTWORK_OFFSET,
  FIRST_ROOM_Z,
  ROOM_HALF_WIDTH,
  ROOM_LENGTHS,
} = layoutConstants;

/**
 * Salas, estilos e distribuição das obras nas paredes. Extraído de
 * museum-scene.tsx para reduzir o tamanho daquele arquivo. As regras puras de
 * distribuição ficam em room-layout.ts.
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
  /** Telas nas paredes laterais (pares à esquerda, ímpares à direita). */
  sideItems: Artwork[];
  /** Telas na parede de fundo, da esquerda para a direita. */
  backItems: Artwork[];
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
    const length = ROOM_LENGTHS[id];
    const last = index === roomOrder.length - 1;
    const { side, back, omitted } = distributeRoomArtworks(
      items,
      backWallPositions(last, layoutConstants).length,
      sideArtworkCapacity(length, layoutConstants),
    );
    if (omitted.length > 0 && process.env.NODE_ENV !== "production") {
      console.warn(
        `[museu] Sala ${id}: ${omitted.length} obra(s) sem parede: ${omitted.map((a) => a.slug).join(", ")}`,
      );
    }
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
      sideItems: side,
      backItems: back,
      ...roomStyles[index],
    };
  });
}

export const rooms = createRooms();
export const internalDoorBoundaries = rooms.slice(0, -1).map((room) => room.endZ);

function createArtworkSlots(): ArtworkSlot[] {
  return rooms.flatMap((room, roomIndex) => {
    const last = roomIndex === rooms.length - 1;
    const backX = backWallPositions(last, layoutConstants);
    const sideSlots = room.sideItems.map((artwork, index): ArtworkSlot => {
      const leftWall = index % 2 === 0;
      return {
        artwork,
        // Origem no piso; o componente pendura a tela na linha de olhar (1,55 m).
        position: [
          leftWall ? -ROOM_HALF_WIDTH + 0.28 : ROOM_HALF_WIDTH - 0.28,
          0,
          sideArtworkZ(room.startZ, index, layoutConstants),
        ],
        rotation: [0, leftWall ? Math.PI / 2 : -Math.PI / 2, 0],
      };
    });
    const backSlots = room.backItems.map((artwork, index): ArtworkSlot => ({
      artwork,
      position: [backX[index], 0, room.endZ + BACK_WALL_ARTWORK_OFFSET],
      rotation: [0, 0, 0],
    }));

    return [...sideSlots, ...backSlots];
  });
}

export const artworkSlots = createArtworkSlots();

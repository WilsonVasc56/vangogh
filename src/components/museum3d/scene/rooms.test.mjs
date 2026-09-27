import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";
import * as constants from "./constants.ts";
import {
  backWallPositions,
  distributeRoomArtworks,
  resolveBarrierZ,
  sideArtworkCapacity,
  sideArtworkZ,
  sideRowsPerWall,
} from "./room-layout.ts";

// artworks.ts importa JSON e alias "@/", que o node --test não resolve; lemos
// os blocos de dados como texto, na mesma ordem de declaração.
const artworksSource = readFileSync(new URL("../../../data/artworks.ts", import.meta.url), "utf8");
const images = JSON.parse(readFileSync(new URL("../../../data/images.json", import.meta.url), "utf8"));
const artworks = artworksSource
  .split(/(?=\bslug:\s*")/)
  .slice(1)
  .map((block) => ({
    slug: block.match(/slug:\s*"([^"]+)"/)[1],
    ano: Number(block.match(/ano:\s*(\d+)/)[1]),
    periodo: block.match(/periodo:\s*"([^"]+)"/)[1],
  }))
  .sort((a, b) => a.ano - b.ano);

const roomOrder = ["nuenen", "paris", "arles", "saint-remy", "auvers"];

function layoutRooms() {
  let cursor = constants.FIRST_ROOM_Z;
  return roomOrder.map((id, index) => {
    const length = constants.ROOM_LENGTHS[id];
    const last = index === roomOrder.length - 1;
    const items = artworks.filter((a) => a.periodo === id).sort((a, b) => a.ano - b.ano);
    const backSlots = backWallPositions(last, constants).length;
    const capacity = sideArtworkCapacity(length, constants);
    const startZ = cursor;
    cursor -= length;
    return {
      id,
      startZ,
      endZ: cursor,
      length,
      backSlots,
      capacity,
      ...distributeRoomArtworks(items, backSlots, capacity),
    };
  });
}

test("os comprimentos das salas não mudaram (portas, bancos e colisões dependem deles)", () => {
  assert.deepEqual(constants.ROOM_LENGTHS, {
    nuenen: 12,
    paris: 13.5,
    arles: 24.75,
    "saint-remy": 15.75,
    auvers: 18,
  });
});

test("capacidade lateral respeita a folga do fundo", () => {
  const expectedRows = { nuenen: 4, paris: 4, arles: 9, "saint-remy": 5, auvers: 6 };
  for (const room of layoutRooms()) {
    assert.equal(sideRowsPerWall(room.length, constants), expectedRows[room.id], room.id);
    const lastZ = sideArtworkZ(room.startZ, room.capacity - 1, constants);
    const gap = lastZ - room.endZ;
    assert.ok(gap >= constants.SIDE_ARTWORK_END_CLEARANCE - 1e-9, `${room.id}: folga ${gap}`);
    assert.ok(
      gap < constants.SIDE_ARTWORK_END_CLEARANCE + constants.SIDE_ARTWORK_PITCH,
      `${room.id}: parede lateral termina ${gap} m antes do fundo`,
    );
  }
});

test("paredes laterais e de fundo ficam cheias, sem sobras", () => {
  for (const room of layoutRooms()) {
    assert.equal(room.side.length, room.capacity, `${room.id}: laterais incompletas`);
    assert.equal(room.back.length, room.backSlots, `${room.id}: fundo incompleto`);
    assert.equal(room.omitted.length, 0, `${room.id}: obras sem parede`);
  }
});

test("nenhuma obra se repete e cada uma fica na sala da sua época", () => {
  const seen = new Set();
  for (const room of layoutRooms()) {
    for (const artwork of [...room.side, ...room.back]) {
      assert.equal(artwork.periodo, room.id, artwork.slug);
      assert.ok(!seen.has(artwork.slug), `obra repetida: ${artwork.slug}`);
      seen.add(artwork.slug);
    }
  }
  assert.equal(new Set(artworks.map((a) => a.slug)).size, artworks.length, "slug duplicado nos dados");
});

test("toda obra tem imagem local, sem placeholder", () => {
  for (const artwork of artworks) {
    const src = images[artwork.slug];
    assert.ok(src, `sem imagem: ${artwork.slug}`);
    assert.ok(!src.includes("placeholder"), `placeholder: ${artwork.slug}`);
  }
});

test("distribuição omite o excedente em vez de reciclar obras", () => {
  const { side, back, omitted } = distributeRoomArtworks([1, 2, 3, 4, 5, 6, 7], 2, 3);
  assert.deepEqual(back, [6, 7]);
  assert.deepEqual(side, [1, 2, 3]);
  assert.deepEqual(omitted, [4, 5]);
});

test("resolveBarrierZ bloqueia travessia vindo de +Z e mantém bloqueio de forma idempotente", () => {
  // Aproximação inicial para boundary 14.8 com margin 0.35 -> parada em 15.15
  assert.equal(resolveBarrierZ(15.2, 15.0, 14.8, 0.35), 15.15);
  // Próximo quadro: jogador continua pressionando para frente a partir de 15.15
  assert.equal(resolveBarrierZ(15.15, 15.05, 14.8, 0.35), 15.15);
  // Próximo quadro: continua pressionando
  assert.equal(resolveBarrierZ(15.15, 14.9, 14.8, 0.35), 15.15);
  // Jogador recua livremente
  assert.equal(resolveBarrierZ(15.15, 15.25, 14.8, 0.35), 15.25);
});

test("resolveBarrierZ bloqueia travessia vindo de -Z e mantém bloqueio de forma idempotente", () => {
  // Aproximação inicial para boundary -13.5 com margin 0.28 -> parada em -13.78
  assert.equal(resolveBarrierZ(-14.0, -13.3, -13.5, 0.28), -13.78);
  // Próximo quadro continuando a empurrar
  assert.equal(resolveBarrierZ(-13.78, -13.2, -13.5, 0.28), -13.78);
  // Recuo livre
  assert.equal(resolveBarrierZ(-13.78, -14.1, -13.5, 0.28), -14.1);
});


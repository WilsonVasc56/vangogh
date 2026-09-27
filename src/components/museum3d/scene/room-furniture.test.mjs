import assert from "node:assert/strict";
import test from "node:test";
import {
  roomBenchPlacements,
  roomFurnitureCollisionBoxes,
  roomGuardPlacement,
} from "./room-furniture.ts";

const DOOR_HALF = 1.65;
const rooms = [
  { startZ: -1.5, endZ: -13.5, centerZ: -7.5 },
  { startZ: -40, endZ: -68, centerZ: -54 },
];

test("cada sala tem dois bancos laterais e um policial na entrada", () => {
  for (const room of rooms) {
    const benches = roomBenchPlacements(room);
    assert.equal(benches.length, 2);
    assert.ok(benches[0].position[0] < -2.3);
    assert.ok(benches[1].position[0] > 2.3);
    assert.equal(benches[0].position[2], room.centerZ);
    assert.equal(benches[1].position[2], room.centerZ);

    const guard = roomGuardPlacement(room);
    assert.ok(guard.position[0] < -DOOR_HALF);
    assert.ok(guard.position[2] < room.startZ);
    assert.ok(guard.position[2] > room.endZ);
    assert.equal(guard.rotationY, Math.PI);
  }
});

test("colisões coincidem com o visual e deixam o vão da porta livre", () => {
  for (const room of rooms) {
    const boxes = roomFurnitureCollisionBoxes(room);
    assert.equal(boxes.length, 3);
    const benches = roomBenchPlacements(room);
    benches.forEach((bench, index) => {
      const [x, , z] = bench.position;
      assert.equal(boxes[index].minX, x - 0.36);
      assert.equal(boxes[index].maxX, x + 0.36);
      assert.equal(boxes[index].minZ, z - 1.6);
      assert.equal(boxes[index].maxZ, z + 1.6);
    });
    for (const box of boxes) {
      const crossesDoor = box.minX < DOOR_HALF && box.maxX > -DOOR_HALF;
      const atEntrance = box.maxZ > room.startZ - 0.6;
      assert.equal(crossesDoor && atEntrance, false);
      assert.ok(box.maxZ < room.startZ);
      assert.ok(box.minZ > room.endZ + 0.8);
    }
  }
});

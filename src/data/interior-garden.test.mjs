import assert from "node:assert/strict";
import test from "node:test";
import { Euler, Matrix4, Quaternion, Vector3 } from "three";
import { createInteriorGardenLayout, INTERIOR_GARDEN_BOUNDS, GARDEN_SURFACE_Y } from "./interior-garden.ts";

test("jardim ocupa somente o recuo leste e preserva corredor, sala e café", () => {
  const b = INTERIOR_GARDEN_BOUNDS;
  assert.ok(b.minX > 2.6 && b.maxX < 8.2);
  assert.ok(b.minZ > -1.5 && b.maxZ < 7.4);
  // A borda é alcançada pelo raio de colisão antes do visitante sair da sala.
  assert.ok(b.minZ - 0.42 < -1.75);
});

test("folhagens e pedriscos são idênticos em cada geração", () => {
  const first = createInteriorGardenLayout();
  assert.deepEqual(first, createInteriorGardenLayout());
  assert.ok(first.leaves.length > 350 && first.leaves.length < 600);
  assert.equal(first.stems.length, first.leaves.length);
  assert.equal(first.stones.length, 1600);
});

test("todas as folhas ficam dentro do recuo, incluindo pontas e curvatura", () => {
  const b = INTERIOR_GARDEN_BOUNDS;
  for (const leaf of createInteriorGardenLayout().leaves) {
    const matrix = new Matrix4().compose(new Vector3(...leaf.position),
      new Quaternion().setFromEuler(new Euler(...leaf.rotation)), new Vector3(...leaf.scale));
    for (let row = 0; row <= 12; row += 1) {
      const t = row / 12;
      for (const side of [-1, 0, 1]) {
        const point = new Vector3(side * Math.sin(Math.PI * t) * 0.48, t,
          t * t * 0.28 + (side === 0 ? Math.sin(Math.PI * t) * 0.085 : 0)).applyMatrix4(matrix);
        assert.ok(point.x > b.minX && point.x < b.maxX, `folha fora em x=${point.x}`);
        assert.ok(point.z > b.minZ && point.z < b.maxZ, `folha fora em z=${point.z}`);
        assert.ok(point.y >= GARDEN_SURFACE_Y && point.y < 4.6);
      }
    }
  }
});

test("pedriscos e hastes permanecem no canteiro", () => {
  const b = INTERIOR_GARDEN_BOUNDS;
  const { stones, stems } = createInteriorGardenLayout();
  for (const stone of stones) {
    const radius = Math.max(...stone.scale);
    const [x, , z] = stone.position;
    assert.ok(x - radius > b.minX && x + radius < b.maxX);
    assert.ok(z - radius > b.minZ && z + radius < b.maxZ);
  }
  for (const stem of stems) {
    for (const [x, y, z] of [stem.start, stem.end]) {
      assert.ok(x - stem.radius > b.minX && x + stem.radius < b.maxX);
      assert.ok(z - stem.radius > b.minZ && z + stem.radius < b.maxZ);
      assert.ok(y >= GARDEN_SURFACE_Y);
    }
  }
});

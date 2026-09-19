import assert from "node:assert/strict";
import test from "node:test";
import { MUSEUM_WALL_COLOR, MUSEUM_CEILING_COLOR, MUSEUM_BASEBOARD_COLOR } from "./interior-materials.ts";

test("interior museum constants are defined and have valid hex formats", () => {
  assert.match(MUSEUM_WALL_COLOR, /^#[0-9a-fA-F]{6}$/);
  assert.match(MUSEUM_CEILING_COLOR, /^#[0-9a-fA-F]{6}$/);
  assert.match(MUSEUM_BASEBOARD_COLOR, /^#[0-9a-fA-F]{6}$/);
});

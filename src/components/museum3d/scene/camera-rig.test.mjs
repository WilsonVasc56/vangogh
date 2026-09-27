import assert from "node:assert/strict";
import test from "node:test";
import {
  FIRST_PERSON_EYE_HEIGHT,
  THIRD_PERSON_RIG,
  buildArchitectureObstacles,
  computeCameraRig,
  isCameraPointBlocked,
  placeCamera,
  smoothBackDistance,
} from "./camera-rig.ts";

const layout = {
  roomHalfWidth: 8.5,
  roomHeight: 6.5,
  sideWallThickness: 0.3,
  partitionThickness: 0.28,
  doorHalfWidth: 1.65,
  internalDoorwayHeight: 4,
  firstRoomZ: -1.5,
  galleryEndZ: -40,
  corridorHalfWidth: 2.3,
  corridorWallThickness: 0.3,
  corridorHeight: 4.6,
  buildingPortalZ: 8.55,
  atriumBackZ: 7.4,
  eastWingMinX: 8.2,
  entranceDoorZ: 14.8,
  doorPanelWidth: 1.8,
  doorPanelHeight: 3.8,
  doorPanelDepth: 0.13,
};
const DOOR_Z = -13.5;
const open = { boxes: [], ellipses: [], segments: [] };
const architecture = (doorOpen, entranceOpen = false) => ({
  boxes: buildArchitectureObstacles(layout, [DOOR_Z], [doorOpen], entranceOpen),
  ellipses: [],
  segments: [],
});

function horizontalDistance(a, b) {
  return Math.hypot(a.x - b.x, a.z - b.z);
}

test("1ª pessoa: câmera no olho do visitante", () => {
  const rig = computeCameraRig({ x: 1, z: 5 }, 0.4, 0.2, 0, open);
  const camera = placeCamera(rig, 10);
  assert.deepEqual(camera, { x: 1, y: FIRST_PERSON_EYE_HEIGHT, z: 5 });
});

test("3ª pessoa em espaço aberto: recuo completo, sobre o ombro direito", () => {
  const rig = computeCameraRig({ x: 0, z: 20 }, 0, 0, 1, open);
  assert.ok(Math.abs(rig.maxBack - THIRD_PERSON_RIG.distance) < 1e-9);
  const camera = placeCamera(rig, rig.maxBack);
  // Olhando para −Z: atrás é +Z e a direita é +X.
  assert.ok(camera.z > 20 + 2);
  assert.ok(Math.abs(camera.x - THIRD_PERSON_RIG.shoulder) < 1e-9);
  assert.ok(camera.y > THIRD_PERSON_RIG.pivotHeight);
});

test("parede atrás do visitante encurta o recuo sem atravessá-la", () => {
  // Visitante numa galeria, de costas para a parede lateral leste (x = 8.35).
  const obstacles = architecture(true);
  const rig = computeCameraRig({ x: 7.2, z: -7 }, Math.PI / 2, 0, 1, obstacles);
  assert.ok(rig.maxBack < THIRD_PERSON_RIG.distance);
  const camera = placeCamera(rig, THIRD_PERSON_RIG.distance);
  assert.ok(camera.x < 8.35 - THIRD_PERSON_RIG.clearance + 1e-9);
  assert.equal(isCameraPointBlocked(camera, obstacles), false);
});

test("porta interna fechada bloqueia a câmera; aberta libera o vão", () => {
  // Visitante logo depois da porta, olhando para o fundo (−Z): a câmera recua pelo vão.
  const player = { x: -THIRD_PERSON_RIG.shoulder, z: DOOR_Z - 0.6 };
  const closed = computeCameraRig(player, 0, 0, 1, architecture(false));
  const opened = computeCameraRig(player, 0, 0, 1, architecture(true));
  assert.ok(placeCamera(closed, closed.maxBack).z < DOOR_Z - 0.14);
  assert.ok(Math.abs(opened.maxBack - THIRD_PERSON_RIG.distance) < 1e-9);
});

test("pivô na posição mais próxima permitida de porta fechada não nasce bloqueado", () => {
  const obstacles = architecture(false);
  for (const z of [DOOR_Z + 0.28, DOOR_Z - 0.28]) {
    const pivot = { x: 0, y: THIRD_PERSON_RIG.pivotHeight, z };
    assert.equal(isCameraPointBlocked(pivot, obstacles), false);
  }
});

test("olhando para cima, a câmera não atravessa o piso", () => {
  const rig = computeCameraRig({ x: 0, z: 20 }, 0, 1.2, 1, open);
  const camera = placeCamera(rig, rig.maxBack);
  assert.ok(camera.y >= THIRD_PERSON_RIG.floorClearance);
});

test("no corredor, a câmera fica entre as paredes e abaixo do teto", () => {
  const obstacles = architecture(true);
  const rig = computeCameraRig({ x: 1.8, z: 3 }, -Math.PI / 2, -1.2, 1, obstacles);
  const camera = placeCamera(rig, rig.maxBack);
  assert.ok(Math.abs(camera.x) < 2.3);
  assert.ok(camera.y < 4.5);
  assert.ok(horizontalDistance(camera, rig.pivot) <= THIRD_PERSON_RIG.distance + THIRD_PERSON_RIG.shoulder);
});

test("porta de entrada fechada bloqueia; aberta libera", () => {
  const player = { x: -THIRD_PERSON_RIG.shoulder, z: 14.8 - 0.4 };
  // Olhando para dentro (−Z): o recuo cruza a porta rumo à praça.
  const closed = computeCameraRig(player, 0, 0, 1, architecture(true, false));
  const opened = computeCameraRig(player, 0, 0, 1, architecture(true, true));
  assert.ok(closed.maxBack < 0.4);
  assert.ok(Math.abs(opened.maxBack - THIRD_PERSON_RIG.distance) < 1e-9);
});

test("recuo aproxima imediatamente e se afasta de forma gradual", () => {
  assert.equal(smoothBackDistance(2, 0.5, 0.016), 0.5);
  const next = smoothBackDistance(0.5, 2, 0.016);
  assert.ok(next > 0.5 && next < 2);
});

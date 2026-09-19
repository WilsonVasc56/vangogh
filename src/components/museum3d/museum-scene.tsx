"use client";

import { Environment, Lightformer, Sky, useGLTF } from "@react-three/drei";
import { clone as cloneSkeleton } from "three/examples/jsm/utils/SkeletonUtils.js";
import { useFrame, useThree } from "@react-three/fiber";
import {
  Suspense,
  useEffect,
  useMemo,
  useRef,
  useState,
  type MutableRefObject,
} from "react";
import * as THREE from "three";
import { artworks, type Artwork } from "@/data/artworks";
import { periods, type PeriodId } from "@/data/periods";
import { GalleryArtwork, type ArtworkSlot } from "./gallery-artwork";
import { EXTERIOR_GLASS_SEGMENTS, ExteriorDaylight, MuseumExterior } from "./museum-exterior";
import {
  EXTERIOR_GARDEN_BOUNDS,
  EXTERIOR_TREE_TRUNKS,
  ExteriorLandscape,
} from "./exterior-landscape";
import { ExteriorVisitors } from "./exterior-visitors";
import {
  MUSEUM_WALL_COLOR,
  MUSEUM_CEILING_COLOR,
  MUSEUM_BASEBOARD_COLOR,
  useChevronParquet,
} from "./interior-materials";
import { MuseumArtPiece, type VaseVariant } from "./museum-vases";
import { CorridorMurals } from "./corridor-murals";

interface MuseumSceneProps {
  active: boolean;
  isMobile: boolean;
  mobileInput: MutableRefObject<MobileInput>;
  interactionToken: number;
  onArtworkSelect: (artwork: Artwork) => void;
  onPointerLockChange: (locked: boolean) => void;
  onRoomChange: (period: PeriodId | null) => void;
}

export interface MobileInput {
  forward: number;
  strafe: number;
  lookX: number;
  lookY: number;
}

// Ferramenta de QA: abrir /museu#debug-walk permite caminhar sem pointer lock
// (útil em ambientes headless/automação, onde o navegador bloqueia o lock).
const debugFreeRoam =
  typeof window !== "undefined" && window.location.hash === "#debug-walk";

interface RoomConfig {
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

const ENTRANCE_DOOR_Z = 14.8;
const BUILDING_PORTAL_Z = 8.55;
const FIRST_ROOM_Z = -1.5;
const ROOM_HALF_WIDTH = 8.5;
const ROOM_HEIGHT = 6.5;
const DOOR_HALF_WIDTH = 1.65;
const BACK_WALL_OUTER_MARGIN = ROOM_HALF_WIDTH * 0.12;
const BACK_WALL_DOOR_MARGIN = ROOM_HALF_WIDTH * 0.09;
const BACK_WALL_ARTWORK_PITCH = 2.4;
const BACK_WALL_ARTWORK_OFFSET = 0.27;

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

const rooms = createRooms();
const internalDoorBoundaries = rooms.slice(0, -1).map((room) => room.endZ);

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

const artworkSlots = createArtworkSlots();

const PLAYER_RADIUS = 0.42;

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

function resolveExteriorMovement(
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

function resolveRoomDecorMovement(
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

function GalleryControls({
  active,
  isMobile,
  mobileInput,
  interactionToken,
  entranceOpen,
  internalDoorsOpen,
  doorRegistry,
  registry,
  onEntranceClick,
  onInternalDoorApproach,
  onArtworkSelect,
  onPointerLockChange,
  onRoomChange,
}: {
  active: boolean;
  isMobile: boolean;
  mobileInput: MutableRefObject<MobileInput>;
  interactionToken: number;
  entranceOpen: boolean;
  internalDoorsOpen: boolean[];
  doorRegistry: MutableRefObject<Set<THREE.Object3D>>;
  registry: MutableRefObject<Map<THREE.Object3D, Artwork>>;
  onEntranceClick: () => void;
  onInternalDoorApproach: (index: number) => void;
  onArtworkSelect: (artwork: Artwork) => void;
  onPointerLockChange: (locked: boolean) => void;
  onRoomChange: (period: PeriodId | null) => void;
}) {
  const { camera, gl } = useThree();
  const keys = useRef(new Set<string>());
  // Arrival framing follows the tall, asymmetric entrance reference.
  const yaw = useRef(-0.055);
  const pitch = useRef(0.1);
  const raycaster = useRef(new THREE.Raycaster());
  const currentRoom = useRef<PeriodId | null>(null);
  const processedInteraction = useRef(interactionToken);

  useEffect(() => {
    const canvas = gl.domElement;
    const onKeyDown = (event: KeyboardEvent) => {
      keys.current.add(event.code);
      if (document.pointerLockElement === canvas && event.code.startsWith("Arrow")) {
        event.preventDefault();
      }
    };
    const onKeyUp = (event: KeyboardEvent) => keys.current.delete(event.code);
    const onMouseMove = (event: MouseEvent) => {
      if (document.pointerLockElement !== canvas) return;
      yaw.current -= event.movementX * 0.0022;
      pitch.current = THREE.MathUtils.clamp(
        pitch.current - event.movementY * 0.0022,
        -1.2,
        1.2,
      );
    };
    const onPointerLock = () => onPointerLockChange(document.pointerLockElement === canvas);
    const interactAtReticle = () => {
      raycaster.current.setFromCamera(new THREE.Vector2(0, 0), camera);
      const doorHit = raycaster.current.intersectObjects([...doorRegistry.current], false)[0];
      if (doorHit && doorHit.distance < 35 && !entranceOpen) onEntranceClick();

      const hit = raycaster.current.intersectObjects([...registry.current.keys()], false)[0];
      const artwork = hit && hit.distance < 9 ? registry.current.get(hit.object) : undefined;
      if (artwork) onArtworkSelect(artwork);
    };
    const onClick = () => {
      if (isMobile) {
        interactAtReticle();
        return;
      }
      if (document.pointerLockElement !== canvas) {
        interactAtReticle();
        canvas.requestPointerLock();
        return;
      }
      interactAtReticle();
    };

    window.addEventListener("keydown", onKeyDown);
    window.addEventListener("keyup", onKeyUp);
    window.addEventListener("mousemove", onMouseMove);
    document.addEventListener("pointerlockchange", onPointerLock);
    canvas.addEventListener("click", onClick);
    return () => {
      window.removeEventListener("keydown", onKeyDown);
      window.removeEventListener("keyup", onKeyUp);
      window.removeEventListener("mousemove", onMouseMove);
      document.removeEventListener("pointerlockchange", onPointerLock);
      canvas.removeEventListener("click", onClick);
    };
  }, [
    camera,
    doorRegistry,
    entranceOpen,
    gl,
    onArtworkSelect,
    onEntranceClick,
    onPointerLockChange,
    isMobile,
    registry,
  ]);

  useFrame((_, delta) => {
    if (isMobile) {
      yaw.current -= mobileInput.current.lookX * 0.003;
      pitch.current = THREE.MathUtils.clamp(
        pitch.current - mobileInput.current.lookY * 0.003,
        -1.2,
        1.2,
      );
      mobileInput.current.lookX = 0;
      mobileInput.current.lookY = 0;

      if (interactionToken !== processedInteraction.current) {
        processedInteraction.current = interactionToken;
        raycaster.current.setFromCamera(new THREE.Vector2(0, 0), camera);
        const doorHit = raycaster.current.intersectObjects([...doorRegistry.current], false)[0];
        if (doorHit && doorHit.distance < 35 && !entranceOpen) onEntranceClick();
        const hit = raycaster.current.intersectObjects([...registry.current.keys()], false)[0];
        const artwork = hit && hit.distance < 9 ? registry.current.get(hit.object) : undefined;
        if (artwork) onArtworkSelect(artwork);
      }
    }
    if (debugFreeRoam && document.pointerLockElement !== gl.domElement) {
      // Olhar sem pointer lock em automação/QA.
      if (keys.current.has("KeyQ")) yaw.current += delta * 1.8;
      if (keys.current.has("KeyE")) yaw.current -= delta * 1.8;
    }
    camera.rotation.set(pitch.current, yaw.current, 0, "YXZ");

    internalDoorBoundaries.forEach((boundary, index) => {
      if (!internalDoorsOpen[index] && Math.abs(camera.position.z - boundary) < 4.4) {
        onInternalDoorApproach(index);
      }
    });

    const room = rooms.find(
      (item) => camera.position.z <= item.startZ && camera.position.z > item.endZ,
    );
    const nextRoom = room?.id ?? null;
    if (nextRoom !== currentRoom.current) {
      currentRoom.current = nextRoom;
      onRoomChange(nextRoom);
    }

    if (!active || (!isMobile && !debugFreeRoam && document.pointerLockElement !== gl.domElement)) return;

    const forward = new THREE.Vector2(-Math.sin(yaw.current), -Math.cos(yaw.current));
    const strafe = new THREE.Vector2(Math.cos(yaw.current), -Math.sin(yaw.current));
    const direction = new THREE.Vector2();
    if (keys.current.has("KeyW") || keys.current.has("ArrowUp")) direction.add(forward);
    if (keys.current.has("KeyS") || keys.current.has("ArrowDown")) direction.sub(forward);
    if (keys.current.has("KeyD") || keys.current.has("ArrowRight")) direction.add(strafe);
    if (keys.current.has("KeyA") || keys.current.has("ArrowLeft")) direction.sub(strafe);
    if (isMobile) {
      direction.addScaledVector(forward, mobileInput.current.forward);
      direction.addScaledVector(strafe, mobileInput.current.strafe);
    }
    if (direction.lengthSq() === 0) return;
    direction.normalize().multiplyScalar(delta * 4.2);

    const previousX = camera.position.x;
    const previousZ = camera.position.z;
    const outside = previousZ > ENTRANCE_DOOR_Z;
    let nextX = THREE.MathUtils.clamp(
      camera.position.x + direction.x,
      outside ? -18 : -ROOM_HALF_WIDTH + 0.75,
      outside ? 18 : ROOM_HALF_WIDTH - 0.75,
    );
    let nextZ = THREE.MathUtils.clamp(
      camera.position.z + direction.y,
      rooms.at(-1)!.endZ + 0.75,
      42,
    );

    const exteriorResolved = resolveExteriorMovement(previousX, previousZ, nextX, nextZ);
    nextX = exteriorResolved.x;
    nextZ = exteriorResolved.z;

    const entrancePassable = entranceOpen && Math.abs(nextX) < DOOR_HALF_WIDTH - 0.15;
    if (!entrancePassable) {
      if (previousZ > ENTRANCE_DOOR_Z + 0.35 && nextZ <= ENTRANCE_DOOR_Z + 0.35) {
        nextZ = ENTRANCE_DOOR_Z + 0.35;
      } else if (
        previousZ < ENTRANCE_DOOR_Z - 0.35 &&
        nextZ >= ENTRANCE_DOOR_Z - 0.35
      ) {
        nextZ = ENTRANCE_DOOR_Z - 0.35;
      }
    }

    // Parede do prédio: passagem apenas pelo portal que leva ao corredor.
    const portalPassable = Math.abs(nextX) < 2.3 - PLAYER_RADIUS;
    if (!portalPassable) {
      if (previousZ > BUILDING_PORTAL_Z + PLAYER_RADIUS && nextZ <= BUILDING_PORTAL_Z + PLAYER_RADIUS) {
        nextZ = BUILDING_PORTAL_Z + PLAYER_RADIUS;
      } else if (
        previousZ < BUILDING_PORTAL_Z - PLAYER_RADIUS &&
        nextZ >= BUILDING_PORTAL_Z - PLAYER_RADIUS
      ) {
        nextZ = BUILDING_PORTAL_Z - PLAYER_RADIUS;
      }
    }

    // Dentro do corredor, as paredes laterais mantêm o visitante no eixo central.
    if (nextZ < BUILDING_PORTAL_Z && nextZ > FIRST_ROOM_Z) {
      nextX = THREE.MathUtils.clamp(nextX, -2.3 + PLAYER_RADIUS, 2.3 - PLAYER_RADIUS);
    }

    internalDoorBoundaries.forEach((boundary, index) => {
      const passable = internalDoorsOpen[index] && Math.abs(nextX) < DOOR_HALF_WIDTH - 0.15;
      if (passable) return;
      if (previousZ > boundary + 0.28 && nextZ <= boundary + 0.28) {
        nextZ = boundary + 0.28;
      } else if (previousZ < boundary - 0.28 && nextZ >= boundary - 0.28) {
        nextZ = boundary - 0.28;
      }
    });

    if (nextZ < FIRST_ROOM_Z) {
      const furnitureResolved = resolveRoomDecorMovement(previousX, previousZ, nextX, nextZ);
      nextX = furnitureResolved.x;
      nextZ = furnitureResolved.z;
    }

    camera.position.x = nextX;
    camera.position.z = nextZ;
    camera.position.y = 1.7;
  });

  return null;
}

function SlidingDoors({
  z,
  open,
  register,
  entrance = false,
}: {
  z: number;
  open: boolean;
  register?: MutableRefObject<Set<THREE.Object3D>>;
  entrance?: boolean;
}) {
  const left = useRef<THREE.Group>(null);
  const right = useRef<THREE.Group>(null);
  const leftPanel = useRef<THREE.Mesh>(null);
  const rightPanel = useRef<THREE.Mesh>(null);

  useEffect(() => {
    if (!register) return;
    if (leftPanel.current) register.current.add(leftPanel.current);
    if (rightPanel.current) register.current.add(rightPanel.current);
    return () => {
      if (leftPanel.current) register.current.delete(leftPanel.current);
      if (rightPanel.current) register.current.delete(rightPanel.current);
    };
  }, [register]);

  useFrame((_, delta) => {
    const target = open ? 2.5 : 0.9;
    if (left.current) left.current.position.x = THREE.MathUtils.damp(left.current.position.x, -target, 4.5, delta);
    if (right.current) right.current.position.x = THREE.MathUtils.damp(right.current.position.x, target, 4.5, delta);
  });

  const color = entrance ? "#bdcfca" : "#927446";
  const opacity = entrance ? 0.23 : 0.78;
  const metalness = entrance ? 0.12 : 0.65;
  const roughness = entrance ? 0.12 : 0.14;
  return <group position={[0, 0, z]}>
    <group ref={left} position={[-0.9, 0, 0]}>
      <mesh ref={leftPanel} position={[0, 1.9, 0]}>
        <boxGeometry args={[1.8, 3.8, 0.13]} />
        <meshStandardMaterial color={color} transparent opacity={opacity} metalness={metalness} roughness={roughness} />
      </mesh>
      {entrance && <EntranceDoorFrame />}
    </group>
    <group ref={right} position={[0.9, 0, 0]}>
      <mesh ref={rightPanel} position={[0, 1.9, 0]}>
        <boxGeometry args={[1.8, 3.8, 0.13]} />
        <meshStandardMaterial color={color} transparent opacity={opacity} metalness={metalness} roughness={roughness} />
      </mesh>
      {entrance && <EntranceDoorFrame />}
    </group>
    {!entrance && <mesh position={[0, 4.12, 0]}>
      <boxGeometry args={[4.1, 0.42, 0.24]} />
      <meshStandardMaterial color="#4c4033" />
    </mesh>}
  </group>;
}

function EntranceDoorFrame() {
  return <group>
    {[-0.88, 0.88].map((x) => <mesh key={x} position={[x, 1.9, 0.075]}>
      <boxGeometry args={[0.045, 3.8, 0.065]} /><meshStandardMaterial color="#a1a8a5" metalness={0.72} roughness={0.3} />
    </mesh>)}
    {[0.05, 3.75].map((y) => <mesh key={y} position={[0, y, 0.075]}>
      <boxGeometry args={[1.8, 0.065, 0.065]} /><meshStandardMaterial color="#a1a8a5" metalness={0.72} roughness={0.3} />
    </mesh>)}
  </group>;
}

function glassRoofHeight(x: number) {
  return 6.3 + 2.7 * Math.exp(-(x * x) / 8.5) + x * 0.07;
}

function WaveGlassRoof() {
  const geometry = useMemo(() => {
    const points = Array.from({ length: 13 }, (_, index) => -6 + index);
    const vertices: number[] = [];
    for (let index = 0; index < points.length - 1; index++) {
      const x1 = points[index];
      const x2 = points[index + 1];
      const y1 = glassRoofHeight(x1);
      const y2 = glassRoofHeight(x2);
      vertices.push(
        x1, y1, 9.2, x2, y2, 9.2, x2, y2, 14.25,
        x1, y1, 9.2, x2, y2, 14.25, x1, y1, 14.25,
      );
    }
    const result = new THREE.BufferGeometry();
    result.setAttribute("position", new THREE.Float32BufferAttribute(vertices, 3));
    result.computeVertexNormals();
    return result;
  }, []);

  return <group>
    <mesh geometry={geometry}>
      <meshPhysicalMaterial color="#a8d8ee" transparent opacity={0.3} roughness={0.05} metalness={0.05} clearcoat={1} clearcoatRoughness={0.1} envMapIntensity={1.6} side={THREE.DoubleSide} />
    </mesh>
    {Array.from({ length: 13 }, (_, index) => {
      const x = -6 + index;
      return <mesh key={x} position={[x, glassRoofHeight(x), 11.72]}>
        <boxGeometry args={[0.075, 0.075, 5.15]} />
        <meshStandardMaterial color="#164b69" metalness={0.75} roughness={0.18} />
      </mesh>;
    })}
  </group>;
}

function GlassPavilion() {
  // O vão central precisa ficar livre: as portas deslizantes ocupam este espaço.
  // Deixa 7,2m de vão sem montantes: nenhum vidro fixo fica na frente da porta.
  const frontPanels = [-5.4, -4.2, 4.2, 5.4];
  const doorOpeningHalfWidth = 3.6;
  return <group>
    {/* Grande fachada de vidro central, como na referência enviada */}
    {frontPanels.map((x) => {
      const height = glassRoofHeight(x) - 0.25;
      return <group key={x} position={[x, height / 2, 14.18]}>
        <mesh><boxGeometry args={[1.16, height, 0.075]} /><meshPhysicalMaterial color="#9fd4ec" transparent opacity={0.32} roughness={0.06} metalness={0.05} clearcoat={1} clearcoatRoughness={0.08} envMapIntensity={1.7} /></mesh>
        <mesh position={[-0.58, 0, 0.06]}><boxGeometry args={[0.07, height + 0.05, 0.08]} /><meshStandardMaterial color="#123f5b" metalness={0.85} roughness={0.3} envMapIntensity={1.2} /></mesh>
      </group>;
    })}
    {[1.55, 3.1, 4.65, 6.2].map((y) => <group key={y}>
      <mesh position={[-(6 - doorOpeningHalfWidth) / 2 - doorOpeningHalfWidth, y, 14.24]}>
        <boxGeometry args={[6 - doorOpeningHalfWidth, 0.07, 0.08]} />
        <meshStandardMaterial color="#174c68" metalness={0.85} roughness={0.3} envMapIntensity={1.2} />
      </mesh>
      <mesh position={[(6 - doorOpeningHalfWidth) / 2 + doorOpeningHalfWidth, y, 14.24]}>
        <boxGeometry args={[6 - doorOpeningHalfWidth, 0.07, 0.08]} />
        <meshStandardMaterial color="#174c68" metalness={0.85} roughness={0.3} envMapIntensity={1.2} />
      </mesh>
    </group>)}

    {/* Laterais curvas do átrio */}
    {[-1.35, -1.08, -0.82, 0.82, 1.08, 1.35].map((angle) => {
      const x = Math.sin(angle) * 6.3;
      const z = 11 + Math.cos(angle) * 3.7;
      return <group key={angle} position={[x, 3.15, z]} rotation={[0, angle, 0]}>
        <mesh><boxGeometry args={[1.7, 6.3, 0.075]} /><meshPhysicalMaterial color="#9fd4ec" transparent opacity={0.28} roughness={0.06} metalness={0.05} clearcoat={1} clearcoatRoughness={0.08} envMapIntensity={1.7} /></mesh>
        <mesh position={[-0.82, 0, 0.06]}><boxGeometry args={[0.07, 6.4, 0.08]} /><meshStandardMaterial color="#123f5b" metalness={0.85} roughness={0.3} envMapIntensity={1.2} /></mesh>
      </group>;
    })}
    <WaveGlassRoof />
  </group>;
}

function MuseumBench({
  position,
  rotationY = 0,
}: {
  position: [number, number, number];
  rotationY?: number;
}) {
  return <group position={position} rotation={[0, rotationY, 0]}>
    <mesh position={[0, 0.48, 0]}><boxGeometry args={[3.2, 0.16, 0.72]} /><meshStandardMaterial color="#765034" roughness={0.78} /></mesh>
    <mesh position={[-1.22, 0.23, 0]}><boxGeometry args={[0.16, 0.46, 0.56]} /><meshStandardMaterial color="#292d32" metalness={0.55} /></mesh>
    <mesh position={[1.22, 0.23, 0]}><boxGeometry args={[0.16, 0.46, 0.56]} /><meshStandardMaterial color="#292d32" metalness={0.55} /></mesh>
  </group>;
}

/* ---------------------------------------------------------------------- */
const VISITOR_MODEL = "/models/exterior-visitor.glb";

const visitorTints = ["#4a6174", "#7b6858", "#3f5446", "#584d66", "#6f5b4a", "#8c877d"];
const visitorHairColors = ["#30281e", "#715e4b", "#c4bfb6", "#3f3630", "#877254", "#d5d1c8"];

function Visitor({
  position,
  rotationY = 0,
  tint = "#4a6174",
  hair = "#352b25",
  scale = 1,
}: {
  position: [number, number, number];
  rotationY?: number;
  tint?: string;
  hair?: string;
  scale?: number;
}) {
  const gltf = useGLTF(VISITOR_MODEL);
  const person = useRef<THREE.Group>(null);
  const prepared = useMemo(() => {
    const scene = cloneSkeleton(gltf.scene);
    const clonedMaterials = new Map<THREE.Material, THREE.Material>();
    const clonedSkeletons = new Set<THREE.Skeleton>();

    scene.traverse((object) => {
      if (!(object instanceof THREE.Mesh)) return;
      object.castShadow = true;
      object.receiveShadow = true;
      if (object instanceof THREE.SkinnedMesh) clonedSkeletons.add(object.skeleton);

      const originalMaterials = Array.isArray(object.material) ? object.material : [object.material];
      const updatedMaterials = originalMaterials.map((material) => {
        if (!["LightBrown", "Hair", "Eyebrows", "Red_Dark"].includes(material.name)) return material;
        const existing = clonedMaterials.get(material);
        if (existing) return existing;
        const clone = material.clone();
        if (clone instanceof THREE.MeshStandardMaterial) {
          if (material.name === "LightBrown") clone.color.set(tint);
          if (material.name === "Hair" || material.name === "Eyebrows") clone.color.set(hair);
          if (material.name === "Red_Dark") clone.color.set("#413d36");
          clone.roughness = 0.9;
        }
        clonedMaterials.set(material, clone);
        return clone;
      });
      object.material = Array.isArray(object.material) ? updatedMaterials : updatedMaterials[0];
    });

    return {
      scene,
      materials: [...clonedMaterials.values()],
      skeletons: [...clonedSkeletons],
    };
  }, [gltf.scene, hair, tint]);

  const mixer = useMemo(() => new THREE.AnimationMixer(prepared.scene), [prepared.scene]);

  useEffect(() => {
    const clip = gltf.animations.find((a) => a.name.endsWith("|Idle_Neutral"));
    if (!clip) return;
    const action = mixer.clipAction(clip);
    action.reset().play();
    action.time = Math.abs(position[0] * 0.43 + position[2] * 0.17) % clip.duration;
    mixer.update(0);
    return () => {
      mixer.stopAllAction();
      mixer.uncacheRoot(prepared.scene);
    };
  }, [gltf.animations, mixer, position, prepared.scene]);

  useEffect(() => {
    return () => {
      prepared.materials.forEach((m) => m.dispose());
      prepared.skeletons.forEach((s) => s.dispose());
    };
  }, [prepared]);

  useFrame((_, delta) => {
    mixer.update(Math.min(delta, 0.08));
  });

  return (
    <group ref={person} position={position} rotation={[0, rotationY, 0]} scale={scale}>
      <primitive object={prepared.scene} />
    </group>
  );
}

function mulberry32(seed: number) {
  let a = seed >>> 0;
  return () => {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function dampAngle(current: number, target: number, lambda: number, delta: number) {
  let diff = target - current;
  while (diff > Math.PI) diff -= Math.PI * 2;
  while (diff < -Math.PI) diff += Math.PI * 2;
  return current + diff * (1 - Math.exp(-lambda * delta));
}

interface Waypoint {
  x: number;
  z: number;
  viewYaw?: number;
  dwell?: number;
}

function buildTour(room: RoomConfig, seed: number): Waypoint[] {
  const rand = mulberry32(seed);
  const leftRows = Math.ceil(room.items.length / 2);
  const rightRows = Math.floor(room.items.length / 2);
  const rowZ = (row: number) => room.startZ - 2.7 - row * 2.25;
  const crossFar = room.endZ + 2.2;
  const crossNear = room.startZ - 2.2;
  const skipRightRow = room.items.length > 3 ? 1 : 0;
  const tour: Waypoint[] = [];

  for (let row = 0; row < leftRows; row++) {
    if (row === 0 && leftRows > 1) continue;
    if (rand() < 0.8) {
      tour.push({
        x: -6.45,
        z: rowZ(row) - 0.5,
        viewYaw: -Math.PI / 2,
        dwell: 3.5 + rand() * 4,
      });
    }
  }
  tour.push({ x: -2.5, z: crossFar }, { x: 2.5, z: crossFar });
  for (let row = rightRows - 1; row >= 0; row--) {
    if (row === skipRightRow) continue;
    if (rand() < 0.8) {
      tour.push({
        x: 6.45,
        z: rowZ(row) + 0.5,
        viewYaw: Math.PI / 2,
        dwell: 3.5 + rand() * 4,
      });
    }
  }
  tour.push({ x: 2.5, z: crossNear }, { x: -2.5, z: crossNear });
  return tour;
}

function RoamingVisitor({
  room,
  seed,
  tint = "#566c7f",
  hair = "#3b2f27",
  scale = 1,
}: {
  room: RoomConfig;
  seed: number;
  tint?: string;
  hair?: string;
  scale?: number;
}) {
  const gltf = useGLTF(VISITOR_MODEL);
  const person = useRef<THREE.Group>(null);
  const tour = useMemo(() => buildTour(room, seed), [room, seed]);
  const state = useRef({
    wp: 0,
    mode: "walk" as "walk" | "view",
    timer: 0,
    yaw: Math.PI / 2,
    speed: 0.65 + mulberry32(seed)() * 0.25,
  });

  const prepared = useMemo(() => {
    const scene = cloneSkeleton(gltf.scene);
    const clonedMaterials = new Map<THREE.Material, THREE.Material>();
    const clonedSkeletons = new Set<THREE.Skeleton>();

    scene.traverse((object) => {
      if (!(object instanceof THREE.Mesh)) return;
      object.castShadow = true;
      object.receiveShadow = true;
      if (object instanceof THREE.SkinnedMesh) clonedSkeletons.add(object.skeleton);

      const originalMaterials = Array.isArray(object.material) ? object.material : [object.material];
      const updatedMaterials = originalMaterials.map((material) => {
        if (!["LightBrown", "Hair", "Eyebrows", "Red_Dark"].includes(material.name)) return material;
        const existing = clonedMaterials.get(material);
        if (existing) return existing;
        const clone = material.clone();
        if (clone instanceof THREE.MeshStandardMaterial) {
          if (material.name === "LightBrown") clone.color.set(tint);
          if (material.name === "Hair" || material.name === "Eyebrows") clone.color.set(hair);
          if (material.name === "Red_Dark") clone.color.set("#413d36");
          clone.roughness = 0.9;
        }
        clonedMaterials.set(material, clone);
        return clone;
      });
      object.material = Array.isArray(object.material) ? updatedMaterials : updatedMaterials[0];
    });

    return {
      scene,
      materials: [...clonedMaterials.values()],
      skeletons: [...clonedSkeletons],
    };
  }, [gltf.scene, hair, tint]);

  const mixer = useMemo(() => new THREE.AnimationMixer(prepared.scene), [prepared.scene]);
  const actions = useRef<{ idle: THREE.AnimationAction; walk: THREE.AnimationAction } | null>(null);

  useEffect(() => {
    const idleClip = gltf.animations.find((a) => a.name.endsWith("|Idle_Neutral"));
    const walkClip = gltf.animations.find((a) => a.name.endsWith("|Walk"));
    if (!idleClip || !walkClip) return;
    const idle = mixer.clipAction(idleClip);
    const walk = mixer.clipAction(walkClip);
    idle.reset().setEffectiveWeight(1).play();
    walk.reset().setEffectiveWeight(0).play();
    actions.current = { idle, walk };
    mixer.update(0);
    return () => {
      actions.current = null;
      mixer.stopAllAction();
      mixer.uncacheRoot(prepared.scene);
    };
  }, [gltf.animations, mixer, prepared.scene]);

  useEffect(() => {
    return () => {
      prepared.materials.forEach((m) => m.dispose());
      prepared.skeletons.forEach((s) => s.dispose());
    };
  }, [prepared]);

  useFrame((_, deltaFrame) => {
    if (!person.current || tour.length === 0) return;
    const delta = Math.min(deltaFrame, 0.08);
    mixer.update(delta);

    const s = state.current;
    const target = tour[s.wp];

    if (s.mode === "view") {
      if (actions.current) {
        actions.current.idle.setEffectiveWeight(1);
        actions.current.walk.setEffectiveWeight(0);
      }
      s.timer -= delta;
      s.yaw = dampAngle(s.yaw, target.viewYaw ?? s.yaw, 7, delta);
      if (s.timer <= 0) {
        s.mode = "walk";
        s.wp = (s.wp + 1) % tour.length;
      }
    } else {
      if (actions.current) {
        actions.current.idle.setEffectiveWeight(0);
        actions.current.walk.setEffectiveWeight(1);
        actions.current.walk.setEffectiveTimeScale(0.72);
      }
      const dx = target.x - person.current.position.x;
      const dz = target.z - person.current.position.z;
      const dist = Math.hypot(dx, dz);
      if (dist < 0.12) {
        if (target.viewYaw !== undefined) {
          s.mode = "view";
          s.timer = target.dwell ?? 3.5;
        } else {
          s.wp = (s.wp + 1) % tour.length;
        }
      } else {
        const step = Math.min(dist, s.speed * delta);
        person.current.position.x += (dx / dist) * step;
        person.current.position.z += (dz / dist) * step;
        s.yaw = dampAngle(s.yaw, Math.atan2(dx, dz), 8, delta);
      }
    }
    person.current.rotation.y = s.yaw;
  });

  return (
    <group
      ref={person}
      position={[-3, 0, room.startZ - 2.2]}
      rotation={[0, Math.PI / 2, 0]}
      scale={scale}
    >
      <primitive object={prepared.scene} />
    </group>
  );
}

function RoomDecor({ room, index }: { room: RoomConfig; index: number }) {
  const firstPaintingZ = room.startZ - 2.7;
  const secondRowZ = room.startZ - 4.95;

  return <group>
    {/* Peças de arte e vasos escultóricos sobre plintos de mármore */}
    <MuseumArtPiece
      position={[-6.65, 0, room.startZ - 1.15]}
      rotationY={Math.PI * 0.85}
      variant={((index * 2) % 4) as VaseVariant}
    />
    <MuseumArtPiece
      position={[6.65, 0, room.endZ + 1.25]}
      rotationY={-Math.PI * 0.35}
      variant={((index * 2 + 1) % 4) as VaseVariant}
    />
    <MuseumBench position={[0, 0, room.centerZ]} rotationY={Math.PI / 2} />

    {/* Visitantes humanos contemplando obras e circulando na sala */}
    <Suspense fallback={null}>
      <Visitor
        position={[-6.7, 0, firstPaintingZ]}
        rotationY={-Math.PI / 2}
        tint={visitorTints[index % visitorTints.length]}
        hair={visitorHairColors[index % visitorHairColors.length]}
        scale={0.98 + (index % 3) * 0.03}
      />
      <Visitor
        position={[6.7, 0, room.items.length > 3 ? secondRowZ : firstPaintingZ]}
        rotationY={Math.PI / 2}
        tint={visitorTints[(index + 2) % visitorTints.length]}
        hair={visitorHairColors[(index + 2) % visitorHairColors.length]}
        scale={0.96 + ((index + 1) % 3) * 0.04}
      />

      {/* Visitante percorrendo a sala como em um museu real */}
      <RoamingVisitor
        room={room}
        seed={index * 97 + 13}
        tint={visitorTints[(index + 1) % visitorTints.length]}
        hair={visitorHairColors[(index + 1) % visitorHairColors.length]}
        scale={1 + (index % 2) * 0.04}
      />
    </Suspense>
  </group>;
}

function Room({ room, last, index }: { room: RoomConfig; last: boolean; index: number }) {
  const parquet = useChevronParquet(8, Math.round(room.length * 0.55));
  return <group>
    {/* Piso em parquet chevron de madeira clara */}
    <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0, room.centerZ]} receiveShadow>
      <planeGeometry args={[ROOM_HALF_WIDTH * 2, room.length]} />
      <meshStandardMaterial
        map={parquet?.map}
        bumpMap={parquet?.bumpMap}
        bumpScale={0.032}
        color="#f2dfc6"
        roughness={0.62}
      />
    </mesh>

    {/* Paredes laterais em cinza-escuro museológico elegante */}
    <mesh position={[-ROOM_HALF_WIDTH, ROOM_HEIGHT / 2, room.centerZ]}>
      <boxGeometry args={[0.3, ROOM_HEIGHT, room.length]} />
      <meshStandardMaterial color={MUSEUM_WALL_COLOR} roughness={0.94} />
    </mesh>
    <mesh position={[ROOM_HALF_WIDTH, ROOM_HEIGHT / 2, room.centerZ]}>
      <boxGeometry args={[0.3, ROOM_HEIGHT, room.length]} />
      <meshStandardMaterial color={MUSEUM_WALL_COLOR} roughness={0.94} />
    </mesh>

    {/* Rodapés de madeira natural na base das paredes (como na foto de referência) */}
    <mesh position={[-ROOM_HALF_WIDTH + 0.17, 0.08, room.centerZ]}>
      <boxGeometry args={[0.04, 0.16, room.length]} />
      <meshStandardMaterial color={MUSEUM_BASEBOARD_COLOR} roughness={0.78} />
    </mesh>
    <mesh position={[ROOM_HALF_WIDTH - 0.17, 0.08, room.centerZ]}>
      <boxGeometry args={[0.04, 0.16, room.length]} />
      <meshStandardMaterial color={MUSEUM_BASEBOARD_COLOR} roughness={0.78} />
    </mesh>

    {/* Teto escuro de galeria */}
    <mesh position={[0, ROOM_HEIGHT, room.centerZ]}>
      <boxGeometry args={[ROOM_HALF_WIDTH * 2, 0.22, room.length]} />
      <meshStandardMaterial color={MUSEUM_CEILING_COLOR} roughness={0.88} />
    </mesh>

    {/* Faixa de identificação visual do período */}
    <mesh position={[-ROOM_HALF_WIDTH + 0.19, 4.9, room.startZ - 1.7]} rotation={[0, Math.PI / 2, 0]}>
      <planeGeometry args={[3.1, 0.38]} />
      <meshStandardMaterial color={room.accent} emissive={room.accent} emissiveIntensity={0.32} />
    </mesh>

    {/* Parede final com vão central, exceto na última sala */}
    {last ? (
      <>
        <mesh position={[0, ROOM_HEIGHT / 2, room.endZ]}>
          <boxGeometry args={[ROOM_HALF_WIDTH * 2, ROOM_HEIGHT, 0.28]} />
          <meshStandardMaterial color={MUSEUM_WALL_COLOR} roughness={0.94} />
        </mesh>
        <mesh position={[0, 0.08, room.endZ + 0.16]}>
          <boxGeometry args={[ROOM_HALF_WIDTH * 2, 0.16, 0.04]} />
          <meshStandardMaterial color={MUSEUM_BASEBOARD_COLOR} roughness={0.78} />
        </mesh>
      </>
    ) : (
      <>
        <mesh position={[-(ROOM_HALF_WIDTH + DOOR_HALF_WIDTH) / 2, ROOM_HEIGHT / 2, room.endZ]}>
          <boxGeometry args={[ROOM_HALF_WIDTH - DOOR_HALF_WIDTH, ROOM_HEIGHT, 0.28]} />
          <meshStandardMaterial color={MUSEUM_WALL_COLOR} roughness={0.94} />
        </mesh>
        <mesh position={[(ROOM_HALF_WIDTH + DOOR_HALF_WIDTH) / 2, ROOM_HEIGHT / 2, room.endZ]}>
          <boxGeometry args={[ROOM_HALF_WIDTH - DOOR_HALF_WIDTH, ROOM_HEIGHT, 0.28]} />
          <meshStandardMaterial color={MUSEUM_WALL_COLOR} roughness={0.94} />
        </mesh>
        <mesh position={[0, 5.25, room.endZ]}>
          <boxGeometry args={[DOOR_HALF_WIDTH * 2, ROOM_HEIGHT - 4, 0.28]} />
          <meshStandardMaterial color={MUSEUM_WALL_COLOR} roughness={0.94} />
        </mesh>
        {/* Rodapés na parede divisória */}
        <mesh position={[-(ROOM_HALF_WIDTH + DOOR_HALF_WIDTH) / 2, 0.08, room.endZ + 0.16]}>
          <boxGeometry args={[ROOM_HALF_WIDTH - DOOR_HALF_WIDTH, 0.16, 0.04]} />
          <meshStandardMaterial color={MUSEUM_BASEBOARD_COLOR} roughness={0.78} />
        </mesh>
        <mesh position={[(ROOM_HALF_WIDTH + DOOR_HALF_WIDTH) / 2, 0.08, room.endZ + 0.16]}>
          <boxGeometry args={[ROOM_HALF_WIDTH - DOOR_HALF_WIDTH, 0.16, 0.04]} />
          <meshStandardMaterial color={MUSEUM_BASEBOARD_COLOR} roughness={0.78} />
        </mesh>
      </>
    )}

    <pointLight position={[0, 5.6, room.centerZ]} intensity={46} distance={room.length * 0.8} color="#ffe8bd" />
    <mesh position={[0, ROOM_HEIGHT - 0.14, room.centerZ]}>
      <boxGeometry args={[3.2, 0.08, Math.max(4, room.length - 3)]} />
      <meshStandardMaterial color="#fff1ca" emissive="#ffe8b0" emissiveIntensity={1.1} toneMapped={false} />
    </mesh>
    <RoomDecor room={room} index={index} />
  </group>;
}


function TransitionCorridor() {
  const length = BUILDING_PORTAL_Z - FIRST_ROOM_Z;
  const centerZ = (BUILDING_PORTAL_Z + FIRST_ROOM_Z) / 2;
  const corridorParquet = useChevronParquet(3, Math.round(length * 0.55));
  return <group>
    <mesh position={[0, 0.03, centerZ]} rotation={[-Math.PI / 2, 0, 0]}>
      <planeGeometry args={[4.6, length]} />
      <meshStandardMaterial
        map={corridorParquet?.map}
        bumpMap={corridorParquet?.bumpMap}
        bumpScale={0.032}
        color="#f2dfc6"
        roughness={0.62}
      />
    </mesh>
    <mesh position={[-2.45, 2.3, centerZ]}>
      <boxGeometry args={[0.3, 4.6, length]} />
      <meshStandardMaterial color={MUSEUM_WALL_COLOR} roughness={0.94} />
    </mesh>
    <mesh position={[2.45, 2.3, centerZ]}>
      <boxGeometry args={[0.3, 4.6, length]} />
      <meshStandardMaterial color={MUSEUM_WALL_COLOR} roughness={0.94} />
    </mesh>
    {/* Rodapés do corredor */}
    <mesh position={[-2.28, 0.11, centerZ]}>
      <boxGeometry args={[0.04, 0.16, length]} />
      <meshStandardMaterial color={MUSEUM_BASEBOARD_COLOR} roughness={0.78} />
    </mesh>
    <mesh position={[2.28, 0.11, centerZ]}>
      <boxGeometry args={[0.04, 0.16, length]} />
      <meshStandardMaterial color={MUSEUM_BASEBOARD_COLOR} roughness={0.78} />
    </mesh>
    <mesh position={[0, 4.6, centerZ]}>
      <boxGeometry args={[4.9, 0.2, length]} />
      <meshStandardMaterial color={MUSEUM_CEILING_COLOR} roughness={0.88} />
    </mesh>
    {[1.2, 4.3, 7.4].map((offset) => <mesh key={offset} position={[0, 4.43, FIRST_ROOM_Z + offset]}>
      <boxGeometry args={[2.8, 0.08, 0.36]} />
      <meshStandardMaterial color="#fff2cf" emissive="#ffe2a0" emissiveIntensity={1.25} toneMapped={false} />
    </mesh>)}
    <pointLight position={[0, 4.1, centerZ]} intensity={24} distance={12} color="#ffe8bb" />

    {/* Murais contemporâneos com fotos e frases de Van Gogh */}
    <CorridorMurals />
  </group>;
}

function MuseumArchitecture({
  entranceOpen,
  internalDoorsOpen,
  doorRegistry,
}: {
  entranceOpen: boolean;
  internalDoorsOpen: boolean[];
  doorRegistry: MutableRefObject<Set<THREE.Object3D>>;
}) {
  return <group>
    <Sky distance={4000} sunPosition={[-35, 42, 25]} turbidity={5} rayleigh={0.35} mieCoefficient={0.005} mieDirectionalG={0.8} />
    <fog attach="fog" args={["#cfe4f4", 130, 230]} />
    <Environment resolution={128} frames={1}>
      <Lightformer intensity={1.4} rotation-x={Math.PI / 2} position={[0, 6, 0]} scale={[12, 12, 1]} color="#eaf4ff" />
      <Lightformer intensity={0.9} rotation-y={Math.PI / 2} position={[-8, 2, 0]} scale={[8, 3, 1]} color="#fff2da" />
      <Lightformer intensity={0.7} rotation-y={-Math.PI / 2} position={[8, 2, 0]} scale={[8, 3, 1]} color="#dfeaff" />
      <Lightformer intensity={0.5} position={[0, 2, -9]} scale={[10, 3, 1]} color="#cfd8e2" />
    </Environment>
    <ExteriorDaylight />
    <pointLight position={[0, 5, 15]} intensity={11} distance={22} color="#fff0ce" />

    <MuseumExterior />
    <ExteriorLandscape />
    <Suspense fallback={null}>
      <ExteriorVisitors />
    </Suspense>
    <SlidingDoors z={ENTRANCE_DOOR_Z} open={entranceOpen} register={doorRegistry} entrance />
    <TransitionCorridor />

    {rooms.map((room, index) => <Room key={room.id} room={room} index={index} last={index === rooms.length - 1} />)}
    {internalDoorBoundaries.map((z, index) => (
      <SlidingDoors key={z} z={z} open={internalDoorsOpen[index]} />
    ))}
  </group>;
}

export function MuseumScene({
  active,
  isMobile,
  mobileInput,
  interactionToken,
  onArtworkSelect,
  onPointerLockChange,
  onRoomChange,
}: MuseumSceneProps) {
  const registry = useRef(new Map<THREE.Object3D, Artwork>());
  const doorRegistry = useRef(new Set<THREE.Object3D>());
  const [entranceOpen, setEntranceOpen] = useState(false);
  const [internalDoorsOpen, setInternalDoorsOpen] = useState(
    () => internalDoorBoundaries.map(() => false),
  );
  const stableInternalDoors = useMemo(() => internalDoorsOpen, [internalDoorsOpen]);

  const openInternalDoor = (index: number) => {
    setInternalDoorsOpen((current) => {
      if (current[index]) return current;
      return current.map((open, doorIndex) => doorIndex === index ? true : open);
    });
  };

  return <>
    <MuseumArchitecture
      entranceOpen={entranceOpen}
      internalDoorsOpen={stableInternalDoors}
      doorRegistry={doorRegistry}
    />
    <GalleryControls
      active={active}
      isMobile={isMobile}
      mobileInput={mobileInput}
      interactionToken={interactionToken}
      entranceOpen={entranceOpen}
      internalDoorsOpen={stableInternalDoors}
      doorRegistry={doorRegistry}
      registry={registry}
      onEntranceClick={() => setEntranceOpen(true)}
      onInternalDoorApproach={openInternalDoor}
      onArtworkSelect={onArtworkSelect}
      onPointerLockChange={onPointerLockChange}
      onRoomChange={onRoomChange}
    />
    {artworkSlots.map((slot) => (
      <Suspense fallback={null} key={slot.artwork.slug}>
        <GalleryArtwork slot={slot} registry={registry} />
      </Suspense>
    ))}
  </>;
}

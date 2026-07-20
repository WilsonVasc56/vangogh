"use client";

import { Html, useTexture } from "@react-three/drei";
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

interface ArtworkSlot {
  artwork: Artwork;
  position: [number, number, number];
  rotation: [number, number, number];
}

const ENTRANCE_DOOR_Z = 14.8;
const BUILDING_PORTAL_Z = 8.55;
const FIRST_ROOM_Z = -1.5;
const ROOM_HALF_WIDTH = 8.5;
const ROOM_HEIGHT = 6.5;
const DOOR_HALF_WIDTH = 1.65;

const roomStyles = [
  { wallColor: "#756b5d", floorColor: "#332c28", accent: "#b39772" },
  { wallColor: "#d7cab4", floorColor: "#31404b", accent: "#78a3b8" },
  { wallColor: "#dbc58f", floorColor: "#493c2c", accent: "#e3a83f" },
  { wallColor: "#aeb8b8", floorColor: "#293b45", accent: "#6d98ab" },
  { wallColor: "#c9c09f", floorColor: "#3b4630", accent: "#94a75d" },
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

function createArtworkSlots(): ArtworkSlot[] {
  return rooms.flatMap((room) =>
    room.items.map((artwork, index) => {
      const leftWall = index % 2 === 0;
      const row = Math.floor(index / 2);
      return {
        artwork,
        position: [
          leftWall ? -ROOM_HALF_WIDTH + 0.28 : ROOM_HALF_WIDTH - 0.28,
          1.23,
          room.startZ - 2.7 - row * 2.25,
        ],
        rotation: [0, leftWall ? Math.PI / 2 : -Math.PI / 2, 0],
      } as ArtworkSlot;
    }),
  );
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
  // Ala de tijolos, canal, canteiro de tulipas, lampião e árvore
  { minX: 3.9, maxX: 14.5, minZ: 0.5, maxZ: 11.5 },
  { minX: -22.5, maxX: -13.15, minZ: 8.5, maxZ: 35 },
  { minX: 4.2, maxX: 17.4, minZ: 20.8, maxZ: 27.2 },
  { minX: 6.4, maxX: 7.2, minZ: 20.1, maxZ: 20.9 },
  { minX: 16.9, maxX: 19.1, minZ: 15.9, maxZ: 18.1 },
];

const exteriorEllipses: CollisionEllipse[] = [
  // Volume curvo branco. O raio deixa o eixo central da entrada livre.
  { x: -7.2, z: 6.8, radiusX: 6.75, radiusZ: 4.55 },
];

const glassWallSegments: CollisionSegment[] = [
  ...[-1.35, -1.08, -0.82, 0.82, 1.08, 1.35].map((angle) => {
    const x = Math.sin(angle) * 6.3;
    const z = 11 + Math.cos(angle) * 3.7;
    const half = 0.85;
    return {
      ax: x - Math.cos(angle) * half,
      az: z + Math.sin(angle) * half,
      bx: x + Math.cos(angle) * half,
      bz: z - Math.sin(angle) * half,
    };
  }),
  // Fachada frontal de vidro, preservando apenas o vão central da porta.
  { ax: -6, az: 14.18, bx: -1.72, bz: 14.18 },
  { ax: 1.72, az: 14.18, bx: 6, bz: 14.18 },
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
  const yaw = useRef(0);
  const pitch = useRef(0);
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

    if (!active || (!isMobile && document.pointerLockElement !== gl.domElement)) return;

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
      30,
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

  const color = entrance ? "#85aec9" : "#927446";
  const opacity = entrance ? 0.48 : 0.78;
  return <group position={[0, 0, z]}>
    <group ref={left} position={[-0.9, 0, 0]}>
      <mesh ref={leftPanel} position={[0, 1.9, 0]}>
        <boxGeometry args={[1.8, 3.8, 0.13]} />
        <meshStandardMaterial color={color} transparent opacity={opacity} metalness={0.65} roughness={0.14} />
      </mesh>
    </group>
    <group ref={right} position={[0.9, 0, 0]}>
      <mesh ref={rightPanel} position={[0, 1.9, 0]}>
        <boxGeometry args={[1.8, 3.8, 0.13]} />
        <meshStandardMaterial color={color} transparent opacity={opacity} metalness={0.65} roughness={0.14} />
      </mesh>
    </group>
    <mesh position={[0, 4.12, 0]}>
      <boxGeometry args={[4.1, 0.42, 0.24]} />
      <meshStandardMaterial color={entrance ? "#d8b44c" : "#4c4033"} />
    </mesh>
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
      <meshStandardMaterial color="#74c8ee" transparent opacity={0.38} metalness={0.42} roughness={0.08} side={THREE.DoubleSide} />
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
        <mesh><boxGeometry args={[1.16, height, 0.075]} /><meshStandardMaterial color="#46b8e7" transparent opacity={0.31} metalness={0.55} roughness={0.06} /></mesh>
        <mesh position={[-0.58, 0, 0.06]}><boxGeometry args={[0.07, height + 0.05, 0.08]} /><meshStandardMaterial color="#123f5b" metalness={0.82} roughness={0.2} /></mesh>
      </group>;
    })}
    {[1.55, 3.1, 4.65, 6.2].map((y) => <group key={y}>
      <mesh position={[-(6 - doorOpeningHalfWidth) / 2 - doorOpeningHalfWidth, y, 14.24]}>
        <boxGeometry args={[6 - doorOpeningHalfWidth, 0.07, 0.08]} />
        <meshStandardMaterial color="#174c68" metalness={0.8} roughness={0.18} />
      </mesh>
      <mesh position={[(6 - doorOpeningHalfWidth) / 2 + doorOpeningHalfWidth, y, 14.24]}>
        <boxGeometry args={[6 - doorOpeningHalfWidth, 0.07, 0.08]} />
        <meshStandardMaterial color="#174c68" metalness={0.8} roughness={0.18} />
      </mesh>
    </group>)}

    {/* Laterais curvas do átrio */}
    {[-1.35, -1.08, -0.82, 0.82, 1.08, 1.35].map((angle) => {
      const x = Math.sin(angle) * 6.3;
      const z = 11 + Math.cos(angle) * 3.7;
      return <group key={angle} position={[x, 3.15, z]} rotation={[0, angle, 0]}>
        <mesh><boxGeometry args={[1.7, 6.3, 0.075]} /><meshStandardMaterial color="#55bce4" transparent opacity={0.28} metalness={0.58} roughness={0.06} /></mesh>
        <mesh position={[-0.82, 0, 0.06]}><boxGeometry args={[0.07, 6.4, 0.08]} /><meshStandardMaterial color="#123f5b" metalness={0.82} roughness={0.2} /></mesh>
      </group>;
    })}
    <WaveGlassRoof />
  </group>;
}

const vaseProfile = [
  new THREE.Vector2(0.16, 0),
  new THREE.Vector2(0.36, 0.08),
  new THREE.Vector2(0.42, 0.38),
  new THREE.Vector2(0.3, 0.62),
  new THREE.Vector2(0.22, 0.78),
  new THREE.Vector2(0.25, 0.9),
];

function MuseumVase({
  position,
  color,
}: {
  position: [number, number, number];
  color: string;
}) {
  return <group position={position}>
    <mesh position={[0, 0.42, 0]}>
      <boxGeometry args={[0.92, 0.84, 0.92]} />
      <meshStandardMaterial color="#d8d1c2" roughness={0.82} />
    </mesh>
    <mesh position={[0, 0.92, 0]}>
      <latheGeometry args={[vaseProfile, 24]} />
      <meshStandardMaterial color={color} roughness={0.32} metalness={0.16} />
    </mesh>
    {[-0.16, 0, 0.16].map((x, index) => <group key={x} position={[x, 1.76, 0]} rotation={[0, 0, (index - 1) * 0.2]}>
      <mesh position={[0, 0.33, 0]}><cylinderGeometry args={[0.018, 0.024, 0.72, 7]} /><meshStandardMaterial color="#31583b" /></mesh>
      <mesh position={[0.12, 0.36, 0]} rotation={[0, 0, -0.55]}><sphereGeometry args={[0.19, 10, 7]} /><meshStandardMaterial color="#47704d" roughness={1} /></mesh>
      <mesh position={[-0.1, 0.56, 0]} rotation={[0, 0, 0.55]}><sphereGeometry args={[0.16, 10, 7]} /><meshStandardMaterial color="#385f42" roughness={1} /></mesh>
    </group>)}
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

function Visitor({
  position,
  rotationY = 0,
  shirt,
  trousers,
  walkingRange = 0,
  phase = 0,
}: {
  position: [number, number, number];
  rotationY?: number;
  shirt: string;
  trousers: string;
  walkingRange?: number;
  phase?: number;
}) {
  const person = useRef<THREE.Group>(null);
  const leftArm = useRef<THREE.Group>(null);
  const rightArm = useRef<THREE.Group>(null);
  const leftLeg = useRef<THREE.Group>(null);
  const rightLeg = useRef<THREE.Group>(null);
  const elapsed = useRef(phase);

  useFrame((_, delta) => {
    if (!walkingRange || !person.current) return;
    elapsed.current += delta * 0.62;
    const wave = Math.sin(elapsed.current);
    person.current.position.z = position[2] + wave * walkingRange;
    person.current.rotation.y = Math.cos(elapsed.current) >= 0 ? 0 : Math.PI;
    const stride = Math.cos(elapsed.current * 2) * 0.34;
    if (leftArm.current) leftArm.current.rotation.x = stride;
    if (rightArm.current) rightArm.current.rotation.x = -stride;
    if (leftLeg.current) leftLeg.current.rotation.x = -stride;
    if (rightLeg.current) rightLeg.current.rotation.x = stride;
  });

  return <group ref={person} position={position} rotation={[0, rotationY, 0]}>
    <group ref={leftLeg} position={[-0.16, 0.82, 0]}>
      <mesh position={[0, -0.39, 0]}><boxGeometry args={[0.22, 0.78, 0.24]} /><meshStandardMaterial color={trousers} roughness={0.9} /></mesh>
      <mesh position={[0, -0.78, 0.09]}><boxGeometry args={[0.24, 0.12, 0.43]} /><meshStandardMaterial color="#211d1b" roughness={0.75} /></mesh>
    </group>
    <group ref={rightLeg} position={[0.16, 0.82, 0]}>
      <mesh position={[0, -0.39, 0]}><boxGeometry args={[0.22, 0.78, 0.24]} /><meshStandardMaterial color={trousers} roughness={0.9} /></mesh>
      <mesh position={[0, -0.78, 0.09]}><boxGeometry args={[0.24, 0.12, 0.43]} /><meshStandardMaterial color="#211d1b" roughness={0.75} /></mesh>
    </group>
    <mesh position={[0, 1.22, 0]}><boxGeometry args={[0.64, 0.86, 0.36]} /><meshStandardMaterial color={shirt} roughness={0.86} /></mesh>
    <group ref={leftArm} position={[-0.39, 1.48, 0]}>
      <mesh position={[0, -0.34, 0]}><capsuleGeometry args={[0.1, 0.55, 5, 8]} /><meshStandardMaterial color={shirt} roughness={0.86} /></mesh>
    </group>
    <group ref={rightArm} position={[0.39, 1.48, 0]}>
      <mesh position={[0, -0.34, 0]}><capsuleGeometry args={[0.1, 0.55, 5, 8]} /><meshStandardMaterial color={shirt} roughness={0.86} /></mesh>
    </group>
    <mesh position={[0, 1.92, 0]}><sphereGeometry args={[0.25, 14, 10]} /><meshStandardMaterial color="#c99672" roughness={0.9} /></mesh>
    <mesh position={[0, 2.08, -0.03]} scale={[1.04, 0.52, 1.02]}><sphereGeometry args={[0.255, 14, 8]} /><meshStandardMaterial color="#3a2b24" roughness={0.94} /></mesh>
    <mesh position={[0, 1.91, 0.245]}><sphereGeometry args={[0.045, 8, 6]} /><meshStandardMaterial color="#b67d5d" roughness={0.9} /></mesh>
  </group>;
}

const visitorPalettes = [
  ["#7d3941", "#252b3b"],
  ["#315a69", "#3b332e"],
  ["#8a6a32", "#28323c"],
  ["#5b4770", "#34343b"],
  ["#41644d", "#312c2a"],
];

function RoomDecor({ room, index }: { room: RoomConfig; index: number }) {
  const firstPaintingZ = room.startZ - 2.7;
  const secondRowZ = room.startZ - 4.95;
  const [shirt, trousers] = visitorPalettes[index];
  const nextPalette = visitorPalettes[(index + 2) % visitorPalettes.length];

  return <group>
    <MuseumVase position={[-6.65, 0, room.startZ - 1.15]} color={room.accent} />
    <MuseumVase position={[6.65, 0, room.endZ + 1.25]} color={index % 2 ? "#586f83" : "#9a6845"} />
    <MuseumBench position={[0, 0, room.centerZ]} rotationY={Math.PI / 2} />

    {/* Visitantes parados diante das obras */}
    <Visitor position={[-6.7, 0, firstPaintingZ]} rotationY={-Math.PI / 2} shirt={shirt} trousers={trousers} />
    <Visitor position={[6.7, 0, room.items.length > 3 ? secondRowZ : firstPaintingZ]} rotationY={Math.PI / 2} shirt={nextPalette[0]} trousers={nextPalette[1]} />

    {/* Visitante caminhando pelo corredor central */}
    <Visitor
      position={[index % 2 === 0 ? -1.45 : 1.45, 0, room.centerZ]}
      shirt={visitorPalettes[(index + 1) % visitorPalettes.length][0]}
      trousers={visitorPalettes[(index + 1) % visitorPalettes.length][1]}
      walkingRange={Math.min(3.2, room.length * 0.2)}
      phase={index * 1.3}
    />
  </group>;
}

function Room({ room, last, index }: { room: RoomConfig; last: boolean; index: number }) {
  return <group>
    <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0, room.centerZ]} receiveShadow>
      <planeGeometry args={[ROOM_HALF_WIDTH * 2, room.length]} />
      <meshStandardMaterial color={room.floorColor} roughness={0.78} />
    </mesh>
    <mesh position={[-ROOM_HALF_WIDTH, ROOM_HEIGHT / 2, room.centerZ]}>
      <boxGeometry args={[0.3, ROOM_HEIGHT, room.length]} />
      <meshStandardMaterial color={room.wallColor} roughness={0.9} />
    </mesh>
    <mesh position={[ROOM_HALF_WIDTH, ROOM_HEIGHT / 2, room.centerZ]}>
      <boxGeometry args={[0.3, ROOM_HEIGHT, room.length]} />
      <meshStandardMaterial color={room.wallColor} roughness={0.9} />
    </mesh>
    <mesh position={[0, ROOM_HEIGHT, room.centerZ]}>
      <boxGeometry args={[ROOM_HALF_WIDTH * 2, 0.22, room.length]} />
      <meshStandardMaterial color="#313b49" roughness={0.72} />
    </mesh>

    {/* Faixa de identificação visual do período */}
    <mesh position={[-ROOM_HALF_WIDTH + 0.19, 4.9, room.startZ - 1.7]} rotation={[0, Math.PI / 2, 0]}>
      <planeGeometry args={[3.1, 0.38]} />
      <meshStandardMaterial color={room.accent} emissive={room.accent} emissiveIntensity={0.32} />
    </mesh>

    {/* Parede final com vão central, exceto na última sala */}
    {last ? (
      <mesh position={[0, ROOM_HEIGHT / 2, room.endZ]}>
        <boxGeometry args={[ROOM_HALF_WIDTH * 2, ROOM_HEIGHT, 0.28]} />
        <meshStandardMaterial color={room.wallColor} roughness={0.9} />
      </mesh>
    ) : (
      <>
        <mesh position={[-(ROOM_HALF_WIDTH + DOOR_HALF_WIDTH) / 2, ROOM_HEIGHT / 2, room.endZ]}>
          <boxGeometry args={[ROOM_HALF_WIDTH - DOOR_HALF_WIDTH, ROOM_HEIGHT, 0.28]} />
          <meshStandardMaterial color={room.wallColor} roughness={0.9} />
        </mesh>
        <mesh position={[(ROOM_HALF_WIDTH + DOOR_HALF_WIDTH) / 2, ROOM_HEIGHT / 2, room.endZ]}>
          <boxGeometry args={[ROOM_HALF_WIDTH - DOOR_HALF_WIDTH, ROOM_HEIGHT, 0.28]} />
          <meshStandardMaterial color={room.wallColor} roughness={0.9} />
        </mesh>
        <mesh position={[0, 5.25, room.endZ]}>
          <boxGeometry args={[DOOR_HALF_WIDTH * 2, ROOM_HEIGHT - 4, 0.28]} />
          <meshStandardMaterial color={room.wallColor} roughness={0.9} />
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

function RietveldExterior() {
  return <group position={[-7.2, 0, 6.8]}>
    {/* Grande volume branco curvo à esquerda da referência */}
    <mesh position={[0, 6, 0]} scale={[7.25, 1, 4.75]}>
      <cylinderGeometry args={[1, 1, 12, 56]} />
      <meshStandardMaterial color="#dedbd4" roughness={0.82} />
    </mesh>
    {/* Lajes salientes superior e inferior */}
    <mesh position={[0, 12.1, 0]} scale={[7.7, 1, 5.08]}>
      <cylinderGeometry args={[1, 1, 0.38, 56]} />
      <meshStandardMaterial color="#f1eee7" roughness={0.68} />
    </mesh>
    <mesh position={[0, 0.22, 0]} scale={[7.45, 1, 4.9]}>
      <cylinderGeometry args={[1, 1, 0.4, 56]} />
      <meshStandardMaterial color="#c5c2bc" roughness={0.86} />
    </mesh>
    {/* Faixa de vidro junto à cobertura */}
    <mesh position={[0, 10.95, 0]} scale={[7.3, 1, 4.8]}>
      <cylinderGeometry args={[1.01, 1.01, 1.15, 56, 1, true]} />
      <meshStandardMaterial color="#174a64" transparent opacity={0.78} metalness={0.48} roughness={0.14} />
    </mesh>
    {/* Janela retangular frontal do volume curvo */}
    <mesh position={[1.1, 4.1, 4.78]}>
      <planeGeometry args={[3.8, 3]} />
      <meshStandardMaterial color="#2482aa" metalness={0.38} roughness={0.12} />
    </mesh>
    {[-0.15, 0.9, 1.95, 3].map((x) => <mesh key={x} position={[x, 4.1, 4.84]}><boxGeometry args={[0.055, 3.05, 0.06]} /><meshStandardMaterial color="#163e55" /></mesh>)}
    {[3.1, 4.1, 5.1].map((y) => <mesh key={y} position={[1.42, y, 4.84]}><boxGeometry args={[3.85, 0.055, 0.06]} /><meshStandardMaterial color="#163e55" /></mesh>)}
  </group>;
}

function BrickWing() {
  return <group position={[9.2, 0, 6]}>
    {/* Edifício de tijolos à direita */}
    <mesh position={[0, 5.5, 0]}>
      <boxGeometry args={[10.6, 11, 11]} />
      <meshStandardMaterial color="#cf9552" roughness={0.9} />
    </mesh>
    {/* Faixas claras entre os pavimentos */}
    {[2.2, 5.25].map((y) => <mesh key={y} position={[0, y, 5.56]}>
      <boxGeometry args={[10.8, 0.34, 0.18]} />
      <meshStandardMaterial color="#e6ded0" roughness={0.78} />
    </mesh>)}
    {/* Janelas frontais */}
    {[-3.7, -1.25, 1.25, 3.7].map((x) => <mesh key={x} position={[x, 3.55, 5.58]}>
      <planeGeometry args={[1.75, 2.15]} />
      <meshStandardMaterial color="#167da9" metalness={0.38} roughness={0.12} />
    </mesh>)}
    <mesh position={[2.6, 7.9, 5.58]}>
      <planeGeometry args={[2.4, 3.1]} />
      <meshStandardMaterial color="#238eb8" metalness={0.38} roughness={0.12} />
    </mesh>
    {/* Caixa técnica superior */}
    <mesh position={[-1.6, 11.8, -0.5]}><boxGeometry args={[5.2, 1.6, 6.4]} /><meshStandardMaterial color="#4b565d" roughness={0.62} /></mesh>
  </group>;
}

function SunflowerPlanter({ x }: { x: number }) {
  return <group position={[x, 0, 16.5]}>
    <mesh position={[0, 0.34, 0]}><boxGeometry args={[2.2, 0.68, 0.72]} /><meshStandardMaterial color="#6f706a" roughness={0.9} /></mesh>
    {[-0.72, -0.24, 0.24, 0.72].map((offset, index) => <group key={offset} position={[offset, 0.68, 0]}>
      <mesh position={[0, 0.7 + (index % 2) * 0.18, 0]}><cylinderGeometry args={[0.018, 0.028, 1.4, 7]} /><meshStandardMaterial color="#3f6a42" /></mesh>
      <mesh position={[0, 1.42 + (index % 2) * 0.18, 0]}><sphereGeometry args={[0.2, 12, 8]} /><meshStandardMaterial color="#e1ad24" roughness={0.85} /></mesh>
      <mesh position={[0, 1.42 + (index % 2) * 0.18, 0.18]}><sphereGeometry args={[0.085, 10, 7]} /><meshStandardMaterial color="#68451d" roughness={1} /></mesh>
    </group>)}
  </group>;
}

function Bicycle({ position }: { position: [number, number, number] }) {
  return <group position={position} scale={0.9}>
    {[-0.7, 0.7].map((x) => <mesh key={x} position={[x, 0.62, 0]}>
      <torusGeometry args={[0.52, 0.055, 10, 22]} />
      <meshStandardMaterial color="#19242a" metalness={0.58} roughness={0.38} />
    </mesh>)}
    <mesh position={[-0.1, 0.86, 0]} rotation={[0, 0, 0.58]}><boxGeometry args={[1.15, 0.065, 0.065]} /><meshStandardMaterial color="#1b596f" metalness={0.72} /></mesh>
    <mesh position={[0.18, 0.9, 0]} rotation={[0, 0, -0.55]}><boxGeometry args={[1.05, 0.065, 0.065]} /><meshStandardMaterial color="#1b596f" metalness={0.72} /></mesh>
    <mesh position={[0.03, 0.73, 0]} rotation={[0, 0, Math.PI / 2]}><boxGeometry args={[0.74, 0.065, 0.065]} /><meshStandardMaterial color="#1b596f" metalness={0.72} /></mesh>
    <mesh position={[0.38, 1.44, 0]} rotation={[0, 0, -0.15]}><boxGeometry args={[0.7, 0.055, 0.055]} /><meshStandardMaterial color="#26343a" metalness={0.7} /></mesh>
    <mesh position={[0.06, 1.26, 0]}><boxGeometry args={[0.52, 0.12, 0.25]} /><meshStandardMaterial color="#40332a" roughness={0.72} /></mesh>
  </group>;
}

function TulipBed() {
  const colors = ["#ef3b24", "#f18bb5", "#f2b827", "#c84b8d", "#ff6841"];
  return <group position={[10.8, 0, 24]}>
    <mesh position={[0, 0.03, 0]} rotation={[-Math.PI / 2, 0, 0]}><planeGeometry args={[13, 6]} /><meshStandardMaterial color="#315d34" roughness={1} /></mesh>
    {Array.from({ length: 36 }, (_, index) => {
      const x = -5.7 + (index % 9) * 1.42;
      const z = -2.2 + Math.floor(index / 9) * 1.35;
      const height = 0.72 + (index % 3) * 0.12;
      return <group key={index} position={[x, 0, z]}>
        <mesh position={[0, height / 2, 0]}><cylinderGeometry args={[0.018, 0.028, height, 6]} /><meshStandardMaterial color="#3b813f" /></mesh>
        <mesh position={[-0.12, height * 0.52, 0]} rotation={[0, 0, 0.55]}><capsuleGeometry args={[0.055, 0.22, 4, 6]} /><meshStandardMaterial color="#4c9b4d" /></mesh>
        <mesh position={[0, height + 0.12, 0]} scale={[0.85, 1, 0.85]}><sphereGeometry args={[0.2, 12, 8]} /><meshStandardMaterial color={colors[index % colors.length]} roughness={0.8} /></mesh>
      </group>;
    })}
  </group>;
}

function StreetLamp() {
  return <group position={[6.8, 0, 20.5]}>
    <mesh position={[0, 2.5, 0]}><cylinderGeometry args={[0.09, 0.16, 5, 10]} /><meshStandardMaterial color="#182128" metalness={0.72} roughness={0.28} /></mesh>
    <mesh position={[0, 5.05, 0]}><boxGeometry args={[0.7, 0.95, 0.7]} /><meshStandardMaterial color="#182128" metalness={0.72} roughness={0.25} wireframe /></mesh>
    <pointLight position={[0, 5.05, 0]} intensity={3.5} distance={8} color="#ffd680" />
    <mesh position={[0, 5.65, 0]}><coneGeometry args={[0.55, 0.3, 4]} /><meshStandardMaterial color="#182128" metalness={0.72} /></mesh>
  </group>;
}

function CanalAndBikes() {
  return <group>
    <mesh position={[-18, -0.06, 22]} rotation={[-Math.PI / 2, 0, 0]}><planeGeometry args={[9, 26]} /><meshStandardMaterial color="#188dc0" metalness={0.22} roughness={0.18} /></mesh>
    <mesh position={[-13.35, 0.22, 22]}><boxGeometry args={[0.45, 0.44, 26]} /><meshStandardMaterial color="#765d48" roughness={0.88} /></mesh>
    <Bicycle position={[-11.8, 0, 23.5]} />
    <Bicycle position={[-10.4, 0, 25]} />
  </group>;
}

function LargeTree() {
  return <group position={[18, 0, 17]}>
    <mesh position={[0, 4.5, 0]}><cylinderGeometry args={[0.48, 0.85, 9, 12]} /><meshStandardMaterial color="#654326" roughness={0.96} /></mesh>
    {[[-2.2, 8.4, 0], [1.6, 9, 0.2], [-0.3, 10.2, -0.2], [3.2, 8.2, 0]].map((position, index) => <mesh key={index} position={position as [number, number, number]} scale={[1.8, 1.15, 1.5]}><sphereGeometry args={[2.2, 14, 10]} /><meshStandardMaterial color={index % 2 ? "#6f9d35" : "#83b43e"} roughness={1} /></mesh>)}
  </group>;
}

function IllustratedClouds() {
  return <group>
    {[[-14, 18, 1], [15, 19, 0]].map((position, cluster) => <group key={cluster} position={position as [number, number, number]}>
      {[-2, -0.7, 0.7, 2].map((x, index) => <mesh key={x} position={[x, index % 2 ? 0.55 : 0, 0]} scale={[1.6, 1, 0.8]}><sphereGeometry args={[1.25, 12, 8]} /><meshBasicMaterial color="#ffffff" /></mesh>)}
    </group>)}
  </group>;
}

function TransitionCorridor() {
  const length = BUILDING_PORTAL_Z - FIRST_ROOM_Z;
  const centerZ = (BUILDING_PORTAL_Z + FIRST_ROOM_Z) / 2;
  return <group>
    <mesh position={[0, 0.03, centerZ]} rotation={[-Math.PI / 2, 0, 0]}>
      <planeGeometry args={[4.6, length]} />
      <meshStandardMaterial color="#596a75" roughness={0.7} />
    </mesh>
    <mesh position={[-2.45, 2.3, centerZ]}>
      <boxGeometry args={[0.3, 4.6, length]} />
      <meshStandardMaterial color="#e7e1d6" roughness={0.9} />
    </mesh>
    <mesh position={[2.45, 2.3, centerZ]}>
      <boxGeometry args={[0.3, 4.6, length]} />
      <meshStandardMaterial color="#e7e1d6" roughness={0.9} />
    </mesh>
    <mesh position={[0, 4.6, centerZ]}>
      <boxGeometry args={[4.9, 0.2, length]} />
      <meshStandardMaterial color="#d6d1c8" roughness={0.85} />
    </mesh>
    {[1.2, 4.3, 7.4].map((offset) => <mesh key={offset} position={[0, 4.43, FIRST_ROOM_Z + offset]}>
      <boxGeometry args={[2.8, 0.08, 0.36]} />
      <meshStandardMaterial color="#fff2cf" emissive="#ffe2a0" emissiveIntensity={1.25} toneMapped={false} />
    </mesh>)}
    <pointLight position={[0, 4.1, centerZ]} intensity={24} distance={12} color="#ffe8bb" />
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
    <color attach="background" args={["#159dea"]} />
    <fog attach="fog" args={["#8ed5f5", 125, 220]} />
    <ambientLight intensity={0.8} color="#e5f3ff" />
    <hemisphereLight intensity={0.92} color="#dff2ff" groundColor="#6d755a" />
    <directionalLight position={[-18, 28, 30]} intensity={2.5} color="#fff4d5" castShadow />
    <pointLight position={[0, 5, 15]} intensity={11} distance={22} color="#fff0ce" />

    {/* Praça externa */}
    <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, -0.025, 22]} receiveShadow>
      <planeGeometry args={[48, 30]} />
      <meshStandardMaterial color="#bd7956" roughness={0.96} />
    </mesh>
    {Array.from({ length: 25 }, (_, index) => <mesh key={`x-${index}`} rotation={[-Math.PI / 2, 0, 0]} position={[-24 + index * 2, -0.015, 22]}><planeGeometry args={[0.025, 30]} /><meshBasicMaterial color="#e4a17d" /></mesh>)}
    {Array.from({ length: 16 }, (_, index) => <mesh key={`z-${index}`} rotation={[-Math.PI / 2, 0, 0]} position={[0, -0.014, 7 + index * 2]}><planeGeometry args={[48, 0.025]} /><meshBasicMaterial color="#e4a17d" /></mesh>)}

    {/* Gramado do Museumplein nas laterais do eixo de entrada */}
    <mesh rotation={[-Math.PI / 2, 0, 0]} position={[-20.5, -0.012, 25]}><planeGeometry args={[7, 26]} /><meshStandardMaterial color="#70a34d" roughness={1} /></mesh>

    <RietveldExterior />
    <BrickWing />
    <GlassPavilion />
    <SlidingDoors z={ENTRANCE_DOOR_Z} open={entranceOpen} register={doorRegistry} entrance />
    <TransitionCorridor />
    <SunflowerPlanter x={-4.2} />
    <SunflowerPlanter x={4.2} />
    <Html position={[0, 5.25, ENTRANCE_DOOR_Z + 0.1]} center transform distanceFactor={9} style={{ pointerEvents: "none" }}>
      <div style={{ color: "#17202a", background: "rgba(245,242,233,.92)", padding: "8px 18px", fontFamily: "Georgia, serif", fontSize: 21, letterSpacing: 1.5, whiteSpace: "nowrap", boxShadow: "0 4px 14px rgba(0,0,0,.18)" }}>
        van gogh museum
      </div>
    </Html>

    {rooms.map((room, index) => <Room key={room.id} room={room} index={index} last={index === rooms.length - 1} />)}
    {internalDoorBoundaries.map((z, index) => (
      <SlidingDoors key={z} z={z} open={internalDoorsOpen[index]} />
    ))}

    <CanalAndBikes />
    <TulipBed />
    <StreetLamp />
    <LargeTree />
    <IllustratedClouds />
  </group>;
}

function LoadedArtwork({
  slot,
  registry,
}: {
  slot: ArtworkSlot;
  registry: MutableRefObject<Map<THREE.Object3D, Artwork>>;
}) {
  // TextureLoader usa o arquivo estático diretamente. Montar /_next/image
  // manualmente funciona localmente, mas a Vercel rejeita a URL com 400.
  const texture = useTexture(slot.artwork.imagem);
  const image = useRef<THREE.Mesh>(null);

  useEffect(() => {
    texture.colorSpace = THREE.SRGBColorSpace;
    texture.needsUpdate = true;
    const mesh = image.current;
    if (!mesh) return;
    registry.current.set(mesh, slot.artwork);
    return () => {
      registry.current.delete(mesh);
    };
  }, [registry, slot.artwork, texture]);

  return <group position={slot.position} rotation={slot.rotation}>
    <mesh position={[0, 0.68, -0.1]}><boxGeometry args={[1.46, 1.76, 0.12]} /><meshStandardMaterial color="#4c2e13" roughness={0.45} metalness={0.25} /></mesh>
    <mesh position={[0, 0.68, -0.038]}><planeGeometry args={[1.34, 1.6]} /><meshBasicMaterial color="#d9a749" /></mesh>
    <mesh ref={image} position={[0, 0.68, -0.03]}><planeGeometry args={[1.24, 1.5]} /><meshBasicMaterial map={texture} toneMapped={false} /></mesh>
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
        <LoadedArtwork slot={slot} registry={registry} />
      </Suspense>
    ))}
  </>;
}

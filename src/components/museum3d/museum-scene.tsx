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
import type { Artwork } from "@/data/artworks";
import type { PeriodId } from "@/data/periods";
import { GalleryArtwork } from "./gallery-artwork";
import { ExteriorDaylight, MuseumExterior } from "./museum-exterior";
import { ExteriorLandscape } from "./exterior-landscape";
import { ExteriorVisitors } from "./exterior-visitors";
import {
  MUSEUM_WALL_COLOR,
  MUSEUM_CEILING_COLOR,
  MUSEUM_BASEBOARD_COLOR,
  useChevronParquet,
} from "./interior-materials";
import { MuseumArtPiece, type VaseVariant } from "./museum-vases";
import { CorridorMurals } from "./corridor-murals";
import { CAFE_PEOPLE, MuseumCafe } from "./museum-cafe";
import {
  BUILDING_PORTAL_Z,
  DOOR_HALF_WIDTH,
  ENTRANCE_DOOR_Z,
  FIRST_ROOM_Z,
  PLAYER_RADIUS,
  ROOM_HALF_WIDTH,
  ROOM_HEIGHT,
} from "./scene/constants";
import { artworkSlots, internalDoorBoundaries, rooms, type RoomConfig } from "./scene/rooms";
import { resolveExteriorMovement, resolveRoomDecorMovement } from "./scene/collisions";

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
  // Última leitura do "olhar" do toque, para consumir apenas as deltas.
  const consumedLook = useRef({ x: 0, y: 0 });

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

  useFrame((state, delta) => {
    // O estado do frame é a fonte mutável correta: `useThree()` devolve valor de
    // hook, que o React Compiler trata como imutável.
    const camera = state.camera;
    const canvas = state.gl.domElement;
    if (isMobile) {
      // Consome as deltas do buffer compartilhado sem escrever de volta: mobileInput
      // é um prop, e mutá-lo é proibido pelas regras de hooks do React Compiler.
      const look = mobileInput.current;
      yaw.current -= (look.lookX - consumedLook.current.x) * 0.003;
      pitch.current = THREE.MathUtils.clamp(
        pitch.current - (look.lookY - consumedLook.current.y) * 0.003,
        -1.2,
        1.2,
      );
      consumedLook.current.x = look.lookX;
      consumedLook.current.y = look.lookY;

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
    if (debugFreeRoam && document.pointerLockElement !== canvas) {
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

    if (!active || (!isMobile && !debugFreeRoam && document.pointerLockElement !== canvas)) return;

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
    // Copia refs e registry para locais: o valor de .current pode mudar antes do
    // cleanup rodar, e o registry pode ser outro objeto no momento da limpeza.
    const registry = register.current;
    const panels = [leftPanel.current, rightPanel.current].filter(
      (panel): panel is THREE.Mesh => panel !== null,
    );
    panels.forEach((panel) => registry.add(panel));
    return () => {
      panels.forEach((panel) => registry.delete(panel));
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

    {/* Café do museu na ala leste do átrio, com barista e clientes */}
    <MuseumCafe />
    <Suspense fallback={null}>
      {CAFE_PEOPLE.map((person) => (
        <Visitor
          key={`${person.position[0]}-${person.position[2]}`}
          position={person.position}
          rotationY={person.rotationY}
          tint={person.tint}
          hair={person.hair}
          scale={person.scale}
        />
      ))}
    </Suspense>

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
      <Suspense fallback={null} key={`${slot.artwork.slug}-${slot.position.join("-")}`}>
        <GalleryArtwork slot={slot} registry={registry} />
      </Suspense>
    ))}
  </>;
}
